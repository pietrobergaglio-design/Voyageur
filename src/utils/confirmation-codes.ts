import type { BookingItem } from '../types/booking';
import { randomAlphanumeric, randomDigits, dateCompact } from './random-codes';

const CAR_COMPANY_PREFIX: Record<string, string> = {
  hertz: 'HTZ',
  avis: 'AVS',
  europcar: 'EUR',
  enterprise: 'ENT',
  sixt: 'SXT',
  budget: 'BDG',
};

const INSURANCE_TIER_CODE: Record<string, string> = {
  Essential: 'ESS',
  Plus: 'PLS',
  Premium: 'PRM',
};

// TODO: Replace with real PNR from Duffel API once LLC + Stripe are
//       set up and real booking integration is active (post-launch)
export function generateConfirmationCode(item: BookingItem): string | undefined {
  switch (item.type) {
    case 'flight':
      // TODO: Replace with real PNR from Duffel API once LLC + Stripe are
      //       set up and real booking integration is active (post-launch)
      return randomAlphanumeric(6);

    case 'hotel':
      // TODO: Replace with real booking_id from Booking.com / Expedia once
      //       real booking integration is active (post-launch)
      return randomDigits(10);

    case 'car': {
      // TODO: Replace with real reservation number from provider API (post-launch)
      const company = item.car?.company?.toLowerCase() ?? '';
      const prefix =
        Object.entries(CAR_COMPANY_PREFIX).find(([k]) => company.includes(k))?.[1] ?? 'VYG';
      return `${prefix}-${randomDigits(7)}`;
    }

    case 'activity':
      // TODO: Replace with real booking reference from Viator/Booking Attractions (post-launch)
      return `VYT-${randomAlphanumeric(8)}`;

    case 'insurance': {
      // TODO: Replace with real policy number from Qover API (post-launch)
      const tier = INSURANCE_TIER_CODE[item.insurance?.plan ?? ''] ?? 'ESS';
      return `POL-${dateCompact()}-${tier}-${randomDigits(4)}`;
    }

    case 'transfer':
      return `VYT-TRN-${randomAlphanumeric(4)}`;

    case 'visa':
      // No Voyageur confirmation code — user applies directly on external portal
      return undefined;

    default:
      return undefined;
  }
}
