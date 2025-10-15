#!/usr/bin/env tsx

import { DataReconciliationService } from '../lib/services/data-reconciliation'
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

async function batchLoadSongs() {
  const args = process.argv.slice(2)
  const jsonFilePath = args[0]

  if (!jsonFilePath) {
    console.error('❌ Usage: tsx scripts/batch-load-songs.ts <path-to-json-file>')
    console.error('Example: tsx scripts/batch-load-songs.ts data/songs.json')
    process.exit(1)
  }

  if (!fs.existsSync(jsonFilePath)) {
    console.error(`❌ File not found: ${jsonFilePath}`)
    process.exit(1)
  }

  try {
    console.log(`📁 Loading songs from: ${jsonFilePath}`)
    
    // Load JSON data
    const rawData = fs.readFileSync(jsonFilePath, 'utf8')
    const songs: SongData[] = JSON.parse(rawData)

    if (!Array.isArray(songs)) {
      throw new Error('Invalid JSON format. Expected array of songs.')
    }

    console.log(`📊 Found ${songs.length} songs to process`)

    // Initialize reconciliation service
    const reconciliationService = new DataReconciliationService()
    
    // Process the data
    const startTime = Date.now()
    const result = await reconciliationService.reconcileData(songs)
    const endTime = Date.now()

    // Display results
    console.log('\n🎉 Batch loading completed!')
    console.log(`⏱️  Processing time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`)
    console.log(`✅ Created: ${result.created} songs`)
    console.log(`🔄 Updated: ${result.updated} songs`)
    console.log(`🗑️  Deleted: ${result.deleted} songs`)
    console.log(`❌ Errors: ${result.errors.length} errors`)
    console.log(`📈 Total processed: ${result.summary.totalProcessed} songs`)

    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:')
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`)
      })
    }

    // Save results to file
    const resultsPath = path.join(process.cwd(), 'logs', `load-results-${Date.now()}.json`)
    fs.mkdirSync(path.dirname(resultsPath), { recursive: true })
    fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2))
    console.log(`📄 Results saved to: ${resultsPath}`)

  } catch (error) {
    console.error('💥 Fatal error during batch loading:', error)
    process.exit(1)
  }
}

// Run the batch loading
if (require.main === module) {
  batchLoadSongs()
}

export { batchLoadSongs }

