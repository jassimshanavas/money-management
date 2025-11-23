import React, { useState } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, getWalletSummary } from '../utils/helpers';
import { Plus, X } from 'lucide-react';

export default function AddTransaction() {
  const { categories, currency, addTransaction, wallets, selectedWallet, transactions } = useApp();
  // Get initial category based on type
  const getInitialCategory = (type) => {
    const typeCategories = categories.filter((cat) => (cat.type || 'expense') === type);
    return typeCategories.length > 0 ? typeCategories[0].name : '';
  };

  const [formData, setFormData] = useState({
    type: 'expense',
    category: getInitialCategory('expense'),
    amount: '',
    description: '',
    walletId: selectedWallet,
    date: new Date().toISOString().split('T')[0],
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return;
    }

    addTransaction({
      ...formData,
      amount: parseFloat(formData.amount),
      walletId: formData.walletId || selectedWallet,
    });

    setFormData({
      type: 'expense',
      category: getInitialCategory('expense'),
      amount: '',
      description: '',
      walletId: selectedWallet,
      date: new Date().toISOString().split('T')[0],
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Filter categories by transaction type
  const filteredCategories = categories.filter((cat) => (cat.type || 'expense') === formData.type);
  const activeWalletId = formData.walletId || selectedWallet;
  const activeWallet = wallets.find((wallet) => wallet.id === activeWalletId);
  const walletSummary = activeWallet ? getWalletSummary(activeWallet, transactions) : null;

  return (
    <div className="pt-20 md:pt-8 px-3 sm:px-4 md:px-8 max-w-2xl mx-auto pb-20 md:pb-8">
      <div className="mb-4 sm:mb-6 md:mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 text-slate-800 dark:text-white">Add Transaction</h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">Record your income or expense</p>
      </div>

      {showSuccess && (
        <div className="glass-card p-3 sm:p-4 mb-4 sm:mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 animate-scale-in">
          <p className="text-sm sm:text-base text-green-700 dark:text-green-300 text-center">Transaction added successfully!</p>
        </div>
      )}

      <div className="glass-card p-4 sm:p-5 md:p-6 lg:p-8 animate-slide-up">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Transaction Type */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-slate-700 dark:text-slate-300">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => {
                  const expenseCategories = categories.filter((cat) => (cat.type || 'expense') === 'expense');
                  const newCategory = expenseCategories.length > 0 ? expenseCategories[0].name : '';
                  setFormData({ ...formData, type: 'expense', category: newCategory });
                }}
                className={`p-3 sm:p-4 rounded-xl transition-all duration-300 ${
                  formData.type === 'expense'
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
                className={`p-3 sm:p-4 rounded-xl transition-all duration-300 ${
                  formData.type === 'income'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105'
                    : 'bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80'
                }`}
              >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">📈</div>
                <div className="font-semibold text-sm sm:text-base">Income</div>
              </button>
            </div>
          </div>

          {/* Wallet Selection - Always show */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              Wallet
            </label>
            <select
              value={formData.walletId || selectedWallet}
              onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
              className="input-field"
            >
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.icon} {wallet.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Each transaction belongs to a specific wallet
            </p>
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
                        <span className={`font-semibold ${
                          walletSummary.daysUntilDue !== null && walletSummary.daysUntilDue < 7
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
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-slate-700 dark:text-slate-300">
              Transaction Date
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, date: new Date().toISOString().split('T')[0] })}
                className={`p-2 sm:p-3 rounded-xl transition-all duration-300 text-sm sm:text-base font-medium ${
                  formData.date === new Date().toISOString().split('T')[0]
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                    : 'bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                }`}
              >
                Today
              </button>
              <div className={`rounded-xl transition-all duration-300 border ${
                formData.date !== new Date().toISOString().split('T')[0]
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

          {/* Category Selection */}
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
                  className={`p-2 sm:p-3 rounded-xl transition-all duration-300 ${
                    formData.category === cat.name
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

          {/* Amount */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              Amount ({currency})
            </label>
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
            <span className="hidden sm:inline">Add </span>Transaction
          </button>
        </form>
      </div>
    </div>
  );
}


