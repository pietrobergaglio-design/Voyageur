import { SliderScreenTemplate, SliderConfig } from '../../src/components/onboarding/SliderScreenTemplate';

const config: SliderConfig = {
  step: 2,
  storeKey: 'food',
  question: 'A tavola come sei?',
  leftEmoji: '🌮',
  leftLabel: 'Bancarella sul marciapiede',
  rightEmoji: '🥂',
  rightLabel: 'Menu degustazione 12 portate',
  stops: [
    'Street food e mercati',
    'Trattoria locale',
    'Ristorante tipico',
    'Bistrot ricercato',
    'Stellato e omakase',
  ],
  phrases: [
    'Il cibo migliore si trova per strada',
    'Una trattoria autentica, il piatto del giorno',
    'Il buon cibo è parte del viaggio',
    'Prenotazione, carta dei vini, esperienza',
    'Per te mangiare è un\'esperienza da ricordare',
  ],
  nextRoute: '/(onboarding)/step4',
};

export default function Step3() {
  return <SliderScreenTemplate config={config} />;
}
