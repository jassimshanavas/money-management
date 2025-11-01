import React, { useEffect } from 'react';
import { useApp } from '../hooks/useAppContext';
import { formatDate } from '../utils/helpers';
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export default function Notifications() {
  const {
    notifications,
    markNotificationRead,
    deleteNotification,
    clearAllNotifications,
  } = useApp();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };

  const getNotificationBg = (type) => {
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
    <div className="pt-20 md:pt-8 px-4 md:px-8 max-w-4xl mx-auto pb-8">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg relative">
              <Bell className="text-white" size={24} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-800 dark:text-white">Notifications</h1>
              <p className="text-slate-600 dark:text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
          </div>
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="btn-secondary text-sm"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="glass-card p-12 text-center animate-fade-in">
          <Bell className="mx-auto mb-4 text-slate-400" size={48} />
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No notifications</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            You'll receive notifications for important updates, reminders, and achievements!
          </p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {notifications.map((notification, index) => (
            <div
              key={notification.id}
              className={`glass-card p-5 animate-slide-up cursor-pointer transition-all duration-300 ${
                !notification.read ? 'ring-2 ring-blue-500' : ''
              } ${getNotificationBg(notification.type)}`}
              style={{ animationDelay: `${index * 0.03}s` }}
              onClick={() => !notification.read && markNotificationRead(notification.id)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
                        {notification.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


