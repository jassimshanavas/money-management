import React, { useState, useMemo } from 'react';
import { useApp } from '../hooks/useAppContext';
import {
  formatCurrency,
  formatDate,
  filterByDateRange,
  sortTransactions,
  calculateSummary,
  getDatePreset
} from '../utils/helpers';
import { Search, Filter, Trash2, X, Edit2, Calendar, TrendingUp, TrendingDown, ArrowUpDown, ChevronDown } from 'lucide-react';
import EditTransactionModal from './EditTransactionModal';
import TransactionCalendar from './TransactionCalendar';

export default function TransactionHistory() {
  const {
    transactions,
    currency,
    categories,
    wallets,
    searchQuery,
    filterCategory,
    filterWallet,
    dateRange,
    sortBy,
    sortOrder,
    setSearchQuery,
    setFilterCategory,
    setFilterWallet,
    setDateRange,
    setSortBy,
    setSortOrder,
    deleteTransaction,
  } = useApp();

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [activePreset, setActivePreset] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);

  // Apply all filters and sorting
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter((transaction) => {
      const matchesSearch =
        transaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.tag?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'All' || transaction.category === filterCategory;
      const matchesWallet = filterWallet === 'All' || transaction.walletId === filterWallet;
      return matchesSearch && matchesCategory && matchesWallet;
    });

    // Apply date range filter
    filtered = filterByDateRange(filtered, dateRange);

    // Apply sorting
    filtered = sortTransactions(filtered, sortBy, sortOrder);

    return filtered;
  }, [transactions, searchQuery, filterCategory, filterWallet, dateRange, sortBy, sortOrder]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    return calculateSummary(filteredAndSortedTransactions);
  }, [filteredAndSortedTransactions]);

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(id);
    }
  };

  const handlePresetClick = (preset) => {
    setActivePreset(preset);
    const range = getDatePreset(preset);
    setDateRange(range);
  };

  const handleCustomDateChange = (field, value) => {
    setActivePreset('custom');
    setDateRange(prev => ({
      ...prev,
      [field]: value ? new Date(value) : null
    }));
  };

  const clearDateFilter = () => {
    setActivePreset('all');
    setDateRange({ from: null, to: null });
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="pt-16 sm:pt-18 md:pt-8 px-3 sm:px-4 md:px-8 max-w-4xl mx-auto pb-8">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-slate-800 dark:text-white">Transaction History</h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">View and manage all your transactions</p>
      </div>

      {/* Summary Stats */}
      <div className="glass-card p-4 sm:p-6 mb-4 sm:mb-6 animate-slide-up">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 sm:mb-4">
          Summary {dateRange.from || dateRange.to ? `(${dateRange.from ? formatDate(dateRange.from.toISOString()) : 'Start'} - ${dateRange.to ? formatDate(dateRange.to.toISOString()) : 'Now'})` : '(All Time)'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-green-600 dark:text-green-400" size={16} />
              <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">Income</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(summary.income, currency)}
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="text-red-600 dark:text-red-400" size={16} />
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium">Expense</p>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-red-700 dark:text-red-300">
              {formatCurrency(summary.expense, currency)}
            </p>
          </div>

          <div className={`${summary.net >= 0 ? 'bg-teal-50 dark:bg-teal-900/20' : 'bg-orange-50 dark:bg-orange-900/20'} rounded-xl p-3 sm:p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpDown className={summary.net >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'} size={16} />
              <p className={`text-xs sm:text-sm ${summary.net >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'} font-medium`}>Net</p>
            </div>
            <p className={`text-lg sm:text-2xl font-bold ${summary.net >= 0 ? 'text-teal-700 dark:text-teal-300' : 'text-orange-700 dark:text-orange-300'}`}>
              {summary.net >= 0 ? '+' : ''}{formatCurrency(summary.net, currency)}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mb-1">Transactions</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-700 dark:text-slate-300">{summary.count}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 animate-slide-up">
        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden w-full flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3"
        >
          <span className="font-medium text-slate-700 dark:text-slate-300">Filters & Sort</span>
          <ChevronDown className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} size={20} />
        </button>

        <div className={`space-y-3 sm:space-y-4 ${showFilters ? 'block' : 'hidden sm:block'}`}>
          {/* Search, Category and Wallet Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 sm:pl-12 text-sm sm:text-base"
                placeholder="Search transactions..."
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:w-auto">
              <div className="relative">
                <Filter className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input-field pl-10 sm:pl-12 pr-8 appearance-none w-full sm:w-auto text-sm sm:text-base"
                >
                  <option value="All">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <span className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none text-base">
                  💼
                </span>
                <select
                  value={filterWallet}
                  onChange={(e) => setFilterWallet(e.target.value)}
                  className="input-field pl-10 sm:pl-12 pr-8 appearance-none w-full sm:w-auto text-sm sm:text-base"
                >
                  <option value="All">All Wallets</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.icon} {wallet.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date Presets */}
          <div className="flex flex-wrap gap-2 items-center">
            {['today', 'week', 'month', 'lastMonth', 'all'].map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${activePreset === preset
                  ? 'bg-teal-500 text-white shadow-lg'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                {preset === 'today' && 'Today'}
                {preset === 'week' && 'This Week'}
                {preset === 'month' && 'This Month'}
                {preset === 'lastMonth' && 'Last Month'}
                {preset === 'all' && 'All Time'}
              </button>
            ))}

            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${showCalendar
                ? 'bg-teal-500 text-white shadow-lg'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              <Calendar size={14} />
              {showCalendar ? 'Hide' : 'Show'} Calendar
            </button>
          </div>

          {/* Interactive Calendar */}
          {showCalendar && (
            <TransactionCalendar
              transactions={transactions}
              dateRange={dateRange}
              onDateRangeChange={(range) => {
                setDateRange(range);
                setActivePreset('custom');
              }}
              currency={currency}
            />
          )}

          {/* Sort Controls */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">Sort by:</span>
            <button
              onClick={() => toggleSort('date')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${sortBy === 'date'
                ? 'bg-teal-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              Date
              {sortBy === 'date' && (
                <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
            <button
              onClick={() => toggleSort('amount')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${sortBy === 'amount'
                ? 'bg-teal-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              Amount
              {sortBy === 'amount' && (
                <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3 sm:space-y-4 animate-fade-in">
        {filteredAndSortedTransactions.length === 0 ? (
          <div className="glass-card p-6 sm:p-8 md:p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg mb-2">
              {transactions.length === 0 ? 'No transactions yet.' : 'No transactions found.'}
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
              {transactions.length === 0
                ? 'Add your first transaction to get started!'
                : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          filteredAndSortedTransactions.map((transaction) => {
            const category = categories.find((c) => c.name === transaction.category);
            return (
              <div
                key={transaction.id}
                className="glass-card p-3 sm:p-4 md:p-5 animate-slide-up hover:shadow-2xl transition-all duration-300 group"
              >
                {/* Main Content Row */}
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Category Icon */}
                  <div
                    className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-lg sm:text-2xl flex-shrink-0"
                    style={{ backgroundColor: `${category?.color}20` }}
                  >
                    {category?.icon || '📦'}
                  </div>

                  {/* Transaction Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm sm:text-lg text-slate-800 dark:text-white truncate">
                        {transaction.description || transaction.category}
                      </h3>
                      <div
                        className={`text-base sm:text-xl font-bold whitespace-nowrap ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'
                          }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount, currency)}
                      </div>
                    </div>

                    {/* Meta Information */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      <span>{transaction.category}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{formatDate(transaction.date)}</span>
                      {transaction.tag && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium">
                            🏷️ {transaction.tag}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Horizontal on Mobile */}
                <div className="flex items-center justify-end gap-1 sm:gap-2 mt-2 sm:mt-0 sm:absolute sm:top-4 sm:right-4 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={() => setEditingTransaction(transaction)}
                    className="p-2 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 text-slate-400 hover:text-teal-500 active:bg-teal-100 dark:active:bg-teal-900/30 transition-all duration-300 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center"
                    aria-label="Edit transaction"
                  >
                    <Edit2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <button
                    onClick={() => handleDelete(transaction.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 active:bg-red-100 dark:active:bg-red-900/30 transition-all duration-300 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center"
                    aria-label="Delete transaction"
                  >
                    <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
      />
    </div>
  );
}
