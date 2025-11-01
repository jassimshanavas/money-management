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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 sm:pt-20 sm:pb-16 md:pt-32 md:pb-24">
          <div className="text-center animate-fade-in">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white font-bold text-2xl sm:text-3xl md:text-4xl shadow-xl mb-4 sm:mb-6 animate-scale-in">
              💰
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold mb-3 sm:mb-4 md:mb-6 bg-gradient-to-r from-teal-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent animate-slide-up leading-tight">
              Take Control of
              <br />
              <span className="gradient-text">Your Finances</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-xl lg:text-2xl text-slate-600 dark:text-slate-300 mb-6 sm:mb-8 max-w-3xl mx-auto animate-slide-up px-2" style={{ animationDelay: '0.1s' }}>
              An intelligent, beautiful money tracking app that helps you manage your finances with ease.
              Track expenses, set budgets, achieve goals, and gain insights—all in one place.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 animate-slide-up px-4" style={{ animationDelay: '0.2s' }}>
              <button
                onClick={onGetStarted}
                className="group relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg sm:rounded-xl font-semibold text-base sm:text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span>Get Started Free</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Learn More
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400 animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Shield size={16} className="text-green-500 flex-shrink-0" />
                <span>Secure & Encrypted</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Zap size={16} className="text-yellow-500 flex-shrink-0" />
                <span>Lightning Fast</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Smartphone size={16} className="text-blue-500 flex-shrink-0" />
                <span>Works Everywhere</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 dark:text-white mb-3 sm:mb-4 px-2">
            Everything You Need to
            <span className="bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent"> Manage Money</span>
          </h2>
          <p className="text-sm sm:text-base md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto px-4">
            Powerful features designed to give you complete control over your finances
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group glass-card p-4 sm:p-5 md:p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 sm:mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <feature.icon size={22} className="text-white sm:w-6 sm:h-6 md:w-7 md:h-7" />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-1.5 sm:mb-2">{feature.title}</h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Benefits List */}
        <div className="glass-card p-5 sm:p-6 md:p-8 lg:p-12 rounded-xl sm:rounded-2xl">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-5 sm:mb-6 md:mb-8 text-center">
            Why Choose Money Tracker?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-2.5 sm:gap-3 animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={12} className="text-white sm:w-3.5 sm:h-3.5" />
                </div>
                <p className="text-sm sm:text-base md:text-lg text-slate-700 dark:text-slate-300">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-purple-500/10 dark:from-teal-500/5 dark:via-cyan-500/5 dark:to-purple-500/5 py-10 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-center">
            <div className="animate-fade-in">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-1.5 sm:mb-2">
                15+
              </div>
              <div className="text-sm sm:text-base md:text-xl text-slate-600 dark:text-slate-400">Powerful Features</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1.5 sm:mb-2">
                100%
              </div>
              <div className="text-sm sm:text-base md:text-xl text-slate-600 dark:text-slate-400">Secure & Private</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1.5 sm:mb-2">
                Free
              </div>
              <div className="text-sm sm:text-base md:text-xl text-slate-600 dark:text-slate-400">Forever</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <div className="glass-card p-6 sm:p-8 md:p-12 lg:p-16 rounded-xl sm:rounded-2xl text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-cyan-500/10 to-purple-500/10" />
          
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 dark:text-white mb-3 sm:mb-4 md:mb-6 px-2">
              Ready to Take Control?
            </h2>
            <p className="text-sm sm:text-base md:text-xl text-slate-600 dark:text-slate-400 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
              Join thousands of users managing their finances smarter. Start free today—no credit card required.
            </p>
            <button
              onClick={onGetStarted}
              className="group w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 md:py-5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg sm:rounded-xl font-bold text-base sm:text-lg md:text-xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 mx-auto"
            >
              <span>Get Started Now</span>
              <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform sm:w-6 sm:h-6" />
            </button>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-3 sm:mt-4 px-2">
              ✓ Free forever &nbsp; • &nbsp; ✓ No credit card &nbsp; • &nbsp; ✓ Setup in 30 seconds
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-base sm:text-lg">
                💰
              </div>
              <span className="text-base sm:text-lg font-bold gradient-text">Money Tracker</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center">
              © {new Date().getFullYear()} Money Tracker. Made with ❤️ for better financial management.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

