import React from 'react';
import { useApp } from '../hooks/useAppContext';
import { generateMonthlyReportPDF } from '../utils/pdfGenerator';
import { generateAIInsights } from '../utils/intelligence';
import { getMonthlyTransactions } from '../utils/helpers';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';

export default function MonthlyReports() {
  const { transactions, budgets, currency, categories } = useApp();
  const monthlyTransactions = getMonthlyTransactions(transactions);
  const insights = generateAIInsights(transactions, budgets, categories, currency);

  const handleGenerateReport = () => {
    if (monthlyTransactions.length === 0) {
      alert('No transactions available for this month to generate a report.');
      return;
    }

    generateMonthlyReportPDF(monthlyTransactions, budgets, currency, insights);
  };

  const stats = {
    totalTransactions: monthlyTransactions.length,
    income: monthlyTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    expenses: monthlyTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    balance: monthlyTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0) -
      monthlyTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
  };

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            <FileText className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Monthly Reports</h1>
            <p className="text-slate-600 dark:text-slate-400">Generate and download comprehensive financial reports</p>
          </div>
        </div>
      </div>

      {/* Current Month Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-fade-in">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-blue-500" size={20} />
            <p className="text-sm text-slate-600 dark:text-slate-400">Transactions</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{stats.totalTransactions}</h3>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-green-500" size={20} />
            <p className="text-sm text-slate-600 dark:text-slate-400">Income</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
            ${stats.income.toFixed(2)}
          </h3>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-red-500 rotate-180" size={20} />
            <p className="text-sm text-slate-600 dark:text-slate-400">Expenses</p>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
            ${stats.expenses.toFixed(2)}
          </h3>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="text-teal-500" size={20} />
            <p className="text-sm text-slate-600 dark:text-slate-400">Balance</p>
          </div>
          <h3
            className={`text-2xl font-bold ${
              stats.balance >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            ${stats.balance.toFixed(2)}
          </h3>
        </div>
      </div>

      {/* Generate Report Card */}
      <div className="glass-card p-8 mb-6 animate-slide-up">
        <div className="text-center mb-6">
          <FileText className="mx-auto mb-4 text-slate-400" size={64} />
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Generate Monthly Report
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Create a comprehensive PDF report with all your financial data, insights, and visualizations
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-4">
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <span>Transaction summary and breakdown</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <span>Budget vs actual spending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <span>AI-powered insights and trends</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <span>Category-wise analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <span>Printable format for records</span>
            </div>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={stats.totalTransactions === 0}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} />
            <span>Generate & Download PDF Report</span>
          </button>
        </div>
      </div>

      {/* Insights Preview */}
      {insights.length > 0 && (
        <div className="glass-card p-6 animate-fade-in">
          <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">
            Insights Included in Report
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.slice(0, 4).map((insight, index) => (
              <div
                key={index}
                className="p-4 bg-white/50 dark:bg-slate-700/50 rounded-xl border-l-4"
                style={{ borderColor: insight.color }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{insight.icon}</span>
                  <span className="font-medium text-slate-800 dark:text-white">{insight.category}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 glass-card p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800 animate-fade-in">
        <div className="flex items-start gap-3">
          <FileText className="text-indigo-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white mb-1">Report Features</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Reports are generated in PDF format and can be printed or saved for your records. Each report
              includes comprehensive financial data, visualizations, and AI-generated insights to help you
              understand your spending patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


