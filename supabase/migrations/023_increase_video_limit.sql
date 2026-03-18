-- Increase post-media bucket size limit from 50MB to 150MB for video uploads
UPDATE storage.buckets
SET file_size_limit = 157286400
WHERE id = 'post-media';
