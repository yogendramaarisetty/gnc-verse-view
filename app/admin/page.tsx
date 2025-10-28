"use client"

import { useEffect, useState } from 'react'
import { Box, Typography, Alert, CircularProgress } from '@mui/material'
import { DataLoader } from '@/components/admin/data-loader'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
        return
      }
      
      // For now, allow any authenticated user
      // You can add more sophisticated admin role checking here
      setIsAuthorized(true)
      setCheckingAuth(false)
    }
  }, [user, loading, router])

  if (loading || checkingAuth) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        bgcolor: 'rgb(10, 10, 10)'
      }}>
        <CircularProgress sx={{ color: 'rgb(59, 130, 246)' }} />
      </Box>
    )
  }

  if (!isAuthorized) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        bgcolor: 'rgb(10, 10, 10)'
      }}>
        <Alert severity="error" sx={{ bgcolor: 'rgb(30, 20, 20)' }}>
          Access denied. Admin privileges required.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'rgb(10, 10, 10)',
      pt: 2
    }}>
      <DataLoader />
    </Box>
  )
}

