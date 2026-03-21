#!/bin/bash
# ============================================================
# ScreenHub — Deploy / Update script
# Run on the GCP VM after initial setup
# ============================================================
set -e

APP_DIR="/opt/screenhub"
cd $APP_DIR

echo "→ Pulling latest code..."
git pull origin main

echo "→ Installing server dependencies..."
cd server && npm install --omit=dev
cd $APP_DIR

echo "→ Building React client..."
cd client && npm install && npm run build
cd $APP_DIR

echo "→ Reloading API server..."
pm2 reload screenhub-api --update-env

echo "→ Reloading Nginx..."
nginx -t && systemctl reload nginx

echo "✓ Deploy complete!"
pm2 status

echo ""
echo "NOTE: If this is the first deploy of the SaaS schema, run:"
echo "  psql -U screenhub_user -d screenhub -f /opt/screenhub/server/src/db/migrations/002_saas_schema.sql"
