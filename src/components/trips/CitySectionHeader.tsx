import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CityStop } from '../../types/multi-city';
import { Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

interface Props {
  stop: CityStop;
  globalDayStart: number;
  globalDayEnd: number;
}

function fmt(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function CitySectionHeader({ stop, globalDayStart, globalDayEnd }: Props) {
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={stop.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.row}>
          <Text style={styles.flag}>{stop.flagEmoji}</Text>
          <View style={styles.info}>
            <Text style={styles.cityName}>📍 {stop.name.toUpperCase()}</Text>
            <Text style={styles.meta}>
              {fmt(stop.startDate)} – {fmt(stop.endDate)} · {stop.nights}{' '}
              {stop.nights === 1 ? 'notte' : 'notti'} · Giorni {globalDayStart}–{globalDayEnd}
            </Text>
          </View>
          {stop.isBase && (
            <View style={styles.basePill}>
              <Text style={styles.basePillText}>Base</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: -Spacing.lg,
    marginBottom: Spacing.sm,
  },
  gradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  flag: { fontSize: 24 },
  info: { flex: 1, gap: 2 },
  cityName: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 1,
  },
  meta: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  basePill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  basePillText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.white,
  },
});
