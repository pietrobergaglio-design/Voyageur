import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { HotelOffer } from '../../types/booking';
import { RefundBadge, MatchTagBadge, getMatchScoreColor } from './FlightCard';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

function StarsRow({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Text style={starStyles.text}>
      {'★'.repeat(Math.min(count, 5))}{'☆'.repeat(Math.max(0, 5 - count))}
    </Text>
  );
}

const starStyles = StyleSheet.create({
  text: { fontFamily: FontFamily.body, fontSize: 11, color: '#F59E0B', letterSpacing: 1 },
});

interface Props {
  hotel: HotelOffer;
  nights: number;
  selected: boolean;
  onSelect: () => void;
}

export function HotelCard({ hotel, nights, selected, onSelect }: Props) {
  const hasPhoto = !!hotel.thumbnailUrl;
  const hasRating = hotel.rating !== undefined && hotel.rating > 0;
  const hasOriginalPrice = hotel.originalPrice && hotel.originalPrice > hotel.totalPrice;

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      {/* Photo — clipped to inner radius so border stays visible */}
      {hasPhoto && (
        <View style={styles.photoWrapper}>
          <Image
            source={{ uri: hotel.thumbnailUrl }}
            style={styles.photo}
            resizeMode="cover"
          />
        </View>
      )}

      <View style={styles.body}>
        {/* Header: name + badges */}
        <View style={styles.headerRow}>
          <View style={styles.nameBlock}>
            <Text style={styles.name} numberOfLines={2}>{hotel.name}</Text>
            <View style={styles.metaRow}>
              {hotel.stars > 0 && <StarsRow count={hotel.stars} />}
              {hotel.stars > 0 && <Text style={styles.dot}>·</Text>}
              <Text style={styles.zone} numberOfLines={1}>{hotel.zone}</Text>
            </View>
          </View>
          <View style={styles.badgeCol}>
            {hotel.tags.map((t) => <MatchTagBadge key={t} tag={t} />)}
            <RefundBadge policy={hotel.refundPolicy} />
          </View>
        </View>

        {/* Rating row */}
        {hasRating && (
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingScore}>{hotel.rating?.toFixed(1)}</Text>
            </View>
            <Text style={styles.ratingWord}>{hotel.reviewWord}</Text>
            {hotel.reviewCount !== undefined && hotel.reviewCount > 0 && (
              <Text style={styles.reviewCount}>
                · {hotel.reviewCount.toLocaleString('it-IT')} rec.
              </Text>
            )}
          </View>
        )}

        {/* Price row */}
        <View style={styles.priceRow}>
          <View style={styles.priceBlock}>
            {hasOriginalPrice && (
              <Text style={styles.originalPrice}>
                {hotel.originalPrice!.toLocaleString('it-IT', { maximumFractionDigits: 0 })} {hotel.currency}
              </Text>
            )}
            <Text style={styles.perNight}>
              {hotel.pricePerNight.toLocaleString('it-IT', { maximumFractionDigits: 0 })} {hotel.currency} / notte
            </Text>
            <Text style={styles.total}>
              {hotel.totalPrice.toLocaleString('it-IT', { maximumFractionDigits: 0 })} {hotel.currency} · {nights} nott{nights === 1 ? 'e' : 'i'}
            </Text>
          </View>
          <Text style={[styles.matchScore, { color: getMatchScoreColor(hotel.matchScore) }]}>{hotel.matchScore}% match</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const INNER_RADIUS = Radius.md - 2;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
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
  photoWrapper: {
    borderTopLeftRadius: INNER_RADIUS,
    borderTopRightRadius: INNER_RADIUS,
    overflow: 'hidden',
    backgroundColor: Colors.border,
  },
  photo: {
    width: '100%',
    height: 160,
  },
  body: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  nameBlock: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  dot: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  zone: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    flexShrink: 1,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBadge: {
    backgroundColor: Colors.teal,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ratingScore: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  ratingWord: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  reviewCount: {
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
  originalPrice: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    textDecorationLine: 'line-through',
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
    // color applied dynamically via getMatchScoreColor
  },
});
