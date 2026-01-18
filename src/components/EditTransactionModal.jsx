import React, { useState, useEffect } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, getWalletSummary } from '../utils/helpers';
import { X, Save } from 'lucide-react';

const scrollbarStyles = `
  .edit-modal-scroll {
    scrollbar-width: thin;
    scrollbar-color: #14b8a6 transparent;
  }
  .edit-modal-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .edit-modal-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .edit-modal-scroll::-webkit-scrollbar-thumb {
    background: #14b8a6;
    border-radius: 3px;
    transition: background 0.3s ease;
  }
  .edit-modal-scroll::-webkit-scrollbar-thumb:hover {
    background: #0d9488;
  }
  .dark .edit-modal-scroll {
    scrollbar-color: #0f766e transparent;
  }
  .dark .edit-modal-scroll::-webkit-scrollbar-thumb {
    background: #0f766e;
  }
  .dark .edit-modal-scroll::-webkit-scrollbar-thumb:hover {
    background: #115e59;
  }
`;

export default function EditTransactionModal({ isOpen, onClose, transaction }) {
    const { categories, currency, updateTransaction, wallets, selectedWallet, transactions } = useApp();
    const [showSuccess, setShowSuccess] = useState(false);

    // Get initial category based on type
    const getInitialCategory = (type) => {
        const typeCategories = categories.filter((cat) => (cat.type || 'expense') === type);
        return typeCategories.length > 0 ? typeCategories[0].name : '';
    };

    const [formData, setFormData] = useState({
        type: 'expense',
        category: '',
        tag: '',
        amount: '',
        description: '',
        walletId: selectedWallet,
        date: new Date().toISOString().split('T')[0],
    });

    // Initialize form with transaction data when modal opens
    useEffect(() => {
        if (isOpen && transaction) {
            setFormData({
                type: transaction.type || 'expense',
                category: transaction.category || getInitialCategory(transaction.type || 'expense'),
                tag: transaction.tag || '',
                amount: transaction.amount?.toString() || '',
                description: transaction.description || '',
                walletId: transaction.walletId || selectedWallet,
                date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            });
        }
    }, [isOpen, transaction, selectedWallet]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            return;
        }

        // Ensure date is properly formatted
        let transactionDate;
        if (formData.date) {
            try {
                const dateObj = new Date(formData.date);
                if (isNaN(dateObj.getTime())) {
                    transactionDate = new Date().toISOString();
                } else {
                    transactionDate = dateObj.toISOString();
                }
            } catch {
                transactionDate = new Date().toISOString();
            }
        } else {
            transactionDate = new Date().toISOString();
        }

        updateTransaction(transaction.id, {
            ...formData,
            amount: parseFloat(formData.amount),
            walletId: String(formData.walletId || selectedWallet),
            date: transactionDate,
        });

        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            handleClose();
        }, 1500);
    };

    const handleClose = () => {
        setShowSuccess(false);
        onClose();
    };

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    // Filter categories by transaction type
    const filteredCategories = categories.filter((cat) => (cat.type || 'expense') === formData.type);
    const activeWalletId = formData.walletId || selectedWallet;
    const activeWallet = wallets.find((wallet) => wallet.id === activeWalletId);
    const walletSummary = activeWallet ? getWalletSummary(activeWallet, transactions) : null;

    if (!isOpen || !transaction) return null;

    return (
        <>
            <style>{scrollbarStyles}</style>
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
                onClick={handleBackdropClick}
            >
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-[95%] sm:w-[90%] md:w-[600px] lg:w-[700px] max-h-[90vh] overflow-hidden animate-scale-in flex flex-col">
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-teal-500 p-3 sm:p-5 md:p-6 shadow-md flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <Save className="text-white" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Edit Transaction</h2>
                                    <p className="text-teal-100 text-xs sm:text-sm font-medium">Update transaction details</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
                                aria-label="Close modal"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Success Message */}
                    {showSuccess && (
                        <div className="mx-4 sm:mx-6 mt-4 p-3 sm:p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 animate-scale-in">
                            <p className="text-sm sm:text-base text-green-700 dark:text-green-300 text-center font-medium">Transaction updated successfully!</p>
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto edit-modal-scroll p-3 sm:p-5 md:p-6">
                        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
                            {/* Transaction Type */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-slate-700 dark:text-slate-300">
                                    Transaction Type
                                </label>
                                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const expenseCategories = categories.filter((cat) => (cat.type || 'expense') === 'expense');
                                            const newCategory = expenseCategories.length > 0 ? expenseCategories[0].name : '';
                                            setFormData({ ...formData, type: 'expense', category: newCategory });
                                        }}
                                        className={`p-2 sm:p-4 rounded-xl transition-all duration-300 ${formData.type === 'expense'
                                            ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg scale-105'
                                            : 'bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80'
                                            }`}
                                    >
                                        <div className="text-lg sm:text-2xl mb-0.5 sm:mb-2">📉</div>
                                        <div className="font-semibold text-xs sm:text-base">Expense</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const incomeCategories = categories.filter((cat) => (cat.type || 'expense') === 'income');
                                            const newCategory = incomeCategories.length > 0 ? incomeCategories[0].name : '';
                                            setFormData({ ...formData, type: 'income', category: newCategory });
                                        }}
                                        className={`p-2 sm:p-4 rounded-xl transition-all duration-300 ${formData.type === 'income'
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105'
                                            : 'bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/80'
                                            }`}
                                    >
                                        <div className="text-lg sm:text-2xl mb-0.5 sm:mb-2">📈</div>
                                        <div className="font-semibold text-xs sm:text-base">Income</div>
                                    </button>
                                </div>
                            </div>

                            {/* Wallet Selection */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                                    Wallet
                                </label>
                                <select
                                    value={formData.walletId || selectedWallet}
                                    onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
                                    className="input-field text-sm sm:text-base"
                                >
                                    {wallets.map((wallet) => (
                                        <option key={wallet.id} value={wallet.id}>
                                            {wallet.icon} {wallet.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Selection */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-slate-700 dark:text-slate-300">
                                    Transaction Date
                                </label>
                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, date: new Date().toISOString().split('T')[0] })}
                                        className={`p-2 sm:p-3 rounded-xl transition-all duration-300 text-sm sm:text-base font-medium ${formData.date === new Date().toISOString().split('T')[0]
                                            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                                            : 'bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                                            }`}
                                    >
                                        Today
                                    </button>
                                    <div className={`rounded-xl transition-all duration-300 border ${formData.date !== new Date().toISOString().split('T')[0]
                                        ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20'
                                        : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-transparent text-sm sm:text-base font-medium cursor-pointer text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Selected: {new Date(formData.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>

                            {/* Category Selection */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-slate-700 dark:text-slate-300">
                                    {formData.type === 'income' ? 'Income Category' : 'Expense Category'}
                                </label>
                                {filteredCategories.length === 0 ? (
                                    <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                            No {formData.type} categories available.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                                        {filteredCategories.map((cat) => (
                                            <button
                                                key={cat.name}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, category: cat.name })}
                                                className={`p-2 sm:p-3 rounded-xl transition-all duration-300 ${formData.category === cat.name
                                                    ? 'ring-2 ring-teal-500 scale-105 shadow-lg'
                                                    : 'hover:bg-white/50 dark:hover:bg-slate-700/50'
                                                    }`}
                                                style={{
                                                    backgroundColor: formData.category === cat.name ? `${cat.color}20` : 'transparent',
                                                }}
                                            >
                                                <div className="text-xl sm:text-2xl mb-0.5 sm:mb-1">{cat.icon}</div>
                                                <div className="text-[10px] sm:text-xs font-medium text-slate-700 dark:text-slate-300">{cat.name}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                                    Amount ({currency})
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="input-field text-lg sm:text-xl md:text-2xl font-bold"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            {/* Tag */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                                    Tag (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.tag}
                                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                                    className="input-field text-sm sm:text-base"
                                    placeholder="e.g., work, personal, vacation..."
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                                    Description (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input-field text-sm sm:text-base"
                                    placeholder="Enter transaction description..."
                                />
                            </div>
                        </form>
                    </div>

                    {/* Action Buttons - Fixed at bottom */}
                    <div className="flex-shrink-0 flex gap-2 sm:gap-3 p-3 sm:p-5 md:p-6 border-t border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200 text-sm sm:text-base"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!formData.amount || parseFloat(formData.amount) <= 0}
                            className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold hover:from-teal-700 hover:to-teal-600 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                            <Save size={16} className="sm:mr-0" />
                            <span className="hidden sm:inline">Update Transaction</span>
                            <span className="sm:hidden">Update</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
