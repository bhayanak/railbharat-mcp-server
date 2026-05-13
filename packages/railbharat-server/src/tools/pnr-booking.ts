import { z } from 'zod';
import type { IrctcApiClient } from '../sources/irctc-api.js';
import type { Cache } from '../utils/cache.js';
import { formatPnrStatus, formatSeatAvailability } from '../utils/formatter.js';
import { type SourceAvailability } from '../config.js';

export const pnrStatusSchema = {
  pnr: z
    .string()
    .length(10)
    .regex(/^\d{10}$/)
    .describe('10-digit PNR number'),
};

export const seatAvailabilitySchema = {
  trainNumber: z.string().min(4).max(6).describe("Train number (e.g., '12301')"),
  fromStation: z.string().min(2).max(6).describe("Source station code (e.g., 'NDLS')"),
  toStation: z.string().min(2).max(6).describe("Destination station code (e.g., 'HWH')"),
  date: z.string().describe('Journey date (DD-MM-YYYY)'),
  class: z
    .enum(['1A', '2A', '3A', 'SL', 'CC', 'EC', '2S', 'GN'])
    .optional()
    .describe('Travel class'),
  quota: z.enum(['GN', 'TQ', 'LD', 'PT', 'HP']).optional().default('GN').describe('Booking quota'),
};

export interface PnrBookingDeps {
  irctcApi: IrctcApiClient;
  cache: Cache;
  availability: SourceAvailability;
}

export async function handlePnrStatus(
  args: { pnr: string },
  deps: PnrBookingDeps
): Promise<string> {
  // PNR status changes frequently, use short cache
  const cacheKey = `pnr:${args.pnr}`;
  const cached = deps.cache.get<string>(cacheKey);
  if (cached) return cached;

  if (!deps.availability.irctcApi) {
    return (
      '❌ PNR status check requires IRCTC API.\n' +
      'Set RAILBHARAT_MCP_RAPIDAPI_KEY with your RapidAPI key to enable this feature.'
    );
  }

  try {
    const data = await deps.irctcApi.getPnrStatus(args.pnr);
    if (data.status && data.data) {
      const result = formatPnrStatus({
        pnr: data.data.pnrNumber ?? args.pnr,
        trainNumber: data.data.trainNumber,
        trainName: data.data.trainName,
        from: data.data.sourceStation,
        to: data.data.destinationStation,
        date: data.data.dateOfJourney,
        boardingPoint: data.data.boardingPoint,
        reservationUpTo: data.data.reservationUpto,
        classCode: data.data.classType,
        passengers: data.data.passengerList?.map((p) => ({
          number: p.passengerSerialNumber ?? 0,
          bookingStatus: p.bookingStatusDetails,
          currentStatus: p.currentStatusDetails,
          coachPosition: p.coachPosition,
        })),
      });
      deps.cache.set(cacheKey, result, 60_000); // 1min cache for PNR
      return result;
    }
    return `⚠️ ${data.message ?? 'Unable to fetch PNR status. Please verify the PNR number.'}`;
  } catch (e) {
    return `❌ Error checking PNR status: ${e instanceof Error ? e.message : 'Unknown error'}`;
  }
}

export async function handleSeatAvailability(
  args: {
    trainNumber: string;
    fromStation: string;
    toStation: string;
    date: string;
    class?: string;
    quota: string;
  },
  deps: PnrBookingDeps
): Promise<string> {
  const cacheKey = `seat:${args.trainNumber}:${args.fromStation}:${args.toStation}:${args.date}:${args.class ?? 'all'}:${args.quota}`;
  const cached = deps.cache.get<string>(cacheKey);
  if (cached) return cached;

  if (!deps.availability.irctcApi) {
    return (
      '❌ Seat availability check requires IRCTC API.\n' +
      'Set RAILBHARAT_MCP_RAPIDAPI_KEY with your RapidAPI key to enable this feature.'
    );
  }

  try {
    const data = await deps.irctcApi.checkSeatAvailability(
      args.trainNumber,
      args.fromStation.toUpperCase(),
      args.toStation.toUpperCase(),
      args.date,
      args.class,
      args.quota
    );
    if (data.status && data.data) {
      const result = formatSeatAvailability({
        trainNumber: args.trainNumber,
        from: args.fromStation,
        to: args.toStation,
        date: args.date,
        classCode: args.class,
        availability: data.data.map((a) => ({
          date: a.date ?? '—',
          status: a.currentStatus ?? a.availabilityStatus ?? '—',
        })),
      });
      deps.cache.set(cacheKey, result, 300_000); // 5min cache
      return result;
    }
    return `⚠️ ${data.message ?? 'Unable to check seat availability.'}`;
  } catch (e) {
    return `❌ Error checking availability: ${e instanceof Error ? e.message : 'Unknown error'}`;
  }
}
