import React, { createContext, useContext, useReducer, useEffect } from 'react';

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
  loading: false,
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
  selectedWallet: '1',
  settings: {
    notifications: true,
    aiInsights: true,
    cloudSync: false,
  },
};

const categories = [
  { name: 'Food', icon: '🍔', color: '#f59e0b' },
  { name: 'Travel', icon: '✈️', color: '#3b82f6' },
  { name: 'Bills', icon: '💳', color: '#ef4444' },
  { name: 'Shopping', icon: '🛍️', color: '#8b5cf6' },
  { name: 'Entertainment', icon: '🎬', color: '#ec4899' },
  { name: 'Healthcare', icon: '🏥', color: '#10b981' },
  { name: 'Education', icon: '📚', color: '#06b6d4' },
  { name: 'Other', icon: '📦', color: '#6b7280' },
];

function appReducer(state, action) {
  switch (action.type) {
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
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    case 'LOAD_DATA':
      return { 
        ...state, 
        ...action.payload,
        wallets: action.payload.wallets
          ? action.payload.wallets.map(normalizeWallet)
          : state.wallets,
      };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const savedData = localStorage.getItem('moneyTrackerData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        dispatch({ type: 'LOAD_DATA', payload: parsed });
      } catch (e) {
        console.error('Error loading saved data:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('moneyTrackerData', JSON.stringify({
      transactions: state.transactions,
      budgets: state.budgets,
      goals: state.goals,
      wallets: state.wallets,
      recurringTransactions: state.recurringTransactions,
      sharedExpenses: state.sharedExpenses,
      receipts: state.receipts,
      currency: state.currency,
      selectedWallet: state.selectedWallet,
      settings: state.settings,
    }));
  }, [
    state.transactions,
    state.budgets,
    state.goals,
    state.wallets,
    state.recurringTransactions,
    state.sharedExpenses,
    state.receipts,
    state.currency,
    state.selectedWallet,
    state.settings,
  ]);

  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  const value = {
    ...state,
    categories,
    dispatch,
    addTransaction: (transaction) => {
      // Ensure walletId is always set (use selected wallet if not provided)
      const walletId = transaction.walletId || state.selectedWallet || state.wallets[0]?.id || '1';
      
      dispatch({
        type: 'ADD_TRANSACTION',
        payload: { 
          ...transaction, 
          walletId: walletId, // Always ensure walletId is set
          id: Date.now(), 
          date: new Date().toISOString() 
        },
      });
    },
    updateTransaction: (id, updates) => {
      dispatch({ type: 'UPDATE_TRANSACTION', payload: { id, updates } });
    },
    deleteTransaction: (id) => {
      dispatch({ type: 'DELETE_TRANSACTION', payload: id });
    },
    setBudget: (category, amount) => {
      dispatch({ type: 'SET_BUDGET', payload: { category, amount } });
    },
    addGoal: (goal) => {
      dispatch({
        type: 'ADD_GOAL',
        payload: { ...goal, id: Date.now(), createdAt: new Date().toISOString(), achieved: false },
      });
    },
    updateGoal: (id, updates) => {
      dispatch({ type: 'UPDATE_GOAL', payload: { id, updates } });
    },
    deleteGoal: (id) => {
      dispatch({ type: 'DELETE_GOAL', payload: id });
    },
    addWallet: (wallet) => {
      const payload = normalizeWallet({
        ...wallet,
        id: Date.now().toString(),
      });
      dispatch({
        type: 'ADD_WALLET',
        payload,
      });
    },
    updateWallet: (id, updates) => {
      dispatch({ type: 'UPDATE_WALLET', payload: { id, updates } });
    },
    deleteWallet: (id) => {
      dispatch({ type: 'DELETE_WALLET', payload: id });
    },
    setSelectedWallet: (id) => {
      dispatch({ type: 'SET_SELECTED_WALLET', payload: id });
    },
    addRecurringTransaction: (transaction) => {
      dispatch({
        type: 'ADD_RECURRING_TRANSACTION',
        payload: { ...transaction, id: Date.now() },
      });
    },
    updateRecurringTransaction: (id, updates) => {
      dispatch({ type: 'UPDATE_RECURRING_TRANSACTION', payload: { id, updates } });
    },
    deleteRecurringTransaction: (id) => {
      dispatch({ type: 'DELETE_RECURRING_TRANSACTION', payload: id });
    },
    addSharedExpense: (expense) => {
      dispatch({
        type: 'ADD_SHARED_EXPENSE',
        payload: { ...expense, id: Date.now(), createdAt: new Date().toISOString() },
      });
    },
    updateSharedExpense: (id, updates) => {
      dispatch({ type: 'UPDATE_SHARED_EXPENSE', payload: { id, updates } });
    },
    deleteSharedExpense: (id) => {
      dispatch({ type: 'DELETE_SHARED_EXPENSE', payload: id });
    },
    addReceipt: (receipt) => {
      dispatch({
        type: 'ADD_RECEIPT',
        payload: { ...receipt, id: Date.now(), uploadedAt: new Date().toISOString() },
      });
    },
    addNotification: (notification) => {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { ...notification, id: Date.now(), read: false, createdAt: new Date().toISOString() },
      });
    },
    markNotificationRead: (id) => {
      dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
    },
    deleteNotification: (id) => {
      dispatch({ type: 'DELETE_NOTIFICATION', payload: id });
    },
    clearAllNotifications: () => {
      dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });
    },
    setCurrency: (currency) => {
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
    updateSettings: (settings) => {
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
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
