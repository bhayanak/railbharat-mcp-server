import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type RailBharatConfig, getSourceAvailability } from './config.js';
import { Cache } from './utils/cache.js';
import { IrctcApiClient } from './sources/irctc-api.js';
import { IndianRailApiClient } from './sources/indian-rail-api.js';
import { OsmOverpassClient } from './sources/osm-overpass.js';
import { DataGovClient } from './sources/data-gov.js';
import {
  liveStatusSchema,
  trainPositionSchema,
  delayHistorySchema,
  handleLiveStatus,
  handleTrainPosition,
  handleDelayHistory,
} from './tools/live-tracking.js';
import {
  pnrStatusSchema,
  seatAvailabilitySchema,
  handlePnrStatus,
  handleSeatAvailability,
} from './tools/pnr-booking.js';
import {
  searchTrainsSchema,
  trainInfoSchema,
  handleSearchTrains,
  handleTrainInfo,
} from './tools/train-search.js';
import {
  stationInfoSchema,
  stationBoardSchema,
  searchStationsSchema,
  handleStationInfo,
  handleStationBoard,
  handleSearchStations,
} from './tools/station.js';
import {
  trainRouteSchema,
  fareEnquirySchema,
  handleTrainRoute,
  handleFareEnquiry,
} from './tools/route-schedule.js';
import {
  punctualityStatsSchema,
  busiestRoutesSchema,
  handlePunctualityStats,
  handleBusiestRoutes,
} from './tools/historical.js';
import {
  nearbyStationsSchema,
  routeMapSchema,
  handleNearbyStations,
  handleRouteMap,
} from './tools/geospatial.js';

export function createServer(config: RailBharatConfig): McpServer {
  const server = new McpServer({
    name: 'railbharat',
    version: '0.1.0',
  });

  const cache = new Cache(config.cacheTtlMs);
  const availability = getSourceAvailability(config);

  // Initialize data source clients
  const irctcApi = new IrctcApiClient(config);
  const indianRailApi = new IndianRailApiClient(config);
  const osmClient = new OsmOverpassClient(config);
  const dataGovApi = new DataGovClient(config);

  // Shared deps objects
  const liveTrackingDeps = { irctcApi, indianRailApi, cache, availability };
  const pnrBookingDeps = { irctcApi, cache, availability };
  const trainSearchDeps = { irctcApi, indianRailApi, cache, availability };
  const stationDeps = { irctcApi, cache, availability };
  const routeScheduleDeps = { irctcApi, indianRailApi, cache, availability };
  const historicalDeps = { dataGovApi, cache, availability };
  const geospatialDeps = { osmClient, cache };

  // ─── Live Tracking (3 tools) ───

  server.tool(
    'rail_live_status',
    'Get real-time running status of an Indian train including delay, platform, and station-by-station progress',
    liveStatusSchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleLiveStatus(args, liveTrackingDeps) }],
    })
  );

  server.tool(
    'rail_train_position',
    'Get estimated current position/location of a running Indian train',
    trainPositionSchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleTrainPosition(args, liveTrackingDeps) }],
    })
  );

  server.tool(
    'rail_delay_history',
    'Get delay patterns and history for an Indian train over recent days',
    delayHistorySchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleDelayHistory(args, liveTrackingDeps) }],
    })
  );

  // ─── PNR & Booking (2 tools) ───

  server.tool(
    'rail_pnr_status',
    'Check PNR status for an Indian railway booking — shows passenger reservation status',
    pnrStatusSchema,
    async (args) => ({
      content: [{ type: 'text', text: await handlePnrStatus(args, pnrBookingDeps) }],
    })
  );

  server.tool(
    'rail_seat_availability',
    'Check seat/berth availability on Indian trains for a given route and date',
    seatAvailabilitySchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleSeatAvailability(args, pnrBookingDeps) }],
    })
  );

  // ─── Train Search (2 tools) ───

  server.tool(
    'rail_search_trains',
    'Search for trains between two Indian railway stations, optionally filtered by date and class',
    searchTrainsSchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleSearchTrains(args, trainSearchDeps) }],
    })
  );

  server.tool(
    'rail_train_info',
    'Get detailed information about a specific Indian train — route, schedule, classes, and running days',
    trainInfoSchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleTrainInfo(args, trainSearchDeps) }],
    })
  );

  // ─── Station Intelligence (3 tools) ───

  server.tool(
    'rail_station_info',
    'Get information about an Indian railway station — zone, state, and related stations',
    stationInfoSchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleStationInfo(args, stationDeps) }],
    })
  );

  server.tool(
    'rail_station_board',
    'Get arrivals and departures board for an Indian railway station',
    stationBoardSchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleStationBoard(args, stationDeps) }],
    })
  );

  server.tool(
    'rail_search_stations',
    'Search Indian railway stations by name or code with fuzzy matching',
    searchStationsSchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleSearchStations(args, stationDeps) }],
    })
  );

  // ─── Route & Schedule (2 tools) ───

  server.tool(
    'rail_train_route',
    'Get complete route of an Indian train with all stops, timings, and distances',
    trainRouteSchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleTrainRoute(args, routeScheduleDeps) }],
    })
  );

  server.tool(
    'rail_fare_enquiry',
    'Get fare/price for a journey on an Indian train between two stations',
    fareEnquirySchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleFareEnquiry(args, routeScheduleDeps) }],
    })
  );

  // ─── Historical (2 tools) ───

  server.tool(
    'rail_punctuality_stats',
    'Get punctuality statistics for Indian trains from government open data',
    punctualityStatsSchema,
    async (args) => ({
      content: [{ type: 'text', text: await handlePunctualityStats(args, historicalDeps) }],
    })
  );

  server.tool(
    'rail_busiest_routes',
    'Get busiest Indian railway routes ranked by traffic volume',
    busiestRoutesSchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleBusiestRoutes(args, historicalDeps) }],
    })
  );

  // ─── Geospatial (2 tools) ───

  server.tool(
    'rail_nearby_stations',
    'Find Indian railway stations near a geographic location using OpenStreetMap data',
    nearbyStationsSchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleNearbyStations(args, geospatialDeps) }],
    })
  );

  server.tool(
    'rail_route_map',
    'Get geographic route geometry (lat/lon waypoints) for a rail route between two Indian stations',
    routeMapSchema,
    async (args) => ({
      content: [{ type: 'text', text: await handleRouteMap(args, geospatialDeps) }],
    })
  );

  return server;
}
