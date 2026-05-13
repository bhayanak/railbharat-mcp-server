import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig, getSourceAvailability, formatSourceHints } from '../src/config.js';

describe('config', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  describe('loadConfig', () => {
    it('should load defaults when no env vars set', () => {
      vi.stubEnv('RAILBHARAT_MCP_RAPIDAPI_KEY', '');
      vi.stubEnv('RAILBHARAT_MCP_DATAGOV_KEY', '');
      vi.stubEnv('RAILBHARAT_MCP_INDIANRAIL_KEY', '');
      const config = loadConfig();
      expect(config.rapidApiKey).toBe('');
      expect(config.rapidApiHost).toBe('irctc1.p.rapidapi.com');
      expect(config.cacheTtlMs).toBe(300000);
      expect(config.timeoutMs).toBe(15000);
      expect(config.overpassApiUrl).toBe('https://overpass-api.de/api/interpreter');
    });

    it('should load from env vars', () => {
      vi.stubEnv('RAILBHARAT_MCP_RAPIDAPI_KEY', 'test-key');
      vi.stubEnv('RAILBHARAT_MCP_RAPIDAPI_HOST', 'custom.host.com');
      vi.stubEnv('RAILBHARAT_MCP_CACHE_TTL_MS', '60000');
      vi.stubEnv('RAILBHARAT_MCP_TIMEOUT_MS', '5000');
      const config = loadConfig();
      expect(config.rapidApiKey).toBe('test-key');
      expect(config.rapidApiHost).toBe('custom.host.com');
      expect(config.cacheTtlMs).toBe(60000);
      expect(config.timeoutMs).toBe(5000);
    });
  });

  describe('getSourceAvailability', () => {
    it('should detect available sources', () => {
      const config = loadConfig();
      config.rapidApiKey = 'key';
      config.indianRailApiKey = 'key';
      const avail = getSourceAvailability(config);
      expect(avail.irctcApi).toBe(true);
      expect(avail.indianRailApi).toBe(true);
      expect(avail.overpassApi).toBe(true);
      expect(avail.dataGovApi).toBe(true);
    });

    it('should detect unavailable sources', () => {
      const config = loadConfig();
      config.rapidApiKey = '';
      config.indianRailApiKey = '';
      const avail = getSourceAvailability(config);
      expect(avail.irctcApi).toBe(false);
      expect(avail.indianRailApi).toBe(false);
      expect(avail.overpassApi).toBe(true);
    });
  });

  describe('formatSourceHints', () => {
    it('should return hints for unconfigured sources', () => {
      const hints = formatSourceHints({
        irctcApi: false,
        indianRailApi: false,
        overpassApi: true,
        dataGovApi: true,
      });
      expect(hints).toContain('RAILBHARAT_MCP_RAPIDAPI_KEY');
      expect(hints).toContain('RAILBHARAT_MCP_INDIANRAIL_KEY');
    });
  });
});
