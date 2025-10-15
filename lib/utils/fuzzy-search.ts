import type { Song } from '@/lib/types'

export interface SearchResult {
  song: Song
  score: number
  matches: {
    title?: number
    titleTransliteration?: number
    artist?: number
    lyrics?: number
    tags?: number
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
 * Calculate fuzzy match score between query and text
 */
function calculateFuzzyScore(query: string, text: string): number {
  if (!query || !text) return 0
  
  const queryLower = query.toLowerCase().trim()
  const textLower = text.toLowerCase().trim()
  
  // Exact match gets highest score
  if (textLower === queryLower) return 100
  
  // Starts with query gets high score
  if (textLower.startsWith(queryLower)) return 90
  
  // Contains query gets medium-high score
  if (textLower.includes(queryLower)) return 80
  
  // Word boundary match gets medium score
  const words = textLower.split(/\s+/)
  const queryWords = queryLower.split(/\s+/)
  
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
 * Search songs with fuzzy matching and relevance scoring
 */
export function fuzzySearchSongs(
  songs: Song[], 
  query: string, 
  language?: string
): SearchResult[] {
  if (!query.trim()) return []
  
  const queryLower = query.toLowerCase().trim()
  const results: SearchResult[] = []
  
  for (const song of songs) {
    // Filter by language if specified
    if (language && song.language !== language) continue
    
    const matches = {
      title: calculateFuzzyScore(query, song.title),
      titleTransliteration: song.titleTransliteration ? calculateFuzzyScore(query, song.titleTransliteration) : 0,
      artist: calculateFuzzyScore(query, song.artist.name),
      lyrics: 0,
      tags: 0
    }
    
    // Check lyrics for matches (only if other matches are weak)
    if (matches.title < 50 && matches.titleTransliteration < 50 && matches.artist < 50) {
      const lyricsText = song.lyrics.join(' ').toLowerCase()
      if (lyricsText.includes(queryLower)) {
        matches.lyrics = 30 // Lower score for lyrics matches
      }
    }
    
    // Check tags for matches
    for (const tag of song.tags) {
      const tagScore = calculateFuzzyScore(query, tag)
      if (tagScore > matches.tags) {
        matches.tags = tagScore
      }
    }
    
    // Calculate weighted total score
    const weights = {
      title: 0.4,           // Title matches are most important
      titleTransliteration: 0.3, // Transliteration is important
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
    
    // Only include songs with meaningful matches
    if (totalScore > 10) {
      results.push({
        song,
        score: totalScore,
        matches
      })
    }
  }
  
  // Sort by relevance score (highest first)
  return results.sort((a, b) => b.score - a.score)
}

/**
 * Get search suggestions based on partial matches
 */
export function getSearchSuggestions(
  songs: Song[], 
  query: string, 
  limit: number = 5
): string[] {
  if (!query.trim() || query.length < 2) return []
  
  const suggestions = new Set<string>()
  const queryLower = query.toLowerCase()
  
  for (const song of songs) {
    // Title suggestions
    if (song.title.toLowerCase().includes(queryLower)) {
      suggestions.add(song.title)
    }
    
    // Artist suggestions
    if (song.artist.name.toLowerCase().includes(queryLower)) {
      suggestions.add(song.artist.name)
    }
    
    // Tag suggestions
    for (const tag of song.tags) {
      if (tag.toLowerCase().includes(queryLower)) {
        suggestions.add(tag)
      }
    }
    
    if (suggestions.size >= limit) break
  }
  
  return Array.from(suggestions).slice(0, limit)
}

/**
 * Highlight search matches in text
 */
export function highlightMatches(text: string, query: string): string {
  if (!query.trim()) return text
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}
