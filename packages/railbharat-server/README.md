# RailBharat MCP Server

Indian Railways MCP server with 16 tools across live tracking, PNR, train search, stations, routes, historical data, and geospatial.

## Installation

```bash
npm install -g railbharat-server
```

## Configuration

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `RAILBHARAT_MCP_RAPIDAPI_KEY` | For most tools | RapidAPI key for IRCTC API | — |
| `RAILBHARAT_MCP_RAPIDAPI_HOST` | No | RapidAPI host | `irctc1.p.rapidapi.com` |
| `RAILBHARAT_MCP_INDIANRAIL_KEY` | No | Indian Rail API key | — |
| `RAILBHARAT_MCP_INDIANRAIL_URL` | No | Indian Rail API URL | `https://indianrailapi.com/api/v2` |
| `RAILBHARAT_MCP_DATAGOV_KEY` | No | data.gov.in API key | — |
| `RAILBHARAT_MCP_OVERPASS_URL` | No | Overpass API endpoint | `https://overpass-api.de/api/interpreter` |
| `RAILBHARAT_MCP_CACHE_TTL_MS` | No | Cache TTL (ms) | `300000` |
| `RAILBHARAT_MCP_TIMEOUT_MS` | No | HTTP timeout (ms) | `15000` |

## Client Configs

### VS Code (mcp.json)
```json
{
  "servers": {
    "railbharat": {
      "type": "stdio",
      "command": "npx",
      "args": ["railbharat-server"],
      "env": {
        "RAILBHARAT_MCP_RAPIDAPI_KEY": "your-key"
      }
    }
  }
}
```

### Claude Desktop
```json
{
  "mcpServers": {
    "railbharat": {
      "command": "npx",
      "args": ["railbharat-server"],
      "env": {
        "RAILBHARAT_MCP_RAPIDAPI_KEY": "your-key"
      }
    }
  }
}
```

## Tools Reference

### Live Tracking
| Tool | Description | Required Source |
|------|-------------|----------------|
| `rail_live_status` | Real-time train running status | IRCTC or IndianRail |
| `rail_train_position` | Estimated train position | IRCTC or IndianRail |
| `rail_delay_history` | Delay patterns | IRCTC or IndianRail |

### PNR & Booking
| Tool | Description | Required Source |
|------|-------------|----------------|
| `rail_pnr_status` | PNR reservation status | IRCTC |
| `rail_seat_availability` | Seat availability check | IRCTC |

### Train Search
| Tool | Description | Required Source |
|------|-------------|----------------|
| `rail_search_trains` | Search trains between stations | IRCTC or IndianRail |
| `rail_train_info` | Train details | IRCTC |

### Station Intelligence
| Tool | Description | Required Source |
|------|-------------|----------------|
| `rail_station_info` | Station details | Built-in + IRCTC |
| `rail_station_board` | Arrivals/departures | IRCTC |
| `rail_search_stations` | Fuzzy station search | Built-in + IRCTC |

### Route & Schedule
| Tool | Description | Required Source |
|------|-------------|----------------|
| `rail_train_route` | Full route with all stops | IRCTC or IndianRail |
| `rail_fare_enquiry` | Journey fare | IRCTC |

### Historical & Geospatial
| Tool | Description | Required Source |
|------|-------------|----------------|
| `rail_punctuality_stats` | Punctuality statistics | data.gov.in |
| `rail_busiest_routes` | Busiest routes | data.gov.in |
| `rail_nearby_stations` | Stations near location | OpenStreetMap |
| `rail_route_map` | Route geometry | OpenStreetMap |

## License

MIT
