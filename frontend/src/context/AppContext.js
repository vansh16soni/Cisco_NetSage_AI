// src/context/AppContext.js
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loginUser, registerUser, getMe } from '../api/client';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('netsage_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('netsage_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [reviewerName, setReviewerName] = useState(() => {
    try {
      const stored = localStorage.getItem('netsage_user');
      if (stored) {
        const u = JSON.parse(stored);
        return u.name || 'Junior Engineer';
      }
    } catch {}
    return 'Junior Engineer';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('netsage_token');
    localStorage.removeItem('netsage_user');
    setToken(null);
    setUser(null);
    setReviewerName('Junior Engineer');
    showToast('Logged out successfully.', 'info');
  }, [showToast]);

  // Sync token validation on mount if token exists
  useEffect(() => {
    if (token) {
      getMe()
        .then((res) => {
          if (res?.user) {
            setUser(res.user);
            localStorage.setItem('netsage_user', JSON.stringify(res.user));
            if (res.user.name) setReviewerName(res.user.name);
          }
        })
        .catch(() => {
          // Token expired or invalid
          logout();
        });
    }
  }, [token, logout]);

  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    if (res.token && res.user) {
      localStorage.setItem('netsage_token', res.token);
      localStorage.setItem('netsage_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      if (res.user.name) setReviewerName(res.user.name);
      setIsAuthModalOpen(false);
      showToast(`Welcome back, ${res.user.name} (${res.user.role.toUpperCase()})!`, 'success');
      return res.user;
    }
  };

  const register = async (name, email, password) => {
    const res = await registerUser({ name, email, password });
    if (res.token && res.user) {
      localStorage.setItem('netsage_token', res.token);
      localStorage.setItem('netsage_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      if (res.user.name) setReviewerName(res.user.name);
      setIsAuthModalOpen(false);
      showToast(`Account created! Logged in as ${res.user.name}.`, 'success');
      return res.user;
    }
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const isAdmin = user?.role === 'admin';

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        isAdmin,
        login,
        register,
        logout,
        reviewerName,
        setReviewerName,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        toast,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
