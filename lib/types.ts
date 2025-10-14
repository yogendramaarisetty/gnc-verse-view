export interface Artist {
  id: string
  name: string
  photoUrl: string
  totalSongs: number
  totalViews: number
}

export interface Song {
  id: string
  title: string
  titleTransliteration?: string
  artist: Artist
  language: "Malayalam" | "Hindi" | "Tamil" | "Telugu" | "Bengali" | "Kannada" | "English"
  tags: string[]
  lyrics: string[]
  chords?: string[]
  originalKey: string
  thumbnail: string
  hasVideo?: boolean
  videoUrl?: string
  youtubeViews: number
  youtubeLikes: number
  releaseDate: string
  viewCount: number
  trending: boolean
}

export interface Playlist {
  id: string
  name: string
  description: string
  songIds: string[]
  createdAt: string
  shareCode?: string
}

export interface UserSettings {
  fontSize: number
  favorites: string[]
  recentlyViewed: string[]
  playlists: Playlist[]
}

export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface DatabaseSong {
  id: string
  title: string
  title_transliteration?: string
  artist_id: string
  language: string
  tags: string[]
  lyrics: string[]
  chords?: string[]
  original_key: string
  thumbnail_url: string
  has_video?: boolean
  video_url?: string
  youtube_views: number
  youtube_likes: number
  release_date: string
  view_count: number
  trending: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseArtist {
  id: string
  name: string
  photo_url: string
  total_songs: number
  total_views: number
  created_at: string
}

export interface DatabasePlaylist {
  id: string
  user_id: string
  name: string
  description: string
  share_code?: string
  created_at: string
  updated_at: string
}

export interface DatabasePlaylistSong {
  id: string
  playlist_id: string
  song_id: string
  position: number
  added_at: string
}

export interface DatabaseUserFavorite {
  id: string
  user_id: string
  song_id: string
  created_at: string
}

export interface DatabaseUserHistory {
  id: string
  user_id: string
  song_id: string
  viewed_at: string
}
