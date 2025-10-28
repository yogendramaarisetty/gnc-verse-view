import { createClient } from '@supabase/supabase-js'

interface SongData {
  id: number
  title: string
  english_title: string
  link: string
  telugu_lyrics: string
  english_lyrics: string
  lyricist: string
  composer: string
  singer: string
  category: string
  youtube_link: string
  scraped: boolean
  scraped_at: string
  created_at: string
}

interface ReconciliationResult {
  created: number
  updated: number
  deleted: number
  errors: string[]
  summary: {
    totalProcessed: number
    totalSongs: number
    totalArtists: number
  }
}

export class DataReconciliationService {
  private supabase: any
  private artistCache = new Map<string, string>()
  private songCache = new Map<string, string>() // songKey -> Supabase ID

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  // Main reconciliation method
  async reconcileData(songs: SongData[]): Promise<ReconciliationResult> {
    console.log('🔄 Starting data reconciliation...')
    
    const result: ReconciliationResult = {
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
      summary: {
        totalProcessed: 0,
        totalSongs: 0,
        totalArtists: 0
      }
    }

    try {
      result.summary.totalProcessed = songs.length

      // Build caches for efficient lookups
      await this.buildCaches()

      // Process each song
      for (const song of songs) {
        try {
          await this.processSong(song, result)
        } catch (error) {
          result.errors.push(`Song ${song.id} (${song.title}): ${error}`)
        }
      }

      // Clean up orphaned songs (songs in DB but not in JSON)
      await this.cleanupOrphanedSongs(songs, result)

      // Update artist counts
      await this.updateArtistCounts()

      console.log('✅ Data reconciliation completed!')
      this.logResults(result)

    } catch (error) {
      result.errors.push(`Fatal error: ${error}`)
      console.error('💥 Reconciliation failed:', error)
    }

    return result
  }

  // Chunked reconciliation method (skips cleanup to prevent deletion)
  async reconcileDataChunked(songs: SongData[]): Promise<ReconciliationResult> {
    console.log('🔄 Starting chunked data reconciliation (no cleanup)...')
    
    const result: ReconciliationResult = {
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
      summary: {
        totalProcessed: 0,
        totalSongs: 0,
        totalArtists: 0
      }
    }

    try {
      result.summary.totalProcessed = songs.length

      // Build caches for efficient lookups
      await this.buildCaches()

      // Process each song
      for (const song of songs) {
        try {
          await this.processSong(song, result)
        } catch (error) {
          result.errors.push(`Song ${song.id} (${song.title}): ${error}`)
        }
      }

      // Skip cleanup for chunked uploads to prevent deletion of songs from other chunks
      console.log('⚠️ Skipping cleanup for chunked upload to prevent deletion')

      // Update artist counts
      await this.updateArtistCounts()

      console.log('✅ Chunked data reconciliation completed!')
      this.logResults(result)

    } catch (error) {
      result.errors.push(`Fatal error: ${error}`)
      console.error('💥 Chunked reconciliation failed:', error)
    }

    return result
  }

  private async buildCaches(): Promise<void> {
    console.log('📊 Building caches...')
    
    // Cache artists
    const { data: artists } = await this.supabase
      .from('artists')
      .select('id, name')
    
    artists?.forEach((artist: any) => {
      this.artistCache.set(artist.name, artist.id)
    })

    // Cache songs with their keys
    const { data: songs } = await this.supabase
      .from('songs')
      .select('id, title, artist_id')
    
    songs?.forEach((song: any) => {
      const songKey = `${song.title}_${song.artist_id}`
      this.songCache.set(songKey, song.id)
    })

    console.log(`📊 Cached ${this.artistCache.size} artists and ${this.songCache.size} songs`)
  }

  private async processSong(song: SongData, result: ReconciliationResult): Promise<void> {
    const language = this.detectLanguage(song.title, song.telugu_lyrics || song.english_lyrics)
    const artistName = this.extractArtistName(song)
    
    // Get or create artist
    let artistId = this.artistCache.get(artistName)
    if (!artistId) {
      artistId = await this.createArtist(artistName)
      this.artistCache.set(artistName, artistId)
    }

    // Check if song exists
    const songKey = `${song.title}_${artistId}`
    const existingSongId = this.songCache.get(songKey)

    if (existingSongId) {
      // Update existing song
      await this.updateSong(existingSongId, song, language)
      result.updated++
    } else {
      // Create new song
      const songId = await this.createSong(song, artistId, language)
      this.songCache.set(songKey, songId)
      result.created++
    }
  }

  private async createArtist(name: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('artists')
      .insert({
        name,
        photo_url: null,
        total_songs: 0,
        total_views: 0
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to create artist ${name}: ${error.message}`)
    return data.id
  }

  private async createSong(song: SongData, artistId: string, language: string): Promise<string> {
    const videoId = this.extractYouTubeId(song.youtube_link)
    const thumbnailUrl = videoId ? this.generateThumbnailUrl(videoId) : null
    const lyrics = this.parseLyrics(song.telugu_lyrics || song.english_lyrics)
    const englishLyrics = song.english_lyrics ? this.parseEnglishLyrics(song.english_lyrics) : null
    const tags = song.category ? [song.category] : []

    const { data, error } = await this.supabase
      .from('songs')
      .insert({
        title: song.title,
        title_transliteration: song.english_title || null,
        artist_id: artistId,
        language: language,
        tags: tags,
        lyrics: lyrics,
        english_lyrics: englishLyrics,
        chords: null,
        original_key: null,
        thumbnail_url: thumbnailUrl,
        has_video: !!videoId,
        video_url: song.youtube_link || null,
        youtube_views: 0,
        youtube_likes: 0,
        release_date: null,
        view_count: 0,
        trending: false,
        json_id: song.id
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to create song ${song.title}: ${error.message}`)
    return data.id
  }

  private async updateSong(songId: string, song: SongData, language: string): Promise<void> {
    const videoId = this.extractYouTubeId(song.youtube_link)
    const thumbnailUrl = videoId ? this.generateThumbnailUrl(videoId) : null
    const lyrics = this.parseLyrics(song.telugu_lyrics || song.english_lyrics)
    const englishLyrics = song.english_lyrics ? this.parseEnglishLyrics(song.english_lyrics) : null
    const tags = song.category ? [song.category] : []

    const { error } = await this.supabase
      .from('songs')
      .update({
        title: song.title,
        title_transliteration: song.english_title || null,
        language: language,
        tags: tags,
        lyrics: lyrics,
        english_lyrics: englishLyrics,
        thumbnail_url: thumbnailUrl,
        has_video: !!videoId,
        video_url: song.youtube_link || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', songId)

    if (error) throw new Error(`Failed to update song ${song.title}: ${error.message}`)
  }

  private async cleanupOrphanedSongs(jsonSongs: SongData[], result: ReconciliationResult): Promise<void> {
    console.log('🧹 Cleaning up orphaned songs...')
    
    // Get all songs from database
    const { data: dbSongs } = await this.supabase
      .from('songs')
      .select('id, title, artist_id, artists(name)')

    if (!dbSongs) return

    // Create set of existing song keys from JSON
    const jsonSongKeys = new Set<string>()
    for (const song of jsonSongs) {
      const artistName = this.extractArtistName(song)
      const artistId = this.artistCache.get(artistName)
      if (artistId) {
        jsonSongKeys.add(`${song.title}_${artistId}`)
      }
    }

    // Find orphaned songs
    const orphanedSongs = dbSongs.filter((dbSong: any) => {
      const songKey = `${dbSong.title}_${dbSong.artist_id}`
      return !jsonSongKeys.has(songKey)
    })

    // Delete orphaned songs
    for (const song of orphanedSongs) {
      const { error } = await this.supabase
        .from('songs')
        .delete()
        .eq('id', song.id)

      if (error) {
        result.errors.push(`Failed to delete orphaned song ${song.title}: ${error.message}`)
      } else {
        result.deleted++
      }
    }

    console.log(`🧹 Cleaned up ${result.deleted} orphaned songs`)
  }

  private async updateArtistCounts(): Promise<void> {
    console.log('📊 Updating artist song counts...')
    
    for (const [artistName, artistId] of this.artistCache) {
      const { count } = await this.supabase
        .from('songs')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artistId)

      await this.supabase
        .from('artists')
        .update({ total_songs: count || 0 })
        .eq('id', artistId)
    }
  }

  // Utility methods
  private detectLanguage(title: string, lyrics: string): string {
    const teluguRegex = /[\u0C00-\u0C7F]/
    const malayalamRegex = /[\u0D00-\u0D7F]/
    const tamilRegex = /[\u0B80-\u0BFF]/
    const hindiRegex = /[\u0900-\u097F]/
    const bengaliRegex = /[\u0980-\u09FF]/
    const kannadaRegex = /[\u0C80-\u0CFF]/
    
    const text = `${title} ${lyrics}`
    
    if (teluguRegex.test(text)) return 'Telugu'
    if (malayalamRegex.test(text)) return 'Malayalam'
    if (tamilRegex.test(text)) return 'Tamil'
    if (hindiRegex.test(text)) return 'Hindi'
    if (bengaliRegex.test(text)) return 'Bengali'
    if (kannadaRegex.test(text)) return 'Kannada'
    
    return 'English'
  }

  private extractArtistName(song: SongData): string {
    if (song.singer && song.singer.trim()) return song.singer.trim()
    if (song.lyricist && song.lyricist.trim()) return song.lyricist.trim()
    if (song.composer && song.composer.trim()) return song.composer.trim()
    return 'Unknown Artist'
  }

  private parseLyrics(lyrics: string): string[] {
    const lines = lyrics
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0) // Remove empty lines
    
    // Find the start of actual lyrics content
    let startIndex = 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Skip header lines
      if (line.includes('Telugu Lyrics') || 
          line.includes('English Lyrics') || 
          line.includes('Audio') ||
          line.includes('Download Lyrics') ||
          line.includes('Share this:')) {
        continue
      }
      // If we find a line that looks like actual lyrics, start from there
      if (line.length > 3 && !line.includes('Lyrics') && !line.includes('Audio')) {
        startIndex = i
        break
      }
    }
    
    const contentLines = lines.slice(startIndex)
    
    return contentLines.filter(line => {
      // Filter out common headers that appear in the data
      const headersToFilter = [
        'Telugu Lyrics',
        'English Lyrics', 
        'Audio',
        'Telugu LyricsEnglish LyricsAudio',
        'Telugu LyricsEnglish Lyrics',
        'English LyricsAudio',
        'Download Lyrics as: PPT',
        'Share this:WhatsAppTweet'
      ]
      
      return !headersToFilter.includes(line) && line.length > 0
    })
  }

  private parseEnglishLyrics(lyrics: string): string[] {
    const lines = lyrics
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0) // Remove empty lines
    
    // Find the start of actual lyrics content by looking for common patterns
    let startIndex = 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Skip header lines
      if (line.includes('Telugu Lyrics') || 
          line.includes('English Lyrics') || 
          line.includes('Audio') ||
          line.includes('Download Lyrics') ||
          line.includes('Share this:')) {
        continue
      }
      // If we find a line that looks like actual lyrics, start from there
      if (line.length > 3 && !line.includes('Lyrics') && !line.includes('Audio')) {
        startIndex = i
        break
      }
    }
    
    const contentLines = lines.slice(startIndex)
    
    return contentLines.filter(line => {
      // Filter out common headers that appear in the data
      const headersToFilter = [
        'Telugu Lyrics',
        'English Lyrics', 
        'Audio',
        'Telugu LyricsEnglish LyricsAudio',
        'Telugu LyricsEnglish Lyrics',
        'English LyricsAudio',
        'Download Lyrics as: PPT',
        'Share this:WhatsAppTweet'
      ]
      
      return !headersToFilter.includes(line) && line.length > 0
    })
  }

  private extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([^?&]+)/)
    return match ? match[1] : null
  }

  private generateThumbnailUrl(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }

  private logResults(result: ReconciliationResult): void {
    console.log('\n📊 Reconciliation Results:')
    console.log(`✅ Created: ${result.created} songs`)
    console.log(`🔄 Updated: ${result.updated} songs`)
    console.log(`🗑️  Deleted: ${result.deleted} songs`)
    console.log(`❌ Errors: ${result.errors.length} errors`)
    console.log(`📈 Total processed: ${result.summary.totalProcessed} songs`)
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:')
      result.errors.forEach(error => console.log(`  - ${error}`))
    }
  }
}

