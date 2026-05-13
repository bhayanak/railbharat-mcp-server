import { describe, it, expect, vi } from 'vitest';
import { IrctcApiClient } from '../src/sources/irctc-api.js';
import { IndianRailApiClient } from '../src/sources/indian-rail-api.js';
import { OsmOverpassClient } from '../src/sources/osm-overpass.js';
import { DataGovClient } from '../src/sources/data-gov.js';
import type { RailBharatConfig } from '../src/config.js';

const baseConfig: RailBharatConfig = {
  rapidApiKey: 'test-key',
  rapidApiHost: 'irctc1.p.rapidapi.com',
  dataGovKey: 'test-key',
  indianRailApiKey: 'test-key',
  indianRailApiBaseUrl: 'https://indianrailapi.com/api/v2',
  cacheTtlMs: 300000,
  timeoutMs: 5000,
  overpassApiUrl: 'https://overpass-api.de/api/interpreter',
};

describe('IrctcApiClient', () => {
  it('should report available when key is set', () => {
    const client = new IrctcApiClient(baseConfig);
    expect(client.isAvailable).toBe(true);
  });

  it('should report unavailable when key is empty', () => {
    const client = new IrctcApiClient({ ...baseConfig, rapidApiKey: '' });
    expect(client.isAvailable).toBe(false);
  });

  it('should throw when making request without key', async () => {
    const client = new IrctcApiClient({ ...baseConfig, rapidApiKey: '' });
    await expect(client.getPnrStatus('1234567890')).rejects.toThrow('not configured');
  });

  it('should make API request with correct headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: true, data: {} }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new IrctcApiClient(baseConfig);
    await client.getPnrStatus('1234567890');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('irctc1.p.rapidapi.com');
    expect(url).toContain('pnrNumber=1234567890');
    expect(options.headers['x-rapidapi-key']).toBe('test-key');

    vi.unstubAllGlobals();
  });

  it('should throw on HTTP error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new IrctcApiClient(baseConfig);
    await expect(client.getPnrStatus('1234567890')).rejects.toThrow('429');

    vi.unstubAllGlobals();
  });
});

describe('IndianRailApiClient', () => {
  it('should report available when key is set', () => {
    const client = new IndianRailApiClient(baseConfig);
    expect(client.isAvailable).toBe(true);
  });

  it('should report unavailable when key is empty', () => {
    const client = new IndianRailApiClient({ ...baseConfig, indianRailApiKey: '' });
    expect(client.isAvailable).toBe(false);
  });
});

describe('OsmOverpassClient', () => {
  it('should always be available', () => {
    const client = new OsmOverpassClient(baseConfig);
    expect(client.isAvailable).toBe(true);
  });

  it('should make correct Overpass query for nearby stations', async () => {
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
              tags: { name: 'New Delhi', 'ref:indian_railways': 'NDLS' },
            },
          ],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new OsmOverpassClient(baseConfig);
    const results = await client.findNearbyStations(28.6139, 77.209, 10000);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('New Delhi');
    expect(results[0].code).toBe('NDLS');

    vi.unstubAllGlobals();
  });
});

describe('DataGovClient', () => {
  it('should always be available', () => {
    const client = new DataGovClient(baseConfig);
    expect(client.isAvailable).toBe(true);
  });

  it('should make request with correct URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', records: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new DataGovClient(baseConfig);
    await client.getStationData(10);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('api.data.gov.in');
    expect(url).toContain('format=json');

    vi.unstubAllGlobals();
  });
});
