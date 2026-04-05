import { addMonths, differenceInCalendarDays, format } from 'date-fns';

/**
 * EMI Calculator Utility
 * Implements the Reducing Balance Method used by Indian banks for Credit Card EMI conversions.
 * 
 * Key formulas:
 *   Monthly Rate (r) = Annual Rate / 12 / 100
 *   EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
 *   Interest for month = Outstanding Principal × r
 *   Principal for month = EMI - Interest
 */

/**
 * Calculate monthly EMI using reducing balance formula
 * @param {number} principal - Loan principal amount
 * @param {number} annualRate - Annual interest rate in percentage (e.g., 18 for 18%)
 * @param {number} tenureMonths - Loan tenure in months
 * @returns {number} Monthly EMI amount (rounded to nearest integer)
 */
export function calculateEMI(principal, annualRate, tenureMonths) {
  if (!principal || principal <= 0 || !annualRate || annualRate <= 0 || !tenureMonths || tenureMonths <= 0) {
    return 0;
  }

  const monthlyRate = annualRate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = principal * monthlyRate * factor / (factor - 1);

  return emi;
}

/**
 * Generate complete amortization schedule
 * Uses the same rounding approach as Indian banks:
 * - EMI is calculated once (rounded), then applied each month
 * - Interest = Outstanding × Monthly Rate (rounded to nearest integer)
 * - Principal = EMI - Interest
 * - Last month adjusts to clear remaining balance exactly
 * 
 * @param {number} principal - Loan principal amount
 * @param {number} annualRate - Annual interest rate in percentage
 * @param {number} tenureMonths - Loan tenure in months
 * @param {string|Date} firstEMIDate - Date of first EMI payment
 * @param {number} igstRate - IGST rate on interest (default 18%)
 * @returns {Array} Array of monthly EMI breakdown objects
 */
export function generateAmortizationSchedule(
  principal,
  annualRate,
  tenureMonths,
  firstEMIDate,
  igstRate = 18,
  options = {}
) {
  if (!principal || principal <= 0 || !annualRate || annualRate <= 0 || !tenureMonths || tenureMonths <= 0) {
    return [];
  }

  const monthlyRate = annualRate / 12 / 100;
  const rawEMI = calculateEMI(principal, annualRate, tenureMonths);
  const loanBookingDate = options.loanBookingDate || null;
  const firstPaymentDate = options.firstPaymentDate || null;
  
  const schedule = [];
  let outstandingBalance = principal;
  const startDate = firstEMIDate instanceof Date ? firstEMIDate : new Date(firstEMIDate);

  for (let month = 1; month <= tenureMonths; month++) {
    const emiDate = addMonths(startDate, month - 1);
    const openingBalance = outstandingBalance;

    // Calculate interest on current outstanding (rounded to nearest integer like banks do)
    const interestRaw = outstandingBalance * monthlyRate;
    const baseInterestAmount = Math.round(interestRaw);
    const interestAmount = month === 1
      ? calculateFirstEMIInterestAmount(principal, annualRate, loanBookingDate, firstPaymentDate, baseInterestAmount)
      : baseInterestAmount;
    const firstInterestAdjustment = month === 1 ? interestAmount - baseInterestAmount : 0;

    let principalAmount;
    let emiAmount;

    if (month === tenureMonths) {
      // Last month: clear remaining balance exactly
      principalAmount = Math.round(outstandingBalance);
      emiAmount = principalAmount + baseInterestAmount;
    } else {
      // Regular month: EMI is fixed (rounded), principal = EMI - interest
      emiAmount = Math.round(rawEMI);
      principalAmount = emiAmount - baseInterestAmount;
    }

    // IGST on interest
    const igstOnInterest = parseFloat((interestAmount * igstRate / 100).toFixed(2));
    const totalPayable = parseFloat((emiAmount + firstInterestAdjustment + igstOnInterest).toFixed(2));

    const closingBalance = Math.max(0, openingBalance - principalAmount);

    schedule.push({
      month,
      emiDate: emiDate.toISOString(),
      emiDateFormatted: format(emiDate, 'dd MMM yyyy'),
      openingBalance: parseFloat(openingBalance.toFixed(2)),
      emiAmount,
      principalAmount,
      baseInterestAmount,
      firstInterestAdjustment,
      interestAmount,
      igstOnInterest,
      totalPayable,
      closingBalance: parseFloat(closingBalance.toFixed(2)),
      status: 'pending', // 'pending' | 'paid' | 'overdue'
      paidDate: null,
      paidTransactionId: null,
    });

    outstandingBalance = closingBalance;
  }

  return schedule;
}

/**
 * Calculate processing fee with IGST
 * @param {number} processingFee - Base processing fee
 * @param {number} igstRate - IGST percentage (default 18)
 * @returns {{ processingFee: number, igst: number, total: number }}
 */
export function calculateProcessingFeeBreakdown(processingFee, igstRate = 18) {
  const fee = Number(processingFee) || 0;
  const igst = parseFloat((fee * igstRate / 100).toFixed(2));
  return {
    processingFee: fee,
    igst,
    total: parseFloat((fee + igst).toFixed(2)),
  };
}

export const calculateProcessingFee = calculateProcessingFeeBreakdown;

export function calculateFirstEMIInterestAmount(
  principal,
  annualRate,
  loanBookingDate,
  firstPaymentDate,
  fallbackInterest = 0
) {
  if (!principal || principal <= 0 || !annualRate || annualRate <= 0 || !loanBookingDate || !firstPaymentDate) {
    return fallbackInterest;
  }

  const booking = loanBookingDate instanceof Date ? loanBookingDate : new Date(loanBookingDate);
  const payment = firstPaymentDate instanceof Date ? firstPaymentDate : new Date(firstPaymentDate);

  if (Number.isNaN(booking.getTime()) || Number.isNaN(payment.getTime())) {
    return fallbackInterest;
  }

  const accrualDays = Math.max(0, differenceInCalendarDays(payment, booking));
  if (accrualDays <= 0) {
    return fallbackInterest;
  }

  return Math.round(principal * (annualRate / 100) * (accrualDays / 360));
}

/**
 * Calculate total cost of the EMI loan
 * @param {number} principal
 * @param {number} annualRate
 * @param {number} tenureMonths
 * @param {number} processingFee
 * @param {number} igstRate
 * @returns {{ principal, totalInterest, totalIGSTOnInterest, processingFee, igstOnProcessingFee, totalCost, monthlyEMI, schedule }}
 */
export function calculateTotalCost(
  principal,
  annualRate,
  tenureMonths,
  processingFee = 0,
  igstRate = 18,
  firstEMIDate = new Date(),
  options = {}
) {
  const schedule = generateAmortizationSchedule(
    principal,
    annualRate,
    tenureMonths,
    firstEMIDate,
    igstRate,
    options
  );
  
  const totalInterest = schedule.reduce((sum, s) => sum + s.interestAmount, 0);
  const totalIGSTOnInterest = parseFloat(schedule.reduce((sum, s) => sum + s.igstOnInterest, 0).toFixed(2));
  const pfBreakdown = calculateProcessingFeeBreakdown(processingFee, igstRate);
  
  const totalCost = parseFloat((
    principal + 
    totalInterest + 
    totalIGSTOnInterest + 
    pfBreakdown.total
  ).toFixed(2));

  const monthlyEMI = schedule.length > 0 ? schedule[0].emiAmount : 0;

  return {
    principal,
    annualRate,
    tenureMonths,
    monthlyEMI,
    totalInterest,
    totalIGSTOnInterest,
    processingFee: pfBreakdown.processingFee,
    igstOnProcessingFee: pfBreakdown.igst,
    totalProcessingCost: pfBreakdown.total,
    totalCost,
    schedule,
  };
}

/**
 * Validate EMI parameters
 * @param {Object} params
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEMIParams({ principal, annualRate, tenureMonths, processingFee, loanBookingDate, statementDate, firstPaymentDate }) {
  const errors = [];

  if (!principal || principal <= 0) {
    errors.push('Principal amount must be greater than 0');
  }
  if (!annualRate || annualRate <= 0 || annualRate > 100) {
    errors.push('Interest rate must be between 0 and 100');
  }
  if (!tenureMonths || tenureMonths < 1 || tenureMonths > 60) {
    errors.push('Tenure must be between 1 and 60 months');
  }
  if (processingFee !== undefined && processingFee < 0) {
    errors.push('Processing fee cannot be negative');
  }
  if (loanBookingDate && statementDate) {
    const booking = new Date(loanBookingDate);
    const statement = new Date(statementDate);
    if (!Number.isNaN(booking.getTime()) && !Number.isNaN(statement.getTime()) && statement < booking) {
      errors.push('Statement date cannot be earlier than loan booking date');
    }
  }
  if (loanBookingDate && firstPaymentDate) {
    const booking = new Date(loanBookingDate);
    const payment = new Date(firstPaymentDate);
    if (!Number.isNaN(booking.getTime()) && !Number.isNaN(payment.getTime()) && payment < booking) {
      errors.push('First payment date cannot be earlier than loan booking date');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a loan number
 * @returns {string} Auto-generated loan number
 */
export function generateLoanNumber() {
  const timestamp = Date.now().toString();
  return `EMI${timestamp.slice(-10)}`;
}

/**
 * Determine EMI status based on date
 * @param {string} emiDateISO - EMI due date in ISO format
 * @param {string} status - Current status
 * @returns {string} Updated status
 */
export function getEMIStatus(emiDateISO, currentStatus) {
  if (currentStatus === 'paid') return 'paid';
  
  const emiDate = new Date(emiDateISO);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  emiDate.setHours(0, 0, 0, 0);
  
  if (today > emiDate) return 'overdue';
  return 'pending';
}

/**
 * Update all EMI statuses based on current date
 * @param {Array} schedule - Amortization schedule array
 * @returns {Array} Updated schedule with correct statuses
 */
export function updateScheduleStatuses(schedule) {
  return schedule.map(entry => ({
    ...entry,
    status: getEMIStatus(entry.emiDate, entry.status),
  }));
}

/**
 * Get summary stats for a collection of EMI loans
 * @param {Array} emiLoans - Array of EMI loan objects
 * @returns {Object} Summary statistics
 */
export function getEMISummary(emiLoans) {
  const activeLoans = emiLoans.filter(l => l.status === 'active');
  
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);
  
  const totalMonthlyEMI = activeLoans.reduce((sum, l) => {
    const nextPending = (l.schedule || []).find(s => s.status !== 'paid');
    return sum + (nextPending ? Number(nextPending.totalPayable || nextPending.emiAmount || 0) : 0);
  }, 0);

  // Find next EMI due date across all active loans
  let nextDueDate = null;
  let nextDueAmount = 0;
  activeLoans.forEach(loan => {
    const nextPending = (loan.schedule || []).find(s => s.status !== 'paid');
    if (nextPending) {
      const date = new Date(nextPending.emiDate);
      if (!nextDueDate || date < nextDueDate) {
        nextDueDate = date;
        nextDueAmount = nextPending.totalPayable;
      }
    }
  });

  const totalInterestPaid = activeLoans.reduce((sum, l) => {
    return sum + (l.schedule || [])
      .filter(s => s.status === 'paid')
      .reduce((s, entry) => s + entry.interestAmount, 0);
  }, 0);

  const totalInterestRemaining = activeLoans.reduce((sum, l) => {
    return sum + (l.schedule || [])
      .filter(s => s.status !== 'paid')
      .reduce((s, entry) => s + entry.interestAmount, 0);
  }, 0);

  const totalPaidEMIs = activeLoans.reduce((sum, l) => sum + (l.paidEMIs || 0), 0);
  const totalRemainingEMIs = activeLoans.reduce((sum, l) => sum + (l.remainingEMIs || 0), 0);

  // Overdue count
  const overdueCount = activeLoans.reduce((count, l) => {
    return count + (l.schedule || []).filter(s => s.status === 'overdue').length;
  }, 0);

  return {
    activeLoansCount: activeLoans.length,
    totalOutstanding: parseFloat(totalOutstanding.toFixed(2)),
    totalMonthlyEMI,
    nextDueDate: nextDueDate ? nextDueDate.toISOString() : null,
    nextDueAmount,
    totalInterestPaid,
    totalInterestRemaining,
    totalPaidEMIs,
    totalRemainingEMIs,
    overdueCount,
    completedLoansCount: emiLoans.filter(l => l.status === 'completed').length,
  };
}

export function getWalletEMILoans(emiLoans = [], walletId) {
  return emiLoans.filter((loan) => String(loan.walletId) === String(walletId));
}

export function getWalletEMIMetrics(emiLoans = [], walletId) {
  const walletLoans = getWalletEMILoans(emiLoans, walletId);
  const activeLoans = walletLoans.filter(
    (loan) => loan.status === 'active' && Number(loan.outstandingPrincipal || 0) > 0
  );

  const emiBlockedAmount = activeLoans.reduce(
    (sum, loan) => sum + (Number(loan.outstandingPrincipal) || 0),
    0
  );

  let nextEmiDueDate = null;
  let nextEmiAmount = 0;

  activeLoans.forEach((loan) => {
    const nextPending = (loan.schedule || []).find((entry) => entry.status !== 'paid');
    if (!nextPending) return;

    const candidateDate = new Date(nextPending.emiDate);
    if (!nextEmiDueDate || candidateDate < nextEmiDueDate) {
      nextEmiDueDate = candidateDate;
      nextEmiAmount = Number(nextPending.totalPayable || nextPending.emiAmount || 0);
    }
  });

  return {
    walletLoans,
    activeLoans,
    activeLoansCount: activeLoans.length,
    emiBlockedAmount: parseFloat(emiBlockedAmount.toFixed(2)),
    nextEmiDueDate: nextEmiDueDate ? nextEmiDueDate.toISOString() : null,
    nextEmiAmount: parseFloat(nextEmiAmount.toFixed(2)),
  };
}
