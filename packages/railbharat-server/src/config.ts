export interface RailBharatConfig {
  /** RapidAPI key for IRCTC-style APIs */
  rapidApiKey: string;
  /** RapidAPI host for IRCTC API (different providers use different hosts) */
  rapidApiHost: string;
  /** data.gov.in API key (optional, for higher rate limits) */
  dataGovKey: string;
  /** Indian Rail API key (optional alternative source) */
  indianRailApiKey: string;
  /** Indian Rail API base URL */
  indianRailApiBaseUrl: string;
  /** Cache TTL in milliseconds */
  cacheTtlMs: number;
  /** HTTP request timeout in milliseconds */
  timeoutMs: number;
  /** Overpass API endpoint */
  overpassApiUrl: string;
}

export interface SourceAvailability {
  irctcApi: boolean;
  indianRailApi: boolean;
  overpassApi: boolean;
  dataGovApi: boolean;
}

export function loadConfig(): RailBharatConfig {
  return {
    rapidApiKey: process.env.RAILBHARAT_MCP_RAPIDAPI_KEY ?? '',
    rapidApiHost: process.env.RAILBHARAT_MCP_RAPIDAPI_HOST ?? 'irctc1.p.rapidapi.com',
    dataGovKey: process.env.RAILBHARAT_MCP_DATAGOV_KEY ?? '',
    indianRailApiKey: process.env.RAILBHARAT_MCP_INDIANRAIL_KEY ?? '',
    indianRailApiBaseUrl:
      process.env.RAILBHARAT_MCP_INDIANRAIL_URL ?? 'https://indianrailapi.com/api/v2',
    cacheTtlMs: parseInt(process.env.RAILBHARAT_MCP_CACHE_TTL_MS ?? '300000', 10),
    timeoutMs: parseInt(process.env.RAILBHARAT_MCP_TIMEOUT_MS ?? '15000', 10),
    overpassApiUrl:
      process.env.RAILBHARAT_MCP_OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter',
  };
}

export function getSourceAvailability(config: RailBharatConfig): SourceAvailability {
  return {
    irctcApi: config.rapidApiKey.length > 0,
    indianRailApi: config.indianRailApiKey.length > 0,
    overpassApi: true, // Always available (free, no key)
    dataGovApi: true, // Available without key, key gives higher limits
  };
}

export function formatSourceHints(availability: SourceAvailability): string {
  const hints: string[] = [];
  if (!availability.irctcApi) {
    hints.push(
      '• IRCTC API (PNR, live status, schedule): Set RAILBHARAT_MCP_RAPIDAPI_KEY with a RapidAPI key'
    );
  }
  if (!availability.indianRailApi) {
    hints.push(
      '• Indian Rail API (alternative source): Set RAILBHARAT_MCP_INDIANRAIL_KEY and RAILBHARAT_MCP_INDIANRAIL_URL'
    );
  }
  if (!availability.dataGovApi || true) {
    hints.push(
      '• data.gov.in (higher rate limits): Set RAILBHARAT_MCP_DATAGOV_KEY for enhanced historical data access'
    );
  }
  if (hints.length === 0) return '';
  return '\n\n📋 To enable more features, configure these data sources:\n' + hints.join('\n');
}
