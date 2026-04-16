export interface UsefulPhrase {
  italian: string;
  local: string;
  pronunciation: string;
}

export interface ESIMOption {
  provider: string;
  data: string;
  days: number;
  price: number;
  link: string;
}

export interface HealthInfo {
  vaccines: string[];
  water: string;
  hospitals: string;
  emergencyNumber: string;
}

export interface PracticalInfo {
  currency: string;
  exchangeRate: string;
  timezone: string;
  plugType: string;
  voltage: string;
  tipping: string;
  language: string;
}

export interface VisaRequirement {
  required: boolean;
  label: string;
  details: string;
  stayLimit?: string;
}

export interface DestinationInfo {
  code: string;
  name: string;
  country: string;
  flag: string;
  visa: VisaRequirement;
  health: HealthInfo;
  practical: PracticalInfo;
  phrases: UsefulPhrase[];
  esim: ESIMOption[];
  weather: {
    month: string;
    description: string;
    avgTempC: number;
    emoji: string;
  };
}
