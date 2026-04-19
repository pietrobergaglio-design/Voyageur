import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CityStopCard } from './CityStopCard';
import { suggestCityDivision, AICityDivisionError } from '../../services/ai-city-division';
import { searchPlaces } from '../../services/places';
import { getCityPhotoData, getSuggestedCities } from '../../data/city-photos';
import type { CityStop, TransportSuggestion, AICityDivision } from '../../types/multi-city';
import type { SearchParams } from '../../types/booking';
import type { PlaceSuggestion } from '../../types/places';
import type { OnboardingData } from '../../stores/useAppStore';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../constants/theme';

const WINDOW_HEIGHT = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  searchParams: SearchParams;
  profile: OnboardingData;
  onClose: () => void;
  onApply: (stops: CityStop[], transport: TransportSuggestion[]) => void;
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function countryFromDestination(destination: string): string {
  const parts = destination.split(',');
  return parts[parts.length - 1].trim();
}

function buildInitialStop(name: string, country: string, startDate: string, nights: number, isBase: boolean): CityStop {
  const photoData = getCityPhotoData(name, country);
  return {
    id: `city-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    name,
    country,
    photoUrl: photoData.photoUrl ?? undefined,
    gradientColors: photoData.gradientColors,
    flagEmoji: photoData.flagEmoji,
    startDate,
    endDate: addDays(startDate, nights),
    nights,
    selectedHotel: undefined,
    selectedActivities: [],
    isBase,
  };
}

function rebuildDates(stops: CityStop[]): CityStop[] {
  let cursor = stops[0]?.startDate ?? isoDate(new Date());
  return stops.map((stop) => {
    const s = { ...stop, startDate: cursor, endDate: addDays(cursor, stop.nights) };
    cursor = s.endDate;
    return s;
  });
}

const AI_LOADING_MESSAGES = [
  'Analizzo il tuo profilo...',
  'Curando il tuo tour...',
  'Bilanciando i giorni...',
  'Quasi pronto...',
];

export function MultiCityPanel({ visible, searchParams, profile, onClose, onApply }: Props) {
  const insets = useSafeAreaInsets();

  const totalDays = Math.max(
    1,
    Math.round((searchParams.checkOut.getTime() - searchParams.checkIn.getTime()) / 86_400_000),
  );
  const baseCityName = searchParams.destination.split(',')[0].trim();
  const country = countryFromDestination(searchParams.destination);
  const baseStartDate = isoDate(searchParams.checkIn);

  const [stops, setStops] = useState<CityStop[]>(() => [
    buildInitialStop(baseCityName, country, baseStartDate, totalDays, true),
  ]);
  const [transport, setTransport] = useState<TransportSuggestion[]>([]);

  const [showAddCity, setShowAddCity] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [pendingCityName, setPendingCityName] = useState<string | null>(null);
  const [pendingNights, setPendingNights] = useState(1);

  // Live autocomplete from Duffel
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingMsg, setAiLoadingMsg] = useState('');
  const [aiResult, setAiResult] = useState<AICityDivision | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const assignedNights = stops.reduce((s, c) => s + c.nights, 0);
  const remainingNights = totalDays - assignedNights;
  // Nights that can be stolen from existing cities (each city keeps min 1 night)
  const stealableNights = stops.reduce((tot, s) => tot + Math.max(0, s.nights - 1), 0);
  const canAddMore = remainingNights > 0 || stealableNights > 0;
  const maxPendingNights = remainingNights + stealableNights;
  const isValid = assignedNights === totalDays && stops.length > 1;

  const staticSuggestions = getSuggestedCities(country).filter(
    (c) => !stops.find((s) => s.name.toLowerCase() === c.toLowerCase()),
  );

  // Debounced Duffel search
  useEffect(() => {
    if (cityQuery.length < 2) {
      setPlaceSuggestions([]);
      setPlacesLoading(false);
      return;
    }
    setPlacesLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(cityQuery);
        // Keep only entries where we have a real city name, then deduplicate
        const seen = new Set<string>();
        const deduped = results
          .filter((r) => r.type === 'city' || (r.type === 'airport' && !!r.cityName))
          .filter((r) => {
            const key = (r.cityName ?? r.name).toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        setPlaceSuggestions(deduped);
      } catch {
        // AbortError or network error — keep previous results
      } finally {
        setPlacesLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cityQuery]);

  const updateStop = useCallback((id: string, updates: Partial<CityStop>) => {
    setStops((prev) => {
      const updated = prev.map((s) => s.id === id ? { ...s, ...updates } : s);
      return rebuildDates(updated);
    });
  }, []);

  const changeNights = useCallback((id: string, delta: number) => {
    setStops((prev) => {
      const stop = prev.find((s) => s.id === id);
      if (!stop) return prev;
      const newNights = Math.max(1, stop.nights + delta);
      const newAssigned = assignedNights + (newNights - stop.nights);
      if (newAssigned > totalDays) return prev;
      const updated = prev.map((s) => s.id === id ? { ...s, nights: newNights } : s);
      return rebuildDates(updated);
    });
  }, [assignedNights, totalDays]);

  const removeStop = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStops((prev) => rebuildDates(prev.filter((s) => s.id !== id)));
  }, []);

  const moveStop = useCallback((fromIdx: number, toIdx: number) => {
    setStops((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      if (!arr[0].isBase) {
        const baseIdx = arr.findIndex((s) => s.isBase);
        if (baseIdx > 0) {
          const [base] = arr.splice(baseIdx, 1);
          arr.unshift(base);
        }
      }
      return rebuildDates(arr);
    });
  }, []);

  const confirmAddCity = useCallback(() => {
    if (!pendingCityName) return;
    const nights = Math.max(1, Math.min(pendingNights, maxPendingNights));

    let updatedStops = [...stops];

    // If we don't have enough remaining nights, steal from the city with the most nights
    const needed = nights - Math.max(0, remainingNights);
    if (needed > 0) {
      let leftToSteal = needed;
      // Sort by nights descending, steal from largest first
      const order = [...updatedStops].sort((a, b) => b.nights - a.nights);
      for (const donor of order) {
        if (leftToSteal <= 0) break;
        const canSteal = donor.nights - 1;
        if (canSteal <= 0) continue;
        const steal = Math.min(leftToSteal, canSteal);
        updatedStops = updatedStops.map((s) =>
          s.id === donor.id ? { ...s, nights: s.nights - steal } : s,
        );
        leftToSteal -= steal;
      }
    }

    const newStop = buildInitialStop(pendingCityName, country, baseStartDate, nights, false);
    setStops(rebuildDates([...updatedStops, newStop]));
    setPendingCityName(null);
    setCityQuery('');
    setPendingNights(1);
    setShowAddCity(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [pendingCityName, pendingNights, maxPendingNights, remainingNights, stops, country, baseStartDate]);

  const handleAI = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    let msgIdx = 0;
    setAiLoadingMsg(AI_LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % AI_LOADING_MESSAGES.length;
      setAiLoadingMsg(AI_LOADING_MESSAGES[msgIdx]);
    }, 1800);

    try {
      const result = await suggestCityDivision({
        destination: baseCityName,
        country,
        totalDays,
        profile,
      });
      setAiResult(result);

      const newStops: CityStop[] = [];
      let cursor = baseStartDate;
      for (const city of result.cities) {
        const photoData = getCityPhotoData(city.name, country);
        newStops.push({
          id: `city-${city.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random()}`,
          name: city.name,
          country,
          photoUrl: photoData.photoUrl ?? undefined,
          gradientColors: photoData.gradientColors,
          flagEmoji: photoData.flagEmoji,
          startDate: cursor,
          endDate: addDays(cursor, city.nights),
          nights: city.nights,
          selectedHotel: undefined,
          selectedActivities: [],
          isBase: city.isBase ?? city.name.toLowerCase() === baseCityName.toLowerCase(),
        });
        cursor = addDays(cursor, city.nights);
      }
      setStops(newStops);
      setTransport(result.transport_suggestions ?? []);
    } catch (err) {
      const msg = err instanceof AICityDivisionError ? err.message : 'Errore sconosciuto';
      setAiError(msg);
    } finally {
      clearInterval(interval);
      setAiLoading(false);
    }
  }, [baseCityName, country, totalDays, profile, baseStartDate]);

  const handleApply = useCallback(() => {
    if (!isValid) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApply(stops, transport);
  }, [isValid, stops, transport, onApply]);

  const handleOpenAddCity = useCallback(() => {
    setPendingCityName(null);
    setCityQuery('');
    setPendingNights(1);
    setPlaceSuggestions([]);
    setShowAddCity(true);
  }, []);

  const handleCloseAddCity = useCallback(() => {
    setShowAddCity(false);
    setCityQuery('');
    setPendingCityName(null);
    setPlaceSuggestions([]);
  }, []);

  const handleSelectSuggestion = useCallback((name: string) => {
    setPendingCityName(name);
    setCityQuery(name);
    setPlaceSuggestions([]);
  }, []);

  if (!visible) return null;

  const isTyping = cityQuery.length >= 2;

  // Static country suggestions filtered by current query (always available, offline)
  const staticMatches = isTyping
    ? getSuggestedCities(country)
        .filter((c) => c.toLowerCase().includes(cityQuery.toLowerCase()))
        .filter((c) => !stops.find((s) => s.name.toLowerCase() === c.toLowerCase()))
    : staticSuggestions.slice(0, 6);

  // Duffel results that don't duplicate a static match
  const staticNames = new Set(staticMatches.map((c) => c.toLowerCase()));
  const duffelExtra = placeSuggestions.filter(
    (r) => !staticNames.has((r.cityName ?? r.name).toLowerCase()),
  );

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrapper}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>🗺️ Giro multi-città in {country}</Text>
              <Text style={styles.headerSub}>
                {formatDate(baseStartDate)} – {formatDate(isoDate(searchParams.checkOut))} · {totalDays} giorni totali
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            {/* City stops list */}
            {stops.map((stop, idx) => (
              <CityStopCard
                key={stop.id}
                stop={stop}
                totalNights={totalDays}
                remainingNights={remainingNights}
                isFirst={idx === 0}
                isLast={idx === stops.length - 1}
                onRemove={() => removeStop(stop.id)}
                onMoveUp={idx > 1 ? () => moveStop(idx, idx - 1) : undefined}
                onMoveDown={idx < stops.length - 1 && idx > 0 ? () => moveStop(idx, idx + 1) : undefined}
                onChangeNights={(delta) => changeNights(stop.id, delta)}
              />
            ))}

            {/* Add city button — always visible, disabled only when no nights left to steal */}
            {!showAddCity && (
              <Pressable
                style={({ pressed }) => [
                  styles.addBtn,
                  !canAddMore && styles.addBtnDisabled,
                  pressed && canAddMore && styles.addBtnPressed,
                ]}
                onPress={canAddMore ? handleOpenAddCity : undefined}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canAddMore }}
              >
                <Text style={[styles.addBtnText, !canAddMore && styles.addBtnTextDisabled]}>
                  {canAddMore ? '+ Aggiungi città' : 'Tutti i giorni assegnati'}
                </Text>
                {canAddMore && remainingNights > 0 && (
                  <Text style={styles.addBtnSub}>
                    {remainingNights} {remainingNights === 1 ? 'giorno rimanente' : 'giorni rimanenti'}
                  </Text>
                )}
                {canAddMore && remainingNights === 0 && (
                  <Text style={styles.addBtnSub}>Ridurrà automaticamente un'altra città</Text>
                )}
              </Pressable>
            )}

            {/* Inline add-city panel */}
            {showAddCity && (
              <View style={styles.addCityPanel}>
                {/* Search input */}
                <TextInput
                  style={styles.cityInput}
                  value={cityQuery}
                  onChangeText={(t) => { setCityQuery(t); setPendingCityName(null); }}
                  placeholder="Cerca città..."
                  placeholderTextColor={Colors.text.muted}
                  autoFocus
                  returnKeyType="search"
                />

                {/* Suggestions list */}
                {!pendingCityName && (
                  <View style={styles.suggestions}>
                    {/* Label */}
                    {!isTyping && staticMatches.length > 0 && (
                      <Text style={styles.suggestionsLabel}>Città popolari</Text>
                    )}

                    {/* Static country matches — always first */}
                    {staticMatches.map((c) => (
                      <Pressable
                        key={c}
                        style={({ pressed }) => [styles.suggestionItem, pressed && styles.suggestionPressed]}
                        onPress={() => handleSelectSuggestion(c)}
                      >
                        <Text style={styles.suggestionText}>
                          {getCityPhotoData(c, country).flagEmoji} {c}
                        </Text>
                      </Pressable>
                    ))}

                    {/* Duffel extras (not duplicating static) */}
                    {duffelExtra.map((s) => (
                      <Pressable
                        key={s.id}
                        style={({ pressed }) => [styles.suggestionItem, pressed && styles.suggestionPressed]}
                        onPress={() => handleSelectSuggestion(s.cityName ?? s.name)}
                      >
                        <Text style={styles.suggestionText}>
                          {s.countryFlag} {s.cityName ?? s.name}
                          {s.country ? <Text style={styles.suggestionCountry}> · {s.country}</Text> : null}
                        </Text>
                      </Pressable>
                    ))}

                    {/* Loading spinner inline */}
                    {placesLoading && (
                      <View style={styles.placesLoadingRow}>
                        <ActivityIndicator size="small" color={Colors.accent} />
                        <Text style={styles.placesLoadingText}>Cerco...</Text>
                      </View>
                    )}

                    {/* Free-text fallback when typing and no matches */}
                    {isTyping && !placesLoading && staticMatches.length === 0 && duffelExtra.length === 0 && (
                      <Pressable
                        style={({ pressed }) => [styles.suggestionItem, pressed && styles.suggestionPressed]}
                        onPress={() => handleSelectSuggestion(cityQuery)}
                      >
                        <Text style={styles.suggestionText}>🌍 Aggiungi "{cityQuery}"</Text>
                      </Pressable>
                    )}

                    {/* Free-text option when typing (append after results) */}
                    {isTyping && (staticMatches.length > 0 || duffelExtra.length > 0) &&
                      !staticMatches.find((c) => c.toLowerCase() === cityQuery.toLowerCase()) &&
                      !duffelExtra.find((s) => (s.cityName ?? s.name).toLowerCase() === cityQuery.toLowerCase()) && (
                      <Pressable
                        style={({ pressed }) => [styles.suggestionItem, styles.suggestionFreeText, pressed && styles.suggestionPressed]}
                        onPress={() => handleSelectSuggestion(cityQuery)}
                      >
                        <Text style={[styles.suggestionText, styles.suggestionFreeTextLabel]}>🌍 Aggiungi "{cityQuery}"</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Nights stepper for pending city */}
                {pendingCityName && (
                  <View style={styles.pendingNightsRow}>
                    <Text style={styles.pendingNightsLabel}>
                      {getCityPhotoData(pendingCityName, country).flagEmoji} {pendingCityName}
                    </Text>
                    <View style={styles.pendingStepper}>
                      <Pressable
                        style={[styles.stepBtn, pendingNights <= 1 && styles.stepBtnDisabled]}
                        onPress={() => setPendingNights((n) => Math.max(1, n - 1))}
                        disabled={pendingNights <= 1}
                      >
                        <Text style={styles.stepBtnText}>−</Text>
                      </Pressable>
                      <Text style={styles.pendingNightsCount}>{pendingNights}</Text>
                      <Pressable
                        style={[styles.stepBtn, pendingNights >= maxPendingNights && styles.stepBtnDisabled]}
                        onPress={() => setPendingNights((n) => Math.min(maxPendingNights, n + 1))}
                        disabled={pendingNights >= maxPendingNights}
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.maxNightsHint}>
                      {pendingNights} {pendingNights === 1 ? 'notte' : 'notti'}
                    </Text>
                  </View>
                )}

                {/* Action buttons */}
                <View style={styles.addCityBtnRow}>
                  <Pressable
                    style={({ pressed }) => [styles.cancelSmall, pressed && { opacity: 0.7 }]}
                    onPress={handleCloseAddCity}
                  >
                    <Text style={styles.cancelSmallText}>Annulla</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.confirmBtn,
                      !pendingCityName && styles.confirmBtnDisabled,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={confirmAddCity}
                    disabled={!pendingCityName}
                  >
                    <Text style={styles.confirmBtnText}>Aggiungi al viaggio</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>oppure</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* AI button */}
            <Pressable
              style={({ pressed }) => [styles.aiBtn, pressed && styles.aiBtnPressed]}
              onPress={handleAI}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <View style={styles.aiLoadingRow}>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.aiBtnText}>{aiLoadingMsg}</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.aiBtnText}>✨ Genera divisione AI</Text>
                  <Text style={styles.aiBtnSub}>Propone città e giorni in base al tuo profilo</Text>
                </>
              )}
            </Pressable>

            {aiError && (
              <Text style={styles.aiError}>⚠️ {aiError}</Text>
            )}

            {aiResult && !aiLoading && (
              <View style={styles.aiResultNote}>
                <Text style={styles.aiResultText}>
                  ✓ AI ha suggerito {aiResult.cities.length} città — puoi modificare sopra
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.daysRow}>
              <Text style={styles.daysLabel}>Totale:</Text>
              <Text style={[
                styles.daysCount,
                remainingNights === 0 ? styles.daysOk :
                  remainingNights > 0 ? styles.daysWarn : styles.daysError,
              ]}>
                {assignedNights} di {totalDays} giorni
              </Text>
              {remainingNights > 0 && (
                <Text style={styles.daysHint}> · Mancano {remainingNights} {remainingNights === 1 ? 'giorno' : 'giorni'}</Text>
              )}
            </View>

            <View style={styles.footerBtns}>
              <Pressable
                style={({ pressed }) => [styles.footerCancel, pressed && { opacity: 0.7 }]}
                onPress={onClose}
              >
                <Text style={styles.footerCancelText}>Annulla</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.footerApply, !isValid && styles.footerApplyDisabled, pressed && { opacity: 0.85 }]}
                onPress={handleApply}
                disabled={!isValid}
              >
                <Text style={styles.footerApplyText}>Applica</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.overlay,
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: WINDOW_HEIGHT * 0.88,
  },
  sheet: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.sm,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  headerLeft: { flex: 1, gap: 3 },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
  },
  headerSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  addBtn: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.xs,
  },
  addBtnDisabled: {
    borderColor: Colors.border,
    borderStyle: 'solid',
  },
  addBtnPressed: { opacity: 0.7 },
  addBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.accent,
  },
  addBtnTextDisabled: {
    color: Colors.text.muted,
  },
  addBtnSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  addCityPanel: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cityInput: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.text.primary,
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    minHeight: 48,
  },
  placesLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 4,
  },
  placesLoadingText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  suggestions: { gap: 2 },
  suggestionsLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    paddingHorizontal: Spacing.sm,
    paddingBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.white,
  },
  suggestionPressed: { backgroundColor: Colors.accent + '15' },
  suggestionText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  suggestionCountry: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  suggestionFreeText: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
  },
  suggestionFreeTextLabel: {
    color: Colors.text.secondary,
    fontFamily: FontFamily.bodyMedium,
  },
  pendingNightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  pendingNightsLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    flex: 1,
  },
  pendingStepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  pendingNightsCount: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
    minWidth: 28,
    textAlign: 'center',
  },
  maxNightsHint: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    minWidth: 50,
  },
  stepBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: Colors.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnDisabled: { backgroundColor: Colors.border },
  stepBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    color: Colors.white,
    lineHeight: 20,
  },
  addCityBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cancelSmall: {
    flex: 1, borderRadius: Radius.sm,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelSmallText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  confirmBtn: {
    flex: 2, borderRadius: Radius.sm,
    backgroundColor: Colors.teal,
    paddingVertical: 12, alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: Colors.teal + '66' },
  confirmBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  aiBtn: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  aiBtnPressed: { opacity: 0.85 },
  aiLoadingRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  aiBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  aiBtnSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  aiError: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.accent,
    textAlign: 'center',
  },
  aiResultNote: {
    backgroundColor: Colors.teal + '18',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  aiResultText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.teal,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  daysLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  daysCount: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
  },
  daysOk: { color: Colors.teal },
  daysWarn: { color: Colors.accent },
  daysError: { color: '#c0392b' },
  daysHint: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  footerBtns: { flexDirection: 'row', gap: Spacing.sm },
  footerCancel: {
    flex: 1, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingVertical: 14, alignItems: 'center', minHeight: 50,
  },
  footerCancelText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.text.secondary,
  },
  footerApply: {
    flex: 2, borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    paddingVertical: 14, alignItems: 'center', minHeight: 50,
  },
  footerApplyDisabled: { backgroundColor: Colors.accent + '55' },
  footerApplyText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
});
