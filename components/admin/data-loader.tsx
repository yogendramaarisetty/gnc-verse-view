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
  Chip,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  MusicNote,
  Person,
  Language,
  TrendingUp,
} from '@mui/icons-material'

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

interface DatabaseStats {
  totalSongs: number
  totalArtists: number
  recentSongs: any[]
  topArtists: any[]
  languageDistribution: Record<string, number>
}

export function DataLoader() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
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
      await fetchStats() // Refresh stats after loading

    } catch (err) {
      setError(err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/load-data')
      const data = await response.json()
      
      if (response.ok) {
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      'Telugu': '#FF6B6B',
      'Malayalam': '#4ECDC4',
      'Tamil': '#45B7D1',
      'Hindi': '#96CEB4',
      'Bengali': '#FFEAA7',
      'Kannada': '#DDA0DD',
      'English': '#98D8C8',
    }
    return colors[language] || '#95A5A6'
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'rgb(250, 250, 250)', mb: 3 }}>
        Data Loader
      </Typography>

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={6}>
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
        </Grid>

        {/* Database Stats */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: 'rgb(20, 20, 20)', border: '1px solid rgb(38, 38, 38)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'rgb(250, 250, 250)', mb: 2 }}>
                Database Statistics
              </Typography>
              
              {stats ? (
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, bgcolor: 'rgb(38, 38, 38)', textAlign: 'center' }}>
                        <MusicNote sx={{ color: 'rgb(59, 130, 246)', fontSize: 40, mb: 1 }} />
                        <Typography variant="h4" sx={{ color: 'rgb(250, 250, 250)' }}>
                          {stats.totalSongs}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgb(163, 163, 163)' }}>
                          Total Songs
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, bgcolor: 'rgb(38, 38, 38)', textAlign: 'center' }}>
                        <Person sx={{ color: 'rgb(59, 130, 246)', fontSize: 40, mb: 1 }} />
                        <Typography variant="h4" sx={{ color: 'rgb(250, 250, 250)' }}>
                          {stats.totalArtists}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgb(163, 163, 163)' }}>
                          Total Artists
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Typography variant="subtitle1" sx={{ color: 'rgb(250, 250, 250)', mt: 2, mb: 1 }}>
                    Language Distribution
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(stats.languageDistribution).map(([language, count]) => (
                      <Chip
                        key={language}
                        label={`${language}: ${count}`}
                        sx={{
                          bgcolor: getLanguageColor(language),
                          color: 'white',
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Songs */}
        {stats?.recentSongs && (
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'rgb(20, 20, 20)', border: '1px solid rgb(38, 38, 38)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'rgb(250, 250, 250)', mb: 2 }}>
                  Recent Songs
                </Typography>
                <List dense>
                  {stats.recentSongs.slice(0, 5).map((song: any, index: number) => (
                    <ListItem key={song.id} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <MusicNote sx={{ color: 'rgb(163, 163, 163)' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={song.title}
                        secondary={`${song.language} • ${new Date(song.created_at).toLocaleDateString()}`}
                        primaryTypographyProps={{ color: 'rgb(250, 250, 250)' }}
                        secondaryTypographyProps={{ color: 'rgb(163, 163, 163)' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

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

