import React, { useState, useMemo } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, getTransactionsForMonth, getCategoryTotals, getAvailableMonths } from '../utils/helpers';
import { Target, Edit2, Check, X, ChevronDown, Calendar } from 'lucide-react';

export default function BudgetTracker() {
  const { budgets, currency, categories, setBudget, transactions } = useApp();
  
  // Get available months and set default to current month
  const availableMonths = useMemo(() => getAvailableMonths(transactions), [transactions]);
  const currentDate = new Date();
  const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
  
  // Initialize state with default month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const defaultMonth = availableMonths.find(m => m.value === currentMonthKey) || availableMonths[0];
    return defaultMonth?.value || currentMonthKey;
  });
  
  // Update selected month if current month becomes available
  React.useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.find(m => m.value === selectedMonth)) {
      const defaultMonth = availableMonths.find(m => m.value === currentMonthKey) || availableMonths[0];
      if (defaultMonth) {
        setSelectedMonth(defaultMonth.value);
      }
    }
  }, [availableMonths, currentMonthKey, selectedMonth]);
  
  // Parse selected month
  const [selectedYear, selectedMonthIndex] = selectedMonth ? selectedMonth.split('-').map(Number) : [currentDate.getFullYear(), currentDate.getMonth()];
  
  // Get transactions for selected month
  const monthlyTransactions = useMemo(() => {
    if (!selectedMonth) return [];
    return getTransactionsForMonth(transactions, selectedYear, selectedMonthIndex);
  }, [transactions, selectedYear, selectedMonthIndex]);
  
  const categoryTotals = getCategoryTotals(monthlyTransactions);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleEdit = (category, currentAmount) => {
    setEditingCategory(category);
    setEditValue(currentAmount.toString());
  };

  const handleSave = (category) => {
    const amount = parseFloat(editValue);
    if (!isNaN(amount) && amount >= 0) {
      setBudget(category, amount);
      setEditingCategory(null);
      setEditValue('');
    }
  };

  const handleCancel = () => {
    setEditingCategory(null);
    setEditValue('');
  };

  const budgetData = categories.map((cat) => {
    const budget = budgets[cat.name] || 0;
    const spent = categoryTotals[cat.name] || 0;
    const remaining = budget - spent;
    const percentage = budget > 0 ? (spent / budget) * 100 : 0;
    const status = percentage >= 100 ? 'over' : percentage >= 80 ? 'warning' : 'good';

    return {
      ...cat,
      budget,
      spent,
      remaining,
      percentage: Math.min(percentage, 100),
      status,
    };
  });

  const totalBudget = Object.values(budgets).reduce((sum, amount) => sum + amount, 0);
  const totalSpent = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const selectedMonthLabel = availableMonths.find(m => m.value === selectedMonth)?.label || 'Select Month';

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-slate-800 dark:text-white">Budget Tracker</h1>
            <p className="text-slate-600 dark:text-slate-400">Monitor your spending against your budgets</p>
          </div>
          
          {/* Month Selector */}
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-3">
              <Calendar className="text-slate-500 dark:text-slate-400" size={20} />
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 pr-10 text-slate-800 dark:text-white font-medium cursor-pointer hover:border-teal-500 dark:hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                >
                  {availableMonths.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" 
                  size={18} 
                />
              </div>
            </div>
          )}
        </div>
        
        {selectedMonth && (
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            Showing budget analysis for <span className="font-semibold text-slate-800 dark:text-white">{selectedMonthLabel}</span>
          </div>
        )}
      </div>

      {/* Overall Budget Summary */}
      <div className="glass-card p-6 mb-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Target className="text-white" size={24} />
            </div>
            <div>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Total Budget - {selectedMonthLabel}</p>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {formatCurrency(totalBudget, currency)}
              </h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-600 dark:text-slate-400 text-sm">Spent</p>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              {formatCurrency(totalSpent, currency)}
            </h2>
            <p
              className={`text-sm font-medium ${
                totalRemaining >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {totalRemaining >= 0 ? 'Remaining' : 'Over Budget'}: {formatCurrency(Math.abs(totalRemaining), currency)}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Overall Progress</span>
            <span className="text-sm font-bold text-slate-800 dark:text-white">
              {overallPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                overallPercentage >= 100
                  ? 'bg-gradient-to-r from-red-500 to-rose-500'
                  : overallPercentage >= 80
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-500'
              }`}
              style={{ width: `${Math.min(overallPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Budgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
        {budgetData.map((item, index) => (
          <div
            key={item.name}
            className="glass-card p-6 hover:shadow-xl transition-all duration-300 animate-slide-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-800 dark:text-white">{item.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(item.spent, currency)} of {formatCurrency(item.budget, currency)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleEdit(item.name, item.budget)}
                className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-400 hover:text-teal-500 transition-all duration-300"
              >
                <Edit2 size={18} />
              </button>
            </div>

            {editingCategory === item.name ? (
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Enter budget amount"
                  autoFocus
                />
                <button
                  onClick={() => handleSave(item.name)}
                  className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-all duration-300"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all duration-300"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {item.remaining >= 0 ? 'Remaining' : 'Over Budget'}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      item.status === 'over'
                        ? 'text-red-500'
                        : item.status === 'warning'
                        ? 'text-yellow-500'
                        : 'text-green-500'
                    }`}
                  >
                    {item.remaining >= 0 ? '+' : ''}
                    {formatCurrency(item.remaining, currency)} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      item.status === 'over'
                        ? 'bg-gradient-to-r from-red-500 to-rose-500'
                        : item.status === 'warning'
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        : 'bg-gradient-to-r from-teal-500 to-cyan-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 mb-1">Budget</p>
                  <p className="font-semibold text-slate-800 dark:text-white">
                    {formatCurrency(item.budget, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 mb-1">Spent</p>
                  <p className="font-semibold text-slate-800 dark:text-white">
                    {formatCurrency(item.spent, currency)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


