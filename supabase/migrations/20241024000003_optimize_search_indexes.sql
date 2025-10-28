-- Optimize search indexes for ultra-fast search
-- This migration adds specialized indexes for title_transliteration priority search

-- Enable trigram extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Dedicated B-tree index for exact/prefix matches on transliteration
CREATE INDEX IF NOT EXISTS idx_songs_title_transliteration ON songs(title_transliteration);

-- Pattern matching index for LIKE queries (faster than regular B-tree for pattern matching)
CREATE INDEX IF NOT EXISTS idx_songs_title_transliteration_pattern ON songs(title_transliteration text_pattern_ops);

-- GIN trigram index for fuzzy matching (fast similarity search)
CREATE INDEX IF NOT EXISTS idx_songs_title_transliteration_trgm ON songs USING gin(title_transliteration gin_trgm_ops);

-- Composite index for language-filtered searches on transliteration
CREATE INDEX IF NOT EXISTS idx_songs_language_transliteration ON songs(language, title_transliteration);

-- Additional indexes for title field (secondary priority)
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_songs_title_pattern ON songs(title text_pattern_ops);

-- Index for artist name searches
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS idx_artists_name_pattern ON artists(name text_pattern_ops);

-- Update the full-text search function to prioritize title_transliteration
CREATE OR REPLACE FUNCTION songs_search_vector(title TEXT, title_transliteration TEXT, lyrics TEXT[], english_lyrics TEXT[])
RETURNS tsvector AS $$
BEGIN
  RETURN to_tsvector('english', 
    COALESCE(title_transliteration, '') || ' ' ||  -- Prioritize transliteration
    COALESCE(title, '') || ' ' || 
    COALESCE(array_to_string(lyrics, ' '), '') || ' ' ||
    COALESCE(array_to_string(english_lyrics, ' '), '')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Recreate the full-text search index with updated function
DROP INDEX IF EXISTS idx_songs_search;
CREATE INDEX idx_songs_search ON songs USING gin(songs_search_vector(title, title_transliteration, lyrics, english_lyrics));

-- Add statistics for better query planning
ANALYZE songs;
ANALYZE artists;
