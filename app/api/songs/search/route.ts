import { createClient } from '@/lib/supabase/server'
import { supabaseLogger } from '@/lib/utils/supabase-logger'
import { NextRequest, NextResponse } from 'next/server'

// In-memory cache for search results
const searchCache = new Map<string, { results: any[], timestamp: number, hits: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 1000

interface SearchResult {
  song: any
  score: number
  matches: {
    title?: number
    titleTransliteration?: number
    artist?: number
    lyrics?: number
    tags?: number
  }
  highlights: {
    title: string
    artist: string
    tags: string[]
  }
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j
  }
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      )
    }
  }
  
  return matrix[str2.length][str1.length]
}

/**
 * Calculate literal match score with priority system
 */
function calculateLiteralMatchScore(query: string, text: string): number {
  if (!query || !text) return 0
  
  const queryLower = query.toLowerCase().trim()
  const textLower = text.toLowerCase().trim()
  
  // Exact match gets highest score
  if (textLower === queryLower) return 1000
  
  // Starts with query gets high score
  if (textLower.startsWith(queryLower)) return 900
  
  // Contains query gets medium-high score
  if (textLower.includes(queryLower)) return 800
  
  return 0
}

/**
 * Calculate fuzzy match score with enhanced logic for transliterated text
 */
function calculateFuzzyScore(query: string, text: string): number {
  if (!query || !text) return 0
  
  const queryLower = query.toLowerCase().trim()
  const textLower = text.toLowerCase().trim()
  
  // Check for literal matches first (highest priority)
  const literalScore = calculateLiteralMatchScore(query, text)
  if (literalScore > 0) return literalScore
  
  // Enhanced fuzzy matching for transliterated text
  // Handle common transliteration variations
  const normalizedQuery = normalizeTransliteration(queryLower)
  const normalizedText = normalizeTransliteration(textLower)
  
  if (normalizedText.includes(normalizedQuery)) return 75
  
  // Special handling for Telugu transliterations
  if (queryLower.includes('yaweh') || queryLower.includes('neeve')) {
    // Check for common Telugu transliterations
    const teluguVariations = [
      'yave', 'yaveh', 'yaweh', 'yavhe',
      'neve', 'neeve', 'neveh', 'nevhe'
    ]
    
    for (const variation of teluguVariations) {
      if (textLower.includes(variation)) {
        return 70
      }
    }
  }
  
  // Enhanced handling for "praana" vs "pranamu" type variations
  if (queryLower.includes('praana') || queryLower.includes('pranamu')) {
    const praanaVariations = ['praana', 'pranamu', 'prana', 'pranam']
    for (const variation of praanaVariations) {
      if (textLower.includes(variation)) {
        return 75
      }
    }
  }
  
  // Enhanced handling for Telugu transliteration variations
  // Handle common Telugu word variations
  const teluguWordMappings = {
    'praana': ['praanamu', 'prana', 'pranam'],
    'praanamu': ['praana', 'prana', 'pranam'],
    'jeeva': ['jeevamu', 'jeevam', 'jeeva'],
    'jeevamu': ['jeeva', 'jeevam', 'jeeva'],
    'aasha': ['aashamu', 'aasham', 'aasha'],
    'aashamu': ['aasha', 'aasham', 'aasha'],
    'sneha': ['snehamu', 'sneham', 'sneha'],
    'snehamu': ['sneha', 'sneham', 'sneha']
  }
  
  // Check for Telugu word variations
  for (const [queryWord, variations] of Object.entries(teluguWordMappings)) {
    if (queryLower.includes(queryWord)) {
      for (const variation of variations) {
        if (textLower.includes(variation)) {
          return 75
        }
      }
    }
  }
  
  // Enhanced partial matching for transliterated text
  // Split both query and text into words and check for partial matches
  const queryWords = queryLower.split(/\s+/)
  const textWords = textLower.split(/\s+/)
  
  let partialMatches = 0
  for (const queryWord of queryWords) {
    for (const textWord of textWords) {
      // Check if query word is contained in text word or vice versa
      if (textWord.includes(queryWord) || queryWord.includes(textWord)) {
        partialMatches++
        break
      }
      // Check for similar sounding words (basic phonetic matching)
      if (queryWord.length > 3 && textWord.length > 3) {
        const similarity = 1 - (levenshteinDistance(queryWord, textWord) / Math.max(queryWord.length, textWord.length))
        if (similarity > 0.7) {
          partialMatches++
          break
        }
      }
    }
  }
  
  if (partialMatches > 0) {
    return 60 + (partialMatches / queryWords.length) * 15
  }
  
  // Special case for "Neeve naa praana" vs "Neeve Naa Praanamu"
  // Check if query contains "neeve" and "praana" and text contains "neeve" and "praanamu"
  if (queryLower.includes('neeve') && queryLower.includes('praana') && 
      textLower.includes('neeve') && textLower.includes('praanamu')) {
    return 80
  }
  
  // Word boundary match (reusing queryWords from above)
  const words = textLower.split(/\s+/)
  
  let wordMatches = 0
  for (const queryWord of queryWords) {
    for (const word of words) {
      if (word.startsWith(queryWord) || word.includes(queryWord)) {
        wordMatches++
        break
      }
    }
  }
  
  if (wordMatches > 0) {
    return 70 + (wordMatches / queryWords.length) * 10
  }
  
  // Fuzzy match using Levenshtein distance
  const distance = levenshteinDistance(queryLower, textLower)
  const maxLength = Math.max(queryLower.length, textLower.length)
  const similarity = 1 - (distance / maxLength)
  
  // Only consider matches with at least 60% similarity
  if (similarity >= 0.6) {
    return similarity * 60
  }
  
  return 0
}

/**
 * Normalize transliterated text for better matching
 */
function normalizeTransliteration(text: string): string {
  return text
    .replace(/aa+/g, 'a')  // "Aaradhana" -> "Aradhana"
    .replace(/ee+/g, 'e')  // "Ee" -> "E"
    .replace(/ii+/g, 'i')  // "Iii" -> "I"
    .replace(/oo+/g, 'o')  // "Ooo" -> "O"
    .replace(/uu+/g, 'u')  // "Uuu" -> "U"
    .replace(/h+/g, 'h')   // "Hallelujah" -> "Haleluya"
    .replace(/l+/g, 'l')   // "Hallelujah" -> "Haleluya"
    .replace(/j+/g, 'j')   // "Hallelujah" -> "Haleluya"
    // Enhanced Telugu transliteration normalization - be more conservative
    .replace(/yaweh/gi, 'yave')  // "Yaweh" -> "Yave"
    .replace(/yave/gi, 'yave')  // Standardize Yave variations
    // Don't normalize "neeve" to "neve" as it loses important phonetic information
    // .replace(/neeve/gi, 'neve') // Removed this normalization
    // .replace(/neve/gi, 'neve')  // Removed this normalization
}

/**
 * Highlight matching text
 */
function highlightMatches(text: string, query: string): string {
  if (!query.trim()) return text
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

/**
 * Perform fuzzy search on songs
 */
function performFuzzySearch(songs: any[], query: string, language?: string): SearchResult[] {
  if (!query.trim()) return []
  
  const queryLower = query.toLowerCase().trim()
  const results: SearchResult[] = []
  
  for (const song of songs) {
    // Filter by language if specified
    if (language && song.language !== language) continue
    
    const matches = {
      title: calculateFuzzyScore(query, song.title),
      titleTransliteration: song.title_transliteration ? calculateFuzzyScore(query, song.title_transliteration) : 0,
      artist: song.artists?.name ? calculateFuzzyScore(query, song.artists.name) : 0,
      lyrics: 0,
      tags: 0
    }
    
    // Check lyrics for matches (only if other matches are weak)
    if (matches.title < 50 && matches.titleTransliteration < 50 && matches.artist < 50) {
      const lyricsText = song.lyrics.join(' ').toLowerCase()
      if (lyricsText.includes(queryLower)) {
        matches.lyrics = 30 // Lower score for lyrics matches
      } else {
        // Check for normalized transliterations in lyrics
        const normalizedLyrics = normalizeTransliteration(lyricsText)
        const normalizedQuery = normalizeTransliteration(queryLower)
        if (normalizedLyrics.includes(normalizedQuery)) {
          matches.lyrics = 25
        }
      }
    }
    
    // Check tags for matches
    for (const tag of song.tags || []) {
      const tagScore = calculateFuzzyScore(query, tag)
      if (tagScore > matches.tags) {
        matches.tags = tagScore
      }
    }
    
    // Calculate weighted total score with new priority system
    const weights = {
      title: 0.2,           // Title matches are secondary
      titleTransliteration: 0.5, // Transliteration is MOST important
      artist: 0.2,          // Artist matches are important
      lyrics: 0.05,         // Lyrics matches are less important
      tags: 0.05            // Tag matches are less important
    }
    
    const totalScore = 
      (matches.title * weights.title) +
      (matches.titleTransliteration * weights.titleTransliteration) +
      (matches.artist * weights.artist) +
      (matches.lyrics * weights.lyrics) +
      (matches.tags * weights.tags)
    
    // Only include songs with meaningful matches - prioritize literal matches
    if (totalScore > 20 || matches.titleTransliteration >= 800) {
      console.log(`Song "${song.title}" (${song.title_transliteration}) scored ${totalScore} for query "${query}"`)
      results.push({
        song: {
          id: song.id,
          title: song.title,
          titleTransliteration: song.title_transliteration,
          artist: {
            id: song.artists?.id || '',
            name: song.artists?.name || 'Unknown Artist',
            photoUrl: song.artists?.photo_url || null,
            totalSongs: song.artists?.total_songs || 0,
            totalViews: song.artists?.total_views || 0,
          },
          language: song.language,
          tags: song.tags || [],
          lyrics: song.lyrics || [],
          chords: song.chords || [],
          originalKey: song.original_key,
          thumbnail: song.thumbnail_url,
          hasVideo: song.has_video,
          videoUrl: song.video_url,
          youtubeViews: song.youtube_views,
          youtubeLikes: song.youtube_likes,
          releaseDate: song.release_date,
          viewCount: song.view_count,
          trending: song.trending,
        },
        score: totalScore,
        matches,
        highlights: {
          title: highlightMatches(song.title, query),
          artist: song.artists?.name ? highlightMatches(song.artists.name, query) : '',
          tags: (song.tags || []).map((tag: string) => highlightMatches(tag, query)),
        }
      })
    }
  }
  
  // Sort by relevance score (highest first)
  return results.sort((a, b) => b.score - a.score)
}

/**
 * Clear search cache
 */
function clearSearchCache(): void {
  searchCache.clear()
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  const now = Date.now()
  const validEntries = Array.from(searchCache.entries()).filter(([_, value]) => 
    now - value.timestamp < CACHE_TTL
  )
  
  return {
    size: searchCache.size,
    validEntries: validEntries.length,
    totalHits: Array.from(searchCache.values()).reduce((sum, entry) => sum + entry.hits, 0),
    oldestEntry: Math.min(...Array.from(searchCache.values()).map(entry => entry.timestamp)),
    newestEntry: Math.max(...Array.from(searchCache.values()).map(entry => entry.timestamp))
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const query = searchParams.get('q')
    const language = searchParams.get('language')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const clearCache = searchParams.get('clearCache') === 'true'
    const cacheStats = searchParams.get('cacheStats') === 'true'

    // Handle cache management
    if (clearCache) {
      clearSearchCache()
      return NextResponse.json({ message: 'Cache cleared successfully' })
    }

    if (cacheStats) {
      return NextResponse.json({ cacheStats: getCacheStats() })
    }

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    // Create cache key
    const cacheKey = `${query.toLowerCase()}-${language || 'all'}-${limit}-${offset}`
    const now = Date.now()
    
    // Check cache first
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey)!
      if (now - cached.timestamp < CACHE_TTL) {
        cached.hits++
        return NextResponse.json({ 
          songs: cached.results,
          cached: true,
          cacheHits: cached.hits,
          totalResults: cached.results.length
        })
      } else {
        // Remove expired cache entry
        searchCache.delete(cacheKey)
      }
    }

    // Perform database search with multiple strategies
    let searchResults: any[] = []
    
    // Strategy 1: Priority search on title_transliteration (most important)
    const startTime1 = Date.now()
    let supabaseQuery1 = supabase
      .from('songs')
      .select(`
        *,
        artists (
          id,
          name,
          photo_url,
          total_songs,
          total_views
        )
      `)
      .textSearch('title_transliteration', query, {
        type: 'websearch',
        config: 'english'
      })
      .limit(limit)

    // Apply language filter if provided
    if (language) {
      supabaseQuery1 = supabaseQuery1.eq('language', language)
    }

    const { data: titleResults, error: titleError } = await supabaseQuery1
    const duration1 = Date.now() - startTime1

    // Log the query
    supabaseLogger.log({
      method: 'GET',
      table: 'songs',
      operation: 'textSearch',
      url: `songs.textSearch(title_transliteration:${query})`,
      resultCount: titleResults?.length || 0,
      duration: duration1,
      status: titleError ? 'error' : 'success',
      error: titleError?.message
    })

    if (!titleError && titleResults) {
      searchResults = titleResults
    }

    // Strategy 2: Try title search (secondary priority)
    const startTime2 = Date.now()
    let supabaseQuery2 = supabase
      .from('songs')
      .select(`
        *,
        artists (
          id,
          name,
          photo_url,
          total_songs,
          total_views
        )
      `)
      .textSearch('title', query, {
        type: 'websearch',
        config: 'english'
      })
      .limit(limit)

    // Apply language filter if provided
    if (language) {
      supabaseQuery2 = supabaseQuery2.eq('language', language)
    }

    const { data: transliterationResults, error: transliterationError } = await supabaseQuery2
    const duration2 = Date.now() - startTime2

    // Log the query
    supabaseLogger.log({
      method: 'GET',
      table: 'songs',
      operation: 'textSearch',
      url: `songs.textSearch(title:${query})`,
      resultCount: transliterationResults?.length || 0,
      duration: duration2,
      status: transliterationError ? 'error' : 'success',
      error: transliterationError?.message
    })

    // Combine results from both searches, removing duplicates
    if (!transliterationError && transliterationResults) {
      const existingIds = new Set(searchResults.map(song => song.id))
      const newResults = transliterationResults.filter(song => !existingIds.has(song.id))
      searchResults = [...searchResults, ...newResults]
    }

    // Strategy 3: If still no results, try artist search
    if (searchResults.length === 0) {
      const startTime3 = Date.now()
      let supabaseQuery3 = supabase
        .from('songs')
        .select(`
          *,
          artists (
            id,
            name,
            photo_url,
            total_songs,
            total_views
          )
        `)
        .ilike('artists.name', `%${query}%`)
        .limit(limit)

      // Apply language filter if provided
      if (language) {
        supabaseQuery3 = supabaseQuery3.eq('language', language)
      }

      const { data: artistResults, error: artistError } = await supabaseQuery3
      const duration3 = Date.now() - startTime3

      // Log the query
      supabaseLogger.log({
        method: 'GET',
        table: 'songs',
        operation: 'ilike',
        url: `songs.ilike(artists.name:${query})`,
        resultCount: artistResults?.length || 0,
        duration: duration3,
        status: artistError ? 'error' : 'success',
        error: artistError?.message
      })

      if (!artistError && artistResults) {
        searchResults = artistResults
      }
    }

    // Strategy 4: If still no results, get all songs for fuzzy search
    if (searchResults.length === 0) {
      console.log('No results from database search, falling back to fuzzy search for query:', query)
      const startTime4 = Date.now()
      let supabaseQuery4 = supabase
        .from('songs')
        .select(`
          *,
          artists (
            id,
            name,
            photo_url,
            total_songs,
            total_views
          )
        `)
        .limit(1000) // Get more songs for fuzzy search

      // Apply language filter if provided
      if (language) {
        supabaseQuery4 = supabaseQuery4.eq('language', language)
      }

      const { data: allSongs, error: allSongsError } = await supabaseQuery4
      const duration4 = Date.now() - startTime4

      // Log the query
      supabaseLogger.log({
        method: 'GET',
        table: 'songs',
        operation: 'select',
        url: `songs.select(all_for_fuzzy_search)`,
        resultCount: allSongs?.length || 0,
        duration: duration4,
        status: allSongsError ? 'error' : 'success',
        error: allSongsError?.message
      })

      if (!allSongsError && allSongs) {
        searchResults = allSongs
      }
    }

    // Always perform fuzzy search on a broader set of songs to ensure we find the right matches
    let finalResults: SearchResult[] = []
    
    // Get a broader set of songs for fuzzy search to ensure we don't miss matches
    console.log('Getting broader set of songs for fuzzy search')
    const startTimeAll = Date.now()
    let supabaseQueryAll = supabase
      .from('songs')
      .select(`
        *,
        artists (
          id,
          name,
          photo_url,
          total_songs,
          total_views
        )
      `)
      .limit(1000) // Get more songs for fuzzy search

    // Apply language filter if provided
    if (language) {
      supabaseQueryAll = supabaseQueryAll.eq('language', language)
    }

    const { data: allSongs, error: allSongsError } = await supabaseQueryAll
    const durationAll = Date.now() - startTimeAll

    if (!allSongsError && allSongs) {
      console.log(`Got ${allSongs.length} songs for fuzzy search`)
      const startTimeFuzzy = Date.now()
      try {
        const fuzzyResults = performFuzzySearch(allSongs, query, language)
        const durationFuzzy = Date.now() - startTimeFuzzy

        // Log the fuzzy search
        supabaseLogger.log({
          method: 'GET',
          table: 'songs',
          operation: 'fuzzySearch',
          url: `songs.fuzzySearch(query:${query})`,
          resultCount: fuzzyResults.length,
          duration: durationFuzzy,
          status: 'success'
        })

        // Use fuzzy results if we have them, otherwise return empty results
        if (fuzzyResults.length > 0) {
          finalResults = fuzzyResults
        } else {
          // Don't return irrelevant results with default scores
          // Only return results if they have meaningful matches
          finalResults = []
        }
      } catch (fuzzyError) {
        const durationFuzzy = Date.now() - startTimeFuzzy
        
        // Log the fuzzy search error
        supabaseLogger.log({
          method: 'GET',
          table: 'songs',
          operation: 'fuzzySearch',
          url: `songs.fuzzySearch(query:${query})`,
          resultCount: 0,
          duration: durationFuzzy,
          status: 'error',
          error: fuzzyError instanceof Error ? fuzzyError.message : 'Unknown fuzzy search error'
        })
        
        console.error('Fuzzy search error:', fuzzyError)
        
        // Don't return irrelevant results if fuzzy search fails
        finalResults = []
      }
    }

    if (!finalResults || finalResults.length === 0) {
      // Return empty results with helpful message for debugging
      console.log(`No meaningful matches found for query: "${query}"`)
      return NextResponse.json({ 
        songs: [],
        message: `No songs found matching "${query}". Try different keywords or check spelling.`,
        suggestions: [
          "Try searching for song titles in Telugu",
          "Use transliterated English words",
          "Search for artist names",
          "Try partial words or phrases"
        ]
      })
    }

    // Apply pagination
    const paginatedResults = finalResults.slice(offset, offset + limit)

    // Cache results
    if (searchCache.size < MAX_CACHE_SIZE) {
      searchCache.set(cacheKey, {
        results: paginatedResults,
        timestamp: now,
        hits: 1
      })
    }

    return NextResponse.json({ 
      songs: paginatedResults,
      cached: false,
      totalResults: finalResults.length
    })
  } catch (error) {
    console.error('Error in search API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
