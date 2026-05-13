import { describe, it, expect } from 'vitest';
import {
  formatTrainStatus,
  formatPnrStatus,
  formatTrainSchedule,
  formatSeatAvailability,
  formatTrainList,
  formatStationBoard,
  formatFare,
  formatNearbyStations,
} from '../src/utils/formatter.js';

describe('formatter', () => {
  describe('formatTrainStatus', () => {
    it('should format basic train status', () => {
      const result = formatTrainStatus({
        trainNumber: '12301',
        trainName: 'Howrah Rajdhani Express',
        delay: 0,
        lastUpdate: '14:32 IST',
      });
      expect(result).toContain('12301');
      expect(result).toContain('Howrah Rajdhani Express');
      expect(result).toContain('On Time');
    });

    it('should show delay correctly', () => {
      const result = formatTrainStatus({
        trainNumber: '12301',
        trainName: 'Test',
        delay: 15,
      });
      expect(result).toContain('+15 min late');
    });

    it('should format station list', () => {
      const result = formatTrainStatus({
        trainNumber: '12301',
        trainName: 'Test',
        stations: [
          {
            stationName: 'New Delhi',
            stationCode: 'NDLS',
            scheduledDeparture: '16:55',
            actualDeparture: '16:55',
            delay: 0,
            platform: '16',
            isCurrent: false,
            isPassed: true,
          },
          {
            stationName: 'Kanpur Central',
            stationCode: 'CNB',
            scheduledArrival: '21:12',
            actualArrival: '21:18',
            delay: 7,
            platform: '3',
            isCurrent: true,
            isPassed: false,
          },
        ],
      });
      expect(result).toContain('NDLS');
      expect(result).toContain('CNB');
      expect(result).toContain('+7 min');
    });
  });

  describe('formatPnrStatus', () => {
    it('should format PNR status', () => {
      const result = formatPnrStatus({
        pnr: '1234567890',
        trainNumber: '12301',
        trainName: 'Howrah Rajdhani',
        from: 'NDLS',
        to: 'HWH',
        date: '25-12-2025',
        classCode: '3A',
        passengers: [
          {
            number: 1,
            bookingStatus: 'S5,32',
            currentStatus: 'CNF',
          },
        ],
      });
      expect(result).toContain('1234567890');
      expect(result).toContain('12301');
      expect(result).toContain('NDLS');
      expect(result).toContain('CNF');
    });
  });

  describe('formatTrainSchedule', () => {
    it('should format schedule with stops', () => {
      const result = formatTrainSchedule({
        trainNumber: '12301',
        trainName: 'Howrah Rajdhani',
        runDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        classes: ['1A', '2A', '3A'],
        stops: [
          {
            stationName: 'New Delhi',
            stationCode: 'NDLS',
            departure: '16:55',
            day: 1,
            distance: 0,
          },
          {
            stationName: 'Howrah',
            stationCode: 'HWH',
            arrival: '09:55',
            day: 2,
            distance: 1447,
          },
        ],
      });
      expect(result).toContain('12301');
      expect(result).toContain('Runs on:');
      expect(result).toContain('NDLS');
      expect(result).toContain('HWH');
    });
  });

  describe('formatSeatAvailability', () => {
    it('should format availability data', () => {
      const result = formatSeatAvailability({
        trainNumber: '12301',
        from: 'NDLS',
        to: 'HWH',
        classCode: '3A',
        availability: [
          { date: '25-12-2025', status: 'AVAILABLE-0012' },
          { date: '26-12-2025', status: 'WL5' },
        ],
      });
      expect(result).toContain('12301');
      expect(result).toContain('AVAILABLE');
      expect(result).toContain('WL5');
    });
  });

  describe('formatTrainList', () => {
    it('should format list of trains', () => {
      const result = formatTrainList([
        {
          trainNumber: '12301',
          trainName: 'Rajdhani',
          from: 'NDLS',
          to: 'HWH',
          departure: '16:55',
          arrival: '09:55',
          duration: '17h 00m',
          classes: ['1A', '2A', '3A'],
        },
      ]);
      expect(result).toContain('12301');
      expect(result).toContain('Rajdhani');
    });

    it('should handle empty list', () => {
      const result = formatTrainList([]);
      expect(result).toContain('No trains found');
    });
  });

  describe('formatStationBoard', () => {
    it('should format station board', () => {
      const result = formatStationBoard({
        stationName: 'New Delhi',
        stationCode: 'NDLS',
        trains: [
          {
            trainNumber: '12301',
            trainName: 'Rajdhani',
            scheduledTime: '16:55',
            delay: 0,
            platform: '16',
            type: 'departure',
            destination: 'HWH',
          },
        ],
      });
      expect(result).toContain('NDLS');
      expect(result).toContain('12301');
    });

    it('should handle empty board', () => {
      const result = formatStationBoard({
        stationName: 'Test',
        stationCode: 'TST',
        trains: [],
      });
      expect(result).toContain('No trains found');
    });
  });

  describe('formatFare', () => {
    it('should format fare data', () => {
      const result = formatFare({
        trainNumber: '12301',
        trainName: 'Rajdhani',
        from: 'NDLS',
        to: 'HWH',
        fares: [
          { classCode: '3A', fare: 2500 },
          { classCode: '2A', fare: 3800 },
        ],
      });
      expect(result).toContain('₹2500');
      expect(result).toContain('₹3800');
    });
  });

  describe('formatNearbyStations', () => {
    it('should format nearby stations', () => {
      const result = formatNearbyStations([
        { name: 'New Delhi', code: 'NDLS', distance: 0.5, lat: 28.6139, lon: 77.209 },
        { name: 'Old Delhi', code: 'DLI', distance: 2.3, lat: 28.6613, lon: 77.2286 },
      ]);
      expect(result).toContain('NDLS');
      expect(result).toContain('0.5 km');
    });

    it('should handle empty results', () => {
      const result = formatNearbyStations([]);
      expect(result).toContain('No stations found');
    });
  });
});
