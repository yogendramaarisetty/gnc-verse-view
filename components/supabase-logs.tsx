"use client"

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import ClearIcon from '@mui/icons-material/Clear'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'

interface SupabaseLogEntry {
  timestamp: string
  method: string
  table: string
  operation: string
  url: string
  resultCount: number
  duration: number
  status: 'success' | 'error'
  error?: string
}

interface SupabaseLogsProps {
  showDetails?: boolean
}

export function SupabaseLogs({ showDetails = false }: SupabaseLogsProps) {
  const [logs, setLogs] = useState<SupabaseLogEntry[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/logs/supabase?limit=50')
      if (!response.ok) {
        throw new Error('Failed to fetch logs')
      }
      
      const data = await response.json()
      setLogs(data.logs)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = async () => {
    try {
      const response = await fetch('/api/logs/supabase?clear=true', {
        method: 'GET'
      })
      if (!response.ok) {
        throw new Error('Failed to clear logs')
      }
      setLogs([])
      setStats(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear logs')
    }
  }

  useEffect(() => {
    fetchLogs()
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getStatusIcon = (status: string) => {
    return status === 'success' ? (
      <CheckCircleIcon sx={{ color: 'success.main', fontSize: '1rem' }} />
    ) : (
      <ErrorIcon sx={{ color: 'error.main', fontSize: '1rem' }} />
    )
  }

  const getStatusColor = (status: string) => {
    return status === 'success' ? 'success' : 'error'
  }

  if (!showDetails) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={`${stats?.total || 0} queries`}
          size="small"
          color="info"
          variant="outlined"
        />
        {stats?.errors > 0 && (
          <Chip
            label={`${stats.errors} errors`}
            size="small"
            color="error"
            variant="outlined"
          />
        )}
        <Tooltip title="View Supabase logs">
          <IconButton size="small" onClick={fetchLogs}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Supabase API Logs</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchLogs}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ClearIcon />}
            onClick={clearLogs}
            color="error"
          >
            Clear
          </Button>
        </Box>
      </Box>

      {stats && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`Total: ${stats.total}`} color="primary" variant="outlined" />
          <Chip label={`Success: ${stats.success}`} color="success" variant="outlined" />
          <Chip label={`Errors: ${stats.errors}`} color="error" variant="outlined" />
          <Chip label={`Avg: ${stats.avgDuration}ms`} color="info" variant="outlined" />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Table</TableCell>
              <TableCell>Operation</TableCell>
              <TableCell align="right">Results</TableCell>
              <TableCell align="right">Duration</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log, index) => (
              <TableRow key={index} hover>
                <TableCell>
                  <Typography variant="caption">
                    {formatTimestamp(log.timestamp)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {log.table}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {log.operation}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {log.resultCount}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {log.duration}ms
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title={log.error || 'Success'}>
                    {getStatusIcon(log.status)}
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {logs.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Typography variant="body2" color="text.secondary">
            No Supabase queries logged yet
          </Typography>
        </Box>
      )}
    </Box>
  )
}
