import type { Trip, TripItem } from '../types/trip';
import type { BookingItem, BookingType, SearchParams } from '../types/booking';
import {
  flightDirectionGroupToBookingItem,
  carOfferToBookingItem,
  insurancePlanToBookingItem,
} from '../adapters/booking-adapters';

function tripItemToBookingItem(item: TripItem): BookingItem {
  const type = item.type as BookingType;
  const startDate = item.departureAt?.split('T')[0] ?? new Date().toISOString().split('T')[0];
  return {
    id: item.id,
    type,
    status: 'booked',
    title: item.title,
    provider: item.subtitle ?? '',
    price: item.price ?? 0,
    currency: 'EUR',
    photos: [],
    timing: {
      startDate,
      endDate: item.arrivalAt?.split('T')[0],
      startTime: item.departureAt ? item.departureAt.slice(11, 16) : undefined,
      endTime: item.arrivalAt ? item.arrivalAt.slice(11, 16) : undefined,
    },
    refund: {
      refundable: item.refundPolicy === 'flexible' || item.refundPolicy === 'moderate',
      description:
        item.refundPolicy === 'flexible'
          ? 'Rimborsabile'
          : item.refundPolicy === 'moderate'
          ? 'Parzialmente rimborsabile'
          : 'Non rimborsabile',
    },
  };
}

export function migrateTripToBookings(trip: Trip): BookingItem[] {
  const result: BookingItem[] = [];

  const params: SearchParams = {
    origin: trip.origin ?? '',
    originCode: trip.originCode ?? '',
    destination: trip.destination,
    destinationCode: trip.destinationCode,
    checkIn: trip.checkIn ? new Date(trip.checkIn) : new Date(),
    checkOut: trip.checkOut ? new Date(trip.checkOut) : new Date(),
    travelers: trip.travelers,
  };

  if (trip.flightOutbound) {
    result.push({ ...flightDirectionGroupToBookingItem(trip.flightOutbound, 'outbound', null), status: 'booked' });
  }
  if (trip.flightReturn) {
    result.push({ ...flightDirectionGroupToBookingItem(trip.flightReturn, 'return', null), status: 'booked' });
  }
  if (trip.selectedCar) {
    result.push({ ...carOfferToBookingItem(trip.selectedCar, params), status: 'booked' });
  }
  if (trip.selectedInsurancePlan) {
    result.push({ ...insurancePlanToBookingItem(trip.selectedInsurancePlan, params), status: 'booked' });
  }

  const coveredTypes = new Set<string>();
  if (trip.flightOutbound || trip.flightReturn) coveredTypes.add('flight');
  if (trip.selectedCar) coveredTypes.add('car');
  if (trip.selectedInsurancePlan) coveredTypes.add('insurance');

  for (const item of trip.items) {
    if (coveredTypes.has(item.type)) continue;
    result.push(tripItemToBookingItem(item));
  }

  return result;
}
