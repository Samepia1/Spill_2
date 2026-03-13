-- Allow posts and comments to optionally reveal author identity
ALTER TABLE posts ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE comments ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT true;
