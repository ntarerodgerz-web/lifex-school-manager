#!/bin/bash
# ═══════════════════════════════════════════════════════════
# School Manager — Production Build & Deploy Script
# ═══════════════════════════════════════════════════════════
set -e

echo "🏫 School Manager — Production Build"
echo "═══════════════════════════════════════"

# ── 1. Install backend dependencies ──
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm ci --production
cd ..

# ── 2. Install frontend dependencies & build ──
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm ci
echo ""
echo "🔨 Building frontend (React + PWA)..."
npm run build
cd ..

# ── 3. Run database migrations ──
echo ""
echo "🗄️  Running database migrations..."
cd backend
npm run migrate
cd ..

# ── 4. Create required directories ──
echo ""
echo "📁 Creating required directories..."
mkdir -p backend/uploads/avatars
mkdir -p backend/uploads/badges
mkdir -p backend/uploads/photos
mkdir -p logs

# ── 5. Summary ──
echo ""
echo "═══════════════════════════════════════"
echo "✅ Build complete!"
echo ""
echo "Frontend built to: frontend/dist/"
echo "Backend serves it in production mode."
echo ""
echo "To start with PM2:"
echo "  pm2 start ecosystem.config.js --env production"
echo ""
echo "To start without PM2:"
echo "  cd backend && NODE_ENV=production node src/server.js"
echo ""
echo "═══════════════════════════════════════"

