import { SliderScreenTemplate, SliderConfig } from '../../src/components/onboarding/SliderScreenTemplate';

const config: SliderConfig = {
  step: 1,
  storeKey: 'adventure',
  question: 'La tua vacanza ideale?',
  leftEmoji: '🧘',
  leftLabel: 'Amaca e tramonto',
  rightEmoji: '🧗',
  rightLabel: 'Lanciarmi da un ponte',
  stops: [
    'Spa e spiaggia',
    'Natura e passeggiate',
    'Snorkeling e bici',
    'Trekking e rafting',
    'Bungee e paracadute',
  ],
  phrases: [
    'Il massimo della vita è un libro vista mare',
    'Una passeggiata al tramonto, la serata perfetta',
    'Un mix equilibrato — relax e un po\' di brivido',
    'Trekking e rafting? Sì grazie, subito',
    'Se non c\'è adrenalina, non è vacanza',
  ],
  nextRoute: '/(onboarding)/step3',
};

export default function Step2() {
  return <SliderScreenTemplate config={config} />;
}
