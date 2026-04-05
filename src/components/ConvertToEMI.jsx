import React, { useEffect, useMemo, useState } from 'react';
import { X, CreditCard, CalendarDays, Percent, IndianRupee, CheckCircle2 } from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency } from '../utils/helpers';
import {
  calculateTotalCost,
  validateEMIParams,
} from '../utils/emiCalculator';

function addDaysToDate(dateValue, days) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().split('T')[0];
}

function getDefaultStatementDate(transactionDate, wallet) {
  const baseDate = transactionDate ? new Date(transactionDate) : new Date();

  if (wallet?.billingDate) {
    const target = new Date(baseDate);
    const billingDay = Number(wallet.billingDate);
    const daysInMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(billingDay, daysInMonth));

    if (target < baseDate) {
      target.setMonth(target.getMonth() + 1);
      const nextMonthDays = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      target.setDate(Math.min(billingDay, nextMonthDays));
    }

    return target.toISOString().split('T')[0];
  }

  return baseDate.toISOString().split('T')[0];
}

export default function ConvertToEMI({ isOpen, onClose, transaction, loan = null }) {
  const { wallets, currency, addEMILoan, editEMILoanDetails } = useApp();
  const wallet = wallets.find((item) => String(item.id) === String(transaction?.walletId));
  const dueDateDuration = Number(wallet?.dueDateDuration || 20);
  const isEditMode = !!loan;

  const [form, setForm] = useState({
    interestRate: 18,
    tenureMonths: 3,
    processingFee: 0,
    igstRate: 18,
    loanBookingDate: '',
    statementDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!transaction) return;
    setForm({
      interestRate: loan?.interestRatePA ?? 18,
      tenureMonths: loan?.tenureMonths ?? 3,
      processingFee: loan?.processingFee ?? 0,
      igstRate: loan?.igstRate ?? 18,
      loanBookingDate: formatDateInput(loan?.loanBookingDate) || new Date().toISOString().split('T')[0],
      statementDate: formatDateInput(loan?.statementDate) || getDefaultStatementDate(transaction.date, wallet),
    });
    setError('');
    setSubmitting(false);
  }, [transaction, wallet, loan]);

  const preview = useMemo(() => {
    if (!transaction) return null;

    return calculateTotalCost(
      transaction.amount,
      Number(form.interestRate),
      Number(form.tenureMonths),
      Number(form.processingFee),
      Number(form.igstRate),
      form.statementDate || new Date().toISOString(),
      {
        loanBookingDate: form.loanBookingDate,
        statementDate: form.statementDate,
        firstPaymentDate: addDaysToDate(form.statementDate, dueDateDuration),
      }
    );
  }, [form, transaction]);

  const validation = useMemo(
    () =>
      validateEMIParams({
        principal: transaction?.amount,
        annualRate: Number(form.interestRate),
        tenureMonths: Number(form.tenureMonths),
        processingFee: Number(form.processingFee),
        loanBookingDate: form.loanBookingDate,
        statementDate: form.statementDate,
        firstPaymentDate: addDaysToDate(form.statementDate, dueDateDuration),
      }),
    [form, transaction]
  );

  if (!isOpen || !transaction) return null;

  const handleConvert = async () => {
    if (!validation.valid) {
      setError(validation.errors[0]);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        walletId: transaction.walletId,
        transactionId: transaction.id,
        principalAmount: transaction.amount,
        interestRatePA: Number(form.interestRate),
        tenureMonths: Number(form.tenureMonths),
        processingFee: Number(form.processingFee),
        igstRate: Number(form.igstRate),
        firstEMIDate: form.statementDate,
        loanBookingDate: form.loanBookingDate,
        statementDate: form.statementDate,
        firstPaymentDate: addDaysToDate(form.statementDate, dueDateDuration),
      };
      if (isEditMode) {
        await editEMILoanDetails(loan.id, payload);
      } else {
        await addEMILoan(payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || (isEditMode ? 'Unable to update EMI details.' : 'Unable to convert transaction to EMI.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-white/95 dark:bg-slate-900/95 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200/70 dark:border-slate-800 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/80">Credit Card EMI</p>
            <h2 className="text-2xl font-bold">{isEditMode ? 'Edit EMI Details' : 'Convert Transaction to EMI'}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/15 p-2 hover:bg-white/25 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1.25fr] p-6">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-teal-500/10 p-3 text-teal-600 dark:text-teal-300">
                  <CreditCard size={24} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{isEditMode ? 'Original Transaction' : 'Selected Transaction'}</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    {transaction.description || transaction.category}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {wallet?.name || 'Credit card'} • {new Date(transaction.date).toLocaleDateString()}
                  </p>
                  <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(transaction.amount, currency)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/60">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <Percent size={16} /> Interest Rate (% p.a.)
                </span>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.interestRate}
                  onChange={(e) => setForm((current) => ({ ...current, interestRate: e.target.value }))}
                  className="input-field"
                />
              </label>

              <label className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/60">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <CalendarDays size={16} /> Tenure (months)
                </span>
                <select
                  value={form.tenureMonths}
                  onChange={(e) => setForm((current) => ({ ...current, tenureMonths: e.target.value }))}
                  className="input-field"
                >
                  {[3, 6, 9, 12, 18, 24].map((months) => (
                    <option key={months} value={months}>
                      {months} months
                    </option>
                  ))}
                </select>
              </label>

              <label className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/60">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <IndianRupee size={16} /> Processing Fee
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.processingFee}
                  onChange={(e) => setForm((current) => ({ ...current, processingFee: e.target.value }))}
                  className="input-field"
                />
              </label>

              <label className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/60">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <Percent size={16} /> IGST Rate
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.igstRate}
                  onChange={(e) => setForm((current) => ({ ...current, igstRate: e.target.value }))}
                  className="input-field"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/60">
                <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Loan Booking Date
                </span>
                <input
                  type="date"
                  value={form.loanBookingDate}
                  onChange={(e) => setForm((current) => ({ ...current, loanBookingDate: e.target.value }))}
                  className="input-field"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  First EMI interest starts accruing from this booking date.
                </p>
              </label>

              <label className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/60">
                <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Statement Date
                </span>
                <input
                  type="date"
                  value={form.statementDate}
                  onChange={(e) => setForm((current) => ({ ...current, statementDate: e.target.value }))}
                  className="input-field"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  This is the statement cycle date. The bank calculator then derives the first payment due date from it.
                </p>
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/60">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">EMI statement posting starts on</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                {form.statementDate || '-'}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Principal and interest will post on the statement day. The bank-style first-interest math still uses the derived payment due date of {addDaysToDate(form.statementDate, dueDateDuration) || '-'}.
              </p>
            </div>

            {!validation.valid && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300">
                {validation.errors[0]}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              onClick={handleConvert}
              disabled={submitting || !validation.valid}
              className="w-full rounded-2xl bg-slate-900 dark:bg-teal-500 px-5 py-4 text-white font-semibold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (isEditMode ? 'Saving...' : 'Converting...') : (isEditMode ? 'Save EMI Changes' : 'Convert to EMI')}
            </button>
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.25em] text-white/70">Approx Monthly EMI</p>
                <p className="mt-3 text-3xl font-black">
                  {formatCurrency(preview?.monthlyEMI || 0, currency)}
                </p>
              </div>
              <div className="rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-slate-950">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-900/60">Total Loan Cost</p>
                <p className="mt-3 text-3xl font-black">
                  {formatCurrency(preview?.totalCost || 0, currency)}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryLine label="Principal" value={formatCurrency(transaction.amount, currency)} />
                <SummaryLine label="Total Interest" value={formatCurrency(preview?.totalInterest || 0, currency)} />
                <SummaryLine
                  label="IGST on Interest"
                  value={formatCurrency(preview?.totalIGSTOnInterest || 0, currency)}
                />
                <SummaryLine
                  label="Processing Fee + IGST"
                  value={formatCurrency(preview?.totalProcessingCost || 0, currency)}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Amortization Schedule</p>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Live Preview</h3>
                </div>
                  <div className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-600 dark:text-teal-300">
                  IGST tracked separately
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Month</th>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-right font-semibold">Principal</th>
                      <th className="px-4 py-3 text-right font-semibold">Interest</th>
                      <th className="px-4 py-3 text-right font-semibold">IGST</th>
                      <th className="px-4 py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(preview?.schedule || []).map((entry) => (
                      <tr key={entry.month} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{entry.month}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {entry.emiDateFormatted}
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(entry.principalAmount, currency)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(entry.interestAmount, currency)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(entry.igstOnInterest, currency)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(entry.totalPayable, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-900/20">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 text-emerald-600 dark:text-emerald-300" size={20} />
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  The original purchase stays in credit used. Processing-fee charges will appear as pending checklist items in EMI Loans, while principal, interest, and EMI-interest IGST post automatically on each statement day.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function formatDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}
