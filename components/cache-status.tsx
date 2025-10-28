"use client"

import { Chip, Tooltip, Box } from '@mui/material'
import { useBackendSearch } from '@/lib/hooks/useBackendSearch'

interface CacheStatusProps {
  showDetails?: boolean
}

export function CacheStatus({ showDetails = false }: CacheStatusProps) {
  const { cacheStats, getCacheStats } = useBackendSearch()

  const getStatusColor = () => {
    if (cacheStats?.cached) return 'success'
    if (cacheStats?.totalHits && cacheStats.totalHits > 0) return 'info'
    return 'default'
  }

  const getStatusText = () => {
    if (cacheStats?.cached) return 'Cached'
    if (cacheStats?.totalHits && cacheStats.totalHits > 0) return 'Cache Active'
    return 'No Cache'
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (!showDetails) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={getStatusText()}
          color={getStatusColor() as any}
          size="small"
          variant="outlined"
        />
        {cacheStats?.cacheHits && (
          <Chip
            label={`${cacheStats.cacheHits} hits`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        label={getStatusText()}
        color={getStatusColor() as any}
        size="small"
        variant="outlined"
      />
      <Tooltip title={`Cache hits: ${cacheStats?.cacheHits || 0}, Total results: ${cacheStats?.totalResults || 0}`}>
        <Chip
          label={`${cacheStats?.cacheHits || 0} hits`}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.7rem' }}
        />
      </Tooltip>
    </Box>
  )
}
