import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ProfileSettingsModal from '../common/ProfileSettingsModal';
import {
  LayoutDashboard,
  Inbox,
  Boxes,
  Database,
  Sliders,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  ShieldAlert,
  Sparkles,
  ShoppingBag,
  Settings
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, isManager, isCustomer, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const managerLinks = [
    { name: 'Overview', path: '/manager/dashboard', icon: LayoutDashboard },
    { name: 'Return Queue', path: '/manager/returns', icon: Inbox },
    { name: 'Inventory', path: '/manager/inventory', icon: Boxes },
    { name: 'Dataset Management', path: '/manager/datasets', icon: Database },
    { name: 'Category & Rules', path: '/manager/catalog', icon: Sliders },
  ];

  const customerLinks = [
    { name: 'My Returns', path: '/customer/dashboard', icon: ShoppingBag },
    { name: 'Submit Return', path: '/customer/submit', icon: PlusCircle },
  ];

  const links = isManager ? managerLinks : customerLinks;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 glass-panel border-r border-slate-800 flex flex-col justify-between ${
        collapsed ? 'w-20' : 'w-64'
      } ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
    >
      <div>
        {/* Brand / Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-glow-brand">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-wider text-white uppercase flex items-center gap-1.5">
                  RETURN RESCUE
                </span>
                <span className="text-[10px] text-indigo-400 font-medium">Universal AI Platform</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Role Badge */}
        {!collapsed && (
          <div className="mx-4 mt-4 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isManager ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-xs font-semibold text-slate-300">
                {isManager ? 'Manager Portal' : 'Customer Portal'}
              </span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {isManager ? 'STAFF' : 'USER'}
            </span>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 mt-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 text-indigo-400 border border-indigo-500/30 shadow-glow-brand font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{link.name}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User profile & Settings / Logout */}
      <div className="p-3 border-t border-slate-800">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-2 rounded-xl bg-slate-900/40`}>
          {!collapsed && (
            <button
              onClick={() => setShowSettings(true)}
              title="Click to edit name and account settings"
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-85 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-xs font-bold uppercase flex-shrink-0">
                {user?.first_name ? user.first_name.charAt(0) : user?.username?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
                </p>
                <p className="text-[10px] text-cyan-400 truncate">Settings & Profile</p>
              </div>
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(true)}
              title="Edit Profile Settings"
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              title="Log Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Settings Modal */}
      <ProfileSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </aside>
  );
}
