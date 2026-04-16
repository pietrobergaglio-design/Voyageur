import { SliderScreenTemplate, SliderConfig } from '../../src/components/onboarding/SliderScreenTemplate';

const config: SliderConfig = {
  step: 4,
  storeKey: 'budget',
  question: 'Il tuo portafoglio in vacanza...',
  leftEmoji: '🎒',
  leftLabel: 'Conto ogni centesimo',
  rightEmoji: '👑',
  rightLabel: 'Il prezzo non è un problema',
  stops: [
    'Ostello e ramen',
    'Budget smart',
    'Qualità-prezzo',
    'Mi concedo il meglio',
    'Senza limiti',
  ],
  phrases: [
    'Dormire costa poco, mangiare anche meno',
    'Budget controllato, mai uno spreco inutile',
    'Spendi bene, senza eccedere',
    'Qualità prima di tutto, il resto segue',
    'Se è bello lo prendi, punto',
  ],
  nextRoute: '/(onboarding)/step6',
};

export default function Step5() {
  return <SliderScreenTemplate config={config} />;
}
