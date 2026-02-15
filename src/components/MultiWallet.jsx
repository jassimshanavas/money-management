import React, { useState, useEffect } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, getWalletSummary, isBetweenBillingAndDue, getBillingCycleDates, processBillingCycle } from '../utils/helpers';
import { Wallet, Plus, Edit2, Trash2, CreditCard, Calendar, AlertCircle, DollarSign, FileText } from 'lucide-react';
import PaymentModal from './PaymentModal';
import BillingHistoryModal from './BillingHistoryModal';

const walletColors = [
  { color: '#14b8a6', name: 'Teal' },
  { color: '#8b5cf6', name: 'Purple' },
  { color: '#ec4899', name: 'Pink' },
  { color: '#f59e0b', name: 'Amber' },
  { color: '#10b981', name: 'Green' },
  { color: '#3b82f6', name: 'Blue' },
];

const walletIcons = ['💼', '💳', '🏦', '💰', '📱', '💎'];

export default function MultiWallet() {
  const {
    wallets,
    transactions,
    currency,
    selectedWallet,
    addWallet,
    updateWallet,
    deleteWallet,
    setSelectedWallet,
    addTransaction,
    deleteTransaction,
  } = useApp();
  // Move these hooks INSIDE the component function
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedWalletForPayment, setSelectedWalletForPayment] = useState(null);
  const [initialPaymentData, setInitialPaymentData] = useState(null);
  const [billingHistoryOpen, setBillingHistoryOpen] = useState(false);
  const [selectedWalletForHistory, setSelectedWalletForHistory] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: walletColors[0].color,
    icon: walletIcons[0],
    type: 'cash',
    balance: '',
    creditLimit: '',
    billingDate: '',
    dueDateDuration: '20',
    existingDebt: '', // For credit cards: existing credit limit used
    lastBillPaid: '', // 'yes', 'no', or ''
    lastBillAmount: '', // Amount if not paid
  });

  // Check if we need to show bill payment questions
  const [showBillQuestions, setShowBillQuestions] = useState(false);

  useEffect(() => {
    if (formData.type === 'credit' && formData.billingDate) {
      const billingDate = parseInt(formData.billingDate);
      if (billingDate >= 1 && billingDate <= 31) {
        const dueDateDuration = parseInt(formData.dueDateDuration) || 20;
        const isBetween = isBetweenBillingAndDue(billingDate, null, dueDateDuration);
        setShowBillQuestions(isBetween);
      } else {
        setShowBillQuestions(false);
      }
    } else {
      setShowBillQuestions(false);
    }
  }, [formData.type, formData.billingDate, formData.dueDateDuration]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    if (formData.type === 'credit' && (!formData.creditLimit || !formData.billingDate)) {
      alert('Credit cards require both credit limit and billing date');
      return;
    }
    if (showBillQuestions && formData.lastBillPaid === '') {
      alert('Please indicate if the last bill has been paid');
      return;
    }
    if (showBillQuestions && formData.lastBillPaid === 'no' && !formData.lastBillAmount) {
      alert('Please enter the billed amount if the bill is not paid');
      return;
    }

    const parsedBalance = formData.type === 'cash'
      ? (Number.isFinite(parseFloat(formData.balance)) ? parseFloat(formData.balance) : 0)
      : (Number.isFinite(parseFloat(formData.existingDebt)) ? parseFloat(formData.existingDebt) : 0);
    const parsedLimit = parseFloat(formData.creditLimit);
    const parsedBillingDate = parseInt(formData.billingDate);
    const parsedDueDateDuration = parseInt(formData.dueDateDuration) || 20;

    // Calculate last billing date for credit cards
    let lastBillingDate = null;
    let lastBilledAmount = 0;
    let finalBalance = parsedBalance;

    // For credit cards, always set lastBillingDate to enable unbilled calculation
    if (formData.type === 'credit' && parsedBillingDate >= 1 && parsedBillingDate <= 31) {
      const cycleDates = getBillingCycleDates(parsedBillingDate, null, parsedDueDateDuration);
      if (cycleDates) {
        lastBillingDate = cycleDates.lastBillingDate.toISOString();

        // If user answered bill questions and bill is not paid, set the billed amount
        if (showBillQuestions && formData.lastBillPaid === 'no') {
          lastBilledAmount = Number.isFinite(parseFloat(formData.lastBillAmount)) ? parseFloat(formData.lastBillAmount) : 0;

          // Last Billed Amount should be part of Existing Credit Limit Used
          if (lastBilledAmount > 0) {
            if (finalBalance > 0) {
              // User entered both - ensure existing debt includes last billed amount
              if (finalBalance < lastBilledAmount) {
                finalBalance = lastBilledAmount;
              }
            } else {
              // No existing debt entered, so last billed amount becomes the existing debt
              finalBalance = lastBilledAmount;
            }
          }
        }
      }
    }

    addWallet({
      name: formData.name,
      color: formData.color,
      icon: formData.icon,
      type: formData.type,
      balance: finalBalance,
      creditLimit: formData.type === 'credit' && Number.isFinite(parsedLimit) ? parsedLimit : 0,
      billingDate: formData.type === 'credit' && parsedBillingDate >= 1 && parsedBillingDate <= 31 ? parsedBillingDate : null,
      dueDateDuration: formData.type === 'credit' ? parsedDueDateDuration : null,
      lastBillingDate: lastBillingDate,
      lastBilledAmount: lastBilledAmount,
      payments: [],
    });

    setFormData({
      name: '',
      color: walletColors[0].color,
      icon: walletIcons[0],
      type: 'cash',
      balance: '',
      creditLimit: '',
      billingDate: '',
      dueDateDuration: '20',
      existingDebt: '',
      lastBillPaid: '',
      lastBillAmount: '',
    });
    setShowAddForm(false);
  };

  const handleDelete = (id) => {
    if (wallets.length === 1) {
      alert('You must have at least one wallet!');
      return;
    }
    if (window.confirm('Are you sure you want to delete this wallet? All transactions will be moved to the default wallet.')) {
      deleteWallet(id);
      if (selectedWallet === id) {
        setSelectedWallet(wallets.find((w) => w.id !== id)?.id || wallets[0].id);
      }
    }
  };

  const handlePayment = (amount, date, paymentId = null) => {
    if (!selectedWalletForPayment) return;

    const wallet = selectedWalletForPayment;
    const existingPayments = wallet.payments || [];
    let newPayments;

    if (paymentId) {
      // EDIT MODE
      const oldPayment = existingPayments.find(p => p.id === paymentId);
      if (!oldPayment) return;

      newPayments = existingPayments.map(p =>
        p.id === paymentId
          ? { ...p, amount, date: new Date(date).toISOString(), type: amount >= (p.billAmount || 0) ? 'full' : 'partial' }
          : p
      );
    } else {
      // NEW PAYMENT MODE
      const maxPayable = wallet.unpaidBillAmount || 0;
      const isFullPayment = amount >= maxPayable;

      newPayments = [
        ...existingPayments,
        {
          id: Date.now(),
          amount: amount,
          date: new Date(date).toISOString(),
          billAmount: maxPayable,
          type: isFullPayment ? 'full' : 'partial',
        },
      ];
    }

    const summary = getWalletSummary({ ...wallet, payments: newPayments }, transactions);

    // For CREDIT CARDS: wallet.balance is the INITIAL debt and should NOT change
    // Payments are tracked separately in the payments array
    updateWallet(wallet.id, {
      // DO NOT modify balance for credit cards - it's the initial debt!
      payments: newPayments,
      unpaidBillAmount: summary.unpaidBillAmount,
      hasUnpaidBill: summary.unpaidBillAmount > 0
    });

    alert(paymentId ? 'Payment updated successfully!' : 'Payment recorded successfully!');
    setSelectedWalletForPayment(null);
    setInitialPaymentData(null);
  };

  const handleEditPaymentFromHistory = (payment) => {
    // selectedWalletForHistory is the wallet object
    if (!selectedWalletForHistory) return;

    // Find the current wallet from state using ID
    const wallet = wallets.find(w => w.id === selectedWalletForHistory.id);
    if (!wallet) return;

    setInitialPaymentData(payment);
    setSelectedWalletForPayment(wallet);
    setPaymentModalOpen(true);
  };

  const handleDeletePaymentFromHistory = (paymentId) => {
    if (!selectedWalletForHistory) return;

    const wallet = wallets.find(w => w.id === selectedWalletForHistory.id);
    if (!wallet) return;

    const paymentToDelete = (wallet.payments || []).find(p => p.id === paymentId);
    if (!paymentToDelete) return;

    const newPayments = (wallet.payments || []).filter(p => p.id !== paymentId);

    // For CREDIT CARDS: wallet.balance is the INITIAL debt and should NOT change
    // Deleting a payment doesn't change the initial debt, just the payment records

    // Recalculate summary to get correct unpaidBillAmount
    const summary = getWalletSummary({ ...wallet, payments: newPayments }, transactions);

    // Synchronize: Delete any transactions in the main history that are linked to this payment
    // We search for transactions where paymentId matches this payment's ID
    const relatedTransactions = transactions.filter(t => String(t.paymentId) === String(paymentId));

    // Use deleteTransaction which already handles related transactions if it finds a paymentId
    // But we need to call it for each to be safe and clean the history records
    relatedTransactions.forEach(t => {
      deleteTransaction(t.id);
    });

    updateWallet(wallet.id, {
      // DO NOT modify balance for credit cards - it's the initial debt!
      payments: newPayments,
      unpaidBillAmount: summary.unpaidBillAmount,
      hasUnpaidBill: summary.unpaidBillAmount > 0
    });

    alert('Payment deleted successfully. Balance adjusted.');
  };

  const handleHistoryPayment = (wallet, amount) => {
    setSelectedWalletForPayment({
      ...wallet,
      unpaidBillAmount: amount, // Use the specific cycle balance
      hasUnpaidBill: true
    });
    setPaymentModalOpen(true);
  };

  const handleEditInitialDebt = (wallet, currentDebt) => {
    const newDebt = prompt(`Edit Initial Debt for ${wallet.name}:\n\nCurrent: ${formatCurrency(currentDebt, currency)}`, currentDebt);

    if (newDebt === null) return; // User cancelled

    const parsedDebt = parseFloat(newDebt);
    if (isNaN(parsedDebt) || parsedDebt < 0) {
      alert('Please enter a valid positive number');
      return;
    }

    // Update wallet balance (which represents initial debt for credit cards)
    updateWallet(wallet.id, {
      balance: parsedDebt
    });

    alert(`Initial debt updated to ${formatCurrency(parsedDebt, currency)}`);
  };


  // Auto-process billing cycles
  useEffect(() => {
    const processCycles = () => {
      wallets.forEach((wallet) => {
        if (wallet.type === 'credit' && wallet.billingDate) {
          const updates = processBillingCycle(wallet, transactions);
          if (updates) {
            updateWallet(wallet.id, updates);
          }
        }
      });
    };

    // Process on mount and when transactions change
    processCycles();
  }, [transactions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate balances for each wallet
  const walletsWithBalance = wallets.map((wallet) => {
    const summary = getWalletSummary(wallet, transactions);
    return { ...wallet, ...summary };
  });

  const totalBalance = walletsWithBalance.reduce((sum, w) => sum + w.calculatedBalance, 0);

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Wallet className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Multi-Wallet</h1>
              <p className="text-slate-600 dark:text-slate-400">Manage multiple accounts and wallets</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            <span>New Wallet</span>
          </button>
        </div>
      </div>

      {/* Total Balance */}
      <div className="glass-card p-6 mb-6 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Balance Across All Wallets</p>
            <h2 className="text-4xl font-bold text-slate-800 dark:text-white">
              {formatCurrency(totalBalance, currency)}
            </h2>
          </div>
          <CreditCard className="text-teal-500" size={48} />
        </div>
      </div>

      {/* Add Wallet Form */}
      {showAddForm && (
        <div className="glass-card p-6 mb-6 animate-scale-in border-2 border-teal-200 dark:border-teal-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Wallet Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="e.g., Personal, Business, Savings"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {walletColors.map((wc) => (
                    <button
                      key={wc.color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: wc.color })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${formData.color === wc.color ? 'border-slate-800 dark:border-white scale-110' : 'border-slate-300 dark:border-slate-600'
                        }`}
                      style={{ backgroundColor: wc.color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Icon
                </label>
                <div className="flex gap-2 flex-wrap">
                  {walletIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-all ${formData.icon === icon ? 'border-slate-800 dark:border-white scale-110' : 'border-slate-300 dark:border-slate-600'
                        }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Wallet Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Cash / Debit', value: 'cash', icon: '💼' },
                    { label: 'Credit Card', value: 'credit', icon: '💳' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${formData.type === type.value
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                      <div className="text-2xl mb-1">{type.icon}</div>
                      <div className="text-sm font-semibold">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {formData.type === 'cash' ? (
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Starting Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  className="input-field"
                  placeholder="e.g., 1500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Optional: pre-load the wallet with an existing balance.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                    Credit Limit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="input-field"
                    placeholder="e.g., 5000"
                    required
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Maximum credit available on this card.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                    Billing Date (Day of Month) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.billingDate}
                    onChange={(e) => setFormData({ ...formData, billingDate: e.target.value })}
                    className="input-field"
                    placeholder="e.g., 15"
                    required
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Day of month when your statement is generated (1-31).
                  </p>
                </div>
              </div>
            )}
            {formData.type === 'credit' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Due Date Duration (Days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.dueDateDuration}
                  onChange={(e) => setFormData({ ...formData, dueDateDuration: e.target.value })}
                  className="input-field"
                  placeholder="e.g., 20"
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Number of days after billing date when payment is due (default: 20 days).
                </p>
              </div>
            )}
            {formData.type === 'credit' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Existing Credit Limit Used (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.existingDebt}
                  onChange={(e) => setFormData({ ...formData, existingDebt: e.target.value })}
                  className="input-field"
                  placeholder="e.g., 500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Total outstanding balance on this card. If you have an unpaid bill below, this should include that amount. Leave empty if starting fresh.
                </p>
              </div>
            )}
            {showBillQuestions && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 space-y-4">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <AlertCircle size={20} />
                  <span className="font-semibold">Bill Payment Status</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  You're currently between the billing date and due date. Please provide information about the last bill.
                  <span className="block mt-1 font-semibold">Note: The unpaid bill amount will be automatically included in your "Existing Credit Limit Used" above.</span>
                </p>
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                    Has the last bill been paid? <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, lastBillPaid: 'yes', lastBillAmount: '' })}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${formData.lastBillPaid === 'yes'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                      <div className="text-xl mb-1">✅</div>
                      <div className="text-sm font-semibold">Yes, Paid</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, lastBillPaid: 'no' })}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${formData.lastBillPaid === 'no'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                      <div className="text-xl mb-1">❌</div>
                      <div className="text-sm font-semibold">No, Not Paid</div>
                    </button>
                  </div>
                </div>
                {formData.lastBillPaid === 'no' && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                      Last Billed Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.lastBillAmount}
                      onChange={(e) => setFormData({ ...formData, lastBillAmount: e.target.value })}
                      className="input-field"
                      placeholder="e.g., 500.00"
                      required
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Enter the amount from your last statement that needs to be paid.
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-4">
              <button type="submit" className="btn-primary">
                Create Wallet
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        {walletsWithBalance.map((wallet, index) => {
          const isCreditCard = wallet.type === 'credit';
          const outstanding = isCreditCard
            ? wallet.creditUsed ?? Math.abs(wallet.calculatedBalance)
            : null;
          return (
            <div
              key={wallet.id}
              className={`glass-card p-6 cursor-pointer transition-all duration-300 animate-slide-up ${selectedWallet === wallet.id
                ? 'ring-2 ring-teal-500 shadow-xl scale-105'
                : 'hover:shadow-xl'
                }`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => setSelectedWallet(wallet.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${wallet.color}20` }}
                  >
                    {wallet.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-white">{wallet.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedWallet === wallet.id ? 'Active' : 'Click to activate'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full mt-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                      {isCreditCard ? 'Credit Card' : 'Wallet'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newName = prompt('Enter new wallet name:', wallet.name);
                      if (newName) updateWallet(wallet.id, { name: newName });
                    }}
                    className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-400 hover:text-teal-500"
                  >
                    <Edit2 size={16} />
                  </button>
                  {wallets.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(wallet.id);
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {isCreditCard ? 'Credit Limit Used' : 'Balance'}
                  </span>
                  <div className="text-right">
                    <span
                      className={`text-xl font-bold ${(isCreditCard ? -outstanding : wallet.calculatedBalance) >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                        }`}
                    >
                      {isCreditCard
                        ? formatCurrency(outstanding || 0, currency)
                        : formatCurrency(wallet.calculatedBalance, currency)}
                    </span>
                    {isCreditCard && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Net impact {formatCurrency(wallet.calculatedBalance, currency)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Income:{' '}
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {formatCurrency(wallet.income, currency)}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Expenses:{' '}
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      {formatCurrency(wallet.expenses, currency)}
                    </span>
                  </span>
                </div>
                {isCreditCard && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>Credit Limit</span>
                      <span className="font-semibold">
                        {formatCurrency(wallet.creditLimit || 0, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>Credit Limit Available</span>
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        {formatCurrency(wallet.availableCredit ?? 0, currency)}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
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
                        {wallet.availableCredit > 0 && (
                          <div
                            className="h-full bg-teal-500"
                            style={{ width: `${Math.min(100, (wallet.availableCredit / wallet.creditLimit) * 100)}%` }}
                            title={`Available: ${formatCurrency(wallet.availableCredit, currency)}`}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 flex-wrap">
                        {wallet.unpaidBillAmount > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span>Unpaid Bill</span>
                          </div>
                        )}
                        {wallet.unbilledAmount !== undefined && wallet.unbilledAmount > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            <span>Unbilled</span>
                          </div>
                        )}
                        {wallet.availableCredit > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                            <span>Available</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Billing Information */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                      {/* Only show Last Billed if there's a billed amount */}
                      {wallet.lastBilledAmount > 0 && (
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Last Billed</span>
                          <span>{formatCurrency(wallet.lastBilledAmount, currency)}</span>
                        </div>
                      )}

                      {/* Show Due Date ONLY if there's an unpaid bill */}
                      {wallet.hasUnpaidBill && wallet.unpaidBillAmount > 0 && wallet.dueDate && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <AlertCircle size={12} />
                            Due Date
                          </span>
                          <span className={`font-semibold ${wallet.daysUntilDue !== null && wallet.daysUntilDue < 7
                            ? 'text-red-600 dark:text-red-400'
                            : wallet.daysUntilDue !== null && wallet.daysUntilDue < 14
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-slate-800 dark:text-slate-200'
                            }`}>
                            {wallet.dueDate ? (wallet.dueDate instanceof Date ? wallet.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date(wallet.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : 'N/A'}
                            {wallet.daysUntilDue !== null && (
                              <span className="ml-1 text-[10px]">
                                ({wallet.daysUntilDue > 0 ? `${wallet.daysUntilDue}d left` : wallet.daysUntilDue === 0 ? 'Due today' : `${Math.abs(wallet.daysUntilDue)}d overdue`})
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Show Current Statement (Unbilled) if there's unbilled amount */}
                      {wallet.unbilledAmount !== undefined && wallet.unbilledAmount > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Calendar size={12} />
                            Unbilled (Current)
                          </span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400">
                            {formatCurrency(wallet.roundedStatementBalance ?? wallet.currentStatementBalance, currency)}
                          </span>
                        </div>
                      )}

                      {/* Show Next Billing Date */}
                      {wallet.nextBillingDate && (
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Next Billing</span>
                          <span>
                            {wallet.nextBillingDate ? (wallet.nextBillingDate instanceof Date ? wallet.nextBillingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date(wallet.nextBillingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : 'N/A'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* View Billing History Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWalletForHistory(wallet);
                        setBillingHistoryOpen(true);
                      }}
                      className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <FileText size={16} />
                      View Billing History
                    </button>
                  </div>
                )}

                {/* Unpaid Bill Section - Show ONLY when there's an unpaid bill */}
                {wallet.hasUnpaidBill && wallet.unpaidBillAmount > 0 && (
                  <div className="pt-2 border-t-2 border-red-300 dark:border-red-700 mt-2">
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-red-700 dark:text-red-300 font-semibold flex items-center gap-1">
                          <AlertCircle size={14} />
                          Unpaid Billed Amount
                        </span>
                        <span className="text-red-600 dark:text-red-400 font-bold">
                          {formatCurrency(wallet.unpaidBillAmount, currency)}
                        </span>
                      </div>

                      {wallet.unbilledAmount > 0 && (
                        <div className="flex items-center justify-between text-xs mb-2 text-slate-600 dark:text-slate-400">
                          <span>+ Unbilled (new spending)</span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400">
                            {formatCurrency(wallet.unbilledAmount, currency)}
                          </span>
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWalletForPayment(wallet);
                          setPaymentModalOpen(true);
                        }}
                        className="w-full mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-md"
                      >
                        <DollarSign size={16} />
                        Record Payment ({formatCurrency(wallet.unpaidBillAmount, currency)} due)
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {selectedWallet === wallet.id && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <span className="text-sm font-medium">Currently Selected</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedWalletForPayment(null);
          setInitialPaymentData(null);
        }}
        wallet={selectedWalletForPayment}
        currency={currency}
        onPayment={handlePayment}
        initialData={initialPaymentData}
      />
      <BillingHistoryModal
        isOpen={billingHistoryOpen}
        onClose={() => {
          setBillingHistoryOpen(false);
          setSelectedWalletForHistory(null);
        }}
        wallet={selectedWalletForHistory}
        transactions={transactions}
        currency={currency}
        onPay={handleHistoryPayment}
        onEdit={handleEditPaymentFromHistory}
        onDelete={handleDeletePaymentFromHistory}
        onEditInitialDebt={handleEditInitialDebt}
      />
    </div>
  );
}
