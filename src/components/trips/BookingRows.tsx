import { View, Text, Pressable, StyleSheet } from 'react-native';
import type {
  FlightDirectionGroup,
  HotelOffer,
  ActivityOffer,
  CarOffer,
  InsurancePlan,
  VisaInfo,
} from '../../types/booking';
import { Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDur(min: number): string {
  return `${Math.floor(min / 60)}h ${min % 60}m`;
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

export function FlightRow({ group, label, isDraft, onPress }: {
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

export function HotelRow({ hotel, nights, isDraft, checkIn, checkOut, onPress }: {
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

export function ActivityRow({ activity, isDraft, onPress }: {
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

export function CarRow({ car, isDraft, onPress }: {
  car: CarOffer;
  isDraft: boolean;
  onPress: () => void;
}) {
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

export function InsuranceRow({ plan, isDraft, onPress }: {
  plan: InsurancePlan;
  isDraft: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [rowStyles.row, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={rowStyles.left}>
        <Text style={rowStyles.emoji}>🛡️</Text>
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

export function VisaRow({ visa, onPress }: {
  visa: VisaInfo;
  onPress: () => void;
}) {
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

// ─── Shared row styles ────────────────────────────────────────────────────────

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
