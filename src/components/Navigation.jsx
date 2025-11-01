import React, { useState } from 'react';
import { useApp } from '../hooks/useAppContext';
import { logOut } from '../lib/firebase.auth';
import { Moon, Sun, Menu, X, ChevronRight, LogOut, User } from 'lucide-react';

// Organize views into logical groups
const navigationGroups = {
  'Core': ['dashboard', 'add', 'history', 'categories', 'budget'],
  'Intelligence': ['insights', 'smartBudget', 'forecasting', 'goals'],
  'Tools': ['scanner', 'recurring', 'wallets', 'shared', 'tax', 'reports'],
  'Other': ['notifications', 'settings'],
};

// Main Navigation component
export default function Navigation({ currentView, setCurrentView, views }) {
  const appContext = useApp();
  const { darkMode, toggleDarkMode, notifications, user } = appContext || {};
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({
    'Core': true,
    'Intelligence': true,
    'Tools': false,
    'Other': true,
  });

  const toggleGroup = (group) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        await logOut();
        window.location.reload(); // Refresh to reset app state
      } catch (error) {
        console.error('Error logging out:', error);
        alert('Failed to logout. Please try again.');
      }
    }
  };

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 glass-card border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg">
                💰
              </div>
              <h1 className="text-lg font-bold gradient-text">Money Tracker</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentView === 'notifications' && unreadCount > 0 && (
              <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-50 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-900 z-50 shadow-2xl overflow-y-auto">
            <MobileSidebar
              currentView={currentView}
              setCurrentView={setCurrentView}
              views={views}
              unreadCount={unreadCount}
              onClose={() => setSidebarOpen(false)}
              user={user}
              onLogout={handleLogout}
            />
          </aside>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 glass-card border-r border-slate-200/50 dark:border-slate-700/50 z-40 flex-col">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              💰
            </div>
            <h1 className="text-xl font-bold gradient-text">Money Tracker</h1>
          </div>
          
          {/* User Info */}
          {user && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/50 dark:bg-slate-700/50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                <User size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-white truncate">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Signed in</p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {Object.entries(navigationGroups).map(([groupName, viewKeys]) => (
            <div key={groupName} className="mb-4">
              <button
                onClick={() => toggleGroup(groupName)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1"
              >
                <span>{groupName}</span>
                <ChevronRight
                  size={14}
                  className={`transition-transform ${expandedGroups[groupName] ? 'rotate-90' : ''}`}
                />
              </button>
              {expandedGroups[groupName] && (
                <div className="space-y-1">
                  {viewKeys.map((key) => {
                    const { icon: Icon, label } = views[key] || {};
                    if (!Icon) return null;
                    const isNotifications = key === 'notifications';

                    return (
                      <button
                        key={key}
                        onClick={() => setCurrentView(key)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group ${
                          currentView === key
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                            : 'hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="font-medium flex-1 text-left">{label}</span>
                        {isNotifications && unreadCount > 0 && (
                          <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 transition-all duration-200"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span className="font-medium">Toggle Theme</span>
          </button>
          
          {user && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-all duration-200"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Bottom Navigation Bar - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-slate-200/50 dark:border-slate-700/50 safe-area-inset-bottom">
        <div className="flex items-center justify-around py-2 px-1 overflow-x-auto">
          {['dashboard', 'add', 'history', 'categories', 'budget', 'notifications'].map((key) => {
            const { icon: Icon, label } = views[key] || {};
            if (!Icon) return null;
            const isNotifications = key === 'notifications';

            return (
              <button
                key={key}
                onClick={() => setCurrentView(key)}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-300 min-w-[60px] relative ${
                  currentView === key
                    ? 'text-teal-500 dark:text-teal-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{label}</span>
                {isNotifications && unreadCount > 0 && (
                  <span className="absolute top-0 right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

// Mobile Sidebar Component
function MobileSidebar({ currentView, setCurrentView, views, unreadCount, onClose, user, onLogout }) {
  const [expandedGroups, setExpandedGroups] = useState({
    'Core': true,
    'Intelligence': false,
    'Tools': false,
    'Other': true,
  });

  const toggleGroup = (group) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Menu</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <X size={24} />
        </button>
      </div>

      {/* User Info - Mobile */}
      {user && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-slate-700/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                {user.displayName || user.email}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Signed in</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {Object.entries(navigationGroups).map(([groupName, viewKeys]) => (
          <div key={groupName} className="mb-4">
            <button
              onClick={() => toggleGroup(groupName)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1"
            >
              <span>{groupName}</span>
              <ChevronRight
                size={14}
                className={`transition-transform ${expandedGroups[groupName] ? 'rotate-90' : ''}`}
              />
            </button>
            {expandedGroups[groupName] && (
              <div className="space-y-1">
                {viewKeys.map((key) => {
                  const { icon: Icon, label } = views[key] || {};
                  if (!Icon) return null;
                  const isNotifications = key === 'notifications';

                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setCurrentView(key);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                        currentView === key
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium flex-1 text-left">{label}</span>
                      {isNotifications && unreadCount > 0 && (
                        <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Logout Button - Mobile */}
      {user && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

