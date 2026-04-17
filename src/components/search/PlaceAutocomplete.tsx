import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Airport, PlaceSelection, PlaceSuggestion } from '../../types/places';
import { searchPlaces } from '../../services/places';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

const RECENT_KEY = 'places_recent';
const MAX_RECENT = 5;
const DROPDOWN_MAX_HEIGHT = 192;
const APPROX_ROW_HEIGHT = 52;

// ─── Types ────────────────────────────────────────────────────────────────────

type DropdownItem =
  | { key: string; kind: 'sectionLabel'; title: string }
  | { key: string; kind: 'recent'; place: PlaceSelection }
  | { key: string; kind: 'suggestion'; suggestion: PlaceSuggestion }
  | { key: string; kind: 'airport'; parentSuggestion: PlaceSuggestion; airport: Airport }
  | { key: string; kind: 'empty'; query: string };

// ─── Async helpers ────────────────────────────────────────────────────────────

async function loadRecent(): Promise<PlaceSelection[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveRecent(place: PlaceSelection): Promise<void> {
  try {
    const existing = await loadRecent();
    const filtered = existing.filter((p) => p.iataCode !== place.iataCode);
    await AsyncStorage.setItem(
      RECENT_KEY,
      JSON.stringify([place, ...filtered].slice(0, MAX_RECENT))
    );
  } catch {
    // ignore
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  label: string;
  placeholder: string;
  icon: string;
  value: PlaceSelection | null;
  onChange: (place: PlaceSelection | null) => void;
  /** Controls stacking when two PlaceAutocomplete fields are adjacent */
  zIndex?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlaceAutocomplete({
  label,
  placeholder,
  icon,
  value,
  onChange,
  zIndex = 1,
}: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<PlaceSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [expandedCityId, setExpandedCityId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Load recents when dropdown opens with no query
  useEffect(() => {
    if (open && query.length < 2) {
      loadRecent().then(setRecentPlaces);
    }
  }, [open, query]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const results = await searchPlaces(q);
      setSuggestions(results);
    } catch {
      // AbortError or network error — keep previous results
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      setExpandedCityId(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
    },
    [fetchSuggestions]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSuggestions([]);
    setExpandedCityId(null);
  }, []);

  const selectPlace = useCallback(
    (place: PlaceSelection) => {
      onChange(place);
      close();
      saveRecent(place);
    },
    [onChange, close]
  );

  // ─── Build unified list data ─────────────────────────────────────────────────

  const listData = useMemo((): DropdownItem[] => {
    const items: DropdownItem[] = [];
    const showSuggestions = query.length >= 2;
    const showRecent = !showSuggestions && recentPlaces.length > 0;

    if (showRecent) {
      items.push({ key: '__hdr', kind: 'sectionLabel', title: 'Ricerche recenti' });
      recentPlaces.forEach((p) =>
        items.push({ key: `r_${p.iataCode}`, kind: 'recent', place: p })
      );
    }

    if (showSuggestions) {
      if (suggestions.length === 0 && !loading) {
        items.push({ key: '__empty', kind: 'empty', query });
      }
      suggestions.forEach((s) => {
        items.push({ key: `s_${s.id}`, kind: 'suggestion', suggestion: s });
        if (s.type === 'city' && expandedCityId === s.id && s.airports) {
          s.airports.forEach((a) =>
            items.push({
              key: `a_${a.id}`,
              kind: 'airport',
              parentSuggestion: s,
              airport: a,
            })
          );
        }
      });
    }

    return items;
  }, [query, recentPlaces, suggestions, expandedCityId, loading]);

  const showDropdown = open && listData.length > 0;
  const hasOverflow = listData.length * APPROX_ROW_HEIGHT > DROPDOWN_MAX_HEIGHT;

  // ─── Row renderer ────────────────────────────────────────────────────────────

  const renderRow = useCallback(
    (item: DropdownItem) => {
      if (item.kind === 'sectionLabel') {
        return <Text style={styles.sectionLabel}>{item.title}</Text>;
      }

      if (item.kind === 'recent') {
        return (
          <TouchableOpacity style={styles.row} onPress={() => selectPlace(item.place)} activeOpacity={0.7}>
            <Text style={styles.rowIcon}>🕐</Text>
            <View style={styles.textCol}>
              <Text style={styles.rowName} numberOfLines={1}>{item.place.displayName}</Text>
              <Text style={styles.rowSub}>{item.place.iataCode}</Text>
            </View>
          </TouchableOpacity>
        );
      }

      if (item.kind === 'suggestion') {
        const s = item.suggestion;
        const hasMultiAirports = s.type === 'city' && (s.airports?.length ?? 0) > 1;
        const isExpanded = expandedCityId === s.id;
        return (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => {
              if (hasMultiAirports) {
                setExpandedCityId((prev) => (prev === s.id ? null : s.id));
              } else {
                selectPlace({
                  displayName: s.type === 'airport' ? `${s.name} (${s.iataCode})` : s.name,
                  iataCode: s.iataCode,
                  cityName: s.cityName ?? s.name,
                });
              }
            }}
          >
            <Text style={styles.rowIcon}>{s.type === 'city' ? '🏙️' : '✈️'}</Text>
            <View style={styles.textCol}>
              <View style={styles.nameRow}>
                <Text style={styles.rowName} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.iataChip}>{s.iataCode}</Text>
              </View>
              <Text style={styles.rowSub}>{s.countryFlag} {s.country}</Text>
            </View>
            {hasMultiAirports && (
              <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
            )}
          </TouchableOpacity>
        );
      }

      if (item.kind === 'airport') {
        return (
          <TouchableOpacity
            style={styles.airportRow}
            activeOpacity={0.7}
            onPress={() =>
              selectPlace({
                displayName: `${item.airport.name} (${item.airport.iataCode})`,
                iataCode: item.airport.iataCode,
                cityName: item.parentSuggestion.cityName ?? item.parentSuggestion.name,
              })
            }
          >
            <Text style={styles.rowIcon}>  ✈️</Text>
            <View style={styles.textCol}>
              <Text style={styles.airportName} numberOfLines={1}>{item.airport.name}</Text>
              <Text style={styles.rowSub}>{item.airport.iataCode}</Text>
            </View>
          </TouchableOpacity>
        );
      }

      if (item.kind === 'empty') {
        return <Text style={styles.emptyText}>Nessun risultato per "{item.query}"</Text>;
      }

      return null;
    },
    [expandedCityId, selectPlace]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  const inputTop = 20 + Spacing.xs + 48; // label height + gap + input height

  return (
    <View style={[styles.container, { zIndex }]}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputRow, open && styles.inputRowFocused]}>
        <Text style={styles.inputIcon}>{icon}</Text>

        {value && !open ? (
          <TouchableOpacity
            style={styles.valueContainer}
            onPress={() => {
              setOpen(true);
              setTimeout(() => inputRef.current?.focus(), 30);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.valueText} numberOfLines={1}>{value.displayName}</Text>
            <Text style={styles.iataText}>{value.iataCode}</Text>
          </TouchableOpacity>
        ) : (
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={Colors.text.muted}
            value={query}
            onChangeText={handleChangeText}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Delay so a tap on a list item fires before we close
              setTimeout(close, 180);
            }}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
            editable
          />
        )}

        {loading && (
          <ActivityIndicator size="small" color={Colors.accent} style={styles.spinner} />
        )}

        {(value !== null || query.length > 0) && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setSuggestions([]);
              setOpen(false);
              onChange(null);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Cancella selezione"
            accessibilityRole="button"
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Floating dropdown — position:absolute so it never pushes siblings down */}
      {showDropdown && (
        <View style={[styles.dropdownOuter, { top: inputTop + 4 }]}>
          <View style={styles.dropdownInner}>
            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              nestedScrollEnabled
              decelerationRate="normal"
            >
              {listData.map((item) => renderRow(item))}
            </ScrollView>
            {hasOverflow && (
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.92)']}
                style={styles.bottomFade}
                pointerEvents="none"
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    // zIndex is applied inline via prop
  },
  label: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    height: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    height: 48,
  },
  inputRowFocused: {
    borderColor: Colors.accent,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  valueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  valueText: {
    flex: 1,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  iataText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  spinner: {
    marginLeft: Spacing.xs,
  },
  clearText: {
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    marginLeft: Spacing.xs,
  },

  // ─── Dropdown ──────────────────────────────────────────────────────────────
  dropdownOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Shadow on outer so it isn't clipped by overflow:hidden on inner
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 12,
    zIndex: 9999,
  },
  dropdownInner: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  list: {
    maxHeight: DROPDOWN_MAX_HEIGHT,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },

  // ─── Rows ─────────────────────────────────────────────────────────────────
  sectionLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    minHeight: 52,
  },
  rowIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  textCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  rowName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
    flexShrink: 1,
  },
  iataChip: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xs,
    color: Colors.accent,
    backgroundColor: '#FAF0EC',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  rowSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    marginTop: 1,
  },
  chevron: {
    fontSize: 10,
    color: Colors.text.muted,
    marginLeft: Spacing.xs,
  },
  airportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: '#F7F5F0',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    minHeight: 44,
  },
  airportName: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    textAlign: 'center',
    padding: Spacing.md,
  },
});
