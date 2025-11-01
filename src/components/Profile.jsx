import React, { useState, useEffect } from 'react';
import { useApp } from '../hooks/useAppContext';
import { updateUserData, getUserData } from '../lib/firebase.userData';
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase.config';
import { User, Mail, Calendar, Edit2, Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
  const { user, userData, transactions, wallets } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || user?.displayName || '',
        email: userData.email || user?.email || '',
      });
    } else if (user) {
      setFormData({
        name: user.displayName || '',
        email: user.email || '',
      });
    }
  }, [userData, user]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Update Firestore user data
      await updateUserData(user.uid, {
        name: formData.name,
        email: formData.email,
      });

      // Update Firebase Auth profile (display name)
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: formData.name,
        });
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      
      // Refresh page to update context
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (userData) {
      setFormData({
        name: userData.name || user?.displayName || '',
        email: userData.email || user?.email || '',
      });
    }
    setIsEditing(false);
    setMessage({ type: '', text: '' });
  };

  // Calculate stats
  const totalTransactions = transactions?.length || 0;
  const totalWallets = wallets?.length || 0;
  const memberSince = userData?.createdAt 
    ? format(new Date(userData.createdAt), 'MMM yyyy')
    : 'Recently';

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  if (!user) {
    return (
      <div className="pt-20 md:pt-8 px-3 sm:px-4 md:px-8 max-w-4xl mx-auto pb-20 md:pb-8">
        <div className="glass-card p-6 text-center">
          <p className="text-slate-600 dark:text-slate-400">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 md:pt-8 px-3 sm:px-4 md:px-8 max-w-4xl mx-auto pb-20 md:pb-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 md:mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 text-slate-800 dark:text-white">Profile</h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">Manage your account information and preferences</p>
      </div>

      {/* Success/Error Messages */}
      {message.text && (
        <div className={`glass-card p-3 sm:p-4 mb-4 sm:mb-6 animate-scale-in ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
            ) : (
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
            )}
            <p className={`text-sm sm:text-base ${
              message.type === 'success' 
                ? 'text-green-700 dark:text-green-300' 
                : 'text-red-700 dark:text-red-300'
            }`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="glass-card p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 animate-slide-up">
        {/* Avatar Section */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 sm:mb-8 pb-6 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl sm:text-3xl md:text-4xl shadow-xl">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={formData.name || 'User'} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(formData.name)
              )}
            </div>
            {user.photoURL && (
              <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-7 sm:h-7 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                <CheckCircle className="text-white" size={12} />
              </div>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-2">
              {formData.name || 'User'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3 sm:mb-4">{formData.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>Member since {memberSince}</span>
              </div>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary px-4 py-2 text-sm sm:text-base flex items-center gap-2"
            >
              <Edit2 size={16} />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        {/* Edit Form */}
        {isEditing ? (
          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                <User size={14} className="inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                <Mail size={14} className="inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
                placeholder="Enter your email"
                required
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Note: Changing email requires verification
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} className="sm:w-5 sm:h-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="btn-secondary flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        ) : (
          /* View Mode - User Info */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
                    <User className="text-teal-600 dark:text-teal-400" size={20} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Full Name</p>
                    <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white">
                      {formData.name || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Mail className="text-blue-600 dark:text-blue-400" size={20} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Email Address</p>
                    <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white truncate">
                      {formData.email || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Card */}
      <div className="glass-card p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white mb-4 sm:mb-6">Account Statistics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-1">
              {totalTransactions}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Transactions</div>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-1">
              {totalWallets}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Wallets</div>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 text-center col-span-2 sm:col-span-1">
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1">Member Since</div>
            <div className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white">{memberSince}</div>
          </div>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="glass-card p-4 sm:p-5 md:p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white mb-4 sm:mb-6">Account Information</h3>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-0.5">User ID</p>
              <p className="text-xs sm:text-sm font-mono text-slate-800 dark:text-white break-all">
                {user.uid}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-0.5">Authentication Method</p>
              <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white">
                {user.providerData?.[0]?.providerId === 'google.com' ? 'Google Account' : 'Email/Password'}
              </p>
            </div>
          </div>
          {userData?.createdAt && (
            <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white/50 dark:bg-slate-700/50">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-0.5">Account Created</p>
                <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white">
                  {format(new Date(userData.createdAt), 'PPp')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

