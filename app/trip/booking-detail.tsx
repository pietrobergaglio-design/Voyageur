import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppStore } from '../../src/stores/useAppStore';
import type { FlightDirectionGroup, HotelOffer, ActivityOffer, CarOffer, InsurancePlan, VisaInfo, BookingItem } from '../../src/types/booking';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../src/constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDur(min: number): string {
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

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
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  booked: { backgroundColor: Colors.teal + '18' },
  draft: { backgroundColor: Colors.accent + '15' },
  text: { fontFamily: FontFamily.bodySemiBold, fontSize: 10 },
  textBooked: { color: Colors.teal },
  textDraft: { color: Colors.accent },
});

// ─── Content renderers ────────────────────────────────────────────────────────

function FlightContent({ group, label, isDraft }: { group: FlightDirectionGroup; label: string; isDraft: boolean }) {
  const first = group.segments[0];
  const last = group.segments[group.segments.length - 1];
  const stopsLabel = group.stops === 0 ? 'Diretto' : `${group.stops} scal${group.stops === 1 ? 'a' : 'e'}`;

  return (
    <>
      <Text style={s.heroEmoji}>✈️</Text>
      <Text style={s.title}>{label} · {group.airline}</Text>
      <Text style={s.sub}>{first.origin} {fmtTime(group.departureAt)} → {last.destination} {fmtTime(group.arrivalAt)}</Text>
      <Text style={s.sub}>{fmtDur(group.durationMinutes)} · {stopsLabel}</Text>
      <View style={s.divider} />
      <Text style={s.sectionLabel}>Segmenti</Text>
      {group.segments.map((seg, i) => (
        <View key={i} style={s.segRow}>
          <Text style={s.segText}>{seg.flightNumber} · {seg.origin} → {seg.destination}</Text>
          <Text style={s.segSub}>{fmtTime(seg.departureAt)} → {fmtTime(seg.arrivalAt)} · {fmtDur(seg.durationMinutes)}</Text>
        </View>
      ))}
      <View style={s.divider} />
      <Text style={s.priceLabel}>{isDraft ? 'Prezzo stimato' : 'Prezzo pagato'}</Text>
      <Text style={s.price}>~€{Math.round(group.estimatedPrice)}</Text>
    </>
  );
}

function HotelContent({
  hotel, nights, checkIn, checkOut, isDraft,
}: {
  hotel: HotelOffer; nights: number; checkIn?: string; checkOut?: string; isDraft: boolean;
}) {
  return (
    <>
      <Text style={s.heroEmoji}>🏨</Text>
      <Text style={s.title}>{hotel.name}</Text>
      <Text style={s.sub}>{'★'.repeat(hotel.stars)} · {hotel.zone}</Text>
      {checkIn && checkOut && (
        <Text style={s.sub}>{fmtDate(checkIn)} → {fmtDate(checkOut)} · {nights} notti</Text>
      )}
      {hotel.amenities.length > 0 && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Servizi</Text>
          <View style={s.tagsWrap}>
            {hotel.amenities.map((a) => (
              <View key={a} style={s.tag}>
                <Text style={s.tagText}>{a}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      <View style={s.divider} />
      <Text style={s.priceLabel}>{isDraft ? 'Prezzo stimato' : 'Prezzo pagato'}</Text>
      <Text style={s.price}>€{Math.round(hotel.totalPrice)}</Text>
      {hotel.pricePerNight && (
        <Text style={s.sub}>€{Math.round(hotel.pricePerNight)}/notte</Text>
      )}
    </>
  );
}

function ActivityContent({ activity, isDraft }: { activity: ActivityOffer; isDraft: boolean }) {
  return (
    <>
      <Text style={s.heroEmoji}>{activity.emoji ?? '🎯'}</Text>
      <Text style={s.title}>{activity.name}</Text>
      <Text style={s.sub}>{activity.durationLabel ?? `${activity.durationHours}h`}{activity.categories[0] ? ` · ${activity.categories[0]}` : ''}</Text>
      {activity.shortDescription && (
        <>
          <View style={s.divider} />
          <Text style={s.description}>{activity.shortDescription}</Text>
        </>
      )}
      {activity.highlights.length > 0 && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Highlights</Text>
          {activity.highlights.map((h, i) => (
            <Text key={i} style={s.bullet}>• {h}</Text>
          ))}
        </>
      )}
      <View style={s.divider} />
      <Text style={s.priceLabel}>{isDraft ? 'Prezzo stimato' : 'Prezzo pagato'}</Text>
      <Text style={s.price}>€{Math.round(activity.price)}</Text>
    </>
  );
}

function CarContent({ car, isDraft }: { car: CarOffer; isDraft: boolean }) {
  return (
    <>
      <Text style={s.heroEmoji}>🚗</Text>
      <Text style={s.title}>{car.company} · {car.name}</Text>
      <Text style={s.sub}>{car.category} · {car.seats} posti · {car.transmission === 'automatic' ? 'Automatico' : 'Manuale'}</Text>
      <Text style={s.sub}>{car.days} giorni</Text>
      <View style={s.divider} />
      <Text style={s.sectionLabel}>Ritiro</Text>
      <Text style={s.description}>{car.pickupLocation}</Text>
      <View style={s.divider} />
      <Text style={s.priceLabel}>{isDraft ? 'Prezzo stimato' : 'Prezzo pagato'}</Text>
      <Text style={s.price}>€{Math.round(car.totalPrice)}</Text>
      <Text style={s.sub}>€{Math.round(car.pricePerDay)}/giorno</Text>
    </>
  );
}

function InsuranceContent({ plan, isDraft }: { plan: InsurancePlan; isDraft: boolean }) {
  return (
    <>
      <Text style={s.heroEmoji}>🏥</Text>
      <Text style={s.title}>{plan.name}</Text>
      <Text style={s.sub}>{plan.planType} · {plan.provider}</Text>
      <View style={s.divider} />
      <Text style={s.sectionLabel}>Copertura</Text>
      {plan.coverageItems.map((item, i) => (
        <Text key={i} style={s.bullet}>✓ {item}</Text>
      ))}
      <View style={s.divider} />
      <Text style={s.priceLabel}>{isDraft ? 'Prezzo stimato' : 'Prezzo pagato'}</Text>
      <Text style={s.price}>€{Math.round(plan.price)}</Text>
    </>
  );
}

function VisaContent({ visa }: { visa: VisaInfo }) {
  return (
    <>
      <Text style={s.heroEmoji}>🛂</Text>
      <Text style={s.title}>{visa.statusLabel}</Text>
      <Text style={s.sub}>{visa.destination} · passaporto {visa.forNationality}</Text>
      <View style={s.divider} />
      <Text style={s.description}>{visa.details}</Text>
      {visa.requirements && visa.requirements.length > 0 && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Requisiti</Text>
          {visa.requirements.map((r, i) => (
            <Text key={i} style={s.bullet}>• {r}</Text>
          ))}
        </>
      )}
      {visa.fee !== undefined && (
        <>
          <View style={s.divider} />
          <Text style={s.priceLabel}>Costo visto</Text>
          <Text style={s.price}>{visa.fee === 0 ? 'Gratuito' : `${visa.feeCurrency ?? '€'}${visa.fee}`}</Text>
        </>
      )}
    </>
  );
}

// ─── BookingItem renderer (new unified format) ───────────────────────────────

const BOOKING_EMOJI: Record<string, string> = {
  flight: '✈️', hotel: '🏨', activity: '🎯', car: '🚗',
  insurance: '🏥', visa: '🛂', transfer: '🚉',
};

function BookingItemContent({ booking, isDraft }: { booking: BookingItem; isDraft: boolean }) {
  const refundable = booking.refund.refundable;
  const deadline = booking.refund.fullRefundDeadline ?? booking.refund.partialRefundDeadline ?? null;
  const daysLeft = deadline
    ? Math.floor((new Date(deadline).getTime() - Date.now()) / 86_400_000)
    : null;
  const refundEmoji = !refundable ? '🔴' : daysLeft === null ? '🟢' : daysLeft > 7 ? '🟢' : daysLeft >= 2 ? '🟡' : '🔴';

  return (
    <>
      <Text style={s.heroEmoji}>{BOOKING_EMOJI[booking.type] ?? '📋'}</Text>
      <Text style={s.title}>{booking.title}</Text>
      <Text style={s.sub}>{booking.provider}</Text>

      {/* Timing */}
      <View style={s.divider} />
      <Text style={s.sectionLabel}>Date</Text>
      <Text style={s.description}>
        {fmtDate(booking.timing.startDate)}
        {booking.timing.startTime ? ` alle ${booking.timing.startTime}` : ''}
        {booking.timing.endDate ? ` → ${fmtDate(booking.timing.endDate)}` : ''}
        {booking.timing.endTime ? ` alle ${booking.timing.endTime}` : ''}
      </Text>

      {/* Flight */}
      {booking.type === 'flight' && booking.flight && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Rotta</Text>
          <Text style={s.description}>{booking.flight.origin} → {booking.flight.destination}</Text>
          {booking.flight.flightNumber ? <Text style={s.sub}>Volo {booking.flight.flightNumber}</Text> : null}
          {booking.flight.stops.length > 0 && (
            <Text style={s.sub}>{booking.flight.stops.length} scala: {booking.flight.stops.map(s => s.locationName).join(', ')}</Text>
          )}
          {booking.flight.stops.length === 0 && <Text style={s.sub}>Volo diretto</Text>}
        </>
      )}

      {/* Hotel */}
      {booking.type === 'hotel' && booking.hotel && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Hotel</Text>
          {booking.hotel.address ? <Text style={s.description}>{booking.hotel.address}</Text> : null}
          {booking.hotel.roomType ? <Text style={s.sub}>{booking.hotel.roomType}</Text> : null}
          {booking.hotel.nights ? <Text style={s.sub}>{booking.hotel.nights} notti</Text> : null}
          <Text style={s.sub}>Check-in: {booking.hotel.checkinTime} · Check-out: {booking.hotel.checkoutTime}</Text>
          {booking.hotel.amenities.length > 0 && (
            <View style={s.tagsWrap}>
              {booking.hotel.amenities.map((a) => (
                <View key={a} style={s.tag}><Text style={s.tagText}>{a}</Text></View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Car */}
      {booking.type === 'car' && booking.car && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Auto</Text>
          <Text style={s.description}>{booking.car.carType} · {booking.car.company}</Text>
          <Text style={s.sub}>Ritiro: {booking.car.pickupLocation} alle {booking.car.pickupTime}</Text>
          <Text style={s.sub}>Reso: {booking.car.returnLocation} alle {booking.car.returnTime}</Text>
        </>
      )}

      {/* Insurance */}
      {booking.type === 'insurance' && booking.insurance && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Copertura {booking.insurance.plan}</Text>
          {booking.insurance.coverage.map((c, i) => (
            <Text key={i} style={s.bullet}>✓ {c}</Text>
          ))}
          {booking.insurance.medicalLimit && (
            <Text style={s.sub}>Copertura medica: €{booking.insurance.medicalLimit.toLocaleString('it-IT')}</Text>
          )}
        </>
      )}

      {/* Transfer */}
      {booking.type === 'transfer' && booking.transfer && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Transfer</Text>
          <Text style={s.description}>{booking.transfer.from} → {booking.transfer.to}</Text>
          <Text style={s.sub}>{booking.transfer.modeLabel}</Text>
          {booking.transfer.durationMin ? <Text style={s.sub}>{fmtDur(booking.transfer.durationMin)}</Text> : null}
          {booking.transfer.priceEstimate ? <Text style={s.sub}>Stima: €{booking.transfer.priceEstimate}</Text> : null}
        </>
      )}

      {/* Refund */}
      <View style={s.divider} />
      <Text style={s.sectionLabel}>Rimborso {refundEmoji}</Text>
      <Text style={s.description}>{booking.refund.description}</Text>
      {deadline && daysLeft !== null && daysLeft >= 0 && (
        <Text style={s.sub}>Scade: {fmtDate(deadline)} ({daysLeft} {daysLeft === 1 ? 'giorno' : 'giorni'} rimasti)</Text>
      )}

      {/* Confirmation */}
      {booking.confirmation?.code && (
        <>
          <View style={s.divider} />
          <Text style={s.sectionLabel}>Codice conferma</Text>
          <Text style={[s.description, { fontFamily: FontFamily.bodyBold, letterSpacing: 1 }]}>{booking.confirmation.code}</Text>
        </>
      )}

      <View style={s.divider} />
      <Text style={s.priceLabel}>{isDraft ? 'Prezzo stimato' : 'Prezzo pagato'}</Text>
      <Text style={s.price}>€{Math.round(booking.price).toLocaleString('it-IT')}</Text>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const { tripId, bookingKey: rawKey } = useLocalSearchParams<{ tripId: string; bookingKey: string }>();
  const bookingKey = rawKey ? decodeURIComponent(rawKey) : '';
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId));

  if (!trip) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.headerBar}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backIcon}>←</Text>
          </Pressable>
          <Text style={s.headerTitle}>Dettaglio</Text>
        </View>
        <View style={s.emptyCenter}>
          <Text style={s.emptyText}>Prenotazione non trovata</Text>
        </View>
      </View>
    );
  }

  const isDraft = trip.status === 'draft';
  const nights = trip.checkIn && trip.checkOut
    ? Math.max(1, Math.round((new Date(trip.checkOut).getTime() - new Date(trip.checkIn).getTime()) / 86_400_000))
    : 1;

  const renderContent = () => {
    // New format: look up BookingItem by id in trip.bookings
    if (trip.bookings && trip.bookings.length > 0) {
      const booking = trip.bookings.find((b) => b.id === bookingKey);
      if (booking) return <BookingItemContent booking={booking} isDraft={isDraft} />;
    }

    if (bookingKey === 'visa' && trip.visaInfo) {
      return <VisaContent visa={trip.visaInfo} />;
    }
    if (bookingKey.startsWith('hotel_city_') && trip.cityStops) {
      const stopId = bookingKey.replace('hotel_city_', '');
      const stop = trip.cityStops.find((s) => s.id === stopId);
      if (stop?.selectedHotel) {
        return (
          <HotelContent
            hotel={stop.selectedHotel}
            nights={stop.nights}
            checkIn={stop.startDate}
            checkOut={stop.endDate}
            isDraft={isDraft}
          />
        );
      }
    }
    if (bookingKey.startsWith('activity_city_') && trip.cityStops) {
      const rest = bookingKey.replace('activity_city_', '');
      const underscoreIdx = rest.indexOf('_');
      if (underscoreIdx !== -1) {
        const stopId = rest.slice(0, underscoreIdx);
        const actId = rest.slice(underscoreIdx + 1);
        const stop = trip.cityStops.find((s) => s.id === stopId);
        const act = stop?.selectedActivities.find((a) => a.id === actId);
        if (act) return <ActivityContent activity={act} isDraft={isDraft} />;
      }
    }
    return (
      <View style={s.emptyCenter}>
        <Text style={s.emptyText}>Dettaglio non disponibile</Text>
      </View>
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancella prenotazione',
      'Questa azione è simulata. In produzione cancellerà la prenotazione.',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Conferma', style: 'destructive', onPress: () => router.back() },
      ],
    );
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.headerBar}>
        <Pressable style={s.backBtn} onPress={() => router.back()} accessibilityRole="button">
          <Text style={s.backIcon}>←</Text>
        </Pressable>
        <Text style={s.headerTitle}>Dettaglio prenotazione</Text>
        <StatusBadge isDraft={isDraft} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}

        <View style={s.divider} />

        {/* Modifica selezione */}
        <Pressable
          style={({ pressed }) => [s.modifyBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={s.modifyBtnText}>✏️ Modifica selezione</Text>
        </Pressable>

        {/* Documenti */}
        <Pressable
          style={({ pressed }) => [s.docsRow, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/(tabs)/docs')}
          accessibilityRole="button"
        >
          <Text style={s.docsText}>📄 Codice conferma e QR nei Documenti →</Text>
        </Pressable>

        {/* Cancella */}
        <Pressable
          style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.8 }]}
          onPress={handleCancel}
          accessibilityRole="button"
        >
          <Text style={s.cancelBtnText}>Cancella prenotazione</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -Spacing.xs },
  backIcon: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.xl, color: Colors.text.primary, lineHeight: 28 },
  headerTitle: { fontFamily: FontFamily.displayBold, fontSize: FontSize.lg, color: Colors.text.primary, flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  heroEmoji: { fontSize: 56, textAlign: 'center', marginBottom: Spacing.sm },
  title: {
    fontFamily: FontFamily.displayBold, fontSize: FontSize.xl,
    color: Colors.text.primary, textAlign: 'center',
  },
  sub: {
    fontFamily: FontFamily.body, fontSize: FontSize.sm,
    color: Colors.text.muted, textAlign: 'center',
  },
  description: {
    fontFamily: FontFamily.body, fontSize: FontSize.sm,
    color: Colors.text.secondary, lineHeight: 21,
  },
  sectionLabel: {
    fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  bullet: {
    fontFamily: FontFamily.body, fontSize: FontSize.sm,
    color: Colors.text.secondary, lineHeight: 22,
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: Colors.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.secondary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  priceLabel: {
    fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm,
    color: Colors.text.muted, textAlign: 'center',
  },
  price: {
    fontFamily: FontFamily.displayBold, fontSize: 32,
    color: Colors.text.primary, textAlign: 'center',
  },
  segRow: { gap: 2, paddingVertical: Spacing.xs },
  segText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm, color: Colors.text.primary },
  segSub: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted },
  modifyBtn: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  modifyBtnText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.md, color: Colors.text.secondary },
  docsRow: { alignItems: 'center', paddingVertical: Spacing.sm },
  docsText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.xs, color: Colors.text.muted },
  cancelBtn: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  cancelBtnText: {
    fontFamily: FontFamily.bodyMedium, fontSize: FontSize.md, color: '#EF4444',
  },
  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontFamily: FontFamily.body, fontSize: FontSize.md, color: Colors.text.muted },
});
