import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cache } from '../src/utils/cache.js';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache(1000);
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should expire entries after TTL', () => {
    vi.useFakeTimers();
    cache.set('key1', 'value1', 100);
    expect(cache.get('key1')).toBe('value1');
    vi.advanceTimersByTime(101);
    expect(cache.get('key1')).toBeUndefined();
    vi.useRealTimers();
  });

  it('should check if key exists', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should delete entries', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
  });

  it('should count valid entries', () => {
    vi.useFakeTimers();
    cache.set('key1', 'value1', 1000);
    cache.set('key2', 'value2', 50);
    expect(cache.size()).toBe(2);
    vi.advanceTimersByTime(51);
    expect(cache.size()).toBe(1);
    vi.useRealTimers();
  });

  it('should use custom TTL per entry', () => {
    vi.useFakeTimers();
    cache.set('short', 'val', 50);
    cache.set('long', 'val', 500);
    vi.advanceTimersByTime(51);
    expect(cache.get('short')).toBeUndefined();
    expect(cache.get('long')).toBe('val');
    vi.useRealTimers();
  });
});
