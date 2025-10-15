# Data Loading System

This system provides a comprehensive solution for loading and reconciling song data from JSON files into your Supabase database.

## Features

- ✅ **Smart Reconciliation** - Updates existing songs, creates new ones, removes orphaned data
- ✅ **Language Detection** - Automatically detects Telugu, Malayalam, Tamil, Hindi, Bengali, Kannada, English
- ✅ **Artist Management** - Creates unique artists and avoids duplicates
- ✅ **YouTube Integration** - Extracts video IDs and generates thumbnails
- ✅ **Error Handling** - Comprehensive error tracking and reporting
- ✅ **Admin UI** - Web interface for data management
- ✅ **CLI Tools** - Command-line scripts for batch processing
- ✅ **Progress Tracking** - Real-time progress updates and statistics

## Quick Start

### 1. Web Interface (Recommended)

1. Navigate to `/admin` in your application
2. Upload your JSON file using the web interface
3. Monitor progress and view results

### 2. Command Line Interface

```bash
# Install dependencies
npm install tsx

# Load songs from JSON file
npx tsx scripts/batch-load-songs.ts data/your-songs.json
```

### 3. API Integration

```typescript
const response = await fetch('/api/admin/load-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ songs: yourSongsArray })
})
```

## Data Format

Your JSON file should contain an array of song objects:

```json
[
  {
    "id": 1,
    "title": "Song Title",
    "english_title": "English Title",
    "link": "https://example.com/song",
    "telugu_lyrics": "Telugu lyrics here...",
    "english_lyrics": "English lyrics here...",
    "lyricist": "Lyricist Name",
    "composer": "Composer Name",
    "singer": "Singer Name",
    "category": "Worship",
    "youtube_link": "https://www.youtube.com/embed/VIDEO_ID",
    "scraped": true,
    "scraped_at": "2025-10-09T21:36:57.653228",
    "created_at": "2025-10-09T21:36:54.685557"
  }
]
```

## Reconciliation Process

The system performs intelligent reconciliation:

1. **Build Caches** - Loads existing artists and songs from database
2. **Process Songs** - For each song in JSON:
   - Detect language automatically
   - Find or create artist
   - Update existing song or create new one
3. **Cleanup** - Removes songs that no longer exist in JSON
4. **Update Counts** - Updates artist song counts

## Language Detection

The system automatically detects languages based on Unicode ranges:

- **Telugu**: `[\u0C00-\u0C7F]`
- **Malayalam**: `[\u0D00-\u0D7F]`
- **Tamil**: `[\u0B80-\u0BFF]`
- **Hindi**: `[\u0900-\u097F]`
- **Bengali**: `[\u0980-\u09FF]`
- **Kannada**: `[\u0C80-\u0CFF]`
- **English**: Default fallback

## YouTube Integration

- Extracts YouTube video IDs from embed URLs
- Generates thumbnail URLs automatically
- Sets `has_video` flag based on video presence

## Error Handling

The system provides detailed error reporting:

- **Validation Errors** - Invalid data format
- **Database Errors** - Insert/update failures
- **Processing Errors** - Individual song processing issues
- **Cleanup Errors** - Orphaned song deletion issues

## Database Schema

### Songs Table
```sql
CREATE TABLE songs (
  id UUID PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  title_transliteration VARCHAR(500),
  artist_id UUID REFERENCES artists(id),
  language VARCHAR(50) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  lyrics TEXT[] NOT NULL,
  chords TEXT[],
  original_key VARCHAR(10),
  thumbnail_url TEXT,
  has_video BOOLEAN DEFAULT FALSE,
  video_url TEXT,
  youtube_views BIGINT DEFAULT 0,
  youtube_likes BIGINT DEFAULT 0,
  release_date DATE,
  view_count BIGINT DEFAULT 0,
  trending BOOLEAN DEFAULT FALSE,
  json_id INTEGER, -- Original JSON ID for tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Artists Table
```sql
CREATE TABLE artists (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  photo_url TEXT,
  total_songs INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### POST `/api/admin/load-data`
Load song data from JSON array.

**Request Body:**
```json
{
  "songs": [
    {
      "id": 1,
      "title": "Song Title",
      // ... other song fields
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data loaded successfully",
  "result": {
    "created": 150,
    "updated": 25,
    "deleted": 5,
    "errors": [],
    "summary": {
      "totalProcessed": 175,
      "totalSongs": 1200,
      "totalArtists": 45
    }
  }
}
```

### GET `/api/admin/load-data`
Get current database statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalSongs": 1200,
    "totalArtists": 45,
    "recentSongs": [...],
    "topArtists": [...],
    "languageDistribution": {
      "Telugu": 500,
      "English": 300,
      "Malayalam": 200,
      "Hindi": 100,
      "Tamil": 100
    }
  }
}
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Performance Considerations

- **Batch Processing** - Processes songs in batches to avoid memory issues
- **Rate Limiting** - Small delays between operations to avoid overwhelming Supabase
- **Caching** - Builds caches for efficient lookups
- **Progress Tracking** - Shows progress every 100 songs

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly
   - Check Supabase project settings

2. **Memory Issues**
   - Process large datasets in smaller batches
   - Use CLI tools for very large datasets

3. **Language Detection Issues**
   - Check Unicode ranges for your specific languages
   - Add custom language detection if needed

4. **YouTube Integration Issues**
   - Verify YouTube embed URL format
   - Check video ID extraction logic

### Logs

- Check browser console for web interface errors
- Check server logs for API errors
- Results are saved to `logs/load-results-{timestamp}.json`

## Advanced Usage

### Custom Language Detection

```typescript
// Override language detection in DataReconciliationService
private detectLanguage(title: string, lyrics: string): string {
  // Your custom logic here
  return 'CustomLanguage'
}
```

### Custom Artist Extraction

```typescript
// Override artist extraction in DataReconciliationService
private extractArtistName(song: SongData): string {
  // Your custom logic here
  return 'Custom Artist Name'
}
```

## Support

For issues or questions:
1. Check the error logs
2. Verify your JSON format
3. Ensure database connectivity
4. Check environment variables

The system is designed to be robust and handle various edge cases, but feel free to customize it for your specific needs.

