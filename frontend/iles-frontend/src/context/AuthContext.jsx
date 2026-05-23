/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, usersAPI } from '../services/endpoints';

const AuthContext = createContext(undefined);

const REMEMBER_ME_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
const DEFAULT_SESSION_MS      =      2 * 60 * 60 * 1000;  //  2 hours  (no remember-me)


const isSessionValid = () => {
  const loginTime   = localStorage.getItem('loginTime');
  const rememberMe  = localStorage.getItem('rememberMe') === 'true';

  if (!loginTime) return false;

  const elapsed  = Date.now() - parseInt(loginTime, 10);
  const maxAge   = rememberMe ? REMEMBER_ME_DURATION_MS : DEFAULT_SESSION_MS;
  return elapsed < maxAge;
};

const clearSession = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('loginTime');
  localStorage.removeItem('rememberMe');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]         = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(
    () => !!localStorage.getItem('accessToken') && isSessionValid()
  );

  const refreshUser = useCallback(async () => {
    const userData = await usersAPI.getCurrentUser();
    let settings = null;
    try {
      settings = await usersAPI.getCurrentUserSettings();
    } catch (e) {
      // ignore settings fetch errors
    }
    setUser(userData);
    setUserSettings(settings);
    return { user: userData, settings };
  }, []);

  // ── On mount: restore session if still valid ─────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    if (token && isSessionValid()) {
      Promise.all([usersAPI.getCurrentUser(), usersAPI.getCurrentUserSettings()])
        .then(([u, s]) => {
          setUser(u);
          setUserSettings(s);
        })
        .catch(() => clearSession())
        .finally(() => setIsLoading(false));
    } else {
      // Token exists but session expired — clean up silently
      if (token) clearSession();
      setIsLoading(false);
    }
  }, []);

  /**
   * login(email, password, rememberMe?)
   *
   * Now accepts an optional rememberMe boolean (default false).
   * Login.jsx passes it so the session duration is set correctly.
   */
  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await authAPI.login(email, password);

      localStorage.setItem('accessToken',  response.access);
      localStorage.setItem('refreshToken', response.refresh);
      localStorage.setItem('loginTime',    Date.now().toString());
      localStorage.setItem('rememberMe',   rememberMe.toString());

      const userData = await usersAPI.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const value = {
    user,
    userSettings,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};