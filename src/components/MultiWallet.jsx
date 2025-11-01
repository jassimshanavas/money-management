import React, { useState } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, calculateTotals } from '../utils/helpers';
import { Wallet, Plus, Edit2, Trash2, CreditCard } from 'lucide-react';

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
  } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: walletColors[0].color,
    icon: walletIcons[0],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;

    addWallet({
      name: formData.name,
      color: formData.color,
      icon: formData.icon,
      balance: 0,
    });

    setFormData({ name: '', color: walletColors[0].color, icon: walletIcons[0] });
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

  // Calculate balances for each wallet
  const walletsWithBalance = wallets.map((wallet) => {
    const walletTransactions = transactions.filter((t) => t.walletId === wallet.id);
    const { income, expenses, balance } = calculateTotals(walletTransactions);
    return { ...wallet, income, expenses, calculatedBalance: balance };
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
            <div className="grid grid-cols-2 gap-4">
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
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        formData.color === wc.color ? 'border-slate-800 dark:border-white scale-110' : 'border-slate-300 dark:border-slate-600'
                      }`}
                      style={{ backgroundColor: wc.color }}
                    />
                  ))}
                </div>
              </div>
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
                      className={`w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-all ${
                        formData.icon === icon ? 'border-slate-800 dark:border-white scale-110' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
        {walletsWithBalance.map((wallet, index) => (
          <div
            key={wallet.id}
            className={`glass-card p-6 cursor-pointer transition-all duration-300 animate-slide-up ${
              selectedWallet === wallet.id
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
                <span className="text-sm text-slate-600 dark:text-slate-400">Balance</span>
                <span
                  className={`text-xl font-bold ${
                    wallet.calculatedBalance >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(wallet.calculatedBalance, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Income: <span className="text-green-600 dark:text-green-400 font-medium">
                    {formatCurrency(wallet.income, currency)}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Expenses: <span className="text-red-600 dark:text-red-400 font-medium">
                    {formatCurrency(wallet.expenses, currency)}
                  </span>
                </span>
              </div>
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
        ))}
      </div>
    </div>
  );
}


