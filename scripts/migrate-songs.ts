import { createClient } from '@supabase/supabase-js'
import { SAMPLE_SONGS } from '../lib/song-data'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateSongs() {
  console.log('Starting song migration...')

  try {
    // First, get all artists to map them to songs
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('id, name')

    if (artistsError) {
      console.error('Error fetching artists:', artistsError)
      return
    }

    if (!artists || artists.length === 0) {
      console.error('No artists found. Please run migrate-artists.ts first.')
      return
    }

    // Create a mapping of artist names to IDs
    const artistMap = new Map()
    artists.forEach(artist => {
      artistMap.set(artist.name, artist.id)
    })

    // Clear existing songs
    const { error: deleteError } = await supabase
      .from('songs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    if (deleteError) {
      console.error('Error clearing songs:', deleteError)
      return
    }

    console.log('Cleared existing songs')

    // Transform and insert songs
    const songsToInsert = SAMPLE_SONGS.map(song => {
      const artistId = artistMap.get(song.artist.name)
      
      if (!artistId) {
        console.warn(`Artist not found for song "${song.title}": ${song.artist.name}`)
        return null
      }

      return {
        title: song.title,
        title_transliteration: song.titleTransliteration,
        artist_id: artistId,
        language: song.language,
        tags: song.tags,
        lyrics: song.lyrics,
        chords: song.chords,
        original_key: song.originalKey,
        thumbnail_url: song.thumbnail,
        has_video: song.hasVideo || false,
        video_url: song.videoUrl,
        youtube_views: song.youtubeViews,
        youtube_likes: song.youtubeLikes,
        release_date: song.releaseDate,
        view_count: song.viewCount,
        trending: song.trending,
      }
    }).filter(Boolean) // Remove null entries

    const { data, error } = await supabase
      .from('songs')
      .insert(songsToInsert)
      .select()

    if (error) {
      console.error('Error inserting songs:', error)
      return
    }

    console.log(`Successfully migrated ${data?.length || 0} songs`)
    
    // Log some sample songs for verification
    data?.slice(0, 3).forEach((song, index) => {
      console.log(`Song ${index + 1}: ${song.title} (ID: ${song.id})`)
    })

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

migrateSongs()
