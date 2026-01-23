import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { onAuthChange } from '../lib/firebase.auth';
import { initializeUserData, getUserData } from '../lib/firebase.userData';
import { subscribe, create, update, remove, getAll, getUserDocuments } from '../lib/firebase.services';

export const AppContext = createContext();

const normalizeWallet = (wallet) => {
  if (!wallet) return { id: Date.now().toString(), name: 'Wallet', balance: 0, color: '#14b8a6', icon: '💼', type: 'cash', creditLimit: 0, billingDate: null, lastBillingDate: null, lastBilledAmount: 0 };
  const type = wallet.type === 'credit' ? 'credit' : 'cash';
  const balance = Number(wallet.balance ?? 0);
  const creditLimitRaw = Number(wallet.creditLimit ?? 0);
  const billingDate = type === 'credit' && wallet.billingDate ? Number(wallet.billingDate) : null;
  return {
    ...wallet,
    type,
    balance: Number.isFinite(balance) ? balance : 0,
    creditLimit: type === 'credit' && Number.isFinite(creditLimitRaw) ? creditLimitRaw : 0,
    billingDate: billingDate && billingDate >= 1 && billingDate <= 31 ? billingDate : null,
    lastBillingDate: type === 'credit' ? (wallet.lastBillingDate || null) : null,
    lastBilledAmount: type === 'credit' ? (Number(wallet.lastBilledAmount ?? 0) || 0) : 0,
  };
};

const initialState = {
  user: null,
  userData: null,
  loading: true,
  dataLoading: true, // Separate state for data loading
  transactions: [],
  budgets: {
    Food: 500,
    Travel: 300,
    Bills: 400,
    Shopping: 200,
    Entertainment: 150,
    Healthcare: 200,
    Education: 300,
    Other: 100,
  },
  goals: [],
  wallets: [
    normalizeWallet({ id: '1', name: 'Personal', balance: 0, color: '#14b8a6', icon: '💼', type: 'cash', creditLimit: 0 }),
  ],
  recurringTransactions: [],
  sharedExpenses: [],
  receipts: [],
  notifications: [],
  currency: 'USD',
  darkMode: localStorage.getItem('darkMode') === 'true' || false,
  searchQuery: '',
  filterCategory: 'All',
  filterWallet: 'All',
  dateRange: { from: null, to: null },
  sortBy: 'date', // 'date' | 'amount'
  sortOrder: 'desc', // 'asc' | 'desc'
  selectedWallet: '1',
  categories: [
    { name: 'Food', icon: '🍔', color: '#f59e0b' },
    { name: 'Travel', icon: '✈️', color: '#3b82f6' },
    { name: 'Bills', icon: '💳', color: '#ef4444' },
    { name: 'Shopping', icon: '🛍️', color: '#8b5cf6' },
    { name: 'Entertainment', icon: '🎬', color: '#ec4899' },
    { name: 'Healthcare', icon: '🏥', color: '#10b981' },
    { name: 'Education', icon: '📚', color: '#06b6d4' },
    { name: 'Other', icon: '📦', color: '#6b7280' },
  ],
  settings: {
    notifications: true,
    aiInsights: true,
    cloudSync: false,
  },
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_USER_DATA':
      return { ...state, userData: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload),
      };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        ),
      };
    case 'SET_BUDGET':
      return {
        ...state,
        budgets: { ...state.budgets, [action.payload.category]: action.payload.amount },
      };
    case 'ADD_GOAL':
      return {
        ...state,
        goals: [...state.goals, action.payload],
      };
    case 'UPDATE_GOAL':
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.id ? { ...g, ...action.payload.updates } : g
        ),
      };
    case 'DELETE_GOAL':
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.payload),
      };
    case 'ADD_WALLET':
      return {
        ...state,
        wallets: [...state.wallets, normalizeWallet(action.payload)],
      };
    case 'UPDATE_WALLET':
      return {
        ...state,
        wallets: state.wallets.map((w) =>
          w.id === action.payload.id ? normalizeWallet({ ...w, ...action.payload.updates }) : w
        ),
      };
    case 'DELETE_WALLET':
      return {
        ...state,
        wallets: state.wallets.filter((w) => w.id !== action.payload),
      };
    case 'SET_SELECTED_WALLET':
      return { ...state, selectedWallet: action.payload };
    case 'ADD_RECURRING_TRANSACTION':
      return {
        ...state,
        recurringTransactions: [...state.recurringTransactions, action.payload],
      };
    case 'UPDATE_RECURRING_TRANSACTION':
      return {
        ...state,
        recurringTransactions: state.recurringTransactions.map((r) =>
          r.id === action.payload.id ? { ...r, ...action.payload.updates } : r
        ),
      };
    case 'DELETE_RECURRING_TRANSACTION':
      return {
        ...state,
        recurringTransactions: state.recurringTransactions.filter((r) => r.id !== action.payload),
      };
    case 'ADD_SHARED_EXPENSE':
      return {
        ...state,
        sharedExpenses: [...state.sharedExpenses, action.payload],
      };
    case 'UPDATE_SHARED_EXPENSE':
      return {
        ...state,
        sharedExpenses: state.sharedExpenses.map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload.updates } : s
        ),
      };
    case 'DELETE_SHARED_EXPENSE':
      return {
        ...state,
        sharedExpenses: state.sharedExpenses.filter((s) => s.id !== action.payload),
      };
    case 'ADD_RECEIPT':
      return {
        ...state,
        receipts: [...state.receipts, action.payload],
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications.slice(0, 49)],
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };
    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };
    case 'CLEAR_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };
    case 'SET_CURRENCY':
      return { ...state, currency: action.payload };
    case 'TOGGLE_DARK_MODE':
      const newDarkMode = !state.darkMode;
      localStorage.setItem('darkMode', newDarkMode);
      return { ...state, darkMode: newDarkMode };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_FILTER_CATEGORY':
      return { ...state, filterCategory: action.payload };
    case 'SET_FILTER_WALLET':
      return { ...state, filterWallet: action.payload };
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    case 'SET_SORT_ORDER':
      return { ...state, sortOrder: action.payload };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    case 'ADD_CATEGORY':
      return {
        ...state,
        categories: [...state.categories, action.payload],
      };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((cat) =>
          cat.name === action.payload.oldName
            ? { ...cat, ...action.payload.updates }
            : cat
        ),
      };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((cat) => cat.name !== action.payload),
      };
    case 'SET_CATEGORIES':
      return {
        ...state,
        categories: action.payload,
      };
    case 'LOAD_DATA':
      return {
        ...state,
        ...action.payload,
        dataLoading: false,
        wallets: action.payload.wallets
          ? action.payload.wallets.map(normalizeWallet)
          : state.wallets,
      };
    case 'SET_DATA_LOADING':
      return { ...state, dataLoading: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const unsubscribeRef = useRef(null);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const savedData = localStorage.getItem('moneyTrackerData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Ensure categories are included
        if (!parsed.categories) {
          parsed.categories = initialState.categories;
        }
        dispatch({ type: 'LOAD_DATA', payload: parsed });
        dispatch({ type: 'SET_DATA_LOADING', payload: false });
      } else {
        dispatch({ type: 'SET_DATA_LOADING', payload: false });
      }
    } catch (e) {
      console.error('Error loading from localStorage:', e);
      dispatch({ type: 'SET_DATA_LOADING', payload: false });
    }
  }, []);

  const setupRealtimeSubscriptions = useCallback((userId) => {
    // Check if localStorage data belongs to current user
    // First, try to load from localStorage immediately (for instant display)
    // BUT only if it belongs to this user
    try {
      const savedUserId = localStorage.getItem('currentUserId');
      const savedData = localStorage.getItem('moneyTrackerData');

      // Only load cached data if it belongs to the current user
      if (savedUserId === userId && savedData) {
        const parsed = JSON.parse(savedData);
        // Ensure categories are included
        if (!parsed.categories) {
          parsed.categories = initialState.categories;
        }
        dispatch({ type: 'LOAD_DATA', payload: parsed });
      } else {
        // Different user or no cached data - clear old data immediately
        if (savedUserId && savedUserId !== userId) {
          console.log('Different user detected, clearing old data');
          localStorage.removeItem('moneyTrackerData');
          // Clear state immediately to prevent showing wrong user's data
          dispatch({
            type: 'LOAD_DATA',
            payload: {
              transactions: [],
              budgets: {
                Food: 500,
                Travel: 300,
                Bills: 400,
                Shopping: 200,
                Entertainment: 150,
                Healthcare: 200,
                Education: 300,
                Other: 100,
              },
              goals: [],
              wallets: [{ id: '1', name: 'Personal', balance: 0, color: '#14b8a6', icon: '💼' }],
              recurringTransactions: [],
              sharedExpenses: [],
              receipts: [],
              notifications: [],
            },
          });
        }
        // Store current user ID
        localStorage.setItem('currentUserId', userId);
        // Start with empty state
        dispatch({ type: 'SET_DATA_LOADING', payload: true });
      }
    } catch (e) {
      console.error('Error loading from localStorage:', e);
      localStorage.setItem('currentUserId', userId);
      dispatch({ type: 'SET_DATA_LOADING', payload: true });
    }

    // Then, load fresh data from Firestore
    const loadInitialData = async () => {
      try {
        dispatch({ type: 'SET_DATA_LOADING', payload: true });
        const [transactions, budgetsData, goals, wallets, recurringTransactions, sharedExpenses, receipts, notifications, categoriesData] = await Promise.all([
          getUserDocuments('transactions', userId),
          getUserDocuments('budgets', userId),
          getUserDocuments('goals', userId),
          getUserDocuments('wallets', userId),
          getUserDocuments('recurringTransactions', userId),
          getUserDocuments('sharedExpenses', userId),
          getUserDocuments('receipts', userId),
          getUserDocuments('notifications', userId),
          getUserDocuments('categories', userId),
        ]);

        // Process budgets into object format
        const budgetsObj = {};
        budgetsData.forEach((b) => {
          budgetsObj[b.category] = b.amount;
        });

        // Process categories - merge default categories with user-created ones
        const userCategoriesFromFirestore = categoriesData.map((c) => ({ name: c.name, icon: c.icon, color: c.color, type: c.type || 'expense' }));
        // Get default category names
        const defaultCategoryNames = initialState.categories.map(c => c.name);
        // Merge: keep defaults, add user-created ones that don't conflict
        const mergedCategories = [
          ...initialState.categories.map(c => ({ ...c, type: c.type || 'expense' })), // Default categories first
          ...userCategoriesFromFirestore.filter(uc => !defaultCategoryNames.includes(uc.name)) // User categories that aren't defaults
        ];
        const userCategories = mergedCategories;

        // Load all data at once
        dispatch({
          type: 'LOAD_DATA',
          payload: {
            transactions,
            budgets: budgetsObj,
            goals,
            wallets,
            recurringTransactions,
            sharedExpenses,
            receipts,
            notifications,
            categories: userCategories,
          },
        });

        // Also save to localStorage as backup (with user ID check)
        localStorage.setItem('currentUserId', userId);
        localStorage.setItem('moneyTrackerData', JSON.stringify({
          transactions,
          budgets: budgetsObj,
          goals,
          wallets,
          recurringTransactions,
          sharedExpenses,
          receipts,
          notifications,
          categories: userCategories,
        }));
      } catch (error) {
        console.error('Error loading initial data:', error);
        // If Firestore fails, keep localStorage data (already loaded above)
        dispatch({ type: 'SET_DATA_LOADING', payload: false });
      }
    };

    // Load initial data from Firestore
    loadInitialData();

    // Then set up real-time subscriptions
    const unsubscribeTransactions = subscribe('transactions', (data) => {
      dispatch({ type: 'LOAD_DATA', payload: { transactions: data } });
      // Update localStorage (only if it's for this user)
      if (localStorage.getItem('currentUserId') === userId) {
        const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
        localStorage.setItem('moneyTrackerData', JSON.stringify({ ...saved, transactions: data }));
      }
    }, userId);

    const unsubscribeBudgets = subscribe('budgets', (data) => {
      const budgetsObj = {};
      data.forEach((b) => {
        budgetsObj[b.category] = b.amount;
      });
      dispatch({ type: 'LOAD_DATA', payload: { budgets: budgetsObj } });
    }, userId);

    const unsubscribeGoals = subscribe('goals', (data) => {
      dispatch({ type: 'LOAD_DATA', payload: { goals: data } });
      // Update localStorage (only if it's for this user)
      if (localStorage.getItem('currentUserId') === userId) {
        const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
        localStorage.setItem('moneyTrackerData', JSON.stringify({ ...saved, goals: data }));
      }
    }, userId);

    const unsubscribeWallets = subscribe('wallets', (data) => {
      dispatch({ type: 'LOAD_DATA', payload: { wallets: data } });
    }, userId);

    const unsubscribeRecurring = subscribe('recurringTransactions', (data) => {
      dispatch({ type: 'LOAD_DATA', payload: { recurringTransactions: data } });
    }, userId);

    const unsubscribeShared = subscribe('sharedExpenses', (data) => {
      dispatch({ type: 'LOAD_DATA', payload: { sharedExpenses: data } });
    }, userId);

    const unsubscribeReceipts = subscribe('receipts', (data) => {
      dispatch({ type: 'LOAD_DATA', payload: { receipts: data } });
    }, userId);

    const unsubscribeNotifications = subscribe('notifications', (data) => {
      dispatch({ type: 'LOAD_DATA', payload: { notifications: data } });
    }, userId);

    const unsubscribeCategories = subscribe('categories', (data) => {
      // Merge user-created categories with default categories
      const userCategoriesFromFirestore = data.map((c) => ({ name: c.name, icon: c.icon, color: c.color, type: c.type || 'expense' }));
      const defaultCategoryNames = initialState.categories.map(c => c.name);
      // Merge: keep defaults, add user-created ones that don't conflict
      const mergedCategories = [
        ...initialState.categories.map(c => ({ ...c, type: c.type || 'expense' })), // Default categories first
        ...userCategoriesFromFirestore.filter(uc => !defaultCategoryNames.includes(uc.name)) // User categories that aren't defaults
      ];
      dispatch({ type: 'SET_CATEGORIES', payload: mergedCategories });
      // Update localStorage
      if (localStorage.getItem('currentUserId') === userId) {
        const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
        localStorage.setItem('moneyTrackerData', JSON.stringify({ ...saved, categories: mergedCategories }));
      }
    }, userId);

    // Cleanup on unmount
    return () => {
      unsubscribeTransactions();
      unsubscribeBudgets();
      unsubscribeGoals();
      unsubscribeWallets();
      unsubscribeRecurring();
      unsubscribeShared();
      unsubscribeReceipts();
      unsubscribeNotifications();
      unsubscribeCategories();
    };
  }, [loadFromLocalStorage]);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        dispatch({ type: 'SET_USER', payload: user });

        // Get user data from Firestore
        try {
          let userData = await getUserData(user.uid);

          // If user data doesn't exist, initialize it (for new sign-ups or Google sign-ins)
          if (!userData) {
            console.log('User data not found, initializing...');
            await initializeUserData(user.uid, {
              email: user.email || '',
              name: user.displayName || '',
              displayName: user.displayName || '',
            });
            userData = await getUserData(user.uid);
          }

          dispatch({ type: 'SET_USER_DATA', payload: userData });

          // Clean up previous subscriptions
          if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
          }

          // Subscribe to real-time data updates (even if userData was just created)
          unsubscribeRef.current = setupRealtimeSubscriptions(user.uid);

          // Set loading to false after subscriptions are set up
          // dataLoading will be set to false when data is loaded
          dispatch({ type: 'SET_LOADING', payload: false });
        } catch (error) {
          console.error('Error loading user data:', error);
          // Even if user data load fails, try to set up subscriptions
          // This handles cases where user exists but data isn't ready yet
          try {
            if (unsubscribeRef.current) {
              unsubscribeRef.current();
              unsubscribeRef.current = null;
            }
            unsubscribeRef.current = setupRealtimeSubscriptions(user.uid);
            dispatch({ type: 'SET_LOADING', payload: false });
          } catch (subError) {
            console.error('Error setting up subscriptions:', subError);
            dispatch({ type: 'SET_LOADING', payload: false });
            dispatch({ type: 'SET_DATA_LOADING', payload: false });
          }
        }
      } else {
        dispatch({ type: 'SET_USER', payload: null });
        dispatch({ type: 'SET_USER_DATA', payload: null });
        // Clean up subscriptions
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        // Clear user-specific data from localStorage when logging out
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('moneyTrackerData');
        // Load from localStorage as fallback (for offline mode)
        loadFromLocalStorage();
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [loadFromLocalStorage, setupRealtimeSubscriptions]);

  // Apply dark mode class to document on mount and when state changes
  useEffect(() => {
    // Apply initial dark mode from localStorage on mount
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode !== state.darkMode) {
      if (savedDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // Update dark mode class when state changes
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  const value = {
    ...state,
    categories: state.categories, // Categories are now in state
    dispatch,
    addTransaction: async (transaction) => {
      // Ensure walletId is always set (use selected wallet if not provided)
      const walletId = String(transaction.walletId || state.selectedWallet || state.wallets[0]?.id || '1');

      const transactionData = {
        ...transaction,
        walletId: walletId, // Always ensure walletId is set as string
        userId: state.user?.uid,
        date: transaction.date || new Date().toISOString(), // Preserve user-selected date
      };

      if (state.user) {
        const result = await create('transactions', transactionData);
        dispatch({ type: 'ADD_TRANSACTION', payload: result });
      } else {
        dispatch({ type: 'ADD_TRANSACTION', payload: { ...transactionData, id: Date.now() } });
      }

      // Always save to localStorage as backup
      const savedData = localStorage.getItem('moneyTrackerData');
      const data = savedData ? JSON.parse(savedData) : { transactions: [] };
      data.transactions = [{ ...transactionData, id: transactionData.id || Date.now() }, ...(data.transactions || [])];
      localStorage.setItem('moneyTrackerData', JSON.stringify(data));
    },
    updateTransaction: async (id, updates) => {
      if (state.user) {
        await update('transactions', id, updates);
      }
      dispatch({ type: 'UPDATE_TRANSACTION', payload: { id, updates } });
    },
    deleteTransaction: async (id) => {
      if (state.user) {
        await remove('transactions', id);
      }
      dispatch({ type: 'DELETE_TRANSACTION', payload: id });
    },
    setBudget: async (category, amount) => {
      if (state.user) {
        // Check if budget for this category already exists
        const existingBudgets = await getUserDocuments('budgets', state.user.uid);
        const existingBudget = existingBudgets.find((b) => b.category === category);

        if (existingBudget) {
          // Update existing budget
          await update('budgets', existingBudget.id, { amount });
        } else {
          // Create new budget
          await create('budgets', { userId: state.user.uid, category, amount });
        }
      }
      dispatch({ type: 'SET_BUDGET', payload: { category, amount } });

      // Update localStorage
      const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
      localStorage.setItem('moneyTrackerData', JSON.stringify({
        ...saved,
        budgets: { ...saved.budgets, [category]: amount },
      }));
    },
    addGoal: async (goal) => {
      const goalData = { ...goal, userId: state.user?.uid, achieved: false };
      if (state.user) {
        const result = await create('goals', goalData);
        dispatch({ type: 'ADD_GOAL', payload: result });
      } else {
        dispatch({ type: 'ADD_GOAL', payload: { ...goalData, id: Date.now() } });
      }
    },
    updateGoal: async (id, updates) => {
      if (state.user) {
        await update('goals', id, updates);
      }
      dispatch({ type: 'UPDATE_GOAL', payload: { id, updates } });
    },
    deleteGoal: async (id) => {
      if (state.user) {
        await remove('goals', id);
      }
      dispatch({ type: 'DELETE_GOAL', payload: id });
    },
    addWallet: async (wallet) => {
      const sanitized = normalizeWallet(wallet);
      const walletData = { ...sanitized, userId: state.user?.uid };
      if (state.user) {
        const result = await create('wallets', walletData);
        dispatch({ type: 'ADD_WALLET', payload: result });
      } else {
        dispatch({ type: 'ADD_WALLET', payload: { ...walletData, id: Date.now().toString() } });
      }
    },
    updateWallet: async (id, updates) => {
      if (state.user) {
        await update('wallets', id, updates);
      }
      dispatch({ type: 'UPDATE_WALLET', payload: { id, updates } });
    },
    deleteWallet: async (id) => {
      if (state.user) {
        await remove('wallets', id);
      }
      dispatch({ type: 'DELETE_WALLET', payload: id });
    },
    setSelectedWallet: (id) => {
      dispatch({ type: 'SET_SELECTED_WALLET', payload: id });
    },
    addRecurringTransaction: async (transaction) => {
      const recurringData = { ...transaction, userId: state.user?.uid };
      if (state.user) {
        const result = await create('recurringTransactions', recurringData);
        dispatch({ type: 'ADD_RECURRING_TRANSACTION', payload: result });
      } else {
        dispatch({ type: 'ADD_RECURRING_TRANSACTION', payload: { ...recurringData, id: Date.now() } });
      }
    },
    updateRecurringTransaction: async (id, updates) => {
      if (state.user) {
        await update('recurringTransactions', id, updates);
      }
      dispatch({ type: 'UPDATE_RECURRING_TRANSACTION', payload: { id, updates } });
    },
    deleteRecurringTransaction: async (id) => {
      if (state.user) {
        await remove('recurringTransactions', id);
      }
      dispatch({ type: 'DELETE_RECURRING_TRANSACTION', payload: id });
    },
    addSharedExpense: async (expense) => {
      const expenseData = {
        ...expense,
        userId: state.user?.uid,
        createdAt: new Date().toISOString(),
      };
      if (state.user) {
        const result = await create('sharedExpenses', expenseData);
        dispatch({ type: 'ADD_SHARED_EXPENSE', payload: result });
      } else {
        dispatch({ type: 'ADD_SHARED_EXPENSE', payload: { ...expenseData, id: Date.now() } });
      }
    },
    updateSharedExpense: async (id, updates) => {
      if (state.user) {
        await update('sharedExpenses', id, updates);
      }
      dispatch({ type: 'UPDATE_SHARED_EXPENSE', payload: { id, updates } });
    },
    deleteSharedExpense: async (id) => {
      if (state.user) {
        await remove('sharedExpenses', id);
      }
      dispatch({ type: 'DELETE_SHARED_EXPENSE', payload: id });
    },
    addReceipt: async (receipt) => {
      const receiptData = {
        ...receipt,
        userId: state.user?.uid,
        uploadedAt: new Date().toISOString(),
      };
      if (state.user) {
        const result = await create('receipts', receiptData);
        dispatch({ type: 'ADD_RECEIPT', payload: result });
      } else {
        dispatch({ type: 'ADD_RECEIPT', payload: { ...receiptData, id: Date.now() } });
      }
    },
    addNotification: async (notification) => {
      const notifData = {
        ...notification,
        userId: state.user?.uid,
        read: false,
        createdAt: new Date().toISOString(),
      };
      if (state.user) {
        const result = await create('notifications', notifData);
        dispatch({ type: 'ADD_NOTIFICATION', payload: result });
      } else {
        dispatch({ type: 'ADD_NOTIFICATION', payload: { ...notifData, id: Date.now() } });
      }
    },
    markNotificationRead: async (id) => {
      if (state.user) {
        await update('notifications', id, { read: true });
      }
      dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
    },
    deleteNotification: async (id) => {
      if (state.user) {
        await remove('notifications', id);
      }
      dispatch({ type: 'DELETE_NOTIFICATION', payload: id });
    },
    clearAllNotifications: async () => {
      if (state.user) {
        const userNotifs = state.notifications.filter((n) => n.userId === state.user.uid);
        for (const notif of userNotifs) {
          await remove('notifications', notif.id);
        }
      }
      dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });
    },
    setCurrency: (currency) => {
      if (state.user && state.userData) {
        initializeUserData(state.user.uid, { currency });
      }
      dispatch({ type: 'SET_CURRENCY', payload: currency });
    },
    toggleDarkMode: () => {
      dispatch({ type: 'TOGGLE_DARK_MODE' });
    },
    setSearchQuery: (query) => {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
    },
    setFilterCategory: (category) => {
      dispatch({ type: 'SET_FILTER_CATEGORY', payload: category });
    },
    setFilterWallet: (wallet) => {
      dispatch({ type: 'SET_FILTER_WALLET', payload: wallet });
    },
    setDateRange: (dateRange) => {
      dispatch({ type: 'SET_DATE_RANGE', payload: dateRange });
    },
    setSortBy: (sortBy) => {
      dispatch({ type: 'SET_SORT_BY', payload: sortBy });
    },
    setSortOrder: (sortOrder) => {
      dispatch({ type: 'SET_SORT_ORDER', payload: sortOrder });
    },
    updateSettings: (settings) => {
      if (state.user && state.userData) {
        initializeUserData(state.user.uid, { settings });
      }
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    },
    // Category management
    addCategory: async (category) => {
      // Check if category name already exists
      if (state.categories.find((c) => c.name === category.name)) {
        throw new Error('Category with this name already exists');
      }

      if (state.user) {
        await create('categories', { userId: state.user.uid, ...category });
      }
      dispatch({ type: 'ADD_CATEGORY', payload: category });

      // Update localStorage
      const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
      localStorage.setItem('moneyTrackerData', JSON.stringify({
        ...saved,
        categories: [...state.categories, category],
      }));
    },
    updateCategory: async (oldName, updates) => {
      if (state.user) {
        const categories = await getUserDocuments('categories', state.user.uid);
        const firestoreCategory = categories.find((c) => c.name === oldName);
        if (firestoreCategory) {
          await update('categories', firestoreCategory.id, { ...updates });
        }
      }
      dispatch({ type: 'UPDATE_CATEGORY', payload: { oldName, updates } });

      // Update localStorage
      const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
      const updatedCategories = state.categories.map((cat) =>
        cat.name === oldName ? { ...cat, ...updates } : cat
      );
      localStorage.setItem('moneyTrackerData', JSON.stringify({
        ...saved,
        categories: updatedCategories,
      }));
    },
    deleteCategory: async (categoryName) => {
      // Prevent deleting if category is used in transactions
      const hasTransactions = state.transactions.some((t) => t.category === categoryName);
      if (hasTransactions) {
        throw new Error('Cannot delete category that is used in transactions');
      }

      if (state.user) {
        const categories = await getUserDocuments('categories', state.user.uid);
        const category = categories.find((c) => c.name === categoryName);
        if (category) {
          await remove('categories', category.id);
        }
      }
      dispatch({ type: 'DELETE_CATEGORY', payload: categoryName });

      // Update localStorage
      const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
      localStorage.setItem('moneyTrackerData', JSON.stringify({
        ...saved,
        categories: state.categories.filter((c) => c.name !== categoryName),
      }));
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
