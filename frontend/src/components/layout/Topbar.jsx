import React, { useState, useEffect } from 'react';
import { Menu, Bell, Check, ExternalLink, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import ProfileSettingsModal from '../common/ProfileSettingsModal';

export default function Topbar({ onMenuClick }) {
  const { user, isManager } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      const list = res.data.results || res.data || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.is_read).length);
    } catch {
      // Ignore background notification fetch errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 glass-panel border-b border-slate-800 flex items-center justify-between px-4 md:px-8">
      {/* Mobile Toggle & Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          {isManager ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Manager Operations Portal
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Customer Returns Portal
            </span>
          )}
          <span className="hidden lg:inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
            System: <span className="text-emerald-400 font-semibold">Single-Port Active</span>
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#080c16] animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl glass-panel border border-slate-800 shadow-2xl p-4 z-50 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark read
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-xl border text-xs transition-colors ${
                        n.is_read
                          ? 'bg-slate-900/30 border-slate-800 text-slate-400'
                          : 'bg-indigo-950/20 border-indigo-500/30 text-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold text-white">{n.title}</span>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-400 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar and Profile Settings trigger */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <button
            onClick={() => setShowSettings(true)}
            id="topbar-user-profile-btn"
            title="Click to change name or edit profile settings"
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-800/50 transition-colors group text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300 group-hover:border-cyan-400 transition-colors">
              {user?.first_name ? user.first_name.slice(0, 2).toUpperCase() : user?.username?.slice(0, 2).toUpperCase() || 'RR'}
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                {user?.first_name || user?.username}
              </span>
              <span className="text-[10px] text-slate-500">
                {isManager ? 'Manager' : 'Customer'} • Edit Name
              </span>
            </div>
          </button>

          {/* Quick Settings Gear Icon */}
          <button
            onClick={() => setShowSettings(true)}
            id="topbar-settings-btn"
            title="Profile & Name Settings"
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Profile Settings Modal */}
      <ProfileSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </header>
  );
}
