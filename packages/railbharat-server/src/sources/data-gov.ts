import type { RailBharatConfig } from '../config.js';

/**
 * data.gov.in API client for Indian Railways open data.
 * Provides historical statistics, punctuality data, and station master data.
 * Works without API key (rate-limited); key provides higher limits.
 */
export class DataGovClient {
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly baseUrl = 'https://api.data.gov.in/resource';

  constructor(config: RailBharatConfig) {
    this.apiKey = config.dataGovKey;
    this.timeoutMs = config.timeoutMs;
  }

  get isAvailable(): boolean {
    return true; // Works without key, key gives higher rate limits
  }

  private async request<T>(resourceId: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/${resourceId}`);
    url.searchParams.set('api-key', this.apiKey || 'default');
    url.searchParams.set('format', 'json');
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }

    // SSRF protection: only allow data.gov.in
    if (url.hostname !== 'api.data.gov.in') {
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
        throw new Error(`data.gov.in API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getStationData(limit: number = 100, offset: number = 0): Promise<DataGovResponse> {
    // Indian Railways station data catalog ID
    return this.request<DataGovResponse>('0c56a939-3ea3-49b4-acbd-eeb0b81ee706', {
      limit: String(limit),
      offset: String(offset),
    });
  }

  async getTrainPunctuality(limit: number = 100, offset: number = 0): Promise<DataGovResponse> {
    // Railway punctuality/performance data
    return this.request<DataGovResponse>('e1c62e25-91a5-4df4-9e8a-a5b5e12fcb50', {
      limit: String(limit),
      offset: String(offset),
    });
  }

  async getBusiestRoutes(limit: number = 10): Promise<DataGovResponse> {
    // Railway traffic/busiest routes data
    return this.request<DataGovResponse>('7b96e0cf-39b7-4c96-a7b9-87a5f3b3c0a9', {
      limit: String(limit),
    });
  }
}

export interface DataGovResponse {
  status?: string;
  message?: string;
  total?: number;
  count?: number;
  records?: Array<Record<string, string | number>>;
  fields?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}
