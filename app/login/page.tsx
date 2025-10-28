"use client"

import { useState } from "react"
import { Box, Container, Typography, TextField, Button, Alert, CircularProgress } from "@mui/material"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage("Sign in successful! Redirecting...")
        router.push("/")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage("Check your email for the confirmation link!")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      }
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgb(10, 10, 10)",
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            bgcolor: "rgb(20, 20, 20)",
            borderRadius: 2,
            p: 4,
            border: "1px solid rgb(38, 38, 38)",
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              textAlign: "center",
              mb: 3,
              color: "rgb(250, 250, 250)",
              fontWeight: 600,
            }}
          >
            Sign In
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {message && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSignIn} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mb: 2,
                bgcolor: "rgb(59, 130, 246)",
                "&:hover": { bgcolor: "rgb(37, 99, 235)" },
              }}
            >
              {loading ? <CircularProgress size={24} /> : "Sign In"}
            </Button>
          </Box>

          <Button
            fullWidth
            variant="outlined"
            onClick={handleSignUp}
            disabled={loading}
            sx={{
              mb: 2,
              borderColor: "rgb(38, 38, 38)",
              color: "rgb(250, 250, 250)",
              "&:hover": {
                borderColor: "rgb(59, 130, 246)",
                bgcolor: "rgba(59, 130, 246, 0.1)",
              },
            }}
          >
            Sign Up
          </Button>

          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogleSignIn}
            disabled={loading}
            sx={{
              borderColor: "rgb(38, 38, 38)",
              color: "rgb(250, 250, 250)",
              "&:hover": {
                borderColor: "rgb(59, 130, 246)",
                bgcolor: "rgba(59, 130, 246, 0.1)",
              },
            }}
          >
            Continue with Google
          </Button>

          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              mt: 3,
              color: "rgb(163, 163, 163)",
            }}
          >
            GNC Worship Tool
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
