"use client"

import { useState, useRef } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  CloudUpload,
  Error as ErrorIcon,
  Upload,
  Storage,
} from '@mui/icons-material'
import { ChunkedDataLoader } from './chunked-data-loader'

interface LoadResult {
  created: number
  updated: number
  deleted: number
  errors: string[]
  summary: {
    totalProcessed: number
    totalSongs: number
    totalArtists: number
  }
}

export function DataLoader() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const text = await file.text()
      const songs = JSON.parse(text)

      if (!Array.isArray(songs)) {
        throw new Error('Invalid JSON format. Expected array of songs.')
      }

      const response = await fetch('/api/admin/load-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ songs }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load data')
      }

      setResult(data.result)

    } catch (err) {
      setError(err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleChunkedComplete = (results: any) => {
    setResult({
      created: results.totalCreated,
      updated: results.totalUpdated,
      deleted: results.totalDeleted,
      errors: results.errors,
      summary: {
        totalProcessed: results.totalCreated + results.totalUpdated,
        totalSongs: results.totalCreated + results.totalUpdated,
        totalArtists: 0
      }
    })
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'rgb(250, 250, 250)', mb: 3 }}>
        Data Loader
      </Typography>

      <Card sx={{ bgcolor: 'rgb(20, 20, 20)', border: '1px solid rgb(38, 38, 38)', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ 
            borderBottom: '1px solid rgb(38, 38, 38)',
            '& .MuiTab-root': { color: 'rgb(163, 163, 163)' },
            '& .Mui-selected': { color: 'rgb(59, 130, 246)' }
          }}
        >
          <Tab 
            icon={<Upload />} 
            label="Standard Upload" 
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            icon={<Storage />} 
            label="Chunked Upload (Large Files)" 
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
        </Tabs>
      </Card>

      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Upload Section */}
        <Card sx={{ bgcolor: 'rgb(20, 20, 20)', border: '1px solid rgb(38, 38, 38)' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'rgb(250, 250, 250)', mb: 2 }}>
              Load Song Data
            </Typography>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />

            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={handleUploadClick}
              disabled={loading}
              sx={{
                bgcolor: 'rgb(59, 130, 246)',
                '&:hover': { bgcolor: 'rgb(37, 99, 235)' },
                mb: 2,
              }}
            >
              {loading ? 'Loading...' : 'Upload JSON File'}
            </Button>

            {loading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress sx={{ bgcolor: 'rgb(38, 38, 38)' }} />
                <Typography variant="body2" sx={{ color: 'rgb(163, 163, 163)', mt: 1 }}>
                  Processing data...
                </Typography>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2, bgcolor: 'rgb(30, 20, 20)' }}>
                {error}
              </Alert>
            )}

            {result && (
              <Alert severity="success" sx={{ mt: 2, bgcolor: 'rgb(20, 30, 20)' }}>
                <Typography variant="body2" sx={{ color: 'rgb(250, 250, 250)' }}>
                  Data loaded successfully! Created: {result.created}, Updated: {result.updated}, Deleted: {result.deleted}
                </Typography>
                {result.errors.length > 0 && (
                  <Button
                    size="small"
                    onClick={() => setShowDetails(true)}
                    sx={{ color: 'rgb(59, 130, 246)', mt: 1 }}
                  >
                    View {result.errors.length} errors
                  </Button>
                )}
              </Alert>
            )}
          </CardContent>
        </Card>
        </Box>
      )}

      {activeTab === 1 && (
        <ChunkedDataLoader onComplete={handleChunkedComplete} />
      )}

      {/* Error Details Dialog */}
      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: 'rgb(250, 250, 250)', bgcolor: 'rgb(20, 20, 20)' }}>
          Error Details
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'rgb(20, 20, 20)' }}>
          <List>
            {result?.errors.map((error, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <ListItemIcon>
                  <ErrorIcon sx={{ color: 'rgb(239, 68, 68)' }} />
                </ListItemIcon>
                <ListItemText
                  primary={error}
                  primaryTypographyProps={{ color: 'rgb(250, 250, 250)', fontSize: '0.875rem' }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'rgb(20, 20, 20)' }}>
          <Button onClick={() => setShowDetails(false)} sx={{ color: 'rgb(59, 130, 246)' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

