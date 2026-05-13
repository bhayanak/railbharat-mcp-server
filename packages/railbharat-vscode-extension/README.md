# RailBharat VS Code Extension

VS Code extension that automatically registers the RailBharat MCP server for Indian Railways intelligence in Copilot Chat.

## Installation

1. Download the `.vsix` from [Releases](https://github.com/railbharat/railbharat-mcp-server/releases)
2. Install: `code --install-extension railbharat-0.1.0.vsix`
3. Configure your API keys in VS Code Settings

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `railbharat.rapidApiKey` | RapidAPI key for IRCTC API | — |
| `railbharat.rapidApiHost` | RapidAPI host | `irctc1.p.rapidapi.com` |
| `railbharat.indianRailApiKey` | Indian Rail API key | — |
| `railbharat.indianRailApiUrl` | Indian Rail API URL | `https://indianrailapi.com/api/v2` |
| `railbharat.dataGovKey` | data.gov.in API key | — |
| `railbharat.overpassApiUrl` | Overpass API endpoint | `https://overpass-api.de/api/interpreter` |
| `railbharat.cacheTtlMs` | Cache TTL (ms) | `300000` |
| `railbharat.timeoutMs` | Request timeout (ms) | `15000` |

## Usage

After installing and configuring, the RailBharat server automatically appears in the MCP Servers panel. Click **Start** to activate.

### Example Prompts

- "What's the status of train 12301?"
- "Check my PNR 4567891230"
- "Find trains from New Delhi to Mumbai for tomorrow"
- "Show railway stations near 28.6°N, 77.2°E"
- "What's the full route of Howrah Rajdhani?"
- "Is there availability in 3A on 12301 for December 25?"

## 16 Available Tools

**Live Tracking:** `rail_live_status`, `rail_train_position`, `rail_delay_history`
**PNR & Booking:** `rail_pnr_status`, `rail_seat_availability`
**Train Search:** `rail_search_trains`, `rail_train_info`
**Station:** `rail_station_info`, `rail_station_board`, `rail_search_stations`
**Route:** `rail_train_route`, `rail_fare_enquiry`
**Analytics:** `rail_punctuality_stats`, `rail_busiest_routes`
**Geospatial:** `rail_nearby_stations`, `rail_route_map`

## Troubleshooting

**Server not appearing in MCP panel?**
- Ensure VS Code ≥ 1.99.0
- Check that the extension is enabled
- Restart VS Code

**Tools returning errors about missing configuration?**
- Configure `railbharat.rapidApiKey` in settings
- The server tells you exactly which environment variable to set

## License

MIT
