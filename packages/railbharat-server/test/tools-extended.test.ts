import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Cache } from '../src/utils/cache.js';
import { IrctcApiClient } from '../src/sources/irctc-api.js';
import { IndianRailApiClient } from '../src/sources/indian-rail-api.js';
import { OsmOverpassClient } from '../src/sources/osm-overpass.js';
import { DataGovClient } from '../src/sources/data-gov.js';
import type { RailBharatConfig } from '../src/config.js';
import { handleLiveStatus, handleDelayHistory } from '../src/tools/live-tracking.js';
import { handleSearchTrains, handleTrainInfo } from '../src/tools/train-search.js';
import { handleTrainRoute } from '../src/tools/route-schedule.js';
import { handlePunctualityStats } from '../src/tools/historical.js';
import { handleNearbyStations, handleRouteMap } from '../src/tools/geospatial.js';
import { handleSeatAvailability } from '../src/tools/pnr-booking.js';

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

function makeDeps(overrides: { irctcAvailable?: boolean; indianRailAvailable?: boolean } = {}) {
  const irctcApi = new IrctcApiClient({
    ...baseConfig,
    rapidApiKey: overrides.irctcAvailable === false ? '' : 'test-key',
  });
  const indianRailApi = new IndianRailApiClient({
    ...baseConfig,
    indianRailApiKey: overrides.indianRailAvailable === false ? '' : 'test-key',
  });
  const osmClient = new OsmOverpassClient(baseConfig);
  const dataGovApi = new DataGovClient(baseConfig);
  const cache = new Cache(300000);
  const availability = {
    irctcApi: overrides.irctcAvailable !== false,
    indianRailApi: overrides.indianRailAvailable !== false,
    overpassApi: true,
    dataGovApi: true,
  };
  return { irctcApi, indianRailApi, osmClient, dataGovApi, cache, availability };
}

describe('Fallback paths', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('handleLiveStatus should fall back to IndianRailApi when IRCTC fails', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call (IRCTC) fails
        return Promise.resolve({ ok: false, status: 500, statusText: 'Error' });
      }
      // Second call (IndianRail) succeeds
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            responseCode: 200,
            train: { number: '12301', name: 'Rajdhani' },
            currentStation: { name: 'Kanpur', code: 'CNB' },
            route: [
              {
                station: { name: 'New Delhi', code: 'NDLS' },
                scheduledDeparture: '16:55',
                actualDeparture: '16:55',
                delay: 0,
                hasArrived: true,
                isCurrent: false,
              },
            ],
          }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handleLiveStatus({ trainNumber: '12301' }, deps);
    expect(result).toContain('12301');
    expect(result).toContain('Rajdhani');
  });

  it('handleLiveStatus should show API message when status is false', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: false, message: 'Train not found' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps({ indianRailAvailable: false });
    const result = await handleLiveStatus({ trainNumber: '99999' }, deps);
    expect(result).toContain('Train not found');
  });

  it('handleDelayHistory should show current delay when IRCTC available', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: true,
          data: { delay: 15, trainName: 'Rajdhani' },
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps({ indianRailAvailable: false });
    const result = await handleDelayHistory({ trainNumber: '12301', days: 7 }, deps);
    expect(result).toContain('+15 min');
  });

  it('handleDelayHistory should handle IRCTC error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network fail'));
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps({ indianRailAvailable: false });
    const result = await handleDelayHistory({ trainNumber: '12301', days: 7 }, deps);
    expect(result).toContain('Unable to fetch');
  });

  it('handleSearchTrains should fall back to IndianRailApi', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 500, statusText: 'Error' });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            responseCode: 200,
            trains: [
              { number: '12301', name: 'Rajdhani', from: { code: 'NDLS' }, to: { code: 'HWH' } },
            ],
          }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handleSearchTrains({ fromStation: 'NDLS', toStation: 'HWH' }, deps);
    expect(result).toContain('12301');
  });

  it('handleTrainRoute should fall back to IndianRailApi', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 500, statusText: 'Error' });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            responseCode: 200,
            train: { number: '12301', name: 'Rajdhani', runDays: ['Daily'], classes: ['3A'] },
            route: [{ station: { name: 'NDLS', code: 'NDLS' }, departureTime: '16:55' }],
          }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handleTrainRoute({ trainNumber: '12301' }, deps);
    expect(result).toContain('12301');
  });

  it('handleSeatAvailability should return data on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: true,
          data: [
            { date: '25-12-2025', currentStatus: 'AVAILABLE-0012' },
            { date: '26-12-2025', currentStatus: 'WL5' },
          ],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handleSeatAvailability(
      {
        trainNumber: '12301',
        fromStation: 'NDLS',
        toStation: 'HWH',
        date: '25-12-2025',
        quota: 'GN',
      },
      deps
    );
    expect(result).toContain('AVAILABLE');
  });

  it('handlePunctualityStats should show data when available', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'ok',
          total: 100,
          records: [{ train: '12301', punctuality: '95%' }],
          fields: [{ id: 'train', name: 'Train', type: 'string' }],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handlePunctualityStats(
      { period: 'month' },
      { dataGovApi: deps.dataGovApi, cache: deps.cache, availability: deps.availability }
    );
    expect(result).toContain('Total records');
  });

  it('handleNearbyStations should handle errors', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Timeout'));
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handleNearbyStations(
      { lat: 28.6, lon: 77.2, radiusKm: 10 },
      { osmClient: deps.osmClient, cache: deps.cache }
    );
    expect(result).toContain('Error');
  });

  it('handleRouteMap should fetch geometry for station pairs', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          elements: [
            {
              id: 1,
              type: 'node',
              lat: 28.6,
              lon: 77.2,
              tags: { name: 'New Delhi', 'ref:indian_railways': 'NDLS' },
            },
          ],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handleRouteMap(
      { fromStation: 'NDLS', toStation: 'HWH' },
      { osmClient: deps.osmClient, cache: deps.cache }
    );
    // Should attempt to get coordinates
    expect(result).toContain('Route Map');
  });

  it('handleTrainInfo should return data from IRCTC', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: true,
          data: [
            {
              trainNumber: '12301',
              trainName: 'Rajdhani Express',
              trainType: 'RAJ',
              stationFrom: { stationCode: 'NDLS', stationName: 'New Delhi' },
              stationTo: { stationCode: 'HWH', stationName: 'Howrah' },
              departureTime: '16:55',
              arrivalTime: '09:55',
              duration: '17:00',
              distance: 1447,
              availableClasses: ['1A', '2A', '3A'],
              runDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            },
          ],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handleTrainInfo({ trainNumber: '12301' }, deps);
    expect(result).toContain('12301');
    expect(result).toContain('Rajdhani Express');
    expect(result).toContain('1447');
  });
});
