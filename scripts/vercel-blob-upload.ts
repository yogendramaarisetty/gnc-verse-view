#!/usr/bin/env tsx

import { put } from '@vercel/blob'
import fs from 'fs'
import path from 'path'

// Upload large file to Vercel Blob, then process in chunks
async function uploadToVercelBlob() {
  try {
    console.log('🔄 Reading JSON file...')
    const jsonData = fs.readFileSync(path.join(__dirname, '../data/lyric_export_1.json'), 'utf-8')
    
    console.log('📤 Uploading to Vercel Blob...')
    const blob = await put('lyric-export.json', jsonData, {
      access: 'public',
    })
    
    console.log('✅ File uploaded to Vercel Blob:', blob.url)
    console.log('🔗 You can now process this file in chunks using the blob URL')
    
  } catch (error) {
    console.error('💥 Error uploading to Vercel Blob:', error)
    process.exit(1)
  }
}

// Run the upload
uploadToVercelBlob()
