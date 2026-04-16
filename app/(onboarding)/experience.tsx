import { SliderScreenTemplate, SliderConfig } from '../../src/components/onboarding/SliderScreenTemplate';

const config: SliderConfig = {
  step: 5,
  storeKey: 'experience',
  question: 'Che esperienza cerchi?',
  leftEmoji: '📸',
  leftLabel: 'I posti iconici',
  rightEmoji: '🔑',
  rightLabel: 'Le gemme nascoste',
  stops: [
    'Landmarks e must-see',
    'Iconico ma smart',
    'Mix di tutto',
    'Off the beaten path',
    'Solo locals',
  ],
  phrases: [
    'Vuoi le foto che tutti riconoscono',
    'I classici ma vissuti nel modo giusto',
    'Un po\' di tutto, iconico e autentico',
    'Ti interessa quello che i turisti non trovano',
    'Solo posti dove vanno i locali',
  ],
  nextRoute: '/(onboarding)/step6',
};

export default function ExperienceStep() {
  return <SliderScreenTemplate config={config} />;
}
