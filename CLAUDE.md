# Voyageur — Travel App All-in-One

## Cosa è
App travel che permette di cercare, confrontare e prenotare voli, hotel, auto, attività e assicurazione in un unico checkout con dati pre-compilati. Dopo il booking gestisce documenti, refund policy con notifiche smart, requisiti visto automatici, e ricevute. Tutto funziona offline. Target: viaggiatori internazionali 25-40 anni.

## Stack
- Expo SDK 52+ con Expo Router (file-based routing)
- TypeScript strict
- Zustand per client state
- TanStack Query per server state
- expo-sqlite per database locale (offline-first)
- expo-secure-store per dati sensibili (passaporto)
- react-native-reanimated per animazioni

## Struttura cartelle
app/(onboarding)/ — flusso primo avvio (9 schermate)
app/(tabs)/ — le 5 tab principali (search, trips, docs, explore, profile)
src/components/ — componenti riutilizzabili
src/stores/ — Zustand stores
src/services/ — API calls
src/db/ — schema SQLite
src/constants/ — tema, colori, dati statici
src/types/ — TypeScript types

## Design
- Font: Outfit (body), Fraunces (titoli display)
- Accent: #C4593B (terracotta)
- Navy: #191A2C
- Teal: #1B8F6A
- Background: #FAF9F5
- Border radius: 10/14/20
- Estetica: warm minimal, iOS-native feel

## Regole
- Solo functional components
- StyleSheet.create() sempre, mai inline styles
- Gestire sempre loading, error, empty states
- Offline-first: tutto cached in SQLite
- Dati passaporto solo in expo-secure-store, mai su server
- Safe area insets su ogni schermata
- Non ejectare da Expo managed workflow
