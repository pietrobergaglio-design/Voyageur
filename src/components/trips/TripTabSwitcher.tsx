import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const INDICATOR_WIDTH = SCREEN_WIDTH / 2;

export type TripTab = 'itinerario' | 'prenotazioni';

interface Props {
  active: TripTab;
  onChange: (tab: TripTab) => void;
  bookingCount?: number;
}

const TABS: { key: TripTab; label: string }[] = [
  { key: 'itinerario', label: '🗓️ Itinerario' },
  { key: 'prenotazioni', label: '📁 Prenotazioni' },
];

export function TripTabSwitcher({ active, onChange, bookingCount }: Props) {
  const indicatorX = useSharedValue(active === 'itinerario' ? 0 : 1);

  useEffect(() => {
    indicatorX.value = withTiming(active === 'itinerario' ? 0 : 1, { duration: 200 });
  }, [active]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value * INDICATOR_WIDTH }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          const showBadge = tab.key === 'prenotazioni' && bookingCount !== undefined && bookingCount > 0;
          return (
            <Pressable
              key={tab.key}
              style={styles.tab}
              onPress={() => onChange(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{bookingCount}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.indicatorTrack}>
        <Animated.View style={[styles.indicator, indicatorStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: 6,
    minHeight: 48,
  },
  tabText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  tabTextActive: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.navy,
  },
  badge: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    color: Colors.white,
    lineHeight: 13,
  },
  indicatorTrack: {
    height: 2,
    flexDirection: 'row',
  },
  indicator: {
    width: INDICATOR_WIDTH,
    height: 2,
    backgroundColor: Colors.accent,
  },
});
