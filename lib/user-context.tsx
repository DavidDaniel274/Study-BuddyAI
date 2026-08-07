'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { store, ensureSeed, uid } from '@/lib/store';

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  theme: string;
  daily_goal_minutes: number;
  onboarded: boolean;
  pomodoro_focus: number;
  pomodoro_break: number;
  notifications_enabled: boolean;
};

type UserContextValue = {
  userId: string | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
};

const UserContext = createContext<UserContextValue>({
  userId: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  updateProfile: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (id: string) => {
    const { data } = await store.from('profiles').select().eq('id', id).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    ensureSeed();
    const id = uid();
    setUserId(id);
    loadProfile(id).finally(() => setLoading(false));
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId);
  }, [userId, loadProfile]);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!userId) return;
      await store.from('profiles').update(patch).eq('id', userId);
      setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [userId]
  );

  return (
    <UserContext.Provider
      value={{ userId, profile, loading, refreshProfile, updateProfile }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
