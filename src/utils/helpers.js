import { format, isThisMonth, parseISO, addDays, addMonths, startOfMonth, endOfMonth, getDate, isAfter, isBefore, differenceInDays } from 'date-fns';
import { getWalletEMIMetrics } from './emiCalculator';

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateValue) => {
  if (!dateValue) return '';
  try {
    const date = dateValue instanceof Date ? dateValue : parseISO(dateValue);
    return format(date, 'MMM dd, yyyy');
  } catch {
    return String(dateValue);
  }
};

export const formatDateTime = (dateValue) => {
  if (!dateValue) return '';
  try {
    const date = dateValue instanceof Date ? dateValue : parseISO(dateValue);
    return format(date, 'MMM dd, yyyy h:mm a');
  } catch {
    return String(dateValue);
  }
};

export const getMonthlyTransactions = (transactions) => {
  return (transactions || []).filter((t) => isThisMonth(parseISO(t.date)));
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

  return (transactions || []).filter((t) => {
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
  const sortedTransactions = (transactions || []).filter(t => t.date);

  sortedTransactions.forEach((t) => {
    try {
      const transDate = parseISO(t.date);
      const year = transDate.getFullYear();
      const month = transDate.getMonth();
      monthSet.add(`${year}-${month}`);
    } catch (e) {
      // Skip invalid dates
    }
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
  const dataset = transactions || [];
  const income = dataset
    .filter((t) => t.type === 'income' && !t.isTransfer)
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = dataset
    .filter((t) => t.type === 'expense' && (!t.isTransfer || t.transferType === 'interest'))
    .reduce((sum, t) => sum + t.amount, 0);

  const transfers = dataset
    .filter((t) => t.type === 'transfer' || t.isTransfer)
    .reduce((sum, t) => {
      if (t.type === 'transfer' || t.transferType === 'destination_credit') return sum + t.amount;
      if (t.isTransfer && t.transferType === 'source_debit') return sum - t.amount;
      return sum;
    }, 0);

  return {
    income,
    expenses,
    transfers,
    balance: (income + transfers) - expenses
  };
};

export const getCategoryTotals = (transactions) => {
  const categoryTotals = {};

  (transactions || [])
    .filter((t) => (t.type === 'expense' || t.type === 'income') && (!t.isTransfer || t.transferType === 'interest'))
    .forEach((t) => {
      const isTransfer = t.isTransfer || t.type === 'transfer';
      const displayCategory = isTransfer ? (t.transferType === 'interest' ? 'Interest' : 'Transfer') : t.category;
      categoryTotals[displayCategory] = (categoryTotals[displayCategory] || 0) + t.amount;
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

  (transactions || [])
    .filter((t) => (t.type === 'expense' || t.type === 'income') && t.tag && (!t.isTransfer || t.transferType === 'interest'))
    .forEach((t) => {
      tagTotals[t.tag] = (tagTotals[t.tag] || 0) + t.amount;
    });

  return tagTotals;
};

/**
 * Calculate billing cycle dates for a credit card
 */
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

  // Due date should be for the CURRENT bill (last billing + duration)
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

export function processBillingCycle(wallet, transactions, forceAdvance = false, emiLoans = []) {
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
    const currentSummary = getWalletSummary(wallet, transactions, emiLoans);
    const exactUnbilledAmount = currentSummary.unbilledAmount || 0;
    const roundedBilledAmount = parseFloat(exactUnbilledAmount.toFixed(2));
    
    return {
      lastBillingDate: nextBillingDate.toISOString(),
      lastBilledAmount: roundedBilledAmount,
      dueDate: nextBillDueDate.toISOString(), // Due date for the NEW bill
      hasUnpaidBill: roundedBilledAmount > 0,
      unpaidBillAmount: roundedBilledAmount,
    };
  }

  return null;
}

export const getWalletSummary = (wallet, transactions, emiLoans = []) => {
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
  const { income, expenses, transfers } = calculateTotals(walletTransactions);
  const initialBalance = Number(wallet.balance ?? 0) || 0;
  const walletType = wallet.type || 'cash';

  const baseSummary = {
    income,
    expenses,
    transfers,
    transactionCount: walletTransactions.length,
    initialBalance,
    calculatedBalance: initialBalance + income + transfers - expenses,
  };

  if (walletType === 'credit') {
    const creditLimit = Number(wallet.creditLimit ?? 0) || 0;
    const { activeLoansCount, emiBlockedAmount, nextEmiDueDate, nextEmiAmount } = getWalletEMIMetrics(
      emiLoans,
      wallet.id
    );

    // === PERFECT CALCULATION LOGIC ===

    // STEP 1: Get billing cycle information first
    const billingDate = wallet.billingDate ? Number(wallet.billingDate) : null;
    const lastBillingDateStored = wallet.lastBillingDate ? parseISO(wallet.lastBillingDate) : null;
    const dueDateDuration = Number(wallet.dueDateDuration ?? 20);
    const cycleDates = billingDate ? getBillingCycleDates(billingDate, lastBillingDateStored, dueDateDuration) : null;

    // STEP 2: Calculate Credit Limit Used (Total Debt)
    const utilizationExpenses = walletTransactions
      .filter((t) => t.type === 'expense' && t.affectsCreditUsed !== false && (!t.isTransfer || t.transferType === 'interest'))
      .reduce((sum, t) => sum + t.amount, 0);
    const utilizationIncome = walletTransactions
      .filter((t) => t.type === 'income' && t.affectsCreditUsed !== false && !t.isTransfer)
      .reduce((sum, t) => sum + t.amount, 0);
    const utilizationTransfers = walletTransactions
      .filter((t) => t.type === 'transfer' || t.isTransfer)
      .reduce((sum, t) => {
        if (t.type === 'transfer' || t.transferType === 'destination_credit') return sum + t.amount;
        if (t.transferType === 'source_debit') return sum - t.amount;
        return sum;
      }, 0);

    const creditUsed = Math.max(0, initialBalance + utilizationExpenses - (utilizationIncome + utilizationTransfers));

    // STEP 3: Calculate available credit and utilization
    const availableCredit = Math.max(0, creditLimit - creditUsed);
    const creditUtilization = creditLimit > 0 ? Math.min(1, creditUsed / creditLimit) : 0;

    // STEP 4: Calculate Unbilled Amount (Spending since last billing date)
    let unbilledAmount = 0;
    if (cycleDates?.lastBillingDate) {
      const lastBilling = cycleDates.lastBillingDate;
      const cycleTransactions = walletTransactions.filter(
        (t) => parseISO(t.date) >= lastBilling && !t.excludeFromBilling
      );
      const { income: ubIncome, expenses: ubExpenses, transfers: ubTransfers } = calculateTotals(cycleTransactions);

      // Filter out bill payments from unbilled income
      const unbilledBillPayments = cycleTransactions
        .filter(t => t.type === 'income' && !t.isTransfer && (t.tag === 'bill-payment' || t.category === 'Bill Payment'))
        .reduce((sum, t) => sum + t.amount, 0);

      const adjustedUbIncome = ubIncome - unbilledBillPayments;
      unbilledAmount = Math.max(0, ubExpenses - (adjustedUbIncome + ubTransfers));
    } else {
      unbilledAmount = creditUsed;
    }

    // STEP 5: Calculate Unpaid Bill (Total Debt - Unbilled)
    const billableDebt = Math.max(0, creditUsed - emiBlockedAmount);
    // Round to nearest integer — credit card bills are always whole numbers,
    // preventing fractional-cent carryforward from leaving phantom balances.
    const unpaidBillAmount = Math.round(Math.max(0, billableDebt - unbilledAmount));
    
    const hasUnpaidBill = unpaidBillAmount > 0;
    const currentStatementBalance = unbilledAmount;
    const roundedStatementBalance = Math.round(unbilledAmount);

    const storedPayments = wallet.payments || [];
    const storedPaymentsTotal = storedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // STEP 7: Determine which due date to show
    let dueDate = null;
    let daysUntilDue = null;

    if (cycleDates) {
      if (hasUnpaidBill) {
        dueDate = cycleDates.currentBillDueDate;
      } else {
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
      emiBlockedAmount,
      activeEMILoans: activeLoansCount,
      nextEMIDueDate: nextEmiDueDate,
      nextEMIAmount: nextEmiAmount,
      currentStatementBalance,
      roundedStatementBalance,
      lastBilledAmount: unpaidBillAmount,
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

export const getDatePreset = (preset) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today': {
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { from: today, to: end };
    }
    case 'week': {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    }
    case 'month': {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    }
    case 'lastMonth': {
      const lastMonth = addMonths(today, -1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    }
    case 'all':
    default:
      return { from: null, to: null };
  }
};

export const filterByDateRange = (transactions, { from, to }) => {
  if (!from && !to) return transactions;

  return transactions.filter(t => {
    const date = new Date(t.date);
    date.setHours(0, 0, 0, 0);

    if (from) {
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      if (date < fromDate) return false;
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      if (date > toDate) return false;
    }

    return true;
  });
};

export const sortTransactions = (transactions, sortBy, sortOrder) => {
  const sorted = [...transactions].sort((a, b) => {
    if (sortBy === 'amount') {
      return a.amount - b.amount;
    } else {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);

      const dayA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate()).getTime();
      const dayB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate()).getTime();

      const dayComparison = dayA - dayB;

      if (dayComparison !== 0) {
        return dayComparison;
      }

      const orderA = a.customOrder;
      const orderB = b.customOrder;

      if (orderA !== undefined && orderB !== undefined) {
        return sortOrder === 'desc' ? orderB - orderA : orderA - orderB;
      }

      if (orderA !== undefined) return sortOrder === 'desc' ? 1 : -1;
      if (orderB !== undefined) return sortOrder === 'desc' ? -1 : 1;

      return dateA.getTime() - dateB.getTime();
    }
  });

  return sortOrder === 'desc' ? sorted.reverse() : sorted;
};

export const calculateSummary = (transactions) => {
  const summary = (transactions || []).reduce((acc, t) => {
    if (t.type === 'income' && !t.isTransfer) {
      acc.income += t.amount;
    } else if (t.type === 'expense' && (!t.isTransfer || t.transferType === 'interest')) {
      acc.expense += t.amount;
    } else if (t.type === 'transfer' || t.isTransfer) {
      if (t.type === 'transfer' || t.transferType === 'destination_credit') {
        acc.transfers += t.amount;
      } else if (t.transferType === 'source_debit') {
        acc.transfers -= t.amount;
      }
    }
    acc.count++;
    return acc;
  }, { income: 0, expense: 0, transfers: 0, count: 0 });

  summary.net = (summary.income + summary.transfers) - summary.expense;
  return summary;
};
