import { z } from 'zod';
import type { IrctcApiClient } from '../sources/irctc-api.js';
import type { IndianRailApiClient } from '../sources/indian-rail-api.js';
import type { Cache } from '../utils/cache.js';
import { formatTrainSchedule, formatFare } from '../utils/formatter.js';
import { type SourceAvailability, formatSourceHints } from '../config.js';

export const trainRouteSchema = {
  trainNumber: z.string().min(4).max(6).describe("Train number (e.g., '12301')"),
};

export const fareEnquirySchema = {
  trainNumber: z.string().min(4).max(6).describe("Train number (e.g., '12301')"),
  fromStation: z.string().min(2).max(6).describe("Source station code (e.g., 'NDLS')"),
  toStation: z.string().min(2).max(6).describe("Destination station code (e.g., 'HWH')"),
  class: z.enum(['1A', '2A', '3A', 'SL', 'CC', 'EC', '2S']).describe('Travel class'),
};

export interface RouteScheduleDeps {
  irctcApi: IrctcApiClient;
  indianRailApi: IndianRailApiClient;
  cache: Cache;
  availability: SourceAvailability;
}

export async function handleTrainRoute(
  args: { trainNumber: string },
  deps: RouteScheduleDeps
): Promise<string> {
  const cacheKey = `route:${args.trainNumber}`;
  const cached = deps.cache.get<string>(cacheKey);
  if (cached) return cached;

  // Try IRCTC API
  if (deps.availability.irctcApi) {
    try {
      const data = await deps.irctcApi.getTrainSchedule(args.trainNumber);
      if (data.status && data.data) {
        const result = formatTrainSchedule({
          trainNumber: data.data.trainNumber,
          trainName: data.data.trainName,
          runDays: data.data.runDays,
          classes: data.data.availableClasses,
          stops: data.data.stationList?.map((s) => ({
            stationName: s.stationName ?? '',
            stationCode: s.stationCode ?? '',
            arrival: s.arrivalTime,
            departure: s.departureTime,
            haltMinutes:
              typeof s.haltTime === 'number' ? s.haltTime : parseInt(String(s.haltTime ?? '0'), 10),
            distance: s.distance,
            day: s.dayCount,
            platform: s.platform,
          })),
        });
        deps.cache.set(cacheKey, result, 3_600_000); // 1hr
        return result;
      }
      if (data.message) return `⚠️ ${data.message}`;
    } catch {
      // Fall through
    }
  }

  // Try Indian Rail API
  if (deps.availability.indianRailApi) {
    try {
      const data = await deps.indianRailApi.getTrainSchedule(args.trainNumber);
      if (data.train) {
        const result = formatTrainSchedule({
          trainNumber: data.train.number,
          trainName: data.train.name,
          runDays: data.train.runDays,
          classes: data.train.classes,
          stops: data.route?.map((s) => ({
            stationName: s.station?.name ?? '',
            stationCode: s.station?.code ?? '',
            arrival: s.arrivalTime,
            departure: s.departureTime,
            haltMinutes: s.haltTime,
            distance: s.distance,
            day: s.day,
          })),
        });
        deps.cache.set(cacheKey, result, 3_600_000);
        return result;
      }
    } catch {
      // Fall through
    }
  }

  let msg = `❌ Unable to get route for train ${args.trainNumber}.`;
  msg += formatSourceHints(deps.availability);
  return msg;
}

export async function handleFareEnquiry(
  args: { trainNumber: string; fromStation: string; toStation: string; class: string },
  deps: RouteScheduleDeps
): Promise<string> {
  const from = args.fromStation.toUpperCase();
  const to = args.toStation.toUpperCase();
  const cacheKey = `fare:${args.trainNumber}:${from}:${to}:${args.class}`;
  const cached = deps.cache.get<string>(cacheKey);
  if (cached) return cached;

  if (!deps.availability.irctcApi) {
    return (
      '❌ Fare enquiry requires IRCTC API.\n' +
      'Set RAILBHARAT_MCP_RAPIDAPI_KEY with your RapidAPI key to enable this feature.'
    );
  }

  try {
    const data = await deps.irctcApi.getFare(args.trainNumber, from, to);
    if (data.status && data.data) {
      const fares = data.data.general?.filter((f) => f.classType === args.class || !args.class);
      const result = formatFare({
        trainNumber: data.data.trainNumber,
        trainName: data.data.trainName,
        from,
        to,
        fares: fares?.map((f) => ({
          classCode: f.classType ?? '—',
          fare: f.fare ?? 0,
        })),
      });
      deps.cache.set(cacheKey, result, 3_600_000);
      return result;
    }
    return `⚠️ ${data.message ?? 'Unable to fetch fare information.'}`;
  } catch (e) {
    return `❌ Error fetching fare: ${e instanceof Error ? e.message : 'Unknown error'}`;
  }
}
