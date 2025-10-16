"use client"

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Collapse,
  Alert,
  Button,
  Divider
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon
} from '@mui/icons-material'
import { searchCache, cacheUtils } from '@/lib/services/search-cache'

interface EnhancedCacheStatusProps {
  showDetails?: boolean
  compact?: boolean
}

export function EnhancedCacheStatus({ showDetails = true, compact = false }: EnhancedCacheStatusProps) {
  const [expanded, setExpanded] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const loadStats = async () => {
    setLoading(true)
    try {
      const cacheStats = searchCache.getStats()
      setStats(cacheStats)
    } catch (error) {
      console.error('Failed to load cache stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`
  }

  const handleClearCache = async () => {
    try {
      cacheUtils.clearSearchCache()
      await loadStats()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  const handleRefresh = () => {
    loadStats()
  }

  if (!stats) {
    return (
      <Box sx={{ p: 1 }}>
        <Typography variant="caption" sx={{ color: 'rgb(163, 163, 163)' }}>
          Loading cache status...
        </Typography>
      </Box>
    )
  }

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
        <StorageIcon sx={{ fontSize: 16, color: 'rgb(163, 163, 163)' }} />
        <Typography variant="caption" sx={{ color: 'rgb(163, 163, 163)' }}>
          {stats.totalEntries} entries, {formatBytes(stats.totalSize)}
        </Typography>
        <Chip
          label={`${formatPercentage(stats.hitRate)} hit rate`}
          size="small"
          color={stats.hitRate > 0.7 ? 'success' : stats.hitRate > 0.4 ? 'warning' : 'default'}
          sx={{ height: 18, fontSize: '0.65rem' }}
        />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2, borderTop: '1px solid rgb(38, 38, 38)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon sx={{ fontSize: 18, color: 'rgb(163, 163, 163)' }} />
          <Typography variant="subtitle2" sx={{ color: 'rgb(250, 250, 250)', fontWeight: 600 }}>
            Enhanced Cache Status
          </Typography>
          {loading && <LinearProgress sx={{ width: 20, height: 2 }} />}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Refresh cache stats">
            <IconButton size="small" onClick={handleRefresh} disabled={loading}>
              <RefreshIcon sx={{ fontSize: 16, color: 'rgb(163, 163, 163)' }} />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Clear search cache">
            <IconButton size="small" onClick={handleClearCache}>
              <ClearIcon sx={{ fontSize: 16, color: 'rgb(163, 163, 163)' }} />
            </IconButton>
          </Tooltip>
          
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Basic Stats */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Chip
          icon={<StorageIcon />}
          label={`${stats.totalEntries} entries`}
          size="small"
          color="info"
          variant="outlined"
        />
        <Chip
          icon={<MemoryIcon />}
          label={formatBytes(stats.totalSize)}
          size="small"
          color="info"
          variant="outlined"
        />
        <Chip
          icon={<SpeedIcon />}
          label={`${formatPercentage(stats.hitRate)} hit rate`}
          size="small"
          color={stats.hitRate > 0.7 ? 'success' : stats.hitRate > 0.4 ? 'warning' : 'default'}
          variant="outlined"
        />
      </Box>

      {/* Performance Indicator */}
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'rgb(163, 163, 163)' }}>
            Cache Performance
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgb(163, 163, 163)' }}>
            {formatPercentage(stats.hitRate)} hits / {formatPercentage(stats.missRate)} misses
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={stats.hitRate * 100}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: 'rgb(38, 38, 38)',
            '& .MuiLinearProgress-bar': {
              bgcolor: stats.hitRate > 0.7 ? 'rgb(34, 197, 94)' : stats.hitRate > 0.4 ? 'rgb(251, 191, 36)' : 'rgb(239, 68, 68)'
            }
          }}
        />
      </Box>

      {/* Detailed Stats */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2, borderColor: 'rgb(38, 38, 38)' }} />
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'rgb(163, 163, 163)', display: 'block', mb: 0.5 }}>
                Average Access Time
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgb(250, 250, 250)', fontWeight: 500 }}>
                {stats.averageAccessTime.toFixed(2)}ms
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" sx={{ color: 'rgb(163, 163, 163)', display: 'block', mb: 0.5 }}>
                Cache Age
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgb(250, 250, 250)', fontWeight: 500 }}>
                {stats.newestEntry > 0 ? 
                  `${Math.floor((Date.now() - stats.newestEntry) / 1000)}s ago` : 
                  'N/A'
                }
              </Typography>
            </Box>
          </Box>

          {/* Cache Health */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: 'rgb(163, 163, 163)', display: 'block', mb: 1 }}>
              Cache Health
            </Typography>
            
            {stats.hitRate > 0.8 ? (
              <Alert severity="success" sx={{ py: 0.5 }}>
                Excellent cache performance
              </Alert>
            ) : stats.hitRate > 0.5 ? (
              <Alert severity="info" sx={{ py: 0.5 }}>
                Good cache performance
              </Alert>
            ) : stats.hitRate > 0.2 ? (
              <Alert severity="warning" sx={{ py: 0.5 }}>
                Moderate cache performance
              </Alert>
            ) : (
              <Alert severity="error" sx={{ py: 0.5 }}>
                Poor cache performance
              </Alert>
            )}
          </Box>

          {/* Cache Actions */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleClearCache}
              startIcon={<ClearIcon />}
              sx={{ 
                color: 'rgb(163, 163, 163)',
                borderColor: 'rgb(64, 64, 64)',
                '&:hover': {
                  borderColor: 'rgb(239, 68, 68)',
                  color: 'rgb(239, 68, 68)'
                }
              }}
            >
              Clear Cache
            </Button>
            
            <Button
              size="small"
              variant="outlined"
              onClick={handleRefresh}
              startIcon={<RefreshIcon />}
              disabled={loading}
              sx={{ 
                color: 'rgb(163, 163, 163)',
                borderColor: 'rgb(64, 64, 64)',
                '&:hover': {
                  borderColor: 'rgb(59, 130, 246)',
                  color: 'rgb(59, 130, 246)'
                }
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  )
}
