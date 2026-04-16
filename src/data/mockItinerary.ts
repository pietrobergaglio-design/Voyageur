import type { OnboardingData } from '../stores/useAppStore';

export type SlotId = 'mattina' | 'pranzo' | 'pomeriggio' | 'cena' | 'sera';

export interface AISuggestion {
  id: string;
  name: string;
  emoji: string;
  tagline: string;         // 1 riga catchy
  description: string;     // 2–3 righe, tono amico
  tags: string[];
  bestLight?: string;      // "Best light: 6:00–7:30"
  price?: number;          // se prenotabile, in €
  isFree: boolean;
  duration: string;        // "2 ore", "30 min"
  companionNote?: string;  // "Perfetto in coppia"
  slotSuggestion: SlotId;
  type: 'place' | 'food';
  mealTime?: 'pranzo' | 'cena';
  experienceType: 'iconic' | 'hidden' | 'mixed';
  category: 'culture' | 'nature' | 'food' | 'nightlife' | 'adventure' | 'relax';
  foodStyle?: 'street' | 'fine';
}

export const SUGGESTION_POOL: AISuggestion[] = [
  // ── ICONICI ──
  {
    id: 'senso-ji',
    name: 'Senso-ji all\'alba',
    emoji: '⛩️',
    tagline: 'Il gate rosso più fotografato di Tokyo — golden hour alle 6:30',
    description: 'Sveglia alle 5:30 e sei quasi solo. I monaci spazzano il cortile, la luce è arancione, le foto sembrano dipinti. Un\'ora dopo il turismo esplode — fai il contrario di tutti.',
    tags: ['📸 Spot foto', '🔥 Trending', '💜 Aesthetic'],
    bestLight: 'Best light: 6:00–7:30',
    isFree: true,
    duration: '1.5 ore',
    companionNote: 'Perfetto in coppia',
    slotSuggestion: 'mattina',
    type: 'place',
    experienceType: 'iconic',
    category: 'culture',
  },
  {
    id: 'shibuya-night',
    name: 'Shibuya Crossing di notte',
    emoji: '🚶',
    tagline: 'Neon, 3.000 persone che si incrociano e tu nel mezzo',
    description: 'Dopo le 22 è diverso — meno confusione, più luce. Sali al piano 2 del Starbucks di fronte, ordina qualcosa e guardalo dall\'alto. È una di quelle cose che devi vedere dal vivo almeno una volta.',
    tags: ['📸 Spot foto', '🔥 Trending', '🌙 Night vibes'],
    isFree: true,
    duration: '45 min',
    slotSuggestion: 'sera',
    type: 'place',
    experienceType: 'iconic',
    category: 'culture',
  },
  {
    id: 'tokyo-tower',
    name: 'Tokyo Tower al tramonto',
    emoji: '🗼',
    tagline: 'La torre arancione che fa capire quanto è grande Tokyo',
    description: 'Sale due ore prima del tramonto, prendi posizione alla finestra e aspetta. La città che cambia colore attorno a te è uno spettacolo. Di giorno è bella — di sera è un\'altra cosa.',
    tags: ['📸 Spot foto', '🔥 Trending'],
    bestLight: 'Best light: tramonto',
    price: 1200,
    isFree: false,
    duration: '1.5 ore',
    companionNote: 'Perfetto in coppia',
    slotSuggestion: 'pomeriggio',
    type: 'place',
    experienceType: 'iconic',
    category: 'culture',
  },
  {
    id: 'meiji',
    name: 'Meiji Shrine',
    emoji: '🌿',
    tagline: 'Foresta nel cuore di Harajuku — come entrare in un altro mondo',
    description: 'Cammini attraverso una foresta di 170.000 alberi e in cinque minuti dimentichi di essere in una metropoli. Il silenzio è reale. La mattina presto il percorso è quasi deserto — cambia tutto.',
    tags: ['📸 Spot foto', '💜 Aesthetic', '🏮 Autentico'],
    bestLight: 'Best light: mattina presto',
    isFree: true,
    duration: '1 ora',
    slotSuggestion: 'mattina',
    type: 'place',
    experienceType: 'iconic',
    category: 'culture',
  },
  {
    id: 'akihabara',
    name: 'Akihabara neon walk',
    emoji: '🎮',
    tagline: 'Neon, arcade vintage e maid café — il Giappone che vedi su TikTok',
    description: 'Entra in un arcade a 4 piani, gioca a un rhythm game, mangia uno spiedino per strada. Il quartiere è kitsch in modo delizioso — e l\'elettronica costa meno che a casa.',
    tags: ['🔥 Trending', '💜 Aesthetic', '🌙 Night vibes'],
    isFree: true,
    duration: '2 ore',
    slotSuggestion: 'pomeriggio',
    type: 'place',
    experienceType: 'iconic',
    category: 'nightlife',
  },
  // ── HIDDEN GEMS ──
  {
    id: 'yanaka',
    name: 'Passeggiata a Yanaka',
    emoji: '🏮',
    tagline: 'Il quartiere che i turisti non trovano — Tokyo com\'era 50 anni fa',
    description: 'Stradine strette, botteghe di artigiani, gatti sui tetti. Yanaka è sopravvissuta ai bombardamenti e al boom economico — è l\'unico posto dove Tokyo sembra ancora se stessa. Prenditi un pomeriggio senza meta.',
    tags: ['🔑 Hidden gem', '🎌 Solo locals', '🏮 Autentico'],
    isFree: true,
    duration: '2 ore',
    slotSuggestion: 'pomeriggio',
    type: 'place',
    experienceType: 'hidden',
    category: 'culture',
  },
  {
    id: 'golden-gai',
    name: 'Golden Gai bar hopping',
    emoji: '🍶',
    tagline: '200 bar in 6 vicoli stretti — ogni posto ha 8 posti e una storia',
    description: 'Entra nel primo bar che ti sembra strano. Il barman parla poco, la musica è jazz o noise, i clienti sembrano lì da anni. Ordina qualcosa di locale. Non esiste una guida per questo posto — funziona così.',
    tags: ['🔑 Hidden gem', '🎌 Solo locals', '🌙 Night vibes'],
    isFree: false,
    price: 800,
    duration: '2–3 ore',
    companionNote: 'Meglio in coppia o da soli',
    slotSuggestion: 'sera',
    type: 'place',
    experienceType: 'hidden',
    category: 'nightlife',
  },
  {
    id: 'shimokitazawa',
    name: 'Shimokitazawa vintage',
    emoji: '🧥',
    tagline: 'Negozi vintage anni \'80, caffè indipendenti — dove vivono i giovani di Tokyo',
    description: 'Il quartiere degli artisti, dei musicisti, dei ragazzi che non vogliono lavorare in banca. Negozi di vinili, vestiti usati a prezzi assurdi e caffè dove si studia in silenzio. Prendi il treno locale — è a 20 minuti.',
    tags: ['🔑 Hidden gem', '🎌 Solo locals'],
    isFree: true,
    duration: '2–3 ore',
    slotSuggestion: 'pomeriggio',
    type: 'place',
    experienceType: 'hidden',
    category: 'culture',
  },
  {
    id: 'koenji-jazz',
    name: 'Koenji jazz bar',
    emoji: '🎷',
    tagline: 'Jazz dal vivo, whisky giapponese, 12 persone — nessun turista',
    description: 'Locale piccolo, luce bassa, musica vera. Il barman conosce i nomi di tutti. Ordina un whisky Nikka e siediti vicino al palco — ma siediti in silenzio, lo apprezzano.',
    tags: ['🔑 Hidden gem', '🎌 Solo locals', '🏮 Autentico'],
    isFree: false,
    price: 1500,
    duration: '2 ore',
    companionNote: 'Perfetto da soli o in due',
    slotSuggestion: 'sera',
    type: 'place',
    experienceType: 'hidden',
    category: 'nightlife',
  },
  {
    id: 'sento',
    name: 'Sentō locale',
    emoji: '♨️',
    tagline: '490 yen, nessun turista — pura routine giapponese',
    description: 'Il bagno pubblico di quartiere non è termale, è ordinario — e per questo vale. Stai seduto in acqua calda mentre i nonni del quartiere fanno conversazione in giapponese. È strano e bello.',
    tags: ['🔑 Hidden gem', '🎌 Solo locals', '🏮 Autentico'],
    isFree: false,
    price: 490,
    duration: '1 ora',
    slotSuggestion: 'sera',
    type: 'place',
    experienceType: 'hidden',
    category: 'relax',
  },
  {
    id: 'nezu-garden',
    name: 'Nezu Museum e giardino zen',
    emoji: '🌸',
    tagline: 'Il giardino zen più curato di Tokyo — nessuno lo sa',
    description: 'La collezione di arte orientale è bella, ma il giardino sul retro è il motivo per cui vai. Bambù, pietra, laghetti con carpe — e forse tre altre persone. A 5 minuti da Harajuku.',
    tags: ['🔑 Hidden gem', '📸 Spot foto', '🏮 Autentico'],
    bestLight: 'Best light: mattina',
    price: 1300,
    isFree: false,
    duration: '1.5 ore',
    companionNote: 'Perfetto in coppia',
    slotSuggestion: 'mattina',
    type: 'place',
    experienceType: 'hidden',
    category: 'culture',
  },
  // ── AVVENTURA ──
  {
    id: 'fuji-daytrip',
    name: 'Monte Fuji day trip',
    emoji: '🗻',
    tagline: 'Guardare Tokyo da sopra le nuvole a 3.776 metri',
    description: 'Treno da Shinjuku alle 7, a Kawaguchiko alle 9. Se è una giornata limpida il riflesso del Fuji nel lago è uno di quegli scatti che ti ricordi per anni. Non garantito — ma quando succede, capisci perché sei venuto.',
    tags: ['🏔️ Avventura', '📸 Spot foto'],
    bestLight: 'Best light: alba (vetta) o mattino (lago)',
    price: 3000,
    isFree: false,
    duration: 'Giornata intera',
    slotSuggestion: 'mattina',
    type: 'place',
    experienceType: 'mixed',
    category: 'adventure',
  },
  {
    id: 'sumida-kayak',
    name: 'Kayak sul Sumida River',
    emoji: '🛶',
    tagline: 'Tokyo dal livello dell\'acqua — nessuno lo fa, è per questo che vale',
    description: 'Noleggi il kayak vicino ad Asakusa e remi verso Odaiba. Passa sotto i ponti, vedi i grattacieli dall\'acqua. Un operatore locale organizza tour piccoli — prenotare con anticipo.',
    tags: ['🔑 Hidden gem', '🏔️ Avventura'],
    price: 6500,
    isFree: false,
    duration: '3 ore',
    companionNote: 'Perfetto in coppia o con amici',
    slotSuggestion: 'mattina',
    type: 'place',
    experienceType: 'hidden',
    category: 'adventure',
  },
  {
    id: 'cycling-yanaka',
    name: 'Cycling tour Yanaka',
    emoji: '🚴',
    tagline: 'I quartieri vecchi di Tokyo su due ruote — nessuna macchina, niente metro',
    description: 'Bici a noleggio a Ueno, poi segui il tuo naso verso Yanaka, Nezu, Yanesen. Le strade sono strette, quasi piatte — si pedala senza fatica. Un modo completamente diverso di vedere la città.',
    tags: ['🔑 Hidden gem', '🏔️ Avventura', '🎌 Solo locals'],
    price: 1500,
    isFree: false,
    duration: '3 ore',
    slotSuggestion: 'mattina',
    type: 'place',
    experienceType: 'hidden',
    category: 'adventure',
  },
  // ── RELAX ──
  {
    id: 'shinjuku-gyoen',
    name: 'Shinjuku Gyoen — colazione nel parco',
    emoji: '🌿',
    tagline: 'Il parco imperiale più grande di Tokyo — silenzio garantito',
    description: 'Entra dalla parte francese, siediti sull\'erba e colaziona in pace. 58 ettari di giardino nel mezzo di Shinjuku — un paradosso giapponese. In estate i platani danno ombra, in autunno i colori sono assurdi.',
    tags: ['💜 Aesthetic', '🏮 Autentico'],
    price: 500,
    isFree: false,
    duration: '2 ore',
    companionNote: 'Perfetto per famiglie',
    slotSuggestion: 'mattina',
    type: 'place',
    experienceType: 'mixed',
    category: 'relax',
  },
  {
    id: 'onsen-oedo',
    name: 'Onsen Oedo Monogatari',
    emoji: '♨️',
    tagline: 'Il parco termale in stile Edo — kitsch ma irresistibile',
    description: 'Metti il yukata, cammina tra i negozietti, immergiti nelle terme. Non è autentico come un onsen di montagna ma è divertente — e l\'acqua è vera. Perfetto per la sera dell\'ultimo giorno.',
    tags: ['🔥 Trending', '💜 Aesthetic'],
    price: 2750,
    isFree: false,
    duration: '3 ore',
    companionNote: 'Perfetto in coppia o con amici',
    slotSuggestion: 'sera',
    type: 'place',
    experienceType: 'iconic',
    category: 'relax',
  },
  {
    id: 'kissaten',
    name: 'Colazione in un kissaten vintage',
    emoji: '☕',
    tagline: 'Caffè filtro lento, toast spesso, jazz anni \'60 — il Giappone autentico',
    description: 'Il kissaten è il bar giapponese degli anni \'60: sedie di velluto, caffè di terracotta, niente wifi, nessuno parla. Ordina il morning set — uovo sodo, toast, succo d\'arancia. Costa 700 yen.',
    tags: ['🔑 Hidden gem', '🎌 Solo locals', '🏮 Autentico'],
    isFree: false,
    price: 700,
    duration: '1 ora',
    slotSuggestion: 'mattina',
    type: 'place',
    experienceType: 'hidden',
    category: 'relax',
  },
  // ── CULTURA ──
  {
    id: 'mori-art',
    name: 'Mori Art Museum',
    emoji: '🎨',
    tagline: 'Arte contemporanea al 52° piano con vista Tokyo',
    description: 'Due attrazioni in una: la mostra (sempre di alta qualità) e il belvedere che include. Vista a 360° su tutta la città. Evita il weekend — in settimana è quasi vuoto.',
    tags: ['💜 Aesthetic', '🔥 Trending'],
    price: 1800,
    isFree: false,
    duration: '2 ore',
    companionNote: 'Perfetto in coppia',
    slotSuggestion: 'pomeriggio',
    type: 'place',
    experienceType: 'mixed',
    category: 'culture',
  },
  {
    id: 'harajuku-walk',
    name: 'Harajuku — Takeshita street',
    emoji: '🎀',
    tagline: 'Crepe di colori impossibili e mode che non esistono da nessun\'altra parte',
    description: 'Sì, è una trappola per turisti — e vale lo stesso. Le crepe al matcha con kit-kat sono assurde. I vestiti sembrano costumi. Un\'ora di passeggiata e poi scappa verso Omotesando per ristabilire l\'equilibrio.',
    tags: ['🔥 Trending', '💜 Aesthetic', '📸 Spot foto'],
    isFree: true,
    duration: '1 ora',
    slotSuggestion: 'pomeriggio',
    type: 'place',
    experienceType: 'iconic',
    category: 'culture',
  },
  // ── FOOD STREET ──
  {
    id: 'tsukiji-market',
    name: 'Tsukiji outer market',
    emoji: '🐟',
    tagline: 'Tonno, ricci di mare e tamagoyaki alle 8:00 — il breakfast più fresco di Tokyo',
    description: 'Il mercato interno è chiuso ai turisti ma l\'outer market è ancora vivo — decine di bancarelle, tutto da mangiare in piedi. Arriva presto, finisce presto. Il tamagoyaki caldo è il motivo.',
    tags: ['🔥 Trending', '📸 Spot foto', '🏮 Autentico'],
    isFree: true,
    duration: '1.5 ore',
    slotSuggestion: 'mattina',
    type: 'food',
    mealTime: 'pranzo',
    experienceType: 'mixed',
    category: 'food',
    foodStyle: 'street',
  },
  {
    id: 'takoyaki-harajuku',
    name: 'Takoyaki in Harajuku',
    emoji: '🐙',
    tagline: 'Polpo, maionese e bonito flakes che ballano — lo street food che brucia la lingua',
    description: 'Ci sono code ovunque ad Harajuku — vai dove c\'è la coda più lunga. Aspetta tre minuti, ordina sei pezzi, scottati la lingua. Mangiarli mentre cammini è obbligatorio.',
    tags: ['🔥 Trending', '🏮 Autentico'],
    isFree: false,
    price: 600,
    duration: '20 min',
    slotSuggestion: 'pranzo',
    type: 'food',
    mealTime: 'pranzo',
    experienceType: 'iconic',
    category: 'food',
    foodStyle: 'street',
  },
  {
    id: 'yakitori-yurakucho',
    name: 'Yakitori sotto i binari',
    emoji: '🍢',
    tagline: 'Spiedini, birra Sapporo e i treni che passano sopra — Yurakucho com\'è sempre stato',
    description: 'I locali sotto i binari di Yurakucho sono lì dagli anni \'50. Siediti fuori, ordina spiedini di pollo e verdure, bevi birra fredda. I treni passano ogni 3 minuti e non ci fai più caso dopo dieci minuti.',
    tags: ['🎌 Solo locals', '🏮 Autentico', '🔑 Hidden gem'],
    isFree: false,
    price: 2000,
    duration: '1.5 ore',
    companionNote: 'Perfetto in gruppo',
    slotSuggestion: 'cena',
    type: 'food',
    mealTime: 'cena',
    experienceType: 'hidden',
    category: 'food',
    foodStyle: 'street',
  },
  {
    id: 'ramen-shibuya',
    name: 'Ramen nero di Shibuya',
    emoji: '🍜',
    tagline: 'Brodo di maiale torbido, uovo perfetto e il profumo che si sente per strada',
    description: 'Non sembra niente da fuori ma dentro è il miglior ramen che mangerai. Coda di circa 20 minuti — vale. Siediti al bancone, ordina il basic e guardali prepararlo. Il brodo è nero di sesamo e vale da solo il viaggio.',
    tags: ['🔥 Trending', '📸 Spot foto'],
    isFree: false,
    price: 1200,
    duration: '45 min',
    slotSuggestion: 'pranzo',
    type: 'food',
    mealTime: 'pranzo',
    experienceType: 'iconic',
    category: 'food',
    foodStyle: 'street',
  },
  // ── FOOD FINE ──
  {
    id: 'omakase-ginza',
    name: 'Omakase a Ginza',
    emoji: '🍣',
    tagline: '12 portate, sushi su banco di legno, chef che racconta ogni pezzo',
    description: 'Siediti al bancone, dì "omakase" e smetti di pensare. Ogni pezzo è scelto dal mercato quella mattina — non esiste un menu. Tra i 15.000 e i 30.000 yen ma è uno di quei pranzi che ricordi per anni.',
    tags: ['✨ Premium', '💜 Aesthetic'],
    isFree: false,
    price: 20000,
    duration: '2 ore',
    companionNote: 'Perfetto in coppia',
    slotSuggestion: 'cena',
    type: 'food',
    mealTime: 'cena',
    experienceType: 'iconic',
    category: 'food',
    foodStyle: 'fine',
  },
  {
    id: 'soba-kanda',
    name: 'Soba handmade a Kanda',
    emoji: '🍝',
    tagline: 'Soba tirata a mano da un maestro 80enne — 6 posti, apre 4 ore al giorno',
    description: 'Il locale non ha insegna, apre a pranzo e chiude quando finisce la soba — di solito alle 14:00. Vai, aspetta fuori, ordina il mori soba freddo. Il dashi ha un sapore che non trovi altrove.',
    tags: ['🔑 Hidden gem', '🎌 Solo locals', '🏮 Autentico'],
    isFree: false,
    price: 1500,
    duration: '45 min',
    slotSuggestion: 'pranzo',
    type: 'food',
    mealTime: 'pranzo',
    experienceType: 'hidden',
    category: 'food',
    foodStyle: 'fine',
  },
  {
    id: 'tempura-kondo',
    name: 'Tempura Kondo',
    emoji: '🍤',
    tagline: 'La tempura più leggera di Tokyo — una stella Michelin, prenotare settimane prima',
    description: 'La pastella è quasi trasparente, le verdure di stagione, il katsuobushi arriva fresco ogni mattina. Non è il solito fritto. Prenota con almeno 3 settimane di anticipo — valgono ogni minuto d\'attesa.',
    tags: ['✨ Premium', '🔥 Trending'],
    isFree: false,
    price: 25000,
    duration: '2 ore',
    companionNote: 'Perfetto in coppia',
    slotSuggestion: 'cena',
    type: 'food',
    mealTime: 'cena',
    experienceType: 'iconic',
    category: 'food',
    foodStyle: 'fine',
  },
];

// ─── Slot definitions ─────────────────────────────────────────────────────────

export const SLOT_RANGES: {
  id: SlotId;
  label: string;
  startHour: number;
  endHour: number;
  defaultStart: string;
  defaultEnd: string;
}[] = [
  { id: 'mattina',    label: 'Mattina',     startHour: 5,  endHour: 12, defaultStart: '09:00', defaultEnd: '11:30' },
  { id: 'pranzo',     label: 'Pranzo',      startHour: 12, endHour: 15, defaultStart: '12:30', defaultEnd: '14:00' },
  { id: 'pomeriggio', label: 'Pomeriggio',  startHour: 15, endHour: 18, defaultStart: '15:00', defaultEnd: '17:30' },
  { id: 'cena',       label: 'Cena',        startHour: 18, endHour: 21, defaultStart: '19:30', defaultEnd: '21:30' },
  { id: 'sera',       label: 'Sera',        startHour: 21, endHour: 25, defaultStart: '21:30', defaultEnd: '23:30' },
];

export function getSlotForHour(hour: number): SlotId {
  if (hour < 12) return 'mattina';
  if (hour < 15) return 'pranzo';
  if (hour < 18) return 'pomeriggio';
  if (hour < 21) return 'cena';
  return 'sera';
}

// ─── Generation ───────────────────────────────────────────────────────────────

export function generateSuggestionsForTrip(
  numDays: number,
  takenSlotsByDay: Set<SlotId>[],
  profile: OnboardingData,
  densityPercent: number,
  includeMeals: boolean,
): AISuggestion[][] {
  const expValue = profile.experience ?? 50;
  const foodValue = profile.food ?? 50;

  const suggestionsPerDay = Math.max(
    1,
    densityPercent <= 25 ? 1
    : densityPercent <= 50 ? 2
    : densityPercent <= 75 ? 3
    : 4,
  );

  const preferIconic = expValue < 35;
  const preferHidden = expValue > 65;
  const preferFine = foodValue > 65;
  const preferStreet = foodValue < 40;

  const usedIds = new Set<string>();
  const result: AISuggestion[][] = [];

  for (let dayIdx = 0; dayIdx < numDays; dayIdx++) {
    const takenSlots = takenSlotsByDay[dayIdx] ?? new Set<SlotId>();
    const daySuggestions: AISuggestion[] = [];

    const placePool = SUGGESTION_POOL.filter((s) => {
      if (usedIds.has(s.id)) return false;
      if (s.type === 'food') return false;
      if (takenSlots.has(s.slotSuggestion)) return false;
      if (preferIconic && s.experienceType === 'hidden') return false;
      if (preferHidden && s.experienceType === 'iconic') return false;
      return true;
    });

    const placeCount = includeMeals ? Math.max(1, suggestionsPerDay - 1) : suggestionsPerDay;
    for (const s of placePool) {
      if (daySuggestions.length >= placeCount) break;
      daySuggestions.push(s);
      usedIds.add(s.id);
    }

    if (includeMeals) {
      const mealSlots: SlotId[] = ['pranzo', 'cena'];
      for (const mealSlot of mealSlots) {
        if (takenSlots.has(mealSlot)) continue;
        if (daySuggestions.some((s) => s.slotSuggestion === mealSlot)) continue;

        const meal = SUGGESTION_POOL.find((s) => {
          if (usedIds.has(s.id)) return false;
          if (s.type !== 'food') return false;
          if (s.slotSuggestion !== mealSlot) return false;
          if (preferFine && s.foodStyle === 'street') return false;
          if (preferStreet && s.foodStyle === 'fine') return false;
          return true;
        });
        if (meal) {
          daySuggestions.push(meal);
          usedIds.add(meal.id);
        }
      }
    }

    result.push(daySuggestions);
  }

  return result;
}
