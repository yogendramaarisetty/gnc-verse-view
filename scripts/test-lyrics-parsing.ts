#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'

// Test script to debug lyrics parsing
function parseLyrics(lyrics: string): string[] {
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

function parseEnglishLyrics(lyrics: string): string[] {
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

async function testLyricsParsing() {
  try {
    console.log('🔄 Reading sample data...')
    const jsonData = fs.readFileSync(path.join(__dirname, '../data/lyric_export_1.json'), 'utf-8')
    const songs = JSON.parse(jsonData)
    
    console.log(`📊 Found ${songs.length} songs`)
    
    // Test with first few songs
    for (let i = 0; i < Math.min(3, songs.length); i++) {
      const song = songs[i]
      console.log(`\n🎵 Testing song ${i + 1}: "${song.title}"`)
      
      // Test Telugu lyrics
      if (song.telugu_lyrics) {
        console.log('📝 Original Telugu lyrics (first 5 lines):')
        const teluguLines = song.telugu_lyrics.split('\n').slice(0, 5)
        teluguLines.forEach((line, idx) => console.log(`  ${idx + 1}: ${line}`))
        
        const parsedTelugu = parseLyrics(song.telugu_lyrics)
        console.log(`✅ Parsed Telugu lyrics: ${parsedTelugu.length} lines`)
        if (parsedTelugu.length > 0) {
          console.log('📝 First 3 parsed lines:')
          parsedTelugu.slice(0, 3).forEach((line, idx) => console.log(`  ${idx + 1}: ${line}`))
        }
      } else {
        console.log('❌ No Telugu lyrics found')
      }
      
      // Test English lyrics
      if (song.english_lyrics) {
        console.log('\n📝 Original English lyrics (first 5 lines):')
        const englishLines = song.english_lyrics.split('\n').slice(0, 5)
        englishLines.forEach((line, idx) => console.log(`  ${idx + 1}: ${line}`))
        
        const parsedEnglish = parseEnglishLyrics(song.english_lyrics)
        console.log(`✅ Parsed English lyrics: ${parsedEnglish.length} lines`)
        if (parsedEnglish.length > 0) {
          console.log('📝 First 3 parsed lines:')
          parsedEnglish.slice(0, 3).forEach((line, idx) => console.log(`  ${idx + 1}: ${line}`))
        }
      } else {
        console.log('❌ No English lyrics found')
      }
      
      console.log('─'.repeat(80))
    }
    
  } catch (error) {
    console.error('💥 Error testing lyrics parsing:', error)
    process.exit(1)
  }
}

// Run the test
testLyricsParsing()
