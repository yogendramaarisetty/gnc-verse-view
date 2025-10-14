import { createClient } from '@supabase/supabase-js'
import { ARTISTS, SAMPLE_SONGS } from '../lib/song-data'
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

async function migrateAll() {
  console.log('Starting complete migration...')

  try {
    // Step 1: Migrate Artists
    console.log('\n=== Migrating Artists ===')
    const { error: deleteArtistsError } = await supabase
      .from('artists')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (deleteArtistsError) {
      console.error('Error clearing artists:', deleteArtistsError)
      return
    }

    const artistsToInsert = ARTISTS.map(artist => ({
      name: artist.name,
      photo_url: artist.photoUrl,
      total_songs: artist.totalSongs,
      total_views: artist.totalViews,
    }))

    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .insert(artistsToInsert)
      .select()

    if (artistsError) {
      console.error('Error inserting artists:', artistsError)
      return
    }

    console.log(`✅ Migrated ${artists?.length || 0} artists`)

    // Step 2: Create artist mapping
    const artistMap = new Map()
    artists?.forEach(artist => {
      artistMap.set(artist.name, artist.id)
    })

    // Step 3: Migrate Songs
    console.log('\n=== Migrating Songs ===')
    const { error: deleteSongsError } = await supabase
      .from('songs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (deleteSongsError) {
      console.error('Error clearing songs:', deleteSongsError)
      return
    }

    const songsToInsert = SAMPLE_SONGS.map(song => {
      const artistId = artistMap.get(song.artist.name)
      
      if (!artistId) {
        console.warn(`⚠️  Artist not found for song "${song.title}": ${song.artist.name}`)
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
    }).filter(Boolean)

    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .insert(songsToInsert)
      .select()

    if (songsError) {
      console.error('Error inserting songs:', songsError)
      return
    }

    console.log(`✅ Migrated ${songs?.length || 0} songs`)

    // Step 4: Summary
    console.log('\n=== Migration Summary ===')
    console.log(`Artists: ${artists?.length || 0}`)
    console.log(`Songs: ${songs?.length || 0}`)
    console.log('\n🎉 Migration completed successfully!')

    // Step 5: Verify data
    console.log('\n=== Verification ===')
    const { data: artistCount } = await supabase
      .from('artists')
      .select('id', { count: 'exact', head: true })

    const { data: songCount } = await supabase
      .from('songs')
      .select('id', { count: 'exact', head: true })

    console.log(`Database now contains:`)
    console.log(`- ${artistCount?.length || 0} artists`)
    console.log(`- ${songCount?.length || 0} songs`)

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

migrateAll()
