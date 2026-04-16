import type { DestinationInfo } from '../types/destination';

export const japanInfo: DestinationInfo = {
  code: 'TYO',
  name: 'Tokyo',
  country: 'Giappone',
  flag: '🇯🇵',
  visa: {
    required: false,
    label: 'Visto non richiesto',
    details: 'I cittadini italiani possono entrare in Giappone senza visto per soggiorni turistici.',
    stayLimit: 'Massimo 90 giorni',
  },
  health: {
    vaccines: ['Nessun vaccino obbligatorio', 'Epatite A consigliata', 'Epatite B consigliata'],
    water: 'Acqua del rubinetto potabile in tutto il Giappone',
    hospitals: 'St. Luke\'s International Hospital (Tokyo) — accetta stranieri con assicurazione',
    emergencyNumber: '119 (ambulanza) · 110 (polizia)',
  },
  practical: {
    currency: 'Yen giapponese (¥ / JPY)',
    exchangeRate: '1 € ≈ 165 ¥ (apr 2026)',
    timezone: 'JST · UTC+9 (7h avanti rispetto a Roma)',
    plugType: 'Tipo A (piatto a due lame)',
    voltage: '100V / 50-60Hz',
    tipping: 'Le mance non sono usate in Giappone. Evitarle.',
    language: 'Giapponese · L\'inglese è parlato nelle zone turistiche',
  },
  phrases: [
    { italian: 'Grazie', local: 'ありがとう', pronunciation: 'Arigatō' },
    { italian: 'Scusa / Permesso', local: 'すみません', pronunciation: 'Sumimasen' },
    { italian: 'Buongiorno', local: 'おはようございます', pronunciation: 'Ohayō gozaimasu' },
    { italian: 'Quanto costa?', local: 'いくらですか？', pronunciation: 'Ikura desu ka?' },
    { italian: 'Dov\'è la stazione?', local: '駅はどこですか？', pronunciation: 'Eki wa doko desu ka?' },
    { italian: 'Non capisco', local: 'わかりません', pronunciation: 'Wakarimasen' },
    { italian: 'Parli inglese?', local: '英語を話せますか？', pronunciation: 'Eigo wo hanasemasu ka?' },
    { italian: 'Il conto, per favore', local: 'お会計をお願いします', pronunciation: 'Okaikei wo onegaishimasu' },
  ],
  esim: [
    {
      provider: 'Airalo',
      data: '5 GB',
      days: 15,
      price: 9.50,
      link: 'https://airalo.com',
    },
    {
      provider: 'Airalo',
      data: '10 GB',
      days: 30,
      price: 16.50,
      link: 'https://airalo.com',
    },
    {
      provider: 'Holafly',
      data: 'Illimitato',
      days: 8,
      price: 34.90,
      link: 'https://holafly.com',
    },
  ],
  weather: {
    month: 'Luglio',
    description: 'Caldo e umido. Stagione dei monsoni (tsuyu) quasi terminata. Possibili piogge temporalesche.',
    avgTempC: 28,
    emoji: '☀️',
  },
};

const destinationMap: Record<string, DestinationInfo> = {
  TYO: japanInfo,
  NRT: japanInfo,
};

export function getDestinationInfo(code: string): DestinationInfo | null {
  return destinationMap[code] ?? null;
}
