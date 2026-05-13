import type { RailBharatConfig } from '../config.js';

/**
 * Indian Rail API client (indianrailapi.com) — alternative/backup source.
 * Provides similar data to IRCTC RapidAPI but from a different provider.
 */
export class IndianRailApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: RailBharatConfig) {
    this.apiKey = config.indianRailApiKey;
    this.baseUrl = config.indianRailApiBaseUrl;
    this.timeoutMs = config.timeoutMs;
  }

  get isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  private async request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.isAvailable) {
      throw new Error(
        'Indian Rail API not configured. Set RAILBHARAT_MCP_INDIANRAIL_KEY and RAILBHARAT_MCP_INDIANRAIL_URL.'
      );
    }

    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('apikey', this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }

    // SSRF protection: only allow the configured base URL host
    const allowedHost = new URL(this.baseUrl).hostname;
    if (url.hostname !== allowedHost) {
      throw new Error('Invalid API host');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Indian Rail API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getLiveStatus(trainNumber: string, date?: string): Promise<IndianRailLiveResponse> {
    const params: Record<string, string> = { trainNumber };
    if (date) params.date = date;
    return this.request<IndianRailLiveResponse>('/liveStatus', params);
  }

  async getTrainSchedule(trainNumber: string): Promise<IndianRailScheduleResponse> {
    return this.request<IndianRailScheduleResponse>('/trainSchedule', { trainNumber });
  }

  async getTrainsBetween(
    from: string,
    to: string,
    date?: string
  ): Promise<IndianRailTrainSearchResponse> {
    const params: Record<string, string> = { from, to };
    if (date) params.date = date;
    return this.request<IndianRailTrainSearchResponse>('/trainsBetween', params);
  }
}

export interface IndianRailLiveResponse {
  responseCode?: number;
  train?: {
    number?: string;
    name?: string;
  };
  currentStation?: {
    name?: string;
    code?: string;
  };
  route?: Array<{
    station?: { name?: string; code?: string };
    scheduledArrival?: string;
    actualArrival?: string;
    scheduledDeparture?: string;
    actualDeparture?: string;
    delay?: number;
    platform?: string;
    hasArrived?: boolean;
    isCurrent?: boolean;
  }>;
}

export interface IndianRailScheduleResponse {
  responseCode?: number;
  train?: {
    number?: string;
    name?: string;
    runDays?: string[];
    classes?: string[];
  };
  route?: Array<{
    station?: { name?: string; code?: string };
    arrivalTime?: string;
    departureTime?: string;
    haltTime?: number;
    distance?: number;
    day?: number;
  }>;
}

export interface IndianRailTrainSearchResponse {
  responseCode?: number;
  trains?: Array<{
    number?: string;
    name?: string;
    from?: { name?: string; code?: string };
    to?: { name?: string; code?: string };
    departure?: string;
    arrival?: string;
    duration?: string;
    classes?: string[];
    days?: string[];
  }>;
}
