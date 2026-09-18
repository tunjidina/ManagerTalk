import { create } from 'zustand';

// -----------------------------
// Types
// -----------------------------

export type AuthStatus = 'loading' | 'signed_in' | 'signed_out';

/**
 * Only what the UI needs. The full Firebase User object is deliberately not
 * stored — keeping this plain makes the store serialisable and keeps the
 * Firebase SDK out of every component that wants the signed-in email.
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;

  setAuthenticated: (user: AuthUser) => void;
  setSignedOut: () => void;
  resetAuth: () => void;
}

// -----------------------------
// Zustand Store
// -----------------------------

export const useAuthState = create<AuthState>((set) => ({
  // Starts as 'loading': Firebase restores a persisted session
  // asynchronously, so the app must not decide "signed out" before
  // onAuthStateChanged has fired once.
  status: 'loading',
  user: null,

  setAuthenticated: (user) => set({ status: 'signed_in', user }),
  setSignedOut: () => set({ status: 'signed_out', user: null }),

  resetAuth: () =>
    set({
      status: 'loading',
      user: null
    })
}));
