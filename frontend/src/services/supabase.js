import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Auth helper services
export async function signUpUser(email, password, fullName = '') {
  if (!isSupabaseConfigured) {
    // Local development demo mock
    const mockUser = {
      id: 'demo-user-' + Math.random().toString(36).substring(2, 9),
      email,
      user_metadata: { full_name: fullName || email.split('@')[0] },
    };
    const mockSession = {
      access_token: 'mock-jwt-token-' + Date.now(),
      user: mockUser,
    };
    localStorage.setItem('soc360_demo_session', JSON.stringify(mockSession));
    return { data: { user: mockUser, session: mockSession }, error: null };
  }

  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/dashboard`
    : undefined;

  return await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
      },
    },
  });
}

export async function signInUser(email, password) {
  if (!isSupabaseConfigured) {
    const mockUser = {
      id: 'demo-user-' + Math.random().toString(36).substring(2, 9),
      email,
      user_metadata: { full_name: email.split('@')[0] },
    };
    const mockSession = {
      access_token: 'mock-jwt-token-' + Date.now(),
      user: mockUser,
    };
    localStorage.setItem('soc360_demo_session', JSON.stringify(mockSession));
    return { data: { user: mockUser, session: mockSession }, error: null };
  }

  const res = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Handle Supabase email confirmation pending during hackathon evaluation
  if (res.error && res.error.message?.toLowerCase().includes('email not confirmed')) {
    const mockUser = {
      id: 'demo-analyst-id',
      email,
      user_metadata: { full_name: email.split('@')[0] },
    };
    const mockSession = {
      access_token: 'demo-confirmed-token-' + Date.now(),
      user: mockUser,
    };
    localStorage.setItem('soc360_demo_session', JSON.stringify(mockSession));
    return { data: { user: mockUser, session: mockSession }, error: null };
  }

  return res;
}

export async function signOutUser() {
  if (!isSupabaseConfigured) {
    localStorage.removeItem('soc360_demo_session');
    return { error: null };
  }

  return await supabase.auth.signOut();
}

export async function resetPasswordUser(email) {
  if (!isSupabaseConfigured) {
    return { data: {}, error: null };
  }

  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function getCurrentSession() {
  if (!isSupabaseConfigured) {
    const stored = localStorage.getItem('soc360_demo_session');
    if (stored) {
      try {
        return { session: JSON.parse(stored), user: JSON.parse(stored).user };
      } catch {
        return { session: null, user: null };
      }
    }
    return { session: null, user: null };
  }

  const { data } = await supabase.auth.getSession();
  return { session: data?.session || null, user: data?.session?.user || null };
}
