import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Trip, TripStatus } from '../types/trip';

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

export interface OnboardingData {
  adventure: number;
  food: number;
  pace: number;
  budget: number;
  experience: number;
  accommodation: string[];
  transport: string[];
  companion: string;
  childAges: string[];
  interests: string[];
  firstName: string;
  lastName: string;
  nationality: string;
}

const defaultOnboarding: OnboardingData = {
  adventure: 50,
  food: 50,
  pace: 50,
  budget: 50,
  experience: 50,
  accommodation: [],
  transport: [],
  companion: '',
  childAges: [],
  interests: [],
  firstName: '',
  lastName: '',
  nationality: '',
};

interface AppState {
  _hasHydrated: boolean;
  isOnboardingComplete: boolean;
  userPreferences: UserPreferences;
  userProfile: UserProfile | null;
  onboardingData: OnboardingData;
  trips: Trip[];

  setHasHydrated: (value: boolean) => void;
  setOnboardingComplete: (value: boolean) => void;
  setUserPreferences: (prefs: Partial<UserPreferences>) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setOnboardingData: (data: Partial<OnboardingData>) => void;
  addTrip: (trip: Trip) => void;
  updateTripStatus: (id: string, status: TripStatus) => void;
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
      onboardingData: defaultOnboarding,
      trips: [],

      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setOnboardingComplete: (value) => set({ isOnboardingComplete: value }),
      setUserPreferences: (prefs) =>
        set((state) => ({
          userPreferences: { ...state.userPreferences, ...prefs },
        })),
      setUserProfile: (profile) => set({ userProfile: profile }),
      setOnboardingData: (data) =>
        set((state) => ({
          onboardingData: { ...state.onboardingData, ...data },
        })),
      addTrip: (trip) =>
        set((state) => ({
          trips: [trip, ...state.trips],
        })),
      updateTripStatus: (id, status) =>
        set((state) => ({
          trips: state.trips.map((t) => (t.id === id ? { ...t, status } : t)),
        })),
    }),
    {
      name: 'voyageur-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isOnboardingComplete: state.isOnboardingComplete,
        userPreferences: state.userPreferences,
        userProfile: state.userProfile,
        onboardingData: state.onboardingData,
        trips: state.trips,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
