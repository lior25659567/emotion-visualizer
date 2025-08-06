#!/bin/bash

# 🚀 Deploy to Netlify
# This script packages and deploys the emotion visualizer to Netlify

echo "🚀 Deploying Emotion Visualizer to Netlify..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create deployment directory
DEPLOY_DIR="netlify_deploy_$(date +%Y%m%d_%H%M%S)"
echo "📦 Creating deployment package: $DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Essential files to deploy
ESSENTIAL_FILES=(
    "index.html"
    "admin_panel.html"
    "video_manager.html"
    "video_studio.html"
    "video_generator_web.html"
    "config_editor.html"
    "visualization.html"
    "hebrew_splash_screen.html"
    "png_preview_uploader.html"
    "test_upload.html"
    "performance_monitor.js"
    "fix_tooltip_hover.js"
    "emotion_status.json"
    "README.md"
)

# Essential directories to deploy
ESSENTIAL_DIRS=(
    "config"
    "assets"
    "frontend"
    "videos"
)

echo "📄 Copying essential files..."
for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$DEPLOY_DIR/"
        echo "   ✅ $file"
    else
        echo "   ⚠️  File not found: $file"
    fi
done

echo ""
echo "📂 Copying essential directories..."
for dir in "${ESSENTIAL_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        cp -r "$dir" "$DEPLOY_DIR/"
        echo "   ✅ $dir/"
    else
        echo "   ⚠️  Directory not found: $dir/"
    fi
done

# Create Netlify configuration
echo ""
echo "⚙️  Creating Netlify configuration..."
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

# Create a simple deployment info file
echo ""
echo "📝 Creating deployment info..."
cat > "$DEPLOY_DIR/DEPLOYMENT_INFO.md" << EOF
# 🚀 Netlify Deployment

## Deployment Details
- **Deployed on:** $(date)
- **Project:** Emotion Visualizer
- **Target:** Netlify

## Features Included
- ✅ Main emotion visualizer (index.html)
- ✅ Admin panel (admin_panel.html)
- ✅ Video manager (video_manager.html)
- ✅ Video studio (video_studio.html)
- ✅ Configuration editor (config_editor.html)
- ✅ Hebrew splash screen (hebrew_splash_screen.html)
- ✅ All assets and configurations
- ✅ Frontend JavaScript files

## Important Notes
- This is a static deployment (no Python backend)
- Video processing features will need alternative implementation
- File upload features may need Netlify Functions
- Real-time features may need WebSocket alternatives

## Next Steps
1. Upload this folder to Netlify
2. Configure custom domain if needed
3. Set up Netlify Functions for backend features
4. Test all functionality
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

# Show deployment summary
echo ""
echo -e "${GREEN}🎉 Deployment package created successfully!${NC}"
echo ""
echo "📁 Deployment directory: $DEPLOY_DIR"
echo ""
echo "📋 Files included:"
for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$DEPLOY_DIR/$file" ]; then
        echo "   ✅ $file"
    fi
done

echo ""
echo "📂 Directories included:"
for dir in "${ESSENTIAL_DIRS[@]}"; do
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
echo "💡 Alternative deployment methods:"
echo "   • Connect your GitHub repository"
echo "   • Use Netlify CLI: netlify deploy --dir=$DEPLOY_DIR --prod"
echo "   • Upload via Netlify dashboard"
echo ""
echo "✨ Your emotion visualizer will be live on Netlify!" 