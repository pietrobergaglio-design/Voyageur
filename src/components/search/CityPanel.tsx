import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CityStop } from '../../types/multi-city';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../constants/theme';

interface Props {
  stop: CityStop;
  onPress: () => void;
}

function formatDateRange(startIso: string, endIso: string, nights: number): string {
  const start = new Date(startIso + 'T00:00:00');
  const end = new Date(endIso + 'T00:00:00');
  const startStr = start.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  const endStr = end.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  return `${startStr} – ${endStr} · ${nights} ${nights === 1 ? 'notte' : 'notti'}`;
}

export function CityPanel({ stop, onPress }: Props) {
  const hasHotel = !!stop.selectedHotel;
  const actCount = stop.selectedActivities.length;

  let statusText = 'Tocca per scegliere hotel e attività';
  let statusColor: string = Colors.text.muted;

  if (hasHotel || actCount > 0) {
    const parts: string[] = [];
    if (hasHotel) parts.push(`✓ ${stop.selectedHotel!.name}`);
    if (actCount > 0) parts.push(`${actCount} ${actCount === 1 ? 'attività' : 'attività'}`);
    statusText = parts.join(' · ');
    statusColor = Colors.teal;
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {/* Hero gradient */}
      <LinearGradient
        colors={stop.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroOverlay}>
          <Text style={styles.heroFlag}>{stop.flagEmoji}</Text>
          <Text style={styles.heroCity}>{stop.name}</Text>
          {stop.isBase && (
            <View style={styles.baseBadge}>
              <Text style={styles.baseBadgeText}>Base</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Bottom info */}
      <View style={styles.info}>
        <View style={styles.infoLeft}>
          <Text style={styles.dates}>{formatDateRange(stop.startDate, stop.endDate, stop.nights)}</Text>
          <Text style={[styles.status, { color: statusColor }]} numberOfLines={1}>
            {statusText}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.9 },
  hero: {
    height: 120,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  heroFlag: { fontSize: 22 },
  heroCity: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xl,
    color: Colors.white,
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  baseBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  baseBadgeText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.white,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  infoLeft: { flex: 1, gap: 2 },
  dates: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  status: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
  },
  arrow: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 20,
    color: Colors.text.muted,
  },
});
