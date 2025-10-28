import { createClient } from '@supabase/supabase-js'
import { ARTISTS } from '../lib/song-data'
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

async function migrateArtists() {
  console.log('Starting artist migration...')

  try {
    // Clear existing artists
    const { error: deleteError } = await supabase
      .from('artists')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    if (deleteError) {
      console.error('Error clearing artists:', deleteError)
      return
    }

    console.log('Cleared existing artists')

    // Insert new artists
    const artistsToInsert = ARTISTS.map(artist => ({
      name: artist.name,
      photo_url: artist.photoUrl,
      total_songs: artist.totalSongs,
      total_views: artist.totalViews,
    }))

    const { data, error } = await supabase
      .from('artists')
      .insert(artistsToInsert)
      .select()

    if (error) {
      console.error('Error inserting artists:', error)
      return
    }

    console.log(`Successfully migrated ${data?.length || 0} artists`)
    
    // Log the artist IDs for reference
    data?.forEach((artist, index) => {
      console.log(`Artist ${index + 1}: ${artist.name} (ID: ${artist.id})`)
    })

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

migrateArtists()
