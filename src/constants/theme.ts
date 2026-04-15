export const Colors = {
  accent: '#C4593B',
  navy: '#191A2C',
  teal: '#1B8F6A',
  background: '#FAF9F5',
  white: '#FFFFFF',

  text: {
    primary: '#191A2C',
    secondary: '#5C5849',
    muted: '#9E9A91',
    inverse: '#FFFFFF',
  },

  border: '#E5E0D5',
  card: '#FFFFFF',
  overlay: 'rgba(25, 26, 44, 0.4)',

  tab: {
    active: '#C4593B',
    inactive: '#9E9A91',
    background: '#FFFFFF',
    border: '#F0EBE3',
  },
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontFamily = {
  body: 'Outfit',
  bodyMedium: 'OutfitMedium',
  bodySemiBold: 'OutfitSemiBold',
  display: 'Fraunces',
  displayBold: 'FrauncesDisplay',
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  display: 32,
  hero: 40,
} as const;
