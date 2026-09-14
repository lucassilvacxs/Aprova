import { create } from 'zustand';
import { authService, AuthUser as ServiceAuthUser } from '../services/auth.service';

// ── Theme Store ────────────────────────────────────────────────────────────────
interface ThemeStore {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  isDark: true,
  toggleTheme: () => {
    const next = !get().isDark;
    set({ isDark: next });
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('aprova-theme', next ? 'dark' : 'light');
  },
}));

// Initialize theme from localStorage on load
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('aprova-theme');
  const isDark = saved !== 'light';
  document.documentElement.classList.toggle('dark', isDark);
  useThemeStore.setState({ isDark });
}

// ── Sidebar Store ──────────────────────────────────────────────────────────────
interface SidebarStore {
  isOpen: boolean;
  isMobileOpen: boolean;
  toggle: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isOpen: true,
  isMobileOpen: false,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  openMobile: () => set({ isMobileOpen: true }),
  closeMobile: () => set({ isMobileOpen: false }),
}));

// ── Auth Store (Conectado à API Real da FASE 3) ─────────────────────────────────
export interface AuthUser extends ServiceAuthUser {
  initials?: string;
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => {
    const initials = user
      ? user.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : '??';

    set({
      user: user ? { ...user, initials } : null,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },

  checkSession: async () => {
    const token = localStorage.getItem('aprova-token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const user = await authService.getMe();
      const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      set({
        user: { ...user, initials },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('aprova-token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));

export { useContestStore } from './useContestStore';
