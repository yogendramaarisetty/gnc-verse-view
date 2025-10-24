#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Direct Supabase upload script to bypass Vercel limits
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

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

const BATCH_SIZE = 100 // Process 100 songs at a time

async function directSupabaseUpload() {
  try {
    console.log('🔄 Reading JSON file...')
    const jsonData = fs.readFileSync(path.join(__dirname, '../data/lyric_export_1.json'), 'utf-8')
    const songs: SongData[] = JSON.parse(jsonData)
    
    console.log(`📊 Found ${songs.length} songs`)
    
    let processed = 0
    let created = 0
    let updated = 0
    let errors = 0
    
    // Process in batches
    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
      const batch = songs.slice(i, i + BATCH_SIZE)
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(songs.length / BATCH_SIZE)} (${batch.length} songs)`)
      
      try {
        // Process each song in the batch
        for (const song of batch) {
          try {
            // Your existing data processing logic here
            // This bypasses Vercel entirely
            processed++
          } catch (error) {
            console.error(`❌ Error processing song ${song.id}:`, error)
            errors++
          }
        }
        
        console.log(`✅ Batch completed: ${processed}/${songs.length} songs processed`)
        
      } catch (batchError) {
        console.error('❌ Batch failed:', batchError)
        errors += batch.length
      }
    }
    
    console.log('\n🎉 Direct upload completed!')
    console.log(`📊 Total processed: ${processed}`)
    console.log(`✅ Created: ${created}`)
    console.log(`🔄 Updated: ${updated}`)
    console.log(`❌ Errors: ${errors}`)
    
  } catch (error) {
    console.error('💥 Error in direct upload:', error)
    process.exit(1)
  }
}

// Run the direct upload
directSupabaseUpload()
