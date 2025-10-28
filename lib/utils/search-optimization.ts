/**
 * Search Optimization Utilities
 * 
 * This module provides utilities to optimize search functionality
 * and prevent unnecessary API calls while maintaining good UX.
 */

export interface SearchOptimizationConfig {
  debounceMs?: number
  minQueryLength?: number
  maxCacheSize?: number
  cacheTTL?: number
  adaptiveDebounce?: boolean
}

export class SearchOptimizer {
  private debounceTimer: NodeJS.Timeout | null = null
  private abortController: AbortController | null = null
  private pendingRequests = new Set<string>()
  private lastQuery = ''
  private cache = new Map<string, { data: any; timestamp: number; hits: number }>()
  
  private config: Required<SearchOptimizationConfig>
  
  constructor(config: SearchOptimizationConfig = {}) {
    this.config = {
      debounceMs: 300,
      minQueryLength: 1,
      maxCacheSize: 100,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      adaptiveDebounce: true,
      ...config
    }
  }

  /**
   * Check if a query is valid and worth searching
   */
  isValidQuery(query: string): boolean {
    const trimmed = query.trim()
    if (!trimmed || trimmed.length < this.config.minQueryLength) return false
    
    // Skip if query is too similar to last query (fuzzy matching)
    if (this.lastQuery && 
        Math.abs(trimmed.length - this.lastQuery.length) <= 1 &&
        trimmed.toLowerCase().includes(this.lastQuery.toLowerCase())) {
      return false
    }
    
    return true
  }

  /**
   * Get adaptive debounce timing based on query characteristics
   */
  getAdaptiveDebounce(query: string): number {
    if (!this.config.adaptiveDebounce) return this.config.debounceMs
    
    // Shorter debounce for shorter queries (user is likely still typing)
    if (query.length <= 3) {
      return Math.max(this.config.debounceMs * 0.5, 150)
    }
    // Longer debounce for longer queries (user might be done typing)
    else if (query.length >= 10) {
      return Math.min(this.config.debounceMs * 1.5, 600)
    }
    
    return this.config.debounceMs
  }

  /**
   * Check if query is cached and still valid
   */
  getCachedResult(cacheKey: string): any | null {
    if (!this.cache.has(cacheKey)) return null
    
    const cached = this.cache.get(cacheKey)!
    const now = Date.now()
    
    if (now - cached.timestamp < this.config.cacheTTL) {
      cached.hits++
      return cached.data
    } else {
      // Remove expired cache entry
      this.cache.delete(cacheKey)
      return null
    }
  }

  /**
   * Store result in cache with metadata
   */
  setCachedResult(cacheKey: string, data: any): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      hits: 1
    })
    
    // Manage cache size
    this.manageCacheSize()
  }

  /**
   * Manage cache size using LRU-like behavior
   */
  private manageCacheSize(): void {
    if (this.cache.size > this.config.maxCacheSize) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      // Remove oldest 20% of entries
      const toRemove = Math.floor(this.config.maxCacheSize * 0.2)
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0])
      }
    }
  }

  /**
   * Check if request is already pending
   */
  isRequestPending(cacheKey: string): boolean {
    return this.pendingRequests.has(cacheKey)
  }

  /**
   * Mark request as pending
   */
  markRequestPending(cacheKey: string): void {
    this.pendingRequests.add(cacheKey)
  }

  /**
   * Mark request as completed
   */
  markRequestCompleted(cacheKey: string): void {
    this.pendingRequests.delete(cacheKey)
  }

  /**
   * Cancel previous request if still pending
   */
  cancelPreviousRequest(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.abortController = new AbortController()
  }

  /**
   * Get current abort controller
   */
  getAbortController(): AbortController | null {
    return this.abortController
  }

  /**
   * Set debounce timer with adaptive timing
   */
  setDebounceTimer(callback: () => void, query: string): void {
    this.clearDebounceTimer()
    
    const debounceMs = this.getAdaptiveDebounce(query)
    this.debounceTimer = setTimeout(callback, debounceMs)
  }

  /**
   * Clear debounce timer
   */
  clearDebounceTimer(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
  }

  /**
   * Update last query for similarity checking
   */
  updateLastQuery(query: string): void {
    this.lastQuery = query.trim()
  }

  /**
   * Clear all state and cancel requests
   */
  cleanup(): void {
    this.clearDebounceTimer()
    
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    
    this.pendingRequests.clear()
    this.lastQuery = ''
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; hits: number; age: number }> } {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      hits: value.hits,
      age: now - value.timestamp
    }))
    
    return {
      size: this.cache.size,
      entries
    }
  }
}

/**
 * Create a search optimizer instance with default configuration
 */
export function createSearchOptimizer(config?: SearchOptimizationConfig): SearchOptimizer {
  return new SearchOptimizer(config)
}

/**
 * Debounce function with adaptive timing
 */
export function createAdaptiveDebounce(
  fn: (query: string) => void,
  config: SearchOptimizationConfig = {}
): (query: string) => void {
  const optimizer = createSearchOptimizer(config)
  
  return (query: string) => {
    if (!optimizer.isValidQuery(query)) {
      fn('')
      return
    }
    
    optimizer.clearDebounceTimer()
    optimizer.setDebounceTimer(() => {
      optimizer.updateLastQuery(query)
      fn(query)
    }, query)
  }
}

/**
 * Search request manager with cancellation and deduplication
 */
export class SearchRequestManager {
  private optimizer: SearchOptimizer
  
  constructor(config?: SearchOptimizationConfig) {
    this.optimizer = createSearchOptimizer(config)
  }

  async executeSearch<T>(
    query: string,
    searchFn: (query: string, signal: AbortSignal) => Promise<T>,
    cacheKey: string
  ): Promise<T | null> {
    // Check cache first
    const cached = this.optimizer.getCachedResult(cacheKey)
    if (cached) {
      return cached
    }

    // Check if request is already pending
    if (this.optimizer.isRequestPending(cacheKey)) {
      return null
    }

    // Cancel previous request
    this.optimizer.cancelPreviousRequest()
    this.optimizer.markRequestPending(cacheKey)

    try {
      const abortController = this.optimizer.getAbortController()
      const result = await searchFn(query, abortController?.signal || new AbortController().signal)
      
      // Cache the result
      this.optimizer.setCachedResult(cacheKey, result)
      
      return result
    } catch (error) {
      // Don't throw for aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return null
      }
      throw error
    } finally {
      this.optimizer.markRequestCompleted(cacheKey)
    }
  }

  cleanup(): void {
    this.optimizer.cleanup()
  }

  clearCache(): void {
    this.optimizer.clearCache()
  }
}
