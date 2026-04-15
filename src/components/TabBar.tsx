import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize } from '../constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabConfig {
  name: string;
  label: string;
  icon: IoniconName;
  iconOutline: IoniconName;
}

const TABS: TabConfig[] = [
  { name: 'search',  label: 'Cerca',      icon: 'search',        iconOutline: 'search-outline' },
  { name: 'trips',   label: 'Viaggi',     icon: 'airplane',      iconOutline: 'airplane-outline' },
  { name: 'docs',    label: 'Documenti',  icon: 'document-text', iconOutline: 'document-text-outline' },
  { name: 'explore', label: 'Esplora',    icon: 'globe',         iconOutline: 'globe-outline' },
  { name: 'profile', label: 'Profilo',    icon: 'person',        iconOutline: 'person-outline' },
];

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const tab = TABS[index];
          const isFocused = state.index === index;

          if (!tab) return null;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              activeOpacity={0.65}
            >
              {isFocused && <View style={styles.activePill} />}
              <Ionicons
                name={isFocused ? tab.icon : tab.iconOutline}
                size={22}
                color={isFocused ? Colors.accent : Colors.tab.inactive}
              />
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.tab.background,
    borderTopWidth: 1,
    borderTopColor: Colors.tab.border,
  },
  inner: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 4,
    gap: 3,
  },
  activePill: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  label: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.tab.inactive,
  },
  labelActive: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.accent,
  },
});
