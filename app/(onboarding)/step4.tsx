import { SliderScreenTemplate, SliderConfig } from '../../src/components/onboarding/SliderScreenTemplate';

const config: SliderConfig = {
  step: 3,
  storeKey: 'pace',
  question: 'Che ritmo ti immagini?',
  leftEmoji: '🐌',
  leftLabel: 'Svegliarsi senza sveglia',
  rightEmoji: '⚡',
  rightLabel: 'La sveglia suona alle 6',
  stops: [
    'Giornata libera',
    '1-2 cose con calma',
    '2-3 cose e pause',
    '4 attività al giorno',
    'Ogni minuto schedulato',
  ],
  phrases: [
    'Zero piani, vedi dove ti porta il giorno',
    'Una cosa al giorno, massimo — poi si vede',
    'Un po\' di programma, un po\' di libertà',
    'Lista attività, tutte spuntate entro sera',
    'Sveglia presto, lista lunga, niente pausa',
  ],
  nextRoute: '/(onboarding)/step5',
};

export default function Step4() {
  return <SliderScreenTemplate config={config} />;
}
