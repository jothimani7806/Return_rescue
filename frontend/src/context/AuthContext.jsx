import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize user from isolated sessionStorage or fallback to persistent localStorage
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const pathname = window.location.pathname;
        if (pathname.startsWith('/manager')) {
          const mgrSaved = sessionStorage.getItem('return_rescue_manager_user') || localStorage.getItem('return_rescue_manager_user');
          if (mgrSaved) return JSON.parse(mgrSaved);
        } else if (pathname.startsWith('/customer')) {
          const custSaved = sessionStorage.getItem('return_rescue_customer_user') || localStorage.getItem('return_rescue_customer_user');
          if (custSaved) return JSON.parse(custSaved);
        }
        const saved = sessionStorage.getItem('return_rescue_user') || localStorage.getItem('return_rescue_user');
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
      token =
        sessionStorage.getItem('return_rescue_manager_token') ||
        sessionStorage.getItem('return_rescue_token') ||
        localStorage.getItem('return_rescue_manager_token') ||
        localStorage.getItem('return_rescue_token');
    } else if (pathname.startsWith('/customer')) {
      token =
        sessionStorage.getItem('return_rescue_customer_token') ||
        sessionStorage.getItem('return_rescue_token') ||
        localStorage.getItem('return_rescue_customer_token') ||
        localStorage.getItem('return_rescue_token');
    } else {
      token = sessionStorage.getItem('return_rescue_token') || localStorage.getItem('return_rescue_token');
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
      localStorage.setItem('return_rescue_token', token);
      localStorage.setItem('return_rescue_user', JSON.stringify(userData));

      if (isMgr) {
        sessionStorage.setItem('return_rescue_manager_token', token);
        sessionStorage.setItem('return_rescue_manager_user', JSON.stringify(userData));
        localStorage.setItem('return_rescue_manager_token', token);
        localStorage.setItem('return_rescue_manager_user', JSON.stringify(userData));
      } else {
        sessionStorage.setItem('return_rescue_customer_token', token);
        sessionStorage.setItem('return_rescue_customer_user', JSON.stringify(userData));
        localStorage.setItem('return_rescue_customer_token', token);
        localStorage.setItem('return_rescue_customer_user', JSON.stringify(userData));
      }
    } catch (err) {
      // Only clear tokens if the backend explicitly reports unauthorized (401)
      if (err.response?.status === 401) {
        sessionStorage.removeItem('return_rescue_token');
        sessionStorage.removeItem('return_rescue_user');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (username, password, portal = null) => {
    const res = await api.login({ username, password, portal });
    if (!res.data || typeof res.data !== 'object') {
      throw new Error('Unexpected response format from server. Please try again.');
    }
    const { token, user: userData } = res.data;
    if (!token || !userData) {
      throw new Error(res.data?.error || 'Authentication failed. Please verify your credentials.');
    }
    const isMgr = Boolean(userData && (userData.is_manager || userData.profile?.role === 'MANAGER' || userData.profile?.role === 'ADMIN'));

    // Clear previous credentials before saving new authenticated session
    if (typeof window !== 'undefined') {
      const keys = [
        'return_rescue_token',
        'return_rescue_user',
        'return_rescue_customer_token',
        'return_rescue_customer_user',
        'return_rescue_manager_token',
        'return_rescue_manager_user',
      ];
      keys.forEach((k) => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });

      if (token) {
        sessionStorage.setItem('return_rescue_token', token);
        localStorage.setItem('return_rescue_token', token);
        if (isMgr) {
          sessionStorage.setItem('return_rescue_manager_token', token);
          localStorage.setItem('return_rescue_manager_token', token);
        } else {
          sessionStorage.setItem('return_rescue_customer_token', token);
          localStorage.setItem('return_rescue_customer_token', token);
        }
      }
      if (userData) {
        const userJson = JSON.stringify(userData);
        sessionStorage.setItem('return_rescue_user', userJson);
        localStorage.setItem('return_rescue_user', userJson);
        if (isMgr) {
          sessionStorage.setItem('return_rescue_manager_user', userJson);
          localStorage.setItem('return_rescue_manager_user', userJson);
        } else {
          sessionStorage.setItem('return_rescue_customer_user', userJson);
          localStorage.setItem('return_rescue_customer_user', userJson);
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
      const keys = [
        'return_rescue_token',
        'return_rescue_user',
        'return_rescue_customer_token',
        'return_rescue_customer_user',
        'return_rescue_manager_token',
        'return_rescue_manager_user',
      ];
      keys.forEach((k) => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });

      if (token) {
        sessionStorage.setItem('return_rescue_token', token);
        sessionStorage.setItem('return_rescue_customer_token', token);
        localStorage.setItem('return_rescue_token', token);
        localStorage.setItem('return_rescue_customer_token', token);
      }
      if (userData) {
        const userJson = JSON.stringify(userData);
        sessionStorage.setItem('return_rescue_user', userJson);
        sessionStorage.setItem('return_rescue_customer_user', userJson);
        localStorage.setItem('return_rescue_user', userJson);
        localStorage.setItem('return_rescue_customer_user', userJson);
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
        const keys = [
          'return_rescue_token',
          'return_rescue_user',
          'return_rescue_customer_token',
          'return_rescue_customer_user',
          'return_rescue_manager_token',
          'return_rescue_manager_user',
        ];
        keys.forEach((k) => {
          sessionStorage.removeItem(k);
          localStorage.removeItem(k);
        });
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
      const userJson = JSON.stringify(updatedUser);
      sessionStorage.setItem('return_rescue_user', userJson);
      localStorage.setItem('return_rescue_user', userJson);
      if (isMgr) {
        sessionStorage.setItem('return_rescue_manager_user', userJson);
        localStorage.setItem('return_rescue_manager_user', userJson);
      } else {
        sessionStorage.setItem('return_rescue_customer_user', userJson);
        localStorage.setItem('return_rescue_customer_user', userJson);
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
