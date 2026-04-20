import type { Trip } from '../types/trip';
import type { BookingItem, BookingType, BookingStatus } from '../types/booking';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  time: string;            // "HH:MM" — always precise for sorting; isApprox flag controls display
  isApprox: boolean;       // true if time is inferred from timeOfDay placeholder (renders as "~HH:MM")
  icon: string;            // emoji
  title: string;
  subtitle?: string;
  duration?: string;       // "12h 20m", "2 notti", etc.
  bookingId: string;       // id of source BookingItem
  bookingType: BookingType;
  status: BookingStatus;
  isFixed: true;
  arrivesNextDay?: string; // "→ arriva il 16 lug" — only on departure event when dayOffset > 0
}

export interface TimelineDay {
  dayNumber: number;   // 1-based
  date: string;        // "YYYY-MM-DD"
  dayLabel: string;    // "Giorno 1"
  dateLabel: string;   // "Mer 15 Lug"
  events: TimelineEvent[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function fmtDayLabel(d: Date): string {
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtShortDate(isoStr: string): string {
  // Use noon to avoid local-timezone edge cases on date boundary
  const d = new Date(isoStr + 'T12:00:00');
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function resolveApproxTime(timeOfDay?: string): string {
  switch (timeOfDay) {
    case 'morning': return '09:00';
    case 'afternoon': return '14:00';
    case 'evening': return '19:00';
    case 'night': return '22:00';
    default: return '09:00';
  }
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function transferIcon(mode?: string): string {
  switch (mode) {
    case 'flight': return '✈️';
    case 'bus': return '🚌';
    case 'car': return '🚗';
    case 'train':
    default: return '🚄';
  }
}

// ─── Per-booking event generation ─────────────────────────────────────────────

interface RawEvent {
  date: string;
  event: TimelineEvent;
}

function eventsForBooking(b: BookingItem): RawEvent[] {
  const out: RawEvent[] = [];

  switch (b.type) {
    case 'flight': {
      const startTime = b.timing.startTime ?? resolveApproxTime(b.timing.timeOfDay);
      const isApprox = !b.timing.startTime;

      const arrivesNextDay =
        (b.timing.dayOffset ?? 0) > 0 && b.timing.endDate
          ? `→ arriva il ${fmtShortDate(b.timing.endDate)}`
          : undefined;

      out.push({
        date: b.timing.startDate,
        event: {
          id: `${b.id}-dep`,
          time: startTime,
          isApprox,
          icon: '✈️',
          title: b.flight
            ? `${b.flight.origin} → ${b.flight.destination}`
            : b.title,
          subtitle: b.flight
            ? `${b.flight.airline} · ${b.flight.flightNumber}`
            : b.provider,
          duration: b.timing.duration,
          bookingId: b.id,
          bookingType: b.type,
          status: b.status,
          isFixed: true,
          arrivesNextDay,
        },
      });

      // Arrival event on its own day when dayOffset > 0
      if ((b.timing.dayOffset ?? 0) > 0 && b.timing.endDate && b.timing.endTime) {
        out.push({
          date: b.timing.endDate,
          event: {
            id: `${b.id}-arr`,
            time: b.timing.endTime,
            isApprox: false,
            icon: '✈️',
            title: b.flight
              ? `Arrivo ${b.flight.destinationName || b.flight.destination}`
              : b.title,
            subtitle: b.flight
              ? `${b.flight.airline} · ${b.flight.flightNumber}`
              : b.provider,
            bookingId: b.id,
            bookingType: b.type,
            status: b.status,
            isFixed: true,
          },
        });
      }
      break;
    }

    case 'hotel': {
      const nights = b.hotel?.nights ?? 1;
      const nightsLabel = `${nights} ${nights === 1 ? 'notte' : 'notti'}`;

      out.push({
        date: b.timing.startDate,
        event: {
          id: `${b.id}-checkin`,
          time: b.hotel?.checkinTime ?? '15:00',
          isApprox: false,
          icon: '🏨',
          title: `Check-in ${b.title}`,
          subtitle: nightsLabel,
          bookingId: b.id,
          bookingType: b.type,
          status: b.status,
          isFixed: true,
        },
      });

      if (b.timing.endDate) {
        out.push({
          date: b.timing.endDate,
          event: {
            id: `${b.id}-checkout`,
            time: b.hotel?.checkoutTime ?? '11:00',
            isApprox: false,
            icon: '🏨',
            title: `Check-out ${b.title}`,
            bookingId: b.id,
            bookingType: b.type,
            status: b.status,
            isFixed: true,
          },
        });
      }
      break;
    }

    case 'activity': {
      const startTime = b.timing.startTime ?? resolveApproxTime(b.timing.timeOfDay);
      const isApprox = !b.timing.startTime;
      const duration = b.activity?.durationMin
        ? fmtDuration(b.activity.durationMin)
        : b.timing.duration;

      out.push({
        date: b.timing.startDate,
        event: {
          id: b.id,
          time: startTime,
          isApprox,
          icon: '🎟️',
          title: b.title,
          subtitle: b.activity?.meetingPoint ?? b.provider,
          duration,
          bookingId: b.id,
          bookingType: b.type,
          status: b.status,
          isFixed: true,
        },
      });
      break;
    }

    case 'transfer': {
      const startTime = b.timing.startTime ?? resolveApproxTime(b.timing.timeOfDay);
      const isApprox = !b.timing.startTime;
      const duration = b.transfer?.durationMin
        ? fmtDuration(b.transfer.durationMin)
        : b.timing.duration;

      out.push({
        date: b.timing.startDate,
        event: {
          id: b.id,
          time: startTime,
          isApprox,
          icon: transferIcon(b.transfer?.mode),
          title: b.title,
          subtitle: b.transfer
            ? `${b.transfer.from} → ${b.transfer.to}`
            : b.provider,
          duration,
          bookingId: b.id,
          bookingType: b.type,
          status: b.status,
          isFixed: true,
        },
      });
      break;
    }

    case 'car': {
      out.push({
        date: b.timing.startDate,
        event: {
          id: `${b.id}-pickup`,
          time: b.car?.pickupTime ?? '10:00',
          isApprox: false,
          icon: '🚗',
          title: b.car?.company ? `Ritiro auto · ${b.car.company}` : 'Ritiro auto',
          subtitle: b.car?.pickupLocation ?? b.provider,
          bookingId: b.id,
          bookingType: b.type,
          status: b.status,
          isFixed: true,
        },
      });

      if (b.timing.endDate) {
        out.push({
          date: b.timing.endDate,
          event: {
            id: `${b.id}-return`,
            time: b.car?.returnTime ?? '10:00',
            isApprox: false,
            icon: '🚗',
            title: 'Riconsegna auto',
            subtitle: b.car?.returnLocation ?? b.provider,
            bookingId: b.id,
            bookingType: b.type,
            status: b.status,
            isFixed: true,
          },
        });
      }
      break;
    }

    // insurance and visa are trip-level coverages, not temporal events
    case 'insurance':
    case 'visa':
      break;
  }

  return out;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildTimeline(trip: Trip): TimelineDay[] {
  if (!trip.checkIn || !trip.checkOut) return [];

  const checkIn = new Date(trip.checkIn);
  const checkOut = new Date(trip.checkOut);
  const msPerDay = 86_400_000;
  const totalDays = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay) + 1);

  // Index: ISO date → events for that day
  const byDate = new Map<string, TimelineEvent[]>();
  for (let i = 0; i < totalDays; i++) {
    byDate.set(isoDate(new Date(checkIn.getTime() + i * msPerDay)), []);
  }

  for (const b of trip.bookings ?? []) {
    for (const { date, event } of eventsForBooking(b)) {
      byDate.get(date)?.push(event);
      // Events outside the trip window (e.g. return flight landing after checkOut) are silently dropped
    }
  }

  return Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(checkIn.getTime() + i * msPerDay);
    const dateStr = isoDate(d);
    const events = (byDate.get(dateStr) ?? []).sort((a, b) => {
      // Precise times before approximate; then chronological
      if (a.isApprox !== b.isApprox) return a.isApprox ? 1 : -1;
      return a.time.localeCompare(b.time);
    });

    return {
      dayNumber: i + 1,
      date: dateStr,
      dayLabel: `Giorno ${i + 1}`,
      dateLabel: fmtDayLabel(d),
      events,
    };
  });
}
