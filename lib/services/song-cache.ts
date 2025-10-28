"use client"

import type { Song } from '@/lib/types'

// Lightweight song metadata for caching
export interface SongMetadata {
  id: string
  title: string
  titleTransliteration?: string
  artist: {
    id: string
    name: string
  }
  language: string
  tags: string[]
  originalKey: string
  thumbnail: string
  hasVideo: boolean
  viewCount: number
  trending: boolean
}

// Cache configuration
const CACHE_CONFIG = {
  MAX_SONGS: 200, // Maximum songs to cache (increased for better coverage)
  MAX_AGE: 30 * 60 * 1000, // 30 minutes in milliseconds
  SEARCH_LIMIT: 50, // Maximum search results to return
  FULL_SONG_CACHE_SIZE: 20, // Maximum full songs with lyrics/chords to cache
}

class SongCacheService {
  private cache: Map<string, SongMetadata> = new Map()
  private cacheTimestamps: Map<string, number> = new Map()
  private fullSongCache: Map<string, Song> = new Map()
  private fullSongTimestamps: Map<string, number> = new Map()
  private lastFullSync: number = 0

  // Convert full song to lightweight metadata
  private toMetadata(song: Song): SongMetadata {
    return {
      id: song.id,
      title: song.title,
      titleTransliteration: song.titleTransliteration,
      artist: {
        id: song.artist.id,
        name: song.artist.name,
      },
      language: song.language,
      tags: song.tags,
      originalKey: song.originalKey,
      thumbnail: song.thumbnail,
      hasVideo: song.hasVideo,
      viewCount: song.viewCount,
      trending: song.trending,
    }
  }

  // Add songs to cache
  addSongs(songs: Song[]): void {
    const now = Date.now()
    
    songs.forEach(song => {
      const metadata = this.toMetadata(song)
      this.cache.set(song.id, metadata)
      this.cacheTimestamps.set(song.id, now)
    })

    // Clean up old entries if cache is too large
    this.cleanup()
  }

  // Search in cache
  search(query: string, language?: string): SongMetadata[] {
    const normalizedQuery = query.toLowerCase().trim()
    if (!normalizedQuery) return []

    const results: SongMetadata[] = []
    const now = Date.now()

    for (const [id, song] of this.cache) {
      // Check if cache entry is still valid
      const timestamp = this.cacheTimestamps.get(id)
      if (!timestamp || (now - timestamp) > CACHE_CONFIG.MAX_AGE) {
        continue
      }

      // Apply language filter if specified
      if (language && song.language !== language) {
        continue
      }

      // Search in title, transliteration, artist name, tags
      const searchableText = [
        song.title,
        song.titleTransliteration,
        song.artist.name,
        ...song.tags
      ].filter(Boolean).join(' ').toLowerCase()

      if (searchableText.includes(normalizedQuery)) {
        results.push(song)
      }
    }

    // Sort by relevance and popularity
    return results
      .sort((a, b) => {
        // Prioritize exact title matches
        const aTitleMatch = a.title.toLowerCase().includes(normalizedQuery)
        const bTitleMatch = b.title.toLowerCase().includes(normalizedQuery)
        
        if (aTitleMatch && !bTitleMatch) return -1
        if (!aTitleMatch && bTitleMatch) return 1
        
        // Then by trending status
        if (a.trending && !b.trending) return -1
        if (!a.trending && b.trending) return 1
        
        // Finally by view count
        return b.viewCount - a.viewCount
      })
      .slice(0, CACHE_CONFIG.SEARCH_LIMIT)
  }

  // Get song by ID from cache
  getSong(id: string): SongMetadata | null {
    const timestamp = this.cacheTimestamps.get(id)
    const now = Date.now()
    
    if (!timestamp || (now - timestamp) > CACHE_CONFIG.MAX_AGE) {
      return null
    }

    return this.cache.get(id) || null
  }

  // Add full song with lyrics and chords to cache
  addFullSong(song: Song): void {
    const now = Date.now()
    this.fullSongCache.set(song.id, song)
    this.fullSongTimestamps.set(song.id, now)
    
    // Also add metadata to regular cache
    this.addSongs([song])
    
    // Clean up old full songs if cache is too large
    this.cleanupFullSongs()
  }

  // Get full song with lyrics and chords from cache
  getFullSong(id: string): Song | null {
    const timestamp = this.fullSongTimestamps.get(id)
    const now = Date.now()
    
    if (!timestamp || (now - timestamp) > CACHE_CONFIG.MAX_AGE) {
      return null
    }

    return this.fullSongCache.get(id) || null
  }

  // Check if full song is cached
  hasFullSong(id: string): boolean {
    const timestamp = this.fullSongTimestamps.get(id)
    const now = Date.now()
    
    return timestamp !== undefined && (now - timestamp) <= CACHE_CONFIG.MAX_AGE
  }

  // Check if cache has enough data for effective search
  isCacheEffective(): boolean {
    const now = Date.now()
    let validEntries = 0

    for (const [id, timestamp] of this.cacheTimestamps) {
      if ((now - timestamp) <= CACHE_CONFIG.MAX_AGE) {
        validEntries++
      }
    }

    return validEntries >= 50 // At least 50 valid entries for effective search
  }

  // Get cache statistics
  getCacheStats(): { total: number; valid: number; size: number; fullSongs: number } {
    const now = Date.now()
    let validEntries = 0
    let validFullSongs = 0

    for (const [id, timestamp] of this.cacheTimestamps) {
      if ((now - timestamp) <= CACHE_CONFIG.MAX_AGE) {
        validEntries++
      }
    }

    for (const [id, timestamp] of this.fullSongTimestamps) {
      if ((now - timestamp) <= CACHE_CONFIG.MAX_AGE) {
        validFullSongs++
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      size: this.getCacheSize(),
      fullSongs: validFullSongs
    }
  }

  // Get approximate cache size in bytes
  private getCacheSize(): number {
    let size = 0
    for (const song of this.cache.values()) {
      size += JSON.stringify(song).length
    }
    return size
  }

  // Clean up old and excess entries
  private cleanup(): void {
    const now = Date.now()
    const entriesToDelete: string[] = []

    // Remove expired entries
    for (const [id, timestamp] of this.cacheTimestamps) {
      if ((now - timestamp) > CACHE_CONFIG.MAX_AGE) {
        entriesToDelete.push(id)
      }
    }

    // If still too many entries, remove oldest ones
    if (this.cache.size > CACHE_CONFIG.MAX_SONGS) {
      const sortedEntries = Array.from(this.cacheTimestamps.entries())
        .sort(([, a], [, b]) => a - b)
        .slice(0, this.cache.size - CACHE_CONFIG.MAX_SONGS)
      
      for (const [id] of sortedEntries) {
        entriesToDelete.push(id)
      }
    }

    // Delete selected entries
    entriesToDelete.forEach(id => {
      this.cache.delete(id)
      this.cacheTimestamps.delete(id)
    })
  }

  // Clean up old full songs
  private cleanupFullSongs(): void {
    const now = Date.now()
    const entriesToDelete: string[] = []

    // Remove expired full songs
    for (const [id, timestamp] of this.fullSongTimestamps) {
      if ((now - timestamp) > CACHE_CONFIG.MAX_AGE) {
        entriesToDelete.push(id)
      }
    }

    // If still too many full songs, remove oldest ones
    if (this.fullSongCache.size > CACHE_CONFIG.FULL_SONG_CACHE_SIZE) {
      const sortedEntries = Array.from(this.fullSongTimestamps.entries())
        .sort(([, a], [, b]) => a - b)
        .slice(0, this.fullSongCache.size - CACHE_CONFIG.FULL_SONG_CACHE_SIZE)
      
      for (const [id] of sortedEntries) {
        entriesToDelete.push(id)
      }
    }

    // Delete selected entries
    entriesToDelete.forEach(id => {
      this.fullSongCache.delete(id)
      this.fullSongTimestamps.delete(id)
    })
  }

  // Clear all cache
  clear(): void {
    this.cache.clear()
    this.cacheTimestamps.clear()
    this.fullSongCache.clear()
    this.fullSongTimestamps.clear()
    this.lastFullSync = 0
  }

  // Update last full sync time
  setLastFullSync(): void {
    this.lastFullSync = Date.now()
  }

  // Check if we need a full sync
  needsFullSync(): boolean {
    const now = Date.now()
    return (now - this.lastFullSync) > CACHE_CONFIG.MAX_AGE
  }
}

// Export singleton instance
export const songCache = new SongCacheService()
