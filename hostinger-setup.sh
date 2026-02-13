#!/bin/bash
# ═══════════════════════════════════════════════════════════
# School Manager — Hostinger VPS Initial Setup Script
# Run this ONCE on a fresh Hostinger VPS (Ubuntu 22.04+)
#
# Usage: ssh root@your-vps-ip
#        bash hostinger-setup.sh
# ═══════════════════════════════════════════════════════════
set -e

DOMAIN="yourdomain.com"         # ← CHANGE THIS to your actual domain
APP_DIR="/var/www/school-manager"
DB_NAME="school_manager"
DB_USER="school_manager_user"
DB_PASS="$(openssl rand -hex 16)"  # Auto-generated DB password

echo "═══════════════════════════════════════"
echo "🏫 School Manager — VPS Setup"
echo "═══════════════════════════════════════"
echo ""

# ── 1. System updates ──
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# ── 2. Install Node.js 20.x ──
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "   Node: $(node -v)  |  NPM: $(npm -v)"

# ── 3. Install PM2 ──
echo "📦 Installing PM2 process manager..."
npm install -g pm2

# ── 4. Install PostgreSQL ──
echo "📦 Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# ── 5. Create database + user ──
echo "🗄️  Setting up database..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
echo "   Database: $DB_NAME"
echo "   User:     $DB_USER"
echo "   Password: $DB_PASS   ← SAVE THIS!"

# ── 6. Install Nginx ──
echo "📦 Installing Nginx..."
apt install -y nginx
systemctl enable nginx

# ── 7. Install Certbot (SSL) ──
echo "📦 Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

# ── 8. Create app directory ──
echo "📁 Creating app directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs

# ── 9. Install Git ──
apt install -y git

echo ""
echo "═══════════════════════════════════════"
echo "✅ VPS setup complete!"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Upload your code:"
echo "   scp -r ./backend ./frontend ./ecosystem.config.js ./deploy.sh ./nginx.conf root@your-vps-ip:$APP_DIR/"
echo ""
echo "2. SSH in and set up the .env file:"
echo "   ssh root@your-vps-ip"
echo "   cd $APP_DIR/backend"
echo "   cp env.production.example .env"
echo "   nano .env   # Fill in these values:"
echo "     DB_HOST=localhost"
echo "     DB_NAME=$DB_NAME"
echo "     DB_USER=$DB_USER"
echo "     DB_PASSWORD=$DB_PASS"
echo "     JWT_SECRET=$(openssl rand -hex 32)"
echo "     JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
echo "     CLIENT_URL=https://$DOMAIN"
echo "     PESAPAL_IPN_CALLBACK_URL=https://$DOMAIN/api/v1/pesapal/ipn"
echo ""
echo "3. Build & start:"
echo "   cd $APP_DIR"
echo "   bash deploy.sh"
echo "   pm2 start ecosystem.config.js --env production"
echo "   pm2 save"
echo "   pm2 startup   # Auto-start on reboot"
echo ""
echo "4. Set up Nginx:"
echo "   cp $APP_DIR/nginx.conf /etc/nginx/sites-available/schoolmanager"
echo "   # Edit the file: replace 'yourdomain.com' with '$DOMAIN'"
echo "   ln -s /etc/nginx/sites-available/schoolmanager /etc/nginx/sites-enabled/"
echo "   rm /etc/nginx/sites-enabled/default   # Remove default site"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "5. Get SSL certificate:"
echo "   certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "═══════════════════════════════════════"
echo "🗒️  SAVE THESE CREDENTIALS:"
echo "   DB Password: $DB_PASS"
echo "═══════════════════════════════════════"

