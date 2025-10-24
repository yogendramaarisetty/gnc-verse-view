'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Upload, Loader2, FileText, Database } from 'lucide-react'

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Chunked Data Loader
          </CardTitle>
          <CardDescription>
            Upload large JSON files by processing them in small chunks to avoid Vercel's payload limits.
            Recommended for files larger than 4MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!uploadProgress.isUploading && !isComplete && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleFileUpload} 
                  disabled={!file}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload & Process
                </Button>
              </div>
              
              {file && (
                <div className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
          )}

          {uploadProgress.isUploading && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing chunk {uploadProgress.currentChunk} of {uploadProgress.totalChunks}</span>
                  <span>{Math.round(uploadProgress.progress)}%</span>
                </div>
                <Progress value={uploadProgress.progress} className="w-full" />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing songs in chunks of {CHUNK_SIZE}...</span>
              </div>
            </div>
          )}

          {isComplete && (
            <div className="space-y-4">
              <Alert className={hasErrors ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}>
                <div className="flex items-center gap-2">
                  {hasErrors ? (
                    <XCircle className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <AlertDescription>
                    {hasErrors ? 'Upload completed with errors' : 'Upload completed successfully!'}
                  </AlertDescription>
                </div>
              </Alert>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {uploadProgress.results.reduce((sum, r) => sum + r.created, 0)}
                  </div>
                  <div className="text-sm text-green-700">Created</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {uploadProgress.results.reduce((sum, r) => sum + r.updated, 0)}
                  </div>
                  <div className="text-sm text-blue-700">Updated</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {uploadProgress.results.reduce((sum, r) => sum + r.deleted, 0)}
                  </div>
                  <div className="text-sm text-red-700">Deleted</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {uploadProgress.results.reduce((sum, r) => sum + r.errors.length, 0) + uploadProgress.errors.length}
                  </div>
                  <div className="text-sm text-yellow-700">Errors</div>
                </div>
              </div>

              {uploadProgress.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-yellow-800">Errors:</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {uploadProgress.errors.map((error, index) => (
                      <div key={index} className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={resetUpload} variant="outline" className="w-full">
                Upload Another File
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
