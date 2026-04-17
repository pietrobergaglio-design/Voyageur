import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DateRangePicker } from './DateRangePicker';
import { TravelerSelector } from './TravelerSelector';
import { PlaceAutocomplete } from './PlaceAutocomplete';
import type { SearchParams } from '../../types/booking';
import type { PlaceSelection } from '../../types/places';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  params: SearchParams;
  onChange: (params: SearchParams) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

export function SearchBar({ params, onChange, onSearch, isLoading }: Props) {
  const update = (partial: Partial<SearchParams>) => onChange({ ...params, ...partial });

  const originSelection: PlaceSelection | null =
    params.originCode
      ? { displayName: params.origin, iataCode: params.originCode, cityName: params.origin }
      : null;

  const destinationSelection: PlaceSelection | null =
    params.destinationCode
      ? { displayName: params.destination, iataCode: params.destinationCode, cityName: params.destination }
      : null;

  const handleOriginChange = (place: PlaceSelection | null) => {
    if (place) update({ origin: place.cityName, originCode: place.iataCode });
    else update({ origin: '', originCode: '' });
  };

  const handleDestinationChange = (place: PlaceSelection | null) => {
    if (place) update({ destination: place.cityName, destinationCode: place.iataCode });
    else update({ destination: '', destinationCode: '' });
  };

  return (
    <View style={styles.container}>
      <PlaceAutocomplete
        label="Partenza"
        placeholder="Da dove parti?"
        icon="🛫"
        value={originSelection}
        onChange={handleOriginChange}
        zIndex={2}
      />

      <PlaceAutocomplete
        label="Destinazione"
        placeholder="Dove vuoi andare?"
        icon="📍"
        value={destinationSelection}
        onChange={handleDestinationChange}
        zIndex={1}
      />

      <DateRangePicker
        checkIn={params.checkIn}
        checkOut={params.checkOut}
        onChangeCheckIn={(d) => update({ checkIn: d })}
        onChangeCheckOut={(d) => update({ checkOut: d })}
      />

      <TravelerSelector
        value={params.travelers}
        onChange={(v) => update({ travelers: v })}
      />

      <TouchableOpacity
        style={[styles.searchBtn, isLoading && styles.searchBtnLoading]}
        onPress={onSearch}
        activeOpacity={0.85}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={isLoading ? 'Ricerca in corso' : 'Cerca tutto'}
        accessibilityState={{ disabled: !!isLoading }}
      >
        {isLoading ? (
          <View style={styles.searchBtnInner}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.searchBtnText}>Ricerca in corso…</Text>
          </View>
        ) : (
          <Text style={styles.searchBtnText}>Cerca tutto 🔍</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    zIndex: 20,
    overflow: 'visible',
  },
  searchBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.xs,
    minHeight: 48,
    justifyContent: 'center',
  },
  searchBtnLoading: {
    opacity: 0.75,
  },
  searchBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
});
