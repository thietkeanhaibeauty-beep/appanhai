-- Create landing-assets bucket for storing landing page media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landing-assets',
  'landing-assets',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read files
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'landing-assets');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'landing-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'landing-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'landing-assets' AND auth.role() = 'authenticated');
