import React, { createContext, useContext, useReducer, useEffect } from 'react';
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
    payments: Array.isArray(wallet.payments) ? wallet.payments : [],
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
  emiLoans: [],
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

const toISODate = (value) => {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const createContextTransaction = (transaction) => ({
  ...transaction,
  id: transaction.id || Date.now() + Math.random(),
  date: toISODate(transaction.date),
  amount: Number(transaction.amount) || 0,
  type: transaction.type || 'expense',
  category: transaction.category || '',
  description: transaction.description || '',
});

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
    case 'ADD_EMI_LOAN':
      return {
        ...state,
        emiLoans: [...state.emiLoans, action.payload],
      };
    case 'UPDATE_EMI_LOAN':
      return {
        ...state,
        emiLoans: state.emiLoans.map((loan) =>
          loan.id === action.payload.id ? { ...loan, ...action.payload.updates } : loan
        ),
      };
    case 'DELETE_EMI_LOAN':
      return {
        ...state,
        emiLoans: state.emiLoans.filter((loan) => loan.id !== action.payload),
      };
    case 'PAY_EMI_INSTALLMENT': {
      const { loanId, monthIndex, paidDate, paidTransactionId } = action.payload;
      return {
        ...state,
        emiLoans: state.emiLoans.map((loan) => {
          if (loan.id !== loanId) return loan;
          const updatedSchedule = loan.schedule.map((entry, idx) =>
            idx === monthIndex
              ? { ...entry, status: 'paid', paidDate, paidTransactionId }
              : entry
          );
          const paidEMIs = updatedSchedule.filter(s => s.status === 'paid').length;
          const remainingEMIs = updatedSchedule.length - paidEMIs;
          const outstandingPrincipal = updatedSchedule
            .filter(s => s.status !== 'paid')
            .reduce((sum, s) => sum + s.principalAmount, 0);
          return {
            ...loan,
            schedule: updatedSchedule,
            paidEMIs,
            remainingEMIs,
            outstandingPrincipal,
            status: remainingEMIs === 0 ? 'completed' : 'active',
          };
        }),
      };
    }
    case 'UNPAY_EMI_INSTALLMENT': {
      const { loanId, monthIndex } = action.payload;
      return {
        ...state,
        emiLoans: state.emiLoans.map((loan) => {
          if (loan.id !== loanId) return loan;
          const updatedSchedule = loan.schedule.map((entry, idx) =>
            idx === monthIndex
              ? { ...entry, status: 'pending', paidDate: null, paidTransactionId: null }
              : entry
          );
          const paidEMIs = updatedSchedule.filter((entry) => entry.status === 'paid').length;
          const remainingEMIs = updatedSchedule.length - paidEMIs;
          const outstandingPrincipal = updatedSchedule
            .filter((entry) => entry.status !== 'paid')
            .reduce((sum, entry) => sum + entry.principalAmount, 0);
          return {
            ...loan,
            schedule: updatedSchedule,
            paidEMIs,
            remainingEMIs,
            outstandingPrincipal,
            status: remainingEMIs === 0 ? 'completed' : 'active',
          };
        }),
      };
    }
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
      emiLoans: state.emiLoans,
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
    state.emiLoans,
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

  const syncProcessingFeeChargeState = (transaction, options = {}) => {
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

    dispatch({ type: 'UPDATE_EMI_LOAN', payload: { id: loan.id, updates: { upcomingCharges: updatedCharges } } });
  };

  const value = {
    ...state,
    categories,
    dispatch,
    addTransaction: (transaction) => {
      // Ensure walletId is always set (use selected wallet if not provided)
      const walletId = String(transaction.walletId || state.selectedWallet || state.wallets[0]?.id || '1');

      // Ensure date is in ISO format
      let transactionDate = transaction.date;
      if (transactionDate) {
        try {
          // If date is already ISO string, use it; otherwise convert
          const dateObj = new Date(transactionDate);
          if (!isNaN(dateObj.getTime())) {
            transactionDate = dateObj.toISOString();
          } else {
            transactionDate = new Date().toISOString();
          }
        } catch {
          transactionDate = new Date().toISOString();
        }
      } else {
        transactionDate = new Date().toISOString();
      }

      const newTransaction = {
        ...transaction,
        walletId: walletId, // Always ensure walletId is set as string
        id: Date.now(),
        date: transactionDate,
        type: transaction.type || 'expense',
        amount: Number(transaction.amount) || 0,
        category: transaction.category || '',
        description: transaction.description || '',
      };

      dispatch({
        type: 'ADD_TRANSACTION',
        payload: newTransaction,
      });
    },
    updateTransaction: (id, updates) => {
      const existingTransaction = state.transactions.find((item) => item.id === id);
      dispatch({ type: 'UPDATE_TRANSACTION', payload: { id, updates } });
      if (existingTransaction?.tag === 'emi-processing-fee') {
        syncProcessingFeeChargeState(
          { ...existingTransaction, ...updates },
          {
            postedDate: updates.date || existingTransaction.date,
            scheduledDate: updates.date || existingTransaction.date,
            amount: updates.amount ?? existingTransaction.amount,
          }
        );
      }
    },
    deleteTransaction: (id) => {
      const transactionToDelete = state.transactions.find((item) => item.id === id);

      if (transactionToDelete?.paymentId && transactionToDelete.emiLoanId && (
        transactionToDelete.tag === 'emi-principal' ||
        transactionToDelete.tag === 'emi-payment' ||
        transactionToDelete.tag === 'emi-interest' ||
        transactionToDelete.tag === 'emi-igst'
      )) {
        const paymentId = transactionToDelete.paymentId;
        const loan = state.emiLoans.find((item) => item.id === transactionToDelete.emiLoanId);
        const monthIndex = loan?.schedule?.findIndex(
          (entry) => String(entry.paidTransactionId) === String(paymentId)
        ) ?? -1;

        state.transactions
          .filter((item) => String(item.paymentId) === String(paymentId))
          .forEach((item) => dispatch({ type: 'DELETE_TRANSACTION', payload: item.id }));

        if (loan && monthIndex >= 0) {
          dispatch({ type: 'UNPAY_EMI_INSTALLMENT', payload: { loanId: loan.id, monthIndex } });
        }
        return;
      }

      if (transactionToDelete?.tag === 'emi-processing-fee') {
        syncProcessingFeeChargeState(transactionToDelete, {
          deleted: true,
          scheduledDate: transactionToDelete.date,
          amount: transactionToDelete.amount,
        });
      }

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
    walletTransfer: (transferData) => {
      const { sourceWalletId, destinationWalletId, amount, interest = 0, description, date, category } = transferData;

      // Source wallet expense (the principal amount)
      addTransaction({
        type: 'expense',
        category: category || 'Transfer',
        amount: amount,
        walletId: sourceWalletId,
        date: date,
        description: description || 'Wallet Transfer',
        isTransfer: true,
        transferType: 'source_debit'
      });

      // Interest/Fee expense if applicable
      if (interest > 0) {
        addTransaction({
          type: 'expense',
          category: 'Interest',
          amount: interest,
          walletId: sourceWalletId,
          date: date,
          description: `Interest/Fee for transfer: ${description || ''}`,
          isTransfer: true,
          transferType: 'interest'
        });
      }

      // Destination wallet income
      addTransaction({
        type: 'income',
        category: category || 'Transfer',
        amount: amount,
        walletId: destinationWalletId,
        date: date,
        description: description || 'Wallet Transfer',
        isTransfer: true,
        transferType: 'destination_credit'
      });
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
    // EMI Loan functions
    addEMILoan: (loanData) => {
      const transaction = state.transactions.find(
        (item) => String(item.id) === String(loanData.transactionId)
      );

      if (!transaction) {
        throw new Error('The selected transaction could not be found.');
      }

      if (transaction.isEmiConverted) {
        throw new Error('This transaction has already been converted to EMI.');
      }

      const loan = buildEMILoanPayload(loanData, transaction);

      dispatch({ type: 'ADD_EMI_LOAN', payload: loan });
      dispatch({
        type: 'UPDATE_TRANSACTION',
        payload: {
          id: transaction.id,
          updates: {
            isEmiConverted: true,
            emiLoanId: loan.id,
            emiLoanNumber: loan.loanNumber,
            excludeFromBilling: true,
            emiConvertedAt: new Date().toISOString(),
          },
        },
      });
    },
    updateEMILoan: (id, updates) => {
      dispatch({ type: 'UPDATE_EMI_LOAN', payload: { id, updates } });
    },
    editEMILoanDetails: (loanId, loanData) => {
      const existingLoan = state.emiLoans.find((item) => item.id === loanId);
      if (!existingLoan) {
        throw new Error('The EMI loan could not be found.');
      }

      const transaction = state.transactions.find(
        (item) => String(item.id) === String(existingLoan.transactionId)
      );
      if (!transaction) {
        throw new Error('The original transaction could not be found.');
      }

      const hasGeneratedTransactions = state.transactions.some(
        (item) => item.emiLoanId === loanId && EMI_GENERATED_TAGS.has(item.tag)
      );
      const hasPostedCharges = (existingLoan.upcomingCharges || []).some((charge) => charge.posted);
      if (existingLoan.paidEMIs > 0 || hasGeneratedTransactions || hasPostedCharges) {
        throw new Error('You can edit EMI details only before any EMI charges or installments are posted.');
      }

      const recalculatedLoan = buildEMILoanPayload(
        {
          ...existingLoan,
          ...loanData,
          id: existingLoan.id,
          loanNumber: existingLoan.loanNumber,
          loanBookedDate: existingLoan.loanBookedDate,
          createdAt: existingLoan.createdAt,
          transactionId: existingLoan.transactionId,
          transactionDescription: existingLoan.transactionDescription,
          originalTransactionDate: existingLoan.originalTransactionDate,
        },
        transaction
      );

      dispatch({ type: 'UPDATE_EMI_LOAN', payload: { id: loanId, updates: recalculatedLoan } });
    },
    postEMICharge: (loanId, chargeKey, postedDate) => {
      const loan = state.emiLoans.find((item) => item.id === loanId);
      const charge = loan?.upcomingCharges?.find((item) => item.key === chargeKey && !item.posted);
      const existingChargeTransaction = state.transactions.find(
        (item) =>
          item.emiLoanId === loanId &&
          item.tag === 'emi-processing-fee' &&
          item.emiChargeType === chargeKey
      );

      if (!loan || existingChargeTransaction || !charge) {
        return;
      }

      const effectiveDate = toISODate(postedDate || charge.scheduledDate);
      dispatch({
        type: 'ADD_TRANSACTION',
        payload: createContextTransaction({
          walletId: loan.walletId,
          type: 'expense',
          category: 'Bills',
          amount: charge.amount,
          date: effectiveDate,
          description: `${charge.label} - ${loan.loanNumber}`,
          tag: 'emi-processing-fee',
          emiLoanId: loan.id,
          emiChargeType: charge.key,
        }),
      });

      const updatedCharges = (loan.upcomingCharges || []).map((item) =>
        item.key === chargeKey ? { ...item, posted: true, postedDate: effectiveDate, scheduledDate: effectiveDate } : item
      );

      dispatch({ type: 'UPDATE_EMI_LOAN', payload: { id: loan.id, updates: { upcomingCharges: updatedCharges } } });
    },
    deleteEMILoan: (id) => {
      const loan = state.emiLoans.find((item) => item.id === id);
      if (!loan) return;

      state.transactions
        .filter((item) => item.emiLoanId === id && EMI_GENERATED_TAGS.has(item.tag))
        .forEach((item) => dispatch({ type: 'DELETE_TRANSACTION', payload: item.id }));

      if (loan.transactionId) {
        dispatch({
          type: 'UPDATE_TRANSACTION',
          payload: {
            id: loan.transactionId,
            updates: {
              isEmiConverted: false,
              emiLoanId: null,
              emiLoanNumber: null,
              excludeFromBilling: false,
              emiConvertedAt: null,
            },
          },
        });
      }

      dispatch({ type: 'DELETE_EMI_LOAN', payload: id });
    },
    payEMIInstallment: (loanId, monthIndex, paidDate, paidTransactionId) => {
      const loan = state.emiLoans.find((item) => item.id === loanId);
      const installment = loan?.schedule?.[monthIndex];

      if (!loan || !installment || installment.status === 'paid') {
        return;
      }

      const effectivePaidDate = toISODate(paidDate);
      const paymentGroupId = paidTransactionId || `emi_payment_${Date.now()}`;

      dispatch({
        type: 'ADD_TRANSACTION',
        payload: createContextTransaction({
          walletId: loan.walletId,
          type: 'expense',
          category: 'Bills',
          amount: installment.principalAmount,
          date: effectivePaidDate,
          description: `EMI principal - ${loan.loanNumber} (Month ${installment.month})`,
          tag: 'emi-principal',
          emiLoanId: loan.id,
          paymentId: paymentGroupId,
          affectsCreditUsed: false,
        }),
      });

      if (installment.interestAmount > 0) {
        dispatch({
          type: 'ADD_TRANSACTION',
          payload: createContextTransaction({
            walletId: loan.walletId,
            type: 'expense',
            category: 'Interest',
            amount: installment.interestAmount,
            date: effectivePaidDate,
            description: `EMI interest - ${loan.loanNumber} (Month ${installment.month})`,
            tag: 'emi-interest',
            emiLoanId: loan.id,
            paymentId: paymentGroupId,
          }),
        });
      }

      if (installment.igstOnInterest > 0) {
        dispatch({
          type: 'ADD_TRANSACTION',
          payload: createContextTransaction({
            walletId: loan.walletId,
            type: 'expense',
            category: 'Bills',
            amount: installment.igstOnInterest,
            date: addDaysISO(effectivePaidDate, 1),
            description: `IGST on EMI interest - ${loan.loanNumber} (Month ${installment.month})`,
            tag: 'emi-igst',
            emiLoanId: loan.id,
            paymentId: paymentGroupId,
          }),
        });
      }

      dispatch({
        type: 'PAY_EMI_INSTALLMENT',
        payload: { loanId, monthIndex, paidDate: effectivePaidDate, paidTransactionId: paymentGroupId },
      });
    },
    syncEMILoanPostings: () => {
      const now = new Date();
      const dueLoan = state.emiLoans.find((loan) =>
        loan.status === 'active' &&
        loan.schedule?.some((entry) => entry.status !== 'paid' && new Date(entry.emiDate) <= now)
      );

      if (!dueLoan) return false;

      const monthIndex = dueLoan.schedule.findIndex(
        (entry) => entry.status !== 'paid' && new Date(entry.emiDate) <= now
      );

      if (monthIndex < 0) return false;

      value.payEMIInstallment(
        dueLoan.id,
        monthIndex,
        dueLoan.schedule[monthIndex].emiDate,
        `emi_auto_${dueLoan.id}_${dueLoan.schedule[monthIndex].month}`
      );
      return true;
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
