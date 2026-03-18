-- ScreenHub Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id        SERIAL PRIMARY KEY,
  email     VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name      VARCHAR(255) NOT NULL,
  role      VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Screens
CREATE TABLE IF NOT EXISTS screens (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  location    VARCHAR(255),
  resolution  VARCHAR(50)  DEFAULT '1920x1080',
  orientation VARCHAR(20)  NOT NULL DEFAULT 'landscape',
  status      VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Content items
CREATE TABLE IF NOT EXISTS content (
  id          SERIAL PRIMARY KEY,
  screen_id   INTEGER NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(20)  NOT NULL CHECK (type IN ('video', 'image', 'iframe')),
  url         TEXT         NOT NULL,
  thumbnail_url TEXT,
  duration    INTEGER      NOT NULL DEFAULT 10,
  order_index INTEGER      NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  settings    JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER screens_updated_at
  BEFORE UPDATE ON screens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Default admin user (password: admin123 — change immediately)
INSERT INTO users (email, password_hash, name, role)
VALUES (
  'admin@screenhub.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- "password"
  'Administrador',
  'admin'
) ON CONFLICT DO NOTHING;
