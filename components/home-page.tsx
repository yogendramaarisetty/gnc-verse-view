"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Box, 
  Typography, 
  Card, 
  CardMedia, 
  CardContent, 
  IconButton, 
  Chip,
  Stack,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Button,
  Skeleton
} from "@mui/material"
import { 
  PlayArrow, 
  MoreVert, 
  TrendingUp, 
  History, 
  Favorite, 
  Star,
  ChevronRight
} from "@mui/icons-material"
import { useAuth } from "@/lib/hooks/useAuth"
import { useFavorites } from "@/lib/hooks/useFavorites"
import { useHistory } from "@/lib/hooks/useHistory"
import { useSongs } from "@/lib/hooks/useSongs"
import type { Song } from "@/lib/types"

interface HomePageProps {
  onSelectSong: (song: Song) => void
}

interface SectionCardProps {
  song: Song
  onSelectSong: (song: Song) => void
  onToggleFavorite: (songId: string) => void
  isFavorite: boolean
}

function SectionCard({ song, onSelectSong, onToggleFavorite, isFavorite }: SectionCardProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box
      sx={{
        width: 160, // Fixed width for horizontal scrolling
        flexShrink: 0, // Prevent shrinking
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
        },
      }}
      onClick={() => onSelectSong(song)}
    >
      <Box sx={{ position: 'relative', mb: 1 }}>
        <CardMedia
          component="img"
          height={160} // Fixed height for all thumbnails
          image={song.thumbnail || '/placeholder.jpg'}
          alt={song.title}
          sx={{
            objectFit: 'cover',
            borderRadius: 1.5,
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.05)',
            },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.3)',
            opacity: 0,
            transition: 'opacity 0.2s ease-in-out',
            borderRadius: 1.5,
            '&:hover': {
              opacity: 1,
            },
          }}
        >
          <IconButton
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              color: 'rgb(20, 20, 20)',
              width: 32,
              height: 32,
              '&:hover': {
                bgcolor: 'white',
                transform: 'scale(1.1)',
              },
            }}
            onClick={(e) => {
              e.stopPropagation()
              onSelectSong(song)
            }}
          >
            <PlayArrow sx={{ fontSize: '1rem' }} />
          </IconButton>
        </Box>
        <IconButton
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            width: 24,
            height: 24,
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.8)',
            },
          }}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(song.id)
          }}
        >
          <Favorite sx={{ fontSize: '0.8rem', color: isFavorite ? 'rgb(239, 68, 68)' : 'white' }} />
        </IconButton>
      </Box>
      {/* Text content without background */}
      <Box sx={{ px: 0.5 }}>
        <Typography
          variant="subtitle2"
          sx={{
            color: 'white',
            fontWeight: 600,
            mb: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.875rem',
            lineHeight: 1.2,
          }}
        >
          {song.title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'rgb(163, 163, 163)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.75rem',
            lineHeight: 1.2,
          }}
        >
          {song.artist.name}
        </Typography>
        {song.youtubeViews > 0 && (
          <Typography
            variant="caption"
            sx={{
              color: 'rgb(100, 100, 100)',
              display: 'block',
              mt: 0.5,
              fontSize: '0.65rem',
            }}
          >
            {song.youtubeViews.toLocaleString()} views
          </Typography>
        )}
      </Box>
    </Box>
  )
}

function SectionHeader({ 
  title, 
  icon, 
  onViewAll, 
  showViewAll = true 
}: { 
  title: string
  icon: React.ReactNode
  onViewAll?: () => void
  showViewAll?: boolean
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
          {title}
        </Typography>
      </Box>
      {showViewAll && onViewAll && (
        <Button
          endIcon={<ChevronRight />}
          sx={{
            color: 'rgb(163, 163, 163)',
            textTransform: 'none',
            '&:hover': {
              color: 'white',
            },
          }}
          onClick={onViewAll}
        >
          View all
        </Button>
      )}
    </Box>
  )
}

function LoadingSkeleton() {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, overflow: 'hidden' }}>
      {Array.from({ length: 8 }).map((_, index) => (
        <Box key={index} sx={{ 
          width: 160,
          flexShrink: 0
        }}>
          <Skeleton 
            variant="rectangular" 
            height={160} 
            sx={{ 
              borderRadius: 1.5,
              mb: 1
            }} 
          />
          <Box sx={{ px: 0.5 }}>
            <Skeleton variant="text" height={16} />
            <Skeleton variant="text" height={14} width="70%" />
            <Skeleton variant="text" height={12} width="50%" />
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export function HomePage({ onSelectSong }: HomePageProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { user } = useAuth()
  
  // Hooks for data
  const { favorites, toggleFavoriteStatus } = useFavorites()
  const { history } = useHistory()
  
  // Get trending songs
  const { songs: trendingSongs, loading: trendingLoading } = useSongs({ 
    trending: true, 
    limit: 8 
  })
  
  // Get all songs for all-time hits (sorted by views)
  const { songs: allSongs, loading: allSongsLoading } = useSongs({ 
    limit: 50 
  })
  
  // Get recent songs from history
  const recentSongs = useMemo(() => {
    if (!history || history.length === 0) return []
    
    // Get recent song IDs from history
    const recentSongIds = history.slice(0, 8).map(h => h.id)
    
    // Find songs that match these IDs from all songs
    return allSongs.filter(song => recentSongIds.includes(song.id))
  }, [history, allSongs])
  
  // Get favorite songs
  const favoriteSongs = useMemo(() => {
    console.log('Favorites data:', favorites)
    console.log('All songs count:', allSongs.length)
    
    if (!favorites || favorites.length === 0) {
      console.log('No favorites found')
      return []
    }
    
    // If favorites already contain full song data, use them directly
    if (favorites[0] && favorites[0].title) {
      console.log('Using favorites as full song objects')
      // Ensure favorites have all required properties
      return favorites.slice(0, 8).map(fav => ({
        ...fav,
        tags: fav.tags || [],
        youtubeViews: fav.youtubeViews || 0,
        youtubeLikes: fav.youtubeLikes || 0,
        viewCount: fav.viewCount || 0,
        youtubeId: fav.youtubeId || '',
        lyrics: fav.lyrics || '',
        chords: fav.chords || '',
        englishLyrics: fav.englishLyrics || '',
        // Add any other missing properties with defaults
      }))
    }
    
    // Otherwise, match with allSongs
    const favoriteIds = favorites.map(fav => fav.song_id || fav.id)
    console.log('Favorite IDs:', favoriteIds)
    
    const matchedSongs = allSongs.filter(song => favoriteIds.includes(song.id))
    console.log('Matched songs:', matchedSongs.length)
    
    return matchedSongs.slice(0, 8)
  }, [favorites, allSongs])
  
  // Get all-time hits (songs with highest views)
  const allTimeHits = useMemo(() => {
    return [...allSongs]
      .sort((a, b) => (b.youtubeViews || 0) - (a.youtubeViews || 0))
      .slice(0, 8)
  }, [allSongs])
  
  const handleToggleFavorite = async (songId: string) => {
    try {
      await toggleFavoriteStatus(songId)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }
  
  const isFavorite = (songId: string) => {
    return favorites.some(fav => (fav.song_id || fav.id) === songId)
  }

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3, md: 4 },
      bgcolor: 'rgb(10, 10, 10)',
      minHeight: '100vh',
    }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
          {user ? `Welcome back, ${user.user_metadata?.full_name || 'User'}!` : 'Welcome to GNC Worship Tool'}
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgb(163, 163, 163)' }}>
          Discover your favorite Christian songs and hymns
        </Typography>
      </Box>

      {/* Trending Section */}
      <Box sx={{ mb: 4 }}>
        <SectionHeader
          title="Trending Now"
          icon={<TrendingUp sx={{ color: 'rgb(59, 130, 246)' }} />}
        />
        {trendingLoading ? (
          <LoadingSkeleton />
        ) : (
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5, 
            overflowX: 'auto',
            overflowY: 'hidden',
            pb: 1,
            '&::-webkit-scrollbar': {
              height: 4,
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgb(38, 38, 38)',
              borderRadius: 2,
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgb(64, 64, 64)',
              borderRadius: 2,
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'rgb(82, 82, 82)',
            },
          }}>
            {trendingSongs.slice(0, 20).map((song) => (
              <SectionCard
                key={song.id}
                song={song}
                onSelectSong={onSelectSong}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={isFavorite(song.id)}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Recent Songs Section */}
      {recentSongs.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <SectionHeader
            title="Recently Played"
            icon={<History sx={{ color: 'rgb(34, 197, 94)' }} />}
          />
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5, 
            overflowX: 'auto',
            overflowY: 'hidden',
            pb: 1,
            '&::-webkit-scrollbar': {
              height: 4,
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgb(38, 38, 38)',
              borderRadius: 2,
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgb(64, 64, 64)',
              borderRadius: 2,
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'rgb(82, 82, 82)',
            },
          }}>
            {recentSongs.map((song) => (
              <SectionCard
                key={song.id}
                song={song}
                onSelectSong={onSelectSong}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={isFavorite(song.id)}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Liked Music Section */}
      {user && (
        <Box sx={{ mb: 4 }}>
          <SectionHeader
            title="Your Liked Music"
            icon={<Favorite sx={{ color: 'rgb(239, 68, 68)' }} />}
          />
          {favoriteSongs.length > 0 ? (
            <Box sx={{ 
              display: 'flex', 
              gap: 1.5, 
              overflowX: 'auto',
              overflowY: 'hidden',
              pb: 1,
              '&::-webkit-scrollbar': {
                height: 4,
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgb(38, 38, 38)',
                borderRadius: 2,
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgb(64, 64, 64)',
                borderRadius: 2,
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: 'rgb(82, 82, 82)',
              },
            }}>
              {favoriteSongs.map((song) => (
                <SectionCard
                  key={song.id}
                  song={song}
                  onSelectSong={onSelectSong}
                  onToggleFavorite={handleToggleFavorite}
                  isFavorite={isFavorite(song.id)}
                />
              ))}
            </Box>
          ) : (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4,
              bgcolor: 'rgb(20, 20, 20)',
              borderRadius: 2,
              border: '1px solid rgb(38, 38, 38)',
            }}>
              <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                No liked songs yet
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgb(163, 163, 163)' }}>
                Start liking songs to see them here
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* All Time Hits Section */}
      <Box sx={{ mb: 4 }}>
        <SectionHeader
          title="All Time Hits"
          icon={<Star sx={{ color: 'rgb(245, 158, 11)' }} />}
        />
        {allSongsLoading ? (
          <LoadingSkeleton />
        ) : (
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5, 
            overflowX: 'auto',
            overflowY: 'hidden',
            pb: 1,
            '&::-webkit-scrollbar': {
              height: 4,
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgb(38, 38, 38)',
              borderRadius: 2,
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgb(64, 64, 64)',
              borderRadius: 2,
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'rgb(82, 82, 82)',
            },
          }}>
            {allTimeHits.map((song) => (
              <SectionCard
                key={song.id}
                song={song}
                onSelectSong={onSelectSong}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={isFavorite(song.id)}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Empty State */}
      {!trendingLoading && !allSongsLoading && trendingSongs.length === 0 && allSongs.length === 0 && (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8,
          bgcolor: 'rgb(20, 20, 20)',
          borderRadius: 2,
          border: '1px solid rgb(38, 38, 38)',
        }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            No songs available
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgb(163, 163, 163)' }}>
            Check back later for new content
          </Typography>
        </Box>
      )}
    </Box>
  )
}
