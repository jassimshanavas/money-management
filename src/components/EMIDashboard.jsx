import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, CheckCircle2, CircleDollarSign, CreditCard, IndianRupee, Pencil } from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency } from '../utils/helpers';
import { getEMISummary, updateScheduleStatuses } from '../utils/emiCalculator';
import ConvertToEMI from './ConvertToEMI';

const chartColors = ['#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function EMIDashboard() {
  const { emiLoans, transactions, currency, postEMICharge, syncEMILoanPostings, deleteEMILoan } = useApp();
  const [chargeDates, setChargeDates] = useState({});
  const [editingCharges, setEditingCharges] = useState({});
  const [deletingLoan, setDeletingLoan] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [editingLoan, setEditingLoan] = useState(null);
  const syncInFlight = useRef(false);

  const normalizedLoans = useMemo(
    () =>
      emiLoans.map((loan) => ({
        ...loan,
        schedule: updateScheduleStatuses(loan.schedule || []),
      })),
    [emiLoans]
  );

  const summary = useMemo(() => getEMISummary(normalizedLoans), [normalizedLoans]);

  const activeLoans = normalizedLoans.filter((loan) => loan.status === 'active');
  const completedLoans = normalizedLoans.filter((loan) => loan.status === 'completed');

  const timelineData = useMemo(
    () =>
      activeLoans
        .map((loan) => {
          const nextInstallment = loan.schedule.find((entry) => entry.status !== 'paid');
          if (!nextInstallment) return null;

          return {
            name: loan.loanNumber,
            amount: Number(nextInstallment.totalPayable || 0),
            date: new Date(nextInstallment.emiDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            }),
          };
        })
        .filter(Boolean),
    [activeLoans]
  );

  const chartLoan = activeLoans[0];
  const amortizationData = chartLoan
    ? chartLoan.schedule.map((entry) => ({
        month: `M${entry.month}`,
        principal: entry.principalAmount,
        interest: entry.interestAmount,
        igst: entry.igstOnInterest,
      }))
    : [];

  const costBreakdown = chartLoan
    ? [
        { name: 'Principal', value: chartLoan.principalAmount },
        { name: 'Interest', value: chartLoan.totalInterest },
        { name: 'Interest IGST', value: chartLoan.totalIGSTOnInterest },
        {
          name: 'Fees',
          value: Number(chartLoan.processingFee || 0) + Number(chartLoan.igstOnProcessingFee || 0),
        },
      ]
    : [];

  useEffect(() => {
    if (syncInFlight.current || !normalizedLoans.length) return;

    syncInFlight.current = true;
    Promise.resolve(syncEMILoanPostings()).finally(() => {
      syncInFlight.current = false;
    });
  }, [normalizedLoans, syncEMILoanPostings]);

  const getChargeDateValue = (loanId, charge) =>
    chargeDates[`${loanId}:${charge.key}`] || formatDateInput(charge.scheduledDate);

  const handleChargeDateChange = (loanId, chargeKey, value) => {
    setChargeDates((current) => ({ ...current, [`${loanId}:${chargeKey}`]: value }));
  };

  const handleChargePaid = async (loanId, charge) => {
    if (isChargePosted({ id: loanId }, charge)) return;
    await postEMICharge(loanId, charge.key, getChargeDateValue(loanId, charge));
    setEditingCharges((current) => ({ ...current, [`${loanId}:${charge.key}`]: false }));
  };

  const isEditingCharge = (loanId, chargeKey) => !!editingCharges[`${loanId}:${chargeKey}`];

  const toggleChargeEditing = (loanId, chargeKey, value) => {
    setEditingCharges((current) => ({ ...current, [`${loanId}:${chargeKey}`]: value }));
  };

  const handleDeleteLoan = async () => {
    if (!deletingLoan) return;
    setDeleteError('');
    try {
      await deleteEMILoan(deletingLoan.id);
      setDeletingLoan(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete EMI loan. Please try again.');
    }
  };

  const canEditLoan = (loan) => {
    const hasGeneratedTransactions = transactions.some(
      (item) =>
        item.emiLoanId === loan.id &&
        ['emi-processing-fee', 'emi-principal', 'emi-interest', 'emi-igst', 'emi-payment'].includes(item.tag)
    );
    return loan.paidEMIs === 0 && !hasGeneratedTransactions && !(loan.upcomingCharges || []).some((charge) => charge.posted);
  };

  const editingTransaction = editingLoan
    ? transactions.find((item) => String(item.id) === String(editingLoan.transactionId))
    : null;

  const getInstallmentPostingDate = (loan, installment) => {
    if (!installment) return null;
    if (!loan?.statementDate) return installment.emiDate;

    const base = new Date(loan.statementDate);
    if (Number.isNaN(base.getTime())) return installment.emiDate;

    const derived = new Date(base);
    derived.setMonth(derived.getMonth() + Math.max(0, Number(installment.month || 1) - 1));
    return derived.toISOString();
  };

  const isChargePosted = (loan, charge) =>
    charge.posted || transactions.some(
      (item) =>
        item.emiLoanId === loan.id &&
        item.tag === 'emi-processing-fee' &&
        item.emiChargeType === charge.key
    );

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-7xl mx-auto pb-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-teal-500 font-semibold">EMI Loans</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
          Credit card EMI dashboard
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Track blocked principal, statement-day postings, and the true cost of each converted transaction.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          label="Total EMI Outstanding"
          value={formatCurrency(summary.totalOutstanding || 0, currency)}
          tone="teal"
        />
        <StatCard
          icon={IndianRupee}
          label="Current EMI Outflow"
          value={formatCurrency(summary.totalMonthlyEMI || 0, currency)}
          tone="amber"
        />
        <StatCard
          icon={CalendarDays}
          label="Next EMI Due"
          value={
            summary.nextDueDate
              ? new Date(summary.nextDueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : 'No dues'
          }
          subvalue={
            summary.nextDueAmount ? formatCurrency(summary.nextDueAmount, currency) : 'All active loans are clear'
          }
          tone="slate"
        />
        <StatCard
          icon={CreditCard}
          label="Interest Paid / Remaining"
          value={`${formatCurrency(summary.totalInterestPaid || 0, currency)} / ${formatCurrency(summary.totalInterestRemaining || 0, currency)}`}
          subvalue={`${summary.activeLoansCount || 0} active • ${summary.completedLoansCount || 0} completed`}
          tone="violet"
        />
      </div>

      {activeLoans.length > 0 ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Visuals</p>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Amortization breakdown</h2>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {chartLoan?.loanNumber || 'active loan'}
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={amortizationData}>
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Area type="monotone" dataKey="principal" stackId="1" stroke="#14b8a6" fill="#14b8a6" />
                    <Area type="monotone" dataKey="interest" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                    <Area type="monotone" dataKey="igst" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-6">
              <ChartCard title="Upcoming EMI timeline">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timelineData}>
                      <XAxis dataKey="date" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#14b8a6" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Cost breakdown">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={costBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                        {costBreakdown.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
          </div>

          <div className="grid gap-5">
            {activeLoans.map((loan) => {
              const nextInstallment = loan.schedule.find((entry) => entry.status !== 'paid');
              const progress = loan.tenureMonths
                ? Math.round((loan.paidEMIs / loan.tenureMonths) * 100)
                : 0;

              return (
                <div
                  key={loan.id}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{loan.loanNumber}</p>
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                              {loan.transactionDescription}
                            </h3>
                          </div>
                          <button
                            onClick={() => setEditingLoan(loan)}
                            disabled={!canEditLoan(loan)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            aria-label="Edit EMI"
                            title="Edit EMI"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Booked on {new Date(loan.loanBookingDate || loan.loanBookedDate).toLocaleDateString()} • {loan.tenureMonths} months at {loan.interestRatePA}% p.a.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <InfoPill label="Outstanding Principal" value={formatCurrency(loan.outstandingPrincipal, currency)} />
                        <InfoPill
                          label="Next Statement EMI"
                          value={nextInstallment ? formatCurrency(nextInstallment.totalPayable, currency) : 'Completed'}
                        />
                        <InfoPill
                          label="Statement Day"
                          value={nextInstallment ? new Date(getInstallmentPostingDate(loan, nextInstallment)).toLocaleDateString() : '-'}
                        />
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                          <span>Progress</span>
                          <span>{loan.paidEMIs}/{loan.tenureMonths} EMIs posted</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="w-full lg:max-w-sm space-y-3">
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Statement posting</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                          {nextInstallment
                            ? `Month ${nextInstallment.month} will auto-post on ${new Date(getInstallmentPostingDate(loan, nextInstallment)).toLocaleDateString()}`
                            : 'All statement-day postings are complete'}
                        </p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          Principal and interest are auto-added on statement day. IGST on that month&apos;s interest moves to the next billing cycle automatically.
                        </p>
                      </div>

                      {(loan.upcomingCharges || []).length > 0 && (
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 space-y-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Upcoming pre-bill charges</p>
                          {(loan.upcomingCharges || []).map((charge) => (
                            <div
                              key={`${loan.id}-${charge.key}`}
                              className="flex items-start gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 px-3 py-3"
                            >
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{charge.label}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                      {formatCurrency(charge.amount, currency)}
                                    </span>
                                    {!isChargePosted(loan, charge) && (
                                      <button
                                        onClick={() => toggleChargeEditing(loan.id, charge.key, !isEditingCharge(loan.id, charge.key))}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                        aria-label={`Edit ${charge.label}`}
                                        title={`Edit ${charge.label}`}
                                      >
                                        <Pencil size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {isEditingCharge(loan.id, charge.key) && !isChargePosted(loan, charge) ? (
                                  <input
                                    type="date"
                                    value={getChargeDateValue(loan.id, charge)}
                                    onChange={(e) => handleChargeDateChange(loan.id, charge.key, e.target.value)}
                                    className="input-field mt-2"
                                  />
                                ) : (
                                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                                    Date: {new Date((charge.postedDate || getChargeDateValue(loan.id, charge)) || charge.scheduledDate).toLocaleDateString()}
                                  </p>
                                )}
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                  {isChargePosted(loan, charge)
                                    ? `Posted on ${new Date(charge.postedDate || charge.scheduledDate).toLocaleDateString()}`
                                    : 'Edit the date if needed, then mark it as paid after the charge appears on the card.'}
                                </p>
                                <div className="mt-3 flex gap-2">
                                  {!isChargePosted(loan, charge) && (
                                    <>
                                      {isEditingCharge(loan.id, charge.key) && (
                                        <button
                                          onClick={() => toggleChargeEditing(loan.id, charge.key, false)}
                                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                        >
                                          Done
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleChargePaid(loan.id, charge)}
                                        className="rounded-xl bg-teal-500 px-3 py-2 text-sm font-semibold text-white"
                                      >
                                        Mark as paid
                                      </button>
                                    </>
                                  )}
                                  {isChargePosted(loan, charge) && (
                                    <span className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                      Paid
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => setDeletingLoan(loan)}
                        className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-semibold dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                      >
                        Delete EMI
                      </button>

                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-300">
                            <tr>
                              <th className="px-3 py-2 text-left">Month</th>
                              <th className="px-3 py-2 text-left">Status</th>
                              <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loan.schedule.map((entry) => (
                              <tr key={`${loan.id}-${entry.month}`} className="border-t border-slate-100 dark:border-slate-800">
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">Month {entry.month}</td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                      entry.status === 'paid'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                        : entry.status === 'overdue'
                                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                  >
                                    {entry.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right text-slate-900 dark:text-white font-medium">
                                  {formatCurrency(entry.totalPayable, currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 p-12 text-center">
          <CheckCircle2 className="mx-auto text-teal-500" size={36} />
          <h2 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">No EMI loans yet</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Convert any eligible credit card transaction from History to start tracking it here.
          </p>
        </div>
      )}

      {completedLoans.length > 0 && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Completed loans</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {completedLoans.map((loan) => (
              <div key={loan.id} className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{loan.transactionDescription}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {loan.loanNumber} • {formatCurrency(loan.totalCost, currency)}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingLoan(loan)}
                    disabled={!canEditLoan(loan)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    aria-label="Edit EMI"
                    title="Edit EMI"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
                <button
                  onClick={() => setDeletingLoan(loan)}
                  className="mt-3 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-300"
                >
                  Delete EMI
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {deletingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Delete EMI loan</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This removes the EMI loan, deletes its EMI-generated fee and installment transactions, and restores the original purchase as a normal card expense.
            </p>

            <div className="mt-4 space-y-3">
              <InfoPill label="Loan" value={deletingLoan.loanNumber} />
              <InfoPill label="Transaction" value={deletingLoan.transactionDescription} />
            </div>

            <div className="mt-6">
              {deleteError && (
                <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                  {deleteError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteLoan}
                  className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-white font-semibold"
                >
                  Delete EMI
                </button>
                <button
                  onClick={() => { setDeletingLoan(null); setDeleteError(''); }}
                  className="flex-1 rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingLoan && editingTransaction && (
        <ConvertToEMI
          isOpen={Boolean(editingLoan)}
          onClose={() => setEditingLoan(null)}
          transaction={editingTransaction}
          loan={editingLoan}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subvalue, tone }) {
  const tones = {
    teal: 'from-teal-500 to-cyan-500 text-white',
    amber: 'from-amber-400 to-orange-500 text-slate-950',
    slate: 'from-slate-900 to-slate-700 text-white',
    violet: 'from-violet-500 to-fuchsia-500 text-white',
  };

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${tones[tone]} p-5 shadow-lg`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.25em] opacity-75">{label}</p>
        <Icon size={20} />
      </div>
      <p className="mt-4 text-2xl font-black leading-tight">{value}</p>
      {subvalue ? <p className="mt-2 text-sm opacity-80">{subvalue}</p> : null}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function formatDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}
