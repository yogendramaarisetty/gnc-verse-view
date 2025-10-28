/**
 * Enhanced Search Cache Service
 * 
 * Provides robust caching for search results with:
 * - TTL management
 * - Size limits with LRU eviction
 * - Persistence across sessions
 * - Cache statistics
 * - Invalidation strategies
 */

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  hits: number
  lastAccessed: number
  size: number
  tags?: string[]
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  missRate: number
  averageAccessTime: number
  oldestEntry: number
  newestEntry: number
}

export interface CacheConfig {
  maxSize: number
  maxEntries: number
  defaultTTL: number
  enablePersistence: boolean
  enableStatistics: boolean
  enableCompression: boolean
}

export class SearchCacheService {
  private cache = new Map<string, CacheEntry>()
  private accessOrder: string[] = []
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    totalAccessTime: 0
  }
  
  private config: CacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 1000,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    enablePersistence: true,
    enableStatistics: true,
    enableCompression: false
  }

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...this.config, ...config }
    this.loadFromStorage()
    this.setupCleanupInterval()
  }

  /**
   * Get cached data by key
   */
  get<T>(key: string): T | null {
    const startTime = performance.now()
    this.stats.totalRequests++

    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.delete(key)
      this.stats.misses++
      return null
    }

    // Update access tracking
    this.updateAccess(key)
    entry.hits++
    entry.lastAccessed = Date.now()

    const accessTime = performance.now() - startTime
    this.stats.totalAccessTime += accessTime
    this.stats.hits++

    return entry.data as T
  }

  /**
   * Set cached data with optional TTL and tags
   */
  set<T>(
    key: string, 
    data: T, 
    ttl?: number, 
    tags?: string[]
  ): void {
    const size = this.calculateSize(data)
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      hits: 0,
      lastAccessed: Date.now(),
      size,
      tags
    }

    // Check if we need to evict entries
    this.evictIfNeeded(key, size)

    this.cache.set(key, entry)
    this.updateAccess(key)
    
    // Persist to storage if enabled
    if (this.config.enablePersistence) {
      this.saveToStorage()
    }
  }

  /**
   * Delete cached data by key
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      
      if (this.config.enablePersistence) {
        this.saveToStorage()
      }
      return true
    }
    return false
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      totalAccessTime: 0
    }
    
    if (this.config.enablePersistence) {
      this.saveToStorage()
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    return entry !== undefined && !this.isExpired(entry)
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values())
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0)
    const timestamps = entries.map(entry => entry.timestamp)
    
    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate: this.stats.totalRequests > 0 ? this.stats.hits / this.stats.totalRequests : 0,
      missRate: this.stats.totalRequests > 0 ? this.stats.misses / this.stats.totalRequests : 0,
      averageAccessTime: this.stats.hits > 0 ? this.stats.totalAccessTime / this.stats.hits : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    }
  }

  /**
   * Invalidate cache by tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidated = 0
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      if (this.delete(key)) {
        invalidated++
      }
    })

    return invalidated
  }

  /**
   * Invalidate expired entries
   */
  invalidateExpired(): number {
    let invalidated = 0
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      if (this.delete(key)) {
        invalidated++
      }
    })

    return invalidated
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get cache size in bytes
   */
  getSize(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0)
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const ttl = this.config.defaultTTL
    return Date.now() - entry.timestamp > ttl
  }

  /**
   * Calculate approximate size of data
   */
  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2 // Rough estimate
    } catch {
      return 1024 // Default size if serialization fails
    }
  }

  /**
   * Update access order for LRU
   */
  private updateAccess(key: string): void {
    this.removeFromAccessOrder(key)
    this.accessOrder.push(key)
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  /**
   * Evict entries if cache is full
   */
  private evictIfNeeded(newKey: string, newSize: number): void {
    const currentSize = this.getSize()
    const currentEntries = this.cache.size

    // Check if we need to evict based on size
    if (currentSize + newSize > this.config.maxSize) {
      this.evictBySize(newSize)
    }

    // Check if we need to evict based on entry count
    if (currentEntries >= this.config.maxEntries) {
      this.evictByCount()
    }
  }

  /**
   * Evict entries by size (LRU)
   */
  private evictBySize(requiredSpace: number): void {
    let freedSpace = 0
    
    while (freedSpace < requiredSpace && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder[0]
      const entry = this.cache.get(oldestKey)
      
      if (entry) {
        freedSpace += entry.size
        this.delete(oldestKey)
      }
    }
  }

  /**
   * Evict entries by count (LRU)
   */
  private evictByCount(): void {
    const toEvict = Math.ceil(this.config.maxEntries * 0.1) // Evict 10%
    
    for (let i = 0; i < toEvict && this.accessOrder.length > 0; i++) {
      const oldestKey = this.accessOrder[0]
      this.delete(oldestKey)
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (!this.config.enablePersistence || typeof window === 'undefined') {
      return
    }

    try {
      const stored = localStorage.getItem('search-cache')
      if (stored) {
        const data = JSON.parse(stored)
        this.cache = new Map(data.cache || [])
        this.accessOrder = data.accessOrder || []
        this.stats = data.stats || this.stats
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (!this.config.enablePersistence || typeof window === 'undefined') {
      return
    }

    try {
      const data = {
        cache: Array.from(this.cache.entries()),
        accessOrder: this.accessOrder,
        stats: this.stats,
        timestamp: Date.now()
      }
      localStorage.setItem('search-cache', JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save cache to storage:', error)
    }
  }

  /**
   * Setup periodic cleanup
   */
  private setupCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.invalidateExpired()
    }, 5 * 60 * 1000)
  }
}

// Global cache instance
export const searchCache = new SearchCacheService({
  maxSize: 25 * 1024 * 1024, // 25MB
  maxEntries: 500,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  enablePersistence: true,
  enableStatistics: true
})

// Cache utility functions
export const cacheUtils = {
  /**
   * Create cache key for search
   */
  createSearchKey: (query: string, language?: string, limit?: number, offset?: number): string => {
    return `search:${query.toLowerCase()}:${language || 'all'}:${limit || 20}:${offset || 0}`
  },

  /**
   * Create cache key for song details
   */
  createSongKey: (songId: string): string => {
    return `song:${songId}`
  },

  /**
   * Create cache key for trending songs
   */
  createTrendingKey: (language?: string, limit?: number): string => {
    return `trending:${language || 'all'}:${limit || 20}`
  },

  /**
   * Clear all search-related cache
   */
  clearSearchCache: (): void => {
    searchCache.invalidateByTags(['search'])
  },

  /**
   * Clear all song-related cache
   */
  clearSongCache: (): void => {
    searchCache.invalidateByTags(['song'])
  },

  /**
   * Clear cache by query pattern
   */
  clearCacheByQuery: (query: string): void => {
    const keys = searchCache.keys()
    const pattern = query.toLowerCase()
    keys.forEach(key => {
      if (key.includes(pattern)) {
        searchCache.delete(key)
      }
    })
  },

  /**
   * Clear cache by language
   */
  clearCacheByLanguage: (language: string): void => {
    const keys = searchCache.keys()
    keys.forEach(key => {
      if (key.includes(`:${language}:`)) {
        searchCache.delete(key)
      }
    })
  },

  /**
   * Clear expired cache entries
   */
  clearExpiredCache: (): number => {
    return searchCache.invalidateExpired()
  },

  /**
   * Clear cache by age (older than specified minutes)
   */
  clearCacheByAge: (minutes: number): number => {
    const cutoffTime = Date.now() - (minutes * 60 * 1000)
    const keys = searchCache.keys()
    let cleared = 0
    
    keys.forEach(key => {
      const entry = searchCache.cache.get(key)
      if (entry && entry.timestamp < cutoffTime) {
        if (searchCache.delete(key)) {
          cleared++
        }
      }
    })
    
    return cleared
  },

  /**
   * Get cache health metrics
   */
  getCacheHealth: () => {
    const stats = searchCache.getStats()
    const health = {
      score: 0,
      issues: [] as string[],
      recommendations: [] as string[]
    }

    // Calculate health score
    if (stats.hitRate > 0.8) health.score += 40
    else if (stats.hitRate > 0.5) health.score += 20
    else health.score += 0

    if (stats.totalSize < 10 * 1024 * 1024) health.score += 30 // < 10MB
    else if (stats.totalSize < 50 * 1024 * 1024) health.score += 20 // < 50MB
    else health.score += 10

    if (stats.averageAccessTime < 1) health.score += 30 // < 1ms
    else if (stats.averageAccessTime < 5) health.score += 20 // < 5ms
    else health.score += 10

    // Identify issues
    if (stats.hitRate < 0.3) {
      health.issues.push('Low cache hit rate')
      health.recommendations.push('Consider increasing cache TTL or improving cache keys')
    }

    if (stats.totalSize > 100 * 1024 * 1024) {
      health.issues.push('Large cache size')
      health.recommendations.push('Consider reducing cache size or implementing compression')
    }

    if (stats.averageAccessTime > 10) {
      health.issues.push('Slow cache access')
      health.recommendations.push('Consider optimizing cache implementation')
    }

    return health
  }
}
