import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import { notify } from '@/services/api';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types';

async function fetchProfileById(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, profile: null, loading: true,
  signOut: async () => {}, refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (user) { const p = await fetchProfileById(user.id); setProfile(p); }
  };

  useEffect(() => {
    let active = true;

    // The onAuthStateChange callback must not await Supabase calls (client
    // internals hold a lock during dispatch — awaiting there deadlocks), so
    // session + profile hydration happens here, driven by auth events.
    const hydrate = async (s: Session | null) => {
      if (!active) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await fetchProfileById(s.user.id);
        if (active) setProfile(p);
      } else if (active) {
        setProfile(null);
      }
      if (active) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      void hydrate(s);
      if (event === 'SIGNED_IN' && s?.user) {
        notify(s.user.id, {
          title: 'New sign-in detected',
          body: `Your account was signed in on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}. If this was not you, contact support immediately.`,
          type: 'security',
        });
      }
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); setProfile(null); };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
