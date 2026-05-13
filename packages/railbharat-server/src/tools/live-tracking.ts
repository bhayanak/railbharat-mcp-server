import { z } from 'zod';
import type { IrctcApiClient } from '../sources/irctc-api.js';
import type { IndianRailApiClient } from '../sources/indian-rail-api.js';
import type { Cache } from '../utils/cache.js';
import { formatTrainStatus } from '../utils/formatter.js';
import { type SourceAvailability, formatSourceHints } from '../config.js';

export const liveStatusSchema = {
  trainNumber: z.string().min(4).max(6).describe("Train number (e.g., '12301')"),
  date: z.string().optional().describe('Journey date (DD-MM-YYYY, defaults to today)'),
};

export const trainPositionSchema = {
  trainNumber: z.string().min(4).max(6).describe("Train number (e.g., '12301')"),
  date: z.string().optional().describe('Journey date (DD-MM-YYYY)'),
};

export const delayHistorySchema = {
  trainNumber: z.string().min(4).max(6).describe("Train number (e.g., '12301')"),
  days: z.number().optional().default(7).describe('Past N days to check'),
};

export interface LiveTrackingDeps {
  irctcApi: IrctcApiClient;
  indianRailApi: IndianRailApiClient;
  cache: Cache;
  availability: SourceAvailability;
}

export async function handleLiveStatus(
  args: { trainNumber: string; date?: string },
  deps: LiveTrackingDeps
): Promise<string> {
  const cacheKey = `live-status:${args.trainNumber}:${args.date ?? 'today'}`;
  const cached = deps.cache.get<string>(cacheKey);
  if (cached) return cached;

  // Try IRCTC API first
  if (deps.availability.irctcApi) {
    try {
      const data = await deps.irctcApi.getLiveStatus(args.trainNumber, args.date);
      if (data.status && data.data) {
        const result = formatTrainStatus({
          trainNumber: data.data.trainNumber,
          trainName: data.data.trainName,
          currentStation: data.data.currentStation?.stationName,
          delay: data.data.delay,
          lastUpdate: data.data.lastUpdated,
          stations: data.data.trainStatusList?.map((s) => ({
            stationName: s.stationName ?? '',
            stationCode: s.stationCode ?? '',
            scheduledArrival: s.scheduledArrival,
            actualArrival: s.actualArrival,
            scheduledDeparture: s.scheduledDeparture,
            actualDeparture: s.actualDeparture,
            delay: s.delayInArrival ?? s.delayInDeparture,
            platform: s.platform,
            isCurrent: s.isCurrentStation,
            isPassed: s.isPassed,
          })),
        });
        deps.cache.set(cacheKey, result, 120_000); // 2min for live data
        return result;
      }
      if (data.message) return `⚠️ ${data.message}`;
    } catch {
      // Fall through to next source
    }
  }

  // Try Indian Rail API as fallback
  if (deps.availability.indianRailApi) {
    try {
      const data = await deps.indianRailApi.getLiveStatus(args.trainNumber, args.date);
      if (data.train) {
        const result = formatTrainStatus({
          trainNumber: data.train.number,
          trainName: data.train.name,
          currentStation: data.currentStation?.name,
          stations: data.route?.map((s) => ({
            stationName: s.station?.name ?? '',
            stationCode: s.station?.code ?? '',
            scheduledArrival: s.scheduledArrival,
            actualArrival: s.actualArrival,
            scheduledDeparture: s.scheduledDeparture,
            actualDeparture: s.actualDeparture,
            delay: s.delay,
            platform: s.platform,
            isCurrent: s.isCurrent,
            isPassed: s.hasArrived,
          })),
        });
        deps.cache.set(cacheKey, result, 120_000);
        return result;
      }
    } catch {
      // Fall through
    }
  }

  let msg = `❌ Unable to fetch live status for train ${args.trainNumber}.`;
  msg += formatSourceHints(deps.availability);
  return msg;
}

export async function handleTrainPosition(
  args: { trainNumber: string; date?: string },
  deps: LiveTrackingDeps
): Promise<string> {
  // Train position is derived from live status + OSM geolocation
  if (deps.availability.irctcApi) {
    try {
      const data = await deps.irctcApi.getLiveStatus(args.trainNumber, args.date);
      if (data.status && data.data?.currentStation) {
        const station = data.data.currentStation;
        const delay = data.data.delay ?? 0;
        return (
          `📍 Train ${args.trainNumber} — ${data.data.trainName ?? 'Unknown'}\n` +
          `Currently near: ${station.stationName} (${station.stationCode})\n` +
          `Delay: ${delay > 0 ? `+${delay} min` : 'On Time'}\n` +
          `Last Update: ${data.data.lastUpdated ?? 'N/A'}\n\n` +
          `💡 Use rail_nearby_stations with station coordinates to find the geographic position.`
        );
      }
    } catch {
      // Fall through
    }
  }

  let msg = `❌ Unable to get position for train ${args.trainNumber}.`;
  msg += formatSourceHints(deps.availability);
  return msg;
}

export async function handleDelayHistory(
  args: { trainNumber: string; days: number },
  deps: LiveTrackingDeps
): Promise<string> {
  // Delay history aggregated from available data
  const lines: string[] = [];
  lines.push(`📊 Delay History: Train ${args.trainNumber} (last ${args.days} days)`);
  lines.push('');

  if (!deps.availability.irctcApi && !deps.availability.indianRailApi) {
    lines.push('⚠️ No live tracking API configured. Cannot retrieve delay history.');
    lines.push(formatSourceHints(deps.availability));
    return lines.join('\n');
  }

  lines.push(
    'Note: Detailed historical delay data requires collecting over time. ' +
      'Current snapshot shows latest available delay information.'
  );
  lines.push('');

  // Get current status as a starting point
  if (deps.availability.irctcApi) {
    try {
      const data = await deps.irctcApi.getLiveStatus(args.trainNumber);
      if (data.data?.delay !== undefined) {
        lines.push(`Current delay: ${data.data.delay > 0 ? `+${data.data.delay} min` : 'On Time'}`);
        lines.push(`Train: ${data.data.trainName ?? 'Unknown'}`);
      }
    } catch {
      lines.push('Unable to fetch current delay data.');
    }
  }

  lines.push('');
  lines.push(
    '💡 Tip: For comprehensive delay analytics, consider running periodic checks ' +
      'and building a local dataset.'
  );

  return lines.join('\n');
}
