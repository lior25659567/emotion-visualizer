#!/bin/bash

# 🚀 Deploy Static Frontend to Netlify
# This script packages only the essential static files for index.html

echo "🚀 Deploying Static Frontend to Netlify..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create deployment directory
DEPLOY_DIR="static_netlify_deploy_$(date +%Y%m%d_%H%M%S)"
echo "📦 Creating static deployment package: $DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Only essential static files for index.html to work
STATIC_FILES=(
    "index.html"
    "visualization.html"
    "hebrew_splash_screen.html"
    "performance_monitor.js"
    "fix_tooltip_hover.js"
    "emotion_status.json"
)

# Only essential static directories
STATIC_DIRS=(
    "config"
    "assets"
    "frontend"
)

echo "📄 Copying static files..."
for file in "${STATIC_FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$DEPLOY_DIR/"
        echo "   ✅ $file"
    else
        echo "   ⚠️  File not found: $file"
    fi
done

echo ""
echo "📂 Copying static directories..."
for dir in "${STATIC_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        cp -r "$dir" "$DEPLOY_DIR/"
        echo "   ✅ $dir/"
    else
        echo "   ⚠️  Directory not found: $dir/"
    fi
done

# Create simplified Netlify configuration
echo ""
echo "⚙️  Creating simplified Netlify configuration..."
cat > "$DEPLOY_DIR/netlify.toml" << 'EOF'
[build]
  publish = "."
  command = ""

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    # X-Frame-Options = "DENY"  # Removed to allow iframe embedding
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "*.html"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"
    Pragma = "no-cache"
    Expires = "0"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=3600"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=3600"

[[headers]]
  for = "*.png"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "*.jpg"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "*.jpeg"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "*.gif"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "*.svg"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "*.woff"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "*.woff2"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "*.ttf"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "*.eot"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "*.otf"
  [headers.values]
    Cache-Control = "public, max-age=31536000"
EOF

# Create a simple _redirects file for SPA routing
echo ""
echo "🔄 Creating redirects for SPA..."
cat > "$DEPLOY_DIR/_redirects" << 'EOF'
/*    /index.html   200
EOF

# Create a simple _headers file for security
echo ""
echo "🔒 Creating security headers..."
cat > "$DEPLOY_DIR/_headers" << 'EOF'
/*
  # X-Frame-Options: DENY  # Removed to allow iframe embedding
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/*.html
  Cache-Control: no-cache, no-store, must-revalidate
  Pragma: no-cache
  Expires: 0

/*.js
  Cache-Control: public, max-age=3600

/*.css
  Cache-Control: public, max-age=3600

/*.png
  Cache-Control: public, max-age=86400

/*.jpg
  Cache-Control: public, max-age=86400

/*.jpeg
  Cache-Control: public, max-age=86400

/*.gif
  Cache-Control: public, max-age=86400

/*.svg
  Cache-Control: public, max-age=86400

/*.woff
  Cache-Control: public, max-age=31536000

/*.woff2
  Cache-Control: public, max-age=31536000

/*.ttf
  Cache-Control: public, max-age=31536000

/*.eot
  Cache-Control: public, max-age=31536000

/*.otf
  Cache-Control: public, max-age=31536000
EOF

# Create deployment info
echo ""
echo "📝 Creating deployment info..."
cat > "$DEPLOY_DIR/DEPLOYMENT_INFO.md" << EOF
# 🚀 Static Frontend Deployment

## Deployment Details
- **Deployed on:** $(date)
- **Project:** Emotion Visualizer (Static Frontend Only)
- **Target:** Netlify

## What's Included (Static Only)
- ✅ Main emotion visualizer (index.html)
- ✅ Visualization page (visualization.html)
- ✅ Hebrew splash screen (hebrew_splash_screen.html)
- ✅ All assets and configurations
- ✅ Frontend JavaScript files
- ✅ Performance monitoring
- ✅ Tooltip fixes

## What's NOT Included (No Backend)
- ❌ Admin panel (requires Python backend)
- ❌ Video manager (requires Python backend)
- ❌ Video studio (requires Python backend)
- ❌ File upload features (requires backend)
- ❌ Real-time features (requires WebSockets)

## Features That Will Work
- ✅ Emotion visualization
- ✅ Hebrew interface
- ✅ Asset loading
- ✅ Configuration display
- ✅ Static content

## Features That Won't Work
- ❌ File uploads
- ❌ Video processing
- ❌ Admin panel
- ❌ Real-time updates
- ❌ Backend API calls

## Next Steps
1. Upload this folder to Netlify
2. Test the main emotion visualizer
3. Add backend features later if needed
EOF

# Show deployment summary
echo ""
echo -e "${GREEN}🎉 Static deployment package created successfully!${NC}"
echo ""
echo "📁 Deployment directory: $DEPLOY_DIR"
echo ""
echo "📋 Static files included:"
for file in "${STATIC_FILES[@]}"; do
    if [ -f "$DEPLOY_DIR/$file" ]; then
        echo "   ✅ $file"
    fi
done

echo ""
echo "📂 Static directories included:"
for dir in "${STATIC_DIRS[@]}"; do
    if [ -d "$DEPLOY_DIR/$dir" ]; then
        echo "   ✅ $dir/"
    fi
done

echo ""
echo "⚙️  Configuration files:"
echo "   ✅ netlify.toml"
echo "   ✅ _redirects"
echo "   ✅ _headers"
echo "   ✅ DEPLOYMENT_INFO.md"

echo ""
echo "🚀 Next steps to deploy to Netlify:"
echo "   1. Go to https://app.netlify.com/"
echo "   2. Drag and drop the '$DEPLOY_DIR' folder"
echo "   3. Or use Netlify CLI: netlify deploy --dir=$DEPLOY_DIR"
echo ""
echo "💡 This is a STATIC deployment:"
echo "   • Only frontend files included"
echo "   • No Python backend needed"
echo "   • index.html will work perfectly"
echo "   • Admin panel and video features excluded"
echo ""
echo "✨ Your emotion visualizer will be live on Netlify!" 