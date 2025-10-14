-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create artists table
CREATE TABLE artists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  photo_url TEXT,
  total_songs INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create songs table
CREATE TABLE songs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  title_transliteration VARCHAR(500),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  language VARCHAR(50) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  lyrics TEXT[] NOT NULL,
  chords TEXT[],
  original_key VARCHAR(10),
  thumbnail_url TEXT,
  has_video BOOLEAN DEFAULT FALSE,
  video_url TEXT,
  youtube_views BIGINT DEFAULT 0,
  youtube_likes BIGINT DEFAULT 0,
  release_date DATE,
  view_count BIGINT DEFAULT 0,
  trending BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlists table
CREATE TABLE playlists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  share_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlist_songs junction table
CREATE TABLE playlist_songs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, song_id)
);

-- Create user_favorites table
CREATE TABLE user_favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

-- Create user_history table
CREATE TABLE user_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

-- Create indexes for better performance
CREATE INDEX idx_songs_language ON songs(language);
CREATE INDEX idx_songs_trending ON songs(trending);
CREATE INDEX idx_songs_view_count ON songs(view_count DESC);
CREATE INDEX idx_songs_artist_id ON songs(artist_id);
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX idx_playlist_songs_song_id ON playlist_songs(song_id);
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_song_id ON user_favorites(song_id);
CREATE INDEX idx_user_history_user_id ON user_history(user_id);
CREATE INDEX idx_user_history_viewed_at ON user_history(viewed_at DESC);

-- Create a custom immutable function for full-text search
CREATE OR REPLACE FUNCTION songs_search_vector(title TEXT, title_transliteration TEXT, lyrics TEXT[])
RETURNS tsvector AS $$
BEGIN
  RETURN to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(title_transliteration, '') || ' ' || 
    COALESCE(array_to_string(lyrics, ' '), '')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create full-text search index using the custom function
CREATE INDEX idx_songs_search ON songs USING gin(songs_search_vector(title, title_transliteration, lyrics));

-- Enable Row Level Security (RLS)
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for artists (public read access)
CREATE POLICY "Artists are viewable by everyone" ON artists
  FOR SELECT USING (true);

-- RLS Policies for songs (public read access)
CREATE POLICY "Songs are viewable by everyone" ON songs
  FOR SELECT USING (true);

-- RLS Policies for playlists (users can only see their own playlists)
CREATE POLICY "Users can view their own playlists" ON playlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own playlists" ON playlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists" ON playlists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists" ON playlists
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for playlist_songs
CREATE POLICY "Users can view songs in their playlists" ON playlist_songs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_songs.playlist_id 
      AND playlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add songs to their playlists" ON playlist_songs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_songs.playlist_id 
      AND playlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove songs from their playlists" ON playlist_songs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_songs.playlist_id 
      AND playlists.user_id = auth.uid()
    )
  );

-- RLS Policies for user_favorites
CREATE POLICY "Users can view their own favorites" ON user_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites" ON user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites" ON user_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_history
CREATE POLICY "Users can view their own history" ON user_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own history" ON user_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own history" ON user_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate share codes
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substring(md5(random()::text) from 1 for 8));
END;
$$ language 'plpgsql';

-- Create function to automatically generate share code for playlists
CREATE OR REPLACE FUNCTION set_playlist_share_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    NEW.share_code := generate_share_code();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_playlist_share_code_trigger BEFORE INSERT ON playlists
  FOR EACH ROW EXECUTE FUNCTION set_playlist_share_code();
