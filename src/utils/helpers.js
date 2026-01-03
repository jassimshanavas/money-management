import { format, isThisMonth, parseISO, addDays, addMonths, startOfMonth, endOfMonth, getDate, isAfter, isBefore, differenceInDays } from 'date-fns';

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateString) => {
  try {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  } catch {
    return dateString;
  }
};

export const getMonthlyTransactions = (transactions) => {
  return transactions.filter((t) => isThisMonth(parseISO(t.date)));
};

/**
 * Get transactions for a specific month and year
 * @param {Array} transactions - Array of transaction objects
 * @param {number} year - Year (e.g., 2024)
 * @param {number} month - Month (0-11, where 0 is January)
 * @returns {Array} Filtered transactions for the specified month
 */
export const getTransactionsForMonth = (transactions, year, month) => {
  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(new Date(year, month, 1));
  
  return transactions.filter((t) => {
    const transDate = parseISO(t.date);
    return transDate >= monthStart && transDate <= monthEnd;
  });
};

/**
 * Get list of available months from transactions
 * @param {Array} transactions - Array of transaction objects
 * @returns {Array} Array of {year, month, label} objects sorted by date (newest first)
 */
export const getAvailableMonths = (transactions) => {
  const monthSet = new Set();
  
  transactions.forEach((t) => {
    const transDate = parseISO(t.date);
    const year = transDate.getFullYear();
    const month = transDate.getMonth();
    monthSet.add(`${year}-${month}`);
  });
  
  const months = Array.from(monthSet)
    .map((key) => {
      const [year, month] = key.split('-').map(Number);
      return {
        year,
        month,
        label: format(new Date(year, month, 1), 'MMMM yyyy'),
        value: `${year}-${month}`,
      };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  
  return months;
};

export const calculateTotals = (transactions) => {
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return { income, expenses, balance: income - expenses };
};

export const getCategoryTotals = (transactions) => {
  const categoryTotals = {};
  
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
  
  return categoryTotals;
};

/**
 * Get totals grouped by tag
 * @param {Array} transactions - Array of transaction objects
 * @returns {Object} Object with tag names as keys and total amounts as values
 */
export const getTagTotals = (transactions) => {
  const tagTotals = {};
  
  transactions
    .filter((t) => t.type === 'expense' && t.tag)
    .forEach((t) => {
      tagTotals[t.tag] = (tagTotals[t.tag] || 0) + t.amount;
    });
  
  return tagTotals;
};

/**
 * Calculate billing cycle dates for a credit card
 */
// export const getBillingCycleDates = (billingDate, lastBillingDate = null, dueDateDuration = 20) => {
//   if (!billingDate || billingDate < 1 || billingDate > 31) {
//     return null;
//   }

//   const today = new Date();
//   const currentMonth = today.getMonth();
//   const currentYear = today.getFullYear();
  
//   // Get the last billing date or calculate from billing day
//   let lastBilling = lastBillingDate ? (typeof lastBillingDate === 'string' ? parseISO(lastBillingDate) : lastBillingDate) : null;
  
//   if (!lastBilling) {
//     // Calculate last billing date based on billing day
//     // Handle month-end dates (e.g., if billing date is 31 but month has 30 days)
//     const daysInThisMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
//     const daysInLastMonth = new Date(currentYear, currentMonth, 0).getDate();
//     const actualBillingDay = Math.min(billingDate, daysInThisMonth);
//     const actualLastMonthBillingDay = Math.min(billingDate, daysInLastMonth);
    
//     const thisMonthBilling = new Date(currentYear, currentMonth, actualBillingDay);
//     if (isAfter(today, thisMonthBilling) || getDate(today) >= billingDate) {
//       lastBilling = thisMonthBilling;
//     } else {
//       lastBilling = new Date(currentYear, currentMonth - 1, actualLastMonthBillingDay);
//     }
//   }

//   // Next billing date is next month's billing day
//   const nextBilling = addMonths(lastBilling, 1);
  
//   // Due date is based on dueDateDuration days after billing
//   const dueDate = addDays(nextBilling, dueDateDuration);
  
//   return {
//     lastBillingDate: lastBilling,
//     nextBillingDate: nextBilling,
//     dueDate,
//     billingDay: billingDate,
//     dueDateDuration,
//   };
// };

export const getBillingCycleDates = (billingDate, lastBillingDate = null, dueDateDuration = 20) => {
  if (!billingDate || billingDate < 1 || billingDate > 31) {
    return null;
  }

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  let lastBilling = lastBillingDate ? (typeof lastBillingDate === 'string' ? parseISO(lastBillingDate) : lastBillingDate) : null;
  
  if (!lastBilling) {
    const daysInThisMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInLastMonth = new Date(currentYear, currentMonth, 0).getDate();
    const actualBillingDay = Math.min(billingDate, daysInThisMonth);
    const actualLastMonthBillingDay = Math.min(billingDate, daysInLastMonth);
    
    const thisMonthBilling = new Date(currentYear, currentMonth, actualBillingDay);
    if (today >= thisMonthBilling) {
      lastBilling = thisMonthBilling;
    } else {
      lastBilling = new Date(currentYear, currentMonth - 1, actualLastMonthBillingDay);
    }
  }

  const nextBilling = addMonths(lastBilling, 1);
  
  // CRITICAL FIX: Due date should be for the CURRENT bill (last billing + duration)
  // NOT for the next billing cycle
  const currentBillDueDate = addDays(lastBilling, dueDateDuration);
  const nextBillDueDate = addDays(nextBilling, dueDateDuration);
  
  return {
    lastBillingDate: lastBilling,
    nextBillingDate: nextBilling,
    currentBillDueDate, // Due date for the bill that was generated on lastBillingDate
    nextBillDueDate,    // Due date for the bill that will be generated on nextBillingDate
    dueDate: currentBillDueDate, // Default to current bill's due date
    billingDay: billingDate,
    dueDateDuration,
  };
};

/**
 * Check if current date is between billing date and due date
 */
// export const isBetweenBillingAndDue = (billingDate, lastBillingDate, dueDateDuration = 20) => {
//   const cycleDates = getBillingCycleDates(billingDate, lastBillingDate, dueDateDuration);
//   if (!cycleDates) return false;
  
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const lastBilling = new Date(cycleDates.lastBillingDate);
//   lastBilling.setHours(0, 0, 0, 0);
//   const dueDate = new Date(cycleDates.dueDate);
//   dueDate.setHours(0, 0, 0, 0);
  
//   return (isAfter(today, lastBilling) || today.getTime() === lastBilling.getTime()) && 
//          (isBefore(today, dueDate) || today.getTime() === dueDate.getTime());
// };


export const isBetweenBillingAndDue = (billingDate, lastBillingDate, dueDateDuration = 20) => {
  const cycleDates = getBillingCycleDates(billingDate, lastBillingDate, dueDateDuration);
  if (!cycleDates) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastBilling = new Date(cycleDates.lastBillingDate);
  lastBilling.setHours(0, 0, 0, 0);
  const dueDate = new Date(cycleDates.currentBillDueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  return today >= lastBilling && today <= dueDate;
};
/**
 * Get transactions for current billing cycle
 */
export const getCurrentBillingCycleTransactions = (transactions, billingDate, lastBillingDate = null, dueDateDuration = 20) => {
  const cycleDates = getBillingCycleDates(billingDate, lastBillingDate, dueDateDuration);
  if (!cycleDates) return transactions;
  
  return transactions.filter((t) => {
    const transDate = parseISO(t.date);
    return isAfter(transDate, cycleDates.lastBillingDate) || 
           transDate.getTime() === cycleDates.lastBillingDate.getTime();
  });
};

/**
 * Process billing cycle - check if billing date has passed and generate new bill
 * Returns updated wallet data if billing cycle should be processed
 */
// export const processBillingCycle = (wallet, transactions) => {
//   if (wallet.type !== 'credit' || !wallet.billingDate) {
//     return null;
//   }

//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
  
//   const billingDate = Number(wallet.billingDate);
//   const dueDateDuration = Number(wallet.dueDateDuration ?? 20);
//   const lastBillingDate = wallet.lastBillingDate || null;
  
//   // Calculate next billing date
//   const cycleDates = getBillingCycleDates(billingDate, lastBillingDate, dueDateDuration);
//   if (!cycleDates) return null;
  
//   const nextBilling = new Date(cycleDates.nextBillingDate);
//   nextBilling.setHours(0, 0, 0, 0);
  
//   // Check if billing date has arrived
//   if (isAfter(today, nextBilling) || today.getTime() === nextBilling.getTime()) {
//     // Get all transactions for this wallet
//     const walletTransactions = transactions.filter((t) => String(t.walletId) === String(wallet.id));
    
//     // Calculate unbilled amount (transactions after last billing date)
//     const lastBilling = new Date(cycleDates.lastBillingDate);
//     lastBilling.setHours(0, 0, 0, 0);
    
//     const unbilledTransactions = walletTransactions.filter((t) => {
//       const transDate = parseISO(t.date);
//       return isAfter(transDate, lastBilling) || transDate.getTime() === lastBilling.getTime();
//     });
    
//     const { expenses, income } = calculateTotals(unbilledTransactions);
//     const unbilledAmount = Math.max(0, expenses - income);
    
//     // The unbilled amount becomes the new billed amount
//     // Reset payments for the new cycle
//     return {
//       lastBillingDate: nextBilling.toISOString(),
//       lastBilledAmount: unbilledAmount,
//       payments: [], // Reset payments for new cycle
//     };
//   }
  
//   return null;
// };
// In utils/helpers.js
// export function processBillingCycle(wallet, transactions, forceAdvance = false) {
//   if (wallet.type !== 'credit' || !wallet.billingDate) return null;

//   const today = new Date();
//   const billingDay = wallet.billingDate;
//   const dueAfterDays = wallet.dueDateDuration || 20;
//   const walletLastBillingDate = wallet.lastBillingDate ? parseISO(wallet.lastBillingDate) : null;

//   const cycleDates = getBillingCycleDates(billingDay, walletLastBillingDate, dueAfterDays);
//   if (!cycleDates) return null;

//   const { lastBillingDate, nextBillingDate, dueDate } = cycleDates;

//   // Only advance if we're past due date OR forceAdvance = true (e.g. full payment)
//   const shouldAdvance = forceAdvance || (dueDate && today > dueDate);

//   if (shouldAdvance && lastBillingDate) {
//     // Get the current wallet summary to get the unbilled amount
//     const currentSummary = getWalletSummary(wallet, transactions);
//     const currentUnbilledAmount = currentSummary.unbilledAmount || 0;

//     return {
//       lastBillingDate: nextBillingDate.toISOString(),
//       lastBilledAmount: currentUnbilledAmount,
//       currentStatementBalance: currentUnbilledAmount,
//       dueDate: addDays(nextBillingDate, dueAfterDays).toISOString(),
//       unbilledAmount: 0,
//       hasUnpaidBill: currentUnbilledAmount > 0,
//       unpaidBillAmount: currentUnbilledAmount > 0 ? currentUnbilledAmount : 0,
//     };
//   }

//   return null;
// }

// export function processBillingCycle(wallet, transactions, forceAdvance = false) {
//   if (wallet.type !== 'credit' || !wallet.billingDate) return null;

//   const today = new Date();
//   const billingDay = wallet.billingDate;
//   const dueAfterDays = wallet.dueDateDuration || 20;
//   const walletLastBillingDate = wallet.lastBillingDate ? parseISO(wallet.lastBillingDate) : null;

//   const cycleDates = getBillingCycleDates(billingDay, walletLastBillingDate, dueAfterDays);
//   if (!cycleDates) return null;

//   const { lastBillingDate, nextBillingDate, dueDate } = cycleDates;

//   // Only advance when we reach the NEXT billing date (not on payment)
//   // forceAdvance should only be used for testing/manual cycle advancement
//   const shouldAdvance = today >= nextBillingDate || forceAdvance;

//   if (shouldAdvance && lastBillingDate) {
//     // Get current wallet summary BEFORE advancing
//     const currentSummary = getWalletSummary(wallet, transactions);
//     const currentUnbilledAmount = currentSummary.unbilledAmount || 0;

//     // When advancing cycle:
//     // - The unbilled amount becomes the new Last Billed Amount
//     // - This new billed amount starts as unpaid
//     // - Payments array resets for the new cycle
//     return {
//       lastBillingDate: nextBillingDate.toISOString(),
//       lastBilledAmount: currentUnbilledAmount, // Unbilled becomes new bill
//       dueDate: addDays(nextBillingDate, dueAfterDays).toISOString(),
//       payments: [], // Reset payments for new cycle
//       hasUnpaidBill: currentUnbilledAmount > 0,
//       unpaidBillAmount: currentUnbilledAmount,
//     };
//   }

//   return null;
// }

export function processBillingCycle(wallet, transactions, forceAdvance = false) {
  if (wallet.type !== 'credit' || !wallet.billingDate) return null;

  const today = new Date();
  const billingDay = wallet.billingDate;
  const dueAfterDays = wallet.dueDateDuration || 20;
  const walletLastBillingDate = wallet.lastBillingDate ? parseISO(wallet.lastBillingDate) : null;

  const cycleDates = getBillingCycleDates(billingDay, walletLastBillingDate, dueAfterDays);
  if (!cycleDates) return null;

  const { lastBillingDate, nextBillingDate, nextBillDueDate } = cycleDates;

  // Only advance when we reach the NEXT billing date
  const shouldAdvance = today >= nextBillingDate || forceAdvance;

  if (shouldAdvance && lastBillingDate) {
    // Get current wallet summary BEFORE advancing
    const currentSummary = getWalletSummary(wallet, transactions);
    const currentUnbilledAmount = currentSummary.unbilledAmount || 0;

    return {
      lastBillingDate: nextBillingDate.toISOString(),
      lastBilledAmount: currentUnbilledAmount,
      dueDate: nextBillDueDate.toISOString(), // Due date for the NEW bill
      payments: [],
      hasUnpaidBill: currentUnbilledAmount > 0,
      unpaidBillAmount: currentUnbilledAmount,
    };
  }

  return null;
}


// export const getWalletSummary = (wallet, transactions) => {
//   if (!wallet) {
//     return {
//       income: 0,
//       expenses: 0,
//       calculatedBalance: 0,
//       transactionCount: 0,
//       initialBalance: 0,
//       creditLimit: 0,
//       creditUsed: 0,
//       availableCredit: 0,
//       creditUtilization: 0,
//       currentStatementBalance: 0,
//       lastBilledAmount: 0,
//       nextBillingDate: null,
//       dueDate: null,
//       daysUntilDue: null,
//     };
//   }

//   const walletTransactions = transactions.filter((t) => String(t.walletId) === String(wallet.id));
//   const { income, expenses } = calculateTotals(walletTransactions);
//   const initialBalance = Number(wallet.balance ?? 0) || 0;
//   const walletType = wallet.type || 'cash';

//   const baseSummary = {
//     income,
//     expenses,
//     transactionCount: walletTransactions.length,
//     initialBalance,
//     calculatedBalance: initialBalance + income - expenses,
//   };

//   if (walletType === 'credit') {
//     const creditLimit = Number(wallet.creditLimit ?? 0) || 0;
    
//     // For credit cards: Credit Limit Used = initial debt + expenses - payments (income)
//     const creditUsed = Math.max(0, initialBalance + expenses - income);
//     const availableCredit = Math.max(0, creditLimit - creditUsed);
//     const creditUtilization = creditLimit > 0 ? Math.min(1, creditUsed / creditLimit) : 0;

//     // Calculate billing cycle information
//     const billingDate = wallet.billingDate ? Number(wallet.billingDate) : null;
//     const lastBillingDate = wallet.lastBillingDate || null;
//     const dueDateDuration = wallet.dueDateDuration ? Number(wallet.dueDateDuration) : 20;
//     const cycleDates = billingDate ? getBillingCycleDates(billingDate, lastBillingDate, dueDateDuration) : null;
    
//     // Calculate unpaid billed amount and unbilled amount
//     const lastBilledAmount = Number(wallet.lastBilledAmount ?? 0) || 0;
//     const payments = wallet.payments || [];
//     const totalPayments = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
//     const unpaidBillAmount = Math.max(0, lastBilledAmount - totalPayments);
//     const hasUnpaidBill = unpaidBillAmount > 0 && lastBilledAmount > 0;
    
//     // Unbilled amount = Credit Limit Used - Last Billed Amount
//     // This represents transactions after the last billing date
//     const unbilledAmount = Math.max(0, creditUsed - lastBilledAmount);
    
//     // Current statement balance is the unbilled amount (will become next bill)
//     const currentStatementBalance = unbilledAmount;
    
//     // Calculate days until due
//     let daysUntilDue = null;
//     if (cycleDates && cycleDates.dueDate) {
//       const today = new Date();
//       const diff = differenceInDays(cycleDates.dueDate, today);
//       daysUntilDue = diff;
//     }

//     return {
//       ...baseSummary,
//       calculatedBalance: -creditUsed,
//       creditLimit,
//       creditUsed,
//       availableCredit,
//       creditUtilization,
//       currentStatementBalance,
//       lastBilledAmount,
//       unpaidBillAmount,
//       unbilledAmount,
//       hasUnpaidBill,
//       totalPayments,
//       nextBillingDate: cycleDates?.nextBillingDate || null,
//       dueDate: cycleDates?.dueDate || null,
//       daysUntilDue,
//       billingDate: billingDate,
//       dueDateDuration,
//     };
//   }

//   return baseSummary;
// };

// export const getWalletSummary = (wallet, transactions) => {
//   if (!wallet) {
//     return {
//       income: 0,
//       expenses: 0,
//       calculatedBalance: 0,
//       transactionCount: 0,
//       initialBalance: 0,
//       creditLimit: 0,
//       creditUsed: 0,
//       availableCredit: 0,
//       creditUtilization: 0,
//       currentStatementBalance: 0,
//       lastBilledAmount: 0,
//       nextBillingDate: null,
//       dueDate: null,
//       daysUntilDue: null,
//       unbilledAmount: 0,
//       hasUnpaidBill: false,
//       unpaidBillAmount: 0,
//     };
//   }

//   const walletTransactions = transactions.filter((t) => String(t.walletId) === String(wallet.id));
//   const { income, expenses } = calculateTotals(walletTransactions);
//   const initialBalance = Number(wallet.balance ?? 0) || 0;
//   const walletType = wallet.type || 'cash';

//   const baseSummary = {
//     income,
//     expenses,
//     transactionCount: walletTransactions.length,
//     initialBalance,
//     calculatedBalance: initialBalance + income - expenses,
//   };

//   if (walletType === 'credit') {
//     const creditLimit = Number(wallet.creditLimit ?? 0) || 0;

//     // === STEP 1: Calculate total payments made ===
//     const payments = wallet.payments || [];
//     const totalPayments = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

//     // === STEP 2: Calculate creditUsed BEFORE payments ===
//     // This is the total owed before any payments are made
//     const creditUsedBeforePayments = Math.max(0, initialBalance + expenses - income);
    
//     // === STEP 3: Billing cycle info ===
//     const billingDate = wallet.billingDate ? Number(wallet.billingDate) : null;
//     const lastBillingDate = wallet.lastBillingDate ? parseISO(wallet.lastBillingDate) : null;
//     const dueDateDuration = Number(wallet.dueDateDuration ?? 20);
//     const cycleDates = billingDate ? getBillingCycleDates(billingDate, lastBillingDate, dueDateDuration) : null;

//     // === STEP 4: Last billed amount & unpaid bill ===
//     const lastBilledAmount = Number(wallet.lastBilledAmount ?? 0) || 0;
//     const unpaidBillAmount = Math.max(0, lastBilledAmount - totalPayments);
//     const hasUnpaidBill = unpaidBillAmount > 0;

//     // === STEP 5: UNBILLED AMOUNT ===
//     let unbilledAmount = 0;

//     if (lastBillingDate) {
//       // Unbilled = creditUsedBeforePayments - lastBilledAmount
//       // This represents new spending since the last bill (NOT affected by payments)
//       unbilledAmount = Math.max(0, creditUsedBeforePayments - lastBilledAmount);
//     } else if (billingDate) {
//       // If lastBillingDate is NOT set but billingDate is configured,
//       // treat all current expenses as unbilled (first billing cycle)
//       const unbilledExpenses = walletTransactions
//         .filter((t) => t.type === 'expense')
//         .reduce((sum, t) => sum + t.amount, 0);

//       const nonPaymentIncome = walletTransactions
//         .filter((t) => t.type === 'income' && !t.isBillPayment)
//         .reduce((sum, t) => sum + t.amount, 0);

//       unbilledAmount = Math.max(0, unbilledExpenses - nonPaymentIncome);
//     }

//     // Current statement balance = what will be billed next
//     const currentStatementBalance = unbilledAmount;

//     // === STEP 6: Calculate final creditUsed (after payments) ===
//     // creditUsed = creditUsedBeforePayments - totalPayments
//     const creditUsed = Math.max(0, creditUsedBeforePayments - totalPayments);
//     const availableCredit = Math.max(0, creditLimit - creditUsed);
//     const creditUtilization = creditLimit > 0 ? Math.min(1, creditUsed / creditLimit) : 0;

//     // === STEP 7: Due date info ===
//     let daysUntilDue = null;
//     if (cycleDates?.dueDate) {
//       const due = cycleDates.dueDate instanceof Date ? cycleDates.dueDate : parseISO(cycleDates.dueDate);
//       daysUntilDue = differenceInDays(due, new Date());
//     }

//     return {
//       ...baseSummary,
//       calculatedBalance: -creditUsed,
//       creditLimit,
//       creditUsed,
//       availableCredit,
//       creditUtilization,
//       currentStatementBalance,
//       lastBilledAmount,
//       unpaidBillAmount,
//       unbilledAmount,
//       hasUnpaidBill,
//       totalPayments,
//       nextBillingDate: cycleDates?.nextBillingDate || null,
//       dueDate: cycleDates?.dueDate || null,
//       daysUntilDue,
//       billingDate,
//       dueDateDuration,
//     };
//   }

//   return baseSummary;
// };


// export const getWalletSummary = (wallet, transactions) => {
//   if (!wallet) {
//     return {
//       income: 0,
//       expenses: 0,
//       calculatedBalance: 0,
//       transactionCount: 0,
//       initialBalance: 0,
//       creditLimit: 0,
//       creditUsed: 0,
//       availableCredit: 0,
//       creditUtilization: 0,
//       currentStatementBalance: 0,
//       lastBilledAmount: 0,
//       nextBillingDate: null,
//       dueDate: null,
//       daysUntilDue: null,
//       unbilledAmount: 0,
//       hasUnpaidBill: false,
//       unpaidBillAmount: 0,
//       totalPayments: 0,
//     };
//   }

//   const walletTransactions = transactions.filter((t) => String(t.walletId) === String(wallet.id));
//   const { income, expenses } = calculateTotals(walletTransactions);
//   const initialBalance = Number(wallet.balance ?? 0) || 0;
//   const walletType = wallet.type || 'cash';

//   const baseSummary = {
//     income,
//     expenses,
//     transactionCount: walletTransactions.length,
//     initialBalance,
//     calculatedBalance: initialBalance + income - expenses,
//   };

//   if (walletType === 'credit') {
//     const creditLimit = Number(wallet.creditLimit ?? 0) || 0;

//     // === PERFECT CALCULATION LOGIC ===
    
//     // STEP 1: Get all payments from current billing cycle
//     const storedPayments = wallet.payments || [];
//     const storedPaymentsTotal = storedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
//     // STEP 2: Calculate Credit Limit Used
//     // Formula: Initial Debt (wallet.balance) + Expenses - Income (refunds/credits)
//     // NOTE: wallet.balance gets reduced when payments are made, so payments are already reflected
//     const creditUsed = Math.max(0, initialBalance + expenses - income);
    
//     // STEP 3: Calculate available credit and utilization
//     const availableCredit = Math.max(0, creditLimit - creditUsed);
//     const creditUtilization = creditLimit > 0 ? Math.min(1, creditUsed / creditLimit) : 0;

//     // STEP 4: Get billing cycle information
//     const billingDate = wallet.billingDate ? Number(wallet.billingDate) : null;
//     const lastBillingDate = wallet.lastBillingDate ? parseISO(wallet.lastBillingDate) : null;
//     const dueDateDuration = Number(wallet.dueDateDuration ?? 20);
//     const cycleDates = billingDate ? getBillingCycleDates(billingDate, lastBillingDate, dueDateDuration) : null;

//     // STEP 5: Calculate Last Billed Amount and Unpaid Bill
//     const lastBilledAmount = Number(wallet.lastBilledAmount ?? 0) || 0;
    
//     // Unpaid Bill Amount = Last Billed Amount - Payments Made (in current cycle)
//     const unpaidBillAmount = Math.max(0, lastBilledAmount - storedPaymentsTotal);
//     const hasUnpaidBill = unpaidBillAmount > 0;
    
//     // STEP 6: Calculate Unbilled Amount (Current Statement Balance)
//     // This is the tricky part - we need to calculate what's been spent since last billing
//     // Formula: Credit Limit Used - Unpaid Bill Amount
//     // Example:
//     //   Credit Used = $24,594.70
//     //   Unpaid Bill = $18,603.00
//     //   Unbilled = $24,594.70 - $18,603.00 = $5,991.70 ✓
//     //
//     // After paying $18,603:
//     //   Credit Used = $5,991.70
//     //   Unpaid Bill = $0.00
//     //   Unbilled = $5,991.70 - $0.00 = $5,991.70 ✓
//     const unbilledAmount = Math.max(0, creditUsed - unpaidBillAmount);
    
//     // Current statement balance = what will appear on the next bill
//     const currentStatementBalance = unbilledAmount;

//     // STEP 7: Calculate days until due date
//     let daysUntilDue = null;
//     if (cycleDates?.dueDate) {
//       const due = cycleDates.dueDate instanceof Date ? cycleDates.dueDate : parseISO(cycleDates.dueDate);
//       daysUntilDue = differenceInDays(due, new Date());
//     }

//     return {
//       ...baseSummary,
//       calculatedBalance: -creditUsed, // Negative for display (shows as debt)
//       creditLimit,
//       creditUsed,
//       availableCredit,
//       creditUtilization,
//       currentStatementBalance,
//       lastBilledAmount,
//       unpaidBillAmount,
//       unbilledAmount,
//       hasUnpaidBill,
//       totalPayments: storedPaymentsTotal,
//       nextBillingDate: cycleDates?.nextBillingDate || null,
//       dueDate: cycleDates?.dueDate || null,
//       daysUntilDue,
//       billingDate,
//       dueDateDuration,
//     };
//   }

//   return baseSummary;
// };



export const getWalletSummary = (wallet, transactions) => {
  if (!wallet) {
    return {
      income: 0,
      expenses: 0,
      calculatedBalance: 0,
      transactionCount: 0,
      initialBalance: 0,
      creditLimit: 0,
      creditUsed: 0,
      availableCredit: 0,
      creditUtilization: 0,
      currentStatementBalance: 0,
      lastBilledAmount: 0,
      nextBillingDate: null,
      dueDate: null,
      daysUntilDue: null,
      unbilledAmount: 0,
      hasUnpaidBill: false,
      unpaidBillAmount: 0,
      totalPayments: 0,
    };
  }

  const walletTransactions = transactions.filter((t) => String(t.walletId) === String(wallet.id));
  const { income, expenses } = calculateTotals(walletTransactions);
  const initialBalance = Number(wallet.balance ?? 0) || 0;
  const walletType = wallet.type || 'cash';

  const baseSummary = {
    income,
    expenses,
    transactionCount: walletTransactions.length,
    initialBalance,
    calculatedBalance: initialBalance + income - expenses,
  };

  if (walletType === 'credit') {
    const creditLimit = Number(wallet.creditLimit ?? 0) || 0;

    // === PERFECT CALCULATION LOGIC ===
    
    // STEP 1: Get all payments from current billing cycle
    const storedPayments = wallet.payments || [];
    const storedPaymentsTotal = storedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    // STEP 2: Calculate Credit Limit Used
    const creditUsed = Math.max(0, initialBalance + expenses - income);
    
    // STEP 3: Calculate available credit and utilization
    const availableCredit = Math.max(0, creditLimit - creditUsed);
    const creditUtilization = creditLimit > 0 ? Math.min(1, creditUsed / creditLimit) : 0;

    // STEP 4: Get billing cycle information
    const billingDate = wallet.billingDate ? Number(wallet.billingDate) : null;
    const lastBillingDate = wallet.lastBillingDate ? parseISO(wallet.lastBillingDate) : null;
    const dueDateDuration = Number(wallet.dueDateDuration ?? 20);
    const cycleDates = billingDate ? getBillingCycleDates(billingDate, lastBillingDate, dueDateDuration) : null;

    // STEP 5: Calculate Last Billed Amount and Unpaid Bill
    const lastBilledAmount = Number(wallet.lastBilledAmount ?? 0) || 0;
    const unpaidBillAmount = Math.max(0, lastBilledAmount - storedPaymentsTotal);
    const hasUnpaidBill = unpaidBillAmount > 0;
    
    // STEP 6: Calculate Unbilled Amount
    const unbilledAmount = Math.max(0, creditUsed - unpaidBillAmount);
    const currentStatementBalance = unbilledAmount;

    // STEP 7: Determine which due date to show
    // If there's an unpaid bill, show the CURRENT bill's due date
    // Otherwise, show the NEXT bill's due date (when unbilled will be billed)
    let dueDate = null;
    let daysUntilDue = null;
    
    if (cycleDates) {
      if (hasUnpaidBill) {
        // Show due date for CURRENT unpaid bill
        dueDate = cycleDates.currentBillDueDate;
      } else {
        // No unpaid bill, so show when next bill will be due
        dueDate = cycleDates.nextBillDueDate;
      }
      
      if (dueDate) {
        const due = dueDate instanceof Date ? dueDate : parseISO(dueDate);
        daysUntilDue = differenceInDays(due, new Date());
      }
    }

    return {
      ...baseSummary,
      calculatedBalance: -creditUsed,
      creditLimit,
      creditUsed,
      availableCredit,
      creditUtilization,
      currentStatementBalance,
      lastBilledAmount,
      unpaidBillAmount,
      unbilledAmount,
      hasUnpaidBill,
      totalPayments: storedPaymentsTotal,
      nextBillingDate: cycleDates?.nextBillingDate || null,
      dueDate,
      daysUntilDue,
      billingDate,
      dueDateDuration,
    };
  }

  return baseSummary;
};

export const exportToCSV = (transactions, currency) => {
  const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.type,
    t.category,
    t.description || '-',
    formatCurrency(t.amount, currency),
  ]);
  
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

