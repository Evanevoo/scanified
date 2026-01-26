/**
 * ScanCache - Smart caching for faster lookups
 * 
 * Provides:
 * - LRU (Least Recently Used) cache for scan results
 * - Preloading of frequent barcodes
 * - Cache statistics and monitoring
 * - TTL (Time To Live) for cache entries
 */

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl?: number; // milliseconds
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  missRate: number;
  avgLookupTime: number; // milliseconds
  totalLookups: number;
  evictions: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL?: number; // milliseconds
  preloadSize?: number;
  enableStats: boolean;
}

/**
 * LRU Cache with statistics
 */
export class ScanCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
    lookupTimes: number[];
  };

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 100,
      defaultTTL: undefined,
      preloadSize: 50,
      enableStats: true,
      ...config,
    };

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      lookupTimes: [],
    };
  }

  /**
   * Cache a scan result
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();

    // Check if we need to evict
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now,
      ttl: ttl || this.config.defaultTTL,
    };

    this.cache.set(key, entry);
  }

  /**
   * Get cached result
   */
  get(key: string): T | null {
    const startTime = Date.now();
    
    const entry = this.cache.get(key);

    if (!entry) {
      this.recordMiss(startTime);
      return null;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.recordMiss(startTime);
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.recordHit(startTime);
    return entry.value;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.ttl) return false;

    const now = Date.now();
    const age = now - entry.timestamp;
    
    return age > entry.ttl;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Evict oldest (least recently used) entry
   */
  evictOldest(): void {
    // First entry in Map is the oldest (LRU)
    const oldestKey = this.cache.keys().next().value;
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Evict expired entries
   */
  evictExpired(): number {
    let evicted = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        evicted++;
        this.stats.evictions++;
      }
    }

    return evicted;
  }

  /**
   * Preload frequent barcodes
   */
  async preloadFrequent(
    organizationId: string,
    fetchFunction: (orgId: string, limit: number) => Promise<Array<{ barcode: string; data: T }>>
  ): Promise<number> {
    try {
      const limit = this.config.preloadSize || 50;
      const items = await fetchFunction(organizationId, limit);

      let loaded = 0;
      for (const item of items) {
        this.set(item.barcode, item.data);
        loaded++;
      }

      return loaded;
    } catch (error) {
      console.error('Failed to preload cache:', error);
      return 0;
    }
  }

  /**
   * Batch set multiple entries
   */
  setMany(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    entries.forEach(({ key, value, ttl }) => {
      this.set(key, value, ttl);
    });
  }

  /**
   * Batch get multiple entries
   */
  getMany(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();

    keys.forEach(key => {
      const value = this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    });

    return results;
  }

  /**
   * Record cache hit
   */
  private recordHit(startTime: number): void {
    if (!this.config.enableStats) return;

    this.stats.hits++;
    const lookupTime = Date.now() - startTime;
    this.stats.lookupTimes.push(lookupTime);

    // Keep only last 100 lookup times
    if (this.stats.lookupTimes.length > 100) {
      this.stats.lookupTimes.shift();
    }
  }

  /**
   * Record cache miss
   */
  private recordMiss(startTime: number): void {
    if (!this.config.enableStats) return;

    this.stats.misses++;
    const lookupTime = Date.now() - startTime;
    this.stats.lookupTimes.push(lookupTime);

    if (this.stats.lookupTimes.length > 100) {
      this.stats.lookupTimes.shift();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalLookups = this.stats.hits + this.stats.misses;
    const hitRate = totalLookups > 0 ? this.stats.hits / totalLookups : 0;
    const missRate = totalLookups > 0 ? this.stats.misses / totalLookups : 0;
    
    const avgLookupTime = this.stats.lookupTimes.length > 0
      ? this.stats.lookupTimes.reduce((a, b) => a + b, 0) / this.stats.lookupTimes.length
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitCount: this.stats.hits,
      missCount: this.stats.misses,
      hitRate,
      missRate,
      avgLookupTime,
      totalLookups,
      evictions: this.stats.evictions,
    };
  }

  /**
   * Get most frequently accessed entries
   */
  getMostFrequent(count: number = 10): Array<{ key: string; value: T; accessCount: number }> {
    const entries = Array.from(this.cache.entries());
    
    return entries
      .map(([key, entry]) => ({
        key,
        value: entry.value,
        accessCount: entry.accessCount,
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, count);
  }

  /**
   * Get recently accessed entries
   */
  getRecentlyAccessed(count: number = 10): Array<{ key: string; value: T; lastAccessed: number }> {
    const entries = Array.from(this.cache.entries());
    
    return entries
      .map(([key, entry]) => ({
        key,
        value: entry.value,
        lastAccessed: entry.lastAccessed,
      }))
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, count);
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values
   */
  values(): T[] {
    return Array.from(this.cache.values()).map(entry => entry.value);
  }

  /**
   * Get all entries
   */
  entries(): Array<[string, T]> {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value]);
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if cache is full
   */
  isFull(): boolean {
    return this.cache.size >= this.config.maxSize;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      lookupTimes: [],
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...updates };

    // If max size decreased, evict excess entries
    while (this.cache.size > this.config.maxSize) {
      this.evictOldest();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Export cache data
   */
  export(): Array<{ key: string; value: T; timestamp: number; accessCount: number }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      value: entry.value,
      timestamp: entry.timestamp,
      accessCount: entry.accessCount,
    }));
  }

  /**
   * Import cache data
   */
  import(data: Array<{ key: string; value: T; timestamp?: number; accessCount?: number }>): void {
    data.forEach(item => {
      const entry: CacheEntry<T> = {
        key: item.key,
        value: item.value,
        timestamp: item.timestamp || Date.now(),
        accessCount: item.accessCount || 0,
        lastAccessed: Date.now(),
        ttl: this.config.defaultTTL,
      };
      
      this.cache.set(item.key, entry);
    });

    // Trim to max size if needed
    while (this.cache.size > this.config.maxSize) {
      this.evictOldest();
    }
  }
}

export default ScanCache;
