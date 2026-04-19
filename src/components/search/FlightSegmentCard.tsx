import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import type { FlightDirectionGroup, FlightOffer } from '../../types/booking';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../constants/theme';

export type { FlightDirectionGroup };

interface Props {
  group: FlightDirectionGroup;
  selected: boolean;
  onSelect: () => void;
  direction: 'outbound' | 'return';
  currency?: string;
  /** Full offer for baggage and refund data */
  offer?: FlightOffer | null;
}

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function dayOffset(depIso: string, arrIso: string): number {
  const dep = depIso.split('T')[0];
  const arr = arrIso.split('T')[0];
  if (!dep || !arr) return 0;
  return Math.round(
    (new Date(arr).getTime() - new Date(dep).getTime()) / 86_400_000,
  );
}

// ─── Stop timeline ────────────────────────────────────────────────────────────

function StopTimeline({ group }: { group: FlightDirectionGroup }) {
  const segs = group.segments;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const isNextDay = dayOffset(group.departureAt, group.arrivalAt) > 0;

  return (
    <View style={tl.container}>
      {/* Departure */}
      <View style={tl.endpoint}>
        <Text style={tl.time}>{fmt(group.departureAt)}</Text>
        <View style={tl.dot} />
        <Text style={tl.iata}>{first.origin}</Text>
      </View>

      {/* Stopover segments */}
      {segs.slice(0, -1).map((seg, idx) => {
        const nextSeg = segs[idx + 1];
        // Layover duration: gap between arrival of this seg and departure of next
        const layoverMin = nextSeg
          ? Math.round((new Date(nextSeg.departureAt).getTime() - new Date(seg.arrivalAt).getTime()) / 60_000)
          : 0;
        return (
          <View key={seg.destination + idx} style={tl.stopGroup}>
            <View style={tl.lineWrap}>
              <View style={tl.line} />
              <Text style={tl.segDur}>{fmtDur(seg.durationMinutes)}</Text>
            </View>
            <View style={tl.stopCol}>
              <Text style={tl.time}>{fmt(seg.arrivalAt)}</Text>
              <View style={[tl.dot, tl.dotStop]} />
              <Text style={tl.iata}>{seg.destination}</Text>
              {layoverMin > 0 && (
                <Text style={tl.layover}>{fmtDur(layoverMin)} scalo</Text>
              )}
            </View>
          </View>
        );
      })}

      {/* Last segment line */}
      <View style={tl.lineWrap}>
        <View style={tl.line} />
        <Text style={tl.segDur}>{fmtDur(last.durationMinutes)}</Text>
      </View>

      {/* Arrival */}
      <View style={tl.endpoint}>
        <View style={tl.arrivalRow}>
          <Text style={tl.time}>{fmt(group.arrivalAt)}</Text>
          {isNextDay && (
            <View style={tl.dayBadge}>
              <Text style={tl.dayBadgeText}>+1</Text>
            </View>
          )}
        </View>
        <View style={tl.dot} />
        <Text style={tl.iata}>{last.destination}</Text>
      </View>
    </View>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function FlightSegmentCard({ group, selected, onSelect, currency = 'EUR', offer }: Props) {
  const stopsLabel = group.stops === 0
    ? 'Diretto'
    : `${group.stops} scal${group.stops === 1 ? 'o' : 'i'}`;

  // Baggage
  const hasChecked = offer?.baggageIncluded ?? false;
  const hasCabin = offer?.baggage?.some((b) => b.type === 'carry_on' && b.quantity > 0) ?? true;
  const baggageLabel = hasChecked
    ? '🧳 Bagaglio incluso'
    : hasCabin
    ? '⚠️ Solo bagaglio a mano'
    : '❌ Nessun bagaglio';
  const baggageColor = hasChecked ? Colors.teal : hasCabin ? '#E8A020' : '#D94040';

  // Refund
  const refundable = offer ? offer.refundPolicy !== 'strict' : false;
  const refundLabel = offer
    ? refundable
      ? offer.refundPolicy === 'flexible'
        ? '♻️ Rimborsabile entro 30 giorni'
        : '♻️ Rimborsabile entro 7 giorni'
      : '⛔ Non rimborsabile'
    : null;
  const refundColor = refundable ? Colors.teal : '#D94040';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.cardPressed]}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {/* Header: logo + airline + price */}
      <View style={styles.header}>
        <View style={styles.airlineRow}>
          {offer?.logoUrl ? (
            <Image source={{ uri: offer.logoUrl }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>✈️</Text>
            </View>
          )}
          <View>
            <Text style={styles.airline} numberOfLines={1}>{group.airline}</Text>
            <Text style={styles.stopsLabel}>{stopsLabel} · {fmtDur(group.durationMinutes)}</Text>
          </View>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>da</Text>
          <Text style={styles.price}>{Math.round(group.estimatedPrice).toLocaleString('it-IT')}</Text>
          <Text style={styles.priceCurrency}>{currency}</Text>
        </View>
      </View>

      {/* Timeline */}
      <StopTimeline group={group} />

      {/* Baggage + Refund rows */}
      {offer && (
        <View style={styles.metaRows}>
          <Text style={[styles.metaRow, { color: baggageColor }]}>{baggageLabel}</Text>
          {refundLabel && (
            <Text style={[styles.metaRow, { color: refundColor }]}>{refundLabel}</Text>
          )}
        </View>
      )}

      {selected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>✓ Selezionato</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardSelected: {
    borderColor: Colors.teal,
    borderWidth: 2,
    shadowColor: Colors.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: { opacity: 0.88 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  airlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: Colors.background,
  },
  logoPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: { fontSize: 14 },
  airline: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  stopsLabel: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 1,
  },

  priceBlock: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.text.muted,
  },
  price: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
  },
  priceCurrency: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.text.muted,
  },

  metaRows: {
    gap: 4,
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  metaRow: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
  },

  selectedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.teal + '18',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  selectedBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.teal,
  },
});

// ─── Timeline styles ──────────────────────────────────────────────────────────

const tl = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  endpoint: {
    alignItems: 'center',
    gap: 3,
    minWidth: 44,
  },
  stopGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stopCol: {
    alignItems: 'center',
    gap: 3,
    minWidth: 44,
  },
  lineWrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 14, // align with center of dot
    gap: 2,
  },
  line: {
    width: '100%',
    height: 1.5,
    backgroundColor: Colors.border,
  },
  segDur: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    color: Colors.text.muted,
  },
  time: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.navy,
  },
  dotStop: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.text.secondary,
  },
  iata: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.text.secondary,
  },
  layover: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    color: Colors.text.muted,
    marginTop: 1,
  },
  arrivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  dayBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 9,
    color: Colors.white,
  },
});
