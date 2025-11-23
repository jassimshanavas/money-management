// Create a new file: src/components/PaymentModal.jsx

import React, { useState } from 'react';
import { X, DollarSign, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

const scrollbarStyles = `
  .payment-modal-scroll {
    scrollbar-width: thin;
    scrollbar-color: #14b8a6 transparent;
  }
  .payment-modal-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .payment-modal-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .payment-modal-scroll::-webkit-scrollbar-thumb {
    background: #14b8a6;
    border-radius: 3px;
    transition: background 0.3s ease;
  }
  .payment-modal-scroll::-webkit-scrollbar-thumb:hover {
    background: #0d9488;
  }
  .dark .payment-modal-scroll {
    scrollbar-color: #0f766e transparent;
  }
  .dark .payment-modal-scroll::-webkit-scrollbar-thumb {
    background: #0f766e;
  }
  .dark .payment-modal-scroll::-webkit-scrollbar-thumb:hover {
    background: #115e59;
  }
`;

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  wallet, 
  currency, 
  onPayment 
}) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('full'); // 'full' or 'custom'

  if (!isOpen || !wallet) return null;

  const maxPayable = wallet.unpaidBillAmount || 0;
  const unbilledAmount = wallet.unbilledAmount || 0;
  const totalOutstanding = maxPayable + unbilledAmount;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const amount = paymentType === 'full' 
      ? maxPayable 
      : parseFloat(paymentAmount);

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amount > maxPayable) {
      alert(`Payment cannot exceed unpaid bill amount: ${formatCurrency(maxPayable, currency)}`);
      return;
    }

    onPayment(amount);
    handleClose();
  };

  const handleClose = () => {
    setPaymentAmount('');
    setPaymentType('full');
    onClose();
  };

  const isFullPayment = paymentType === 'full' || parseFloat(paymentAmount) >= maxPayable;
  const remainingAfterPayment = paymentType === 'full' 
    ? 0 
    : Math.max(0, maxPayable - (parseFloat(paymentAmount) || 0));

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-scale-in flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-teal-500 p-6 shadow-md flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                  <CreditCard className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Make Payment</h2>
                  <p className="text-teal-100 text-sm font-medium">{wallet.name}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto payment-modal-scroll p-6 space-y-5">
            {/* Bill Summary */}
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    Unpaid Bill (Due)
                  </span>
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(maxPayable, currency)}
                  </span>
                </div>
                {wallet.dueDate && wallet.daysUntilDue !== null && (
                  <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                    Due: {new Date(wallet.dueDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })} ({wallet.daysUntilDue > 0 ? `${wallet.daysUntilDue} days left` : 
                           wallet.daysUntilDue === 0 ? 'Due today!' : 
                           `${Math.abs(wallet.daysUntilDue)} days overdue`})
                  </div>
                )}
              </div>

              {unbilledAmount > 0 && (
                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                      Unbilled Amount (New Spending)
                    </span>
                    <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                      {formatCurrency(unbilledAmount, currency)}
                    </span>
                  </div>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 font-medium">
                    Will be billed on {wallet.nextBillingDate ? new Date(wallet.nextBillingDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    }) : 'next billing date'}
                  </p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/50 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Total Outstanding
                  </span>
                  <span className="text-lg font-bold text-slate-800 dark:text-white">
                    {formatCurrency(totalOutstanding, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Type Selection */}
            <div className="space-y-3 pt-2">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                Payment Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentType('full')}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    paymentType === 'full'
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                  }`}
                >
                  <div className="text-center">
                    <CheckCircle 
                      size={24} 
                      className={`mx-auto mb-2 transition-colors ${
                        paymentType === 'full' 
                          ? 'text-teal-600 dark:text-teal-400' 
                          : 'text-slate-400'
                      }`} 
                    />
                    <div className={`font-bold text-sm transition-colors ${
                      paymentType === 'full'
                        ? 'text-teal-700 dark:text-teal-300'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      Full Payment
                    </div>
                    <div className={`text-xs mt-1 font-medium transition-colors ${
                      paymentType === 'full'
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-slate-500 dark:text-slate-500'
                    }`}>
                      {formatCurrency(maxPayable, currency)}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('custom')}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    paymentType === 'custom'
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                  }`}
                >
                  <div className="text-center">
                    <DollarSign 
                      size={24} 
                      className={`mx-auto mb-2 transition-colors ${
                        paymentType === 'custom' 
                          ? 'text-teal-600 dark:text-teal-400' 
                          : 'text-slate-400'
                      }`} 
                    />
                    <div className={`font-bold text-sm transition-colors ${
                      paymentType === 'custom'
                        ? 'text-teal-700 dark:text-teal-300'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      Custom Amount
                    </div>
                    <div className={`text-xs mt-1 font-medium transition-colors ${
                      paymentType === 'custom'
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-slate-500 dark:text-slate-500'
                    }`}>
                      Partial payment
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Amount Input */}
            {paymentType === 'custom' && (
              <div className="space-y-2 pt-2">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                  Payment Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-semibold">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={maxPayable}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 text-lg font-semibold rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-200"
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <span>Maximum: {formatCurrency(maxPayable, currency)}</span>
                  {paymentAmount && parseFloat(paymentAmount) > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(maxPayable.toString())}
                      className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-semibold"
                    >
                      Use Max
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Payment Preview */}
            {(paymentType === 'full' || (paymentType === 'custom' && paymentAmount && parseFloat(paymentAmount) > 0)) && (
              <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-teal-700 dark:text-teal-300 font-semibold">
                    Remaining Balance
                  </span>
                  <span className={`font-bold transition-colors ${
                    remainingAfterPayment === 0 
                      ? 'text-teal-600 dark:text-teal-400' 
                      : 'text-orange-600 dark:text-orange-400'
                  }`}>
                    {formatCurrency(remainingAfterPayment, currency)}
                  </span>
                </div>
                {isFullPayment && (
                  <div className="pt-2 border-t border-teal-200 dark:border-teal-700/50">
                    <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 text-sm font-semibold">
                      <CheckCircle size={16} className="flex-shrink-0" />
                      <span>Bill will be cleared!</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex-shrink-0 flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200 hover:shadow-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={paymentType === 'custom' && (!paymentAmount || parseFloat(paymentAmount) <= 0)}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold hover:from-teal-700 hover:to-teal-600 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2"
            >
              <DollarSign size={20} />
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    </>
  );
}