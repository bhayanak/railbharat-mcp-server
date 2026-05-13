import { describe, it, expect } from 'vitest';
import {
  resolveStationCode,
  searchStations,
  formatStationDisplay,
  getAllStations,
} from '../src/utils/station-codes.js';

describe('station-codes', () => {
  describe('resolveStationCode', () => {
    it('should resolve by exact code', () => {
      const station = resolveStationCode('NDLS');
      expect(station).toBeDefined();
      expect(station!.code).toBe('NDLS');
      expect(station!.name).toBe('New Delhi');
    });

    it('should resolve by exact name (case-insensitive)', () => {
      const station = resolveStationCode('new delhi');
      expect(station).toBeDefined();
      expect(station!.code).toBe('NDLS');
    });

    it('should resolve by lowercase code', () => {
      const station = resolveStationCode('hwh');
      expect(station).toBeDefined();
      expect(station!.code).toBe('HWH');
    });

    it('should return undefined for unknown stations', () => {
      expect(resolveStationCode('ZZZZZ')).toBeUndefined();
    });
  });

  describe('searchStations', () => {
    it('should find stations by partial name', () => {
      const results = searchStations('Delhi');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((s) => s.code === 'NDLS')).toBe(true);
    });

    it('should find stations by partial code', () => {
      const results = searchStations('NDL');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('NDLS');
    });

    it('should handle fuzzy matches', () => {
      const results = searchStations('Mumbai');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((s) => s.code === 'BCT')).toBe(true);
    });

    it('should return empty for very short queries', () => {
      expect(searchStations('a')).toHaveLength(0);
    });

    it('should limit results to 20', () => {
      const results = searchStations('Junction');
      expect(results.length).toBeLessThanOrEqual(20);
    });
  });

  describe('formatStationDisplay', () => {
    it('should format station with zone', () => {
      const result = formatStationDisplay({
        code: 'NDLS',
        name: 'New Delhi',
        zone: 'NR',
      });
      expect(result).toBe('New Delhi (NDLS) [NR]');
    });

    it('should format station without zone', () => {
      const result = formatStationDisplay({
        code: 'NDLS',
        name: 'New Delhi',
      });
      expect(result).toBe('New Delhi (NDLS)');
    });
  });

  describe('getAllStations', () => {
    it('should return a copy of all stations', () => {
      const stations = getAllStations();
      expect(stations.length).toBeGreaterThan(50);
      expect(stations[0]).toHaveProperty('code');
      expect(stations[0]).toHaveProperty('name');
    });
  });
});
