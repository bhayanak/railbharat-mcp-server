import { z } from 'zod';
import type { IrctcApiClient } from '../sources/irctc-api.js';
import type { Cache } from '../utils/cache.js';
import { type SourceAvailability } from '../config.js';
import {
  searchStations,
  resolveStationCode,
  formatStationDisplay,
  type StationEntry,
} from '../utils/station-codes.js';

export const stationInfoSchema = {
  station: z.string().min(2).max(50).describe("Station code or name (e.g., 'NDLS' or 'New Delhi')"),
};

export const stationBoardSchema = {
  station: z.string().min(2).max(10).describe("Station code (e.g., 'NDLS')"),
  type: z
    .enum(['arrivals', 'departures', 'both'])
    .optional()
    .default('both')
    .describe('Board type'),
  hours: z.number().optional().default(4).describe('Time window in hours'),
};

export const searchStationsSchema = {
  query: z.string().min(2).max(50).describe('Station name or partial code to search'),
};

export interface StationDeps {
  irctcApi: IrctcApiClient;
  cache: Cache;
  availability: SourceAvailability;
}

export async function handleStationInfo(
  args: { station: string },
  deps: StationDeps
): Promise<string> {
  const cacheKey = `station-info:${args.station}`;
  const cached = deps.cache.get<string>(cacheKey);
  if (cached) return cached;

  // Try built-in station resolver first
  const local = resolveStationCode(args.station);
  const lines: string[] = [];

  if (local) {
    lines.push(`🏗️ Station: ${formatStationDisplay(local)}`);
    if (local.zone) lines.push(`Zone: ${local.zone}`);
    if (local.state) lines.push(`State: ${local.state}`);
    lines.push('');
  }

  // Enhance with API data if available
  if (deps.availability.irctcApi) {
    try {
      const query = local?.code ?? args.station;
      const data = await deps.irctcApi.searchStation(query);
      if (data.status && data.data && data.data.length > 0) {
        if (!local) {
          const s = data.data[0];
          lines.push(`🏗️ Station: ${s.stationName ?? '—'} (${s.stationCode ?? '—'})`);
        }
        if (data.data.length > 1) {
          lines.push('');
          lines.push('Related stations:');
          for (const s of data.data.slice(0, 5)) {
            lines.push(`  • ${s.stationName ?? '—'} (${s.stationCode ?? '—'})`);
          }
        }
      }
    } catch {
      // Use local data only
    }
  }

  if (lines.length === 0) {
    return `⚠️ Station "${args.station}" not found. Try searching with rail_search_stations.`;
  }

  lines.push('');
  lines.push('💡 Use rail_station_board to see arrivals/departures.');

  const result = lines.join('\n');
  deps.cache.set(cacheKey, result, 3_600_000);
  return result;
}

export async function handleStationBoard(
  args: { station: string; type: string; hours: number },
  deps: StationDeps
): Promise<string> {
  if (!deps.availability.irctcApi) {
    return (
      '❌ Station board requires IRCTC API.\n' +
      'Set RAILBHARAT_MCP_RAPIDAPI_KEY with your RapidAPI key to enable this feature.\n\n' +
      '💡 In the meantime, you can use rail_station_info for basic station details.'
    );
  }

  const stationCode = resolveStationCode(args.station)?.code ?? args.station.toUpperCase();

  return (
    `🏗️ Station Board: ${stationCode}\n` +
    `Type: ${args.type} | Window: ${args.hours}h\n\n` +
    `⚠️ Station board data requires a specialized API endpoint. ` +
    `The live board shows real-time arrivals and departures.\n\n` +
    `💡 Try these alternatives:\n` +
    `  • rail_search_trains — find trains from/to this station\n` +
    `  • rail_live_status — check a specific train's status\n` +
    `  • rail_station_info — get station details`
  );
}

export async function handleSearchStations(
  args: { query: string },
  deps: StationDeps
): Promise<string> {
  const cacheKey = `search-stations:${args.query}`;
  const cached = deps.cache.get<string>(cacheKey);
  if (cached) return cached;

  const results: StationEntry[] = [];

  // Built-in search first (always available)
  const localResults = searchStations(args.query);
  results.push(...localResults);

  // Enhance with API results if available
  if (deps.availability.irctcApi) {
    try {
      const data = await deps.irctcApi.searchStation(args.query);
      if (data.status && data.data) {
        for (const s of data.data) {
          if (s.stationCode && !results.find((r) => r.code === s.stationCode)) {
            results.push({
              code: s.stationCode,
              name: s.stationName ?? s.stationCode,
            });
          }
        }
      }
    } catch {
      // Use local results only
    }
  }

  if (results.length === 0) {
    return `⚠️ No stations found matching "${args.query}". Try a different search term.`;
  }

  const lines = [`🔍 Station Search: "${args.query}" (${results.length} results)`, ''];
  for (const s of results.slice(0, 20)) {
    lines.push(`  • ${formatStationDisplay(s)}`);
  }
  if (results.length > 20) {
    lines.push(`  ... and ${results.length - 20} more`);
  }

  const result = lines.join('\n');
  deps.cache.set(cacheKey, result, 3_600_000);
  return result;
}
