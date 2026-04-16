import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { HotelOffer } from '../../types/booking';
import { RefundBadge, MatchTagBadge } from './FlightCard';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  hotel: HotelOffer;
  nights: number;
  selected: boolean;
  onSelect: () => void;
}

export function HotelCard({ hotel, nights, selected, onSelect }: Props) {
  const stars = '⭐'.repeat(hotel.stars);

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>{hotel.name}</Text>
          <Text style={styles.zone}>{stars} · {hotel.zone}</Text>
        </View>
        <View style={styles.badgeCol}>
          {hotel.tags.map((t) => <MatchTagBadge key={t} tag={t} />)}
          <RefundBadge policy={hotel.refundPolicy} />
        </View>
      </View>

      {/* Amenities */}
      <Text style={styles.amenities} numberOfLines={1}>
        {hotel.amenities.join(' · ')}
      </Text>

      {/* Price row */}
      <View style={styles.priceRow}>
        <View>
          <Text style={styles.perNight}>{hotel.pricePerNight} € / notte</Text>
          <Text style={styles.total}>{hotel.totalPrice.toLocaleString('it-IT')} € · {nights} notti</Text>
        </View>
        <Text style={styles.matchScore}>{hotel.matchScore}% match</Text>
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
  nameBlock: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  zone: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amenities: {
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
  perNight: {
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
