import React from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Search, Filter, Trash2, X } from 'lucide-react';

export default function TransactionHistory() {
  const {
    transactions,
    currency,
    categories,
    searchQuery,
    filterCategory,
    setSearchQuery,
    setFilterCategory,
    deleteTransaction,
  } = useApp();

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.tag?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || transaction.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(id);
    }
  };

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-4xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 text-slate-800 dark:text-white">Transaction History</h1>
        <p className="text-slate-600 dark:text-slate-400">View and manage all your transactions</p>
      </div>

      {/* Search and Filter */}
      <div className="glass-card p-6 mb-6 animate-slide-up">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-12"
              placeholder="Search transactions..."
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X size={18} />
              </button>
            )}
          </div>
          
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input-field pl-12 pr-8 appearance-none"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-4 animate-fade-in">
        {filteredTransactions.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">
              {transactions.length === 0 ? 'No transactions yet.' : 'No transactions found.'}
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              {transactions.length === 0
                ? 'Add your first transaction to get started!'
                : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          filteredTransactions.map((transaction) => {
            const category = categories.find((c) => c.name === transaction.category);
            return (
              <div
                key={transaction.id}
                className="glass-card p-5 animate-slide-up hover:shadow-2xl transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: `${category?.color}20` }}
                    >
                      {category?.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-slate-800 dark:text-white truncate">
                        {transaction.description || transaction.category}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-sm text-slate-500 dark:text-slate-400">{transaction.category}</span>
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
                      className={`text-xl font-bold ${
                        transaction.type === 'income' ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount, currency)}
                    </div>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all duration-300 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


