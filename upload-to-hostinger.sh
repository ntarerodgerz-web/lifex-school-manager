#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Upload School Manager to Hostinger VPS
#
# BEFORE RUNNING THIS:
# 1. Replace YOUR_VPS_IP with your actual Hostinger VPS IP address
# 2. Make sure you can SSH into your VPS: ssh root@YOUR_VPS_IP
# ═══════════════════════════════════════════════════════════
set -e

# ──────────────────────────────
# ⚙️  CONFIGURE THESE:
# ──────────────────────────────
VPS_IP="YOUR_VPS_IP"           # ← Replace with your Hostinger VPS IP (e.g. 154.41.xxx.xxx)
VPS_USER="root"                 # ← Usually root on Hostinger VPS
APP_DIR="/var/www/school-manager"
# ──────────────────────────────

if [ "$VPS_IP" = "YOUR_VPS_IP" ]; then
  echo "❌ ERROR: Edit this script first!"
  echo "   Open upload-to-hostinger.sh and replace YOUR_VPS_IP with your actual VPS IP address."
  echo "   You can find it in your Hostinger VPS dashboard."
  exit 1
fi

echo ""
echo "🏫 Uploading School Manager to Hostinger VPS ($VPS_IP)"
echo "═══════════════════════════════════════════════════════"

# ── 1. Create app directory on VPS ──
echo ""
echo "📁 Creating directory on VPS..."
ssh $VPS_USER@$VPS_IP "mkdir -p $APP_DIR/logs"

# ── 2. Upload files (excluding node_modules, dist, android, uploads) ──
echo ""
echo "📤 Uploading project files... (this may take a few minutes)"
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'frontend/dist' \
  --exclude 'frontend/android' \
  --exclude '.git' \
  --exclude '.DS_Store' \
  --exclude 'backend/uploads/avatars/*' \
  --exclude 'backend/uploads/badges/*' \
  --exclude 'backend/uploads/photos/*' \
  --exclude 'store-assets' \
  ./ $VPS_USER@$VPS_IP:$APP_DIR/

# ── 3. Run setup on VPS ──
echo ""
echo "🔧 Installing dependencies & building on VPS..."
ssh $VPS_USER@$VPS_IP "cd $APP_DIR && bash deploy.sh"

# ── 4. Start/restart with PM2 ──
echo ""
echo "🚀 Starting app with PM2..."
ssh $VPS_USER@$VPS_IP "cd $APP_DIR && pm2 delete school-manager 2>/dev/null; pm2 start ecosystem.config.js --env production && pm2 save"

echo ""
echo "═══════════════════════════════════════"
echo "✅ Upload complete!"
echo ""
echo "Your app should now be running at http://$VPS_IP:5000"
echo ""
echo "REMAINING STEPS (if first time):"
echo "  1. Set up the .env file:"
echo "     ssh $VPS_USER@$VPS_IP"
echo "     cd $APP_DIR/backend"
echo "     cp env.production.example .env"
echo "     nano .env    # Fill in DB password, JWT secrets, domain, PesaPal keys"
echo ""
echo "  2. Set up Nginx + SSL:"
echo "     cp $APP_DIR/nginx.conf /etc/nginx/sites-available/schoolmanager"
echo "     nano /etc/nginx/sites-available/schoolmanager   # Replace yourdomain.com"
echo "     ln -sf /etc/nginx/sites-available/schoolmanager /etc/nginx/sites-enabled/"
echo "     rm -f /etc/nginx/sites-enabled/default"
echo "     nginx -t && systemctl reload nginx"
echo "     certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo ""
echo "  3. Restart app: pm2 restart school-manager"
echo "═══════════════════════════════════════"



