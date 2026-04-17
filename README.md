# Voyageur

An all-in-one travel app for searching, comparing, and booking flights, hotels, rental cars, activities, and insurance — all in a single checkout. Built for international travellers aged 25–40.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo SDK 54](https://expo.dev/) + [Expo Router](https://expo.github.io/router/) (file-based routing) |
| Language | TypeScript (strict) |
| UI | React Native + react-native-reanimated |
| State | [Zustand](https://github.com/pmndrs/zustand) (persistent via AsyncStorage) |
| Server state | [TanStack Query](https://tanstack.com/query) |
| Secure storage | expo-secure-store (passport number only) |
| Local DB | expo-sqlite (offline-first cache) |
| Fonts | Outfit (body), Fraunces (display) |
| APIs | Duffel (flights), Booking.com via RapidAPI (hotels, activities), Anthropic Claude (AI itinerary) |

---

## Local Setup

### Prerequisites

- Node.js 20+
- npm or yarn
- [Expo Go](https://expo.dev/go) on your phone (for device testing), or Xcode for iOS Simulator

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/voyageur.git
cd voyageur

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Open .env and fill in your API keys (see comments inside the file)

# 4. Start the dev server
npx expo start
```

> **Note:** `EXPO_PUBLIC_*` variables are baked into the bundle at build time.  
> After changing `.env` you must restart Metro with `npx expo start --clear`.

---

## Testing

### iOS Simulator (requires Xcode)

```bash
npx expo start --ios
```

### Android Emulator (requires Android Studio)

```bash
npx expo start --android
```

### Physical Device (no Xcode needed)

1. Install **Expo Go** from the App Store or Play Store.
2. Run `npx expo start`.
3. Scan the QR code shown in the terminal with your phone camera (iOS) or the Expo Go app (Android).

---

## Project Structure

```
voyageur/
├── app/                        # Expo Router screens (file-based routing)
│   ├── (onboarding)/           # 10-step onboarding flow
│   ├── (tabs)/                 # Main 5-tab navigation
│   │   ├── search.tsx          # Search + results + cart
│   │   ├── trips.tsx           # Draft & booked trips list
│   │   ├── docs.tsx            # Booking documents & tickets
│   │   ├── explore.tsx         # Destination info (visa, health, tips)
│   │   └── profile.tsx         # User profile & preferences
│   ├── checkout/               # 5-step checkout flow
│   └── trip/[id].tsx           # Trip detail + AI itinerary
│
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── search/             # FlightCard, HotelCard, CarCard, etc.
│   │   ├── trips/              # TripCard, TripTimeline
│   │   ├── onboarding/         # OnboardingBackground, TagPill, etc.
│   │   └── common/             # Toast, etc.
│   ├── services/               # API clients
│   │   ├── duffel.ts           # Flights (real API)
│   │   ├── booking.ts          # Hotels (real API via RapidAPI)
│   │   ├── activities.ts       # Attractions (real API via RapidAPI)
│   │   ├── cars.ts             # Car rental (smart mock — API free tier unsupported)
│   │   ├── visa.ts             # Visa requirements (hardcoded lookup table)
│   │   └── ai-itinerary.ts     # AI day-by-day itinerary (Claude API)
│   ├── stores/                 # Zustand state
│   │   ├── useAppStore.ts      # User profile + trips (persisted)
│   │   └── useCheckoutStore.ts # Checkout flow (in-memory)
│   ├── types/                  # TypeScript interfaces
│   │   ├── booking.ts          # FlightOffer, HotelOffer, CarOffer, etc.
│   │   ├── trip.ts             # Trip, TripItem
│   │   └── checkout.ts         # CheckoutSnapshot, TravelerInfo
│   ├── constants/
│   │   └── theme.ts            # Colors, FontFamily, FontSize, Spacing, Radius
│   └── data/                   # Mock / seed data
│
└── assets/                     # Fonts, images, icons
```

---

## Internal Documentation

- [`CLAUDE.md`](./CLAUDE.md) — Codebase conventions, design system rules, stack decisions
- [`AGENTS.md`](./AGENTS.md) — Multi-agent workflow for feature development (ARCHITECT → BUILDER → FRONTEND → REVIEWER → FIXER)

---

## Environment Variables

See [`.env.example`](./.env.example) for the full list with instructions on where to obtain each key.
