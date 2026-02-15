import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency } from '../utils/helpers';
import { triggerConfetti } from '../utils/animations';
import { Target, Plus, Trophy, Calendar, TrendingUp, X } from 'lucide-react';

export default function SavingsGoals() {
  const { goals, currency, transactions, addGoal, updateGoal, deleteGoal, addNotification } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    category: 'Other',
  });

  // Calculate progress for each goal
  const goalsWithProgress = goals.map((goal) => {
    const saved = transactions
      .filter((t) => t.type === 'income' && new Date(t.date) >= new Date(goal.createdAt))
      .reduce((sum, t) => sum + t.amount, 0) -
      transactions
        .filter((t) => t.type === 'expense' && new Date(t.date) >= new Date(goal.createdAt))
        .reduce((sum, t) => sum + t.amount, 0);

    const progress = Math.min(100, (saved / goal.targetAmount) * 100);
    const remaining = Math.max(0, goal.targetAmount - saved);
    const daysRemaining = goal.targetDate
      ? Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;
    const achieved = saved >= goal.targetAmount;

    return { ...goal, saved, progress, remaining, daysRemaining, achieved };
  });

  // Check for newly achieved goals
  useEffect(() => {
    goalsWithProgress.forEach((goal) => {
      if (goal.achieved && !goal.notified) {
        triggerConfetti();
        updateGoal(goal.id, { notified: true });
        addNotification({
          type: 'success',
          title: 'Goal Achieved! 🎉',
          message: `Congratulations! You've reached your goal: ${goal.name}`,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalsWithProgress]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.targetAmount || !formData.targetDate) return;

    addGoal({
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount),
      targetDate: formData.targetDate,
      category: formData.category,
    });

    setFormData({ name: '', targetAmount: '', targetDate: '', category: 'Other' });
    setShowAddForm(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      deleteGoal(id);
    }
  };

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg">
              <Target className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Savings Goals</h1>
              <p className="text-slate-600 dark:text-slate-400">Set and track your financial milestones</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <div className="glass-card p-6 mb-6 animate-scale-in border-2 border-teal-200 dark:border-teal-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Goal Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="e.g., Vacation to Europe"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Target Amount ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  className="input-field"
                  placeholder="50000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Target Date
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  className="input-field"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button type="submit" className="btn-primary">
                Create Goal
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

      {/* Goals List */}
      {goalsWithProgress.length === 0 ? (
        <div className="glass-card p-12 text-center animate-fade-in">
          <Target className="mx-auto mb-4 text-slate-400" size={48} />
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No goals yet</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            Create your first savings goal to start tracking progress!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {goalsWithProgress.map((goal, index) => (
            <div
              key={goal.id}
              className={`glass-card p-6 animate-slide-up ${goal.achieved
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                  : ''
                }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {goal.achieved && <Trophy className="text-yellow-500" size={20} />}
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{goal.name}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    {goal.targetDate && (
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span>
                          {goal.daysRemaining !== null
                            ? goal.daysRemaining > 0
                              ? `${goal.daysRemaining} days left`
                              : 'Overdue'
                            : 'No deadline'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Progress</span>
                  <span className="text-lg font-bold text-slate-800 dark:text-white">
                    {goal.progress.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${goal.achieved
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-teal-500 to-cyan-500'
                      }`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Saved</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(goal.saved, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {goal.remaining > 0 ? 'Remaining' : 'Achieved!'}
                  </p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">
                    {goal.remaining > 0 ? formatCurrency(goal.remaining, currency) : '✓'}
                  </p>
                </div>
              </div>

              {goal.achieved && (
                <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center gap-2">
                  <Trophy className="text-green-600 dark:text-green-400" size={20} />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Goal Achieved! 🎉
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


