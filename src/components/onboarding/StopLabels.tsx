import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize } from '../../constants/theme';

interface Props {
  stops: readonly [string, string, string, string, string];
  activeIndex: number;
}

export function StopLabels({ stops, activeIndex }: Props) {
  return (
    <View style={styles.container}>
      {stops.map((label, i) => (
        <View key={label} style={styles.item}>
          <View style={[styles.dot, i === activeIndex && styles.dotActive]} />
          <Text
            style={[styles.label, i === activeIndex && styles.labelActive]}
            numberOfLines={2}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 4,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.onDark.muted,
    textAlign: 'center',
    lineHeight: 14,
  },
  labelActive: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.onDark.secondary,
  },
});
