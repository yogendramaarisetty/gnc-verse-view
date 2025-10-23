-- Add English lyrics column to songs table
ALTER TABLE songs ADD COLUMN english_lyrics TEXT[];

-- Update the search function to include English lyrics
CREATE OR REPLACE FUNCTION songs_search_vector(title TEXT, title_transliteration TEXT, lyrics TEXT[], english_lyrics TEXT[])
RETURNS tsvector AS $$
BEGIN
  RETURN to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(title_transliteration, '') || ' ' || 
    COALESCE(array_to_string(lyrics, ' '), '') || ' ' ||
    COALESCE(array_to_string(english_lyrics, ' '), '')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop and recreate the search index with English lyrics
DROP INDEX IF EXISTS idx_songs_search;
CREATE INDEX idx_songs_search ON songs USING gin(songs_search_vector(title, title_transliteration, lyrics, english_lyrics));
