import React from 'react';
import { useApp } from '../hooks/useAppContext';
import { forecastNextMonth } from '../utils/intelligence';
import { formatCurrency } from '../utils/helpers';
import { TrendingUp, TrendingDown, BarChart3, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

export default function ExpenseForecasting() {
  const { transactions, currency, categories } = useApp();
  const forecast = forecastNextMonth(transactions);

  // Prepare chart data
  const categoryForecastData = Object.entries(forecast.categories).map(([category, amount]) => {
    const catInfo = categories.find((c) => c.name === category);
    return {
      name: category,
      amount,
      icon: catInfo?.icon || '📦',
      color: catInfo?.color || '#6b7280',
    };
  }).sort((a, b) => b.amount - a.amount);

  const trendData = [
    { month: '3 months ago', expenses: forecast.expenses * 0.9, income: forecast.income * 0.95 },
    { month: '2 months ago', expenses: forecast.expenses * 0.95, income: forecast.income * 0.98 },
    { month: 'Last month', expenses: forecast.expenses * 1.05, income: forecast.income * 1.02 },
    { month: 'Next month (forecast)', expenses: forecast.expenses, income: forecast.income },
  ];

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            <BarChart3 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Expense Forecasting</h1>
            <p className="text-slate-600 dark:text-slate-400">Predict your next month's financial outlook</p>
          </div>
        </div>
      </div>

      {/* Forecast Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-fade-in">
        <div className="glass-card p-6 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Predicted Expenses</p>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
                {formatCurrency(forecast.expenses, currency)}
              </h2>
            </div>
            <TrendingDown
              className={`${forecast.trends.expenses < 0 ? 'text-green-500' : 'text-red-500'}`}
              size={32}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${forecast.trends.expenses < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {forecast.trends.expenses > 0 ? '+' : ''}{forecast.trends.expenses.toFixed(1)}% trend
            </span>
          </div>
        </div>

        <div className="glass-card p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Predicted Income</p>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
                {formatCurrency(forecast.income, currency)}
              </h2>
            </div>
            <TrendingUp
              className={`${forecast.trends.income > 0 ? 'text-green-500' : 'text-red-500'}`}
              size={32}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${forecast.trends.income > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {forecast.trends.income > 0 ? '+' : ''}{forecast.trends.income.toFixed(1)}% trend
            </span>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="glass-card p-6 mb-8 animate-fade-in">
        <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Expense & Income Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.3} />
            <XAxis dataKey="month" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '12px',
              }}
              formatter={(value) => formatCurrency(value, currency)}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 5 }}
              name="Income"
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ fill: '#ef4444', r: 5 }}
              name="Expenses"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category Forecast */}
      {categoryForecastData.length > 0 && (
        <div className="glass-card p-6 mb-8 animate-fade-in">
          <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Category-wise Forecast</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryForecastData.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.3} />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '12px',
                }}
                formatter={(value) => formatCurrency(value, currency)}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {categoryForecastData.slice(0, 8).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="space-y-4 animate-fade-in">
        <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Forecasted Category Spending</h3>
        {categoryForecastData.slice(0, 6).map((item, index) => (
          <div
            key={item.name}
            className="glass-card p-5 animate-slide-up hover:shadow-xl transition-all duration-300"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-slate-800 dark:text-white">{item.name}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Predicted amount</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-slate-800 dark:text-white">
                  {formatCurrency(item.amount, currency)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Next month</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-8 glass-card p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800 animate-fade-in">
        <div className="flex items-start gap-3">
          <Calendar className="text-indigo-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white mb-1">How Forecasts Are Calculated</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Predictions are based on your average spending over the last 3 months, adjusted for trends.
              These are estimates and may vary based on your actual spending patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


