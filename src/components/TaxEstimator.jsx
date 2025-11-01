import React, { useState } from 'react';
import { useApp } from '../hooks/useAppContext';
import { estimateTax } from '../utils/intelligence';
import { formatCurrency } from '../utils/helpers';
import { getMonthlyTransactions } from '../utils/helpers';
import { Calculator, TrendingDown, Receipt, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function TaxEstimator() {
  const { transactions, currency, categories } = useApp();
  const [customRates, setCustomRates] = useState({
    income: 0.20,
    deductions: { healthcare: 0.10, education: 0.15 },
  });

  const monthlyTransactions = getMonthlyTransactions(transactions);
  const taxEstimate = estimateTax(transactions, customRates);

  const chartData = [
    { name: 'Tax', value: taxEstimate.estimatedTax, color: '#ef4444' },
    { name: 'Deductions', value: taxEstimate.totalDeductions, color: '#10b981' },
    { name: 'Take Home', value: taxEstimate.annualIncome - taxEstimate.estimatedTax, color: '#14b8a6' },
  ];

  const COLORS = chartData.map((d) => d.color);

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
            <Calculator className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Tax Estimator</h1>
            <p className="text-slate-600 dark:text-slate-400">Estimate your annual tax liability</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">
        <div className="glass-card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="text-blue-500" size={24} />
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Annual Income</p>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {formatCurrency(taxEstimate.annualIncome, currency)}
              </h2>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 mb-3">
            <Receipt className="text-red-500" size={24} />
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Estimated Tax</p>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {formatCurrency(taxEstimate.estimatedTax, currency)}
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Effective rate: {taxEstimate.effectiveRate.toFixed(1)}%
          </p>
        </div>

        <div className="glass-card p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-3">
            <TrendingDown className="text-green-500" size={24} />
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Deductions</p>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {formatCurrency(taxEstimate.totalDeductions, currency)}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Breakdown Chart */}
      <div className="glass-card p-6 mb-8 animate-fade-in">
        <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Tax Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '12px',
              }}
              formatter={(value) => formatCurrency(value, currency)}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Deduction Details */}
      <div className="glass-card p-6 mb-8 animate-fade-in">
        <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Deduction Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                🏥
              </div>
              <div>
                <p className="font-medium text-slate-800 dark:text-white">Healthcare</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {((customRates.deductions.healthcare * 100).toFixed(0))}% deductible
                </p>
              </div>
            </div>
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              {formatCurrency(taxEstimate.deductions.healthcare, currency)}
            </p>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                📚
              </div>
              <div>
                <p className="font-medium text-slate-800 dark:text-white">Education</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {((customRates.deductions.education * 100).toFixed(0))}% deductible
                </p>
              </div>
            </div>
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              {formatCurrency(taxEstimate.deductions.education, currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Tax Settings */}
      <div className="glass-card p-6 animate-fade-in">
        <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Tax Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              Income Tax Rate ({((customRates.income * 100).toFixed(0))}%)
            </label>
            <input
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={customRates.income * 100}
              onChange={(e) =>
                setCustomRates({ ...customRates, income: parseFloat(e.target.value) / 100 })
              }
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Healthcare Deduction Rate
              </label>
              <input
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={customRates.deductions.healthcare * 100}
                onChange={(e) =>
                  setCustomRates({
                    ...customRates,
                    deductions: {
                      ...customRates.deductions,
                      healthcare: parseFloat(e.target.value) / 100,
                    },
                  })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Education Deduction Rate
              </label>
              <input
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={customRates.deductions.education * 100}
                onChange={(e) =>
                  setCustomRates({
                    ...customRates,
                    deductions: {
                      ...customRates.deductions,
                      education: parseFloat(e.target.value) / 100,
                    },
                  })
                }
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 glass-card p-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800 animate-fade-in">
        <div className="flex items-start gap-3">
          <Calculator className="text-orange-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white mb-1">Disclaimer</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This is a simplified tax estimate based on your transaction history. Actual tax liability
              depends on many factors including location, tax laws, and deductions. Please consult with
              a tax professional for accurate tax planning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


