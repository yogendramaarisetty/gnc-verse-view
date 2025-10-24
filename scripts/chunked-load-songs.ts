#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'

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

const CHUNK_SIZE = 50 // Process 50 songs per chunk
const INPUT_FILE = path.join(__dirname, '../data/lyric_export_1.json')
const OUTPUT_DIR = path.join(__dirname, '../data/chunks')

async function chunkDataFile() {
  try {
    console.log('🔄 Reading JSON file...')
    const jsonData = fs.readFileSync(INPUT_FILE, 'utf-8')
    const songs: SongData[] = JSON.parse(jsonData)
    
    console.log(`📊 Found ${songs.length} songs`)
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }
    
    // Split into chunks
    const chunks: SongData[][] = []
    for (let i = 0; i < songs.length; i += CHUNK_SIZE) {
      chunks.push(songs.slice(i, i + CHUNK_SIZE))
    }
    
    console.log(`📦 Created ${chunks.length} chunks of ${CHUNK_SIZE} songs each`)
    
    // Write chunks to separate files
    for (let i = 0; i < chunks.length; i++) {
      const chunkFile = path.join(OUTPUT_DIR, `chunk_${i + 1}.json`)
      fs.writeFileSync(chunkFile, JSON.stringify(chunks[i], null, 2))
      console.log(`✅ Written chunk ${i + 1}/${chunks.length} to ${chunkFile}`)
    }
    
    console.log('\n🎉 Chunking completed!')
    console.log(`📁 Chunks saved to: ${OUTPUT_DIR}`)
    console.log(`📊 Total chunks: ${chunks.length}`)
    console.log(`📊 Songs per chunk: ${CHUNK_SIZE}`)
    console.log(`📊 Total songs: ${songs.length}`)
    
  } catch (error) {
    console.error('💥 Error chunking data:', error)
    process.exit(1)
  }
}

// Run the chunking process
chunkDataFile()
