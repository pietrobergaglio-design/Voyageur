import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { CarOffer } from '../../types/booking';
import { RefundBadge, MatchTagBadge } from './FlightCard';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  car: CarOffer;
  selected: boolean;
  onSelect: () => void;
}

export function CarCard({ car, selected, onSelect }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      <View style={styles.headerRow}>
        <View style={styles.carInfo}>
          <Text style={styles.name}>{car.name}</Text>
          <Text style={styles.company}>{car.company} · {car.category}</Text>
        </View>
        <View style={styles.badgeCol}>
          {car.tags.map((t) => <MatchTagBadge key={t} tag={t} />)}
          <RefundBadge policy={car.refundPolicy} />
        </View>
      </View>

      <View style={styles.specsRow}>
        <View style={styles.spec}>
          <Text style={styles.specIcon}>👥</Text>
          <Text style={styles.specText}>{car.seats} posti</Text>
        </View>
        <View style={styles.spec}>
          <Text style={styles.specIcon}>🚪</Text>
          <Text style={styles.specText}>{car.doors} porte</Text>
        </View>
        <View style={styles.spec}>
          <Text style={styles.specIcon}>{car.transmission === 'automatic' ? '⚙️' : '🔧'}</Text>
          <Text style={styles.specText}>{car.transmission === 'automatic' ? 'Automatico' : 'Manuale'}</Text>
        </View>
        <View style={styles.spec}>
          <Text style={styles.specIcon}>❄️</Text>
          <Text style={styles.specText}>{car.hasAC ? 'A/C' : 'No A/C'}</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <Text style={styles.detail}>
          {car.freeKm === 'unlimited' ? '✓ Km illimitati' : '· Km limitati'}
        </Text>
        {car.insuranceIncluded && (
          <Text style={styles.detail}>✓ Assicurazione inclusa</Text>
        )}
        <Text style={styles.detail}>📍 {car.pickupLocation}</Text>
      </View>

      <View style={styles.priceRow}>
        <View style={styles.priceBlock}>
          <Text style={styles.perDay}>
            {car.pricePerDay.toLocaleString('it-IT', { maximumFractionDigits: 0 })} {car.currency} / giorno
          </Text>
          <Text style={styles.total}>
            {car.totalPrice.toLocaleString('it-IT', { maximumFractionDigits: 0 })} {car.currency} · {car.days} giorn{car.days === 1 ? 'o' : 'i'}
          </Text>
        </View>
        <Text style={styles.matchScore}>{car.matchScore}% match</Text>
      </View>
    </TouchableOpacity>
  );
}

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
    borderColor: Colors.accent,
    borderWidth: 2,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  carInfo: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  company: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  specsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  specIcon: { fontSize: 11 },
  specText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  detailsRow: {
    gap: 2,
  },
  detail: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  priceBlock: {
    gap: 2,
  },
  perDay: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  total: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  matchScore: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.teal,
  },
});
