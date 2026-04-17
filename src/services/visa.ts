import type { VisaInfo, VisaStatus } from '../types/booking';

// ─── Lookup table: destination → nationality → status ────────────────────────
// Destinations are lowercase city/country names; nationality is ISO 3166-1 alpha-2.

type VisaMatrix = Record<string, Record<string, VisaStatus>>;

const VISA_MATRIX: VisaMatrix = {
  japan: {
    IT: 'not_required', DE: 'not_required', FR: 'not_required', ES: 'not_required',
    GB: 'not_required', US: 'not_required', CA: 'not_required', AU: 'not_required',
    NZ: 'not_required', CH: 'not_required', NL: 'not_required', BE: 'not_required',
    AT: 'not_required', PT: 'not_required', SE: 'not_required', NO: 'not_required',
    DK: 'not_required', FI: 'not_required', IE: 'not_required', LU: 'not_required',
    CN: 'evisa',        IN: 'required',     RU: 'required',     BR: 'not_required',
    MX: 'not_required', AR: 'not_required', ZA: 'required',     NG: 'required',
    PH: 'not_required', TH: 'not_required',
  },
  thailand: {
    IT: 'not_required', DE: 'not_required', FR: 'not_required', ES: 'not_required',
    GB: 'not_required', US: 'not_required', CA: 'not_required', AU: 'not_required',
    NZ: 'not_required', CH: 'not_required', NL: 'not_required', BE: 'not_required',
    AT: 'not_required', PT: 'not_required', SE: 'not_required', NO: 'not_required',
    CN: 'not_required', IN: 'on_arrival',   RU: 'on_arrival',   BR: 'not_required',
    MX: 'not_required', ZA: 'on_arrival',   NG: 'required',     PH: 'not_required',
  },
  indonesia: {
    IT: 'on_arrival', DE: 'on_arrival', FR: 'on_arrival', ES: 'on_arrival',
    GB: 'on_arrival', US: 'on_arrival', CA: 'on_arrival', AU: 'on_arrival',
    NZ: 'on_arrival', CH: 'on_arrival', NL: 'on_arrival', CN: 'evisa',
    IN: 'on_arrival', RU: 'on_arrival', BR: 'on_arrival', ZA: 'on_arrival',
    NG: 'required',   PH: 'not_required',
  },
  india: {
    IT: 'evisa', DE: 'evisa', FR: 'evisa', ES: 'evisa', GB: 'evisa',
    US: 'evisa', CA: 'evisa', AU: 'evisa', NZ: 'evisa', CH: 'evisa',
    NL: 'evisa', BE: 'evisa', AT: 'evisa', PT: 'evisa', SE: 'evisa',
    CN: 'required', RU: 'evisa', BR: 'evisa', ZA: 'evisa', NG: 'evisa',
    PH: 'evisa', TH: 'evisa',
  },
  usa: {
    IT: 'not_required', DE: 'not_required', FR: 'not_required', ES: 'not_required',
    GB: 'not_required', CA: 'not_required', AU: 'not_required', NZ: 'not_required',
    CH: 'not_required', NL: 'not_required', BE: 'not_required', AT: 'not_required',
    PT: 'not_required', SE: 'not_required', NO: 'not_required', DK: 'not_required',
    FI: 'not_required', IE: 'not_required', CN: 'required',     IN: 'required',
    RU: 'required',     BR: 'required',     MX: 'required',     ZA: 'required',
    NG: 'required',     PH: 'required',     TH: 'required',
  },
  australia: {
    IT: 'evisa', DE: 'evisa', FR: 'evisa', ES: 'evisa', GB: 'evisa',
    US: 'evisa', CA: 'evisa', NZ: 'not_required', CH: 'evisa',
    NL: 'evisa', BE: 'evisa', AT: 'evisa', PT: 'evisa', SE: 'evisa',
    CN: 'required', IN: 'required', RU: 'required', BR: 'evisa',
    MX: 'evisa',    ZA: 'evisa',    NG: 'required',
  },
  uk: {
    IT: 'not_required', DE: 'not_required', FR: 'not_required', ES: 'not_required',
    US: 'not_required', CA: 'not_required', AU: 'not_required', NZ: 'not_required',
    CH: 'not_required', IN: 'evisa',        CN: 'evisa',        RU: 'required',
    BR: 'not_required', MX: 'not_required', ZA: 'not_required', NG: 'required',
  },
  canada: {
    IT: 'evisa', DE: 'evisa', FR: 'evisa', ES: 'evisa', GB: 'not_required',
    US: 'not_required', AU: 'evisa', NZ: 'evisa', CH: 'evisa',
    NL: 'evisa', BE: 'evisa', AT: 'evisa', PT: 'evisa', SE: 'evisa',
    CN: 'required', IN: 'required', RU: 'required', BR: 'evisa',
    MX: 'not_required', ZA: 'evisa', NG: 'required',
  },
  france: {
    IT: 'not_required', DE: 'not_required', ES: 'not_required', GB: 'not_required',
    US: 'not_required', CA: 'not_required', AU: 'not_required', CH: 'not_required',
    CN: 'not_required', IN: 'not_required', RU: 'not_required', BR: 'not_required',
    NG: 'not_required', ZA: 'not_required',
  },
  germany: {
    IT: 'not_required', FR: 'not_required', ES: 'not_required', GB: 'not_required',
    US: 'not_required', CA: 'not_required', AU: 'not_required', CH: 'not_required',
    CN: 'not_required', IN: 'not_required', RU: 'not_required', BR: 'not_required',
    NG: 'not_required', ZA: 'not_required',
  },
  spain: {
    IT: 'not_required', DE: 'not_required', FR: 'not_required', GB: 'not_required',
    US: 'not_required', CA: 'not_required', AU: 'not_required', CH: 'not_required',
    CN: 'not_required', IN: 'not_required', RU: 'not_required', BR: 'not_required',
    NG: 'not_required', ZA: 'not_required',
  },
  vietnam: {
    IT: 'evisa', DE: 'evisa', FR: 'evisa', ES: 'evisa', GB: 'evisa',
    US: 'evisa', CA: 'evisa', AU: 'evisa', NZ: 'evisa', CH: 'evisa',
    NL: 'evisa', BE: 'evisa', AT: 'evisa', PT: 'evisa', SE: 'evisa',
    CN: 'not_required', IN: 'evisa', RU: 'evisa', BR: 'evisa',
    MX: 'evisa', ZA: 'evisa', NG: 'required', PH: 'evisa', TH: 'evisa',
  },
  singapore: {
    IT: 'not_required', DE: 'not_required', FR: 'not_required', ES: 'not_required',
    GB: 'not_required', US: 'not_required', CA: 'not_required', AU: 'not_required',
    NZ: 'not_required', CH: 'not_required', CN: 'not_required', IN: 'not_required',
    RU: 'not_required', BR: 'not_required', MX: 'not_required', ZA: 'not_required',
    NG: 'required', PH: 'not_required', TH: 'not_required',
  },
  'south korea': {
    IT: 'not_required', DE: 'not_required', FR: 'not_required', ES: 'not_required',
    GB: 'not_required', US: 'not_required', CA: 'not_required', AU: 'not_required',
    NZ: 'not_required', CH: 'not_required', CN: 'required',     IN: 'required',
    RU: 'not_required', BR: 'not_required', MX: 'not_required', ZA: 'not_required',
    NG: 'required', PH: 'not_required', TH: 'not_required',
  },
  morocco: {
    IT: 'not_required', DE: 'not_required', FR: 'not_required', ES: 'not_required',
    GB: 'not_required', US: 'not_required', CA: 'not_required', AU: 'not_required',
    NZ: 'not_required', CH: 'not_required', CN: 'not_required', IN: 'required',
    RU: 'not_required', BR: 'not_required', ZA: 'required', NG: 'required',
  },
  mexico: {
    IT: 'not_required', DE: 'not_required', FR: 'not_required', ES: 'not_required',
    GB: 'not_required', US: 'not_required', CA: 'not_required', AU: 'not_required',
    CH: 'not_required', CN: 'required',     IN: 'required',     RU: 'required',
    BR: 'not_required', ZA: 'not_required', NG: 'required',
  },
  brazil: {
    IT: 'not_required', DE: 'not_required', FR: 'not_required', ES: 'not_required',
    GB: 'not_required', US: 'not_required', CA: 'not_required', AU: 'not_required',
    CH: 'not_required', NL: 'not_required', CN: 'not_required', IN: 'required',
    RU: 'not_required', MX: 'not_required', ZA: 'not_required', NG: 'required',
    AR: 'not_required',
  },
  dubai: {
    IT: 'not_required', DE: 'not_required', FR: 'not_required', ES: 'not_required',
    GB: 'not_required', US: 'not_required', CA: 'not_required', AU: 'not_required',
    NZ: 'not_required', CH: 'not_required', IN: 'on_arrival',   CN: 'on_arrival',
    RU: 'on_arrival',   BR: 'on_arrival',   MX: 'on_arrival',   ZA: 'on_arrival',
    NG: 'required',     PH: 'on_arrival',   TH: 'on_arrival',
  },
};

// Country name → destination key normalization
const DESTINATION_ALIASES: Record<string, string> = {
  giappone: 'japan', tokyo: 'japan',
  tailandia: 'thailand', bangkok: 'thailand', phuket: 'thailand',
  indonesia: 'indonesia', bali: 'indonesia', jakarta: 'indonesia',
  india: 'india', delhi: 'india', mumbai: 'india', goa: 'india',
  'stati uniti': 'usa', 'new york': 'usa', 'los angeles': 'usa', miami: 'usa',
  australia: 'australia', sydney: 'australia', melbourne: 'australia',
  'regno unito': 'uk', londra: 'uk', london: 'uk',
  canada: 'canada', toronto: 'canada', vancouver: 'canada',
  francia: 'france', parigi: 'france', paris: 'france',
  germania: 'germany', berlino: 'germany', berlin: 'germany',
  spagna: 'spain', barcellona: 'spain', madrid: 'spain',
  vietnam: 'vietnam', 'ho chi minh': 'vietnam', hanoi: 'vietnam',
  singapore: 'singapore',
  'corea del sud': 'south korea', seul: 'south korea', seoul: 'south korea',
  marocco: 'morocco', marrakech: 'morocco',
  messico: 'mexico', cancun: 'mexico',
  brasile: 'brazil', 'rio de janeiro': 'brazil', 'sao paulo': 'brazil',
  'emirati arabi': 'dubai', dubai: 'dubai',
};

// Nationality code normalization (country name → ISO 2)
const NATIONALITY_CODES: Record<string, string> = {
  italiano: 'IT', italiana: 'IT', italy: 'IT',
  tedesco: 'DE', tedesca: 'DE', germany: 'DE',
  francese: 'FR', france: 'FR',
  spagnolo: 'ES', spagnola: 'ES', spain: 'ES',
  inglese: 'GB', britannico: 'GB', 'united kingdom': 'GB',
  americano: 'US', americana: 'US', 'united states': 'US',
  canadese: 'CA', canada: 'CA',
  australiano: 'AU', australiana: 'AU', australia: 'AU',
  svizzero: 'CH', svizzera: 'CH', switzerland: 'CH',
  olandese: 'NL', netherlands: 'NL',
  belga: 'BE', belgium: 'BE',
  austriaco: 'AT', austriaca: 'AT', austria: 'AT',
  portoghese: 'PT', portoghesa: 'PT', portugal: 'PT',
  svedese: 'SE', sweden: 'SE',
  norvegese: 'NO', norway: 'NO',
  danese: 'DK', denmark: 'DK',
  finlandese: 'FI', finland: 'FI',
  irlandese: 'IE', ireland: 'IE',
  cinese: 'CN', cinesi: 'CN', china: 'CN',
  indiano: 'IN', indiana: 'IN', india: 'IN',
  russo: 'RU', russa: 'RU', russia: 'RU',
  brasiliano: 'BR', brasiliana: 'BR', brazil: 'BR',
  messicano: 'MX', messicana: 'MX', mexico: 'MX',
  argentino: 'AR', argentina: 'AR',
  sudafricano: 'ZA', 'south africa': 'ZA',
  nigeriano: 'NG', nigeria: 'NG',
  filippino: 'PH', filippina: 'PH', philippines: 'PH',
  thailandese: 'TH', thailand: 'TH',
};

const DESTINATION_FLAGS: Record<string, string> = {
  japan: '🇯🇵', thailand: '🇹🇭', indonesia: '🇮🇩', india: '🇮🇳',
  usa: '🇺🇸', australia: '🇦🇺', uk: '🇬🇧', canada: '🇨🇦',
  france: '🇫🇷', germany: '🇩🇪', spain: '🇪🇸', vietnam: '🇻🇳',
  singapore: '🇸🇬', 'south korea': '🇰🇷', morocco: '🇲🇦',
  mexico: '🇲🇽', brazil: '🇧🇷', dubai: '🇦🇪',
};

const DESTINATION_NAMES_IT: Record<string, string> = {
  japan: 'Giappone', thailand: 'Tailandia', indonesia: 'Indonesia', india: 'India',
  usa: 'Stati Uniti', australia: 'Australia', uk: 'Regno Unito', canada: 'Canada',
  france: 'Francia', germany: 'Germania', spain: 'Spagna', vietnam: 'Vietnam',
  singapore: 'Singapore', 'south korea': 'Corea del Sud', morocco: 'Marocco',
  mexico: 'Messico', brazil: 'Brasile', dubai: 'Dubai',
};

const STATUS_DETAILS: Record<VisaStatus, (dest: string, nat: string) => string> = {
  not_required: (dest) =>
    `Nessun visto richiesto per ${dest}. Puoi soggiornare fino a 90 giorni con il tuo passaporto valido.`,
  evisa: (dest) =>
    `Per ${dest} è necessario un eVisa da richiedere online prima della partenza. Il processo richiede pochi minuti.`,
  on_arrival: (dest) =>
    `Puoi ottenere il visto all'arrivo in ${dest} direttamente in aeroporto. Porta con te la documentazione richiesta.`,
  required: (dest, nat) =>
    `I cittadini ${nat} devono richiedere un visto prima di partire per ${dest}. Contatta l'ambasciata competente.`,
};

const STATUS_LABELS: Record<VisaStatus, string> = {
  not_required: '✅ Non richiesto',
  evisa: '🟡 eVisa necessario',
  on_arrival: '🟡 Visto all\'arrivo',
  required: '🔴 Visto richiesto',
};

const STATUS_REQUIREMENTS: Record<VisaStatus, string[]> = {
  not_required: ['Passaporto valido (almeno 6 mesi)', 'Volo di ritorno'],
  evisa: ['Passaporto valido (almeno 6 mesi)', 'Foto digitale passaporto', 'Carta di credito per pagamento fee', 'Volo di ritorno'],
  on_arrival: ['Passaporto valido (almeno 6 mesi)', 'Foto formato tessera (2)', 'Contante per fee visto', 'Modulo di arrivo compilato', 'Volo di ritorno'],
  required: ['Passaporto valido (almeno 6 mesi)', 'Foto formato tessera', 'Estratto conto bancario', 'Prenotazione hotel', 'Lettera di invito (se richiesta)', 'Modulo di domanda compilato'],
};

const EVISA_FEES: Record<string, { fee: number; days: number }> = {
  india: { fee: 25, days: 3 },
  australia: { fee: 20, days: 1 },
  usa: { fee: 0, days: 3 },       // ESTA
  uk: { fee: 10, days: 3 },       // ETA
  canada: { fee: 7, days: 1 },    // eTA
  vietnam: { fee: 25, days: 3 },
};

function resolveDestinationKey(destination: string): string | null {
  const lower = destination.toLowerCase().split(',')[0].trim();
  if (DESTINATION_ALIASES[lower]) return DESTINATION_ALIASES[lower];
  // Partial match
  for (const [alias, key] of Object.entries(DESTINATION_ALIASES)) {
    if (lower.includes(alias) || alias.includes(lower)) return key;
  }
  return null;
}

function resolveNationalityCode(nationality: string): string {
  if (nationality.length === 2) return nationality.toUpperCase();
  const lower = nationality.toLowerCase();
  return NATIONALITY_CODES[lower] ?? nationality.toUpperCase();
}

export function getVisaInfo(destination: string, nationality: string): VisaInfo {
  const destKey = resolveDestinationKey(destination);
  const natCode = resolveNationalityCode(nationality);
  const destName = destKey ? DESTINATION_NAMES_IT[destKey] ?? destination.split(',')[0].trim() : destination.split(',')[0].trim();
  const destFlag = destKey ? DESTINATION_FLAGS[destKey] : undefined;

  let status: VisaStatus = 'required'; // safe default
  if (destKey && VISA_MATRIX[destKey]) {
    status = VISA_MATRIX[destKey][natCode] ?? 'required';
  }

  const details = STATUS_DETAILS[status](destName, natCode);
  const statusLabel = STATUS_LABELS[status];
  const requirements = STATUS_REQUIREMENTS[status];

  const evisaInfo = status === 'evisa' && destKey ? EVISA_FEES[destKey] : null;
  const arrivilaInfo = status === 'on_arrival' && destKey ? EVISA_FEES[destKey] : null;
  const feeInfo = evisaInfo ?? arrivilaInfo;

  return {
    destination: destName,
    destinationFlag: destFlag,
    forNationality: natCode,
    status,
    statusLabel,
    details,
    requirements,
    processingDays: feeInfo?.days,
    fee: feeInfo?.fee && feeInfo.fee > 0 ? feeInfo.fee : undefined,
    feeCurrency: feeInfo?.fee && feeInfo.fee > 0 ? 'USD' : undefined,
  };
}
