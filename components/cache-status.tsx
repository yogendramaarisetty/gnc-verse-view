"use client"

import { Chip, Tooltip, Box } from '@mui/material'
import { useCacheInitialization } from '@/lib/hooks/useSongs'

interface CacheStatusProps {
  showDetails?: boolean
}

export function CacheStatus({ showDetails = false }: CacheStatusProps) {
  const { isInitialized, isInitializing, cacheStats } = useCacheInitialization()

  if (!showDetails) {
    return null
  }

  const getStatusColor = () => {
    if (isInitializing) return 'warning'
    if (isInitialized && cacheStats.valid > 50) return 'success'
    if (isInitialized && cacheStats.valid > 20) return 'info'
    return 'default'
  }

  const getStatusText = () => {
    if (isInitializing) return 'Initializing...'
    if (isInitialized && cacheStats.valid > 50) return 'Cache Active'
    if (isInitialized && cacheStats.valid > 20) return 'Cache Partial'
    return 'Cache Empty'
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        label={getStatusText()}
        color={getStatusColor() as any}
        size="small"
        variant="outlined"
      />
      <Tooltip title={`Valid: ${cacheStats.valid}, Total: ${cacheStats.total}, Full Songs: ${cacheStats.fullSongs}, Size: ${formatSize(cacheStats.size)}`}>
        <Chip
          label={`${cacheStats.valid}/${cacheStats.total} (${cacheStats.fullSongs} full)`}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.7rem' }}
        />
      </Tooltip>
    </Box>
  )
}
