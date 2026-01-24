import React, { useState, useMemo } from 'react';
import { useApp } from '../hooks/useAppContext';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  filterByDateRange,
  sortTransactions,
  calculateSummary,
  getDatePreset
} from '../utils/helpers';
import { Search, Filter, Trash2, X, Edit2, Calendar, TrendingUp, TrendingDown, ArrowUpDown, ChevronDown, GripVertical, ChevronUp } from 'lucide-react';
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
    updateTransaction,
  } = useApp();

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [activePreset, setActivePreset] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [reorderMode, setReorderMode] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const scrollPositionRef = React.useRef(0);
  const containerRef = React.useRef(null);

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


  // Drag and drop handlers for reordering
  const handleDragStart = (e, transaction) => {
    setDraggedItem(transaction);
    e.dataTransfer.effectAllowed = 'move';
    // Add a small delay to allow the drag preview to render
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e, transaction) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    // Only allow reordering within the same date
    if (draggedItem && formatDate(draggedItem.date) === formatDate(transaction.date)) {
      if (dragOverItem?.id !== transaction.id) {
        setDragOverItem(transaction);
      }
    } else {
      setDragOverItem(null);
    }
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDrop = async (e, targetTransaction) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || draggedItem.id === targetTransaction.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Only allow reordering within the same date
    if (formatDate(draggedItem.date) !== formatDate(targetTransaction.date)) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Save scroll position before any state changes
    const savedScrollY = window.scrollY;

    try {
      // 1. Get a stable snapshot of the list
      const dateKey = formatDate(draggedItem.date);
      const sameDayTransactions = [...filteredAndSortedTransactions].filter(
        t => formatDate(t.date) === dateKey
      );

      // Find the indices
      const draggedIndex = sameDayTransactions.findIndex(t => t.id === draggedItem.id);
      const targetIndex = sameDayTransactions.findIndex(t => t.id === targetTransaction.id);

      if (draggedIndex === -1 || targetIndex === -1) return;

      // 2. Compute the new visual order
      const newOrderList = [...sameDayTransactions];
      const [removed] = newOrderList.splice(draggedIndex, 1);
      newOrderList.splice(targetIndex, 0, removed);

      // 3. Batch the updates using visual indices
      const updatePromises = newOrderList.map((trans, index) => {
        return updateTransaction(trans.id, {
          customOrder: index
        });
      });

      await Promise.all(updatePromises);

      // Restore scroll
      setTimeout(() => {
        window.scrollTo({ top: savedScrollY, behavior: 'instant' });
      }, 50);

    } catch (error) {
      console.error('Error reordering transactions:', error);
    } finally {
      setDraggedItem(null);
      setDragOverItem(null);
    }
  };

  // Button-based reordering (alternative to drag-and-drop for mobile)
  const moveTransaction = async (transaction, direction) => {
    const savedScrollY = window.scrollY;

    try {
      // 1. Get a stable snapshot of the SAME-DAY transactions only
      const dateKey = formatDate(transaction.date);
      const sameDayTransactions = [...filteredAndSortedTransactions].filter(
        t => formatDate(t.date) === dateKey
      );

      const currentIndex = sameDayTransactions.findIndex(t => t.id === transaction.id);
      if (currentIndex === -1) return;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= sameDayTransactions.length) return;

      // 2. Perform the swap on our stable snapshot
      const newOrderList = [...sameDayTransactions];
      const [movedItem] = newOrderList.splice(currentIndex, 1);
      newOrderList.splice(newIndex, 0, movedItem);

      // 3. Batch the updates
      // We assign indices based on the VISUAL order the user just created
      const updatePromises = newOrderList.map((trans, index) => {
        return updateTransaction(trans.id, {
          customOrder: index
        });
      });

      await Promise.all(updatePromises);

      // Restore scroll
      setTimeout(() => {
        window.scrollTo({ top: savedScrollY, behavior: 'instant' });
      }, 50);

    } catch (error) {
      console.error('Error moving transaction:', error);
      window.scrollTo({ top: savedScrollY, behavior: 'instant' });
    }
  };

  return (
    <div className="pt-16 sm:pt-18 md:pt-8 px-3 sm:px-4 md:px-8 max-w-4xl mx-auto pb-8">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-slate-800 dark:text-white">Transaction History</h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">View and manage all your transactions</p>
      </div>

      {/* Summary Stats */}
      <div className="glass-card p-4 sm:p-6 mb-4 sm:mb-6 animate-slide-up overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full -ml-16 -mb-16 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Financial Overview
          </h2>
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Calendar size={12} className="mr-1.5 opacity-70" />
            {dateRange.from || dateRange.to ? (
              `${dateRange.from ? formatDate(dateRange.from.toISOString()) : 'Start'} - ${dateRange.to ? formatDate(dateRange.to.toISOString()) : 'Now'}`
            ) : 'All Time'}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          <div className="glass-card bg-green-50/50 dark:bg-green-900/10 p-3 sm:p-4 border-green-100/50 dark:border-green-800/20 group hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400">
                <TrendingUp size={14} />
              </div>
              <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-bold uppercase tracking-tight">Income</p>
            </div>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-green-700 dark:text-green-300 truncate">
              {formatCurrency(summary.income, currency)}
            </p>
          </div>

          <div className="glass-card bg-red-50/50 dark:bg-red-900/10 p-3 sm:p-4 border-red-100/50 dark:border-red-800/20 group hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                <TrendingDown size={14} />
              </div>
              <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-tight">Expense</p>
            </div>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-red-700 dark:text-red-300 truncate">
              {formatCurrency(summary.expense, currency)}
            </p>
          </div>

          <div className={`glass-card ${summary.net >= 0 ? 'bg-teal-50/50 dark:bg-teal-900/10 border-teal-100/50 dark:border-teal-800/20' : 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-100/50 dark:border-orange-800/20'} p-3 sm:p-4 group hover:scale-[1.02] transition-transform`}>
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <div className={`p-1.5 rounded-lg ${summary.net >= 0 ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'}`}>
                <ArrowUpDown size={14} />
              </div>
              <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-tight ${summary.net >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>Net</p>
            </div>
            <p className={`text-base sm:text-lg md:text-xl lg:text-2xl font-black truncate ${summary.net >= 0 ? 'text-teal-700 dark:text-teal-300' : 'text-orange-700 dark:text-orange-300'}`}>
              {summary.net >= 0 ? '+' : ''}{formatCurrency(summary.net, currency)}
            </p>
          </div>

          <div className="glass-card bg-slate-50/50 dark:bg-slate-800/30 p-3 sm:p-4 border-slate-200/50 dark:border-slate-700/30 group hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2 text-slate-500 dark:text-slate-400">
              <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700/50">
                <Search size={14} />
              </div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-tight">Count</p>
            </div>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-slate-700 dark:text-slate-300">{summary.count}</p>
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
              onClick={() => {
                toggleSort('date');
                setReorderMode(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${sortBy === 'date'
                ? 'bg-teal-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              Date & Time
              {sortBy === 'date' && (
                <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
            <button
              onClick={() => {
                toggleSort('amount');
                setReorderMode(false);
              }}
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

            {/* Reorder Mode Button - Only show when sorting by date */}
            {sortBy === 'date' && (
              <button
                onClick={() => setReorderMode(!reorderMode)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ml-auto ${reorderMode
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                <GripVertical size={16} />
                {reorderMode ? 'Done' : 'Reorder'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reorder Mode Info Banner */}
      {reorderMode && (
        <div className="glass-card p-4 mb-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 animate-scale-in">
          <p className="text-sm sm:text-base text-purple-700 dark:text-purple-300 text-center flex flex-col sm:flex-row items-center justify-center gap-2">
            <span className="flex items-center gap-2">
              <GripVertical size={18} />
              <span>Drag and drop or use ↑↓ buttons to reorder transactions within the same day</span>
            </span>
          </p>
        </div>
      )}

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
          filteredAndSortedTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              currency={currency}
              categories={categories}
              wallets={wallets}
              reorderMode={reorderMode}
              sortBy={sortBy}
              canDrag={reorderMode && sortBy === 'date'}
              draggedItem={draggedItem}
              dragOverItem={dragOverItem}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDragEnd={handleDragEnd}
              handleDrop={handleDrop}
              moveTransaction={moveTransaction}
              setEditingTransaction={setEditingTransaction}
              handleDelete={handleDelete}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ))
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

// Sub-component for individual transaction items
function TransactionItem({
  transaction,
  currency,
  categories,
  wallets,
  reorderMode,
  sortBy,
  canDrag,
  draggedItem,
  dragOverItem,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  handleDrop,
  moveTransaction,
  setEditingTransaction,
  handleDelete,
  formatCurrency,
  formatDate
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isTransfer = transaction.isTransfer || transaction.type === 'transfer';
  const displayCategory = isTransfer ? (transaction.transferType === 'interest' ? 'Interest' : 'Transfer') : transaction.category;
  const category = categories.find((c) => c.name === displayCategory) || categories.find(c => c.name === 'Transfer') || categories[0];
  const wallet = wallets.find((w) => w.id === transaction.walletId);
  const isDragging = draggedItem?.id === transaction.id;
  const isDragOver = dragOverItem?.id === transaction.id;

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => canDrag && handleDragStart(e, transaction)}
      onDragOver={(e) => canDrag && handleDragOver(e, transaction)}
      onDragEnd={handleDragEnd}
      onDrop={(e) => canDrag && handleDrop(e, transaction)}
      className={`glass-card mb-3 transition-all duration-500 group relative overflow-hidden ${isDragging ? 'opacity-50 scale-95' : ''
        } ${isDragOver ? 'border-2 border-purple-500 border-dashed translate-y-1' : ''
        } ${canDrag ? 'cursor-move' : ''} ${isExpanded ? 'ring-2 ring-teal-500/40 shadow-2xl scale-[1.02] z-10' : 'hover:shadow-lg'}`}
    >
      {/* Background Decorative Polish */}
      <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-teal-500/10 to-purple-500/10 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none transition-opacity duration-700 ${isExpanded ? 'opacity-100' : 'opacity-0'}`} />

      {/* Main Visible Area */}
      <div
        className="p-3.5 sm:p-5 cursor-pointer sm:cursor-default relative z-10"
        onClick={() => !reorderMode && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Reorder Controls - Left Column (Only in Reorder Mode) */}
          {reorderMode && (
            <div className="flex flex-col items-center gap-1.5 pr-3 border-r border-slate-200 dark:border-slate-700/50 self-stretch justify-center animate-fade-in">
              <button
                onClick={(e) => { e.stopPropagation(); moveTransaction(transaction, 'up'); }}
                className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all active:scale-90"
              >
                <ChevronUp size={16} strokeWidth={2.5} />
              </button>
              <div className="text-slate-300 dark:text-slate-600 py-1">
                <GripVertical size={16} />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); moveTransaction(transaction, 'down'); }}
                className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all active:scale-90"
              >
                <ChevronDown size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Category Icon */}
          <div
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1.25rem] flex items-center justify-center text-xl sm:text-3xl flex-shrink-0 shadow-sm border border-white dark:border-slate-700/50 transition-all duration-500 group-hover:scale-105 group-hover:shadow-md"
            style={{
              backgroundColor: `${category?.color}15`,
              color: category?.color,
              boxShadow: isExpanded ? `0 10px 25px -5px ${category?.color}30` : ''
            }}
          >
            {category?.icon || '📦'}
          </div>

          {/* Core Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-lg md:text-xl text-slate-800 dark:text-white leading-tight truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {transaction.description || transaction.category}
                </h3>

                {/* Collapsed Sub-line (Mobile only) */}
                <div className={`flex items-center gap-2 mt-1 sm:hidden transition-all duration-500 ${isExpanded ? 'opacity-0 scale-95 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {displayCategory}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    {wallet?.name || 'Main Wallet'}
                  </span>
                </div>

                {/* Pills (Desktop & Mobile Expanded) */}
                <div className={`hidden sm:flex flex-wrap items-center gap-2 mt-2.5 transition-all duration-500 ${isExpanded ? '!flex animate-slide-up' : ''}`}>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter border border-slate-200/50 dark:border-slate-700/50">
                    {displayCategory}
                  </span>

                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                    {formatDate(transaction.date)}
                  </span>

                  {wallet && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-800/30">
                      <span className="opacity-80 scale-110">{wallet.icon || '💼'}</span>
                      <span>{wallet.name}</span>
                    </span>
                  )}

                  {transaction.tag && (
                    <span className="px-2.5 py-1 rounded-full bg-teal-50/80 dark:bg-teal-900/30 text-[10px] sm:text-xs font-black text-teal-600 dark:text-teal-400 border border-teal-100/50 dark:border-teal-800/30 whitespace-nowrap">
                      # {transaction.tag}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount and Dropdown Arrow */}
              <div className="flex items-center gap-2 sm:gap-4 ml-auto">
                <div
                  className={`text-base sm:text-xl md:text-2xl font-black whitespace-nowrap transition-all duration-500 ${isExpanded ? 'scale-110' : ''} ${(transaction.type === 'income' || transaction.type === 'transfer') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                >
                  {(transaction.type === 'income' || transaction.type === 'transfer') ? '+' : '-'}
                  {formatCurrency(transaction.amount, currency)}
                </div>

                {!reorderMode && (
                  <div className={`p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 sm:hidden transition-all duration-500 border border-slate-200/50 dark:border-slate-700/50 ${isExpanded ? 'rotate-180 bg-teal-500/10 dark:bg-teal-500/20 text-teal-500 border-teal-500/20' : 'text-slate-400'}`}>
                    <ChevronDown size={14} strokeWidth={3} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Section (Mobile Only Actions) */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-out sm:hidden relative z-10 ${isExpanded ? 'max-h-52 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/50">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); setEditingTransaction(transaction); }}
              className="flex items-center justify-center gap-2.5 py-3 rounded-2xl bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-bold text-xs shadow-sm border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
            >
              <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/30">
                <Edit2 size={16} />
              </div>
              Edit Entry
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(transaction.id); }}
              className="flex items-center justify-center gap-2.5 py-3 rounded-2xl bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 font-bold text-xs shadow-sm border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
            >
              <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30">
                <Trash2 size={16} />
              </div>
              Delete
            </button>
          </div>

          <p className="text-[10px] text-center mt-4 text-slate-400 dark:text-slate-500 font-medium uppercase tracking-widest">
            Tap header to collapse
          </p>
        </div>
      </div>

      {/* Desktop Actions - Modern Glass Buttons */}
      {!reorderMode && (
        <div className="hidden sm:flex items-center justify-end gap-2.5 sm:absolute sm:top-1/2 sm:-translate-y-1/2 sm:right-6 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 relative z-20">
          <button
            onClick={(e) => { e.stopPropagation(); setEditingTransaction(transaction); }}
            className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl border border-white/40 dark:border-slate-700/50 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-teal-500 dark:hover:text-teal-400 hover:shadow-teal-500/10 transition-all duration-300 active:scale-90"
            title="Edit Transaction"
          >
            <Edit2 size={18} strokeWidth={2.5} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(transaction.id); }}
            className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl border border-white/40 dark:border-slate-700/50 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:shadow-red-500/10 transition-all duration-300 active:scale-90"
            title="Delete Transaction"
          >
            <Trash2 size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}

