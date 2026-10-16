import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  RotateCcw,
  Package,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export default function LoginForm({ initialPortal = 'customer' }) {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Active portal selection: 'customer' | 'manager'
  const [portal, setPortal] = useState(initialPortal || 'customer');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync with initialPortal prop if changed via route
  useEffect(() => {
    if (initialPortal) {
      setPortal(initialPortal);
    }
  }, [initialPortal]);

  // One-click demo credential filler
  const handleDemoFill = (selectedRole) => {
    setPortal(selectedRole);
    setError('');
    if (selectedRole === 'customer') {
      setIdentifier('customer');
      setPassword('Customer@123');
    } else {
      setIdentifier('manager');
      setPassword('Manager@123');
    }
  };

  const handlePortalChange = (newPortal) => {
    setPortal(newPortal);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please provide your username or email address and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await login(identifier.trim(), password, portal);
      const user = data.user;
      const isMgr = Boolean(
        user && (user.is_manager || user.profile?.role === 'MANAGER' || user.profile?.role === 'ADMIN')
      );

      // Backend role-verified redirection
      if (isMgr) {
        navigate('/manager/dashboard');
      } else {
        navigate('/customer/dashboard');
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        'Authentication failed. Please verify your username/email and password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-8 px-4 sm:px-0">
      {/* Refined Glassmorphism Authentication Surface Card */}
      <div className="relative p-7 sm:p-9 rounded-3xl glass-panel border border-slate-800/90 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        {/* Subtle Ambient Radial Highlight on Card */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Card Header & Brand Logo */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 p-0.5 shadow-md">
                <div className="w-full h-full rounded-[10px] bg-[#0B1020] flex items-center justify-center">
                  <Package className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <span className="font-extrabold text-sm tracking-wider text-white font-sans uppercase">
                RETURN RESCUE
              </span>
            </div>

            {/* Role indicator badge */}
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                portal === 'manager'
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {portal === 'manager' ? 'Operations Access' : 'Shopper Access'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1.5 text-xs text-slate-400">
            Sign in to continue to your Return Rescue dashboard.
          </p>

          {/* Interactive Portal Switcher Pill */}
          <div className="mt-6 p-1 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-2 gap-1 relative select-none">
            <button
              type="button"
              id="tab-customer-portal"
              onClick={() => handlePortalChange('customer')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                portal === 'customer'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Customer Portal
            </button>
            <button
              type="button"
              id="tab-manager-portal"
              onClick={() => handlePortalChange('manager')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                portal === 'manager'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Manager Portal
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mt-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Identifier Input */}
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                {portal === 'manager' ? 'Staff Username or Email' : 'Email Address or Username'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={portal === 'manager' ? 'manager' : 'customer'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0 focus:ring-offset-transparent accent-cyan-500"
                />
                <span className="text-xs text-slate-400">Remember this device</span>
              </label>
              {portal === 'customer' && (
                <span className="text-[11px] text-slate-500">Secure AES-256</span>
              )}
            </div>

            {/* Submit Primary Button */}
            <button
              type="submit"
              id="login-submit-button"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 mt-2 ${
                portal === 'manager'
                  ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-600/30'
              } disabled:opacity-60 disabled:cursor-not-allowed transform active:scale-[0.99]`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to {portal === 'manager' ? 'Manager Portal' : 'Customer Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons for Fast Testing */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <span className="text-[11px] font-mono text-slate-500 block mb-2.5">
              ONE-CLICK DEMO CREDENTIALS:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-demo-customer"
                onClick={() => handleDemoFill('customer')}
                className="py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-[11px] text-slate-300 hover:text-emerald-300 font-medium transition-colors flex items-center justify-center gap-1.5 text-center"
              >
                <ShoppingBag className="w-3 h-3 text-emerald-400" />
                <span>Customer Demo</span>
              </button>
              <button
                type="button"
                id="btn-demo-manager"
                onClick={() => handleDemoFill('manager')}
                className="py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-[11px] text-slate-300 hover:text-indigo-300 font-medium transition-colors flex items-center justify-center gap-1.5 text-center"
              >
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                <span>Manager Demo</span>
              </button>
            </div>
          </div>

          {/* Customer Registration Link */}
          {portal === 'customer' && (
            <div className="mt-5 text-center">
              <p className="text-xs text-slate-400">
                New online seller?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
                >
                  Create an account
                </Link>
              </p>
            </div>
          )}

          {/* Footer Caption */}
          <div className="mt-6 pt-4 border-t border-slate-800/60 text-center">
            <p className="text-[11px] text-slate-500 font-medium">
              Smarter returns. A more sustainable future.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
