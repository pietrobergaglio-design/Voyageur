import { View, Text, ScrollView, StyleSheet, StatusBar, Linking, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/stores/useAppStore';
import { mockTokyoTrip } from '../../src/data/mockTrip';
import { getDestinationInfo } from '../../src/data/mockDestination';
import { DocSection } from '../../src/components/docs/DocSection';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../src/constants/theme';

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const storeTrips = useAppStore((s) => s.trips);
  const activeTrip = storeTrips.length > 0 ? storeTrips[0] : mockTokyoTrip;
  const info = getDestinationInfo(activeTrip.destinationCode);

  if (!info) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }, styles.centered]}>
        <Text style={styles.emptyText}>Nessuna info disponibile per questa destinazione.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Hero header */}
      <View style={styles.hero}>
        <Text style={styles.heroFlag}>{info.flag}</Text>
        <View>
          <Text style={styles.heroTitle}>{info.name}</Text>
          <Text style={styles.heroCountry}>{info.country}</Text>
        </View>
        <View style={styles.weatherChip}>
          <Text style={styles.weatherEmoji}>{info.weather.emoji}</Text>
          <Text style={styles.weatherTemp}>{info.weather.avgTempC}°C</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Weather */}
        <View style={styles.weatherCard}>
          <Text style={styles.weatherMonth}>{info.weather.month}</Text>
          <Text style={styles.weatherDesc}>{info.weather.description}</Text>
        </View>

        {/* Visa */}
        <DocSection title="Visto" emoji="📋" defaultOpen>
          <View style={styles.gap}>
            <Text style={[styles.visaStatus, { color: info.visa.required ? '#dc2626' : '#22a06b' }]}>
              {info.visa.required ? '🔴' : '🟢'} {info.visa.label}
            </Text>
            <Text style={styles.bodyText}>{info.visa.details}</Text>
            {info.visa.stayLimit && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Durata massima</Text>
                <Text style={styles.infoValue}>{info.visa.stayLimit}</Text>
              </View>
            )}
          </View>
        </DocSection>

        {/* Health */}
        <DocSection title="Salute" emoji="🏥">
          <View style={styles.gap}>
            <Text style={styles.subTitle}>Vaccinazioni</Text>
            {info.health.vaccines.map((v) => (
              <Text key={v} style={styles.listItem}>· {v}</Text>
            ))}
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Acqua</Text>
              <Text style={styles.infoValue}>{info.health.water}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Emergenze</Text>
              <Text style={styles.infoValue}>{info.health.emergencyNumber}</Text>
            </View>
            <Text style={styles.bodyText}>{info.health.hospitals}</Text>
          </View>
        </DocSection>

        {/* Practical */}
        <DocSection title="Info pratiche" emoji="💡">
          <View style={styles.gap}>
            {[
              { label: 'Valuta', value: info.practical.currency },
              { label: 'Cambio', value: info.practical.exchangeRate },
              { label: 'Fuso orario', value: info.practical.timezone },
              { label: 'Presa elettrica', value: `${info.practical.plugType} · ${info.practical.voltage}` },
              { label: 'Mance', value: info.practical.tipping },
              { label: 'Lingua', value: info.practical.language },
            ].map(({ label, value }) => (
              <View key={label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={[styles.infoValue, styles.infoValueRight]}>{value}</Text>
              </View>
            ))}
          </View>
        </DocSection>

        {/* Phrases */}
        <DocSection title="Frasi utili" emoji="💬">
          <View style={styles.gap}>
            {info.phrases.map((p) => (
              <View key={p.italian} style={styles.phraseRow}>
                <Text style={styles.phraseItalian}>{p.italian}</Text>
                <Text style={styles.phraseLocal}>{p.local}</Text>
                <Text style={styles.phrasePronunciation}>{p.pronunciation}</Text>
              </View>
            ))}
          </View>
        </DocSection>

        {/* eSIM */}
        <DocSection title="eSIM" emoji="📶">
          <Text style={styles.esimNote}>Attiva una eSIM prima di partire per avere dati al prezzo migliore.</Text>
          {info.esim.map((e) => (
            <TouchableOpacity
              key={`${e.provider}-${e.data}`}
              style={styles.esimCard}
              onPress={() => Linking.openURL(e.link)}
              activeOpacity={0.8}
            >
              <View style={styles.esimInfo}>
                <Text style={styles.esimProvider}>{e.provider}</Text>
                <Text style={styles.esimMeta}>{e.data} · {e.days} giorni</Text>
              </View>
              <View style={styles.esimPriceRow}>
                <Text style={styles.esimPrice}>{e.price.toFixed(2)} €</Text>
                <Text style={styles.esimArrow}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </DocSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  heroFlag: {
    fontSize: 32,
  },
  heroTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xxl,
    color: Colors.text.primary,
  },
  heroCountry: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  weatherChip: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.teal + '18',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    gap: 4,
  },
  weatherEmoji: { fontSize: 16 },
  weatherTemp: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.teal,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  weatherCard: {
    backgroundColor: Colors.teal + '12',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.teal + '30',
  },
  weatherMonth: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.teal,
  },
  weatherDesc: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  gap: {
    gap: Spacing.sm,
  },
  visaStatus: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
  },
  bodyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  infoLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    flexShrink: 0,
  },
  infoValue: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  infoValueRight: {
    textAlign: 'right',
    flex: 1,
  },
  subTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  listItem: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  phraseRow: {
    gap: 2,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  phraseItalian: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  phraseLocal: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.text.secondary,
  },
  phrasePronunciation: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.teal,
    fontStyle: 'italic',
  },
  esimNote: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  esimCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  esimInfo: { gap: 2 },
  esimProvider: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  esimMeta: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  esimPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  esimPrice: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  esimArrow: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 20,
    color: Colors.text.muted,
  },
});
