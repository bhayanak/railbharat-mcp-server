import type { RailBharatConfig } from '../config.js';

/**
 * OpenStreetMap Overpass API client for geospatial railway data.
 * Free, no API key required. Provides station coordinates and rail network geometry.
 */
export class OsmOverpassClient {
  private readonly apiUrl: string;
  private readonly timeoutMs: number;

  constructor(config: RailBharatConfig) {
    this.apiUrl = config.overpassApiUrl;
    this.timeoutMs = config.timeoutMs;
  }

  get isAvailable(): boolean {
    return true; // Always available — free public API
  }

  private async query<T>(overpassQuery: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async findNearbyStations(
    lat: number,
    lon: number,
    radiusMeters: number = 10000
  ): Promise<OverpassStationResult[]> {
    const overpassQuery = `
      [out:json][timeout:30];
      (
        node["railway"="station"](around:${radiusMeters},${lat},${lon});
        node["railway"="halt"](around:${radiusMeters},${lat},${lon});
      );
      out body;
    `;

    const result = await this.query<OverpassResponse>(overpassQuery);
    return (result.elements || []).map((el) => ({
      id: el.id,
      name: el.tags?.name ?? 'Unknown',
      code: el.tags?.['ref:indian_railways'] ?? el.tags?.ref ?? undefined,
      lat: el.lat ?? 0,
      lon: el.lon ?? 0,
      distance: haversineDistance(lat, lon, el.lat ?? 0, el.lon ?? 0),
      operator: el.tags?.operator ?? undefined,
      network: el.tags?.network ?? undefined,
    }));
  }

  async getStationCoordinates(stationName: string): Promise<OverpassStationResult[]> {
    const overpassQuery = `
      [out:json][timeout:30];
      (
        node["railway"="station"]["name"~"${escapeOverpassString(stationName)}",i];
        node["railway"="station"]["ref:indian_railways"="${escapeOverpassString(stationName)}"];
      );
      out body;
    `;

    const result = await this.query<OverpassResponse>(overpassQuery);
    return (result.elements || []).map((el) => ({
      id: el.id,
      name: el.tags?.name ?? 'Unknown',
      code: el.tags?.['ref:indian_railways'] ?? el.tags?.ref ?? undefined,
      lat: el.lat ?? 0,
      lon: el.lon ?? 0,
      distance: 0,
      operator: el.tags?.operator ?? undefined,
      network: el.tags?.network ?? undefined,
    }));
  }

  async getRailRouteGeometry(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number
  ): Promise<OverpassRouteResult> {
    // Build bounding box with some padding
    const minLat = Math.min(fromLat, toLat) - 0.5;
    const maxLat = Math.max(fromLat, toLat) + 0.5;
    const minLon = Math.min(fromLon, toLon) - 0.5;
    const maxLon = Math.max(fromLon, toLon) + 0.5;

    const overpassQuery = `
      [out:json][timeout:60];
      (
        way["railway"="rail"](${minLat},${minLon},${maxLat},${maxLon});
      );
      out geom;
    `;

    const result = await this.query<OverpassResponse>(overpassQuery);
    const points: Array<{ lat: number; lon: number }> = [];

    for (const el of result.elements || []) {
      if (el.geometry) {
        for (const pt of el.geometry) {
          points.push({ lat: pt.lat, lon: pt.lon });
        }
      }
    }

    return { points, elementCount: result.elements?.length ?? 0 };
  }
}

function escapeOverpassString(str: string): string {
  return str.replace(/[\\'"]/g, '\\$&');
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface OverpassResponse {
  elements?: Array<{
    id: number;
    type: string;
    lat?: number;
    lon?: number;
    tags?: Record<string, string>;
    geometry?: Array<{ lat: number; lon: number }>;
  }>;
}

export interface OverpassStationResult {
  id: number;
  name: string;
  code?: string;
  lat: number;
  lon: number;
  distance: number;
  operator?: string;
  network?: string;
}

export interface OverpassRouteResult {
  points: Array<{ lat: number; lon: number }>;
  elementCount: number;
}
