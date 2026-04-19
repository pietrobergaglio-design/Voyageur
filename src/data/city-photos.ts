// TODO: replace null photoUrls with verified Unsplash photo IDs
// Format: https://images.unsplash.com/photo-{ID}?w=800&q=80

export interface CityPhotoData {
  photoUrl: string | null;
  gradientColors: [string, string];
  flagEmoji: string;
}

// Country → suggested additional cities (for multi-city proposals)
export const COUNTRY_SUGGESTED_CITIES: Record<string, string[]> = {
  'Japan': ['Kyoto', 'Osaka', 'Hiroshima', 'Nara', 'Hakone', 'Nikko', 'Sapporo', 'Naha'],
  'Japan (日本)': ['Kyoto', 'Osaka', 'Hiroshima', 'Nara', 'Hakone'],
  'Italy': ['Rome', 'Florence', 'Venice', 'Naples', 'Turin', 'Bologna', 'Amalfi'],
  'Italia': ['Roma', 'Firenze', 'Venezia', 'Napoli', 'Torino', 'Bologna'],
  'France': ['Lyon', 'Nice', 'Marseille', 'Bordeaux', 'Strasbourg', 'Provence'],
  'Francia': ['Lione', 'Nizza', 'Marsiglia', 'Bordeaux', 'Strasburgo'],
  'Spain': ['Barcelona', 'Madrid', 'Seville', 'Granada', 'Valencia', 'San Sebastián'],
  'Spagna': ['Barcellona', 'Madrid', 'Siviglia', 'Granada', 'Valencia'],
  'United Kingdom': ['Edinburgh', 'Bath', 'Oxford', 'Cambridge', 'York', 'Cotswolds'],
  'UK': ['Edinburgh', 'Bath', 'Oxford', 'York'],
  'USA': ['New York', 'Los Angeles', 'San Francisco', 'Miami', 'Chicago', 'New Orleans'],
  'Thailand': ['Chiang Mai', 'Phuket', 'Krabi', 'Koh Samui', 'Ayutthaya'],
  'Tailandia': ['Chiang Mai', 'Phuket', 'Krabi', 'Koh Samui'],
  'Germany': ['Munich', 'Hamburg', 'Cologne', 'Frankfurt', 'Heidelberg', 'Dresden'],
  'Germania': ['Monaco', 'Amburgo', 'Colonia', 'Francoforte'],
  'Greece': ['Santorini', 'Mykonos', 'Crete', 'Rhodes', 'Thessaloniki'],
  'Grecia': ['Santorini', 'Mykonos', 'Creta', 'Rodi'],
  'Portugal': ['Porto', 'Sintra', 'Algarve', 'Braga', 'Évora'],
  'Portogallo': ['Porto', 'Sintra', 'Algarve'],
  'Netherlands': ['Amsterdam', 'Rotterdam', 'Utrecht', 'The Hague', 'Bruges'],
  'Brasil': ['Rio de Janeiro', 'São Paulo', 'Salvador', 'Florianópolis', 'Foz do Iguaçu'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Cairns', 'Gold Coast'],
  'Indonesia': ['Bali', 'Yogyakarta', 'Lombok', 'Komodo', 'Raja Ampat'],
  'Vietnam': ['Hanoi', 'Ho Chi Minh City', 'Hội An', 'Đà Nẵng', 'Nha Trang'],
  'India': ['Mumbai', 'Jaipur', 'Agra', 'Goa', 'Varanasi', 'Kerala'],
  'Morocco': ['Marrakech', 'Fes', 'Essaouira', 'Chefchaouen', 'Sahara'],
  'Egypt': ['Luxor', 'Aswan', 'Alexandria', 'Hurghada'],
};

// Per-city gradient colors and flag emojis
const CITY_DATA: Record<string, CityPhotoData> = {
  // Japan
  'Tokyo': { photoUrl: null, gradientColors: ['#1a1a2e', '#e94560'], flagEmoji: '🇯🇵' },
  'Kyoto': { photoUrl: null, gradientColors: ['#2d1b69', '#f72585'], flagEmoji: '🇯🇵' },
  'Osaka': { photoUrl: null, gradientColors: ['#0f3460', '#533483'], flagEmoji: '🇯🇵' },
  'Hiroshima': { photoUrl: null, gradientColors: ['#1b4332', '#40916c'], flagEmoji: '🇯🇵' },
  'Nara': { photoUrl: null, gradientColors: ['#1a472a', '#2d6a4f'], flagEmoji: '🇯🇵' },
  'Hakone': { photoUrl: null, gradientColors: ['#023e8a', '#48cae4'], flagEmoji: '🇯🇵' },
  'Nikko': { photoUrl: null, gradientColors: ['#1b4332', '#52b788'], flagEmoji: '🇯🇵' },
  'Sapporo': { photoUrl: null, gradientColors: ['#023e8a', '#90e0ef'], flagEmoji: '🇯🇵' },
  'Naha': { photoUrl: null, gradientColors: ['#0077b6', '#00b4d8'], flagEmoji: '🇯🇵' },

  // Italy
  'Roma': { photoUrl: null, gradientColors: ['#7f0000', '#c0392b'], flagEmoji: '🇮🇹' },
  'Rome': { photoUrl: null, gradientColors: ['#7f0000', '#c0392b'], flagEmoji: '🇮🇹' },
  'Firenze': { photoUrl: null, gradientColors: ['#6d4c41', '#d4a76a'], flagEmoji: '🇮🇹' },
  'Florence': { photoUrl: null, gradientColors: ['#6d4c41', '#d4a76a'], flagEmoji: '🇮🇹' },
  'Venezia': { photoUrl: null, gradientColors: ['#0d47a1', '#42a5f5'], flagEmoji: '🇮🇹' },
  'Venice': { photoUrl: null, gradientColors: ['#0d47a1', '#42a5f5'], flagEmoji: '🇮🇹' },
  'Napoli': { photoUrl: null, gradientColors: ['#1565c0', '#29b6f6'], flagEmoji: '🇮🇹' },
  'Naples': { photoUrl: null, gradientColors: ['#1565c0', '#29b6f6'], flagEmoji: '🇮🇹' },
  'Milano': { photoUrl: null, gradientColors: ['#1a237e', '#5c6bc0'], flagEmoji: '🇮🇹' },
  'Milan': { photoUrl: null, gradientColors: ['#1a237e', '#5c6bc0'], flagEmoji: '🇮🇹' },
  'Torino': { photoUrl: null, gradientColors: ['#4a148c', '#7b1fa2'], flagEmoji: '🇮🇹' },
  'Bologna': { photoUrl: null, gradientColors: ['#bf360c', '#e64a19'], flagEmoji: '🇮🇹' },
  'Amalfi': { photoUrl: null, gradientColors: ['#004d40', '#00897b'], flagEmoji: '🇮🇹' },

  // France
  'Paris': { photoUrl: null, gradientColors: ['#37003c', '#c8a2c8'], flagEmoji: '🇫🇷' },
  'Lyon': { photoUrl: null, gradientColors: ['#1a237e', '#e53935'], flagEmoji: '🇫🇷' },
  'Nice': { photoUrl: null, gradientColors: ['#0277bd', '#29b6f6'], flagEmoji: '🇫🇷' },
  'Marseille': { photoUrl: null, gradientColors: ['#01579b', '#0288d1'], flagEmoji: '🇫🇷' },
  'Bordeaux': { photoUrl: null, gradientColors: ['#4a148c', '#880e4f'], flagEmoji: '🇫🇷' },

  // Spain
  'Barcelona': { photoUrl: null, gradientColors: ['#a50034', '#ffcd00'], flagEmoji: '🇪🇸' },
  'Madrid': { photoUrl: null, gradientColors: ['#b71c1c', '#e53935'], flagEmoji: '🇪🇸' },
  'Seville': { photoUrl: null, gradientColors: ['#e65100', '#ff8f00'], flagEmoji: '🇪🇸' },
  'Siviglia': { photoUrl: null, gradientColors: ['#e65100', '#ff8f00'], flagEmoji: '🇪🇸' },
  'Granada': { photoUrl: null, gradientColors: ['#880e4f', '#c62828'], flagEmoji: '🇪🇸' },
  'Valencia': { photoUrl: null, gradientColors: ['#e65100', '#ff6f00'], flagEmoji: '🇪🇸' },

  // UK
  'London': { photoUrl: null, gradientColors: ['#1a1a2e', '#e91e63'], flagEmoji: '🇬🇧' },
  'Edinburgh': { photoUrl: null, gradientColors: ['#0d47a1', '#1565c0'], flagEmoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  'Bath': { photoUrl: null, gradientColors: ['#4e342e', '#795548'], flagEmoji: '🇬🇧' },
  'Oxford': { photoUrl: null, gradientColors: ['#1a237e', '#283593'], flagEmoji: '🇬🇧' },

  // USA
  'New York': { photoUrl: null, gradientColors: ['#1a1a2e', '#16213e'], flagEmoji: '🇺🇸' },
  'Los Angeles': { photoUrl: null, gradientColors: ['#ff6b35', '#f7931e'], flagEmoji: '🇺🇸' },
  'San Francisco': { photoUrl: null, gradientColors: ['#c0392b', '#e74c3c'], flagEmoji: '🇺🇸' },
  'Miami': { photoUrl: null, gradientColors: ['#0077b6', '#00b4d8'], flagEmoji: '🇺🇸' },
  'Chicago': { photoUrl: null, gradientColors: ['#1565c0', '#1976d2'], flagEmoji: '🇺🇸' },

  // Thailand
  'Bangkok': { photoUrl: null, gradientColors: ['#f9a825', '#e65100'], flagEmoji: '🇹🇭' },
  'Chiang Mai': { photoUrl: null, gradientColors: ['#1b5e20', '#388e3c'], flagEmoji: '🇹🇭' },
  'Phuket': { photoUrl: null, gradientColors: ['#0077b6', '#48cae4'], flagEmoji: '🇹🇭' },
  'Krabi': { photoUrl: null, gradientColors: ['#004d40', '#00897b'], flagEmoji: '🇹🇭' },
  'Koh Samui': { photoUrl: null, gradientColors: ['#0288d1', '#4fc3f7'], flagEmoji: '🇹🇭' },

  // Germany
  'Berlin': { photoUrl: null, gradientColors: ['#212121', '#616161'], flagEmoji: '🇩🇪' },
  'Munich': { photoUrl: null, gradientColors: ['#0d47a1', '#ffffff'], flagEmoji: '🇩🇪' },
  'Monaco': { photoUrl: null, gradientColors: ['#0d47a1', '#c62828'], flagEmoji: '🇩🇪' },
  'Hamburg': { photoUrl: null, gradientColors: ['#b71c1c', '#c62828'], flagEmoji: '🇩🇪' },

  // Greece
  'Athens': { photoUrl: null, gradientColors: ['#0d47a1', '#ffffff'], flagEmoji: '🇬🇷' },
  'Santorini': { photoUrl: null, gradientColors: ['#1565c0', '#42a5f5'], flagEmoji: '🇬🇷' },
  'Mykonos': { photoUrl: null, gradientColors: ['#0288d1', '#b3e5fc'], flagEmoji: '🇬🇷' },

  // Portugal
  'Lisbon': { photoUrl: null, gradientColors: ['#0d47a1', '#e91e63'], flagEmoji: '🇵🇹' },
  'Lisbona': { photoUrl: null, gradientColors: ['#0d47a1', '#e91e63'], flagEmoji: '🇵🇹' },
  'Porto': { photoUrl: null, gradientColors: ['#4a148c', '#7b1fa2'], flagEmoji: '🇵🇹' },

  // Indonesia / Bali
  'Bali': { photoUrl: null, gradientColors: ['#1b5e20', '#f57f17'], flagEmoji: '🇮🇩' },
  'Jakarta': { photoUrl: null, gradientColors: ['#b71c1c', '#e53935'], flagEmoji: '🇮🇩' },

  // Default fallback
  'default': { photoUrl: null, gradientColors: ['#2c3e50', '#3498db'], flagEmoji: '🌍' },
};

// Country-level flag emojis for unknown cities
const COUNTRY_FLAGS: Record<string, string> = {
  'japan': '🇯🇵',
  'italy': '🇮🇹',
  'italia': '🇮🇹',
  'france': '🇫🇷',
  'francia': '🇫🇷',
  'spain': '🇪🇸',
  'spagna': '🇪🇸',
  'uk': '🇬🇧',
  'united kingdom': '🇬🇧',
  'usa': '🇺🇸',
  'united states': '🇺🇸',
  'thailand': '🇹🇭',
  'tailandia': '🇹🇭',
  'germany': '🇩🇪',
  'germania': '🇩🇪',
  'greece': '🇬🇷',
  'grecia': '🇬🇷',
  'portugal': '🇵🇹',
  'portogallo': '🇵🇹',
  'australia': '🇦🇺',
  'indonesia': '🇮🇩',
  'vietnam': '🇻🇳',
  'india': '🇮🇳',
  'morocco': '🇲🇦',
  'marocco': '🇲🇦',
  'brazil': '🇧🇷',
  'brasile': '🇧🇷',
};

export function getCityPhotoData(cityName: string, country?: string): CityPhotoData {
  const direct = CITY_DATA[cityName];
  if (direct) return direct;

  // Try country flag + default gradient
  const countryFlag = country ? COUNTRY_FLAGS[country.toLowerCase()] : undefined;
  const flagEmoji = countryFlag ?? '🌍';

  // Generate a deterministic gradient based on city name
  const hash = cityName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const gradients: Array<[string, string]> = [
    ['#1a1a2e', '#e94560'],
    ['#0f3460', '#533483'],
    ['#1b4332', '#52b788'],
    ['#023e8a', '#48cae4'],
    ['#4a148c', '#c62828'],
    ['#004d40', '#00897b'],
    ['#1565c0', '#42a5f5'],
    ['#e65100', '#ff8f00'],
  ];
  const gradientColors = gradients[hash % gradients.length];

  return { photoUrl: null, gradientColors, flagEmoji };
}

export function getSuggestedCities(country: string): string[] {
  return (
    COUNTRY_SUGGESTED_CITIES[country] ??
    COUNTRY_SUGGESTED_CITIES[country.toLowerCase()] ??
    []
  );
}
