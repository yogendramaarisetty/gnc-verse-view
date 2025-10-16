import type { Song } from '@/lib/types'

export interface IDESearchResult {
  song: Song
  score: number
  matches: {
    title?: IDEMatch
    titleTransliteration?: IDEMatch
    artist?: IDEMatch
    lyrics?: IDEMatch
    tags?: IDEMatch
  }
  highlights: {
    title: string
    artist: string
    tags: string[]
  }
}

export interface IDEMatch {
  score: number
  type: 'exact' | 'prefix' | 'contains' | 'camelCase' | 'acronym' | 'fuzzy' | 'word'
  positions: number[]
  matchedText: string
}

/**
 * IDE-style fuzzy search with advanced relevance scoring
 * Inspired by VSCode and JetBrains Rider file search
 */
export class IDESearchEngine {
  private songs: Song[] = []
  private index: Map<string, Set<number>> = new Map()
  private wordIndex: Map<string, Set<number>> = new Map()

  constructor(songs: Song[]) {
    this.songs = songs
    this.buildIndex()
  }

  /**
   * Build search index for fast lookups
   */
  private buildIndex(): void {
    this.songs.forEach((song, index) => {
      // Index title
      this.addToIndex(song.title.toLowerCase(), index)
      this.addWordsToIndex(song.title.toLowerCase(), index)
      
      // Index transliteration
      if (song.titleTransliteration) {
        this.addToIndex(song.titleTransliteration.toLowerCase(), index)
        this.addWordsToIndex(song.titleTransliteration.toLowerCase(), index)
      }
      
      // Index artist
      this.addToIndex(song.artist.name.toLowerCase(), index)
      this.addWordsToIndex(song.artist.name.toLowerCase(), index)
      
      // Index tags
      song.tags.forEach(tag => {
        this.addToIndex(tag.toLowerCase(), index)
        this.addWordsToIndex(tag.toLowerCase(), index)
      })
    })
  }

  private addToIndex(text: string, index: number): void {
    if (!this.index.has(text)) {
      this.index.set(text, new Set())
    }
    this.index.get(text)!.add(index)
  }

  private addWordsToIndex(text: string, index: number): void {
    const words = text.split(/\s+/)
    words.forEach(word => {
      if (word.length > 1) {
        if (!this.wordIndex.has(word)) {
          this.wordIndex.set(word, new Set())
        }
        this.wordIndex.get(word)!.add(index)
      }
    })
  }

  /**
   * Search with IDE-style relevance scoring
   */
  search(query: string, language?: string): IDESearchResult[] {
    if (!query.trim()) return []

    const queryLower = query.toLowerCase().trim()
    const results: IDESearchResult[] = []
    const candidateIndices = new Set<number>()

    // Get candidate indices from various matching strategies
    this.getCandidateIndices(queryLower, candidateIndices)

    // Score and rank results
    for (const index of candidateIndices) {
      const song = this.songs[index]
      
      // Filter by language if specified
      if (language && song.language !== language) continue

      const result = this.scoreSong(song, queryLower)
      if (result.score > 0) {
        results.push(result)
      }
    }

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * Get candidate indices using multiple strategies
   */
  private getCandidateIndices(query: string, candidates: Set<number>): void {
    // Exact matches
    if (this.index.has(query)) {
      this.index.get(query)!.forEach(index => candidates.add(index))
    }

    // Prefix matches
    for (const [text, indices] of this.index) {
      if (text.startsWith(query)) {
        indices.forEach(index => candidates.add(index))
      }
    }

    // Contains matches
    for (const [text, indices] of this.index) {
      if (text.includes(query)) {
        indices.forEach(index => candidates.add(index))
      }
    }

    // Word matches
    const queryWords = query.split(/\s+/)
    for (const word of queryWords) {
      if (this.wordIndex.has(word)) {
        this.wordIndex.get(word)!.forEach(index => candidates.add(index))
      }
    }

    // CamelCase and acronym matches
    for (const [index, song] of this.songs.entries()) {
      if (this.matchesCamelCase(song.title, query) ||
          this.matchesCamelCase(song.artist.name, query) ||
          this.matchesAcronym(song.title, query) ||
          this.matchesAcronym(song.artist.name, query)) {
        candidates.add(index)
      }
    }
  }

  /**
   * Score a song against the query
   */
  private scoreSong(song: Song, query: string): IDESearchResult {
    const matches = {
      title: this.matchField(song.title, query),
      titleTransliteration: song.titleTransliteration ? this.matchField(song.titleTransliteration, query) : undefined,
      artist: this.matchField(song.artist.name, query),
      lyrics: this.matchField(song.lyrics.join(' '), query),
      tags: this.matchField(song.tags.join(' '), query),
    }

    // Calculate weighted score
    const weights = {
      title: 0.4,
      titleTransliteration: 0.3,
      artist: 0.2,
      lyrics: 0.05,
      tags: 0.05,
    }

    let totalScore = 0
    for (const [field, match] of Object.entries(matches)) {
      if (match) {
        totalScore += match.score * (weights[field as keyof typeof weights] || 0)
      }
    }

    // Boost score for trending songs
    if (song.trending) {
      totalScore *= 1.1
    }

    // Boost score for high-view songs
    if (song.viewCount > 100000) {
      totalScore *= 1.05
    }

    return {
      song,
      score: Math.min(totalScore, 100), // Cap at 100
      matches,
      highlights: {
        title: this.highlightText(song.title, query),
        artist: this.highlightText(song.artist.name, query),
        tags: song.tags.map(tag => this.highlightText(tag, query)),
      },
    }
  }

  /**
   * Match a field against the query with IDE-style scoring
   */
  private matchField(text: string, query: string): IDEMatch | undefined {
    const textLower = text.toLowerCase()
    const queryLower = query.toLowerCase()

    // Exact match (highest score)
    if (textLower === queryLower) {
      return {
        score: 100,
        type: 'exact',
        positions: [0],
        matchedText: text,
      }
    }

    // Prefix match
    if (textLower.startsWith(queryLower)) {
      return {
        score: 90,
        type: 'prefix',
        positions: [0],
        matchedText: text,
      }
    }

    // CamelCase match
    if (this.matchesCamelCase(text, query)) {
      return {
        score: 85,
        type: 'camelCase',
        positions: this.getCamelCasePositions(text, query),
        matchedText: text,
      }
    }

    // Acronym match
    if (this.matchesAcronym(text, query)) {
      return {
        score: 80,
        type: 'acronym',
        positions: this.getAcronymPositions(text, query),
        matchedText: text,
      }
    }

    // Contains match
    const containsIndex = textLower.indexOf(queryLower)
    if (containsIndex !== -1) {
      return {
        score: 70,
        type: 'contains',
        positions: [containsIndex],
        matchedText: text,
      }
    }

    // Word boundary match
    const wordMatch = this.matchWords(text, query)
    if (wordMatch) {
      return {
        score: 60,
        type: 'word',
        positions: wordMatch.positions,
        matchedText: text,
      }
    }

    // Fuzzy match
    const fuzzyScore = this.calculateFuzzyScore(textLower, queryLower)
    if (fuzzyScore >= 0.6) {
      return {
        score: fuzzyScore * 50,
        type: 'fuzzy',
        positions: [],
        matchedText: text,
      }
    }

    return undefined
  }

  /**
   * Check if text matches camelCase pattern
   */
  private matchesCamelCase(text: string, query: string): boolean {
    const camelCasePattern = text
      .split(/(?=[A-Z])/)
      .map(word => word.charAt(0))
      .join('')
      .toLowerCase()
    
    return camelCasePattern.includes(query.toLowerCase())
  }

  /**
   * Check if text matches acronym pattern
   */
  private matchesAcronym(text: string, query: string): boolean {
    const words = text.split(/\s+/)
    const acronym = words.map(word => word.charAt(0)).join('').toLowerCase()
    return acronym.includes(query.toLowerCase())
  }

  /**
   * Get camelCase match positions
   */
  private getCamelCasePositions(text: string, query: string): number[] {
    const positions: number[] = []
    const camelCasePattern = text.split(/(?=[A-Z])/)
    let currentIndex = 0
    
    for (const word of camelCasePattern) {
      if (word.charAt(0).toLowerCase() === query.charAt(0).toLowerCase()) {
        positions.push(currentIndex)
      }
      currentIndex += word.length
    }
    
    return positions
  }

  /**
   * Get acronym match positions
   */
  private getAcronymPositions(text: string, query: string): number[] {
    const positions: number[] = []
    const words = text.split(/\s+/)
    let currentIndex = 0
    
    for (const word of words) {
      if (word.charAt(0).toLowerCase() === query.charAt(0).toLowerCase()) {
        positions.push(currentIndex)
      }
      currentIndex += word.length + 1 // +1 for space
    }
    
    return positions
  }

  /**
   * Match words with word boundaries
   */
  private matchWords(text: string, query: string): { positions: number[] } | null {
    const words = text.toLowerCase().split(/\s+/)
    const queryWords = query.toLowerCase().split(/\s+/)
    const positions: number[] = []
    let currentIndex = 0

    for (const word of words) {
      for (const queryWord of queryWords) {
        if (word.startsWith(queryWord) || word.includes(queryWord)) {
          positions.push(currentIndex)
        }
      }
      currentIndex += word.length + 1
    }

    return positions.length > 0 ? { positions } : null
  }

  /**
   * Calculate fuzzy score using Levenshtein distance
   */
  private calculateFuzzyScore(text: string, query: string): number {
    const distance = this.levenshteinDistance(text, query)
    const maxLength = Math.max(text.length, query.length)
    return 1 - (distance / maxLength)
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
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
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Highlight matching text
   */
  private highlightText(text: string, query: string): string {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  /**
   * Get search suggestions
   */
  getSuggestions(query: string, limit: number = 5): string[] {
    if (!query.trim() || query.length < 2) return []

    const suggestions = new Set<string>()
    const queryLower = query.toLowerCase()

    for (const song of this.songs) {
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
}

/**
 * Create IDE search engine instance
 */
export function createIDESearchEngine(songs: Song[]): IDESearchEngine {
  return new IDESearchEngine(songs)
}

/**
 * Search songs with IDE-style relevance
 */
export function searchSongsIDE(
  songs: Song[], 
  query: string, 
  language?: string
): IDESearchResult[] {
  const engine = createIDESearchEngine(songs)
  return engine.search(query, language)
}
