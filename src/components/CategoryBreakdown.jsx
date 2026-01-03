import React, { useState, useMemo } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, getTransactionsForMonth, getCategoryTotals, getAvailableMonths } from '../utils/helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Calendar, X } from 'lucide-react';

export default function CategoryBreakdown() {
  const { transactions, currency, categories } = useApp();
  
  // Get available months and set default to current month
  const availableMonths = useMemo(() => getAvailableMonths(transactions), [transactions]);
  const currentDate = new Date();
  const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
  
  // Initialize state with default month (as array for multi-select)
  const [selectedMonths, setSelectedMonths] = useState(() => {
    const defaultMonth = availableMonths.find(m => m.value === currentMonthKey) || availableMonths[0];
    return defaultMonth ? [defaultMonth.value] : [];
  });
  
  // Update selected months if current month becomes available
  React.useEffect(() => {
    if (availableMonths.length > 0 && selectedMonths.length === 0) {
      const defaultMonth = availableMonths.find(m => m.value === currentMonthKey) || availableMonths[0];
      if (defaultMonth) {
        setSelectedMonths([defaultMonth.value]);
      }
    }
    // Remove any selected months that are no longer available
    const validMonths = selectedMonths.filter(month => availableMonths.find(m => m.value === month));
    if (validMonths.length !== selectedMonths.length) {
      setSelectedMonths(validMonths.length > 0 ? validMonths : [availableMonths[0]?.value].filter(Boolean));
    }
  }, [availableMonths, currentMonthKey, selectedMonths]);
  
  // Toggle month selection
  const toggleMonth = (monthValue) => {
    setSelectedMonths(prev => {
      if (prev.includes(monthValue)) {
        // Don't allow deselecting all months - keep at least one
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== monthValue);
      } else {
        return [...prev, monthValue];
      }
    });
  };
  
  // Get transactions for all selected months
  const monthlyTransactions = useMemo(() => {
    if (selectedMonths.length === 0) return [];
    
    return selectedMonths.flatMap(monthKey => {
      const [year, month] = monthKey.split('-').map(Number);
      return getTransactionsForMonth(transactions, year, month);
    });
  }, [transactions, selectedMonths]);
  
  const categoryTotals = getCategoryTotals(monthlyTransactions);

  const chartData = Object.entries(categoryTotals).map(([category, amount]) => {
    const catInfo = categories.find((c) => c.name === category);
    return {
      name: category,
      value: amount,
      color: catInfo?.color || '#6b7280',
      icon: catInfo?.icon || '📦',
    };
  });

  const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

  const COLORS = chartData.map((item) => item.color);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalExpenses) * 100).toFixed(1);
      return (
        <div className="glass-card p-3 border border-slate-200 dark:border-slate-700">
          <p className="font-semibold text-slate-800 dark:text-white">{data.name}</p>
          <p className="text-slate-600 dark:text-slate-400">
            {formatCurrency(data.value, currency)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const selectedMonthLabels = selectedMonths
    .map(monthKey => availableMonths.find(m => m.value === monthKey)?.label)
    .filter(Boolean);

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-slate-800 dark:text-white">Category Breakdown</h1>
            <p className="text-slate-600 dark:text-slate-400">Analyze your spending by category</p>
          </div>
        </div>
        
        {/* Month Selector - Multi-select with checkboxes */}
        {availableMonths.length > 0 && (
          <div className="glass-card p-4 mb-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="text-slate-500 dark:text-slate-400" size={20} />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select Months</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {availableMonths.map((month) => {
                const isSelected = selectedMonths.includes(month.value);
                return (
                  <label
                    key={month.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleMonth(month.value)}
                      className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 focus:ring-2 cursor-pointer"
                    />
                    <span className="text-sm font-medium">{month.label}</span>
                  </label>
                );
              })}
            </div>
            {selectedMonths.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Selected:</span>
                  {selectedMonthLabels.map((label, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full"
                    >
                      {label}
                      {selectedMonths.length > 1 && (
                        <button
                          onClick={() => toggleMonth(selectedMonths[idx])}
                          className="hover:bg-teal-200 dark:hover:bg-teal-800 rounded-full p-0.5 transition-colors"
                          title="Remove this month"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {selectedMonths.length > 0 && (
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            Showing expenses for{' '}
            <span className="font-semibold text-slate-800 dark:text-white">
              {selectedMonths.length === 1 
                ? selectedMonthLabels[0]
                : `${selectedMonths.length} months (${selectedMonthLabels.join(', ')})`}
            </span>
          </div>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="glass-card p-12 text-center animate-fade-in">
          <p className="text-slate-500 dark:text-slate-400 text-lg">No expense data available for the selected month{selectedMonths.length > 1 ? 's' : ''}.</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Add some expenses to see the breakdown!</p>
        </div>
      ) : (
        <>
          {/* Pie Chart */}
          <div className="glass-card p-6 md:p-8 mb-6 animate-slide-up">
            <h3 className="text-xl font-semibold mb-6 text-slate-800 dark:text-white text-center">
              Expense Distribution{selectedMonths.length === 1 ? ` - ${selectedMonthLabels[0]}` : ` (${selectedMonths.length} months)`}
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {chartData
              .sort((a, b) => b.value - a.value)
              .map((item, index) => {
                const percentage = ((item.value / totalExpenses) * 100).toFixed(1);
                return (
                  <div
                    key={item.name}
                    className="glass-card p-5 hover:shadow-xl transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 dark:text-white">{item.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{percentage}% of total</p>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="text-2xl font-bold text-slate-800 dark:text-white">
                        {formatCurrency(item.value, currency)}
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Total Summary */}
          <div className="glass-card p-6 mt-6 animate-fade-in bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-teal-200 dark:border-teal-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 mb-1">
                  Total Expenses{selectedMonths.length === 1 ? ` - ${selectedMonthLabels[0]}` : ` (${selectedMonths.length} months)`}
                </p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">
                  {formatCurrency(totalExpenses, currency)}
                </h3>
                {selectedMonths.length > 1 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Average per month: {formatCurrency(totalExpenses / selectedMonths.length, currency)}
                  </p>
                )}
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


