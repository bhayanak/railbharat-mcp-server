import { z } from 'zod';
import type { OsmOverpassClient } from '../sources/osm-overpass.js';
import type { Cache } from '../utils/cache.js';
import { formatNearbyStations } from '../utils/formatter.js';
import { resolveStationCode } from '../utils/station-codes.js';

export const nearbyStationsSchema = {
  lat: z.number().min(-90).max(90).describe('Latitude'),
  lon: z.number().min(-180).max(180).describe('Longitude'),
  radiusKm: z.number().optional().default(10).describe('Search radius in kilometers'),
};

export const routeMapSchema = {
  trainNumber: z.string().optional().describe('Train number (to get route from schedule)'),
  fromStation: z.string().optional().describe("Source station code (e.g., 'NDLS')"),
  toStation: z.string().optional().describe("Destination station code (e.g., 'HWH')"),
};

export interface GeospatialDeps {
  osmClient: OsmOverpassClient;
  cache: Cache;
}

export async function handleNearbyStations(
  args: { lat: number; lon: number; radiusKm: number },
  deps: GeospatialDeps
): Promise<string> {
  const cacheKey = `nearby:${args.lat.toFixed(3)}:${args.lon.toFixed(3)}:${args.radiusKm}`;
  const cached = deps.cache.get<string>(cacheKey);
  if (cached) return cached;

  try {
    const stations = await deps.osmClient.findNearbyStations(
      args.lat,
      args.lon,
      args.radiusKm * 1000
    );

    stations.sort((a, b) => a.distance - b.distance);

    const result = formatNearbyStations(
      stations.map((s) => ({
        name: s.name,
        code: s.code,
        distance: s.distance,
        lat: s.lat,
        lon: s.lon,
      }))
    );

    deps.cache.set(cacheKey, result, 86_400_000); // 24hr — stations don't move
    return result;
  } catch (e) {
    return `❌ Error finding nearby stations: ${e instanceof Error ? e.message : 'Unknown error'}`;
  }
}

export async function handleRouteMap(
  args: { trainNumber?: string; fromStation?: string; toStation?: string },
  deps: GeospatialDeps
): Promise<string> {
  if (!args.fromStation && !args.toStation && !args.trainNumber) {
    return '⚠️ Please provide at least fromStation+toStation, or a trainNumber.';
  }

  // If station codes provided, try to get coordinates from OSM
  if (args.fromStation && args.toStation) {
    const fromCode = resolveStationCode(args.fromStation)?.code ?? args.fromStation;
    const toCode = resolveStationCode(args.toStation)?.code ?? args.toStation;
    const cacheKey = `route-map:${fromCode}:${toCode}`;
    const cached = deps.cache.get<string>(cacheKey);
    if (cached) return cached;

    try {
      // Get coordinates for both stations
      const [fromStations, toStations] = await Promise.all([
        deps.osmClient.getStationCoordinates(fromCode),
        deps.osmClient.getStationCoordinates(toCode),
      ]);

      if (fromStations.length === 0) {
        return `⚠️ Could not find coordinates for station "${args.fromStation}" in OpenStreetMap.`;
      }
      if (toStations.length === 0) {
        return `⚠️ Could not find coordinates for station "${args.toStation}" in OpenStreetMap.`;
      }

      const from = fromStations[0];
      const to = toStations[0];

      const route = await deps.osmClient.getRailRouteGeometry(from.lat, from.lon, to.lat, to.lon);

      const lines: string[] = [];
      lines.push(`🗺️ Route Map: ${fromCode} → ${toCode}`);
      lines.push(`From: ${from.name} (${from.lat.toFixed(4)}, ${from.lon.toFixed(4)})`);
      lines.push(`To: ${to.name} (${to.lat.toFixed(4)}, ${to.lon.toFixed(4)})`);
      lines.push(`Rail segments found: ${route.elementCount}`);
      lines.push(`Total waypoints: ${route.points.length}`);
      lines.push('');

      if (route.points.length > 0) {
        lines.push('Sample waypoints (first 10):');
        for (const pt of route.points.slice(0, 10)) {
          lines.push(`  (${pt.lat.toFixed(4)}, ${pt.lon.toFixed(4)})`);
        }
        if (route.points.length > 10) {
          lines.push(`  ... and ${route.points.length - 10} more`);
        }
      }

      const result = lines.join('\n');
      deps.cache.set(cacheKey, result, 86_400_000);
      return result;
    } catch (e) {
      return `❌ Error fetching route map: ${e instanceof Error ? e.message : 'Unknown error'}`;
    }
  }

  if (args.trainNumber) {
    return (
      `🗺️ Route Map for Train ${args.trainNumber}\n\n` +
      `💡 To get the geographic route, first use rail_train_route to get the stop list, ` +
      `then use this tool with fromStation and toStation for the route geometry.`
    );
  }

  return '⚠️ Please provide fromStation and toStation for route geometry.';
}
