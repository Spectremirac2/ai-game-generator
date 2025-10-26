-- Supabase Seed Data
-- Create storage buckets and initial database records for AI Game Generator

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('game-sprites', 'game-sprites', true),
  ('game-packages', 'game-packages', false),
  ('temp-assets', 'temp-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for game-sprites bucket (public read)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'game-sprites');

CREATE POLICY "Authenticated users can upload sprites"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'game-sprites');

-- Storage policies for game-packages bucket (authenticated only)
CREATE POLICY "Users can download their own packages"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'game-packages'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own packages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'game-packages'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create generation_jobs table
CREATE TABLE IF NOT EXISTS generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  request JSONB NOT NULL,
  assets JSONB,
  download_url TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at ON generation_jobs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for generation_jobs
CREATE POLICY "Users can view their own jobs"
ON generation_jobs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs"
ON generation_jobs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
ON generation_jobs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create game_analytics table
CREATE TABLE IF NOT EXISTS game_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES generation_jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_analytics_user_id ON game_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_game_analytics_job_id ON game_analytics(job_id);
CREATE INDEX IF NOT EXISTS idx_game_analytics_event_type ON game_analytics(event_type);

-- Enable RLS
ALTER TABLE game_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_analytics
CREATE POLICY "Users can view their own analytics"
ON game_analytics FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
ON game_analytics FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for generation_jobs
CREATE TRIGGER update_generation_jobs_updated_at
BEFORE UPDATE ON generation_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional, for development)
-- Uncomment to add test data
/*
INSERT INTO generation_jobs (id, user_id, status, request) VALUES
  (
    uuid_generate_v4(),
    auth.uid(),
    'completed',
    '{"gameType": "platformer", "theme": "cyberpunk city", "playerDescription": "ninja robot", "difficulty": "medium"}'::jsonb
  );
*/
