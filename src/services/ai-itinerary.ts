// TODO: spostare su backend in produzione per non esporre API key

import type { Trip, TripItem } from '../types/trip';
import type { OnboardingData } from '../stores/useAppStore';
import type { AIItinerary, AIItineraryDay } from '../types/ai-itinerary';

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

  const relevantItems = trip.items.filter((i) => i.type !== 'insurance');

  if (relevantItems.length === 0) {
    lines.push('Nessun evento fisso pianificato.');
    return lines.join('\n');
  }

  const byDay: Record<string, TripItem[]> = {};

  for (const item of relevantItems) {
    if (item.departureAt) {
      const d = new Date(item.departureAt);
      const dayIdx = Math.floor((d.getTime() - checkIn.getTime()) / msPerDay);
      const key = `Giorno ${dayIdx + 1} (${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })})`;
      byDay[key] = [...(byDay[key] ?? []), item];
    } else {
      const key = 'Tutto il viaggio';
      byDay[key] = [...(byDay[key] ?? []), item];
    }
  }

  for (const [day, items] of Object.entries(byDay)) {
    lines.push(`${day}:`);
    for (const item of items) {
      const time = item.departureAt ? ` alle ${new Date(item.departureAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : '';
      lines.push(`  - ${item.title}${time}`);
    }
  }

  return lines.join('\n');
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

EVENTI GIÀ PIANIFICATI:
${formatItemsByDay(trip)}

RICHIESTA:
- Riempimento slot liberi: ${fillPercentage}%
- Includi suggerimenti pasti: ${includeMeals ? 'sì' : 'no, solo attività/esperienze'}

Genera esattamente ${numDays} giornate. Per ogni giorno fornisci un numero di suggerimenti coerente con il riempimento richiesto (${fillPercentage}% = ~${Math.ceil(fillPercentage / 25)} suggerimenti/giorno). Non riempire gli slot già occupati da eventi pianificati sopra.

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

async function callClaude(userPrompt: string, apiKey: string): Promise<string> {
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
      system: SYSTEM_PROMPT,
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
      const raw = await callClaude(userPrompt, apiKey);
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
