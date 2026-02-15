import React, { useState, useMemo } from 'react';
import { X, Calendar, DollarSign, CheckCircle, XCircle, TrendingUp, TrendingDown, FileText, ChevronDown, ChevronUp, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/helpers';
import { parseISO, format, addMonths, differenceInDays, isBefore, isAfter } from 'date-fns';

export default function BillingHistoryModal({ isOpen, onClose, wallet, transactions, currency, onPay, onEdit, onDelete, onEditInitialDebt }) {
    const [expandedMonth, setExpandedMonth] = useState(null);
    const [expandedCategory, setExpandedCategory] = useState(null); // 'purchases', 'credits', 'transfers'


    // Calculate billing history
    const billingHistory = useMemo(() => {
        if (!wallet || wallet.type !== 'credit' || !wallet.billingDate) {
            return [];
        }

        const history = [];
        const billingDay = wallet.billingDate;
        const dueDateDuration = wallet.dueDateDuration || 20;
        const walletTransactions = transactions.filter(t => String(t.walletId) === String(wallet.id));
        const initialBalance = Number(wallet.balance ?? 0) || 0; // Initial existing debt

        // Get the first transaction date or wallet creation date
        const firstTransactionDate = walletTransactions.length > 0
            ? new Date(Math.min(...walletTransactions.map(t => parseISO(t.date).getTime())))
            : new Date();

        // Start from the first billing cycle
        let currentBillingDate = new Date(firstTransactionDate.getFullYear(), firstTransactionDate.getMonth(), billingDay);
        if (currentBillingDate > firstTransactionDate) {
            currentBillingDate = new Date(currentBillingDate.getFullYear(), currentBillingDate.getMonth() - 1, billingDay);
        }

        const today = new Date();
        const maxCycles = 24; // Show up to 24 months of history
        let cycleCount = 0;
        let isFirstCycle = true;

        while (currentBillingDate <= today && cycleCount < maxCycles) {
            const nextBillingDate = addMonths(currentBillingDate, 1);
            const dueDate = new Date(currentBillingDate);
            dueDate.setDate(dueDate.getDate() + dueDateDuration);

            // Get transactions for this billing cycle
            const cycleTransactions = walletTransactions.filter(t => {
                const transDate = parseISO(t.date);
                return transDate >= currentBillingDate && transDate < nextBillingDate;
            });

            // Calculate expenses and income for this cycle
            const expenses = cycleTransactions
                .filter(t => t.type === 'expense' && (!t.isTransfer || t.transferType === 'interest'))
                .reduce((sum, t) => sum + t.amount, 0);

            const income = cycleTransactions
                .filter(t => t.type === 'income' && !t.isTransfer && t.tag !== 'bill-payment' && t.category !== 'Bill Payment')
                .reduce((sum, t) => sum + t.amount, 0);

            const transfers = cycleTransactions
                .filter(t => t.type === 'transfer' || (t.isTransfer && t.transferType === 'source_debit'))
                .reduce((sum, t) => {
                    if (t.type === 'transfer') return sum + t.amount;
                    if (t.isTransfer && t.transferType === 'source_debit') return sum - t.amount;
                    return sum;
                }, 0);

            // Calculate billed amount
            // For the first cycle, include the initial balance (existing debt)
            let exactBilledAmount = Math.max(0, expenses - (income + transfers));
            if (isFirstCycle && initialBalance > 0) {
                exactBilledAmount += initialBalance;
            }

            // Add carryforward from previous cycle (if any)
            const previousCycle = history[history.length - 1];
            const carryforward = previousCycle?.carryforward || 0;
            exactBilledAmount += carryforward;

            // Round to nearest whole number for billing
            const billedAmount = Math.round(exactBilledAmount);

            // Calculate carryforward for next cycle (fractional remainder)
            const carryforwardToNext = exactBilledAmount - billedAmount;

            // Get payments made for this cycle
            const payments = (wallet.payments || []).filter(p => {
                // Use explicit mapping if available
                if (p.billingCycleDate) {
                    return new Date(p.billingCycleDate).toISOString() === currentBillingDate.toISOString();
                }
                // Fallback to date-based mapping
                const paymentDate = parseISO(p.date);
                return paymentDate >= currentBillingDate && paymentDate < nextBillingDate;
            });

            const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
            const remainingBalance = Math.max(0, billedAmount - totalPayments);
            const isSettled = remainingBalance === 0 && billedAmount > 0;
            const isPartiallyPaid = totalPayments > 0 && remainingBalance > 0;
            const isPastDue = dueDate < today && remainingBalance > 0;
            const isCurrent = currentBillingDate <= today && nextBillingDate > today;

            history.push({
                billingDate: currentBillingDate,
                nextBillingDate,
                dueDate,
                billedAmount,
                exactBilledAmount, // Store exact amount for reference
                carryforward: carryforwardToNext, // Store carryforward for next cycle
                payments,
                totalPayments,
                remainingBalance,
                isSettled,
                isPartiallyPaid,
                isPastDue,
                isCurrent,
                transactions: cycleTransactions,
                expenses,
                income,
                transfers,
                initialDebt: isFirstCycle ? initialBalance : 0, // Track initial debt for display
                daysUntilDue: differenceInDays(dueDate, today),
            });

            currentBillingDate = nextBillingDate;
            cycleCount++;
            isFirstCycle = false;
        }

        return history.reverse(); // Most recent first
    }, [wallet, transactions]);

    // Calculate summary statistics
    const summary = useMemo(() => {
        const totalBilled = billingHistory.reduce((sum, h) => sum + h.billedAmount, 0);
        const totalPaid = billingHistory.reduce((sum, h) => sum + h.totalPayments, 0);
        const totalOutstanding = billingHistory.reduce((sum, h) => sum + h.remainingBalance, 0);
        const settledCycles = billingHistory.filter(h => h.isSettled).length;
        const totalCycles = billingHistory.filter(h => h.billedAmount > 0).length;

        return {
            totalBilled,
            totalPaid,
            totalOutstanding,
            settledCycles,
            totalCycles,
            settlementRate: totalCycles > 0 ? (settledCycles / totalCycles) * 100 : 0,
        };
    }, [billingHistory]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                                {wallet?.icon || '💳'}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                                    Billing History
                                </h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {wallet?.name} - Detailed billing analysis
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Billed</div>
                            <div className="text-lg font-bold text-slate-800 dark:text-white">
                                {formatCurrency(summary.totalBilled, currency)}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Paid</div>
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(summary.totalPaid, currency)}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Outstanding</div>
                            <div className="text-lg font-bold text-red-600 dark:text-red-400">
                                {formatCurrency(summary.totalOutstanding, currency)}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Settlement Rate</div>
                            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                {summary.settlementRate.toFixed(0)}%
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {summary.settledCycles}/{summary.totalCycles} cycles
                            </div>
                        </div>
                    </div>
                </div>

                {/* Billing Cycles List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {billingHistory.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
                            <p className="text-slate-500 dark:text-slate-400">No billing history available yet</p>
                        </div>
                    ) : (
                        billingHistory.map((cycle, index) => {
                            const isExpanded = expandedMonth === index;
                            const previousCycle = index < billingHistory.length - 1 ? billingHistory[index + 1] : null;
                            const statusColor = cycle.isPastDue
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                : cycle.isSettled
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : cycle.isPartiallyPaid
                                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                        : cycle.isCurrent
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';

                            return (
                                <div
                                    key={index}
                                    className={`rounded-xl border-2 ${statusColor} overflow-hidden transition-all`}
                                >
                                    {/* Cycle Header */}
                                    <div
                                        className="p-4 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setExpandedMonth(isExpanded ? null : index)}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <Calendar size={20} className="text-slate-600 dark:text-slate-400" />
                                                <div>
                                                    <h3 className="font-bold text-slate-800 dark:text-white">
                                                        {format(cycle.billingDate, 'MMMM yyyy')}
                                                    </h3>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                                        {format(cycle.billingDate, 'MMM dd')} - {format(cycle.nextBillingDate, 'MMM dd, yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {cycle.isCurrent && (
                                                    <span className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
                                                        Current
                                                    </span>
                                                )}
                                                {cycle.isSettled && (
                                                    <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                                                )}
                                                {cycle.isPastDue && (
                                                    <XCircle className="text-red-600 dark:text-red-400" size={20} />
                                                )}
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 mt-3">
                                            <div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                                    {cycle.isCurrent ? 'Unbilled (Current)' : 'Billed Amount'}
                                                </div>
                                                <div className="text-sm font-bold text-slate-800 dark:text-white">
                                                    {formatCurrency(cycle.billedAmount, currency)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400">Paid</div>
                                                <div className="text-sm font-bold text-green-600 dark:text-green-400">
                                                    {formatCurrency(cycle.totalPayments, currency)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                                    {cycle.isPastDue ? 'Overdue' : cycle.isCurrent ? 'Accrued' : 'Balance'}
                                                </div>
                                                <div className={`text-sm font-bold ${cycle.remainingBalance > 0
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-green-600 dark:text-green-400'
                                                    }`}>
                                                    {formatCurrency(cycle.remainingBalance, currency)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                            <div className="flex items-center justify-between mb-2">
                                                {!cycle.isCurrent ? (
                                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                                        Due: {format(cycle.dueDate, 'MMM dd, yyyy')}
                                                        {cycle.isPastDue && (
                                                            <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">
                                                                ({Math.abs(cycle.daysUntilDue)} days overdue)
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : <div />}

                                                {cycle.remainingBalance > 0 && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onPay(wallet, cycle.remainingBalance);
                                                        }}
                                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm"
                                                    >
                                                        <DollarSign size={14} />
                                                        Pay Now
                                                    </button>
                                                )}
                                            </div>

                                            {cycle.payments.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Payments Made</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {cycle.payments.map((payment, pIndex) => (
                                                            <div
                                                                key={pIndex}
                                                                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 text-[10px] group relative"
                                                            >
                                                                <CheckCircle size={10} className="text-green-600" />
                                                                <span className="font-medium text-green-700 dark:text-green-400">
                                                                    {formatCurrency(payment.amount, currency)}
                                                                </span>
                                                                <span className="text-slate-400">
                                                                    {format(parseISO(payment.date), 'MMM dd')}
                                                                </span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onEdit(payment);
                                                                    }}
                                                                    className="ml-1 p-0.5 rounded hover:bg-green-200 dark:hover:bg-green-800 text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Edit Payment"
                                                                >
                                                                    <Edit2 size={8} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm('Are you sure you want to delete this payment?')) {
                                                                            onDelete(payment.id);
                                                                        }
                                                                    }}
                                                                    className="p-0.5 rounded hover:bg-red-200 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Delete Payment"
                                                                >
                                                                    <Trash2 size={8} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
                                            {/* Transaction Breakdown */}
                                            <div>
                                                <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">
                                                    Transaction Breakdown
                                                </h4>

                                                {/* Show initial debt if present */}
                                                {cycle.initialDebt > 0 && (
                                                    <div className="mb-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <AlertCircle className="text-purple-600 dark:text-purple-400" size={16} />
                                                                <div>
                                                                    <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                                                                        Initial Existing Debt
                                                                    </div>
                                                                    <div className="text-[10px] text-purple-600 dark:text-purple-400">
                                                                        Credit limit used at setup
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                                                {formatCurrency(cycle.initialDebt, currency)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Bill Composition - Premium UI */}
                                                <div className="mb-3 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                                            <FileText size={16} className="text-white" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-800 dark:text-white">
                                                                Bill Composition
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                                                How your bill was calculated
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {/* Carryforward from previous cycle */}
                                                        {cycle.carryforward !== undefined && Math.abs(previousCycle?.carryforward || 0) > 0.01 && (
                                                            <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center">
                                                                        <TrendingUp size={12} className="text-white" />
                                                                    </div>
                                                                    <span className="text-xs font-medium text-orange-900 dark:text-orange-100">Previous Cycle Carryforward</span>
                                                                </div>
                                                                <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
                                                                    {(previousCycle?.carryforward || 0) >= 0 ? '+' : ''}{formatCurrency(previousCycle?.carryforward || 0, currency)}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {cycle.initialDebt > 0 && (
                                                            <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 group hover:shadow-sm transition-all">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-md bg-purple-500 flex items-center justify-center">
                                                                        <AlertCircle size={12} className="text-white" />
                                                                    </div>
                                                                    <span className="text-xs font-medium text-purple-900 dark:text-purple-100">Initial Debt</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                                                                        +{formatCurrency(cycle.initialDebt, currency)}
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onEditInitialDebt(wallet, cycle.initialDebt);
                                                                        }}
                                                                        className="p-1 rounded hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        title="Edit Initial Debt"
                                                                    >
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* New Purchases - Clickable */}
                                                        <div>
                                                            <div
                                                                onClick={() => setExpandedCategory(expandedCategory === 'purchases' ? null : 'purchases')}
                                                                className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 hover:shadow-sm transition-all cursor-pointer"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-md bg-red-500 flex items-center justify-center">
                                                                        <TrendingDown size={12} className="text-white" />
                                                                    </div>
                                                                    <span className="text-xs font-medium text-red-900 dark:text-red-100">New Purchases</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-bold text-red-700 dark:text-red-300">
                                                                        {cycle.initialDebt > 0 ? '+' : ''}{formatCurrency(cycle.expenses, currency)}
                                                                    </span>
                                                                    {expandedCategory === 'purchases' ? <ChevronUp size={14} className="text-red-600" /> : <ChevronDown size={14} className="text-red-600" />}
                                                                </div>
                                                            </div>

                                                            {/* Purchases List */}
                                                            {expandedCategory === 'purchases' && (
                                                                <div className="mt-2 ml-8 space-y-1 max-h-40 overflow-y-auto">
                                                                    {cycle.transactions
                                                                        .filter(t => t.type === 'expense' && (!t.isTransfer || t.transferType === 'interest'))
                                                                        .map((t, idx) => (
                                                                            <div key={idx} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-red-50/50 dark:bg-red-900/10">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-slate-500 dark:text-slate-400">{format(parseISO(t.date), 'MMM dd')}</span>
                                                                                    <span className="text-slate-700 dark:text-slate-300">{t.category || 'Uncategorized'}</span>
                                                                                </div>
                                                                                <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(t.amount, currency)}</span>
                                                                            </div>
                                                                        ))}
                                                                    {cycle.transactions.filter(t => t.type === 'expense' && (!t.isTransfer || t.transferType === 'interest')).length === 0 && (
                                                                        <div className="text-[10px] text-slate-400 italic p-2">No purchases this cycle</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>


                                                        {/* Credits - Clickable */}
                                                        {cycle.income > 0 && (
                                                            <div>
                                                                <div
                                                                    onClick={() => setExpandedCategory(expandedCategory === 'credits' ? null : 'credits')}
                                                                    className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 hover:shadow-sm transition-all cursor-pointer"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded-md bg-green-500 flex items-center justify-center">
                                                                            <TrendingUp size={12} className="text-white" />
                                                                        </div>
                                                                        <span className="text-xs font-medium text-green-900 dark:text-green-100">Credits & Refunds</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-bold text-green-700 dark:text-green-300">
                                                                            -{formatCurrency(cycle.income, currency)}
                                                                        </span>
                                                                        {expandedCategory === 'credits' ? <ChevronUp size={14} className="text-green-600" /> : <ChevronDown size={14} className="text-green-600" />}
                                                                    </div>
                                                                </div>

                                                                {/* Credits List */}
                                                                {expandedCategory === 'credits' && (
                                                                    <div className="mt-2 ml-8 space-y-1 max-h-40 overflow-y-auto">
                                                                        {cycle.transactions
                                                                            .filter(t => t.type === 'income' && !t.isTransfer)
                                                                            .map((t, idx) => (
                                                                                <div key={idx} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-green-50/50 dark:bg-green-900/10">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-slate-500 dark:text-slate-400">{format(parseISO(t.date), 'MMM dd')}</span>
                                                                                        <span className="text-slate-700 dark:text-slate-300">{t.category || 'Uncategorized'}</span>
                                                                                    </div>
                                                                                    <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(t.amount, currency)}</span>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}



                                                        {/* Transfers - Clickable */}
                                                        {cycle.transfers !== 0 && (
                                                            <div>
                                                                <div
                                                                    onClick={() => setExpandedCategory(expandedCategory === 'transfers' ? null : 'transfers')}
                                                                    className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 hover:shadow-sm transition-all cursor-pointer"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center">
                                                                            <DollarSign size={12} className="text-white" />
                                                                        </div>
                                                                        <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Payments & Transfers</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                                                            {cycle.transfers > 0 ? '-' : '+'}{formatCurrency(Math.abs(cycle.transfers), currency)}
                                                                        </span>
                                                                        {expandedCategory === 'transfers' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />}
                                                                    </div>
                                                                </div>

                                                                {/* Transfers List */}
                                                                {expandedCategory === 'transfers' && (
                                                                    <div className="mt-2 ml-8 space-y-1 max-h-40 overflow-y-auto">
                                                                        {cycle.transactions
                                                                            .filter(t => t.type === 'transfer' || (t.isTransfer && t.transferType === 'source_debit'))
                                                                            .map((t, idx) => (
                                                                                <div key={idx} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-blue-50/50 dark:bg-blue-900/10">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-slate-500 dark:text-slate-400">{format(parseISO(t.date), 'MMM dd')}</span>
                                                                                        <span className="text-slate-700 dark:text-slate-300">{t.category || 'Transfer'}</span>
                                                                                    </div>
                                                                                    <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(t.amount, currency)}</span>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}


                                                        <div className="mt-3 pt-3 border-t-2 border-slate-300 dark:border-slate-600">
                                                            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md">
                                                                <div className="flex items-center gap-2">
                                                                    <CheckCircle size={16} className="text-white" />
                                                                    <span className="text-sm font-bold text-white">Total Statement</span>
                                                                </div>
                                                                <span className="text-lg font-bold text-white">
                                                                    {formatCurrency(cycle.billedAmount, currency)}
                                                                </span>
                                                            </div>
                                                            <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 italic text-center">
                                                                {Math.abs(previousCycle?.carryforward || 0) > 0.01 && (previousCycle?.carryforward >= 0 ? 'Carryforward + ' : 'Carryforward - ')}
                                                                {cycle.initialDebt > 0 && 'Initial Debt + '}Purchases{cycle.income > 0 && ' - Credits'}{cycle.transfers !== 0 && ' - Transfers'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingDown className="text-red-500" size={16} />
                                                        <div>
                                                            <div className="text-xs text-slate-600 dark:text-slate-400">Expenses</div>
                                                            <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                                                                {formatCurrency(cycle.expenses, currency)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="text-green-500" size={16} />
                                                        <div>
                                                            <div className="text-xs text-slate-600 dark:text-slate-400">Credits</div>
                                                            <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                                                {formatCurrency(cycle.income, currency)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <DollarSign className="text-blue-500" size={16} />
                                                        <div>
                                                            <div className="text-xs text-slate-600 dark:text-slate-400">Transfers</div>
                                                            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                                                {formatCurrency(cycle.transfers, currency)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payment History */}
                                            {cycle.payments.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">
                                                        Payment History ({cycle.payments.length})
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {cycle.payments.map((payment, pIndex) => (
                                                            <div
                                                                key={pIndex}
                                                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <DollarSign size={14} className="text-green-600 dark:text-green-400" />
                                                                    <span className="text-sm text-slate-700 dark:text-slate-300">
                                                                        {format(parseISO(payment.date), 'MMM dd, yyyy')}
                                                                    </span>
                                                                    {payment.type === 'full' && (
                                                                        <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-semibold rounded-full">
                                                                            FULL
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                                                    {formatCurrency(payment.amount, currency)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Transaction List */}
                                            {cycle.transactions.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">
                                                        Transactions ({cycle.transactions.length})
                                                    </h4>
                                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                                        {cycle.transactions.map((trans, tIndex) => (
                                                            <div
                                                                key={tIndex}
                                                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-xs"
                                                            >
                                                                <div className="flex-1">
                                                                    <div className="font-medium text-slate-800 dark:text-white">
                                                                        {trans.description || trans.category}
                                                                    </div>
                                                                    <div className="text-slate-500 dark:text-slate-400">
                                                                        {format(parseISO(trans.date), 'MMM dd, yyyy')} • {trans.category}
                                                                    </div>
                                                                </div>
                                                                <div className={`font-semibold ${trans.type === 'expense'
                                                                    ? 'text-red-600 dark:text-red-400'
                                                                    : 'text-green-600 dark:text-green-400'
                                                                    }`}>
                                                                    {trans.type === 'expense' ? '-' : '+'}
                                                                    {formatCurrency(trans.amount, currency)}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
