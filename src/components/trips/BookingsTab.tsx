import { useState, useCallback, useMemo, Fragment } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Trip } from '../../types/trip';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../constants/theme';
import {
  groupBookings,
  bookingToFlightGroup,
  bookingToHotel,
  bookingToActivity,
  bookingToCar,
  bookingToInsurance,
  type TotalBreakdown,
} from '../../utils/bookings-grouping';
import {
  FlightRow, HotelRow, ActivityRow, CarRow, InsuranceRow, VisaRow,
} from './BookingRows';
import { BookingsCityBlock } from './BookingsCityBlock';
import { TransferBanner } from './TransferBanner';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ─── CollapsibleSection (controlled) ──────────────────────────────────────────

function CollapsibleSection({
  title, count, children, toggleKey, isCollapsed, onToggle,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  toggleKey: string;
  isCollapsed: boolean;
  onToggle: (key: string) => void;
}) {
  const handlePress = useCallback(() => onToggle(toggleKey), [onToggle, toggleKey]);
  const open = !isCollapsed;
  const accessibilityLabel = `${isCollapsed ? 'Espandi' : 'Collassa'} ${title}`;

  return (
    <View style={cStyles.wrapper}>
      <Pressable
        style={({ pressed }) => [cStyles.header, pressed && { opacity: 0.8 }]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
      >
        <Text style={cStyles.title}>{title}</Text>
        {count !== undefined && count > 0 && (
          <View style={cStyles.countBadge}>
            <Text style={cStyles.countText}>{count}</Text>
          </View>
        )}
        <Text style={cStyles.chevron}>{open ? '▾' : '▸'}</Text>
      </Pressable>
      {open && <View style={cStyles.content}>{children}</View>}
    </View>
  );
}

const cStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    minHeight: 48,
    backgroundColor: Colors.white,
  },
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
    flex: 1,
  },
  countBadge: {
    backgroundColor: Colors.border,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    color: Colors.text.secondary,
  },
  chevron: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: Colors.text.muted,
    width: 16,
    textAlign: 'center',
  },
  content: {
    gap: 1,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

// ─── EmptyBookings ────────────────────────────────────────────────────────────

function EmptyBookings() {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.emoji}>📭</Text>
      <Text style={emptyStyles.title}>Nessuna prenotazione</Text>
      <Text style={emptyStyles.sub}>Seleziona voli, hotel e attività nella tab Cerca per aggiungerli qui.</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  emoji: { fontSize: 48 },
  title: { fontFamily: FontFamily.displayBold, fontSize: FontSize.lg, color: Colors.text.primary, textAlign: 'center' },
  sub: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.text.muted, textAlign: 'center', lineHeight: 21 },
});

// ─── TotalBar ─────────────────────────────────────────────────────────────────

function TotalBar({
  total, isDraft, insetBottom, breakdown, onBook,
}: {
  total: number;
  isDraft: boolean;
  insetBottom: number;
  breakdown: TotalBreakdown;
  onBook?: () => void;
}) {
  const lines = [
    breakdown.flights > 0 && `Voli €${Math.round(breakdown.flights)}`,
    breakdown.hotels > 0 && `Hotel €${Math.round(breakdown.hotels)}`,
    breakdown.activities > 0 && `Attività €${Math.round(breakdown.activities)}`,
    breakdown.car > 0 && `Auto €${Math.round(breakdown.car)}`,
    breakdown.insurance > 0 && `Ass. €${Math.round(breakdown.insurance)}`,
  ].filter(Boolean) as string[];

  return (
    <View style={[tbStyles.bar, { paddingBottom: insetBottom + Spacing.sm }]}>
      {lines.length > 0 && (
        <Text style={tbStyles.breakdown} numberOfLines={1}>
          {lines.join(' · ')}
        </Text>
      )}
      <View style={tbStyles.row}>
        <View>
          <Text style={tbStyles.label}>{isDraft ? 'Totale stimato' : 'Totale pagato'}</Text>
          <Text style={tbStyles.total}>€{Math.round(total).toLocaleString('it-IT')}</Text>
        </View>
        {isDraft && onBook && (
          <Pressable
            style={({ pressed }) => [tbStyles.bookBtn, pressed && { opacity: 0.85 }]}
            onPress={onBook}
            accessibilityRole="button"
          >
            <Text style={tbStyles.bookBtnText}>Prenota ora</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const tbStyles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: 4,
  },
  breakdown: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  total: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xl,
    color: Colors.text.primary,
  },
  bookBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
});

// ─── BookingsTab ──────────────────────────────────────────────────────────────

interface Props {
  trip: Trip;
  isDraft: boolean;
}

export function BookingsTab({ trip, isDraft }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const grouped = useMemo(() => groupBookings(trip), [trip]);

  const onNavigate = useCallback((bookingKey: string) => {
    router.push(`/trip/booking-detail?tripId=${trip.id}&bookingKey=${encodeURIComponent(bookingKey)}`);
  }, [trip.id, router]);

  const nights = trip.checkIn && trip.checkOut
    ? Math.max(1, Math.round((new Date(trip.checkOut).getTime() - new Date(trip.checkIn).getTime()) / 86_400_000))
    : 1;

  // Stable per-block toggle handlers (one () => void per city, memoized by structure)
  const cityToggleHandlers = useMemo<Record<string, () => void>>(() => {
    const map: Record<string, () => void> = {};
    if (grouped.kind === 'multi') {
      for (const block of grouped.cityBlocks) {
        const key = `city:${block.stop.id}`;
        map[block.stop.id] = () => toggle(key);
      }
    }
    return map;
  }, [grouped, toggle]);

  // Single-dest empty → global empty state (preserves pre-Step-7 behavior)
  if (grouped.kind === 'single' && grouped.isEmpty) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <EmptyBookings />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[tabStyles.content, { paddingBottom: Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Flights — always at top, trip-level */}
        {grouped.flights.length > 0 && (
          <CollapsibleSection
            title="✈️ Voli"
            count={grouped.flights.length}
            toggleKey="trip:flight"
            isCollapsed={!!collapsed['trip:flight']}
            onToggle={toggle}
          >
            {grouped.flights.map((b) => (
              <FlightRow
                key={b.id}
                group={bookingToFlightGroup(b)}
                label={b.flight?.direction === 'return' ? 'Ritorno' : 'Andata'}
                isDraft={isDraft}
                onPress={() => onNavigate(b.id)}
              />
            ))}
          </CollapsibleSection>
        )}

        {/* Kind-specific middle */}
        {grouped.kind === 'single' ? (
          <>
            {grouped.hotels.length > 0 && (
              <CollapsibleSection
                title="🏨 Hotel"
                count={grouped.hotels.length}
                toggleKey="trip:hotel"
                isCollapsed={!!collapsed['trip:hotel']}
                onToggle={toggle}
              >
                {grouped.hotels.map((b) => (
                  <HotelRow
                    key={b.id}
                    hotel={bookingToHotel(b, nights)}
                    nights={b.hotel?.nights ?? nights}
                    isDraft={isDraft}
                    checkIn={b.timing.startDate}
                    checkOut={b.timing.endDate}
                    onPress={() => onNavigate(b.id)}
                  />
                ))}
              </CollapsibleSection>
            )}

            {grouped.activities.length > 0 && (
              <CollapsibleSection
                title="🎯 Attività"
                count={grouped.activities.length}
                toggleKey="trip:activity"
                isCollapsed={!!collapsed['trip:activity']}
                onToggle={toggle}
              >
                {grouped.activities.map((b) => (
                  <ActivityRow
                    key={b.id}
                    activity={bookingToActivity(b)}
                    isDraft={isDraft}
                    onPress={() => onNavigate(b.id)}
                  />
                ))}
              </CollapsibleSection>
            )}
          </>
        ) : (
          grouped.cityBlocks.map((block) => (
            <Fragment key={block.stop.id}>
              <BookingsCityBlock
                block={block}
                isDraft={isDraft}
                isCollapsed={!!collapsed[`city:${block.stop.id}`]}
                onToggle={cityToggleHandlers[block.stop.id]}
                onNavigate={onNavigate}
              />
              {block.transferAfter && (
                <TransferBanner transfer={block.transferAfter} />
              )}
            </Fragment>
          ))
        )}

        {/* Trip-level items after the middle block */}
        {(() => {
          const carBooking = grouped.car;
          if (!carBooking) return null;
          return (
            <CollapsibleSection
              title="🚗 Auto"
              count={1}
              toggleKey="trip:car"
              isCollapsed={!!collapsed['trip:car']}
              onToggle={toggle}
            >
              <CarRow
                car={bookingToCar(carBooking)}
                isDraft={isDraft}
                onPress={() => onNavigate(carBooking.id)}
              />
            </CollapsibleSection>
          );
        })()}

        {(() => {
          const insuranceBooking = grouped.insurance;
          if (!insuranceBooking) return null;
          return (
            <CollapsibleSection
              title="🛡️ Assicurazione"
              count={1}
              toggleKey="trip:insurance"
              isCollapsed={!!collapsed['trip:insurance']}
              onToggle={toggle}
            >
              <InsuranceRow
                plan={bookingToInsurance(insuranceBooking)}
                isDraft={isDraft}
                onPress={() => onNavigate(insuranceBooking.id)}
              />
            </CollapsibleSection>
          );
        })()}

        {(() => {
          const visaInfo = trip.visaInfo;
          if (!visaInfo) return null;
          return (
            <CollapsibleSection
              title="📄 Visto"
              toggleKey="trip:visa"
              isCollapsed={!!collapsed['trip:visa']}
              onToggle={toggle}
            >
              <VisaRow visa={visaInfo} onPress={() => onNavigate('visa')} />
            </CollapsibleSection>
          );
        })()}
      </ScrollView>

      <TotalBar
        total={trip.totalPrice}
        isDraft={isDraft}
        insetBottom={insets.bottom}
        breakdown={grouped.breakdown}
        onBook={isDraft ? () => {} : undefined}
      />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
});
