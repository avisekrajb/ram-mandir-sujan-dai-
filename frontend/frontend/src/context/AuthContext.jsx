import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import {
  getToken, setToken, removeToken, setUser, getUser, removeUser,
  isSessionEndedError, isRestrictedUser, requestPersistentStorage,
  SESSION_ENDED_EVENT, ACCOUNT_RESTRICTED_EVENT,
} from '../services/auth';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const lastVerifiedAt = useRef(0);
  const retryTimer = useRef(null);
  const [restrictedUntil, setRestrictedUntil] = useState(null);

  // Confirm the saved login with the server, in the background, and pick up a
  // renewed token. Only a server answer that says the session is over signs the
  // person out (api.js clears the storage and raises SESSION_ENDED_EVENT). A
  // network error, a timeout or a 5xx leaves the saved login alone and is
  // retried, so restarting the backend or a flaky connection never asks anyone
  // to log in again.
  const verifySession = useCallback(async (attempt = 0) => {
    if (!getToken()) return;
    clearTimeout(retryTimer.current);
    try {
      const response = await api.get('/auth/me');
      lastVerifiedAt.current = Date.now();
      if (response.data.token) {
        setToken(response.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
      if (response.data.user) {
        const merged = { ...(getUser() || {}), ...response.data.user };
        setUserState(merged);
        setUser(merged);
      }
    } catch (error) {
      if (isSessionEndedError(error)) return;
      if (attempt < 4) {
        const wait = [2000, 5000, 15000, 45000][attempt];
        retryTimer.current = setTimeout(() => verifySession(attempt + 1), wait);
      }
    }
  }, []);

  // Initialize auth on mount. The saved login is trusted immediately so a page
  // (including the admin panel) opens without waiting on the network.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      const token = getToken();
      const storedUser = getUser();
      if (token && storedUser) {
        setUserState(storedUser);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        requestPersistentStorage();
        verifySession();
      } else if (token || storedUser) {
        // Half a login (one key lost) cannot be used: clear it.
        removeToken();
        removeUser();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  }, [verifySession]);

  // The server ended the session (disabled account, password reset elsewhere...).
  useEffect(() => {
    const onEnded = () => {
      clearTimeout(retryTimer.current);
      setUserState(null);
    };
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, []);

  // Several tabs share one login: signing in or out in one is mirrored in the rest.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== null && e.key !== 'token' && e.key !== 'user') return;
      const token = getToken();
      const storedUser = getUser();
      if (token && storedUser) {
        setUserState(storedUser);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        setUserState(null);
        delete api.defaults.headers.common['Authorization'];
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Back online, or the tab is shown again after a while: re-check (this also
  // renews a token that is getting old).
  useEffect(() => {
    const recheck = () => {
      if (!getToken()) return;
      if (Date.now() - lastVerifiedAt.current > 30 * 60 * 1000) verifySession();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') recheck();
    };
    window.addEventListener('online', recheck);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', recheck);
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(retryTimer.current);
    };
  }, [verifySession]);

  // Login function
  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      
      // Store token and user data
      setToken(token);
      setUser(userData);
      setUserState(userData);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      lastVerifiedAt.current = Date.now();
      requestPersistentStorage();

      return { success: true, user: userData };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  }, []);

  // Signup function
  const signup = useCallback(async (userData) => {
    try {
      const response = await api.post('/auth/signup', userData);
      const { token, user: newUser } = response.data;
      
      // Store token and user data
      setToken(token);
      setUser(newUser);
      setUserState(newUser);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      lastVerifiedAt.current = Date.now();
      requestPersistentStorage();

      return { success: true, user: newUser };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Signup failed' 
      };
    }
  }, []);

  // Google OAuth Login
  const googleAuth = useCallback(async (userData) => {
    try {
      const response = await api.post('/auth/google', userData);
      const { token, user: googleUser } = response.data;
      
      // Store token and user data
      setToken(token);
      setUser(googleUser);
      setUserState(googleUser);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      lastVerifiedAt.current = Date.now();
      requestPersistentStorage();

      return { success: true, user: googleUser };
    } catch (error) {
      console.error('Google auth error:', error?.message);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Google authentication failed' 
      };
    }
  }, []);

  // Sign in with a 6-digit code emailed to the person (the way in when Google fails).
  // The code is asked for with a plain POST /auth/login-code/request from the login
  // modal; this checks it and starts the session like login() does. A visitor with no
  // account yet gets one (isNewAccount).
  const loginWithCode = useCallback(async (email, code) => {
    try {
      const response = await api.post('/auth/login-code/verify', { email, code });
      const { token, user: codeUser, isNewAccount } = response.data;

      setToken(token);
      setUser(codeUser);
      setUserState(codeUser);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      lastVerifiedAt.current = Date.now();
      requestPersistentStorage();

      return { success: true, user: codeUser, isNewAccount: !!isNewAccount };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status,
        code: error.response?.data?.code,
        error: error.response?.data?.message || 'Sign in failed',
      };
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    removeToken();
    removeUser();
    setUserState(null);
    delete api.defaults.headers.common['Authorization'];
  }, []);

  // Update user function
  const updateUser = useCallback((updatedUser) => {
    setUserState(updatedUser);
    setUser(updatedUser);
  }, []);

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return null;
      
      const response = await api.get('/auth/me');
      if (response.data.user) {
        const updatedUser = { ...user, ...response.data.user };
        setUserState(updatedUser);
        setUser(updatedUser);
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('Refresh user error:', error);
      return null;
    }
  }, [user]);

  // The server refused a call because this account is suspended for a while.
  // The saved login stays; only where the person may go changes.
  useEffect(() => {
    const onRestricted = (e) => {
      setRestrictedUntil(e.detail?.until || getUser()?.suspendedUntil || null);
      refreshUser();
    };
    window.addEventListener(ACCOUNT_RESTRICTED_EVENT, onRestricted);
    return () => window.removeEventListener(ACCOUNT_RESTRICTED_EVENT, onRestricted);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-registers when refreshUser changes
  }, [refreshUser]);

  // Check if user is admin
  const isAdmin = useCallback(() => {
    return user?.role === 'admin' || user?.role === 'superadmin';
  }, [user]);

  // Suspended for a while: signed in, but held to the home page.
  const restricted = useCallback(() => isRestrictedUser(user), [user]);

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!user && !!getToken();
  }, [user]);

  // Get user's display name
  const getDisplayName = useCallback(() => {
    return user?.name || 'User';
  }, [user]);

  // Get user's profile photo
  const getProfilePhoto = useCallback(() => {
    return user?.profilePhoto || null;
  }, [user]);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        login, 
        signup,
        googleAuth,
        loginWithCode,
        logout,
        setUser: updateUser,
        refreshUser,
        isAdmin,
        isAuthenticated,
        // Timed suspension: signed in, home page only.
        restricted,
        suspendedUntil: restricted() ? user?.suspendedUntil || restrictedUntil : null,
        getDisplayName,
        getProfilePhoto,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};