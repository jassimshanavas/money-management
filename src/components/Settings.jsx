import React from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, exportToCSV } from '../utils/helpers';
import { Moon, Sun, Download, DollarSign, Trash2, AlertCircle } from 'lucide-react';
import CategoryManager from './CategoryManager';

export default function Settings() {
  const { darkMode, toggleDarkMode, currency, setCurrency, transactions, categories } = useApp();

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  ];

  const handleExport = () => {
    if (transactions.length === 0) {
      alert('No transactions to export!');
      return;
    }
    exportToCSV(transactions, currency);
  };

  const handleClearData = () => {
    if (
      window.confirm(
        'Are you sure you want to clear all data? This action cannot be undone!'
      )
    ) {
      localStorage.removeItem('moneyTrackerData');
      window.location.reload();
    }
  };

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-4xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 text-slate-800 dark:text-white">Settings</h1>
        <p className="text-slate-600 dark:text-slate-400">Manage your app preferences and data</p>
      </div>

      <div className="space-y-6 animate-fade-in">
        {/* Appearance */}
        <div className="glass-card p-6 animate-slide-up">
          <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Appearance</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon size={20} className="text-slate-600 dark:text-slate-400" /> : <Sun size={20} className="text-slate-600 dark:text-slate-400" />}
              <div>
                <p className="font-medium text-slate-800 dark:text-white">Dark Mode</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {darkMode ? 'Dark theme is enabled' : 'Light theme is enabled'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                darkMode ? 'bg-teal-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                  darkMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Currency */}
        <div className="glass-card p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign size={20} className="text-slate-600 dark:text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Currency</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Select your preferred currency for all transactions
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {currencies.map((curr) => (
              <button
                key={curr.code}
                onClick={() => setCurrency(curr.code)}
                className={`p-4 rounded-xl transition-all duration-300 text-left ${
                  currency === curr.code
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg scale-105'
                    : 'bg-white/50 dark:bg-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-bold text-lg">{curr.symbol}</div>
                <div className="text-sm font-medium">{curr.code}</div>
                <div className="text-xs opacity-75 mt-1">{curr.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="glass-card p-6 animate-slide-up">
          <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Expense Categories</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Manage your expense categories. Customize icons, colors, and names.
          </p>
          <CategoryManager type="expense" />
        </div>

        {/* Income Categories */}
        <div className="glass-card p-6 animate-slide-up">
          <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Income Categories</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Manage your income categories. Customize icons, colors, and names.
          </p>
          <CategoryManager type="income" />
        </div>

        {/* Data Management */}
        <div className="glass-card p-6 animate-slide-up">
          <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Data Management</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <Download className="text-slate-600 dark:text-slate-400" size={20} />
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">Export Data</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Download all transactions as CSV file
                  </p>
                </div>
              </div>
              <button onClick={handleExport} className="btn-primary">
                <Download size={18} className="mr-2" />
                Export CSV
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <Trash2 className="text-red-500" size={20} />
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">Clear All Data</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Permanently delete all transactions and budgets
                  </p>
                </div>
              </div>
              <button
                onClick={handleClearData}
                className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="glass-card p-6 animate-slide-up">
          <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">About</h2>
          <div className="space-y-3 text-slate-600 dark:text-slate-400">
            <p>
              <strong className="text-slate-800 dark:text-white">Money Tracker</strong> - Elegant Finance Management
            </p>
            <p className="text-sm">
              Track your income, expenses, and budgets with a beautiful, modern interface.
            </p>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle size={16} />
                <span>All data is stored locally in your browser</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


