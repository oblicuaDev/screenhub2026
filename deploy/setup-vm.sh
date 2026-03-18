#!/bin/bash
# ============================================================
# ScreenHub — GCP VM Setup Script
# Ubuntu 22.04 LTS · Compute Engine
#
# Usage:
#   chmod +x setup-vm.sh
#   sudo bash setup-vm.sh
# ============================================================
set -e

APP_DIR="/opt/screenhub"
APP_USER="screenhub"
DB_NAME="screenhub"
DB_USER="screenhub_user"
DB_PASS=$(openssl rand -base64 24)

echo "======================================"
echo "  ScreenHub — Server Setup"
echo "======================================"

# ---- System update ----
apt-get update -y && apt-get upgrade -y

# ---- Node.js 20 ----
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node $(node -v) / npm $(npm -v)"

# ---- PM2 ----
npm install -g pm2

# ---- PostgreSQL 15 ----
if ! command -v psql &>/dev/null; then
  sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
  apt-get update -y
  apt-get install -y postgresql-15
fi
systemctl enable postgresql
systemctl start postgresql

# ---- Create DB and user ----
sudo -u postgres psql <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
  END IF;
END \$\$;
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
SQL

echo ""
echo "Database password (save this!): $DB_PASS"
echo ""

# ---- Nginx ----
apt-get install -y nginx
systemctl enable nginx

# ---- App user ----
id -u $APP_USER &>/dev/null || useradd -r -s /bin/bash -d $APP_DIR $APP_USER

# ---- App directory ----
mkdir -p $APP_DIR
chown $APP_USER:$APP_USER $APP_DIR

# ---- Copy nginx config ----
cp /tmp/screenhub-nginx.conf /etc/nginx/sites-available/screenhub
ln -sf /etc/nginx/sites-available/screenhub /etc/nginx/sites-enabled/screenhub
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ---- Firewall (ufw) ----
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "======================================"
echo "  Setup complete!"
echo "======================================"
echo "  DB_USER: $DB_USER"
echo "  DB_PASS: $DB_PASS"
echo "  DB_NAME: $DB_NAME"
echo ""
echo "Next steps:"
echo "  1. cd $APP_DIR && git clone <your-repo> ."
echo "  2. cp .env.example .env && nano .env  (set DB_PASSWORD, JWT_SECRET)"
echo "  3. cd server && npm install"
echo "  4. psql -U $DB_USER -d $DB_NAME -f server/src/db/migrations/001_initial.sql"
echo "  5. cd ../client && npm install && npm run build"
echo "  6. pm2 start deploy/ecosystem.config.js --env production"
echo "  7. pm2 save && pm2 startup"
echo "======================================"
