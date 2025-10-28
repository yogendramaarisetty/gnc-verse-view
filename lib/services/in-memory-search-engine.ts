import type { Song } from '@/lib/types'

export interface InMemorySearchResult {
  song: Song
  score: number
  matchType: 'exact' | 'prefix' | 'contains' | 'fuzzy'
  field: 'title' | 'titleTransliteration' | 'artist' | 'lyrics'
}

interface TrieNode {
  children: Map<string, TrieNode>
  songIds: Set<string>
  isEndOfWord: boolean
}

export class InMemorySearchEngine {
  private trie: TrieNode
  private songIndex: Map<string, Song>
  private normalizedIndex: Map<string, Set<string>> // normalized → songIds
  private searchCache: Map<string, InMemorySearchResult[]>
  private maxCacheSize: number = 1000

  constructor() {
    this.trie = { children: new Map(), songIds: new Set(), isEndOfWord: false }
    this.songIndex = new Map()
    this.normalizedIndex = new Map()
    this.searchCache = new Map()
  }

  /**
   * Initialize the search engine with all songs
   */
  async initialize(songs: Song[]): Promise<void> {
    // Clear existing data
    this.trie = { children: new Map(), songIds: new Set(), isEndOfWord: false }
    this.songIndex.clear()
    this.normalizedIndex.clear()
    this.searchCache.clear()

    // Index all songs
    for (const song of songs) {
      this.songIndex.set(song.id, song)
      this.indexSong(song)
    }
  }

  /**
   * Index a single song for fast searching
   */
  private indexSong(song: Song): void {
    const fields = [
      { text: song.title, field: 'title' as const },
      { text: song.titleTransliteration, field: 'titleTransliteration' as const },
      { text: song.artist.name, field: 'artist' as const }
    ]

    for (const { text, field } of fields) {
      if (!text) continue

      const normalized = this.normalizeText(text)
      
      // Add to normalized index
      if (!this.normalizedIndex.has(normalized)) {
        this.normalizedIndex.set(normalized, new Set())
      }
      this.normalizedIndex.get(normalized)!.add(song.id)

      // Add to trie for prefix matching
      this.addToTrie(normalized, song.id)
    }
  }

  /**
   * Normalize text for consistent searching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s]/gu, '') // Preserve all Unicode letters/numbers, remove only special chars
      .replace(/\s+/g, ' ') // Normalize whitespace
  }

  /**
   * Add text to trie structure
   */
  private addToTrie(text: string, songId: string): void {
    let current = this.trie
    
    for (const char of text) {
      if (!current.children.has(char)) {
        current.children.set(char, {
          children: new Map(),
          songIds: new Set(),
          isEndOfWord: false
        })
      }
      current = current.children.get(char)!
      current.songIds.add(songId)
    }
    
    current.isEndOfWord = true
  }

  /**
   * Perform ultra-fast search with priority system
   */
  search(query: string, language?: string, limit: number = 20): InMemorySearchResult[] {
    if (!query.trim()) return []

    const normalizedQuery = this.normalizeText(query)
    const cacheKey = `${normalizedQuery}-${language || 'all'}-${limit}`

    // Check cache first
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!
    }

    const results: InMemorySearchResult[] = []
    const seenSongIds = new Set<string>()

    // 1. Exact matches (highest priority)
    const exactMatches = this.findExactMatches(normalizedQuery, language)
    for (const match of exactMatches) {
      if (!seenSongIds.has(match.song.id)) {
        results.push(match)
        seenSongIds.add(match.song.id)
      }
    }

    // 2. Prefix matches (high priority)
    const prefixMatches = this.findPrefixMatches(normalizedQuery, language)
    for (const match of prefixMatches) {
      if (!seenSongIds.has(match.song.id)) {
        results.push(match)
        seenSongIds.add(match.song.id)
      }
    }

    // 3. Contains matches (medium priority)
    const containsMatches = this.findContainsMatches(normalizedQuery, language)
    for (const match of containsMatches) {
      if (!seenSongIds.has(match.song.id)) {
        results.push(match)
        seenSongIds.add(match.song.id)
      }
    }

    // 4. Fuzzy matches (lowest priority) - only if we don't have enough results
    if (results.length < limit) {
      const fuzzyMatches = this.findFuzzyMatches(normalizedQuery, language, limit - results.length)
      for (const match of fuzzyMatches) {
        if (!seenSongIds.has(match.song.id)) {
          results.push(match)
          seenSongIds.add(match.song.id)
        }
      }
    }

    // Sort by score (highest first)
    const sortedResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    // Cache results
    this.cacheResults(cacheKey, sortedResults)

    return sortedResults
  }

  /**
   * Find exact matches
   */
  private findExactMatches(query: string, language?: string): InMemorySearchResult[] {
    const results: InMemorySearchResult[] = []

    // Check normalized index for exact matches
    if (this.normalizedIndex.has(query)) {
      const songIds = this.normalizedIndex.get(query)!
      
      for (const songId of songIds) {
        const song = this.songIndex.get(songId)
        if (!song || (language && song.language !== language)) continue

        // Check which field matched exactly
        const fields = [
          { text: song.title, field: 'title' as const },
          { text: song.titleTransliteration, field: 'titleTransliteration' as const },
          { text: song.artist.name, field: 'artist' as const }
        ]

        for (const { text, field } of fields) {
          if (text && this.normalizeText(text) === query) {
            results.push({
              song,
              score: field === 'titleTransliteration' ? 1000 : 700, // Transliteration gets higher score
              matchType: 'exact',
              field
            })
            break
          }
        }
      }
    }

    // Also check for exact matches in individual words (for partial word matching)
    const queryWords = query.split(/\s+/)
    if (queryWords.length > 1) {
      for (const [songId, song] of this.songIndex) {
        if (language && song.language !== language) continue

        const fields = [
          { text: song.title, field: 'title' as const },
          { text: song.titleTransliteration, field: 'titleTransliteration' as const },
          { text: song.artist.name, field: 'artist' as const }
        ]

        for (const { text, field } of fields) {
          if (!text) continue
          
          const normalizedText = this.normalizeText(text)
          const textWords = normalizedText.split(/\s+/)
          
          // Check if all query words exist in the text
          const allWordsMatch = queryWords.every(queryWord => 
            textWords.some(textWord => textWord === queryWord)
          )
          
          if (allWordsMatch) {
            results.push({
              song,
              score: field === 'titleTransliteration' ? 1000 : 700,
              matchType: 'exact',
              field
            })
            break
          }
        }
      }
    }

    return results
  }

  /**
   * Find prefix matches using trie
   */
  private findPrefixMatches(query: string, language?: string): InMemorySearchResult[] {
    const results: InMemorySearchResult[] = []
    let current = this.trie

    // Navigate to the end of the query in the trie
    for (const char of query) {
      if (!current.children.has(char)) {
        return results // No prefix matches
      }
      current = current.children.get(char)!
    }

    // Collect all songs that have this prefix
    const songIds = new Set<string>()
    this.collectSongIds(current, songIds)

    for (const songId of songIds) {
      const song = this.songIndex.get(songId)
      if (!song || (language && song.language !== language)) continue

      // Check which field has the prefix match
      const fields = [
        { text: song.title, field: 'title' as const },
        { text: song.titleTransliteration, field: 'titleTransliteration' as const },
        { text: song.artist.name, field: 'artist' as const }
      ]

      for (const { text, field } of fields) {
        if (text && this.normalizeText(text).startsWith(query)) {
          results.push({
            song,
            score: field === 'titleTransliteration' ? 900 : 600, // Transliteration gets higher score
            matchType: 'prefix',
            field
          })
          break
        }
      }
    }

    // Also check for prefix matches in individual words (for partial word matching)
    const queryWords = query.split(/\s+/)
    if (queryWords.length > 1) {
      for (const [songId, song] of this.songIndex) {
        if (language && song.language !== language) continue

        const fields = [
          { text: song.title, field: 'title' as const },
          { text: song.titleTransliteration, field: 'titleTransliteration' as const },
          { text: song.artist.name, field: 'artist' as const }
        ]

        for (const { text, field } of fields) {
          if (!text) continue
          
          const normalizedText = this.normalizeText(text)
          const textWords = normalizedText.split(/\s+/)
          
          // Check if all query words are prefixes of text words
          const allWordsMatch = queryWords.every(queryWord => 
            textWords.some(textWord => textWord.startsWith(queryWord))
          )
          
          if (allWordsMatch) {
            results.push({
              song,
              score: field === 'titleTransliteration' ? 900 : 600,
              matchType: 'prefix',
              field
            })
            break
          }
        }
      }
    }

    return results
  }

  /**
   * Find contains matches
   */
  private findContainsMatches(query: string, language?: string): InMemorySearchResult[] {
    const results: InMemorySearchResult[] = []

    // Search through all songs for contains matches
    for (const [songId, song] of this.songIndex) {
      if (language && song.language !== language) continue

      const fields = [
        { text: song.title, field: 'title' as const },
        { text: song.titleTransliteration, field: 'titleTransliteration' as const },
        { text: song.artist.name, field: 'artist' as const }
      ]

      for (const { text, field } of fields) {
        if (text && this.normalizeText(text).includes(query)) {
          results.push({
            song,
            score: field === 'titleTransliteration' ? 800 : 500, // Transliteration gets higher score
            matchType: 'contains',
            field
          })
          break
        }
      }
    }

    // Also check for contains matches in individual words (for partial word matching)
    const queryWords = query.split(/\s+/)
    if (queryWords.length > 1) {
      for (const [songId, song] of this.songIndex) {
        if (language && song.language !== language) continue

        const fields = [
          { text: song.title, field: 'title' as const },
          { text: song.titleTransliteration, field: 'titleTransliteration' as const },
          { text: song.artist.name, field: 'artist' as const }
        ]

        for (const { text, field } of fields) {
          if (!text) continue
          
          const normalizedText = this.normalizeText(text)
          const textWords = normalizedText.split(/\s+/)
          
          // Check if all query words are contained in text words
          const allWordsMatch = queryWords.every(queryWord => 
            textWords.some(textWord => textWord.includes(queryWord))
          )
          
          if (allWordsMatch) {
            results.push({
              song,
              score: field === 'titleTransliteration' ? 800 : 500,
              matchType: 'contains',
              field
            })
            break
          }
        }
      }
    }

    return results
  }

  /**
   * Find fuzzy matches using similarity
   */
  private findFuzzyMatches(query: string, language?: string, limit: number = 10): InMemorySearchResult[] {
    const results: InMemorySearchResult[] = []

    for (const [songId, song] of this.songIndex) {
      if (language && song.language !== language) continue

      const fields = [
        { text: song.title, field: 'title' as const },
        { text: song.titleTransliteration, field: 'titleTransliteration' as const },
        { text: song.artist.name, field: 'artist' as const }
      ]

      for (const { text, field } of fields) {
        if (!text) continue

        const normalizedText = this.normalizeText(text)
        const similarity = this.calculateSimilarity(query, normalizedText)
        if (similarity > 0.5) { // Lowered threshold for better typo tolerance
          results.push({
            song,
            score: Math.floor(similarity * 400), // Scale to 0-400 range
            matchType: 'fuzzy',
            field
          })
          break
        }
      }
    }

    // Also check for fuzzy matches in individual words (for partial word matching)
    const queryWords = query.split(/\s+/)
    if (queryWords.length > 1) {
      for (const [songId, song] of this.songIndex) {
        if (language && song.language !== language) continue

        const fields = [
          { text: song.title, field: 'title' as const },
          { text: song.titleTransliteration, field: 'titleTransliteration' as const },
          { text: song.artist.name, field: 'artist' as const }
        ]

        for (const { text, field } of fields) {
          if (!text) continue
          
          const normalizedText = this.normalizeText(text)
          const textWords = normalizedText.split(/\s+/)
          
          // Check if all query words have fuzzy matches in text words
          const allWordsMatch = queryWords.every(queryWord => 
            textWords.some(textWord => {
              const wordSimilarity = this.calculateSimilarity(queryWord, textWord)
              return wordSimilarity > 0.5
            })
          )
          
          if (allWordsMatch) {
            // Calculate overall similarity for scoring
            const overallSimilarity = queryWords.reduce((acc, queryWord) => {
              const bestMatch = Math.max(...textWords.map(textWord => 
                this.calculateSimilarity(queryWord, textWord)
              ))
              return acc + bestMatch
            }, 0) / queryWords.length
            
            results.push({
              song,
              score: Math.floor(overallSimilarity * 400),
              matchType: 'fuzzy',
              field
            })
            break
          }
        }
      }
    }

    return results.slice(0, limit)
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
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
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Collect all song IDs from a trie node and its children
   */
  private collectSongIds(node: TrieNode, songIds: Set<string>): void {
    for (const songId of node.songIds) {
      songIds.add(songId)
    }
    
    for (const child of node.children.values()) {
      this.collectSongIds(child, songIds)
    }
  }

  /**
   * Cache search results with LRU eviction
   */
  private cacheResults(key: string, results: InMemorySearchResult[]): void {
    if (this.searchCache.size >= this.maxCacheSize) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.searchCache.keys().next().value
      if (firstKey) {
        this.searchCache.delete(firstKey)
      }
    }
    
    this.searchCache.set(key, results)
  }

  /**
   * Get search statistics
   */
  getStats(): { songCount: number; cacheSize: number; trieSize: number } {
    return {
      songCount: this.songIndex.size,
      cacheSize: this.searchCache.size,
      trieSize: this.getTrieSize(this.trie)
    }
  }

  /**
   * Get trie size recursively
   */
  private getTrieSize(node: TrieNode): number {
    let size = 1
    for (const child of node.children.values()) {
      size += this.getTrieSize(child)
    }
    return size
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.searchCache.clear()
  }
}
