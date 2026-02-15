import React, { useState } from 'react';
import { format } from 'date-fns';
import { useApp } from '../hooks/useAppContext';
import { scanReceipt, extractTransactionData } from '../utils/receiptScanner';
import { formatCurrency } from '../utils/helpers';
import { Upload, Camera, Check, Loader, Image as ImageIcon } from 'lucide-react';

export default function ReceiptScanner() {
  const { categories, currency, addTransaction, addReceipt, selectedWallet } = useApp();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [formData, setFormData] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    setScanning(true);
    setResult(null);

    try {
      const scanResult = await scanReceipt(file);
      setResult(scanResult);

      if (scanResult.success) {
        const transactionData = extractTransactionData(scanResult);
        if (transactionData) {
          setFormData({
            ...transactionData,
            category: transactionData.category || categories[0].name,
          });
        }
      }
    } catch (error) {
      setResult({ success: false, error: 'Failed to scan receipt' });
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData) return;

    const transaction = {
      ...formData,
      amount: parseFloat(formData.amount),
      walletId: selectedWallet,
    };

    addTransaction(transaction);
    addReceipt({
      file: preview,
      transactionData: formData,
      scannedAt: new Date().toISOString(),
    });

    // Reset
    setResult(null);
    setPreview(null);
    setFormData(null);
    e.target.reset();
  };

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-4xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
            <Camera className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Receipt Scanner</h1>
            <p className="text-slate-600 dark:text-slate-400">Scan receipts to auto-fill transactions</p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="glass-card p-8 mb-6 animate-slide-up">
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-12 text-center hover:border-teal-500 transition-colors">
          {preview ? (
            <div className="space-y-4">
              <img
                src={preview}
                alt="Receipt preview"
                className="max-w-full max-h-64 mx-auto rounded-lg shadow-lg"
              />
              <button
                onClick={() => {
                  setPreview(null);
                  setResult(null);
                  setFormData(null);
                }}
                className="btn-secondary text-sm"
              >
                Upload Different Receipt
              </button>
            </div>
          ) : (
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={scanning}
              />
              <div className="space-y-4">
                {scanning ? (
                  <>
                    <Loader className="mx-auto animate-spin text-teal-500" size={48} />
                    <p className="text-slate-600 dark:text-slate-400">Scanning receipt...</p>
                  </>
                ) : (
                  <>
                    <Upload className="mx-auto text-slate-400" size={48} />
                    <div>
                      <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Upload Receipt Image
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Click or drag to upload (JPG, PNG, PDF)
                      </p>
                    </div>
                  </>
                )}
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Scan Result */}
      {result && result.success && formData && (
        <div className="glass-card p-6 mb-6 animate-scale-in border-2 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-4">
            <Check className="text-green-500" size={20} />
            <h3 className="font-semibold text-lg text-slate-800 dark:text-white">Receipt Scanned Successfully</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Review and confirm the extracted information below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Merchant / Description
                </label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-field"
                >
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Amount ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date ? format(new Date(formData.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value).toISOString() })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {result.data && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Extracted Details:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Merchant:</span>{' '}
                    <span className="font-medium">{result.data.merchant}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Total:</span>{' '}
                    <span className="font-medium">{formatCurrency(result.data.total, currency)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Confidence:</span>{' '}
                    <span className="font-medium">{(result.data.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Check size={18} />
                <span>Add Transaction</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setPreview(null);
                  setFormData(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {result && !result.success && (
        <div className="glass-card p-6 mb-6 animate-scale-in border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            Failed to scan receipt. Please try again or manually enter the transaction.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="glass-card p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 animate-fade-in">
        <div className="flex items-start gap-3">
          <ImageIcon className="text-green-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white mb-1">How It Works</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Upload a receipt image and our OCR technology will automatically extract merchant name, amount,
              date, and category. Review and adjust the details before adding the transaction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


