"use client"

import { Box, Container, Typography, Paper } from '@mui/material'
import { SupabaseLogs } from '@/components/supabase-logs'

export default function AdminLogsPage() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Supabase API Logs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor Supabase database queries, response times, and result counts in real-time.
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <SupabaseLogs showDetails={true} />
      </Paper>
    </Container>
  )
}
