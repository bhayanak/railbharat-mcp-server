import { z } from 'zod';
import type { DataGovClient } from '../sources/data-gov.js';
import type { Cache } from '../utils/cache.js';
import { type SourceAvailability } from '../config.js';

export const punctualityStatsSchema = {
  trainNumber: z.string().optional().describe('Train number (optional, for specific train)'),
  station: z.string().optional().describe('Station code (optional, for specific station)'),
  period: z
    .enum(['month', 'quarter', 'year'])
    .optional()
    .default('month')
    .describe('Time period for statistics'),
};

export const busiestRoutesSchema = {
  limit: z.number().optional().default(10).describe('Number of routes to return'),
};

export interface HistoricalDeps {
  dataGovApi: DataGovClient;
  cache: Cache;
  availability: SourceAvailability;
}

export async function handlePunctualityStats(
  args: { trainNumber?: string; station?: string; period: string },
  deps: HistoricalDeps
): Promise<string> {
  const cacheKey = `punctuality:${args.trainNumber ?? 'all'}:${args.station ?? 'all'}:${args.period}`;
  const cached = deps.cache.get<string>(cacheKey);
  if (cached) return cached;

  const lines: string[] = [];
  lines.push(`📊 Punctuality Statistics (${args.period})`);
  if (args.trainNumber) lines.push(`Train: ${args.trainNumber}`);
  if (args.station) lines.push(`Station: ${args.station}`);
  lines.push('');

  try {
    const data = await deps.dataGovApi.getTrainPunctuality(50);
    if (data.records && data.records.length > 0) {
      lines.push(`Total records: ${data.total ?? data.records.length}`);
      lines.push('');

      // Show available fields
      if (data.fields) {
        lines.push('Available metrics:');
        for (const field of data.fields.slice(0, 10)) {
          lines.push(`  • ${field.name} (${field.type})`);
        }
        lines.push('');
      }

      // Show sample records
      lines.push('Sample data:');
      for (const record of data.records.slice(0, 5)) {
        const entries = Object.entries(record)
          .slice(0, 5)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        lines.push(`  ${entries}`);
      }
    } else {
      lines.push(
        '⚠️ No punctuality data available from data.gov.in at this time.\n' +
          'The government open data portal may have limited real-time statistics.\n\n' +
          '💡 For live delay info, use rail_live_status with a specific train number.'
      );
    }
  } catch (e) {
    lines.push(
      `⚠️ Unable to fetch punctuality data: ${e instanceof Error ? e.message : 'Unknown error'}\n\n` +
        '💡 Try rail_live_status for real-time delay information.'
    );
  }

  const result = lines.join('\n');
  deps.cache.set(cacheKey, result, 3_600_000);
  return result;
}

export async function handleBusiestRoutes(
  args: { limit: number },
  deps: HistoricalDeps
): Promise<string> {
  const cacheKey = `busiest-routes:${args.limit}`;
  const cached = deps.cache.get<string>(cacheKey);
  if (cached) return cached;

  const lines: string[] = [];
  lines.push(`🚉 Busiest Rail Routes (Top ${args.limit})`);
  lines.push('');

  try {
    const data = await deps.dataGovApi.getBusiestRoutes(args.limit);
    if (data.records && data.records.length > 0) {
      for (let i = 0; i < Math.min(data.records.length, args.limit); i++) {
        const record = data.records[i];
        const entries = Object.entries(record)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        lines.push(`${i + 1}. ${entries}`);
      }
    } else {
      lines.push(
        '⚠️ Busiest routes data not currently available from data.gov.in.\n\n' +
          '📋 Well-known busy routes include:\n' +
          '  1. Delhi — Mumbai (Rajdhani corridor)\n' +
          '  2. Delhi — Kolkata (Howrah Rajdhani)\n' +
          '  3. Delhi — Chennai (Grand Trunk route)\n' +
          '  4. Mumbai — Chennai (Konkan/coastal)\n' +
          '  5. Delhi — Jaipur (high frequency)\n' +
          '  6. Mumbai — Pune (Deccan corridor)\n' +
          '  7. Kolkata — Patna (Eastern corridor)\n' +
          '  8. Chennai — Bengaluru (South corridor)\n' +
          '  9. Delhi — Lucknow (UP corridor)\n' +
          '  10. Mumbai — Ahmedabad (Western corridor)'
      );
    }
  } catch {
    lines.push(
      '⚠️ Unable to fetch route data. Showing well-known busy routes:\n\n' +
        '  1. Delhi — Mumbai (Rajdhani corridor)\n' +
        '  2. Delhi — Kolkata (Howrah Rajdhani)\n' +
        '  3. Delhi — Chennai (Grand Trunk route)\n' +
        '  4. Mumbai — Chennai (Konkan/coastal)\n' +
        '  5. Delhi — Jaipur (high frequency)\n' +
        '  6. Mumbai — Pune (Deccan corridor)\n' +
        '  7. Kolkata — Patna (Eastern corridor)\n' +
        '  8. Chennai — Bengaluru (South corridor)\n' +
        '  9. Delhi — Lucknow (UP corridor)\n' +
        '  10. Mumbai — Ahmedabad (Western corridor)'
    );
  }

  const result = lines.join('\n');
  deps.cache.set(cacheKey, result, 86_400_000); // 24hr cache
  return result;
}
