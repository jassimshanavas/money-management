import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, formatDate, getTransactionsForMonth, getCategoryTotals, getTagTotals, getAvailableMonths } from '../utils/helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Calendar, X, Tag, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { parseISO, format as formatDateFns, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, isToday, startOfDay } from 'date-fns';

export default function CategoryBreakdown() {
  const { transactions, currency, categories, deleteTransaction } = useApp();
  const [activeTab, setActiveTab] = useState('category'); // 'category' or 'tag'
  const [selectedCategoryForView, setSelectedCategoryForView] = useState(null); // Category name to view transactions
  const [selectedTagForView, setSelectedTagForView] = useState(null); // Tag name to view transactions
  const [transactionType, setTransactionType] = useState('expense'); // 'expense' or 'income'
  const [selectedDate, setSelectedDate] = useState(null); // Selected date to filter transactions
  const dateScrollRef = useRef(null);
  const currentDateRef = useRef(null);

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

  // Filter transactions by type
  const typeFilteredTransactions = useMemo(() => {
    return monthlyTransactions.filter(t => {
      if (transactionType === 'expense') {
        return t.type === 'expense' || (t.isTransfer && t.transferType === 'interest');
      } else {
        return t.type === 'income' && !t.isTransfer;
      }
    });
  }, [monthlyTransactions, transactionType]);

  const categoryTotals = getCategoryTotals(typeFilteredTransactions);
  const tagTotals = getTagTotals(typeFilteredTransactions);

  // Generate colors for tags (since tags don't have predefined colors)
  const tagColors = [
    '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#10b981',
    '#06b6d4', '#6b7280', '#f97316', '#84cc16', '#eab308', '#6366f1'
  ];

  const categoryChartData = Object.entries(categoryTotals).map(([category, amount]) => {
    const catInfo = categories.find((c) => c.name === category);
    return {
      name: category,
      value: amount,
      color: catInfo?.color || '#6b7280',
      icon: catInfo?.icon || '📦',
    };
  });

  const tagChartData = Object.entries(tagTotals).map(([tag, amount], index) => {
    return {
      name: tag,
      value: amount,
      color: tagColors[index % tagColors.length],
      icon: '🏷️',
    };
  });

  const chartData = activeTab === 'category' ? categoryChartData : tagChartData;
  const totals = activeTab === 'category' ? categoryTotals : tagTotals;
  const totalAmount = Object.values(totals).reduce((sum, amount) => sum + amount, 0);

  const COLORS = chartData.map((item) => item.color);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalAmount) * 100).toFixed(1);
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

  // Get all dates in selected months
  const availableDates = useMemo(() => {
    if (selectedMonths.length === 0) return [];

    const dates = [];
    const currentDate = new Date();
    const currentDateStr = formatDateFns(currentDate, 'yyyy-MM-dd');

    // Sort months so current month comes first
    const sortedMonths = [...selectedMonths].sort((a, b) => {
      const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      if (a === currentMonthKey) return -1;
      if (b === currentMonthKey) return 1;
      return b.localeCompare(a); // Other months in descending order
    });

    sortedMonths.forEach(monthKey => {
      const [year, month] = monthKey.split('-').map(Number);
      const monthStart = startOfMonth(new Date(year, month, 1));
      const monthEnd = endOfMonth(new Date(year, month, 1));
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      daysInMonth.forEach(day => {
        dates.push({
          date: day,
          dateString: formatDateFns(day, 'yyyy-MM-dd'),
          label: formatDateFns(day, 'MMM dd'),
          dayLabel: formatDateFns(day, 'EEE'),
          dayNumber: formatDateFns(day, 'd'),
          isToday: formatDateFns(day, 'yyyy-MM-dd') === currentDateStr,
          isCurrentMonth: monthKey === `${currentDate.getFullYear()}-${currentDate.getMonth()}`,
        });
      });
    });

    // Sort by date, ascending order (oldest to newest)
    return dates.sort((a, b) => a.date - b.date);
  }, [selectedMonths]);

  // Calculate daily expenses for the selected category/tag
  const dailyExpensesData = useMemo(() => {
    if (!selectedCategoryForView && !selectedTagForView) return [];

    const dailyTotals = {};

    monthlyTransactions.forEach(transaction => {
      const isTransfer = transaction.isTransfer || transaction.type === 'transfer';
      const displayCategory = isTransfer ? (transaction.transferType === 'interest' ? 'Interest' : 'Transfer') : transaction.category;

      const matchesCategory = !selectedCategoryForView || displayCategory === selectedCategoryForView;
      const matchesTag = !selectedTagForView || transaction.tag === selectedTagForView;

      const isCorrectType = transactionType === 'expense'
        ? (transaction.type === 'expense' || (isTransfer && transaction.transferType === 'interest'))
        : (transaction.type === 'income' && !transaction.isTransfer);

      if (matchesCategory && matchesTag && isCorrectType) {
        const dateStr = formatDateFns(parseISO(transaction.date), 'yyyy-MM-dd');
        if (!dailyTotals[dateStr]) {
          dailyTotals[dateStr] = 0;
        }
        dailyTotals[dateStr] += transaction.amount;
      }
    });

    // Create chart data sorted by date
    return availableDates
      .map(dateInfo => ({
        date: dateInfo.dateString,
        label: dateInfo.label,
        dayLabel: dateInfo.dayLabel,
        dayNumber: dateInfo.dayNumber,
        amount: dailyTotals[dateInfo.dateString] || 0,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [monthlyTransactions, selectedCategoryForView, selectedTagForView, availableDates]);

  // Get transactions for selected category/tag and date
  const filteredTransactionsForView = useMemo(() => {
    if (!selectedCategoryForView && !selectedTagForView) return [];

    let filtered = monthlyTransactions;

    if (selectedCategoryForView) {
      filtered = filtered.filter(t => {
        const isTransfer = t.isTransfer || t.type === 'transfer';
        const displayCategory = isTransfer ? (t.transferType === 'interest' ? 'Interest' : 'Transfer') : t.category;

        const isCorrectType = transactionType === 'expense'
          ? (t.type === 'expense' || (isTransfer && t.transferType === 'interest'))
          : (t.type === 'income' && !t.isTransfer);

        return displayCategory === selectedCategoryForView && isCorrectType;
      });
    }

    if (selectedTagForView) {
      filtered = filtered.filter(t => {
        const isTransfer = t.isTransfer || t.type === 'transfer';
        const isCorrectType = transactionType === 'expense'
          ? (t.type === 'expense' || (isTransfer && t.transferType === 'interest'))
          : (t.type === 'income' && !t.isTransfer);
        return t.tag === selectedTagForView && isCorrectType;
      });
    }

    // Filter by selected date if one is selected
    if (selectedDate) {
      filtered = filtered.filter(t => {
        const transDate = parseISO(t.date);
        return isSameDay(transDate, parseISO(selectedDate));
      });
    }

    // Sort by date, newest first
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [monthlyTransactions, selectedCategoryForView, selectedTagForView, selectedDate]);

  const handleDeleteTransaction = (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(id);
    }
  };

  const handleViewTransactions = (itemName, isCategory) => {
    if (isCategory) {
      setSelectedCategoryForView(itemName);
      setSelectedTagForView(null);
    } else {
      setSelectedTagForView(itemName);
      setSelectedCategoryForView(null);
    }
    setSelectedDate(null); // Reset date selection when opening modal

    // Scroll to current date after a short delay to allow DOM to update
    setTimeout(() => {
      if (currentDateRef.current && dateScrollRef.current) {
        currentDateRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }, 100);
  };

  const handleCloseView = () => {
    setSelectedCategoryForView(null);
    setSelectedTagForView(null);
    setSelectedDate(null);
  };

  const handleDateSelect = (dateString) => {
    setSelectedDate(selectedDate === dateString ? null : dateString);
  };

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-slate-800 dark:text-white">Category Breakdown</h1>
            <p className="text-slate-600 dark:text-slate-400">Analyze your {transactionType === 'expense' ? 'spending' : 'income'} by category or tag</p>
          </div>
        </div>

        {/* Toggle Toggles */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Expense/Income Toggle */}
          <div className="glass-card p-2 animate-slide-up inline-block">
            <div className="flex gap-2">
              <button
                onClick={() => setTransactionType('expense')}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${transactionType === 'expense'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                <TrendingDown size={18} />
                Expense
              </button>
              <button
                onClick={() => setTransactionType('income')}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${transactionType === 'income'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                <TrendingUp size={18} />
                Income
              </button>
            </div>
          </div>

          {/* Category/Tag Toggle */}
          <div className="glass-card p-2 animate-slide-up inline-block">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('category')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'category'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                Category
              </button>
              <button
                onClick={() => setActiveTab('tag')}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === 'tag'
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                <Tag size={18} />
                Tag
              </button>
            </div>
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${isSelected
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
            Showing {transactionType === 'expense' ? 'expenses' : 'income'} for{' '}
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
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            {activeTab === 'tag'
              ? `No tagged ${transactionType} data available for the selected month` + (selectedMonths.length > 1 ? 's' : '') + '.'
              : `No ${transactionType} data available for the selected month` + (selectedMonths.length > 1 ? 's' : '') + '.'}
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
            {activeTab === 'tag'
              ? `Add tags to your ${transactionType}s to see the tag breakdown!`
              : `Add some ${transactionType}s to see the breakdown!`}
          </p>
        </div>
      ) : (
        <>
          {/* Pie Chart */}
          <div className="glass-card p-6 md:p-8 mb-6 animate-slide-up">
            <h3 className="text-xl font-semibold mb-6 text-slate-800 dark:text-white text-center">
              {transactionType === 'expense' ? 'Expense' : 'Income'} Distribution by {activeTab === 'category' ? 'Category' : 'Tag'}{selectedMonths.length === 1 ? ` - ${selectedMonthLabels[0]}` : ` (${selectedMonths.length} months)`}
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
                const percentage = ((item.value / totalAmount) * 100).toFixed(1);
                return (
                  <div
                    key={item.name}
                    onClick={() => handleViewTransactions(item.name, activeTab === 'category')}
                    className="glass-card p-5 hover:shadow-xl transition-all duration-300 animate-slide-up cursor-pointer hover:scale-105"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        {activeTab === 'category' ? item.icon : '🏷️'}
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
                  Total {transactionType === 'expense' ? 'Expenses' : 'Income'}{selectedMonths.length === 1 ? ` - ${selectedMonthLabels[0]}` : ` (${selectedMonths.length} months)`}
                </p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">
                  {formatCurrency(totalAmount, currency)}
                </h3>
                {selectedMonths.length > 1 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Average per month: {formatCurrency(totalAmount / selectedMonths.length, currency)}
                  </p>
                )}
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
        </>
      )}

      {/* Transactions Modal */}
      {(selectedCategoryForView || selectedTagForView) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in border-2 border-teal-200 dark:border-teal-800">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedCategoryForView && (() => {
                  const catInfo = categories.find((c) => c.name === selectedCategoryForView);
                  return (
                    <>
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${catInfo?.color || '#6b7280'}20` }}
                      >
                        {catInfo?.icon || '📦'}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                          {selectedCategoryForView}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Transactions for {selectedMonths.length === 1 ? selectedMonthLabels[0] : `${selectedMonths.length} months`}
                        </p>
                      </div>
                    </>
                  );
                })()}
                {selectedTagForView && (
                  <>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-teal-100 dark:bg-teal-900/30">
                      🏷️
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {selectedTagForView}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Transactions for {selectedMonths.length === 1 ? selectedMonthLabels[0] : `${selectedMonths.length} months`}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={handleCloseView}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Daily Expense Graph - Show when no date is selected */}
            {!selectedDate && dailyExpensesData.length > 0 && (
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-teal-50/30 dark:from-slate-800 dark:to-teal-900/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <Calendar className="text-teal-500" size={20} />
                    Daily {transactionType === 'expense' ? 'Expenses' : 'Income'} Overview
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Click on a point to view that day</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={dailyExpensesData}
                    onClick={(e) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        const clickedDate = e.activePayload[0].payload.date;
                        handleDateSelect(clickedDate);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                    <XAxis
                      dataKey="dayNumber"
                      stroke="#64748b"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                      tickFormatter={(value) => {
                        if (value === 0) return '0';
                        const formatted = formatCurrency(value, currency);
                        return formatted.length > 8 ? formatted.replace(/[^\d.]/g, '') : formatted;
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '2px solid rgba(20, 184, 166, 0.3)',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        padding: '12px',
                      }}
                      formatter={(value) => [
                        formatCurrency(value, currency),
                        transactionType === 'expense' ? 'Expense' : 'Income'
                      ]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.label;
                        }
                        return label;
                      }}
                      cursor={{ stroke: '#14b8a6', strokeWidth: 2, strokeDasharray: '5 5' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke={selectedCategoryForView
                        ? categories.find(c => c.name === selectedCategoryForView)?.color || '#14b8a6'
                        : '#14b8a6'
                      }
                      strokeWidth={3}
                      dot={{
                        fill: selectedCategoryForView
                          ? categories.find(c => c.name === selectedCategoryForView)?.color || '#14b8a6'
                          : '#14b8a6',
                        r: 5,
                        strokeWidth: 2,
                        stroke: '#fff',
                        style: { cursor: 'pointer' }
                      }}
                      activeDot={{
                        r: 8,
                        fill: selectedCategoryForView
                          ? categories.find(c => c.name === selectedCategoryForView)?.color || '#14b8a6'
                          : '#14b8a6',
                        stroke: '#fff',
                        strokeWidth: 2,
                        style: { cursor: 'pointer' }
                      }}
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Date Selector - Horizontal Scroll */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="text-slate-500 dark:text-slate-400" size={18} />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {selectedDate ? 'Selected Date' : `Select a Date to View ${transactionType === 'expense' ? 'Expenses' : 'Income'}`}
                </h3>
              </div>
              <div
                ref={dateScrollRef}
                className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent"
              >
                <div className="flex gap-3 min-w-max">
                  {availableDates.map((dateInfo) => {
                    const dailyTotal = dailyExpensesData.find(d => d.date === dateInfo.dateString)?.amount || 0;
                    const isSelected = selectedDate === dateInfo.dateString;
                    const hasExpenses = dailyTotal > 0;

                    return (
                      <button
                        key={dateInfo.dateString}
                        ref={dateInfo.isToday ? currentDateRef : null}
                        onClick={() => handleDateSelect(dateInfo.dateString)}
                        className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all min-w-[80px] ${isSelected
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 shadow-md scale-105'
                          : dateInfo.isToday
                            ? 'border-teal-400 dark:border-teal-600 bg-teal-50/50 dark:bg-teal-900/10 shadow-sm ring-2 ring-teal-200 dark:ring-teal-800'
                            : hasExpenses
                              ? 'border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 bg-white dark:bg-slate-700/50 hover:shadow-md'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700/30 opacity-60'
                          }`}
                      >
                        <span className={`text-xs font-medium ${isSelected
                          ? 'text-teal-700 dark:text-teal-300'
                          : dateInfo.isToday
                            ? 'text-teal-600 dark:text-teal-400 font-semibold'
                            : 'text-slate-500 dark:text-slate-400'
                          }`}>
                          {dateInfo.dayLabel}
                        </span>
                        <span className={`text-lg font-bold ${isSelected
                          ? 'text-teal-800 dark:text-teal-200'
                          : dateInfo.isToday
                            ? 'text-teal-700 dark:text-teal-300'
                            : 'text-slate-700 dark:text-slate-300'
                          }`}>
                          {dateInfo.dayNumber}
                        </span>
                        <span className={`text-xs font-semibold ${isSelected
                          ? 'text-teal-600 dark:text-teal-400'
                          : hasExpenses
                            ? (transactionType === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')
                            : 'text-slate-400 dark:text-slate-500'
                          }`}>
                          {formatCurrency(dailyTotal, currency)}
                        </span>
                        {dateInfo.isToday && !isSelected && (
                          <span className="text-[8px] uppercase font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                            Today
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredTransactionsForView.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">
                    {selectedDate
                      ? `No transactions found for ${formatDate(selectedDate)}.`
                      : `No transactions found for this ${selectedCategoryForView ? 'category' : 'tag'}.`
                    }
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm">
                    {selectedDate
                      ? 'Try selecting a different date or clear the date filter.'
                      : 'Try selecting different months or add more transactions.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTransactionsForView.map((transaction) => {
                    const isTransfer = transaction.isTransfer || transaction.type === 'transfer';
                    const displayCategory = isTransfer ? (transaction.transferType === 'interest' ? 'Interest' : 'Transfer') : transaction.category;
                    const category = categories.find((c) => c.name === displayCategory) || categories.find(c => c.name === 'Transfer') || categories[0];
                    return (
                      <div
                        key={transaction.id}
                        className="glass-card p-5 animate-slide-up hover:shadow-xl transition-all duration-300 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div
                              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                              style={{ backgroundColor: `${category?.color || '#6b7280'}20` }}
                            >
                              {category?.icon || '📦'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg text-slate-800 dark:text-white truncate">
                                {transaction.description || displayCategory}
                              </h3>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-sm text-slate-500 dark:text-slate-400">{displayCategory}</span>
                                {transaction.tag && (
                                  <>
                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium">
                                      🏷️ {transaction.tag}
                                    </span>
                                  </>
                                )}
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                  {formatDate(transaction.date)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div
                              className={`text-xl font-bold ${(transaction.type === 'income' || transaction.type === 'transfer' || transaction.transferType === 'destination_credit') ? 'text-green-500' : 'text-red-500'
                                }`}
                            >
                              {(transaction.type === 'income' || transaction.type === 'transfer' || transaction.transferType === 'destination_credit') ? '+' : '-'}
                              {formatCurrency(transaction.amount, currency)}
                            </div>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all duration-300 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-white">
                  {filteredTransactionsForView.length}
                </span>{' '}
                {filteredTransactionsForView.length === 1 ? 'transaction' : 'transactions'} found
              </div>
              <button
                onClick={handleCloseView}
                className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


