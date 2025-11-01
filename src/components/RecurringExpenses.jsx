import React, { useState, useEffect } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { detectRecurringTransactions } from '../utils/intelligence';
import { Repeat, Plus, Calendar, Bell, X, Edit2 } from 'lucide-react';

export default function RecurringExpenses() {
  const {
    transactions,
    recurringTransactions,
    currency,
    categories,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    addNotification,
  } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    category: categories[0].name,
    amount: '',
    frequency: 'monthly',
    nextDue: '',
    reminder: true,
  });

  // Auto-detect recurring transactions
  const detectedRecurring = detectRecurringTransactions(transactions);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    addRecurringTransaction({
      ...formData,
      amount: parseFloat(formData.amount),
      nextDue: formData.nextDue || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    setFormData({
      description: '',
      category: categories[0].name,
      amount: '',
      frequency: 'monthly',
      nextDue: '',
      reminder: true,
    });
    setShowAddForm(false);
  };

  // Check for upcoming due dates
  useEffect(() => {
    const today = new Date();
    recurringTransactions.forEach((recurring) => {
      const dueDate = new Date(recurring.nextDue);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntilDue <= 3 && daysUntilDue >= 0 && recurring.reminder) {
        addNotification({
          type: 'info',
          title: 'Upcoming Recurring Expense',
          message: `${recurring.description} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
        });
      }
    });
  }, [recurringTransactions]);

  const allRecurring = [...recurringTransactions, ...detectedRecurring.map((d) => ({
    id: `detected-${d.description}`,
    description: d.description,
    category: d.category,
    amount: d.amount,
    frequency: d.frequency,
    nextDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    reminder: false,
    detected: true,
  }))];

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
              <Repeat className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Recurring Expenses</h1>
              <p className="text-slate-600 dark:text-slate-400">Track subscriptions and recurring bills</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            <span>Add Recurring</span>
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="glass-card p-6 mb-6 animate-scale-in border-2 border-blue-200 dark:border-blue-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Description (e.g., Netflix, Spotify)
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                placeholder="Netflix Subscription"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-field"
                >
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
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
                  className="input-field"
                  placeholder="15.99"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="input-field"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Next Due Date
                </label>
                <input
                  type="date"
                  value={formData.nextDue}
                  onChange={(e) => setFormData({ ...formData, nextDue: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.reminder}
                onChange={(e) => setFormData({ ...formData, reminder: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
              />
              <label className="text-sm text-slate-700 dark:text-slate-300">
                Enable reminders before due date
              </label>
            </div>
            <div className="flex items-center gap-4">
              <button type="submit" className="btn-primary">
                Add Recurring Expense
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

      {/* Detected Recurring */}
      {detectedRecurring.length > 0 && (
        <div className="mb-6 animate-fade-in">
          <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-white flex items-center gap-2">
            <Bell className="text-blue-500" size={20} />
            Auto-Detected Recurring Expenses
          </h3>
          <div className="glass-card p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              We found {detectedRecurring.length} potential recurring expense{detectedRecurring.length !== 1 ? 's' : ''} based on your transaction history.
            </p>
          </div>
        </div>
      )}

      {/* Recurring Expenses List */}
      {allRecurring.length === 0 ? (
        <div className="glass-card p-12 text-center animate-fade-in">
          <Repeat className="mx-auto mb-4 text-slate-400" size={48} />
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No recurring expenses yet</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            Add subscriptions or bills to track them automatically!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {allRecurring.map((recurring, index) => {
            const category = categories.find((c) => c.name === recurring.category);
            const daysUntilDue = Math.ceil(
              (new Date(recurring.nextDue) - new Date()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={recurring.id}
                className="glass-card p-6 animate-slide-up hover:shadow-xl transition-all duration-300"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${category?.color}20` }}
                    >
                      {category?.icon || '📦'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-slate-800 dark:text-white">
                        {recurring.description}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{recurring.category}</p>
                    </div>
                  </div>
                  {!recurring.detected && (
                    <button
                      onClick={() => deleteRecurringTransaction(recurring.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Amount</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-white">
                      {formatCurrency(recurring.amount, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Frequency</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                      {recurring.frequency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Calendar size={14} />
                      Next Due
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        daysUntilDue <= 3
                          ? 'text-red-500'
                          : daysUntilDue <= 7
                          ? 'text-yellow-500'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {formatDate(recurring.nextDue)} ({daysUntilDue > 0 ? `${daysUntilDue}d` : 'Due'})
                    </span>
                  </div>
                  {recurring.reminder && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <Bell className="text-blue-500" size={16} />
                      <span className="text-xs text-slate-600 dark:text-slate-400">Reminders enabled</span>
                    </div>
                  )}
                  {recurring.detected && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                        Auto-detected
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


