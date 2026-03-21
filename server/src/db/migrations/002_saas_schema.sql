-- ============================================================
-- ScreenHub SaaS Schema v2 — Multi-tenant Digital Signage
-- ============================================================

-- Drop old schema if exists
DROP TABLE IF EXISTS content CASCADE;
DROP TABLE IF EXISTS screens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(100) NOT NULL,
  screen_limit     INTEGER NOT NULL DEFAULT 3,
  storage_limit_gb INTEGER NOT NULL DEFAULT 5,
  price_monthly    DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_annual     DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  display_order    INTEGER NOT NULL DEFAULT 0,
  -- Audit fields
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID,
  updated_by       UUID,
  deleted_by       UUID
);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  plan_id         UUID REFERENCES plans(id) ON DELETE SET NULL,
  trial_ends_at   TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  -- Audit fields
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID,
  updated_by      UUID,
  deleted_by      UUID
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(20) NOT NULL DEFAULT 'admin'
                    CHECK (role IN ('superadmin', 'admin', 'editor')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  -- Audit fields
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_by      UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Add FK for organizations audit fields (now that users exists)
ALTER TABLE organizations
  ADD CONSTRAINT fk_org_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_org_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_org_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE plans
  ADD CONSTRAINT fk_plan_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_plan_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_plan_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id                       UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status                        VARCHAR(20) NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'past_due', 'canceled')),
  started_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at                       TIMESTAMPTZ,
  mercadopago_subscription_id   VARCHAR(255),
  -- Audit fields
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                    TIMESTAMPTZ,
  created_by                    UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by                    UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_by                    UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id         UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  mercadopago_payment_id  VARCHAR(255),
  amount                  DECIMAL(10,2) NOT NULL,
  currency                VARCHAR(10) NOT NULL DEFAULT 'ARS',
  status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  paid_at                 TIMESTAMPTZ,
  -- Audit fields
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ,
  created_by              UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by              UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_by              UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- SCREENS
-- ============================================================
CREATE TABLE IF NOT EXISTS screens (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  status                VARCHAR(20) NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'published')),
  orientation           VARCHAR(20) NOT NULL DEFAULT 'horizontal'
                          CHECK (orientation IN ('horizontal', 'vertical')),
  is_touch              BOOLEAN NOT NULL DEFAULT false,
  touch_timeout_seconds INTEGER NOT NULL DEFAULT 60,
  public_url_slug       VARCHAR(100) UNIQUE,
  short_code            VARCHAR(10) UNIQUE,
  -- Audit fields
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_by            UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- SCREEN CONTENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS screen_contents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_id        UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  type             VARCHAR(30) NOT NULL
                     CHECK (type IN ('image', 'video_upload', 'video_url', 'youtube', 'iframe')),
  source_url       TEXT,
  storage_path     TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 10,
  position         INTEGER NOT NULL DEFAULT 0,
  is_muted         BOOLEAN NOT NULL DEFAULT false,
  metadata         JSONB NOT NULL DEFAULT '{}',
  -- Audit fields
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_by       UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- SCREEN TOUCH CONFIGS
-- ============================================================
CREATE TABLE IF NOT EXISTS screen_touch_configs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screen_id           UUID NOT NULL UNIQUE REFERENCES screens(id) ON DELETE CASCADE,
  intro_type          VARCHAR(10) NOT NULL DEFAULT 'image'
                        CHECK (intro_type IN ('image', 'video')),
  intro_source_url    TEXT,
  intro_storage_path  TEXT,
  -- Audit fields
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_by          UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- MERCADOPAGO CONFIGS
-- ============================================================
CREATE TABLE IF NOT EXISTS mercadopago_configs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_key      VARCHAR(500) NOT NULL,
  access_token    VARCHAR(500) NOT NULL,
  webhook_secret  VARCHAR(255),
  is_sandbox      BOOLEAN NOT NULL DEFAULT true,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  -- Audit fields
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_by      UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  action          VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(50),
  entity_id       UUID,
  description     TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         VARCHAR(100) UNIQUE NOT NULL,
  value       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plans_updated_at               BEFORE UPDATE ON plans               FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER organizations_updated_at       BEFORE UPDATE ON organizations       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at               BEFORE UPDATE ON users               FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at       BEFORE UPDATE ON subscriptions       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER transactions_updated_at        BEFORE UPDATE ON transactions        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER screens_updated_at             BEFORE UPDATE ON screens             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER screen_contents_updated_at     BEFORE UPDATE ON screen_contents     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER screen_touch_configs_updated_at BEFORE UPDATE ON screen_touch_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER mercadopago_configs_updated_at BEFORE UPDATE ON mercadopago_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER system_settings_updated_at     BEFORE UPDATE ON system_settings     FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_email         ON users(email)           WHERE deleted_at IS NULL;
CREATE INDEX idx_users_org           ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_screens_org         ON screens(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_screens_slug        ON screens(public_url_slug) WHERE deleted_at IS NULL AND public_url_slug IS NOT NULL;
CREATE INDEX idx_screens_short_code  ON screens(short_code) WHERE deleted_at IS NULL AND short_code IS NOT NULL;
CREATE INDEX idx_screen_contents_screen ON screen_contents(screen_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_subscriptions_org   ON subscriptions(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_org    ON transactions(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_activity_logs_org   ON activity_logs(organization_id);
CREATE INDEX idx_activity_logs_user  ON activity_logs(user_id);

-- ============================================================
-- DEFAULT DATA
-- ============================================================

-- Plans
INSERT INTO plans (id, name, screen_limit, storage_limit_gb, price_monthly, price_annual, is_active, display_order) VALUES
  (uuid_generate_v4(), 'Starter',      5,   10,  9990,   99900,  true, 1),
  (uuid_generate_v4(), 'Professional', 20,  50,  29990,  299900, true, 2),
  (uuid_generate_v4(), 'Enterprise',   100, 200, 79990,  799900, true, 3);

-- System settings
INSERT INTO system_settings (key, value) VALUES
  ('trial_days', '14'),
  ('trial_screen_limit', '1')
ON CONFLICT (key) DO NOTHING;

-- Superadmin user (password: "screenhub2026" — CHANGE IMMEDIATELY)
-- bcrypt hash of "screenhub2026" with 10 rounds
INSERT INTO users (id, organization_id, name, email, password_hash, role, is_active)
VALUES (
  uuid_generate_v4(),
  NULL,
  'Super Admin',
  'superadmin@screenhub.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'superadmin',
  true
) ON CONFLICT (email) DO NOTHING;
