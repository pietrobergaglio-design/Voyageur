import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { ActivityOffer } from '../../types/booking';
import { MatchTagBadge, getMatchScoreColor } from './FlightCard';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  activity: ActivityOffer;
  selected: boolean;
  onSelect: () => void;
}

export function ActivityCard({ activity, selected, onSelect }: Props) {
  const hasPhoto = !!activity.thumbnailUrl;
  const hasRating = activity.rating !== undefined && activity.rating > 0;
  const durationText = activity.durationLabel ?? `${activity.durationHours}h`;

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      {hasPhoto && (
        <View style={styles.photoWrapper}>
          <Image
            source={{ uri: activity.thumbnailUrl }}
            style={styles.photo}
            resizeMode="cover"
          />
          {activity.hasFreeCancellation && (
            <View style={styles.freeCancelBadge}>
              <Text style={styles.freeCancelText}>Cancellazione gratuita</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.headerRow}>
          {!hasPhoto && (
            <View style={styles.emojiBox}>
              <Text style={styles.emoji}>{activity.emoji ?? '🎯'}</Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={2}>{activity.name}</Text>
            <View style={styles.metaRow}>
              {activity.suggestedDay && (
                <Text style={styles.meta}>{activity.suggestedDay} · </Text>
              )}
              <Text style={styles.meta}>{durationText}</Text>
            </View>
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>
              {activity.price.toLocaleString('it-IT', { maximumFractionDigits: 0 })} {activity.currency}
            </Text>
            <Text style={styles.perPerson}>/ persona</Text>
          </View>
        </View>

        {hasRating && (
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingScore}>{activity.rating!.toFixed(1)}</Text>
            </View>
            {activity.reviewCount !== undefined && activity.reviewCount > 0 && (
              <Text style={styles.reviewCount}>
                {activity.reviewCount.toLocaleString('it-IT')} recensioni
              </Text>
            )}
          </View>
        )}

        {activity.shortDescription && !hasPhoto && (
          <Text style={styles.shortDesc} numberOfLines={2}>{activity.shortDescription}</Text>
        )}

        {activity.tags.length > 0 && (
          <View style={styles.tagRow}>
            {activity.tags.map((t) => <MatchTagBadge key={t} tag={t} />)}
            <Text style={[styles.matchScore, { color: getMatchScoreColor(activity.matchScore) }]}>{activity.matchScore}% match</Text>
          </View>
        )}

        {activity.highlights.length > 0 && (
          <View style={styles.highlights}>
            {activity.highlights.map((h) => (
              <Text key={h} style={styles.highlight}>✓ {h}</Text>
            ))}
          </View>
        )}
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
    height: 140,
  },
  freeCancelBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: Colors.teal,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  freeCancelText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.white,
  },
  body: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  emojiBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  price: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
  },
  perPerson: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
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
  reviewCount: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  shortDesc: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  matchScore: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    // color applied dynamically via getMatchScoreColor
    marginLeft: 'auto',
  },
  highlights: {
    gap: 2,
  },
  highlight: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
});
