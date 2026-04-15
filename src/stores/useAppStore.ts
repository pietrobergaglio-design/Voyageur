import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserPreferences {
  currency: string;
  language: string;
  notifications: boolean;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  nationality: string;
}

interface AppState {
  _hasHydrated: boolean;
  isOnboardingComplete: boolean;
  userPreferences: UserPreferences;
  userProfile: UserProfile | null;

  setHasHydrated: (value: boolean) => void;
  setOnboardingComplete: (value: boolean) => void;
  setUserPreferences: (prefs: Partial<UserPreferences>) => void;
  setUserProfile: (profile: UserProfile | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      isOnboardingComplete: false,
      userPreferences: {
        currency: 'EUR',
        language: 'it',
        notifications: true,
      },
      userProfile: null,

      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setOnboardingComplete: (value) => set({ isOnboardingComplete: value }),
      setUserPreferences: (prefs) =>
        set((state) => ({
          userPreferences: { ...state.userPreferences, ...prefs },
        })),
      setUserProfile: (profile) => set({ userProfile: profile }),
    }),
    {
      name: 'voyageur-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isOnboardingComplete: state.isOnboardingComplete,
        userPreferences: state.userPreferences,
        userProfile: state.userProfile,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
