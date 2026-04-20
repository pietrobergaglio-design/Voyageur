// TODO: spostare su backend in produzione per non esporre API key

import type { Trip } from '../types/trip';
import type { BookingItem } from '../types/booking';
import type { OnboardingData } from '../stores/useAppStore';
import type { AIItinerary, AIItineraryDay, AIMultiCityItinerary, AIMultiCityCity } from '../types/ai-itinerary';
import type { CityStop } from '../types/multi-city';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4000;
const TIMEOUT_MS = 60_000;
const PLACEHOLDER_KEY = 'sk-ant-placeholder';

// ─── Label helpers ────────────────────────────────────────────────────────────

function vibeLabel(v: number): string {
  if (v <= 20) return 'totale relax';
  if (v <= 40) return 'rilassato con qualche attività';
  if (v <= 60) return 'mix equilibrato';
  if (v <= 80) return 'attivo e dinamico';
  return 'pura adrenalina';
}

function foodLabel(v: number): string {
  if (v <= 20) return 'solo street food';
  if (v <= 40) return 'cucina locale informale';
  if (v <= 60) return 'mix trattorie e ristoranti';
  if (v <= 80) return 'ristoranti curati';
  return 'fine dining';
}

function paceLabel(v: number): string {
  if (v <= 20) return 'molto slow, massimo 1 cosa al giorno';
  if (v <= 40) return 'ritmo lento, molto tempo libero';
  if (v <= 60) return 'ritmo moderato';
  if (v <= 80) return 'giornate piene';
  return 'ogni minuto schedulato';
}

function budgetLabel(v: number): string {
  if (v <= 20) return 'minimo assoluto, solo gratuito';
  if (v <= 40) return 'budget contenuto';
  if (v <= 60) return 'budget medio';
  if (v <= 80) return 'disponibile a spendere bene';
  return 'senza limiti di budget';
}

function experienceLabel(v: number): string {
  if (v <= 20) return 'solo iconici e imperdibili';
  if (v <= 40) return 'prevalentemente noti con qualche gemma';
  if (v <= 60) return 'mix iconici e hidden gems';
  if (v <= 80) return 'preferisce i posti fuori dal comune';
  return 'solo hidden gems, zero turisti';
}

function companionContext(companion: string, kidAges: string[]): string {
  if (companion === 'solo') return 'viaggiatore solo';
  if (companion === 'couple') return 'in coppia';
  if (companion === 'friends') return 'con amici';
  if (companion === 'family') {
    if (kidAges.length > 0) return `famiglia con bambini (${kidAges.join(', ')} anni)`;
    return 'famiglia';
  }
  return companion || '';
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Sei un travel curator esperto con stile Instagram/social. Curi itinerari personalizzati mixando esperienze iconiche e gemme nascoste. Il tuo tono è conversazionale, come un amico che ci è stato — MAI guida turistica fredda.

Rispondi SEMPRE e solo in JSON valido secondo lo schema fornito. Ogni suggerimento deve:
- Avere una caption 'catchy' tipo didascalia Instagram (max 120 caratteri)
- Avere una description di 2-3 righe che spiega perché vale la pena
- Includere tag visivi rilevanti
- Indicare orario migliore per foto quando applicabile
- Essere coerente con il profilo dell'utente fornito

Include mix di: attività prenotabili, esperienze gratuite (passeggiate, spiagge, onsen), momenti relax, street food, ristoranti. NON solo attività a pagamento.`;

function formatItemsByDay(trip: Trip): string {
  const checkIn = trip.checkIn ? new Date(trip.checkIn) : new Date();
  const msPerDay = 86_400_000;
  const lines: string[] = [];

  // New BookingItem format
  if (trip.bookings && trip.bookings.length > 0) {
    const relevant = trip.bookings.filter((b) => b.type !== 'insurance' && b.type !== 'visa');
    if (relevant.length === 0) return 'Nessun evento fisso pianificato.';

    const byDay: Record<string, BookingItem[]> = {};
    for (const item of relevant) {
      const d = new Date(item.timing.startDate + 'T00:00:00');
      const dayIdx = Math.floor((d.getTime() - checkIn.getTime()) / msPerDay);
      const key = `Giorno ${dayIdx + 1} (${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })})`;
      byDay[key] = [...(byDay[key] ?? []), item];
    }

    for (const [day, items] of Object.entries(byDay)) {
      lines.push(`${day}:`);
      for (const item of items) {
        const time = item.timing.startTime ? ` alle ${item.timing.startTime}` : '';
        const end = item.timing.endTime ? `–${item.timing.endTime}` : '';
        let detail = '';
        if (item.type === 'flight' && item.flight) {
          const stops = item.flight.stops.length === 0 ? 'diretto' : `${item.flight.stops.length} scala`;
          detail = ` [VOLO ${item.flight.origin}→${item.flight.destination}, ${stops}]`;
        } else if (item.type === 'transfer' && item.transfer) {
          detail = ` [TRANSFER ${item.transfer.from}→${item.transfer.to} via ${item.transfer.modeLabel}]`;
        } else if (item.type === 'hotel' && item.timing.endDate) {
          const endD = new Date(item.timing.endDate + 'T00:00:00');
          const endDayIdx = Math.floor((endD.getTime() - checkIn.getTime()) / msPerDay);
          detail = ` [HOTEL, check-out Giorno ${endDayIdx + 1}]`;
        }
        lines.push(`  - ${item.title}${time}${end}${detail}`);
      }
    }
    return lines.join('\n');
  }

  return 'Nessun evento fisso pianificato.';
}

function buildGenerationRules(trip: Trip, paceCursor: number): string {
  const rules: string[] = [];
  const checkIn = trip.checkIn ? new Date(trip.checkIn) : new Date();
  const checkOut = trip.checkOut ? new Date(trip.checkOut) : new Date();
  const msPerDay = 86_400_000;
  const totalDays = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay));

  const bookings = trip.bookings ?? [];
  const flights = bookings.filter((b) => b.type === 'flight');
  const transfers = bookings.filter((b) => b.type === 'transfer');

  // Arrival flight: any flight whose arrival day is day 1
  const arrivalFlight = flights.find((b) => {
    const arrDate = b.timing.endDate ?? b.timing.startDate;
    const d = new Date(arrDate + 'T00:00:00');
    return Math.round((d.getTime() - checkIn.getTime()) / msPerDay) === 0;
  });

  if (arrivalFlight) {
    const arrTime = arrivalFlight.timing.endTime ?? arrivalFlight.timing.startTime ?? null;
    const timeNote = arrTime ? ` alle ${arrTime}` : '';
    rules.push(`GIORNO 1 — ARRIVO${timeNote}: Utente appena atterrato, possibile jet lag. Proponi SOLO 1-2 attività leggere (check-in hotel, passeggiata breve, cena vicino all'hotel). Niente musei o tour intensi nel primo giorno.`);
  }

  // Return flight: flight whose departure day is the last day
  const returnFlight = flights.find((b) => {
    const d = new Date(b.timing.startDate + 'T00:00:00');
    const dayIdx = Math.round((d.getTime() - checkIn.getTime()) / msPerDay);
    return dayIdx >= totalDays - 1;
  });

  if (returnFlight && returnFlight.timing.startTime) {
    const [hh, mm] = returnFlight.timing.startTime.split(':').map(Number);
    const cutoffHour = (hh ?? 12) - 3;
    const cutoffTime = `${String(Math.max(0, cutoffHour)).padStart(2, '0')}:${String(mm ?? 0).padStart(2, '0')}`;
    const dayIdx = Math.round((new Date(returnFlight.timing.startDate + 'T00:00:00').getTime() - checkIn.getTime()) / msPerDay);
    rules.push(`GIORNO ${dayIdx + 1} — VOLO RITORNO alle ${returnFlight.timing.startTime}: Proponi SOLO attività che finiscono entro le ${cutoffTime}. Preferisci attività vicine all'hotel/aeroporto. Niente escursioni lontane.`);
  }

  // Transfer days
  for (const transfer of transfers) {
    const d = new Date(transfer.timing.startDate + 'T00:00:00');
    const dayIdx = Math.round((d.getTime() - checkIn.getTime()) / msPerDay);
    if (transfer.timing.startTime) {
      const endNote = transfer.timing.endTime ? `–${transfer.timing.endTime}` : '';
      rules.push(`GIORNO ${dayIdx + 1} — TRANSFER (${transfer.title}) ore ${transfer.timing.startTime}${endNote}: Non schedulare attività in quell'intervallo. Solo attività prima della partenza o dopo l'arrivo a destinazione.`);
    }
  }

  // Pace density rule
  const maxPerDay = paceCursor <= 20 ? 1 : paceCursor <= 40 ? 2 : paceCursor <= 60 ? 3 : paceCursor <= 80 ? 4 : 5;
  rules.push(`DENSITÀ GIORNALIERA: Ritmo utente ${paceCursor}/100 → max ${maxPerDay} suggerimenti per giornata piena. Giornate di arrivo/partenza/transfer: max 1-2 attività leggere indipendentemente dal riempimento richiesto.`);

  rules.push(`TIME_SLOT OBBLIGATORIO: Ogni suggerimento DEVE avere time_slot ('morning', 'afternoon', 'evening') e start_time/end_time realistici. Non lasciare slot sovrapposti nella stessa giornata.`);

  return rules.join('\n');
}

function buildUserPrompt(
  trip: Trip,
  profile: OnboardingData,
  fillPercentage: number,
  includeMeals: boolean,
): string {
  const checkIn = trip.checkIn ? new Date(trip.checkIn) : new Date();
  const checkOut = trip.checkOut ? new Date(trip.checkOut) : new Date();
  const numDays = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000));
  const checkInStr = checkIn.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  const checkOutStr = checkOut.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  const companion = companionContext(profile.companion, profile.childAges);
  const accommodation = profile.accommodation.length > 0 ? profile.accommodation.join(', ') : 'non specificato';
  const transport = profile.transport.length > 0 ? profile.transport.join(', ') : 'non specificato';
  const interests = profile.interests.length > 0 ? profile.interests.join(', ') : 'non specificati';

  const outputSchema = JSON.stringify({
    days: [
      {
        day_number: 1,
        date: checkIn.toISOString().split('T')[0],
        suggestions: [
          {
            time_slot: 'morning',
            start_time: '09:00',
            end_time: '11:00',
            emoji: '⛩️',
            title: 'Esempio titolo',
            caption: 'Caption Instagram catchy (max 120 caratteri)',
            description: '2-3 righe di descrizione tono amico che spiega perché vale la pena.',
            category: 'culture',
            is_bookable: false,
            price_estimate_eur: 0,
            tags: ['📸 Spot foto', '🌅 Golden hour'],
            best_light: '06:00-07:30',
            suitable_for: 'Perfetto in coppia',
          },
        ],
      },
    ],
  }, null, 2);

  return `Genera un itinerario per:
DESTINAZIONE: ${trip.destination}
DATE: dal ${checkInStr} al ${checkOutStr} (${numDays} giorni)
VIAGGIATORI: ${trip.travelers} ${companion ? `(${companion})` : 'persone'}

PROFILO UTENTE:
- Vibe vacanza: ${profile.adventure}/100 (${vibeLabel(profile.adventure)})
- Cibo: ${profile.food}/100 (${foodLabel(profile.food)})
- Ritmo: ${profile.pace}/100 (${paceLabel(profile.pace)})
- Budget: ${profile.budget}/100 (${budgetLabel(profile.budget)})
- Esperienza: ${profile.experience}/100 (${experienceLabel(profile.experience)})
- Alloggi preferiti: ${accommodation}
- Trasporti preferiti: ${transport}
- Interessi: ${interests}
- Nazionalità: ${profile.nationality || 'non specificata'}

EVENTI GIÀ PIANIFICATI (NON RIPETERE, non proporre nulla in conflitto orario):
${formatItemsByDay(trip)}

REGOLE DI GENERAZIONE (rispetta sempre):
${buildGenerationRules(trip, profile.pace)}

RICHIESTA:
- Riempimento slot liberi: ${fillPercentage}%
- Includi suggerimenti pasti: ${includeMeals ? 'sì' : 'no, solo attività/esperienze'}

Genera esattamente ${numDays} giornate. Per ogni giorno proponi suggerimenti solo negli slot LIBERI dagli eventi fissi sopra. Adatta la densità al ritmo utente (${paceLabel(profile.pace)}).

FORMATO OUTPUT (JSON puro, nessun testo prima o dopo):
${outputSchema}`;
}

// ─── API call ─────────────────────────────────────────────────────────────────

export class APIKeyMissingError extends Error {
  constructor() {
    super('API key not configured');
    this.name = 'APIKeyMissingError';
  }
}

export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationError';
  }
}

async function callClaude(userPrompt: string, apiKey: string, systemPrompt: string = SYSTEM_PROMPT): Promise<string> {
  const fetchPromise = fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new GenerationError('Request timeout after 60s')), TIMEOUT_MS),
  );

  const response = await Promise.race([fetchPromise, timeoutPromise]);

  if (!response.ok) {
    const body = await response.text().catch(() => '(unreadable)');
    if (__DEV__) console.error('[ai-itinerary] HTTP error', response.status, ':', body);
    throw new GenerationError(`Claude API ${response.status}: ${body}`);
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  const text = data.content.find((c) => c.type === 'text')?.text ?? '';
  if (!text) throw new GenerationError('Empty response from Claude');
  return text;
}

function parseItinerary(raw: string): AIItinerary {
  // Strip any markdown code fences
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned) as { days: AIItineraryDay[] };
  if (!Array.isArray(parsed.days)) throw new Error('Invalid itinerary schema: missing days array');
  return { ...parsed, generatedAt: new Date().toISOString() };
}

export interface GenerateItineraryParams {
  trip: Trip;
  userProfile: OnboardingData;
  fillPercentage: 25 | 50 | 75 | 100;
  includeMeals: boolean;
}

// ─── Multi-city itinerary ─────────────────────────────────────────────────────

const MULTI_CITY_SYSTEM_PROMPT = `Sei un travel curator esperto. Stai generando un itinerario per un viaggio MULTI-CITTÀ.

Regole fondamentali:
- Per OGNI città, proponi suggerimenti coerenti col profilo utente
- Non ripetere lo stesso tipo di esperienza in città diverse (es. se suggerisci gastronomia ad Osaka, non farlo a Kyoto)
- Bilancia le esperienze: città più iconiche = attività imperdibili; città meno note = gemme nascoste
- L'ultimo giorno di ogni città (eccetto l'ultima) è parziale: l'utente si sposta → poche attività mattutine
- Il primo giorno di ogni città (eccetto la prima) inizia nel pomeriggio dopo lo spostamento

Rispondi SEMPRE e solo in JSON valido secondo lo schema fornito. Nessun testo prima o dopo.`;

function buildMultiCityPrompt(
  trip: Trip,
  cityStops: CityStop[],
  profile: OnboardingData,
  fillPercentage: number,
  includeMeals: boolean,
): string {
  const checkIn = trip.checkIn ? new Date(trip.checkIn) : new Date();
  const companion = companionContext(profile.companion, profile.childAges);
  const interests = profile.interests.length > 0 ? profile.interests.join(', ') : 'non specificati';

  const citySummary = cityStops.map((s, i) => {
    const start = new Date(s.startDate + 'T00:00:00');
    const dayOffset = Math.round((start.getTime() - checkIn.getTime()) / 86_400_000);
    return `  Città ${i + 1}: ${s.name} (Giorni ${dayOffset + 1}–${dayOffset + s.nights}, ${s.nights} ${s.nights === 1 ? 'notte' : 'notti'})`;
  }).join('\n');

  const outputExample = JSON.stringify({
    cities: cityStops.map((s, i) => {
      const start = new Date(s.startDate + 'T00:00:00');
      const dayOffset = Math.round((start.getTime() - checkIn.getTime()) / 86_400_000);
      return {
        name: s.name,
        startDay: dayOffset + 1,
        endDay: dayOffset + s.nights,
        days: Array.from({ length: s.nights }, (_, d) => ({
          day_number: dayOffset + d + 1,
          date: new Date(start.getTime() + d * 86_400_000).toISOString().split('T')[0],
          suggestions: [
            {
              time_slot: 'morning',
              start_time: '09:00',
              end_time: '11:00',
              emoji: '🏯',
              title: `Esempio attività a ${s.name}`,
              caption: 'Caption Instagram (max 120 caratteri)',
              description: '2-3 righe perché vale la pena.',
              category: 'culture',
              is_bookable: false,
              price_estimate_eur: 0,
              tags: ['📸 Spot foto'],
            },
          ],
        })),
      };
    }),
  }, null, 2);

  return `Genera itinerario multi-città per:
DESTINAZIONE PRINCIPALE: ${trip.destination}
STRUTTURA VIAGGIO:
${citySummary}
VIAGGIATORI: ${trip.travelers} (${companion})

PROFILO UTENTE:
- Vibe: ${profile.adventure}/100 (${vibeLabel(profile.adventure)})
- Cibo: ${profile.food}/100 (${foodLabel(profile.food)})
- Ritmo: ${profile.pace}/100 (${paceLabel(profile.pace)})
- Budget: ${profile.budget}/100 (${budgetLabel(profile.budget)})
- Esperienza: ${profile.experience}/100 (${experienceLabel(profile.experience)})
- Interessi: ${interests}

RICHIESTA:
- Riempimento: ${fillPercentage}% (~${Math.ceil(fillPercentage / 25)} suggerimenti/giorno)
- Includi pasti: ${includeMeals ? 'sì' : 'no'}

FORMATO OUTPUT (JSON puro):
${outputExample}`;
}

function parseMultiCityItinerary(raw: string): AIMultiCityItinerary {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned) as { cities: AIMultiCityCity[] };
  if (!Array.isArray(parsed.cities)) throw new Error('Invalid multi-city schema: missing cities array');
  return { ...parsed, generatedAt: new Date().toISOString() };
}

export interface GenerateMultiCityItineraryParams {
  trip: Trip;
  cityStops: CityStop[];
  userProfile: OnboardingData;
  fillPercentage: 25 | 50 | 75 | 100;
  includeMeals: boolean;
}

export async function generateMultiCityItinerary(params: GenerateMultiCityItineraryParams): Promise<AIMultiCityItinerary> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
  if (!apiKey || apiKey === PLACEHOLDER_KEY) throw new APIKeyMissingError();

  const userPrompt = buildMultiCityPrompt(
    params.trip,
    params.cityStops,
    params.userProfile,
    params.fillPercentage,
    params.includeMeals,
  );

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callClaude(userPrompt, apiKey, MULTI_CITY_SYSTEM_PROMPT);
      return parseMultiCityItinerary(raw);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof APIKeyMissingError) throw err;
    }
  }
  throw lastError ?? new GenerationError('Unknown error');
}

// ─── Single-city itinerary ────────────────────────────────────────────────────

export async function generateItinerary(params: GenerateItineraryParams): Promise<AIItinerary> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

  if (!apiKey || apiKey === PLACEHOLDER_KEY) {
    throw new APIKeyMissingError();
  }

  const userPrompt = buildUserPrompt(
    params.trip,
    params.userProfile,
    params.fillPercentage,
    params.includeMeals,
  );

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callClaude(userPrompt, apiKey, SYSTEM_PROMPT);
      const itinerary = parseItinerary(raw);
      return itinerary;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (__DEV__) console.warn(`[ai-itinerary] attempt ${attempt + 1} failed:`, lastError.message);
      if (err instanceof APIKeyMissingError) throw err;
      // retry once on parse errors or transient network issues
    }
  }

  throw lastError ?? new GenerationError('Unknown error');
}
