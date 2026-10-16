import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize user from this tab's isolated sessionStorage based on current route
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const pathname = window.location.pathname;
        if (pathname.startsWith('/manager')) {
          const mgrSaved = sessionStorage.getItem('return_rescue_manager_user');
          if (mgrSaved) return JSON.parse(mgrSaved);
        } else if (pathname.startsWith('/customer')) {
          const custSaved = sessionStorage.getItem('return_rescue_customer_user');
          if (custSaved) return JSON.parse(custSaved);
        }
        const saved = sessionStorage.getItem('return_rescue_user');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    let token = null;
    const pathname = window.location.pathname;
    if (pathname.startsWith('/manager')) {
      token = sessionStorage.getItem('return_rescue_manager_token') || sessionStorage.getItem('return_rescue_token');
    } else if (pathname.startsWith('/customer')) {
      token = sessionStorage.getItem('return_rescue_customer_token') || sessionStorage.getItem('return_rescue_token');
    } else {
      token = sessionStorage.getItem('return_rescue_token');
    }

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getCurrentUser();
      const userData = res.data;
      setUser(userData);
      const isMgr = Boolean(userData && (userData.is_manager || userData.profile?.role === 'MANAGER' || userData.profile?.role === 'ADMIN'));
      
      sessionStorage.setItem('return_rescue_token', token);
      sessionStorage.setItem('return_rescue_user', JSON.stringify(userData));
      if (isMgr) {
        sessionStorage.setItem('return_rescue_manager_token', token);
        sessionStorage.setItem('return_rescue_manager_user', JSON.stringify(userData));
      } else {
        sessionStorage.setItem('return_rescue_customer_token', token);
        sessionStorage.setItem('return_rescue_customer_user', JSON.stringify(userData));
      }
    } catch {
      // Clear current tab tokens on verification failure
      sessionStorage.removeItem('return_rescue_token');
      sessionStorage.removeItem('return_rescue_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (username, password, portal = null) => {
    const res = await api.login({ username, password, portal });
    const { token, user: userData } = res.data;
    const isMgr = Boolean(userData && (userData.is_manager || userData.profile?.role === 'MANAGER' || userData.profile?.role === 'ADMIN'));

    // Save strictly to tab-isolated sessionStorage with role-specific keys
    if (typeof window !== 'undefined') {
      if (token) {
        sessionStorage.setItem('return_rescue_token', token);
        if (isMgr) {
          sessionStorage.setItem('return_rescue_manager_token', token);
        } else {
          sessionStorage.setItem('return_rescue_customer_token', token);
        }
      }
      if (userData) {
        sessionStorage.setItem('return_rescue_user', JSON.stringify(userData));
        if (isMgr) {
          sessionStorage.setItem('return_rescue_manager_user', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('return_rescue_customer_user', JSON.stringify(userData));
        }
      }
    }

    setUser(userData);
    return res.data;
  };

  const register = async (formData) => {
    const res = await api.register(formData);
    const { token, user: userData } = res.data;

    if (typeof window !== 'undefined') {
      if (token) {
        sessionStorage.setItem('return_rescue_token', token);
        sessionStorage.setItem('return_rescue_customer_token', token);
      }
      if (userData) {
        sessionStorage.setItem('return_rescue_user', JSON.stringify(userData));
        sessionStorage.setItem('return_rescue_customer_user', JSON.stringify(userData));
      }
    }

    setUser(userData);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore background logout errors
    } finally {
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        if (pathname.startsWith('/manager')) {
          sessionStorage.removeItem('return_rescue_manager_token');
          sessionStorage.removeItem('return_rescue_manager_user');
        } else if (pathname.startsWith('/customer')) {
          sessionStorage.removeItem('return_rescue_customer_token');
          sessionStorage.removeItem('return_rescue_customer_user');
        }
        sessionStorage.removeItem('return_rescue_token');
        sessionStorage.removeItem('return_rescue_user');
      }
      setUser(null);
    }
  };

  const updateProfile = async (profileData) => {
    const res = await api.updateProfile(profileData);
    const updatedUser = res.data;
    setUser(updatedUser);
    const isMgr = Boolean(updatedUser && (updatedUser.is_manager || updatedUser.profile?.role === 'MANAGER' || updatedUser.profile?.role === 'ADMIN'));

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('return_rescue_user', JSON.stringify(updatedUser));
      if (isMgr) {
        sessionStorage.setItem('return_rescue_manager_user', JSON.stringify(updatedUser));
      } else {
        sessionStorage.setItem('return_rescue_customer_user', JSON.stringify(updatedUser));
      }
    }
    return updatedUser;
  };

  const isManager = Boolean(user && (user.is_manager || user.profile?.role === 'MANAGER' || user.profile?.role === 'ADMIN'));
  const isCustomer = Boolean(user && !isManager);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isManager,
        isCustomer,
        login,
        register,
        logout,
        updateProfile,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
