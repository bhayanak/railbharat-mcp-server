# Changelog

All notable changes to the RailBharat MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-05-13

### Added

#### MCP Server (16 tools)
- **Live Tracking (3 tools)**
  - `rail_live_status` — real-time train running status with station-by-station progress
  - `rail_train_position` — estimated current position of a running train
  - `rail_delay_history` — delay patterns over recent days

- **PNR & Booking (2 tools)**
  - `rail_pnr_status` — check PNR reservation status with passenger details
  - `rail_seat_availability` — seat/berth availability for a route and date

- **Train Search (2 tools)**
  - `rail_search_trains` — find trains between two stations with class filtering
  - `rail_train_info` — detailed train information (route, schedule, classes, run days)

- **Station Intelligence (3 tools)**
  - `rail_station_info` — station details with zone and state information
  - `rail_station_board` — arrivals/departures board for a station
  - `rail_search_stations` — fuzzy station search by name or code (90+ built-in stations)

- **Route & Schedule (2 tools)**
  - `rail_train_route` — complete route with all stops, timings, and distances
  - `rail_fare_enquiry` — fare/price for a journey between stations

- **Historical & Geospatial (4 tools)**
  - `rail_punctuality_stats` — punctuality statistics from government open data
  - `rail_busiest_routes` — busiest railway routes with traffic data
  - `rail_nearby_stations` — find stations near a geographic location (OpenStreetMap)
  - `rail_route_map` — geographic route geometry as lat/lon waypoints

#### Data Sources (4 providers, all optional)
- **IRCTC API (RapidAPI)** — primary source for PNR, live status, schedule, seat availability
- **Indian Rail API** — alternative/backup source for live status and schedules
- **OpenStreetMap Overpass** — free geospatial data (stations, rail network geometry)
- **data.gov.in** — government open data for historical statistics

#### Architecture
- Graceful degradation: each data source is optional; tools work with whatever is available
- Helpful error messages guide users to configure missing data sources
- In-memory caching (live data: 2min, schedules: 1hr, geospatial: 24hr)
- Built-in station code resolver with 90+ major Indian stations and fuzzy matching
- Zod schema validation on all tool inputs
- SSRF protection on all HTTP clients

#### VS Code Extension
- Automatic MCP server registration via `mcpServerDefinitionProviders`
- All configuration via VS Code settings (`railbharat.*`)
- Settings change detection with automatic server refresh
- Extension settings for all data source keys and endpoints

#### CI/CD
- GitHub Actions CI: Node 20/22 matrix with typecheck, lint, format, coverage, build
- GitHub Actions Release: tag-triggered npm publish + GitHub Release with VSIX
- ESLint 9 flat config with typescript-eslint and security plugin
- Prettier format checking
- Vitest coverage with thresholds (75% lines, 85% functions, 50% branches)

### Data Source Research Notes

| Source | Status | Notes |
|--------|--------|-------|
| IRCTC RapidAPI | Active | Multiple providers available; configurable host |
| IndianRailAPI.com | Under maintenance | Optional alternative; may have intermittent availability |
| OpenStreetMap Overpass | Active | Free, no key needed; reliable for geospatial |
| data.gov.in | Active | Free with optional API key for higher limits |

### Security
- API keys loaded from environment variables only (never hardcoded)
- PNR numbers not logged
- SSRF protection validates URLs against configured base URLs
- All inputs validated via Zod schemas with max lengths and patterns
