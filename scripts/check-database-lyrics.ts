#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseLyrics() {
  try {
    console.log('🔄 Checking database for lyrics...')
    
    // Get a few songs from the database
    const { data: songs, error } = await supabase
      .from('songs')
      .select(`
        id,
        title,
        lyrics,
        english_lyrics,
        language
      `)
      .limit(5)
    
    if (error) {
      console.error('❌ Error fetching songs:', error)
      return
    }
    
    console.log(`📊 Found ${songs?.length || 0} songs in database`)
    
    if (songs && songs.length > 0) {
      songs.forEach((song, index) => {
        console.log(`\n🎵 Song ${index + 1}: "${song.title}"`)
        console.log(`   ID: ${song.id}`)
        console.log(`   Language: ${song.language}`)
        console.log(`   Has lyrics: ${!!song.lyrics}`)
        console.log(`   Lyrics length: ${song.lyrics?.length || 0}`)
        console.log(`   Has English lyrics: ${!!song.english_lyrics}`)
        console.log(`   English lyrics length: ${song.english_lyrics?.length || 0}`)
        
        if (song.lyrics && song.lyrics.length > 0) {
          console.log(`   First 3 lyrics lines:`)
          song.lyrics.slice(0, 3).forEach((line, idx) => {
            console.log(`     ${idx + 1}: ${line}`)
          })
        }
        
        if (song.english_lyrics && song.english_lyrics.length > 0) {
          console.log(`   First 3 English lyrics lines:`)
          song.english_lyrics.slice(0, 3).forEach((line, idx) => {
            console.log(`     ${idx + 1}: ${line}`)
          })
        }
      })
    } else {
      console.log('❌ No songs found in database')
    }
    
  } catch (error) {
    console.error('💥 Error checking database:', error)
  }
}

// Run the check
checkDatabaseLyrics()
