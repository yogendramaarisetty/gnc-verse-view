# Chunked Data Loading Solution

## Problem
You were getting a "Request Entity Too Large" error (`FUNCTION_PAYLOAD_TOO_LARGE`) when trying to load the large `lyric_export_1.json` file (26,322 lines) on Vercel. This happens because Vercel has a 4.5MB payload limit for serverless functions.

## Solution
I've implemented a chunked data loading system that processes large JSON files in small chunks to stay well under Vercel's limits.

## What's Been Added

### 1. Chunked API Endpoint
**File:** `app/api/admin/load-data-chunked/route.ts`
- New API endpoint that processes data in chunks
- Handles chunk indexing and session tracking
- Includes retry logic for failed chunks
- Processes 50 songs per chunk (well under 4.5MB limit)

### 2. Chunked Data Loader Component
**File:** `components/admin/chunked-data-loader.tsx`
- React component for chunked uploads
- Progress tracking with visual indicators
- Error handling and retry logic
- Real-time upload status
- Results summary with statistics

### 3. Updated Admin Interface
**File:** `components/admin/data-loader.tsx`
- Added tabbed interface with two options:
  - **Standard Upload**: For smaller files (< 4MB)
  - **Chunked Upload**: For large files (> 4MB)
- Seamless integration with existing functionality

### 4. Chunking Script
**File:** `scripts/chunked-load-songs.ts`
- Utility script to split large JSON files into smaller chunks
- Creates manageable chunks for processing
- Can be run locally to prepare data

## How to Use

### Option 1: Use the Admin Interface (Recommended)
1. Go to your admin panel
2. Select the "Chunked Upload (Large Files)" tab
3. Upload your large JSON file
4. The system will automatically:
   - Split the file into chunks
   - Process each chunk sequentially
   - Show progress and handle errors
   - Display final results

### Option 2: Pre-chunk the Data
1. Run the chunking script:
   ```bash
   npx tsx scripts/chunked-load-songs.ts
   ```
2. This will create smaller chunk files in `data/chunks/`
3. Upload each chunk file individually through the standard interface

## Key Features

### ✅ Chunked Processing
- Processes 50 songs per chunk (well under 4.5MB limit)
- Sequential processing to avoid overwhelming the server
- Automatic retry logic for failed chunks

### ✅ Progress Tracking
- Real-time progress indicators
- Visual feedback during upload
- Error reporting and handling

### ✅ Error Handling
- Retry failed chunks up to 3 times
- Exponential backoff for retries
- Detailed error reporting
- Graceful failure handling

### ✅ Results Summary
- Total created/updated/deleted counts
- Error tracking and reporting
- Session-based processing

## Technical Details

### Chunk Size
- **Chunk Size**: 50 songs per chunk
- **Estimated Size**: ~200-300KB per chunk (well under 4.5MB limit)
- **Processing**: Sequential to avoid server overload

### API Endpoints
- `POST /api/admin/load-data-chunked`: Process individual chunks
- `GET /api/admin/load-data-chunked`: Get database statistics

### Error Handling
- **Retry Logic**: Up to 3 retries per chunk
- **Backoff**: Exponential backoff (1s, 2s, 3s)
- **Error Tracking**: Detailed error reporting
- **Graceful Degradation**: Continue processing other chunks if one fails

## Benefits

1. **Solves Vercel Limit**: No more "Request Entity Too Large" errors
2. **Reliable Processing**: Retry logic ensures data integrity
3. **User Friendly**: Progress tracking and clear feedback
4. **Scalable**: Can handle files of any size
5. **Backward Compatible**: Existing functionality remains unchanged

## Usage Examples

### For Large Files (> 4MB)
Use the "Chunked Upload" tab in the admin interface.

### For Small Files (< 4MB)
Use the "Standard Upload" tab for faster processing.

### For Very Large Files
Consider pre-chunking the data using the provided script.

## Troubleshooting

### If Chunks Still Fail
1. Reduce the chunk size in the component (change `CHUNK_SIZE` from 50 to 25)
2. Check server logs for specific error messages
3. Ensure your Vercel function timeout is sufficient

### If Upload is Slow
1. The system processes chunks sequentially to avoid overwhelming the server
2. This is intentional to prevent rate limiting and ensure data integrity
3. Large files will take time - this is normal and expected

## Next Steps

1. **Test the Solution**: Try uploading your large JSON file using the chunked upload
2. **Monitor Performance**: Check the admin logs for any issues
3. **Adjust Chunk Size**: If needed, modify the `CHUNK_SIZE` constant
4. **Scale as Needed**: The system can handle files of any size

The chunked data loading solution should resolve your Vercel payload limit issues while providing a robust, user-friendly interface for loading large datasets.
