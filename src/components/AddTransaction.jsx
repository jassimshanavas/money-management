import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, getWalletSummary } from '../utils/helpers';
import { Plus, X } from 'lucide-react';
import { parseISO, addMonths, format } from 'date-fns';

export default function AddTransaction() {
  const { categories, currency, addTransaction, wallets, selectedWallet, setSelectedWallet, transactions, walletTransfer, updateWallet } = useApp();
  // Get initial category based on type
  const getInitialCategory = (type) => {
    const typeCategories = categories.filter((cat) => (cat.type || 'expense') === type);
    return typeCategories.length > 0 ? typeCategories[0].name : '';
  };

  const [formData, setFormData] = useState({
    type: 'expense',
    category: getInitialCategory('expense'),
    tag: '',
    amount: '',
    description: '',
    walletId: selectedWallet,
    date: format(new Date(), 'yyyy-MM-dd'),
    // Transfer-specific fields
    destinationWalletId: '',
    interest: '',
    // Bill payment specific field
    billingCycleDate: null, // Which billing cycle this payment is for
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSubmittedType, setLastSubmittedType] = useState('transaction');

  // Synchronize with global selectedWallet 
  useEffect(() => {
    // If we have a selected wallet, and either:
    // 1. the form doesn't have one yet, OR
    // 2. the form has '1' (initial default) but the context has a real wallet ID
    if (selectedWallet && (!formData.walletId || formData.walletId === '1')) {
      if (formData.walletId !== selectedWallet) {
        setFormData(prev => ({
          ...prev,
          walletId: selectedWallet
        }));
      }
    }
  }, [selectedWallet]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return;
    }


    // Handle bill payment differently
    if (formData.type === 'billpayment') {
      const creditCard = wallets.find(w => w.id === formData.walletId);
      if (!creditCard || creditCard.type !== 'credit') {
        alert('Please select a credit card with a pending bill');
        return;
      }


      const creditCardSummary = getWalletSummary(creditCard, transactions);
      const unpaidBill = creditCardSummary.unpaidBillAmount || 0;
      const unbilledAmount = creditCardSummary.unbilledAmount || 0;
      const totalOwed = unpaidBill + unbilledAmount;

      if (totalOwed <= 0) {
        alert('This credit card has no outstanding balance to pay');
        return;
      }

      if (!formData.destinationWalletId) {
        alert('Please select a payment source (debit card or cash wallet)');
        return;
      }

      const paymentSource = wallets.find(w => w.id === formData.destinationWalletId);
      if (!paymentSource) {
        alert('Invalid payment source selected');
        return;
      }

      const paymentAmount = parseFloat(formData.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        alert('Please enter a valid payment amount');
        return;
      }

      if (paymentAmount > totalOwed) {
        const confirm = window.confirm(
          `Payment amount (${formatCurrency(paymentAmount, currency)}) exceeds total owed (${formatCurrency(totalOwed, currency)}). Continue anyway?`
        );
        if (!confirm) return;
      }

      // Check if payment source has enough balance
      const sourceBalance = paymentSource.type === 'credit'
        ? (paymentSource.creditLimit || 0) - (paymentSource.creditUsed || 0)
        : getWalletSummary(paymentSource, transactions).calculatedBalance;

      if (paymentAmount > sourceBalance) {
        alert(`Insufficient balance in ${paymentSource.name}. Available: ${formatCurrency(sourceBalance, currency)}`);
        return;
      }

      // Use the actual selected date for the transaction
      let paymentDate;
      if (formData.date) {
        try {
          const dateObj = new Date(formData.date);
          paymentDate = isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString();
        } catch {
          paymentDate = new Date().toISOString();
        }
      } else {
        paymentDate = new Date().toISOString();
      }

      // Add payment to credit card's payments array
      const newPayment = {
        id: Date.now().toString(),
        amount: paymentAmount,
        date: paymentDate, // Actual payment date
        billingCycleDate: formData.billingCycleDate, // Map to specific cycle for history purposes
        description: formData.description || `Bill Payment from ${paymentSource.name}`,
        sourceWalletId: paymentSource.id,
        actualPaymentDate: formData.date || new Date().toISOString().split('T')[0]
      };

      const newPayments = [...(creditCard.payments || []), newPayment];

      // Update credit card with new payments array
      updateWallet(creditCard.id, {
        payments: newPayments
      });

      // Add income transaction to credit card to reduce the balance
      addTransaction({
        type: 'income',
        category: 'Bill Payment',
        amount: paymentAmount,
        walletId: creditCard.id,
        date: paymentDate,
        description: `Payment from ${paymentSource.name}`,
        tag: 'bill-payment',
        paymentId: newPayment.id
      });

      // Deduct from payment source wallet
      addTransaction({
        type: 'expense',
        category: 'Bill Payment',
        amount: paymentAmount,
        walletId: paymentSource.id,
        date: paymentDate,
        description: `Credit Card Bill Payment - ${creditCard.name}`,
        tag: 'bill-payment',
        paymentId: newPayment.id
      });

      setFormData({
        type: 'expense',
        category: getInitialCategory('expense'),
        tag: '',
        amount: '',
        description: '',
        walletId: selectedWallet,
        date: format(new Date(), 'yyyy-MM-dd'),
        destinationWalletId: '',
        interest: '',
        billingCycleDate: null,
      });

      setLastSubmittedType('billpayment');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    // Handle wallet transfer differently
    if (formData.type === 'transfer') {
      if (!formData.destinationWalletId) {
        alert('Please select a destination wallet');
        return;
      }
      if (formData.walletId === formData.destinationWalletId) {
        alert('Source and destination wallets must be different');
        return;
      }

      // Ensure date is properly formatted
      let transactionDate;
      if (formData.date) {
        try {
          const dateObj = new Date(formData.date);
          if (isNaN(dateObj.getTime())) {
            transactionDate = new Date().toISOString();
          } else {
            transactionDate = dateObj.toISOString();
          }
        } catch {
          transactionDate = new Date().toISOString();
        }
      } else {
        transactionDate = new Date().toISOString();
      }

      walletTransfer({
        sourceWalletId: formData.walletId,
        destinationWalletId: formData.destinationWalletId,
        amount: parseFloat(formData.amount),
        interest: formData.interest ? parseFloat(formData.interest) : 0,
        description: formData.description || 'Wallet Transfer',
        date: transactionDate,
        category: formData.category,
      });

      setFormData({
        type: 'expense',
        category: getInitialCategory('expense'),
        tag: '',
        amount: '',
        description: '',
        walletId: selectedWallet,
        date: format(new Date(), 'yyyy-MM-dd'),
        destinationWalletId: '',
        interest: '',
      });

      setLastSubmittedType('transfer');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    // Regular transaction handling
    // Ensure date is properly formatted
    let transactionDate;
    if (formData.date) {
      // If date is in YYYY-MM-DD format, convert to ISO string
      // If it's already an ISO string, use it as is
      try {
        const dateObj = new Date(formData.date);
        if (isNaN(dateObj.getTime())) {
          transactionDate = new Date().toISOString();
        } else {
          transactionDate = dateObj.toISOString();
        }
      } catch {
        transactionDate = new Date().toISOString();
      }
    } else {
      transactionDate = new Date().toISOString();
    }

    addTransaction({
      ...formData,
      amount: parseFloat(formData.amount),
      walletId: String(formData.walletId || selectedWallet), // Ensure string type
      date: transactionDate,
    });

    setFormData({
      type: 'expense',
      category: getInitialCategory('expense'),
      tag: '',
      amount: '',
      description: '',
      walletId: selectedWallet,
      date: format(new Date(), 'yyyy-MM-dd'),
      destinationWalletId: '',
      interest: '',
    });

    setLastSubmittedType('transaction');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Filter categories by transaction type
  const filteredCategories = categories.filter((cat) => (cat.type || 'expense') === formData.type);
  const activeWalletId = formData.walletId || selectedWallet;
  const activeWallet = wallets.find((wallet) => wallet.id === activeWalletId);
  const walletSummary = activeWallet ? getWalletSummary(activeWallet, transactions) : null;

  // Calculate billing history for bill payment type
  const billingCycles = useMemo(() => {
    if (formData.type !== 'billpayment' || !activeWallet || activeWallet.type !== 'credit' || !activeWallet.billingDate) {
      return [];
    }

    const history = [];
    const billingDay = activeWallet.billingDate;
    const dueDateDuration = activeWallet.dueDateDuration || 20;
    const walletTransactions = transactions.filter(t => String(t.walletId) === String(activeWallet.id));
    const initialBalance = Number(activeWallet.balance ?? 0) || 0;

    const firstTransactionDate = walletTransactions.length > 0
      ? new Date(Math.min(...walletTransactions.map(t => parseISO(t.date).getTime())))
      : new Date();

    let currentBillingDate = new Date(firstTransactionDate.getFullYear(), firstTransactionDate.getMonth(), billingDay);
    if (currentBillingDate > firstTransactionDate) {
      currentBillingDate = new Date(currentBillingDate.getFullYear(), currentBillingDate.getMonth() - 1, billingDay);
    }

    const today = new Date();
    const maxCycles = 24;
    let cycleCount = 0;
    let isFirstCycle = true;

    while (currentBillingDate <= today && cycleCount < maxCycles) {
      const nextBillingDate = addMonths(currentBillingDate, 1);
      const dueDate = new Date(currentBillingDate);
      dueDate.setDate(dueDate.getDate() + dueDateDuration);

      const cycleTransactions = walletTransactions.filter(t => {
        const transDate = parseISO(t.date);
        return transDate >= currentBillingDate && transDate < nextBillingDate;
      });

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

      let exactBilledAmount = Math.max(0, expenses - (income + transfers));
      if (isFirstCycle && initialBalance > 0) {
        exactBilledAmount += initialBalance;
      }

      const previousCycle = history[history.length - 1];
      const carryforward = previousCycle?.carryforward || 0;
      exactBilledAmount += carryforward;

      const billedAmount = Math.round(exactBilledAmount);
      const carryforwardToNext = exactBilledAmount - billedAmount;

      const payments = (activeWallet.payments || []).filter(p => {
        // Use explicit mapping if available
        if (p.billingCycleDate) {
          // Compare ISO strings or midnight timestamps
          return new Date(p.billingCycleDate).toISOString() === currentBillingDate.toISOString();
        }
        // Fallback to date-based mapping for legacy payments
        const paymentDate = parseISO(p.date);
        return paymentDate >= currentBillingDate && paymentDate < nextBillingDate;
      });

      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingBalance = Math.max(0, billedAmount - totalPayments);

      if (remainingBalance > 0) {
        history.push({
          billingDate: currentBillingDate,
          nextBillingDate,
          dueDate,
          billedAmount,
          remainingBalance,
          monthLabel: format(currentBillingDate, 'MMM yyyy')
        });
      }

      currentBillingDate = nextBillingDate;
      cycleCount++;
      isFirstCycle = false;
    }

    return history.reverse(); // Most recent first
  }, [formData.type, activeWallet, transactions]);

  return (
    <div className="pt-20 md:pt-8 px-3 sm:px-4 md:px-8 max-w-2xl mx-auto pb-20 md:pb-8">
      <div className="mb-4 sm:mb-6 md:mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 text-slate-800 dark:text-white">Add Transaction</h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">Record your income or expense</p>
      </div>

      {showSuccess && (
        <div className="glass-card p-3 sm:p-4 mb-4 sm:mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 animate-scale-in">
          <p className="text-sm sm:text-base text-green-700 dark:text-green-300 text-center">
            {lastSubmittedType === 'transfer' ? 'Transfer executed successfully!' : lastSubmittedType === 'billpayment' ? 'Bill payment recorded successfully!' : 'Transaction added successfully!'}
          </p>
        </div>
      )}

      <div className="glass-card p-4 sm:p-5 md:p-6 lg:p-8 animate-slide-up">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Transaction Type */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-slate-700 dark:text-slate-300">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  const expenseCategories = categories.filter((cat) => (cat.type || 'expense') === 'expense');
                  const newCategory = expenseCategories.length > 0 ? expenseCategories[0].name : '';
                  setFormData({ ...formData, type: 'expense', category: newCategory });
                }}
                className={`p-3 sm:p-4 rounded-xl transition-all duration-300 ${formData.type === 'expense'
                  ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg scale-105'
                  : 'bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80'
                  }`}
              >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">📉</div>
                <div className="font-semibold text-sm sm:text-base">Expense</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  const incomeCategories = categories.filter((cat) => (cat.type || 'expense') === 'income');
                  const newCategory = incomeCategories.length > 0 ? incomeCategories[0].name : '';
                  setFormData({ ...formData, type: 'income', category: newCategory });
                }}
                className={`p-3 sm:p-4 rounded-xl transition-all duration-300 ${formData.type === 'income'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105'
                  : 'bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80'
                  }`}
              >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">📈</div>
                <div className="font-semibold text-sm sm:text-base">Income</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  const transferCategory = categories.find((cat) => cat.name === 'Transfer');
                  setFormData({
                    ...formData,
                    type: 'transfer',
                    category: transferCategory?.name || 'Transfer',
                    destinationWalletId: wallets.find(w => w.id !== formData.walletId)?.id || ''
                  });
                }}
                className={`p-3 sm:p-4 rounded-xl transition-all duration-300 ${formData.type === 'transfer'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg scale-105'
                  : 'bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80'
                  }`}
              >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">💱</div>
                <div className="font-semibold text-sm sm:text-base">Transfer</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  // Find first credit card with any outstanding balance
                  const creditWallet = wallets.find(w => {
                    if (w.type !== 'credit') return false;
                    const summary = getWalletSummary(w, transactions);
                    return (summary.unpaidBillAmount || 0) > 0 || (summary.unbilledAmount || 0) > 0;
                  });
                  const paymentSource = wallets.find(w => w.type !== 'credit');
                  const summary = creditWallet ? getWalletSummary(creditWallet, transactions) : null;
                  const totalOwed = summary ? (summary.unpaidBillAmount || 0) + (summary.unbilledAmount || 0) : 0;
                  setFormData({
                    ...formData,
                    type: 'billpayment',
                    category: 'Bill Payment',
                    walletId: creditWallet?.id || formData.walletId,
                    destinationWalletId: paymentSource?.id || '',
                    amount: totalOwed.toString()
                  });
                }}
                className={`p-3 sm:p-4 rounded-xl transition-all duration-300 ${formData.type === 'billpayment'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                  : 'bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80'
                  }`}
              >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">💳</div>
                <div className="font-semibold text-sm sm:text-base">Bill Pay</div>
              </button>
            </div>
          </div>

          {/* Wallet Selection - Always show */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              {formData.type === 'transfer' ? 'Source Wallet' : formData.type === 'billpayment' ? 'Credit Card (with pending bill)' : 'Wallet'}
            </label>
            <select
              value={formData.walletId || selectedWallet}
              onChange={(e) => {
                const newWalletId = e.target.value;
                setSelectedWallet(newWalletId);
                if (formData.type === 'billpayment') {
                  const selectedCard = wallets.find(w => w.id === newWalletId);
                  const summary = selectedCard ? getWalletSummary(selectedCard, transactions) : null;
                  const totalOwed = summary ? (summary.unpaidBillAmount || 0) + (summary.unbilledAmount || 0) : 0;
                  setFormData({
                    ...formData,
                    walletId: newWalletId,
                    amount: totalOwed.toString()
                  });
                } else {
                  setFormData({ ...formData, walletId: newWalletId });
                }
              }}
              className="input-field"
            >
              {(formData.type === 'billpayment'
                ? wallets.filter(w => {
                  if (w.type !== 'credit') return false;
                  const summary = getWalletSummary(w, transactions);
                  return (summary.unpaidBillAmount || 0) > 0 || (summary.unbilledAmount || 0) > 0;
                })
                : wallets
              ).map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.icon} {wallet.name}
                  {formData.type === 'billpayment' && (() => {
                    const summary = getWalletSummary(wallet, transactions);
                    const totalOwed = (summary.unpaidBillAmount || 0) + (summary.unbilledAmount || 0);
                    return ` - ${formatCurrency(totalOwed, currency)} owed`;
                  })()}
                </option>
              ))}
            </select>
            {formData.type === 'billpayment' && wallets.filter(w => {
              if (w.type !== 'credit') return false;
              const summary = getWalletSummary(w, transactions);
              return (summary.unpaidBillAmount || 0) > 0 || (summary.unbilledAmount || 0) > 0;
            }).length === 0 && (
                <div className="mt-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    No credit cards have outstanding balances. Use your credit cards to make purchases first.
                  </p>
                </div>
              )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {formData.type === 'billpayment' ? 'Select the card you want to pay' : 'Each transaction belongs to a specific wallet'}
            </p>
          </div>

          {/* Credit Card Info Display */}
          {activeWallet && activeWallet.type === 'credit' && walletSummary && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <span>Credit Limit</span>
                <span className="font-semibold">
                  {formatCurrency(activeWallet.creditLimit || 0, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Credit Limit Available</span>
                <span className="font-semibold text-teal-600 dark:text-teal-400">
                  {formatCurrency(walletSummary.availableCredit ?? 0, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Credit Limit Used</span>
                <span className="font-semibold text-red-500 dark:text-red-400">
                  {formatCurrency(walletSummary.creditUsed ?? Math.abs(walletSummary.calculatedBalance), currency)}
                </span>
              </div>
              {walletSummary.currentStatementBalance !== undefined && walletSummary.currentStatementBalance > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Current Statement</span>
                    <span className="font-semibold">{formatCurrency(walletSummary.currentStatementBalance, currency)}</span>
                  </div>
                  {walletSummary.dueDate && (
                    <div className="flex items-center justify-between">
                      <span>Due Date</span>
                      <span className={`font-semibold ${walletSummary.daysUntilDue !== null && walletSummary.daysUntilDue < 7
                        ? 'text-red-500 dark:text-red-400'
                        : walletSummary.daysUntilDue !== null && walletSummary.daysUntilDue < 14
                          ? 'text-yellow-500 dark:text-yellow-400'
                          : ''
                        }`}>
                        {walletSummary.dueDate instanceof Date ? walletSummary.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date(walletSummary.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {walletSummary.daysUntilDue !== null && walletSummary.daysUntilDue < 14 && (
                          <span className="ml-1 text-[10px]">
                            ({walletSummary.daysUntilDue >= 0 ? `${walletSummary.daysUntilDue}d left` : 'overdue'})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bill Payment Source - Show for bill payments */}
          {formData.type === 'billpayment' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Payment Source (Pay from)
              </label>
              <select
                value={formData.destinationWalletId}
                onChange={(e) => setFormData({ ...formData, destinationWalletId: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select payment source</option>
                {wallets.filter(w => w.type !== 'credit').map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.icon} {wallet.name} ({formatCurrency(getWalletSummary(wallet, transactions).calculatedBalance, currency)})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select the account you are using to pay this bill
              </p>
            </div>
          )}

          {/* Transfer-specific fields - Destination Wallet */}
          {formData.type === 'transfer' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Destination Wallet
              </label>
              <select
                value={formData.destinationWalletId}
                onChange={(e) => setFormData({ ...formData, destinationWalletId: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select destination wallet</option>
                {wallets.filter(w => w.id !== formData.walletId).map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.icon} {wallet.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                The wallet that will receive the transferred amount
              </p>
            </div>
          )}

          {/* Transfer-specific fields - Interest/Fee */}
          {formData.type === 'transfer' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Interest/Fee ({currency}) <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.interest}
                onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                className="input-field"
                placeholder="0.00"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Additional fee or interest charged for the transfer (deducted from source wallet)
              </p>
            </div>
          )}

          {/* Date Selection */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-slate-700 dark:text-slate-300">
              Transaction Date
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, date: format(new Date(), 'yyyy-MM-dd') })}
                className={`p-2 sm:p-3 rounded-xl transition-all duration-300 text-sm sm:text-base font-medium ${formData.date === format(new Date(), 'yyyy-MM-dd')
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                  : 'bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                  }`}
              >
                Today
              </button>
              <div className={`rounded-xl transition-all duration-300 border ${formData.date !== format(new Date(), 'yyyy-MM-dd')
                ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20'
                : 'border-slate-300 dark:border-slate-600'
                }`}>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-transparent text-sm sm:text-base font-medium cursor-pointer text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selected: {new Date(formData.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Category Selection - Hide for transfers and bill payments */}
          {formData.type !== 'transfer' && formData.type !== 'billpayment' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-slate-700 dark:text-slate-300">
                {formData.type === 'income' ? 'Income Category' : 'Expense Category'}
              </label>
              {filteredCategories.length === 0 ? (
                <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    No {formData.type} categories available. Please add categories in Settings.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 gap-2 sm:gap-3">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.name })}
                      className={`p-2 sm:p-3 rounded-xl transition-all duration-300 ${formData.category === cat.name
                        ? 'ring-2 ring-teal-500 scale-105 shadow-lg'
                        : 'hover:bg-white/50 dark:hover:bg-slate-700/50'
                        }`}
                      style={{
                        backgroundColor: formData.category === cat.name ? `${cat.color}20` : 'transparent',
                      }}
                    >
                      <div className="text-xl sm:text-2xl mb-0.5 sm:mb-1">{cat.icon}</div>
                      <div className="text-[10px] sm:text-xs font-medium text-slate-700 dark:text-slate-300">{cat.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                Amount ({currency})
              </label>
              {formData.type === 'billpayment' && activeWallet && billingCycles.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {/* Full Payment Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const totalOwed = billingCycles.reduce((sum, cycle) => sum + cycle.remainingBalance, 0);
                      // For full payment, use the oldest cycle's date
                      const oldestCycle = billingCycles[billingCycles.length - 1];
                      setFormData({
                        ...formData,
                        amount: totalOwed.toString(),
                        billingCycleDate: oldestCycle?.billingDate ? oldestCycle.billingDate.toISOString() : null
                      });
                    }}
                    className="text-[10px] px-2 py-1 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white border border-purple-300 dark:border-purple-700 hover:from-purple-600 hover:to-pink-600 transition-all whitespace-nowrap flex-shrink-0 font-semibold shadow-sm"
                  >
                    Full: {formatCurrency(billingCycles.reduce((sum, cycle) => sum + cycle.remainingBalance, 0), currency)}
                  </button>

                  {/* Month-wise Payment Buttons */}
                  {billingCycles.map((cycle, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        amount: cycle.remainingBalance.toString(),
                        billingCycleDate: cycle.billingDate.toISOString()
                      })}
                      className="text-[10px] px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      {cycle.monthLabel}: {formatCurrency(cycle.remainingBalance, currency)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input-field text-lg sm:text-xl md:text-2xl font-bold"
              placeholder="0.00"
              required
            />
          </div>

          {/* Tag - Hide for transfers and bill payments */}
          {formData.type !== 'transfer' && formData.type !== 'billpayment' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Tag (Optional)
              </label>
              <input
                type="text"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                className="input-field"
                placeholder="e.g., work, personal, vacation..."
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Add a tag to easily categorize and filter transactions
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              Description (Optional)
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              placeholder="Enter transaction description..."
            />
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 text-sm sm:text-base py-2.5 sm:py-3">
            <Plus size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">
              {formData.type === 'transfer' ? 'Execute ' : formData.type === 'billpayment' ? 'Record ' : 'Add '}
            </span>
            {formData.type === 'transfer' ? 'Transfer' : formData.type === 'billpayment' ? 'Bill Payment' : 'Transaction'}
          </button>
        </form>
      </div >
    </div >
  );
}


