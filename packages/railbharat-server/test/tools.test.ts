import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Cache } from '../src/utils/cache.js';
import { IrctcApiClient } from '../src/sources/irctc-api.js';
import { IndianRailApiClient } from '../src/sources/indian-rail-api.js';
import { OsmOverpassClient } from '../src/sources/osm-overpass.js';
import { DataGovClient } from '../src/sources/data-gov.js';
import type { RailBharatConfig } from '../src/config.js';
import {
  handleLiveStatus,
  handleTrainPosition,
  handleDelayHistory,
} from '../src/tools/live-tracking.js';
import { handlePnrStatus, handleSeatAvailability } from '../src/tools/pnr-booking.js';
import { handleSearchTrains, handleTrainInfo } from '../src/tools/train-search.js';
import {
  handleStationInfo,
  handleStationBoard,
  handleSearchStations,
} from '../src/tools/station.js';
import { handleTrainRoute, handleFareEnquiry } from '../src/tools/route-schedule.js';
import { handlePunctualityStats, handleBusiestRoutes } from '../src/tools/historical.js';
import { handleNearbyStations, handleRouteMap } from '../src/tools/geospatial.js';

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

describe('Live Tracking Tools', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('handleLiveStatus should return data from IRCTC API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: true,
          data: {
            trainNumber: '12301',
            trainName: 'Howrah Rajdhani Express',
            currentStation: { stationName: 'Kanpur', stationCode: 'CNB' },
            delay: 10,
            lastUpdated: '14:32',
            trainStatusList: [],
          },
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handleLiveStatus({ trainNumber: '12301' }, deps);
    expect(result).toContain('12301');
    expect(result).toContain('Howrah Rajdhani Express');
  });

  it('handleLiveStatus should show hints when no sources available', async () => {
    const deps = makeDeps({ irctcAvailable: false, indianRailAvailable: false });
    const result = await handleLiveStatus({ trainNumber: '12301' }, deps);
    expect(result).toContain('Unable to fetch');
    expect(result).toContain('RAILBHARAT_MCP_RAPIDAPI_KEY');
  });

  it('handleTrainPosition should show position data', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: true,
          data: {
            trainNumber: '12301',
            trainName: 'Howrah Rajdhani',
            currentStation: { stationName: 'Kanpur', stationCode: 'CNB' },
            delay: 5,
            lastUpdated: '14:00',
          },
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handleTrainPosition({ trainNumber: '12301' }, deps);
    expect(result).toContain('12301');
    expect(result).toContain('Kanpur');
  });

  it('handleDelayHistory should work without sources', async () => {
    const deps = makeDeps({ irctcAvailable: false, indianRailAvailable: false });
    const result = await handleDelayHistory({ trainNumber: '12301', days: 7 }, deps);
    expect(result).toContain('No live tracking API configured');
  });
});

describe('PNR & Booking Tools', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('handlePnrStatus should return PNR data', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: true,
          data: {
            pnrNumber: '1234567890',
            trainNumber: '12301',
            trainName: 'Rajdhani',
            sourceStation: 'NDLS',
            destinationStation: 'HWH',
            classType: '3A',
            passengerList: [
              {
                passengerSerialNumber: 1,
                bookingStatusDetails: 'S5,32',
                currentStatusDetails: 'CNF',
              },
            ],
          },
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handlePnrStatus({ pnr: '1234567890' }, { ...deps });
    expect(result).toContain('1234567890');
    expect(result).toContain('CNF');
  });

  it('handlePnrStatus should fail without IRCTC API', async () => {
    const deps = makeDeps({ irctcAvailable: false });
    const result = await handlePnrStatus({ pnr: '1234567890' }, deps);
    expect(result).toContain('requires IRCTC API');
  });

  it('handleSeatAvailability should fail without IRCTC API', async () => {
    const deps = makeDeps({ irctcAvailable: false });
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
    expect(result).toContain('requires IRCTC API');
  });
});

describe('Train Search Tools', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('handleSearchTrains should return results from IRCTC', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: true,
          data: [
            {
              trainNumber: '12301',
              trainName: 'Rajdhani',
              stationFrom: { stationCode: 'NDLS' },
              stationTo: { stationCode: 'HWH' },
              departureTime: '16:55',
              arrivalTime: '09:55',
              duration: '17h 00m',
              availableClasses: ['1A', '2A', '3A'],
            },
          ],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handleSearchTrains({ fromStation: 'NDLS', toStation: 'HWH' }, deps);
    expect(result).toContain('12301');
    expect(result).toContain('Rajdhani');
  });

  it('handleTrainInfo should fail without sources', async () => {
    const deps = makeDeps({ irctcAvailable: false });
    const result = await handleTrainInfo({ trainNumber: '12301' }, deps);
    expect(result).toContain('Unable to get info');
  });
});

describe('Station Tools', () => {
  it('handleStationInfo should use built-in data', async () => {
    const deps = makeDeps({ irctcAvailable: false });
    const result = await handleStationInfo({ station: 'NDLS' }, deps);
    expect(result).toContain('New Delhi');
    expect(result).toContain('NDLS');
  });

  it('handleStationBoard should explain when API not available', async () => {
    const deps = makeDeps({ irctcAvailable: false });
    const result = await handleStationBoard({ station: 'NDLS', type: 'both', hours: 4 }, deps);
    expect(result).toContain('requires IRCTC API');
  });

  it('handleSearchStations should use built-in fuzzy search', async () => {
    const deps = makeDeps({ irctcAvailable: false });
    const result = await handleSearchStations({ query: 'Delhi' }, deps);
    expect(result).toContain('NDLS');
  });
});

describe('Route & Schedule Tools', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('handleTrainRoute should return schedule from IRCTC', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: true,
          data: {
            trainNumber: '12301',
            trainName: 'Rajdhani',
            runDays: ['Mon', 'Tue'],
            stationList: [
              { stationName: 'New Delhi', stationCode: 'NDLS', departureTime: '16:55' },
            ],
          },
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handleTrainRoute({ trainNumber: '12301' }, deps);
    expect(result).toContain('12301');
    expect(result).toContain('NDLS');
  });

  it('handleFareEnquiry should fail without IRCTC', async () => {
    const deps = makeDeps({ irctcAvailable: false });
    const result = await handleFareEnquiry(
      { trainNumber: '12301', fromStation: 'NDLS', toStation: 'HWH', class: '3A' },
      deps
    );
    expect(result).toContain('requires IRCTC API');
  });
});

describe('Historical Tools', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('handlePunctualityStats should handle API errors gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handlePunctualityStats(
      { period: 'month' },
      { dataGovApi: deps.dataGovApi, cache: deps.cache, availability: deps.availability }
    );
    expect(result).toContain('Unable to fetch');
  });

  it('handleBusiestRoutes should show fallback data on error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const deps = makeDeps();
    const result = await handleBusiestRoutes(
      { limit: 10 },
      { dataGovApi: deps.dataGovApi, cache: deps.cache, availability: deps.availability }
    );
    expect(result).toContain('Delhi');
    expect(result).toContain('Mumbai');
  });
});

describe('Geospatial Tools', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('handleNearbyStations should return formatted results', async () => {
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

    const deps = makeDeps();
    const result = await handleNearbyStations(
      { lat: 28.6139, lon: 77.209, radiusKm: 10 },
      { osmClient: deps.osmClient, cache: deps.cache }
    );
    expect(result).toContain('New Delhi');
  });

  it('handleRouteMap should require parameters', async () => {
    const deps = makeDeps();
    const result = await handleRouteMap({}, { osmClient: deps.osmClient, cache: deps.cache });
    expect(result).toContain('Please provide');
  });

  it('handleRouteMap should handle trainNumber only', async () => {
    const deps = makeDeps();
    const result = await handleRouteMap(
      { trainNumber: '12301' },
      { osmClient: deps.osmClient, cache: deps.cache }
    );
    expect(result).toContain('12301');
    expect(result).toContain('rail_train_route');
  });
});

describe('Server creation', () => {
  it('should create server with all tools registered', async () => {
    const { createServer } = await import('../src/server.js');
    const server = createServer(baseConfig);
    expect(server).toBeDefined();
  });
});
