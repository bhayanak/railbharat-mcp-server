import { z } from 'zod';
import type { IrctcApiClient } from '../sources/irctc-api.js';
import type { IndianRailApiClient } from '../sources/indian-rail-api.js';
import type { Cache } from '../utils/cache.js';
import { formatTrainList } from '../utils/formatter.js';
import { type SourceAvailability, formatSourceHints } from '../config.js';

export const searchTrainsSchema = {
  fromStation: z.string().min(2).max(6).describe("Source station code (e.g., 'NDLS')"),
  toStation: z.string().min(2).max(6).describe("Destination station code (e.g., 'HWH')"),
  date: z.string().optional().describe('Travel date (DD-MM-YYYY)'),
  class: z
    .enum(['1A', '2A', '3A', 'SL', 'CC', 'EC', '2S', 'all'])
    .optional()
    .describe('Filter by travel class'),
};

export const trainInfoSchema = {
  trainNumber: z.string().min(4).max(6).describe("Train number (e.g., '12301')"),
};

export interface TrainSearchDeps {
  irctcApi: IrctcApiClient;
  indianRailApi: IndianRailApiClient;
  cache: Cache;
  availability: SourceAvailability;
}

export async function handleSearchTrains(
  args: { fromStation: string; toStation: string; date?: string; class?: string },
  deps: TrainSearchDeps
): Promise<string> {
  const from = args.fromStation.toUpperCase();
  const to = args.toStation.toUpperCase();
  const cacheKey = `search:${from}:${to}:${args.date ?? 'any'}:${args.class ?? 'all'}`;
  const cached = deps.cache.get<string>(cacheKey);
  if (cached) return cached;

  // Try IRCTC API
  if (deps.availability.irctcApi) {
    try {
      const data = await deps.irctcApi.searchTrains(from, to, args.date);
      if (data.status && data.data) {
        let trains = data.data;
        if (args.class && args.class !== 'all') {
          trains = trains.filter((t) => t.availableClasses?.includes(args.class!) ?? true);
        }
        const result = formatTrainList(
          trains.map((t) => ({
            trainNumber: t.trainNumber,
            trainName: t.trainName,
            from: t.stationFrom?.stationCode,
            to: t.stationTo?.stationCode,
            departure: t.departureTime,
            arrival: t.arrivalTime,
            duration: t.duration,
            classes: t.availableClasses,
            runDays: t.runDays,
          }))
        );
        deps.cache.set(cacheKey, result, 3_600_000); // 1hr for schedule data
        return `🔍 Trains from ${from} to ${to}\n\n${result}`;
      }
      if (data.message) return `⚠️ ${data.message}`;
    } catch {
      // Fall through
    }
  }

  // Try Indian Rail API
  if (deps.availability.indianRailApi) {
    try {
      const data = await deps.indianRailApi.getTrainsBetween(from, to, args.date);
      if (data.trains) {
        const result = formatTrainList(
          data.trains.map((t) => ({
            trainNumber: t.number,
            trainName: t.name,
            from: t.from?.code,
            to: t.to?.code,
            departure: t.departure,
            arrival: t.arrival,
            duration: t.duration,
            classes: t.classes,
            runDays: t.days,
          }))
        );
        deps.cache.set(cacheKey, result, 3_600_000);
        return `🔍 Trains from ${from} to ${to}\n\n${result}`;
      }
    } catch {
      // Fall through
    }
  }

  let msg = `❌ Unable to search trains from ${from} to ${to}.`;
  msg += formatSourceHints(deps.availability);
  return msg;
}

export async function handleTrainInfo(
  args: { trainNumber: string },
  deps: TrainSearchDeps
): Promise<string> {
  const cacheKey = `train-info:${args.trainNumber}`;
  const cached = deps.cache.get<string>(cacheKey);
  if (cached) return cached;

  if (deps.availability.irctcApi) {
    try {
      const data = await deps.irctcApi.getTrainInfo(args.trainNumber);
      if (data.status && data.data && data.data.length > 0) {
        const t = data.data[0];
        const lines = [
          `🚆 Train ${t.trainNumber} — ${t.trainName ?? 'Unknown'}`,
          `Type: ${t.trainType ?? '—'}`,
          `Route: ${t.stationFrom?.stationName ?? '—'} (${t.stationFrom?.stationCode ?? '—'}) → ${t.stationTo?.stationName ?? '—'} (${t.stationTo?.stationCode ?? '—'})`,
          `Departure: ${t.departureTime ?? '—'} | Arrival: ${t.arrivalTime ?? '—'}`,
          `Duration: ${t.duration ?? '—'} | Distance: ${t.distance ?? '—'} km`,
          `Classes: ${t.availableClasses?.join(', ') ?? '—'}`,
          `Runs on: ${t.runDays?.join(', ') ?? '—'}`,
        ];
        const result = lines.join('\n');
        deps.cache.set(cacheKey, result, 3_600_000);
        return result;
      }
      if (data.message) return `⚠️ ${data.message}`;
    } catch {
      // Fall through
    }
  }

  let msg = `❌ Unable to get info for train ${args.trainNumber}.`;
  msg += formatSourceHints(deps.availability);
  return msg;
}
