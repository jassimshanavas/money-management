import React, { useState, useEffect } from 'react';
import { useApp } from '../hooks/useAppContext';
import { generateAIInsights } from '../utils/intelligence';
import { generateAIInsightsWithGemini } from '../lib/gemini.service';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info, Loader2, RefreshCw } from 'lucide-react';

export default function AIInsights() {
  const { transactions, budgets, categories, currency, wallets } = useApp();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingAI, setUsingAI] = useState(false);

  useEffect(() => {
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length, JSON.stringify(budgets), categories.length, currency, wallets.length]);

  const loadInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try Gemini API first
      const aiInsights = await generateAIInsightsWithGemini(
        transactions,
        budgets,
        categories,
        currency,
        wallets
      );

      if (aiInsights && aiInsights.length > 0) {
        setInsights(aiInsights);
        setUsingAI(true);
      } else {
        // Fallback to rule-based insights
        const fallbackInsights = generateAIInsights(transactions, budgets, categories, currency);
        setInsights(fallbackInsights);
        setUsingAI(false);
      }
    } catch (err) {
      console.error('Error loading insights:', err);
      // Fallback to rule-based insights on error
      const fallbackInsights = generateAIInsights(transactions, budgets, categories, currency);
      setInsights(fallbackInsights);
      setUsingAI(false);
      setError('Using fallback insights. Configure Gemini API for enhanced AI insights.');
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'warning':
        return <AlertCircle className="text-yellow-500" size={24} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={24} />;
      default:
        return <Info className="text-blue-500" size={24} />;
    }
  };

  const getInsightBgColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-6xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800 dark:text-white">AI Insights</h1>
              <p className="text-slate-600 dark:text-slate-400">
                {usingAI ? 'AI-powered analysis of your spending patterns' : 'Smart analysis of your spending patterns'}
              </p>
            </div>
          </div>
          <button
            onClick={loadInsights}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            title="Refresh insights"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span className="hidden md:inline">Refresh</span>
          </button>
        </div>
        
        {/* AI Status Badge */}
        {usingAI && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200 dark:border-purple-800 rounded-lg">
            <Sparkles size={14} className="text-purple-500" />
            <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">Powered by Gemini AI</span>
          </div>
        )}
        
        {error && !usingAI && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {error} Check <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">GEMINI_SETUP.md</code> for setup instructions.
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center animate-fade-in">
          <Loader2 className="mx-auto mb-4 text-teal-500 animate-spin" size={48} />
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Analyzing your financial data with AI...
          </p>
        </div>
      ) : insights.length === 0 ? (
        <div className="glass-card p-12 text-center animate-fade-in">
          <Sparkles className="mx-auto mb-4 text-slate-400" size={48} />
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">
            Not enough data yet for insights
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            Add more transactions to receive personalized insights!
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`glass-card p-6 border-2 animate-slide-up ${getInsightBgColor(insight.type)}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {getInsightIcon(insight.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{insight.icon}</span>
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-white">
                      {insight.category}
                    </h3>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{insight.message}</p>
                </div>
                <div className="flex-shrink-0">
                  {insight.type === 'success' ? (
                    <TrendingDown className="text-green-500" size={24} />
                  ) : (
                    <TrendingUp className="text-yellow-500" size={24} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Additional Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 animate-fade-in">
        <div className="glass-card p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="text-purple-500" size={24} />
            <h3 className="font-semibold text-slate-800 dark:text-white">Smart Analysis</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            AI-powered insights based on your spending patterns and trends
          </p>
        </div>

        <div className="glass-card p-6 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-teal-200 dark:border-teal-800">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="text-teal-500" size={24} />
            <h3 className="font-semibold text-slate-800 dark:text-white">Trend Detection</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Automatically identifies spending increases, decreases, and patterns
          </p>
        </div>

        <div className="glass-card p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="text-blue-500" size={24} />
            <h3 className="font-semibold text-slate-800 dark:text-white">Proactive Alerts</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Get notified about budget overruns and unusual spending patterns
          </p>
        </div>
      </div>
    </div>
  );
}


