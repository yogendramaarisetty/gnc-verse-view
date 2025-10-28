'use client'

import React, { useState, useCallback } from 'react'
import {
  Button,
  LinearProgress,
  Card,
  CardContent,
  Typography,
  Alert,
  Box,
  Stack,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  CheckCircle,
  Cancel,
  Upload,
  Description,
  Storage,
  Refresh
} from '@mui/icons-material'

interface ChunkedDataLoaderProps {
  onComplete?: (results: any) => void
}

interface ChunkResult {
  chunkIndex: number
  totalChunks: number
  sessionId: string
  created: number
  updated: number
  deleted: number
  errors: string[]
}

interface UploadProgress {
  isUploading: boolean
  currentChunk: number
  totalChunks: number
  progress: number
  results: ChunkResult[]
  errors: string[]
  sessionId: string
}

const CHUNK_SIZE = 50 // Process 50 songs per chunk to stay well under 4.5MB limit
const MAX_RETRIES = 3

export function ChunkedDataLoader({ onComplete }: ChunkedDataLoaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    currentChunk: 0,
    totalChunks: 0,
    progress: 0,
    results: [],
    errors: [],
    sessionId: ''
  })

  const generateSessionId = () => {
    return `chunked_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const processFile = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (!Array.isArray(data)) {
        throw new Error('JSON file must contain an array of songs')
      }

      return data
    } catch (error) {
      throw new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [])

  const uploadChunk = async (songs: any[], chunkIndex: number, totalChunks: number, sessionId: string, retryCount = 0): Promise<ChunkResult> => {
    try {
      const response = await fetch('/api/admin/load-data-chunked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songs,
          chunkIndex,
          totalChunks,
          sessionId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result.result
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        console.warn(`Chunk ${chunkIndex + 1} failed, retrying... (${retryCount + 1}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Exponential backoff
        return uploadChunk(songs, chunkIndex, totalChunks, sessionId, retryCount + 1)
      }
      throw error
    }
  }

  const handleFileUpload = async () => {
    if (!file) return

    const sessionId = generateSessionId()
    
    setUploadProgress({
      isUploading: true,
      currentChunk: 0,
      totalChunks: 0,
      progress: 0,
      results: [],
      errors: [],
      sessionId
    })

    try {
      // Parse the JSON file
      const songs = await processFile(file)
      const totalChunks = Math.ceil(songs.length / CHUNK_SIZE)
      
      setUploadProgress(prev => ({
        ...prev,
        totalChunks,
        progress: 0
      }))

      const results: ChunkResult[] = []
      const errors: string[] = []

      // Process chunks sequentially to avoid overwhelming the server
      for (let i = 0; i < totalChunks; i++) {
        const startIndex = i * CHUNK_SIZE
        const endIndex = Math.min(startIndex + CHUNK_SIZE, songs.length)
        const chunk = songs.slice(startIndex, endIndex)

        try {
          const result = await uploadChunk(chunk, i, totalChunks, sessionId)
          results.push(result)
          
          setUploadProgress(prev => ({
            ...prev,
            currentChunk: i + 1,
            progress: ((i + 1) / totalChunks) * 100,
            results: [...results]
          }))
        } catch (error) {
          const errorMessage = `Chunk ${i + 1}/${totalChunks} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMessage)
          console.error(errorMessage, error)
          
          setUploadProgress(prev => ({
            ...prev,
            currentChunk: i + 1,
            progress: ((i + 1) / totalChunks) * 100,
            errors: [...errors]
          }))
        }
      }

      // Calculate final results
      const totalCreated = results.reduce((sum, r) => sum + r.created, 0)
      const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0)
      const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0)
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0) + errors.length

      setUploadProgress(prev => ({
        ...prev,
        isUploading: false
      }))

      if (onComplete) {
        onComplete({
          totalCreated,
          totalUpdated,
          totalDeleted,
          totalErrors,
          results,
          errors
        })
      }

    } catch (error) {
      console.error('Upload failed:', error)
      setUploadProgress(prev => ({
        ...prev,
        isUploading: false,
        errors: [...prev.errors, `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }))
    }
  }

  const resetUpload = () => {
    setFile(null)
    setUploadProgress({
      isUploading: false,
      currentChunk: 0,
      totalChunks: 0,
      progress: 0,
      results: [],
      errors: [],
      sessionId: ''
    })
  }

  const isComplete = uploadProgress.totalChunks > 0 && uploadProgress.currentChunk >= uploadProgress.totalChunks
  const hasErrors = uploadProgress.errors.length > 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Storage />
            <Typography variant="h6">Chunked Data Loader</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload large JSON files by processing them in small chunks to avoid Vercel's payload limits.
            Recommended for files larger than 4MB.
          </Typography>
          
          {!uploadProgress.isUploading && !isComplete && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ flex: 1 }}
                />
                <Button 
                  onClick={handleFileUpload} 
                  disabled={!file}
                  variant="contained"
                  startIcon={<Upload />}
                >
                  Upload & Process
                </Button>
              </Box>
              
              {file && (
                <Typography variant="body2" color="text.secondary">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
              )}
            </Stack>
          )}

          {uploadProgress.isUploading && (
            <Stack spacing={2}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Processing chunk {uploadProgress.currentChunk} of {uploadProgress.totalChunks}
                  </Typography>
                  <Typography variant="body2">
                    {Math.round(uploadProgress.progress)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={uploadProgress.progress} 
                  sx={{ width: '100%' }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Processing songs in chunks of {CHUNK_SIZE}...
                </Typography>
              </Box>
            </Stack>
          )}

          {isComplete && (
            <Stack spacing={2}>
              <Alert 
                severity={hasErrors ? "warning" : "success"}
                icon={hasErrors ? <Cancel /> : <CheckCircle />}
              >
                <Typography variant="body2">
                  {hasErrors ? 'Upload completed with errors' : 'Upload completed successfully!'}
                </Typography>
              </Alert>

              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 2 
              }}>
                <Box sx={{ 
                  textAlign: 'center', 
                  p: 2, 
                  bgcolor: 'success.light', 
                  borderRadius: 1,
                  color: 'success.contrastText'
                }}>
                  <Typography variant="h4" fontWeight="bold">
                    {uploadProgress.results.reduce((sum, r) => sum + r.created, 0)}
                  </Typography>
                  <Typography variant="body2">Created</Typography>
                </Box>
                <Box sx={{ 
                  textAlign: 'center', 
                  p: 2, 
                  bgcolor: 'info.light', 
                  borderRadius: 1,
                  color: 'info.contrastText'
                }}>
                  <Typography variant="h4" fontWeight="bold">
                    {uploadProgress.results.reduce((sum, r) => sum + r.updated, 0)}
                  </Typography>
                  <Typography variant="body2">Updated</Typography>
                </Box>
                <Box sx={{ 
                  textAlign: 'center', 
                  p: 2, 
                  bgcolor: 'error.light', 
                  borderRadius: 1,
                  color: 'error.contrastText'
                }}>
                  <Typography variant="h4" fontWeight="bold">
                    {uploadProgress.results.reduce((sum, r) => sum + r.deleted, 0)}
                  </Typography>
                  <Typography variant="body2">Deleted</Typography>
                </Box>
                <Box sx={{ 
                  textAlign: 'center', 
                  p: 2, 
                  bgcolor: 'warning.light', 
                  borderRadius: 1,
                  color: 'warning.contrastText'
                }}>
                  <Typography variant="h4" fontWeight="bold">
                    {uploadProgress.results.reduce((sum, r) => sum + r.errors.length, 0) + uploadProgress.errors.length}
                  </Typography>
                  <Typography variant="body2">Errors</Typography>
                </Box>
              </Box>

              {uploadProgress.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1 }}>
                    Errors:
                  </Typography>
                  <Box sx={{ 
                    maxHeight: 128, 
                    overflow: 'auto',
                    border: 1,
                    borderColor: 'warning.light',
                    borderRadius: 1,
                    p: 1
                  }}>
                    <Stack spacing={0.5}>
                      {uploadProgress.errors.map((error, index) => (
                        <Box 
                          key={index} 
                          sx={{ 
                            p: 1, 
                            bgcolor: 'warning.light', 
                            borderRadius: 0.5,
                            fontSize: '0.875rem'
                          }}
                        >
                          {error}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Box>
              )}

              <Button 
                onClick={resetUpload} 
                variant="outlined" 
                fullWidth
                startIcon={<Refresh />}
              >
                Upload Another File
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
