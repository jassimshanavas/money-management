import React, { useState } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency } from '../utils/helpers';
import { Plus, X } from 'lucide-react';

export default function AddTransaction() {
  const { categories, currency, addTransaction, wallets, selectedWallet } = useApp();
  const [formData, setFormData] = useState({
    type: 'expense',
    category: categories[0].name,
    amount: '',
    description: '',
    walletId: selectedWallet,
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
      category: categories[0].name,
      amount: '',
      description: '',
      walletId: selectedWallet,
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const filteredCategories = categories;

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-2xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 text-slate-800 dark:text-white">Add Transaction</h1>
        <p className="text-slate-600 dark:text-slate-400">Record your income or expense</p>
      </div>

      {showSuccess && (
        <div className="glass-card p-4 mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 animate-scale-in">
          <p className="text-green-700 dark:text-green-300 font-medium">Transaction added successfully! ✓</p>
        </div>
      )}

      <div className="glass-card p-6 md:p-8 animate-slide-up">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'expense' })}
                className={`p-4 rounded-xl transition-all duration-300 ${
                  formData.type === 'expense'
                    ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg scale-105'
                    : 'bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80'
                }`}
              >
                <div className="text-2xl mb-2">📉</div>
                <div className="font-semibold">Expense</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'income' })}
                className={`p-4 rounded-xl transition-all duration-300 ${
                  formData.type === 'income'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105'
                    : 'bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80'
                }`}
              >
                <div className="text-2xl mb-2">📈</div>
                <div className="font-semibold">Income</div>
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
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">
              Category
            </label>
            <div className="grid grid-cols-4 md:grid-cols-4 gap-3">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.name })}
                  className={`p-3 rounded-xl transition-all duration-300 ${
                    formData.category === cat.name
                      ? 'ring-2 ring-teal-500 scale-105 shadow-lg'
                      : 'hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                  style={{
                    backgroundColor: formData.category === cat.name ? `${cat.color}20` : 'transparent',
                  }}
                >
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{cat.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              Amount ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input-field text-2xl font-bold"
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
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
            <Plus size={20} />
            <span>Add Transaction</span>
          </button>
        </form>
      </div>
    </div>
  );
}


