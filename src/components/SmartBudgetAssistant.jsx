import React, { useState } from 'react';
import { useApp } from '../hooks/useAppContext';
import { generateBudgetSuggestions } from '../utils/intelligence';
import { formatCurrency } from '../utils/helpers';
import { Sparkles, Check, X, TrendingUp, TrendingDown } from 'lucide-react';

export default function SmartBudgetAssistant() {
  const { transactions, budgets, categories, currency, setBudget } = useApp();
  const suggestions = generateBudgetSuggestions(transactions, budgets, categories);
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());

  const handleApply = (suggestion) => {
    setBudget(suggestion.category, suggestion.suggestedBudget);
    setAppliedSuggestions((prev) => new Set([...prev, suggestion.category]));
  };

  if (suggestions.length === 0) {
    return (
      <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Smart Budget Assistant</h1>
              <p className="text-slate-600 dark:text-slate-400">AI-powered budget recommendations</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-12 text-center animate-fade-in">
          <Sparkles className="mx-auto mb-4 text-slate-400" size={48} />
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">
            Not enough data for budget suggestions
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            Add more transactions to receive personalized budget recommendations!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 md:pt-24 px-4 md:px-8 max-w-6xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Smart Budget Assistant</h1>
            <p className="text-slate-600 dark:text-slate-400">AI-powered budget recommendations</p>
          </div>
        </div>
      </div>

      <div className="mb-6 glass-card p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 animate-fade-in">
        <div className="flex items-start gap-3">
          <Sparkles className="text-purple-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white mb-1">How It Works</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Our AI analyzes your spending patterns over the last 3 months and suggests optimal budgets
              for each category. Suggestions include a 10% buffer to account for variations.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 animate-fade-in">
        {suggestions.map((suggestion, index) => {
          const isApplied = appliedSuggestions.has(suggestion.category);
          const change = suggestion.suggestedBudget - suggestion.currentBudget;
          const changePercent = ((change / suggestion.currentBudget) * 100).toFixed(0);

          return (
            <div
              key={suggestion.category}
              className={`glass-card p-6 animate-slide-up ${
                isApplied
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${suggestion.color}20` }}
                  >
                    {suggestion.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                      {suggestion.category}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{suggestion.reason}</p>
                  </div>
                </div>
                {isApplied && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check size={20} />
                    <span className="text-sm font-medium">Applied</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current Budget</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">
                    {formatCurrency(suggestion.currentBudget, currency)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Suggested Budget</p>
                  <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                    {formatCurrency(suggestion.suggestedBudget, currency)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Average Spending</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">
                    {formatCurrency(suggestion.averageSpending, currency)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  {change > 0 ? (
                    <>
                      <TrendingUp className="text-red-500" size={18} />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Increase by {Math.abs(changePercent)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="text-green-500" size={18} />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Decrease by {Math.abs(changePercent)}%
                      </span>
                    </>
                  )}
                </div>
                {!isApplied && (
                  <button
                    onClick={() => handleApply(suggestion)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Check size={18} />
                    <span>Apply Suggestion</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


