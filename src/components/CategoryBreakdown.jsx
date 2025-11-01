import React from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatCurrency, getMonthlyTransactions, getCategoryTotals } from '../utils/helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function CategoryBreakdown() {
  const { transactions, currency, categories } = useApp();
  const monthlyTransactions = getMonthlyTransactions(transactions);
  const categoryTotals = getCategoryTotals(monthlyTransactions);

  const chartData = Object.entries(categoryTotals).map(([category, amount]) => {
    const catInfo = categories.find((c) => c.name === category);
    return {
      name: category,
      value: amount,
      color: catInfo?.color || '#6b7280',
      icon: catInfo?.icon || '📦',
    };
  });

  const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

  const COLORS = chartData.map((item) => item.color);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalExpenses) * 100).toFixed(1);
      return (
        <div className="glass-card p-3 border border-slate-200 dark:border-slate-700">
          <p className="font-semibold text-slate-800 dark:text-white">{data.name}</p>
          <p className="text-slate-600 dark:text-slate-400">
            {formatCurrency(data.value, currency)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 text-slate-800 dark:text-white">Category Breakdown</h1>
        <p className="text-slate-600 dark:text-slate-400">See where your money goes this month</p>
      </div>

      {chartData.length === 0 ? (
        <div className="glass-card p-12 text-center animate-fade-in">
          <p className="text-slate-500 dark:text-slate-400 text-lg">No expense data available for this month.</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Add some expenses to see the breakdown!</p>
        </div>
      ) : (
        <>
          {/* Pie Chart */}
          <div className="glass-card p-6 md:p-8 mb-6 animate-slide-up">
            <h3 className="text-xl font-semibold mb-6 text-slate-800 dark:text-white text-center">
              Monthly Expense Distribution
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {chartData
              .sort((a, b) => b.value - a.value)
              .map((item, index) => {
                const percentage = ((item.value / totalExpenses) * 100).toFixed(1);
                return (
                  <div
                    key={item.name}
                    className="glass-card p-5 hover:shadow-xl transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 dark:text-white">{item.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{percentage}% of total</p>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="text-2xl font-bold text-slate-800 dark:text-white">
                        {formatCurrency(item.value, currency)}
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Total Summary */}
          <div className="glass-card p-6 mt-6 animate-fade-in bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-teal-200 dark:border-teal-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 dark:text-slate-400 mb-1">Total Monthly Expenses</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">
                  {formatCurrency(totalExpenses, currency)}
                </h3>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


