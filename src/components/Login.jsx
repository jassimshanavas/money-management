import React, { useState } from 'react';
import { signUp, signIn, signInWithGoogle } from '../lib/firebase.auth';
import { initializeUserData } from '../lib/firebase.userData';
import { Mail, Lock, User, LogIn, UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';

export default function Login({ onLoginSuccess, onBack }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up
        const user = await signUp(formData.email, formData.password, formData.name);
        
        // Initialize user data - wait for it to complete
        try {
          await initializeUserData(user.uid, {
            email: user.email,
            name: formData.name,
            displayName: formData.name,
          });
          // Small delay to ensure Firestore write completes
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (initError) {
          console.error('Error initializing user data:', initError);
          // Continue anyway - context will handle it on next auth check
        }
        
        onLoginSuccess(user);
      } else {
        // Sign in - user data should already exist, but context will check
        const user = await signIn(formData.email, formData.password);
        onLoginSuccess(user);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const user = await signInWithGoogle();
      
      // Initialize user data if it doesn't exist (for first-time Google sign-in)
      try {
        const { getUserData, initializeUserData } = await import('../lib/firebase.userData');
        const userData = await getUserData(user.uid);
        if (!userData) {
          await initializeUserData(user.uid, {
            email: user.email || '',
            name: user.displayName || '',
            displayName: user.displayName || '',
          });
        }
      } catch (dataError) {
        console.error('Error initializing Google user data:', dataError);
        // Continue anyway - context will handle it
      }
      
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="w-full max-w-md animate-fade-in">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-teal-500 dark:hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to home</span>
          </button>
        )}

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <span className="text-4xl">💰</span>
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Money Tracker</h1>
          <p className="text-slate-600 dark:text-slate-400">
            {isSignUp ? 'Create your account' : 'Welcome back!'}
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 animate-slide-up">
          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6 bg-white/50 dark:bg-slate-700/50 p-1 rounded-xl">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                !isSignUp
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                isSignUp
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-scale-in">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field (Sign Up only) */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  <User size={16} className="inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                <Mail size={16} className="inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                <Lock size={16} className="inline mr-2" />
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-field"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : isSignUp ? (
                <>
                  <UserPlus size={20} />
                  <span>Create Account</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-sm text-slate-500 dark:text-slate-400">OR</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Additional Info */}
          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            {isSignUp
              ? 'Already have an account? Sign in above.'
              : "Don't have an account? Sign up to get started."}
          </p>
        </div>

        {/* Demo Mode */}
        <div className="mt-6 text-center">
          <button
            onClick={() => onLoginSuccess(null)}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-teal-500 transition-colors"
          >
            Continue offline (LocalStorage mode)
          </button>
        </div>
      </div>
    </div>
  );
}


