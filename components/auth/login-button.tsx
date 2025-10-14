"use client"

import { useState } from "react"
import { Button, Dialog, DialogTitle, DialogContent, TextField, Stack, Typography, Divider, IconButton, InputAdornment } from "@mui/material"
import { Google as GoogleIcon, Visibility, VisibilityOff } from "@mui/icons-material"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface LoginButtonProps {
  onLogin?: () => void
}

export function LoginButton({ onLogin }: LoginButtonProps) {
  const [open, setOpen] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        toast.success("Check your email for the confirmation link!")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        toast.success("Welcome back!")
        setOpen(false)
        onLogin?.()
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message)
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="contained"
        onClick={() => setOpen(true)}
        sx={{
          bgcolor: "rgb(59, 130, 246)",
          "&:hover": { bgcolor: "rgb(37, 99, 235)" },
        }}
      >
        Sign In
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "rgb(20, 20, 20)",
            color: "rgb(250, 250, 250)",
          },
        }}
      >
        <DialogTitle sx={{ color: "rgb(250, 250, 250)", textAlign: "center", pt: 3 }}>
          {isSignUp ? "Create Account" : "Welcome Back"}
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 3 }}>
          <Stack spacing={3}>
            {/* Google OAuth */}
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleAuth}
              disabled={loading}
              sx={{
                borderColor: "rgb(38, 38, 38)",
                color: "rgb(250, 250, 250)",
                "&:hover": {
                  borderColor: "rgb(59, 130, 246)",
                  bgcolor: "rgb(30, 30, 30)",
                },
              }}
            >
              Continue with Google
            </Button>

            <Divider sx={{ borderColor: "rgb(38, 38, 38)" }}>
              <Typography variant="body2" sx={{ color: "rgb(163, 163, 163)", px: 2 }}>
                or
              </Typography>
            </Divider>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  type="email"
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "rgb(38, 38, 38)",
                      color: "rgb(250, 250, 250)",
                      "& fieldset": { borderColor: "rgb(38, 38, 38)" },
                      "&:hover fieldset": { borderColor: "rgb(59, 130, 246)" },
                      "&.Mui-focused fieldset": { borderColor: "rgb(59, 130, 246)" },
                    },
                    "& .MuiInputLabel-root": { color: "rgb(163, 163, 163)" },
                    "& .MuiInputLabel-root.Mui-focused": { color: "rgb(59, 130, 246)" },
                  }}
                />
                <TextField
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: "rgb(163, 163, 163)" }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "rgb(38, 38, 38)",
                      color: "rgb(250, 250, 250)",
                      "& fieldset": { borderColor: "rgb(38, 38, 38)" },
                      "&:hover fieldset": { borderColor: "rgb(59, 130, 246)" },
                      "&.Mui-focused fieldset": { borderColor: "rgb(59, 130, 246)" },
                    },
                    "& .MuiInputLabel-root": { color: "rgb(163, 163, 163)" },
                    "& .MuiInputLabel-root.Mui-focused": { color: "rgb(59, 130, 246)" },
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    bgcolor: "rgb(59, 130, 246)",
                    "&:hover": { bgcolor: "rgb(37, 99, 235)" },
                    "&:disabled": { bgcolor: "rgb(38, 38, 38)" },
                  }}
                >
                  {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
                </Button>
              </Stack>
            </form>

            <Typography
              variant="body2"
              sx={{
                color: "rgb(163, 163, 163)",
                textAlign: "center",
                cursor: "pointer",
                "&:hover": { color: "rgb(59, 130, 246)" },
              }}
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  )
}
