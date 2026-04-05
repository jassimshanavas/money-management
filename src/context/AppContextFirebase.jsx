import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { onAuthChange } from '../lib/firebase.auth';
import { initializeUserData, getUserData } from '../lib/firebase.userData';
import { subscribe, create, update, remove, getAll, getUserDocuments } from '../lib/firebase.services';
import { getWalletSummary } from '../utils/helpers';
import { calculateTotalCost, generateLoanNumber } from '../utils/emiCalculator';

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
  emiLoans: [],
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
    { name: 'Transfer', icon: '💱', color: '#14b8a6', type: 'transfer' },
    { name: 'Interest', icon: '📉', color: '#f43f5e', type: 'expense' },
    { name: 'Other', icon: '📦', color: '#6b7280' },
  ],
  settings: {
    notifications: true,
    aiInsights: true,
    cloudSync: false,
  },
};

const rankEMILoan = (loan) => {
  let score = 0;
  if (loan?.userId) score += 4;
  if (loan?.id && !String(loan.id).startsWith('emi_')) score += 2;
  if (loan?.createdAt) score += 1;
  return score;
};

const dedupeEMILoans = (emiLoans = []) => {
  const byKey = new Map();

  emiLoans.forEach((loan) => {
    const key = loan?.transactionId ? `txn:${loan.transactionId}` : `id:${loan?.id}`;
    const existing = byKey.get(key);
    if (!existing || rankEMILoan(loan) > rankEMILoan(existing)) {
      byKey.set(key, loan);
    }
  });

  return Array.from(byKey.values());
};

const toISODate = (value) => {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const addDaysISO = (value, days) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return toISODate(value);
  parsed.setDate(parsed.getDate() + Number(days || 0));
  return parsed.toISOString();
};

const EMI_GENERATED_TAGS = new Set([
  'emi-processing-fee',
  'emi-principal',
  'emi-interest',
  'emi-igst',
  'emi-payment',
]);

const transactionBelongsToCurrentUser = (transaction, userId) =>
  !!transaction && !!userId && transaction.userId === userId;

const getInitialEMICharges = ({ processingFee, igstOnProcessingFee, statementDate }) => {
  const scheduledDate = toISODate(statementDate || new Date().toISOString());
  return [
    Number(processingFee) > 0 ? {
      key: 'processing_fee',
      label: 'Processing fee',
      amount: Number(processingFee),
      scheduledDate,
      posted: false,
      postedDate: null,
    } : null,
    Number(igstOnProcessingFee) > 0 ? {
      key: 'processing_fee_igst',
      label: 'IGST on processing fee',
      amount: Number(igstOnProcessingFee),
      scheduledDate,
      posted: false,
      postedDate: null,
    } : null,
  ].filter(Boolean);
};

const buildEMILoanPayload = (loanData, transaction) => {
  const principal = Number(loanData.principalAmount ?? transaction?.amount ?? 0);
  const annualRate = Number(loanData.interestRatePA ?? loanData.interestRate ?? 18);
  const tenureMonths = Number(loanData.tenureMonths ?? 3);
  const processingFee = Number(loanData.processingFee ?? 0);
  const igstRate = Number(loanData.igstRate ?? 18);
  const firstEMIDate = loanData.firstEMIDate || loanData.loanBookedDate || new Date().toISOString();
  const loanBookingDate = loanData.loanBookingDate || new Date().toISOString();
  const statementDate = loanData.statementDate || firstEMIDate;
  const firstPaymentDate = loanData.firstPaymentDate || firstEMIDate;

  const totals = calculateTotalCost(
    principal,
    annualRate,
    tenureMonths,
    processingFee,
    igstRate,
    firstEMIDate,
    { loanBookingDate, statementDate, firstPaymentDate }
  );

  return {
    id: loanData.id || `emi_${Date.now()}`,
    walletId: String(loanData.walletId || transaction?.walletId || ''),
    transactionId: transaction?.id ?? loanData.transactionId,
    transactionDescription:
      transaction?.description || loanData.transactionDescription || transaction?.category || 'Card transaction',
    originalTransactionDate: transaction?.date || loanData.originalTransactionDate || new Date().toISOString(),
    loanNumber: loanData.loanNumber || generateLoanNumber(),
    loanBookedDate: loanData.loanBookedDate || new Date().toISOString(),
    loanType: loanData.loanType || 'OFFUS EMI',
    principalAmount: principal,
    interestRatePA: annualRate,
    tenureMonths,
    processingFee: totals.processingFee,
    igstOnProcessingFee: totals.igstOnProcessingFee,
    igstRate,
    monthlyEMI: totals.monthlyEMI,
    totalInterest: totals.totalInterest,
    totalIGSTOnInterest: totals.totalIGSTOnInterest,
    totalCost: totals.totalCost,
    totalProcessingCost: totals.totalProcessingCost,
    loanBookingDate: toISODate(loanBookingDate),
    statementDate: toISODate(statementDate),
    firstPaymentDate: toISODate(firstPaymentDate),
    firstEMIDate: toISODate(firstEMIDate),
    schedule: totals.schedule,
    upcomingCharges: getInitialEMICharges({
      processingFee: totals.processingFee,
      igstOnProcessingFee: totals.igstOnProcessingFee,
      statementDate,
    }),
    outstandingPrincipal: principal,
    paidEMIs: 0,
    remainingEMIs: tenureMonths,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
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
    case 'LOAD_DATA': {
      const wallets = action.payload.wallets ? action.payload.wallets.map(normalizeWallet) : state.wallets;
      let newSelectedWallet = state.selectedWallet;
      if (wallets.length > 0) {
        const currentWalletExists = wallets.some(w => String(w.id) === String(state.selectedWallet));
        if (!currentWalletExists) newSelectedWallet = String(wallets[0].id);
      }
      return {
        ...state,
        ...action.payload,
        dataLoading: false,
        wallets,
        emiLoans: action.payload.emiLoans ? dedupeEMILoans(action.payload.emiLoans) : state.emiLoans,
        selectedWallet: newSelectedWallet,
      };
    }
    case 'SET_DATA_LOADING':
      return { ...state, dataLoading: action.payload };
    case 'ADD_EMI_LOAN':
      return { ...state, emiLoans: dedupeEMILoans([...state.emiLoans, action.payload]) };
    case 'SET_EMI_LOANS':
      return { ...state, emiLoans: dedupeEMILoans(action.payload) };
    case 'UPDATE_EMI_LOAN':
      return { ...state, emiLoans: state.emiLoans.map((l) => l.id === action.payload.id ? { ...l, ...action.payload.updates } : l) };
    case 'DELETE_EMI_LOAN':
      return { ...state, emiLoans: state.emiLoans.filter((l) => l.id !== action.payload) };
    case 'PAY_EMI_INSTALLMENT': {
      const { loanId, monthIndex, paidDate, paidTransactionId } = action.payload;
      return {
        ...state,
        emiLoans: state.emiLoans.map((loan) => {
          if (loan.id !== loanId) return loan;
          const updatedSchedule = loan.schedule.map((entry, idx) => idx === monthIndex ? { ...entry, status: 'paid', paidDate, paidTransactionId } : entry);
          const paidEMIs = updatedSchedule.filter(s => s.status === 'paid').length;
          const remainingEMIs = updatedSchedule.length - paidEMIs;
          const outstandingPrincipal = updatedSchedule.filter(s => s.status !== 'paid').reduce((sum, s) => sum + s.principalAmount, 0);
          return { ...loan, schedule: updatedSchedule, paidEMIs, remainingEMIs, outstandingPrincipal, status: remainingEMIs === 0 ? 'completed' : 'active' };
        }),
      };
    }
    case 'UNPAY_EMI_INSTALLMENT': {
      const { loanId, monthIndex } = action.payload;
      return {
        ...state,
        emiLoans: state.emiLoans.map((loan) => {
          if (loan.id !== loanId) return loan;
          const updatedSchedule = loan.schedule.map((entry, idx) => idx === monthIndex ? { ...entry, status: 'pending', paidDate: null, paidTransactionId: null } : entry);
          const paidEMIs = updatedSchedule.filter(e => e.status === 'paid').length;
          const remainingEMIs = updatedSchedule.length - paidEMIs;
          const outstandingPrincipal = updatedSchedule.filter(e => e.status !== 'paid').reduce((sum, e) => sum + e.principalAmount, 0);
          return { ...loan, schedule: updatedSchedule, paidEMIs, remainingEMIs, outstandingPrincipal, status: remainingEMIs === 0 ? 'completed' : 'active' };
        }),
      };
    }
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const unsubscribeRef = useRef(null);

  const syncProcessingFeeChargeState = useCallback(async (transaction, options = {}) => {
    if (!transaction?.emiLoanId || transaction.tag !== 'emi-processing-fee' || !transaction.emiChargeType) {
      return;
    }

    const loan = state.emiLoans.find((item) => item.id === transaction.emiLoanId);
    if (!loan) return;

    const updatedCharges = (loan.upcomingCharges || []).map((charge) => {
      if (charge.key !== transaction.emiChargeType) return charge;
      if (options.deleted) {
        return {
          ...charge,
          posted: false,
          postedDate: null,
          scheduledDate: options.scheduledDate || charge.scheduledDate || transaction.date,
          amount: options.amount ?? charge.amount ?? transaction.amount,
        };
      }
      return {
        ...charge,
        posted: true,
        postedDate: options.postedDate || transaction.date,
        scheduledDate: options.scheduledDate || transaction.date,
        amount: options.amount ?? transaction.amount ?? charge.amount,
      };
    });

    if (state.user) {
      await update('emiLoans', loan.id, { upcomingCharges: updatedCharges });
    }

    dispatch({ type: 'UPDATE_EMI_LOAN', payload: { id: loan.id, updates: { upcomingCharges: updatedCharges } } });

    const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
    localStorage.setItem('moneyTrackerData', JSON.stringify({
      ...saved,
      emiLoans: (saved.emiLoans || []).map((item) =>
        item.id === loan.id ? { ...item, upcomingCharges: updatedCharges } : item
      ),
    }));
  }, [state.emiLoans, state.user]);

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
        const [transactions, budgetsData, goals, wallets, recurringTransactions, sharedExpenses, receipts, notifications, categoriesData, emiLoans] = await Promise.all([
          getUserDocuments('transactions', userId),
          getUserDocuments('budgets', userId),
          getUserDocuments('goals', userId),
          getUserDocuments('wallets', userId),
          getUserDocuments('recurringTransactions', userId),
          getUserDocuments('sharedExpenses', userId),
          getUserDocuments('receipts', userId),
          getUserDocuments('notifications', userId),
          getUserDocuments('categories', userId),
          getUserDocuments('emiLoans', userId),
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
            categories: userCategories,
            emiLoans,
            notifications,
          },
        });

        localStorage.setItem('currentUserId', userId);
        localStorage.setItem('moneyTrackerData', JSON.stringify({
          transactions,
          budgets: budgetsObj,
          goals,
          wallets,
          recurringTransactions,
          sharedExpenses,
          receipts,
          emiLoans,
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

    const unsubscribeEMILoans = subscribe('emiLoans', (data) => {
      dispatch({ type: 'LOAD_DATA', payload: { emiLoans: data } });
      if (localStorage.getItem('currentUserId') === userId) {
        const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
        localStorage.setItem('moneyTrackerData', JSON.stringify({ ...saved, emiLoans: data }));
      }
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

    return () => {
      unsubscribeTransactions();
      unsubscribeBudgets();
      unsubscribeGoals();
      unsubscribeWallets();
      unsubscribeRecurring();
      unsubscribeShared();
      unsubscribeReceipts();
      unsubscribeNotifications();
      unsubscribeEMILoans();
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
      const existingTransaction = state.transactions.find((item) => item.id === id);
      if (state.user) {
        await update('transactions', id, updates);
      }
      dispatch({ type: 'UPDATE_TRANSACTION', payload: { id, updates } });
      if (existingTransaction?.tag === 'emi-processing-fee') {
        await syncProcessingFeeChargeState(
          { ...existingTransaction, ...updates },
          {
            postedDate: updates.date || existingTransaction.date,
            scheduledDate: updates.date || existingTransaction.date,
            amount: updates.amount ?? existingTransaction.amount,
          }
        );
      }
    },
    deleteTransaction: async (id) => {
      // Find the transaction first to check for paymentId
      const transactionToDelete = state.transactions.find(t => t.id === id);

      if (transactionToDelete && transactionToDelete.paymentId) {
        const paymentId = transactionToDelete.paymentId;

        // 1. Find the wallet(s) that might have this payment and update them
        state.wallets.forEach(async (wallet) => {
          if (wallet.payments && wallet.payments.some(p => String(p.id) === String(paymentId))) {
            const newPayments = wallet.payments.filter(p => String(p.id) !== String(paymentId));

            // Re-calculate unpaidBillAmount and hasUnpaidBill correctly
            // Important: use current transactions minus the one being deleted for accuracy
            const remainingTransactions = state.transactions.filter(t => t.id !== id);
            const summary = getWalletSummary({ ...wallet, payments: newPayments }, remainingTransactions);

            const updates = {
              payments: newPayments,
              unpaidBillAmount: summary.unpaidBillAmount,
              hasUnpaidBill: summary.unpaidBillAmount > 0
            };

            if (state.user) {
              await update('wallets', wallet.id, updates);
            }
            dispatch({ type: 'UPDATE_WALLET', payload: { id: wallet.id, updates } });
          }
        });

        // 2. Find and delete OTHER transactions with the same paymentId
        // This ensures both the expense and income parts of a bill pay are removed
        const relatedTransactions = state.transactions.filter(t => t.paymentId === paymentId && t.id !== id);
        for (const related of relatedTransactions) {
          if (state.user) {
            await remove('transactions', related.id);
          }
          dispatch({ type: 'DELETE_TRANSACTION', payload: related.id });
        }
      }

      // 3. Delete the original transaction
      if (state.user) {
        await remove('transactions', id);
      }
      if (transactionToDelete?.tag === 'emi-processing-fee') {
        await syncProcessingFeeChargeState(transactionToDelete, {
          deleted: true,
          scheduledDate: transactionToDelete.date,
          amount: transactionToDelete.amount,
        });
      }
      dispatch({ type: 'DELETE_TRANSACTION', payload: id });
    },
    walletTransfer: async ({ sourceWalletId, destinationWalletId, amount, interest, description, date, category }) => {
      // Create 3 transactions for the wallet transfer:
      // 1. Debit from source wallet (transfer amount)
      // 2. Debit from source wallet (interest/fee)
      // 3. Credit to destination wallet (transfer amount, marked as 'transfer' not 'income')

      const transferDate = date || new Date().toISOString();
      const transferDescription = description || 'Wallet Transfer';

      // Transaction 1: Debit transfer amount from source
      const sourceDebitTransaction = {
        type: 'expense',
        category: category || 'Transfer',
        amount: parseFloat(amount),
        description: `${transferDescription} (To: ${state.wallets.find(w => w.id === destinationWalletId)?.name || 'Wallet'})`,
        walletId: String(sourceWalletId),
        userId: state.user?.uid,
        date: transferDate,
        isTransfer: true,
        transferType: 'source_debit',
        tag: 'transfer',
      };

      // Transaction 2: Debit interest from source
      const interestTransaction = interest && parseFloat(interest) > 0 ? {
        type: 'expense',
        category: 'Interest',
        amount: parseFloat(interest),
        description: `${transferDescription} - Interest/Fee`,
        walletId: String(sourceWalletId),
        userId: state.user?.uid,
        date: transferDate,
        isTransfer: true,
        transferType: 'interest',
        tag: 'transfer',
      } : null;

      // Transaction 3: Credit to destination wallet (marked as transfer, not income)
      const destinationCreditTransaction = {
        type: 'transfer', // Special type that won't be counted as income
        category: category || 'Transfer',
        amount: parseFloat(amount),
        description: `${transferDescription} (From: ${state.wallets.find(w => w.id === sourceWalletId)?.name || 'Wallet'})`,
        walletId: String(destinationWalletId),
        userId: state.user?.uid,
        date: transferDate,
        isTransfer: true,
        transferType: 'destination_credit',
        tag: 'transfer',
      };

      // Add all transactions
      if (state.user) {
        await create('transactions', sourceDebitTransaction);
        if (interestTransaction) {
          await create('transactions', interestTransaction);
        }
        await create('transactions', destinationCreditTransaction);

        // Reload transactions to get updated state
        const transactions = await getUserDocuments('transactions', state.user.uid);
        dispatch({ type: 'LOAD_DATA', payload: { transactions } });
      } else {
        dispatch({ type: 'ADD_TRANSACTION', payload: { ...sourceDebitTransaction, id: Date.now() } });
        if (interestTransaction) {
          dispatch({ type: 'ADD_TRANSACTION', payload: { ...interestTransaction, id: Date.now() + 1 } });
        }
        dispatch({ type: 'ADD_TRANSACTION', payload: { ...destinationCreditTransaction, id: Date.now() + 2 } });
      }

      // Update localStorage
      const savedData = localStorage.getItem('moneyTrackerData');
      const data = savedData ? JSON.parse(savedData) : { transactions: [] };
      data.transactions = [
        { ...sourceDebitTransaction, id: Date.now() },
        ...(interestTransaction ? [{ ...interestTransaction, id: Date.now() + 1 }] : []),
        { ...destinationCreditTransaction, id: Date.now() + 2 },
        ...(data.transactions || [])
      ];
      localStorage.setItem('moneyTrackerData', JSON.stringify(data));
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
    // ──────────────── EMI Loan Functions ──────────────────────────────────────────
    addEMILoan: async (loanData) => {
      const transaction = state.transactions.find((item) => String(item.id) === String(loanData.transactionId));
      if (!transaction) throw new Error('The selected transaction could not be found.');
      if (transaction.isEmiConverted) throw new Error('This transaction has already been converted to EMI.');
      const draftLoan = buildEMILoanPayload(loanData, transaction);
      const userId = state.user?.uid;
      // Strip temp id so Firestore doesn't store it as a field (caused the ID mapping bug).
      const { id: _tempId, ...draftForFirestore } = draftLoan;
      const createdLoan = state.user ? await create('emiLoans', { ...draftForFirestore, userId }) : null;
      const payload = createdLoan ? { ...draftLoan, id: createdLoan.id } : draftLoan;
      if (state.user) {
        await update('transactions', transaction.id, { isEmiConverted: true, emiLoanId: payload.id, emiLoanNumber: payload.loanNumber, excludeFromBilling: true, emiConvertedAt: new Date().toISOString() });
      }
      dispatch({ type: 'ADD_EMI_LOAN', payload });
      dispatch({ type: 'UPDATE_TRANSACTION', payload: { id: transaction.id, updates: { isEmiConverted: true, emiLoanId: payload.id, emiLoanNumber: payload.loanNumber, excludeFromBilling: true, emiConvertedAt: new Date().toISOString() } } });
      const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
      localStorage.setItem('moneyTrackerData', JSON.stringify({ ...saved, emiLoans: state.user ? (saved.emiLoans || []) : [...(saved.emiLoans || []), payload] }));
    },
    updateEMILoan: async (id, updates) => {
      if (state.user) await update('emiLoans', id, updates);
      dispatch({ type: 'UPDATE_EMI_LOAN', payload: { id, updates } });
      const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
      localStorage.setItem('moneyTrackerData', JSON.stringify({ ...saved, emiLoans: (saved.emiLoans || []).map(l => l.id === id ? { ...l, ...updates } : l) }));
    },
    editEMILoanDetails: async (loanId, loanData) => {
      const existingLoan = state.emiLoans.find((item) => item.id === loanId);
      if (!existingLoan) throw new Error('The EMI loan could not be found.');
      const transaction = state.transactions.find((item) => String(item.id) === String(existingLoan.transactionId));
      if (!transaction) throw new Error('The original transaction could not be found.');
      const hasGeneratedTransactions = state.transactions.some((item) => item.emiLoanId === loanId && EMI_GENERATED_TAGS.has(item.tag));
      const hasPostedCharges = (existingLoan.upcomingCharges || []).some((charge) => charge.posted);
      if (existingLoan.paidEMIs > 0 || hasGeneratedTransactions || hasPostedCharges) throw new Error('You can edit EMI details only before any EMI charges or installments are posted.');
      const recalculatedLoan = buildEMILoanPayload({ ...existingLoan, ...loanData, id: existingLoan.id, loanNumber: existingLoan.loanNumber, loanBookedDate: existingLoan.loanBookedDate, createdAt: existingLoan.createdAt, transactionId: existingLoan.transactionId, transactionDescription: existingLoan.transactionDescription, originalTransactionDate: existingLoan.originalTransactionDate }, transaction);
      if (state.user) await update('emiLoans', loanId, recalculatedLoan);
      dispatch({ type: 'UPDATE_EMI_LOAN', payload: { id: loanId, updates: recalculatedLoan } });
      const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
      localStorage.setItem('moneyTrackerData', JSON.stringify({ ...saved, emiLoans: (saved.emiLoans || []).map((item) => item.id === loanId ? { ...item, ...recalculatedLoan } : item) }));
    },
    postEMICharge: async (loanId, chargeKey, postedDate) => {
      const loan = state.emiLoans.find((item) => item.id === loanId);
      const charge = loan?.upcomingCharges?.find((item) => item.key === chargeKey && !item.posted);
      const existingChargeTransaction = state.transactions.find((item) => item.emiLoanId === loanId && item.tag === 'emi-processing-fee' && item.emiChargeType === chargeKey);
      if (!loan || existingChargeTransaction || !charge) return;
      const effectiveDate = toISODate(postedDate || charge.scheduledDate);
      const userId = state.user?.uid;
      const chargeTransaction = { walletId: loan.walletId, type: 'expense', category: 'Bills', amount: charge.amount, date: effectiveDate, description: `${charge.label} - ${loan.loanNumber}`, tag: 'emi-processing-fee', emiLoanId: loan.id, emiChargeType: charge.key, userId };
      const createdTransaction = state.user ? await create('transactions', chargeTransaction) : null;
      dispatch({ type: 'ADD_TRANSACTION', payload: createdTransaction || { ...chargeTransaction, id: Date.now() } });
      const updatedCharges = (loan.upcomingCharges || []).map((item) => item.key === chargeKey ? { ...item, posted: true, postedDate: effectiveDate, scheduledDate: effectiveDate } : item);
      if (state.user) await update('emiLoans', loan.id, { upcomingCharges: updatedCharges });
      dispatch({ type: 'UPDATE_EMI_LOAN', payload: { id: loan.id, updates: { upcomingCharges: updatedCharges } } });
      const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
      localStorage.setItem('moneyTrackerData', JSON.stringify({ ...saved, transactions: [createdTransaction || { ...chargeTransaction, id: Date.now() + 1 }, ...(saved.transactions || [])], emiLoans: (saved.emiLoans || []).map((item) => item.id === loan.id ? { ...item, upcomingCharges: updatedCharges } : item) }));
    },
    deleteEMILoan: async (id) => {
      const loan = state.emiLoans.find((item) => item.id === id);
      if (!loan) return;
      const currentUserId = state.user?.uid;
      // Attempt Firestore deletion for any loan with a real Firestore ID.
      // Do NOT gate on loan.userId === currentUserId: older loans may lack userId.
      const shouldDeleteLoanFromFirestore = !!currentUserId && !!loan.id && !String(loan.id).startsWith('emi_');
      const generatedTransactions = state.transactions.filter((item) => item.emiLoanId === id && EMI_GENERATED_TAGS.has(item.tag));
      if (state.user) {
        const firestoreTransactions = generatedTransactions.filter((item) => item.userId === currentUserId && !String(item.id).includes('.'));
        try {
          await Promise.all(firestoreTransactions.map((item) => remove('transactions', item.id)));
        } catch {
          throw new Error('Firestore blocked deletion of one or more EMI-linked transactions. Please check your Firestore security rules.');
        }
        if (loan.transactionId && transactionBelongsToCurrentUser(state.transactions.find((item) => String(item.id) === String(loan.transactionId)), currentUserId)) {
          await update('transactions', loan.transactionId, { isEmiConverted: false, emiLoanId: null, emiLoanNumber: null, excludeFromBilling: false, emiConvertedAt: null });
        }
        if (shouldDeleteLoanFromFirestore) {
          // Best-effort: even if rules block it, local cleanup still completes.
          try { await remove('emiLoans', id); } catch { console.warn(`Could not delete emiLoan ${id} from Firestore.`); }
        }
      }
      generatedTransactions.forEach((item) => dispatch({ type: 'DELETE_TRANSACTION', payload: item.id }));
      if (loan.transactionId) dispatch({ type: 'UPDATE_TRANSACTION', payload: { id: loan.transactionId, updates: { isEmiConverted: false, emiLoanId: null, emiLoanNumber: null, excludeFromBilling: false, emiConvertedAt: null } } });
      dispatch({ type: 'DELETE_EMI_LOAN', payload: id });
      const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
      localStorage.setItem('moneyTrackerData', JSON.stringify({ ...saved, transactions: (saved.transactions || []).filter((item) => !(item.emiLoanId === id && EMI_GENERATED_TAGS.has(item.tag))).map((item) => String(item.id) === String(loan.transactionId) ? { ...item, isEmiConverted: false, emiLoanId: null, emiLoanNumber: null, excludeFromBilling: false, emiConvertedAt: null } : item), emiLoans: (saved.emiLoans || []).filter((item) => item.id !== id) }));
    },
    payEMIInstallment: async (loanId, monthIndex, paidDate, paidTransactionId) => {
      const loan = state.emiLoans.find((item) => item.id === loanId);
      const installment = loan?.schedule?.[monthIndex];
      if (!loan || !installment || installment.status === 'paid') return;
      const effectivePaidDate = toISODate(paidDate);
      const paymentGroupId = paidTransactionId || `emi_payment_${Date.now()}`;
      const userId = state.user?.uid;
      const paymentTransactions = [
        { walletId: loan.walletId, type: 'expense', category: 'Bills', amount: installment.principalAmount, date: effectivePaidDate, description: `EMI principal - ${loan.loanNumber} (Month ${installment.month})`, tag: 'emi-principal', emiLoanId: loan.id, paymentId: paymentGroupId, affectsCreditUsed: false, userId },
        installment.interestAmount > 0 ? { walletId: loan.walletId, type: 'expense', category: 'Interest', amount: installment.interestAmount, date: effectivePaidDate, description: `EMI interest - ${loan.loanNumber} (Month ${installment.month})`, tag: 'emi-interest', emiLoanId: loan.id, paymentId: paymentGroupId, userId } : null,
        installment.igstOnInterest > 0 ? { walletId: loan.walletId, type: 'expense', category: 'Bills', amount: installment.igstOnInterest, date: addDaysISO(effectivePaidDate, 1), description: `IGST on EMI interest - ${loan.loanNumber} (Month ${installment.month})`, tag: 'emi-igst', emiLoanId: loan.id, paymentId: paymentGroupId, userId } : null,
      ].filter(Boolean);
      if (state.user) await Promise.all(paymentTransactions.map((entry) => create('transactions', entry)));
      paymentTransactions.forEach((entry, index) => dispatch({ type: 'ADD_TRANSACTION', payload: { ...entry, id: Date.now() + index } }));
      dispatch({ type: 'PAY_EMI_INSTALLMENT', payload: { loanId, monthIndex, paidDate: effectivePaidDate, paidTransactionId: paymentGroupId } });
      if (state.user) {
        const targetLoan = state.emiLoans.find((item) => item.id === loanId);
        if (targetLoan) {
          const updatedSchedule = targetLoan.schedule.map((entry, idx) => idx === monthIndex ? { ...entry, status: 'paid', paidDate: effectivePaidDate, paidTransactionId: paymentGroupId } : entry);
          const paidEMIs = updatedSchedule.filter((e) => e.status === 'paid').length;
          const remainingEMIs = updatedSchedule.length - paidEMIs;
          const outstandingPrincipal = updatedSchedule.filter((e) => e.status !== 'paid').reduce((sum, e) => sum + e.principalAmount, 0);
          await update('emiLoans', loanId, { schedule: updatedSchedule, paidEMIs, remainingEMIs, outstandingPrincipal, status: remainingEMIs === 0 ? 'completed' : 'active' });
        }
      }
      const saved = JSON.parse(localStorage.getItem('moneyTrackerData') || '{}');
      localStorage.setItem('moneyTrackerData', JSON.stringify({ ...saved, transactions: [...paymentTransactions.map((entry, index) => ({ ...entry, id: Date.now() + index })), ...(saved.transactions || [])], emiLoans: (saved.emiLoans || []).map(l => l.id !== loanId ? l : (() => { const u = l.schedule.map((e, i) => i === monthIndex ? { ...e, status: 'paid', paidDate: effectivePaidDate, paidTransactionId: paymentGroupId } : e); const p = u.filter(s => s.status === 'paid').length; const r = u.length - p; return { ...l, schedule: u, paidEMIs: p, remainingEMIs: r, outstandingPrincipal: u.filter(s => s.status !== 'paid').reduce((sum, s) => sum + s.principalAmount, 0), status: r === 0 ? 'completed' : 'active' }; })()) }));
    },
    syncEMILoanPostings: async () => {
      const now = new Date();
      const dueLoan = state.emiLoans.find((loan) => loan.status === 'active' && loan.schedule?.some((entry) => entry.status !== 'paid' && new Date(entry.emiDate) <= now));
      if (!dueLoan) return false;
      const monthIndex = dueLoan.schedule.findIndex((entry) => entry.status !== 'paid' && new Date(entry.emiDate) <= now);
      if (monthIndex < 0) return false;
      await value.payEMIInstallment(dueLoan.id, monthIndex, dueLoan.schedule[monthIndex].emiDate, `emi_auto_${dueLoan.id}_${dueLoan.schedule[monthIndex].month}`);
      return true;
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
