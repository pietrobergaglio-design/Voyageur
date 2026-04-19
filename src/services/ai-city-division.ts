// TODO: spostare su backend proxy in produzione per non esporre API key

import type { OnboardingData } from '../stores/useAppStore';
import type { AICityDivision } from '../types/multi-city';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;
const TIMEOUT_MS = 30_000;

function experienceLabel(v: number): string {
  if (v < 30) return 'vuole visitare i luoghi iconici più famosi';
  if (v > 70) return 'preferisce luoghi autentici e meno turistici';
  return 'cerca un mix equilibrato tra luoghi famosi e nascosti';
}

function paceLabel(v: number): string {
  if (v < 30) return 'ritmo lento, preferisce meno città con più giorni';
  if (v > 70) return 'ritmo intenso, può visitare più città con meno giorni';
  return 'ritmo moderato';
}

function vibeLabel(v: number): string {
  if (v < 30) return 'relax, natura, tranquillità';
  if (v > 70) return 'avventura, adrenalina, città vivaci';
  return 'mix di esperienze';
}

export class AICityDivisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AICityDivisionError';
  }
}

export async function suggestCityDivision(params: {
  destination: string;
  country: string;
  totalDays: number;
  profile: OnboardingData;
}): Promise<AICityDivision> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
  if (!apiKey || apiKey === 'sk-ant-placeholder') {
    throw new AICityDivisionError('Anthropic API key non configurata');
  }

  const { destination, country, totalDays, profile } = params;
  const interests = (profile.interests ?? []).join(', ') || 'non specificati';
  const companion = profile.companion || 'non specificato';

  const userPrompt = `Destinazione base: ${destination} (${country})
Durata totale viaggio: ${totalDays} giorni
Profilo utente:
- Experience: ${experienceLabel(profile.experience ?? 50)}
- Ritmo: ${paceLabel(profile.pace ?? 50)}
- Vibe: ${vibeLabel(profile.adventure ?? 50)}
- Interessi: ${interests}
- Compagno di viaggio: ${companion}

Suggerisci come dividere i ${totalDays} giorni tra ${destination} e altre città di ${country}.
La somma dei nights DEVE essere esattamente ${totalDays}.`;

  const systemPrompt = `Sei un travel planner esperto. Dato una destinazione base e un profilo utente, suggerisci come dividere i giorni del viaggio tra la città principale e altre città famose della stessa nazione.

Considera:
- Cursore experience: se <30 (iconico) preferisci città famose con landmark. Se >70 (hidden gem) preferisci città meno turistiche e autentiche.
- Cursore pace: se <30 (slow) meno città, più giorni per ciascuna. Se >70 (intenso) più città, meno giorni.
- Cursore vibe: relax → città tranquille. Adrenalina → città vivaci.
- Interests: se 'gastronomia' includi città famose per cibo. Se 'storia/arte' includi città culturali.

Distribuisci i giorni in modo realistico considerando tempi di spostamento tra città.

RISPONDI SOLO in JSON valido, nessun testo fuori dal JSON:
{
  "cities": [
    {
      "name": "NomeCittà",
      "nights": 4,
      "reason": "Motivazione breve in italiano",
      "isBase": true
    }
  ],
  "transport_suggestions": [
    { "from": "Città1", "to": "Città2", "mode": "Shinkansen", "duration": "2h10", "price_eur": 220 }
  ]
}

La somma dei nights DEVE essere esattamente uguale al totalDays richiesto.`;

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new AICityDivisionError('Timeout')), TIMEOUT_MS),
  );

  const fetchCall = fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const resp = await Promise.race([fetchCall, timeout]) as Response;

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new AICityDivisionError(`API error ${resp.status}: ${body.slice(0, 200)}`);
  }

  const json = await resp.json() as {
    content?: Array<{ type: string; text: string }>;
  };

  const text = json.content?.find((b) => b.type === 'text')?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new AICityDivisionError('Risposta AI non valida');

  const parsed = JSON.parse(jsonMatch[0]) as AICityDivision;

  // Validate sum of nights
  const totalNights = parsed.cities.reduce((s, c) => s + c.nights, 0);
  if (totalNights !== params.totalDays) {
    if (__DEV__) console.warn(`[ai-city] nights mismatch: ${totalNights} ≠ ${params.totalDays}`);
  }

  return parsed;
}
