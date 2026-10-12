import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  signUpUser,
  signInUser,
  signOutUser,
  resetPasswordUser,
  getCurrentSession,
} from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);

  // In-memory guest scan results (never persisted in browser storage or database!)
  const [guestScanResults, setGuestScanResults] = useState(null);

  useEffect(() => {
    async function initAuth() {
      try {
        const { session: initialSession, user: initialUser } = await getCurrentSession();
        if (initialSession && initialUser) {
          setSession(initialSession);
          setUser(initialUser);
          setIsGuest(false);
        } else {
          setIsGuest(true);
        }
      } catch (err) {
        console.warn('Failed to retrieve initial auth session:', err);
        setIsGuest(true);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    if (isSupabaseConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            setIsGuest(false);
          } else {
            setSession(null);
            setUser(null);
            setIsGuest(true);
          }
          setLoading(false);
        }
      );

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  const login = async (email, password) => {
    const res = await signInUser(email, password);
    if (!res.error && res.data?.session) {
      setSession(res.data.session);
      setUser(res.data.user);
      setIsGuest(false);
    }
    return res;
  };

  const signup = async (email, password, fullName) => {
    const res = await signUpUser(email, password, fullName);
    if (!res.error && res.data?.session) {
      setSession(res.data.session);
      setUser(res.data.user);
      setIsGuest(false);
    }
    return res;
  };

  const logout = async () => {
    await signOutUser();
    setSession(null);
    setUser(null);
    setIsGuest(true);
    setGuestScanResults(null);
  };

  const resetPassword = async (email) => {
    return await resetPasswordUser(email);
  };

  const continueAsGuest = () => {
    setIsGuest(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isGuest,
        guestScanResults,
        setGuestScanResults,
        login,
        signup,
        logout,
        resetPassword,
        continueAsGuest,
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
