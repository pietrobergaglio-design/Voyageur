import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Trip } from '../../types/trip';
import type { FlightDirectionGroup, HotelOffer, ActivityOffer, CarOffer, InsurancePlan, VisaInfo } from '../../types/booking';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../constants/theme';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDur(min: number): string {
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

// ─── CollapsibleSection ───────────────────────────────────────────────────────

function CollapsibleSection({
  title, count, children, defaultOpen = true, indent = false,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  indent?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  }, []);

  return (
    <View style={[cStyles.wrapper, indent && cStyles.wrapperIndent]}>
      <Pressable
        style={({ pressed }) => [cStyles.header, pressed && { opacity: 0.8 }]}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[cStyles.title, indent && cStyles.titleIndent]}>{title}</Text>
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
  wrapperIndent: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: Spacing.md,
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
  titleIndent: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
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

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ isDraft }: { isDraft: boolean }) {
  return (
    <View style={[sbStyles.badge, isDraft ? sbStyles.draft : sbStyles.booked]}>
      <Text style={[sbStyles.text, isDraft ? sbStyles.textDraft : sbStyles.textBooked]}>
        {isDraft ? '✓ Selezionato' : '✓ Prenotato'}
      </Text>
    </View>
  );
}

const sbStyles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  booked: { backgroundColor: Colors.teal + '18' },
  draft: { backgroundColor: Colors.accent + '15' },
  text: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
  },
  textBooked: { color: Colors.teal },
  textDraft: { color: Colors.accent },
});

// ─── FlightRow ────────────────────────────────────────────────────────────────

function FlightRow({ group, label, isDraft, onPress }: {
  group: FlightDirectionGroup;
  label: string;
  isDraft: boolean;
  onPress: () => void;
}) {
  const first = group.segments[0];
  const last = group.segments[group.segments.length - 1];
  const stopsLabel = group.stops === 0 ? 'Diretto' : `${group.stops} scal${group.stops === 1 ? 'a' : 'e'}`;

  return (
    <Pressable
      style={({ pressed }) => [rowStyles.row, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={rowStyles.left}>
        <Text style={rowStyles.emoji}>✈️</Text>
        <View style={rowStyles.info}>
          <Text style={rowStyles.title} numberOfLines={1}>
            {label} · {group.airline} · {stopsLabel}
          </Text>
          <Text style={rowStyles.sub}>
            {first.origin} {fmtTime(group.departureAt)} → {last.destination} {fmtTime(group.arrivalAt)} · {fmtDur(group.durationMinutes)}
          </Text>
        </View>
      </View>
      <View style={rowStyles.right}>
        <StatusBadge isDraft={isDraft} />
        <Text style={rowStyles.price}>~€{Math.round(group.estimatedPrice)}</Text>
      </View>
    </Pressable>
  );
}

// ─── HotelRow ─────────────────────────────────────────────────────────────────

function HotelRow({ hotel, nights, isDraft, checkIn, checkOut, onPress }: {
  hotel: HotelOffer;
  nights: number;
  isDraft: boolean;
  checkIn?: string;
  checkOut?: string;
  onPress: () => void;
}) {
  const stars = '★'.repeat(hotel.stars);
  return (
    <Pressable
      style={({ pressed }) => [rowStyles.row, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={rowStyles.left}>
        <Text style={rowStyles.emoji}>🏨</Text>
        <View style={rowStyles.info}>
          <Text style={rowStyles.title} numberOfLines={1}>{hotel.name}</Text>
          <Text style={rowStyles.sub}>
            {stars} · {hotel.zone}
            {checkIn && checkOut ? ` · ${new Date(checkIn + 'T00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} → ${new Date(checkOut + 'T00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}` : ` · ${nights} notti`}
          </Text>
        </View>
      </View>
      <View style={rowStyles.right}>
        <StatusBadge isDraft={isDraft} />
        <Text style={rowStyles.price}>€{Math.round(hotel.totalPrice)}</Text>
      </View>
    </Pressable>
  );
}

// ─── ActivityRow ──────────────────────────────────────────────────────────────

function ActivityRow({ activity, isDraft, onPress }: {
  activity: ActivityOffer;
  isDraft: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [rowStyles.row, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={rowStyles.left}>
        <Text style={rowStyles.emoji}>{activity.emoji ?? '🎯'}</Text>
        <View style={rowStyles.info}>
          <Text style={rowStyles.title} numberOfLines={1}>{activity.name}</Text>
          <Text style={rowStyles.sub}>
            {activity.durationLabel ?? `${activity.durationHours}h`}
            {activity.categories[0] ? ` · ${activity.categories[0]}` : ''}
          </Text>
        </View>
      </View>
      <View style={rowStyles.right}>
        <StatusBadge isDraft={isDraft} />
        <Text style={rowStyles.price}>€{Math.round(activity.price)}</Text>
      </View>
    </Pressable>
  );
}

// ─── CarRow ───────────────────────────────────────────────────────────────────

function CarRow({ car, isDraft, onPress }: { car: CarOffer; isDraft: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [rowStyles.row, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={rowStyles.left}>
        <Text style={rowStyles.emoji}>🚗</Text>
        <View style={rowStyles.info}>
          <Text style={rowStyles.title} numberOfLines={1}>{car.company} · {car.name}</Text>
          <Text style={rowStyles.sub}>{car.category} · {car.days} giorni · {car.pickupLocation}</Text>
        </View>
      </View>
      <View style={rowStyles.right}>
        <StatusBadge isDraft={isDraft} />
        <Text style={rowStyles.price}>€{Math.round(car.totalPrice)}</Text>
      </View>
    </Pressable>
  );
}

// ─── InsuranceRow ─────────────────────────────────────────────────────────────

function InsuranceRow({ plan, isDraft, onPress }: { plan: InsurancePlan; isDraft: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [rowStyles.row, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={rowStyles.left}>
        <Text style={rowStyles.emoji}>🏥</Text>
        <View style={rowStyles.info}>
          <Text style={rowStyles.title} numberOfLines={1}>{plan.name}</Text>
          <Text style={rowStyles.sub}>{plan.planType} · {plan.coverageItems.slice(0, 2).join(', ')}</Text>
        </View>
      </View>
      <View style={rowStyles.right}>
        <StatusBadge isDraft={isDraft} />
        <Text style={rowStyles.price}>€{Math.round(plan.price)}</Text>
      </View>
    </Pressable>
  );
}

// ─── VisaRow ──────────────────────────────────────────────────────────────────

function VisaRow({ visa, onPress }: { visa: VisaInfo; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [rowStyles.row, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={rowStyles.left}>
        <Text style={rowStyles.emoji}>🛂</Text>
        <View style={rowStyles.info}>
          <Text style={rowStyles.title} numberOfLines={1}>{visa.statusLabel}</Text>
          <Text style={rowStyles.sub} numberOfLines={2}>{visa.details}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    minHeight: 60,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emoji: { fontSize: 20, width: 28, textAlign: 'center' },
  info: { flex: 1, gap: 2 },
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  sub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
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

interface TotalBreakdown {
  flights: number;
  hotels: number;
  activities: number;
  car: number;
  insurance: number;
}

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

  const navigate = useCallback((bookingKey: string) => {
    router.push(`/trip/booking-detail?tripId=${trip.id}&bookingKey=${encodeURIComponent(bookingKey)}`);
  }, [trip.id, router]);

  const nights = trip.checkIn && trip.checkOut
    ? Math.max(1, Math.round((new Date(trip.checkOut).getTime() - new Date(trip.checkIn).getTime()) / 86_400_000))
    : 1;

  // ── New format: trip.bookings[] ─────────────────────────────────────────────

  const useNewFormat = !!(trip.bookings && trip.bookings.length > 0);

  if (useNewFormat) {
    const bookings = trip.bookings!;
    const flightBookings = bookings.filter((b) => b.type === 'flight');
    const hotelBookings = bookings.filter((b) => b.type === 'hotel');
    const activityBookings = bookings.filter((b) => b.type === 'activity');
    const carBooking = bookings.find((b) => b.type === 'car');
    const insuranceBooking = bookings.find((b) => b.type === 'insurance');
    const hasVisa = !!trip.visaInfo;

    const breakdown: TotalBreakdown = { flights: 0, hotels: 0, activities: 0, car: 0, insurance: 0 };
    for (const b of flightBookings) breakdown.flights += b.price;
    for (const b of hotelBookings) breakdown.hotels += b.price;
    for (const b of activityBookings) breakdown.activities += b.price;
    if (carBooking) breakdown.car = carBooking.price;
    if (insuranceBooking) breakdown.insurance = insuranceBooking.price;

    const hasAnyBookings = bookings.length > 0 || hasVisa;

    if (!hasAnyBookings) {
      return (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <EmptyBookings />
          </ScrollView>
        </View>
      );
    }

    // Convert BookingItem to display types for existing row components
    const bookingToFlightGroup = (b: import('../../types/booking').BookingItem): FlightDirectionGroup => ({
      key: b.id,
      airline: b.flight?.airline ?? b.provider,
      segments: [{
        origin: b.flight?.origin ?? '',
        destination: b.flight?.destination ?? '',
        departureAt: `${b.timing.startDate}T${b.timing.startTime ?? '00:00'}:00`,
        arrivalAt: `${b.timing.endDate ?? b.timing.startDate}T${b.timing.endTime ?? '00:00'}:00`,
        durationMinutes: 0,
        flightNumber: b.flight?.flightNumber ?? '',
      }],
      stops: b.flight?.stops.length ?? 0,
      durationMinutes: 0,
      departureAt: `${b.timing.startDate}T${b.timing.startTime ?? '00:00'}:00`,
      arrivalAt: `${b.timing.endDate ?? b.timing.startDate}T${b.timing.endTime ?? '00:00'}:00`,
      estimatedPrice: b.price,
      offerIds: [],
    });

    const bookingToHotel = (b: import('../../types/booking').BookingItem): HotelOffer => ({
      id: b.id,
      provider: 'booking',
      name: b.title,
      zone: b.hotel?.address ?? '',
      stars: 4,
      propertyType: 'hotel',
      pricePerNight: b.price / Math.max(1, b.hotel?.nights ?? nights),
      totalPrice: b.price,
      currency: b.currency as import('../../types/booking').Currency,
      refundPolicy: b.refund.refundable ? 'flexible' : 'strict',
      matchScore: 0,
      tags: [],
      amenities: b.hotel?.amenities ?? [],
    });

    const bookingToActivity = (b: import('../../types/booking').BookingItem): ActivityOffer => ({
      id: b.id,
      provider: 'viator',
      name: b.title,
      durationHours: (b.activity?.durationMin ?? 180) / 60,
      price: b.price,
      currency: b.currency as import('../../types/booking').Currency,
      categories: b.activity?.category ? [b.activity.category] : [],
      matchScore: 0,
      tags: [],
      highlights: [],
    });

    const bookingToCar = (b: import('../../types/booking').BookingItem): CarOffer => ({
      id: b.id,
      provider: 'mock',
      name: b.car?.carType ?? b.title,
      category: b.car?.carType ?? '',
      company: b.car?.company ?? b.provider,
      pricePerDay: b.price,
      totalPrice: b.price,
      currency: b.currency as import('../../types/booking').Currency,
      days: 1,
      transmission: 'automatic',
      seats: 5,
      doors: 4,
      hasAC: true,
      freeKm: 'unlimited',
      pickupLocation: b.car?.pickupLocation ?? '',
      insuranceIncluded: false,
      refundPolicy: b.refund.refundable ? 'flexible' : 'strict',
      matchScore: 0,
      tags: [],
    });

    const bookingToInsurance = (b: import('../../types/booking').BookingItem): InsurancePlan => ({
      id: b.id,
      provider: 'qover',
      name: b.title,
      planType: 'essential',
      coverageItems: b.insurance?.coverage ?? [],
      price: b.price,
      currency: b.currency as import('../../types/booking').Currency,
      tags: [],
      highlights: [],
    });

    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[tabStyles.content, { paddingBottom: Spacing.xl }]}
          showsVerticalScrollIndicator={false}
        >
          {flightBookings.length > 0 && (
            <CollapsibleSection title="✈️ Voli" count={flightBookings.length}>
              {flightBookings.map((b) => (
                <FlightRow
                  key={b.id}
                  group={bookingToFlightGroup(b)}
                  label={b.flight?.direction === 'return' ? 'Ritorno' : 'Andata'}
                  isDraft={isDraft}
                  onPress={() => navigate(b.id)}
                />
              ))}
            </CollapsibleSection>
          )}

          {hotelBookings.length > 0 && (
            <CollapsibleSection title="🏨 Hotel" count={hotelBookings.length}>
              {hotelBookings.map((b) => (
                <HotelRow
                  key={b.id}
                  hotel={bookingToHotel(b)}
                  nights={b.hotel?.nights ?? nights}
                  isDraft={isDraft}
                  checkIn={b.timing.startDate}
                  checkOut={b.timing.endDate}
                  onPress={() => navigate(b.id)}
                />
              ))}
            </CollapsibleSection>
          )}

          {activityBookings.length > 0 && (
            <CollapsibleSection title="🎯 Attività" count={activityBookings.length}>
              {activityBookings.map((b) => (
                <ActivityRow
                  key={b.id}
                  activity={bookingToActivity(b)}
                  isDraft={isDraft}
                  onPress={() => navigate(b.id)}
                />
              ))}
            </CollapsibleSection>
          )}

          {carBooking && (
            <CollapsibleSection title="🚗 Auto" count={1}>
              <CarRow
                car={bookingToCar(carBooking)}
                isDraft={isDraft}
                onPress={() => navigate(carBooking.id)}
              />
            </CollapsibleSection>
          )}

          {insuranceBooking && (
            <CollapsibleSection title="🏥 Assicurazione" count={1}>
              <InsuranceRow
                plan={bookingToInsurance(insuranceBooking)}
                isDraft={isDraft}
                onPress={() => navigate(insuranceBooking.id)}
              />
            </CollapsibleSection>
          )}

          {hasVisa && (
            <CollapsibleSection title="🛂 Visto">
              <VisaRow visa={trip.visaInfo!} onPress={() => navigate('visa')} />
            </CollapsibleSection>
          )}
        </ScrollView>

        <TotalBar
          total={trip.totalPrice}
          isDraft={isDraft}
          insetBottom={insets.bottom}
          breakdown={breakdown}
          onBook={isDraft ? () => {} : undefined}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <EmptyBookings />
      </ScrollView>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
});
