import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useCheckoutStore } from '../../src/stores/useCheckoutStore';
import { useAppStore } from '../../src/stores/useAppStore';
import { searchHotels } from '../../src/services/booking';
import { searchActivities } from '../../src/services/activities';
import { HotelCard } from '../../src/components/search/HotelCard';
import { ActivityCard } from '../../src/components/search/ActivityCard';
import { FilterBar } from '../../src/components/search/FilterBar';
import {
  extractHotelBrands, extractActivityProviders,
  filterHotels, filterActivities,
} from '../../src/utils/filter-helpers';
import type { HotelOffer, ActivityOffer } from '../../src/types/booking';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../src/constants/theme';

type Tab = 'hotel' | 'activities';

export default function CityPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const onboardingData = useAppStore((s) => s.onboardingData);

  const cityStop = useCheckoutStore((s) => s.cityStops.find((c) => c.id === id));
  const selectHotelForCity = useCheckoutStore((s) => s.selectHotelForCity);
  const addActivityToCity = useCheckoutStore((s) => s.addActivityToCity);
  const removeActivityFromCity = useCheckoutStore((s) => s.removeActivityFromCity);

  const [activeTab, setActiveTab] = useState<Tab>('hotel');
  const [hotels, setHotels] = useState<HotelOffer[]>([]);
  const [activities, setActivities] = useState<ActivityOffer[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [hotelQuery, setHotelQuery] = useState('');
  const [hotelFilters, setHotelFilters] = useState<string[]>([]);
  const [activityQuery, setActivityQuery] = useState('');
  const [activityFilters, setActivityFilters] = useState<string[]>([]);

  if (!cityStop) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Città non trovata</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Torna indietro</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const nights = cityStop.nights;
  const checkIn = new Date(cityStop.startDate + 'T00:00:00');
  const checkOut = new Date(cityStop.endDate + 'T00:00:00');

  // Search params for this city
  const cityParams = {
    origin: '',
    originCode: '',
    destination: `${cityStop.name}, ${cityStop.country}`,
    destinationCode: undefined as string | undefined,
    checkIn,
    checkOut,
    travelers: 2, // TODO: pass travelers from search params via store
  };

  const fetchHotels = useCallback(async () => {
    setHotelsLoading(true);
    try {
      const result = await searchHotels(cityParams, onboardingData);
      setHotels(result.hotels.slice(0, 8));
    } catch {
      setHotels([]);
    } finally {
      setHotelsLoading(false);
    }
  }, [cityStop.id]);

  const fetchActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const result = await searchActivities(cityParams, onboardingData);
      setActivities(result.slice(0, 8));
    } catch {
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, [cityStop.id]);

  useEffect(() => {
    fetchHotels();
    fetchActivities();
  }, [fetchHotels, fetchActivities]);

  const hotelFilterOptions = useMemo(() => extractHotelBrands(hotels), [hotels]);
  const activityFilterOptions = useMemo(() => extractActivityProviders(activities), [activities]);
  const filteredHotels = useMemo(
    () => filterHotels(hotels, hotelQuery, hotelFilters),
    [hotels, hotelQuery, hotelFilters],
  );
  const filteredActivities = useMemo(
    () => filterActivities(activities, activityQuery, activityFilters),
    [activities, activityQuery, activityFilters],
  );

  const selectedActivityIds = cityStop.selectedActivities.map((a) => a.id);

  const handleSelectHotel = (hotel: HotelOffer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectHotelForCity(cityStop.id, hotel);
  };

  const handleToggleActivity = (activity: ActivityOffer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedActivityIds.includes(activity.id)) {
      removeActivityFromCity(cityStop.id, activity.id);
    } else {
      addActivityToCity(cityStop.id, activity);
    }
  };

  const selectedCount =
    (cityStop.selectedHotel ? 1 : 0) + cityStop.selectedActivities.length;

  return (
    <View style={styles.root}>
      {/* Hero header */}
      <LinearGradient
        colors={cityStop.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}
      >
        <Pressable
          style={styles.backPressable}
          onPress={() => router.back()}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <View style={styles.heroInfo}>
          <Text style={styles.heroFlag}>{cityStop.flagEmoji}</Text>
          <View style={styles.heroText}>
            <Text style={styles.heroCity}>{cityStop.name}</Text>
            <Text style={styles.heroSub}>
              {checkIn.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} –{' '}
              {checkOut.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} · {nights} {nights === 1 ? 'notte' : 'notti'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'hotel' && styles.tabActive]}
          onPress={() => setActiveTab('hotel')}
        >
          <Text style={[styles.tabText, activeTab === 'hotel' && styles.tabTextActive]}>🏨 Hotel</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'activities' && styles.tabActive]}
          onPress={() => setActiveTab('activities')}
        >
          <Text style={[styles.tabText, activeTab === 'activities' && styles.tabTextActive]}>🎯 Attività</Text>
        </Pressable>
      </View>

      {/* Content */}
      {activeTab === 'hotel' ? (
        hotelsLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Cerco hotel a {cityStop.name}...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredHotels}
            keyExtractor={(h) => h.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Hotel a {cityStop.name}</Text>
                {hotels.length > 0 && (
                  <FilterBar
                    query={hotelQuery}
                    onQueryChange={setHotelQuery}
                    options={hotelFilterOptions}
                    activeFilters={hotelFilters}
                    onFiltersChange={setHotelFilters}
                    totalCount={hotels.length}
                    filteredCount={filteredHotels.length}
                    searchPlaceholder="Cerca hotel..."
                  />
                )}
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nessun hotel trovato</Text>
              </View>
            }
            renderItem={({ item }) => (
              <HotelCard
                hotel={item}
                nights={nights}
                selected={cityStop.selectedHotel?.id === item.id}
                onSelect={() => handleSelectHotel(item)}
              />
            )}
          />
        )
      ) : (
        activitiesLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Cerco attività a {cityStop.name}...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredActivities}
            keyExtractor={(a) => a.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Attività a {cityStop.name}</Text>
                {activities.length > 0 && (
                  <FilterBar
                    query={activityQuery}
                    onQueryChange={setActivityQuery}
                    options={activityFilterOptions}
                    activeFilters={activityFilters}
                    onFiltersChange={setActivityFilters}
                    totalCount={activities.length}
                    filteredCount={filteredActivities.length}
                    searchPlaceholder="Cerca attività..."
                  />
                )}
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nessuna attività trovata</Text>
              </View>
            }
            renderItem={({ item }) => (
              <ActivityCard
                activity={item}
                selected={selectedActivityIds.includes(item.id)}
                onSelect={() => handleToggleActivity(item)}
              />
            )}
          />
        )
      )}

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <Text style={styles.footerSummary}>
          {selectedCount === 0
            ? 'Nessuna selezione'
            : `${cityStop.selectedHotel ? '1 hotel' : ''}${cityStop.selectedHotel && cityStop.selectedActivities.length > 0 ? ' + ' : ''}${cityStop.selectedActivities.length > 0 ? `${cityStop.selectedActivities.length} ${cityStop.selectedActivities.length === 1 ? 'attività' : 'attività'}` : ''} selezionate`
          }
        </Text>
        <Pressable
          style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.applyBtnText}>Applica e torna</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1, backgroundColor: Colors.background },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  backPressable: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  backArrow: {
    fontSize: 20,
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
  },
  heroInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  heroFlag: { fontSize: 32, marginBottom: 2 },
  heroText: { gap: 3 },
  heroCity: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xxl,
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.accent,
  },
  tabText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.text.muted,
  },
  tabTextActive: {
    color: Colors.accent,
    fontFamily: FontFamily.bodySemiBold,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.text.muted,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  listHeader: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.text.muted,
  },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  footerSummary: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  applyBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.text.muted,
  },
  backBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  backBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
});
