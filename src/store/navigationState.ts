import { create } from 'zustand';

// -----------------------------
// Screen Types (from your documents)
// -----------------------------

export type Screen =
  | 'scenario_overview'
  | 'overview'
  | 'evidence'
  | 'conversation_flow'
  | 'conversation'
  | 'commitment_builder'
  | 'closing'
  | 'scoring'
  | 'feedback';

// -----------------------------
// Navigation State Interface
// -----------------------------

export interface NavigationState {
  currentScreen: Screen;

  // Actions
  setCurrentScreen: (screen: Screen) => void;
  resetNavigation: () => void;
}

// -----------------------------
// Zustand Store
// -----------------------------

export const useNavigationState = create<NavigationState>((set) => ({
  currentScreen: 'overview',

  setCurrentScreen: (screen) => set({ currentScreen: screen }),

  resetNavigation: () =>
    set({
      currentScreen: 'overview',
    }),
}));
