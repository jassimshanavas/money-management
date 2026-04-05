import React, { useState } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, getMonthlyTransactions, calculateTotals, getWalletSummary, getBillingCycleDates } from '../utils/helpers';
import { TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle, CreditCard, ChevronDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function addMonthsSafe(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getCurrentCycleCarryforward(wallet, transactions) {
  if (!wallet || wallet.type !== 'credit' || !wallet.billingDate) return 0;

  const walletTransactions = transactions.filter((t) => String(t.walletId) === String(wallet.id));
  const initialBalance = Number(wallet.balance ?? 0) || 0;
  const dueDateDuration = Number(wallet.dueDateDuration ?? 20);
  const cycleDates = getBillingCycleDates(
    Number(wallet.billingDate),
    wallet.lastBillingDate || null,
    dueDateDuration
  );

  if (!cycleDates?.lastBillingDate) return 0;

  const billingDay = Number(wallet.billingDate);
  const firstTransactionDate = walletTransactions.length > 0
    ? new Date(Math.min(...walletTransactions.map((t) => new Date(t.date).getTime())))
    : new Date();

  let currentBillingDate = new Date(firstTransactionDate.getFullYear(), firstTransactionDate.getMonth(), billingDay);
  if (currentBillingDate > firstTransactionDate) {
    currentBillingDate = new Date(currentBillingDate.getFullYear(), currentBillingDate.getMonth() - 1, billingDay);
  }

  let carryforward = 0;
  let isFirstCycle = true;
  const targetCycleStart = new Date(cycleDates.lastBillingDate);
  targetCycleStart.setHours(0, 0, 0, 0);

  while (currentBillingDate <= targetCycleStart) {
    const nextBillingDate = addMonthsSafe(currentBillingDate, 1);
    const cycleTransactions = walletTransactions.filter((t) => {
      const transDate = new Date(t.date);
      return transDate >= currentBillingDate && transDate < nextBillingDate;
    });

    const expenses = cycleTransactions
      .filter((t) => t.type === 'expense' && (!t.isTransfer || t.transferType === 'interest'))
      .reduce((sum, t) => sum + t.amount, 0);

    const income = cycleTransactions
      .filter((t) => t.type === 'income' && !t.isTransfer && t.tag !== 'bill-payment' && t.category !== 'Bill Payment')
      .reduce((sum, t) => sum + t.amount, 0);

    const transfers = cycleTransactions
      .filter((t) => t.type === 'transfer' || (t.isTransfer && t.transferType === 'source_debit'))
      .reduce((sum, t) => {
        if (t.type === 'transfer') return sum + t.amount;
        if (t.isTransfer && t.transferType === 'source_debit') return sum - t.amount;
        return sum;
      }, 0);

    let exactBilledAmount = Math.max(0, expenses - (income + transfers));
    if (isFirstCycle && initialBalance > 0) {
      exactBilledAmount += initialBalance;
    }
    exactBilledAmount += carryforward;

    const billedAmount = Math.round(exactBilledAmount);
    const carryforwardToNext = exactBilledAmount - billedAmount;

    if (nextBillingDate.getTime() === targetCycleStart.getTime()) {
      return carryforwardToNext;
    }

    carryforward = carryforwardToNext;
    currentBillingDate = nextBillingDate;
    isFirstCycle = false;
  }

  return 0;
}

export default function Dashboard() {
  const { transactions, emiLoans, currency, categories, wallets, selectedWallet, setSelectedWallet } = useApp();
  const [activeWalletView, setActiveWalletView] = useState('all'); // 'all' or wallet id

  // Filter transactions by wallet if a specific wallet is selected
  const filteredTransactions = activeWalletView === 'all'
    ? transactions
    : transactions.filter(t => String(t.walletId) === String(activeWalletView));

  const monthlyTransactions = getMonthlyTransactions(filteredTransactions);
  const { income, expenses, balance } = calculateTotals(monthlyTransactions);

  // Calculate totals for all transactions (not just current month) for the comparison graph
  const { income: allIncome, expenses: allExpenses } = calculateTotals(filteredTransactions);

  // Calculate balance for each wallet
  const walletsWithBalance = wallets.map((wallet) => {
    // Filter transactions for this wallet with type-safe comparison
    const walletTransactions = transactions.filter((t) => {
      const tWalletId = String(t.walletId || '');
      const wId = String(wallet.id || '');
      return tWalletId === wId;
    });
    const walletMonthlyTransactions = getMonthlyTransactions(walletTransactions);
    const { income: monthlyIncome, expenses: monthlyExpenses } = calculateTotals(walletMonthlyTransactions);
    // Use getWalletSummary which calculates balance from ALL transactions (not just monthly)
    const summary = getWalletSummary(wallet, transactions, emiLoans);
    return {
      ...wallet,
      ...summary, // This includes calculatedBalance from all transactions
      currentCycleCarryforward: getCurrentCycleCarryforward(wallet, transactions),
      income: monthlyIncome, // Monthly income for display
      expenses: monthlyExpenses, // Monthly expenses for display
      transactionCount: walletTransactions.length
    };
  });

  const totalBalance = walletsWithBalance.reduce((sum, w) => sum + w.calculatedBalance, 0);

  // Prepare chart data for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Filter transactions from filteredTransactions (not monthlyTransactions) for the last 7 days
    const dayTransactions = filteredTransactions.filter((t) => {
      const transDate = new Date(t.date);
      transDate.setHours(0, 0, 0, 0);
      return transDate >= date && transDate < nextDay;
    });
    const { income: dayIncome, expenses: dayExpenses } = calculateTotals(dayTransactions);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      income: dayIncome,
      expenses: dayExpenses,
    };
  });

  const recentTransactions = filteredTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="pt-20 md:pt-8 px-3 sm:px-4 md:px-8 max-w-7xl mx-auto pb-20 md:pb-8">
      <div className="mb-4 sm:mb-6 md:mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 text-slate-800 dark:text-white">Dashboard</h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          {activeWalletView === 'all'
            ? "Welcome back! Here's your financial overview."
            : `Viewing ${wallets.find(w => w.id === activeWalletView)?.name || 'wallet'} transactions.`}
        </p>
      </div>

      {/* Wallet Cards Section */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Your Wallets</h2>
          <button
            onClick={() => setActiveWalletView(activeWalletView === 'all' ? selectedWallet : 'all')}
            className="text-xs sm:text-sm text-teal-600 dark:text-cyan-400 hover:text-teal-700 dark:hover:text-cyan-300 font-medium px-2 py-1"
          >
            {activeWalletView === 'all' ? 'Active' : 'All'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {walletsWithBalance.map((wallet, index) => {
            const isActive = activeWalletView === wallet.id;
            const isSelected = selectedWallet === wallet.id;
            const isCreditCard = wallet.type === 'credit';
            const showCreditDetails = isCreditCard && isActive;
            const outstanding = isCreditCard
              ? wallet.creditUsed ?? Math.abs(wallet.calculatedBalance)
              : null;
            return (
              <div
                key={wallet.id}
                onClick={() => {
                  setActiveWalletView(wallet.id);
                  setSelectedWallet(wallet.id);
                }}
                className={`glass-card p-3 sm:p-4 md:p-5 cursor-pointer transition-all duration-300 transform hover:scale-105 animate-slide-up group ${isActive ? 'ring-2 ring-teal-500 dark:ring-cyan-500 shadow-2xl' : 'hover:shadow-xl'
                  }`}
                style={{
                  animationDelay: `${index * 0.1}s`,
                  borderLeft: `4px solid ${wallet.color}`
                }}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-lg group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: `${wallet.color}20` }}
                    >
                      {wallet.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white">{wallet.name}</h3>
                      <div className="flex items-center gap-1">
                        {isSelected && (
                          <span className="text-[10px] sm:text-xs text-teal-600 dark:text-cyan-400 font-medium">Active</span>
                        )}
                        <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 uppercase tracking-wide">
                          {wallet.type === 'credit' ? 'Credit' : 'Wallet'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <CreditCard
                    size={18}
                    className={`hidden sm:block transition-colors ${isActive ? 'text-teal-500 dark:text-cyan-400' : 'text-slate-400'}`}
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1">
                      {isCreditCard ? 'Credit Limit Used' : 'Balance'}
                    </p>
                    <div>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
                        {isCreditCard
                          ? formatCurrency(outstanding || 0, currency)
                          : formatCurrency(wallet.calculatedBalance, currency)}
                      </p>
                      {isCreditCard && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Net impact {formatCurrency(wallet.calculatedBalance, currency)}
                        </p>
                      )}
                    </div>
                  </div>
                  {!isCreditCard && (
                    <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Income: </span>
                        <span className="text-green-500 font-medium">{formatCurrency(wallet.income, currency)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Expenses: </span>
                        <span className="text-red-500 font-medium">{formatCurrency(wallet.expenses, currency)}</span>
                      </div>
                    </div>
                  )}
                  {isCreditCard && (
                    <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 px-3 py-2">
                      <div className="flex items-center justify-between gap-3 text-[10px] sm:text-xs">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Available</span>
                          <p className="font-semibold text-teal-600 dark:text-cyan-400">
                            {formatCurrency(wallet.availableCredit ?? 0, currency)}
                          </p>
                        </div>
                        {(wallet.emiBlockedAmount ?? 0) > 0 && (
                          <div className="text-right">
                            <span className="text-slate-500 dark:text-slate-400">Blocked</span>
                            <p className="font-semibold text-violet-600 dark:text-violet-400">
                              {formatCurrency(wallet.emiBlockedAmount ?? 0, currency)}
                            </p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (showCreditDetails) {
                              setActiveWalletView('all');
                              if (selectedWallet === wallet.id) {
                                setSelectedWallet('');
                              }
                            } else {
                              setActiveWalletView(wallet.id);
                              setSelectedWallet(wallet.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-slate-500 transition-colors hover:bg-white/80 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-slate-200"
                        >
                          <span>{showCreditDetails ? 'Hide details' : 'Show details'}</span>
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${showCreditDetails ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                  {showCreditDetails && (
                    <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      {(wallet.emiBlockedAmount ?? 0) > 0 && (
                        <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-900/50 dark:bg-violet-950/30">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-violet-700 dark:text-violet-300">EMI Blocked</span>
                            <span className="font-bold text-violet-700 dark:text-violet-300">
                              {formatCurrency(wallet.emiBlockedAmount ?? 0, currency)}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] sm:text-xs text-violet-600 dark:text-violet-400">
                            This principal is reserved against your credit limit until EMI months post.
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span>Limit</span>
                        <span>{formatCurrency(wallet.creditLimit || 0, currency)}</span>
                      </div>
                      {wallet.hasUnpaidBill && wallet.unpaidBillAmount > 0 && (
                        <div className="pt-1 border-t-2 border-red-300 dark:border-red-700 mt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-red-600 dark:text-red-400 font-semibold">Unpaid Bill</span>
                            <span className="text-red-600 dark:text-red-400 font-bold">
                              {formatCurrency(wallet.unpaidBillAmount, currency)}
                            </span>
                          </div>
                        </div>
                      )}
                      {wallet.currentStatementBalance !== undefined && wallet.currentStatementBalance > 0 && wallet.dueDate && (
                        <div className="pt-1 border-t border-slate-200 dark:border-slate-700 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span>Statement</span>
                            <span className="font-semibold">{formatCurrency(wallet.currentStatementBalance, currency)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Due</span>
                            <span className={`font-semibold ${wallet.daysUntilDue !== null && wallet.daysUntilDue < 7
                              ? 'text-red-500'
                              : wallet.daysUntilDue !== null && wallet.daysUntilDue < 14
                                ? 'text-yellow-500'
                                : ''
                              }`}>
                              {wallet.dueDate instanceof Date ? wallet.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date(wallet.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {wallet.daysUntilDue !== null && wallet.daysUntilDue < 14 && (
                                <span className="ml-1">({wallet.daysUntilDue >= 0 ? `${wallet.daysUntilDue}d` : 'overdue'})</span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                      {Math.abs(wallet.currentCycleCarryforward ?? 0) > 0.01 && (
                        <div className="flex items-center justify-between text-[10px] sm:text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Carryforward</span>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {(wallet.currentCycleCarryforward ?? 0) >= 0 ? '+' : ''}
                            {formatCurrency(wallet.currentCycleCarryforward ?? 0, currency)}
                          </span>
                        </div>
                      )}
                      {wallet.lastBilledAmount > 0 && (
                        <div className="flex items-center justify-between text-[10px] sm:text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Last Billed</span>
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            {formatCurrency(wallet.lastBilledAmount, currency)}
                          </span>
                        </div>
                      )}
                      {wallet.unbilledAmount !== undefined && wallet.unbilledAmount > 0 && (
                        <div className="flex items-center justify-between text-[10px] sm:text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Unbilled (New)</span>
                          <span className="text-orange-600 dark:text-orange-400 font-semibold">
                            {formatCurrency(wallet.unbilledAmount, currency)}
                          </span>
                        </div>
                      )}
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-1 overflow-hidden flex">
                        {wallet.unpaidBillAmount > 0 && (
                          <div
                            className="h-full bg-red-500"
                            style={{ width: `${Math.min(100, (wallet.unpaidBillAmount / wallet.creditLimit) * 100)}%` }}
                            title={`Unpaid Bill: ${formatCurrency(wallet.unpaidBillAmount, currency)}`}
                          />
                        )}
                        {wallet.unbilledAmount !== undefined && wallet.unbilledAmount > 0 && (
                          <div
                            className="h-full bg-orange-500"
                            style={{ width: `${Math.min(100, (wallet.unbilledAmount / wallet.creditLimit) * 100)}%` }}
                            title={`Unbilled: ${formatCurrency(wallet.unbilledAmount, currency)}`}
                          />
                        )}
                        {(wallet.emiBlockedAmount ?? 0) > 0 && (
                          <div
                            className="h-full bg-violet-500"
                            style={{ width: `${Math.min(100, ((wallet.emiBlockedAmount ?? 0) / wallet.creditLimit) * 100)}%` }}
                            title={`EMI Blocked: ${formatCurrency(wallet.emiBlockedAmount ?? 0, currency)}`}
                          />
                        )}
                        {wallet.availableCredit > 0 && (
                          <div
                            className="h-full bg-teal-500"
                            style={{ width: `${Math.min(100, (wallet.availableCredit / wallet.creditLimit) * 100)}%` }}
                            title={`Available: ${formatCurrency(wallet.availableCredit, currency)}`}
                          />
                        )}
                      </div>
                    </div>
                  )}
                  <div className="pt-1.5 sm:pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                      {wallet.transactionCount} transaction{wallet.transactionCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Balance Card */}
        <div className="glass-card p-4 sm:p-5 md:p-6 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1">Total Balance</p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
                {formatCurrency(totalBalance, currency)}
              </h2>
            </div>
            <Wallet className="text-teal-600 dark:text-cyan-400 w-6 h-6 sm:w-8 sm:h-8" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <div className="glass-card p-4 sm:p-5 md:p-6 animate-slide-up hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
              <Wallet className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <TrendingUp className="text-green-500 w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1">Total Balance</p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
            {formatCurrency(balance, currency)}
          </h2>
        </div>

        <div className="glass-card p-4 sm:p-5 md:p-6 animate-slide-up hover:shadow-2xl transition-all duration-300" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg">
              <ArrowUpCircle className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-green-500 font-semibold text-xs sm:text-sm">+{formatCurrency(income, currency)}</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1">Monthly Income</p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
            {formatCurrency(income, currency)}
          </h2>
        </div>

        <div className="glass-card p-4 sm:p-5 md:p-6 animate-slide-up hover:shadow-2xl transition-all duration-300" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg">
              <ArrowDownCircle className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-red-500 font-semibold text-xs sm:text-sm">-{formatCurrency(expenses, currency)}</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-1">Monthly Expenses</p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
            {formatCurrency(expenses, currency)}
          </h2>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        <div className="glass-card p-4 sm:p-5 md:p-6 animate-fade-in">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-slate-800 dark:text-white">Income vs Expenses (7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.3} />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '12px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 4 }}
                name="Income"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ fill: '#ef4444', r: 4 }}
                name="Expenses"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-4 sm:p-5 md:p-6 animate-fade-in">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-slate-800 dark:text-white">Monthly Comparison</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[{ name: 'Income', value: allIncome }, { name: 'Expenses', value: allExpenses }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.3} />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '12px',
                }}
                formatter={(value) => formatCurrency(value, currency)}
              />
              <Bar dataKey="value" fill="#14b8a6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-card p-4 sm:p-5 md:p-6 animate-fade-in">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-slate-800 dark:text-white">Recent Transactions</h3>
        {recentTransactions.length === 0 ? (
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 text-center py-6 sm:py-8">No transactions yet. Add your first transaction!</p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {recentTransactions.map((transaction) => {
              const isTransfer = transaction.isTransfer || transaction.type === 'transfer';
              const displayCategory = isTransfer ? (transaction.transferType === 'interest' ? 'Interest' : 'Transfer') : transaction.category;
              const category = categories.find((c) => c.name === displayCategory) || categories.find(c => c.name === 'Transfer') || categories[0];
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white/50 dark:bg-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl md:text-2xl flex-shrink-0"
                      style={{ backgroundColor: `${category?.color}20` }}
                    >
                      {category?.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-slate-800 dark:text-white truncate">{transaction.description || displayCategory}</p>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{displayCategory}</p>
                        {transaction.walletId && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400 truncate max-w-[100px] sm:max-w-none" style={{ backgroundColor: `${wallets.find(w => w.id === transaction.walletId)?.color}20` }}>
                              {wallets.find(w => w.id === transaction.walletId)?.icon} {wallets.find(w => w.id === transaction.walletId)?.name || 'Wallet'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`text-base sm:text-lg font-bold ml-2 sm:ml-4 flex-shrink-0 ${(transaction.type === 'income' || transaction.type === 'transfer' || transaction.transferType === 'destination_credit') ? 'text-green-500' : 'text-red-500'}`}>
                    {(transaction.type === 'income' || transaction.type === 'transfer' || transaction.transferType === 'destination_credit') ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


