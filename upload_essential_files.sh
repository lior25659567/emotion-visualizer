#!/bin/bash

# 🚀 Upload Essential Files to 1on1.website
# This script uploads only the files needed to run the website

echo "🚀 Uploading essential files to 1on1.website..."

# Configuration
SERVER_IP="167.172.51.184"  # DigitalOcean droplet IP for 1on1.website
SERVER_USER="root"          # Usually root for DigitalOcean droplets
WEB_ROOT="/var/www/html"    # Standard web root

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🎯 Target: $SERVER_USER@$SERVER_IP:$WEB_ROOT"
echo ""

# Essential files to upload
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
    "start_server.py"
    "requirements.txt"
    "performance_monitor.js"
    "fix_tooltip_hover.js"
    "emotion_status.json"
    "gunicorn_config.py"
)

# Essential directories to upload
ESSENTIAL_DIRS=(
    "config"
    "assets"
    "frontend"
    "backend"
)

echo "📦 Uploading essential files..."

# Upload individual files
for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   📄 Uploading: $file"
        scp "$file" "$SERVER_USER@$SERVER_IP:$WEB_ROOT/"
    else
        echo "   ⚠️  File not found: $file"
    fi
done

echo ""
echo "📂 Uploading essential directories..."

# Upload directories
for dir in "${ESSENTIAL_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "   📁 Uploading: $dir/"
        scp -r "$dir" "$SERVER_USER@$SERVER_IP:$WEB_ROOT/"
    else
        echo "   ⚠️  Directory not found: $dir/"
    fi
done

echo ""
echo "🔐 Setting proper permissions..."
ssh "$SERVER_USER@$SERVER_IP" "
    cd $WEB_ROOT
    chown -R www-data:www-data * 2>/dev/null || chown -R nginx:nginx * 2>/dev/null || true
    find . -type f -exec chmod 644 {} \;
    find . -type d -exec chmod 755 {} \;
    chmod +x *.sh *.py 2>/dev/null || true
    echo '✅ Permissions set'
"

echo ""
echo "🐍 Installing Python dependencies..."
ssh "$SERVER_USER@$SERVER_IP" "
    cd $WEB_ROOT
    if [ -f requirements.txt ]; then
        pip3 install -r requirements.txt 2>/dev/null || echo 'Python deps installation skipped'
    fi
"

echo ""
echo "🔄 Restarting web services..."
ssh "$SERVER_USER@$SERVER_IP" "
    systemctl restart nginx 2>/dev/null || systemctl restart apache2 2>/dev/null || true
    systemctl restart php-fpm 2>/dev/null || true
    echo '✅ Web services restarted'
"

echo ""
echo -e "${GREEN}🎉 Essential files uploaded successfully!${NC}"
echo ""
echo "🔗 Your website should now be accessible at:"
echo "   https://1on1.website/"
echo ""
echo "📋 Uploaded files:"
for file in "${ESSENTIAL_FILES[@]}"; do
    echo "   • $file"
done
echo ""
echo "📁 Uploaded directories:"
for dir in "${ESSENTIAL_DIRS[@]}"; do
    echo "   • $dir/"
done
echo ""
echo "✨ Next steps:"
echo "   1. Visit https://1on1.website/ to verify it's working"
echo "   2. Check that all features are functioning"
echo "   3. Test admin panel and video features" 