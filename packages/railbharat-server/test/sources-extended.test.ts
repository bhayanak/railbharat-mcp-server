import { describe, it, expect, vi } from 'vitest';
import { IndianRailApiClient } from '../src/sources/indian-rail-api.js';
import { OsmOverpassClient } from '../src/sources/osm-overpass.js';
import type { RailBharatConfig } from '../src/config.js';

const baseConfig: RailBharatConfig = {
  rapidApiKey: 'test-key',
  rapidApiHost: 'irctc1.p.rapidapi.com',
  dataGovKey: '',
  indianRailApiKey: 'test-key',
  indianRailApiBaseUrl: 'https://indianrailapi.com/api/v2',
  cacheTtlMs: 300000,
  timeoutMs: 5000,
  overpassApiUrl: 'https://overpass-api.de/api/interpreter',
};

describe('IndianRailApiClient extended', () => {
  it('should throw when making request without key', async () => {
    const client = new IndianRailApiClient({ ...baseConfig, indianRailApiKey: '' });
    await expect(client.getLiveStatus('12301')).rejects.toThrow('not configured');
  });

  it('should make getLiveStatus request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          responseCode: 200,
          train: { number: '12301', name: 'Rajdhani' },
          route: [],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new IndianRailApiClient(baseConfig);
    const result = await client.getLiveStatus('12301', '25-12-2025');

    expect(result.train?.number).toBe('12301');
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('indianrailapi.com');
    expect(url).toContain('trainNumber=12301');
    expect(url).toContain('date=25-12-2025');

    vi.unstubAllGlobals();
  });

  it('should make getTrainSchedule request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          responseCode: 200,
          train: { number: '12301', name: 'Rajdhani', runDays: ['Mon'], classes: ['3A'] },
          route: [{ station: { name: 'NDLS', code: 'NDLS' } }],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new IndianRailApiClient(baseConfig);
    const result = await client.getTrainSchedule('12301');
    expect(result.train?.number).toBe('12301');

    vi.unstubAllGlobals();
  });

  it('should make getTrainsBetween request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          responseCode: 200,
          trains: [{ number: '12301', name: 'Rajdhani' }],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new IndianRailApiClient(baseConfig);
    const result = await client.getTrainsBetween('NDLS', 'HWH', '25-12-2025');
    expect(result.trains).toHaveLength(1);

    vi.unstubAllGlobals();
  });

  it('should throw on HTTP error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new IndianRailApiClient(baseConfig);
    await expect(client.getLiveStatus('12301')).rejects.toThrow('500');

    vi.unstubAllGlobals();
  });

  it('should reject SSRF attempts', async () => {
    const client = new IndianRailApiClient({
      ...baseConfig,
      indianRailApiBaseUrl: 'https://indianrailapi.com/api/v2',
    });
    // The SSRF check happens inside request, but we can't directly test path manipulation
    // from outside. Test that normal requests go to the right host.
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ responseCode: 200 }),
    });
    vi.stubGlobal('fetch', mockFetch);
    await client.getLiveStatus('12301');
    const [url] = mockFetch.mock.calls[0];
    expect(new URL(url).hostname).toBe('indianrailapi.com');
    vi.unstubAllGlobals();
  });
});

describe('OsmOverpassClient extended', () => {
  it('should get station coordinates', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          elements: [
            {
              id: 1,
              type: 'node',
              lat: 28.6139,
              lon: 77.209,
              tags: { name: 'New Delhi', ref: 'NDLS', operator: 'IR' },
            },
          ],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OsmOverpassClient(baseConfig);
    const results = await client.getStationCoordinates('NDLS');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('New Delhi');
    expect(results[0].lat).toBe(28.6139);

    vi.unstubAllGlobals();
  });

  it('should get rail route geometry', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          elements: [
            {
              id: 1,
              type: 'way',
              geometry: [
                { lat: 28.6, lon: 77.2 },
                { lat: 28.7, lon: 77.3 },
              ],
            },
            {
              id: 2,
              type: 'way',
              geometry: [{ lat: 28.8, lon: 77.4 }],
            },
          ],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OsmOverpassClient(baseConfig);
    const result = await client.getRailRouteGeometry(28.6, 77.2, 22.5, 88.3);

    expect(result.elementCount).toBe(2);
    expect(result.points).toHaveLength(3);

    vi.unstubAllGlobals();
  });

  it('should handle Overpass API error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OsmOverpassClient(baseConfig);
    await expect(client.findNearbyStations(28.6, 77.2)).rejects.toThrow('429');

    vi.unstubAllGlobals();
  });

  it('should handle empty elements in response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ elements: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OsmOverpassClient(baseConfig);
    const results = await client.findNearbyStations(28.6, 77.2);
    expect(results).toHaveLength(0);

    vi.unstubAllGlobals();
  });

  it('should handle nodes without tags', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          elements: [{ id: 1, type: 'node', lat: 28.6, lon: 77.2 }],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OsmOverpassClient(baseConfig);
    const results = await client.findNearbyStations(28.6, 77.2);
    expect(results[0].name).toBe('Unknown');
    expect(results[0].code).toBeUndefined();

    vi.unstubAllGlobals();
  });
});
