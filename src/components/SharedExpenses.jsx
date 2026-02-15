import React, { useState } from 'react';
import { format } from 'date-fns';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Users, Plus, Check, X, UserPlus } from 'lucide-react';

export default function SharedExpenses() {
  const { sharedExpenses, currency, categories, addSharedExpense, updateSharedExpense, deleteSharedExpense } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    totalAmount: '',
    category: categories[0].name,
    date: format(new Date(), 'yyyy-MM-dd'),
    participants: [{ name: 'You', amount: 0, paid: true }],
    newParticipant: '',
  });

  const handleAddParticipant = () => {
    if (!formData.newParticipant.trim()) return;
    setFormData({
      ...formData,
      participants: [
        ...formData.participants,
        { name: formData.newParticipant, amount: 0, paid: false },
      ],
      newParticipant: '',
    });
  };

  const handleSplit = () => {
    const total = parseFloat(formData.totalAmount);
    const perPerson = total / formData.participants.length;
    setFormData({
      ...formData,
      participants: formData.participants.map((p) => ({ ...p, amount: perPerson })),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description || !formData.totalAmount || formData.participants.length < 2) return;

    addSharedExpense({
      ...formData,
      totalAmount: parseFloat(formData.totalAmount),
      date: new Date(formData.date).toISOString(),
    });

    setFormData({
      description: '',
      totalAmount: '',
      category: categories[0].name,
      date: format(new Date(), 'yyyy-MM-dd'),
      participants: [{ name: 'You', amount: 0, paid: true }],
      newParticipant: '',
    });
    setShowAddForm(false);
  };

  const handleSettle = (expenseId, participantIndex) => {
    const expense = sharedExpenses.find((e) => e.id === expenseId);
    if (!expense) return;

    const updatedParticipants = [...expense.participants];
    updatedParticipants[participantIndex].paid = true;

    updateSharedExpense(expenseId, { participants: updatedParticipants });
  };

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Shared Expenses</h1>
              <p className="text-slate-600 dark:text-slate-400">Split bills with friends and family</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            <span>New Split</span>
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="glass-card p-6 mb-6 animate-scale-in border-2 border-purple-200 dark:border-purple-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  placeholder="Dinner at Restaurant"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Total Amount ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
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
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {/* Participants */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Participants
              </label>
              <div className="space-y-2 mb-2">
                {formData.participants.map((participant, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-white/50 dark:bg-slate-700/50 rounded-xl"
                  >
                    <span className="flex-1 font-medium text-slate-800 dark:text-white">
                      {participant.name}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={participant.amount}
                      onChange={(e) => {
                        const updated = [...formData.participants];
                        updated[index].amount = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, participants: updated });
                      }}
                      className="w-24 input-field text-right"
                      placeholder="0.00"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{currency}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={formData.newParticipant}
                  onChange={(e) => setFormData({ ...formData, newParticipant: e.target.value })}
                  className="input-field flex-1"
                  placeholder="Add participant name"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParticipant())}
                />
                <button
                  type="button"
                  onClick={handleAddParticipant}
                  className="btn-secondary flex items-center gap-2"
                >
                  <UserPlus size={18} />
                  <span>Add</span>
                </button>
                <button
                  type="button"
                  onClick={handleSplit}
                  className="btn-secondary"
                >
                  Split Evenly
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button type="submit" className="btn-primary">
                Create Shared Expense
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

      {/* Shared Expenses List */}
      {sharedExpenses.length === 0 ? (
        <div className="glass-card p-12 text-center animate-fade-in">
          <Users className="mx-auto mb-4 text-slate-400" size={48} />
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No shared expenses yet</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            Create a shared expense to split bills with others!
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {sharedExpenses.map((expense, index) => {
            const allPaid = expense.participants.every((p) => p.paid);
            const yourShare = expense.participants.find((p) => p.name === 'You')?.amount || 0;
            const category = categories.find((c) => c.name === expense.category);

            return (
              <div
                key={expense.id}
                className={`glass-card p-6 animate-slide-up ${allPaid ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''
                  }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${category?.color}20` }}
                    >
                      {category?.icon || '📦'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-slate-800 dark:text-white">
                        {expense.description}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(expense.date)} • {expense.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                      {formatCurrency(expense.totalAmount, currency)}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Your share: {formatCurrency(yourShare, currency)}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  {expense.participants.map((participant, pIndex) => (
                    <div
                      key={pIndex}
                      className="flex items-center justify-between p-3 bg-white/50 dark:bg-slate-700/50 rounded-xl"
                    >
                      <span className="font-medium text-slate-800 dark:text-white">
                        {participant.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-700 dark:text-slate-300">
                          {formatCurrency(participant.amount, currency)}
                        </span>
                        {participant.paid ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                            <Check size={16} />
                            Paid
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSettle(expense.id, pIndex)}
                            className="btn-secondary text-sm py-1 px-3"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {allPaid && (
                  <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center gap-2">
                    <Check className="text-green-600 dark:text-green-400" size={20} />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      All participants have paid
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


