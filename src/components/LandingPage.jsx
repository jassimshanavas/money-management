import React from 'react';
import { 
  TrendingUp, 
  Target, 
  Sparkles, 
  Wallet, 
  BarChart3, 
  Shield, 
  Zap, 
  Smartphone,
  Camera,
  Users,
  FileText,
  Calculator,
  ArrowRight,
  Check,
  Star
} from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
  const features = [
    {
      icon: BarChart3,
      title: 'Smart Dashboard',
      description: 'Visual insights and analytics at a glance',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Target,
      title: 'Budget Tracking',
      description: 'Set budgets and track spending in real-time',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Sparkles,
      title: 'AI Insights',
      description: 'Get intelligent spending recommendations',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Wallet,
      title: 'Multi-Wallet',
      description: 'Manage multiple accounts in one place',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: Camera,
      title: 'Receipt Scanner',
      description: 'Scan receipts with OCR technology',
      color: 'from-teal-500 to-blue-500'
    },
    {
      icon: Users,
      title: 'Shared Expenses',
      description: 'Split bills with friends and family',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      icon: TrendingUp,
      title: 'Forecasting',
      description: 'Predict your future expenses',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: FileText,
      title: 'Reports',
      description: 'Generate detailed financial reports',
      color: 'from-cyan-500 to-teal-500'
    },
  ];

  const benefits = [
    'Track income and expenses effortlessly',
    'Set and achieve savings goals',
    'Smart budget suggestions based on your spending',
    'Real-time synchronization across devices',
    'Secure cloud backup with Firebase',
    'Beautiful, modern interface',
    'Dark mode support',
    'Export reports to PDF/CSV'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-32 md:pb-24">
          <div className="text-center animate-fade-in">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white font-bold text-4xl shadow-xl mb-6 animate-scale-in">
              💰
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-teal-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent animate-slide-up">
              Take Control of
              <br />
              <span className="gradient-text">Your Finances</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              An intelligent, beautiful money tracking app that helps you manage your finances with ease.
              Track expenses, set budgets, achieve goals, and gain insights—all in one place.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <button
                onClick={onGetStarted}
                className="group relative px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                <span>Get Started Free</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Learn More
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-green-500" />
                <span>Secure & Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-yellow-500" />
                <span>Lightning Fast</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-blue-500" />
                <span>Works Everywhere</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-white mb-4">
            Everything You Need to
            <span className="bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent"> Manage Money</span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Powerful features designed to give you complete control over your finances
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group glass-card p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <feature.icon size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Benefits List */}
        <div className="glass-card p-8 md:p-12 rounded-2xl">
          <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 text-center">
            Why Choose Money Tracker?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-3 animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={14} className="text-white" />
                </div>
                <p className="text-lg text-slate-700 dark:text-slate-300">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-purple-500/10 dark:from-teal-500/5 dark:via-cyan-500/5 dark:to-purple-500/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="animate-fade-in">
              <div className="text-5xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                15+
              </div>
              <div className="text-xl text-slate-600 dark:text-slate-400">Powerful Features</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                100%
              </div>
              <div className="text-xl text-slate-600 dark:text-slate-400">Secure & Private</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Free
              </div>
              <div className="text-xl text-slate-600 dark:text-slate-400">Forever</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="glass-card p-12 md:p-16 rounded-2xl text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-cyan-500/10 to-purple-500/10" />
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-white mb-6">
              Ready to Take Control?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Join thousands of users managing their finances smarter. Start free today—no credit card required.
            </p>
            <button
              onClick={onGetStarted}
              className="group px-10 py-5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold text-xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 mx-auto"
            >
              <span>Get Started Now</span>
              <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
            </button>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
              ✓ Free forever &nbsp; • &nbsp; ✓ No credit card &nbsp; • &nbsp; ✓ Setup in 30 seconds
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                💰
              </div>
              <span className="text-lg font-bold gradient-text">Money Tracker</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} Money Tracker. Made with ❤️ for better financial management.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

