'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured, Profile } from '@/lib/supabase';

interface AuthContextValue {
  user:                User | null;
  profile:             Profile | null;
  loading:             boolean;
  isAdmin:             boolean;
  hasCompletedProfile: boolean;
  configured:          boolean;
  login:               (email: string, password: string) => Promise<void>;
  loginWithGoogle:     () => Promise<void>;
  logout:              () => Promise<void>;
  refreshProfile:      () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) console.error('[Auth] 프로필 로드 실패:', error.message);
    if (data) setProfile(data as Profile);
    else console.warn('[Auth] 프로필 없음 — userId:', userId);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    if (!supabaseConfigured) throw new Error('Supabase가 설정되지 않았습니다.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!supabaseConfigured) throw new Error('Supabase가 설정되지 않았습니다.');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding` },
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    if (!supabaseConfigured) return;
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const isAdmin             = profile?.role === 'admin';
  const hasCompletedProfile = !!(profile?.name?.trim());

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      isAdmin, hasCompletedProfile,
      configured: supabaseConfigured,
      login, loginWithGoogle, logout, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
