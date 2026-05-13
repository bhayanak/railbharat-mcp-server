import type { RailBharatConfig } from '../config.js';

/**
 * IRCTC API client via RapidAPI.
 * Wraps the most popular IRCTC API providers on RapidAPI.
 * The specific host is configurable to support different providers.
 */
export class IrctcApiClient {
  private readonly apiKey: string;
  private readonly apiHost: string;
  private readonly timeoutMs: number;

  constructor(config: RailBharatConfig) {
    this.apiKey = config.rapidApiKey;
    this.apiHost = config.rapidApiHost;
    this.timeoutMs = config.timeoutMs;
  }

  get isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  private async request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.isAvailable) {
      throw new Error(
        'IRCTC API not configured. Set RAILBHARAT_MCP_RAPIDAPI_KEY with your RapidAPI key.'
      );
    }

    const url = new URL(`https://${this.apiHost}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }

    // SSRF protection: only allow the configured RapidAPI host
    if (url.hostname !== this.apiHost) {
      throw new Error('Invalid API host');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': this.apiHost,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`IRCTC API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getPnrStatus(pnr: string): Promise<PnrResponse> {
    return this.request<PnrResponse>('/api/v3/getPNRStatus', { pnrNumber: pnr });
  }

  async getLiveStatus(trainNumber: string, date?: string): Promise<LiveStatusResponse> {
    const params: Record<string, string> = { trainNo: trainNumber };
    if (date) params.startDate = date;
    return this.request<LiveStatusResponse>('/api/v1/liveTrainStatus', params);
  }

  async getTrainSchedule(trainNumber: string): Promise<ScheduleResponse> {
    return this.request<ScheduleResponse>('/api/v1/getTrainSchedule', { trainNo: trainNumber });
  }

  async searchTrains(from: string, to: string, date?: string): Promise<TrainSearchResponse> {
    const params: Record<string, string> = {
      fromStationCode: from,
      toStationCode: to,
    };
    if (date) params.dateOfJourney = date;
    return this.request<TrainSearchResponse>('/api/v3/trainBetweenStations', params);
  }

  async checkSeatAvailability(
    trainNumber: string,
    from: string,
    to: string,
    date: string,
    classType?: string,
    quota?: string
  ): Promise<SeatAvailabilityResponse> {
    const params: Record<string, string> = {
      trainNo: trainNumber,
      fromStationCode: from,
      toStationCode: to,
      dateOfJourney: date,
    };
    if (classType) params.classType = classType;
    if (quota) params.quota = quota;
    return this.request<SeatAvailabilityResponse>('/api/v1/checkSeatAvailability', params);
  }

  async searchStation(query: string): Promise<StationSearchResponse> {
    return this.request<StationSearchResponse>('/api/v1/searchStation', { query });
  }

  async getTrainInfo(trainNumber: string): Promise<TrainInfoResponse> {
    return this.request<TrainInfoResponse>('/api/v1/searchTrain', { query: trainNumber });
  }

  async getFare(trainNumber: string, from: string, to: string): Promise<FareResponse> {
    return this.request<FareResponse>('/api/v1/getFare', {
      trainNo: trainNumber,
      fromStationCode: from,
      toStationCode: to,
    });
  }
}

// Response types (flexible to handle varying API providers)
export interface PnrResponse {
  status?: boolean;
  data?: {
    pnrNumber?: string;
    trainNumber?: string;
    trainName?: string;
    sourceStation?: string;
    destinationStation?: string;
    dateOfJourney?: string;
    boardingPoint?: string;
    reservationUpto?: string;
    classType?: string;
    passengerList?: Array<{
      passengerSerialNumber?: number;
      bookingStatusDetails?: string;
      currentStatusDetails?: string;
      coachPosition?: string;
    }>;
  };
  message?: string;
}

export interface LiveStatusResponse {
  status?: boolean;
  data?: {
    trainNumber?: string;
    trainName?: string;
    currentStation?: {
      stationName?: string;
      stationCode?: string;
    };
    delay?: number;
    lastUpdated?: string;
    trainStatusList?: Array<{
      stationName?: string;
      stationCode?: string;
      scheduledArrival?: string;
      actualArrival?: string;
      scheduledDeparture?: string;
      actualDeparture?: string;
      delayInArrival?: number;
      delayInDeparture?: number;
      platform?: string;
      isPassed?: boolean;
      isCurrentStation?: boolean;
    }>;
  };
  message?: string;
}

export interface ScheduleResponse {
  status?: boolean;
  data?: {
    trainNumber?: string;
    trainName?: string;
    runDays?: string[];
    availableClasses?: string[];
    stationList?: Array<{
      stationName?: string;
      stationCode?: string;
      arrivalTime?: string;
      departureTime?: string;
      haltTime?: number | string;
      distance?: number;
      dayCount?: number;
      platform?: string;
    }>;
  };
  message?: string;
}

export interface TrainSearchResponse {
  status?: boolean;
  data?: Array<{
    trainNumber?: string;
    trainName?: string;
    stationFrom?: { stationCode?: string; stationName?: string };
    stationTo?: { stationCode?: string; stationName?: string };
    departureTime?: string;
    arrivalTime?: string;
    duration?: string;
    trainType?: string;
    availableClasses?: string[];
    runDays?: string[];
  }>;
  message?: string;
}

export interface SeatAvailabilityResponse {
  status?: boolean;
  data?: Array<{
    date?: string;
    currentStatus?: string;
    availabilityStatus?: string;
  }>;
  message?: string;
}

export interface StationSearchResponse {
  status?: boolean;
  data?: Array<{
    stationCode?: string;
    stationName?: string;
  }>;
  message?: string;
}

export interface TrainInfoResponse {
  status?: boolean;
  data?: Array<{
    trainNumber?: string;
    trainName?: string;
    trainType?: string;
    runDays?: string[];
    availableClasses?: string[];
    stationFrom?: { stationCode?: string; stationName?: string };
    stationTo?: { stationCode?: string; stationName?: string };
    departureTime?: string;
    arrivalTime?: string;
    duration?: string;
    distance?: number;
  }>;
  message?: string;
}

export interface FareResponse {
  status?: boolean;
  data?: {
    trainNumber?: string;
    trainName?: string;
    general?: Array<{
      classType?: string;
      fare?: number;
    }>;
  };
  message?: string;
}
