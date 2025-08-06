#!/bin/bash

# 🚀 Production Deployment Script for 1on1.website
# Enhanced Emotion Visualizer with Video Previews

echo "🚀 Deploying Enhanced Emotion Visualizer to 1on1.website..."

# Configuration
SERVER_IP="167.172.51.184"  # DigitalOcean droplet IP for 1on1.website
SERVER_USER="root"          # Usually root for DigitalOcean droplets
WEB_ROOT="/var/www/html"    # Standard web root
BACKUP_DIR="/root/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  IMPORTANT: Make sure to update SERVER_IP in this script!${NC}"
echo -e "${YELLOW}📝 Replace YOUR_SERVER_IP with your actual DigitalOcean droplet IP${NC}"
echo ""

# Check if SERVER_IP is set
if [ "$SERVER_IP" = "YOUR_SERVER_IP" ]; then
    echo -e "${RED}❌ Please update SERVER_IP in the script first!${NC}"
    echo "   Edit deploy_to_production.sh and replace YOUR_SERVER_IP with your actual IP"
    exit 1
fi

echo "🎯 Target: $SERVER_USER@$SERVER_IP:$WEB_ROOT"
echo ""

# Step 1: Create local deployment package
echo "📦 Creating deployment package..."
TEMP_DIR="/tmp/1on1_deployment_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$TEMP_DIR"

# Copy essential files (exclude backups, temp files, etc.)
echo "   📁 Copying core files..."
cp index.html "$TEMP_DIR/"
cp admin_panel.html "$TEMP_DIR/"
cp video_manager.html "$TEMP_DIR/"
cp video_studio.html "$TEMP_DIR/"
cp video_generator_web.html "$TEMP_DIR/"
cp config_editor.html "$TEMP_DIR/"
cp start_server.py "$TEMP_DIR/"
cp requirements.txt "$TEMP_DIR/"
cp *.js "$TEMP_DIR/" 2>/dev/null || true

echo "   📂 Copying directories..."
cp -r config "$TEMP_DIR/" 2>/dev/null || true
cp -r conversations "$TEMP_DIR/" 2>/dev/null || true  
cp -r videos "$TEMP_DIR/" 2>/dev/null || true
cp -r assets "$TEMP_DIR/" 2>/dev/null || true
cp -r backend "$TEMP_DIR/" 2>/dev/null || true
cp -r frontend "$TEMP_DIR/" 2>/dev/null || true

echo "   🗂️  Package created at: $TEMP_DIR"

# Step 2: Backup current production site
echo ""
echo "💾 Creating backup of current production site..."
ssh "$SERVER_USER@$SERVER_IP" "
    mkdir -p $BACKUP_DIR
    cd $WEB_ROOT
    tar -czf $BACKUP_DIR/1on1_backup_\$(date +%Y%m%d_%H%M%S).tar.gz * 2>/dev/null || true
    echo '✅ Backup created in $BACKUP_DIR'
"

# Step 3: Clear production directory
echo ""
echo "🧹 Clearing production directory..."
ssh "$SERVER_USER@$SERVER_IP" "
    cd $WEB_ROOT
    rm -rf * .*[^.]* 2>/dev/null || true
    echo '✅ Production directory cleared'
"

# Step 4: Upload new files
echo ""
echo "📤 Uploading new files to production..."
scp -r "$TEMP_DIR"/* "$SERVER_USER@$SERVER_IP:$WEB_ROOT/"

# Step 5: Set proper permissions
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

# Step 6: Install Python dependencies if needed
echo ""
echo "🐍 Installing Python dependencies..."
ssh "$SERVER_USER@$SERVER_IP" "
    cd $WEB_ROOT
    if [ -f requirements.txt ]; then
        pip3 install -r requirements.txt 2>/dev/null || echo 'Python deps installation skipped'
    fi
"

# Step 7: Restart web services
echo ""
echo "🔄 Restarting web services..."
ssh "$SERVER_USER@$SERVER_IP" "
    systemctl restart nginx 2>/dev/null || systemctl restart apache2 2>/dev/null || true
    systemctl restart php-fpm 2>/dev/null || true
    echo '✅ Web services restarted'
"

# Step 8: Test deployment
echo ""
echo "🧪 Testing deployment..."
echo "📍 Site URL: https://1on1.website/"
echo ""

# Cleanup
rm -rf "$TEMP_DIR"

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "🔗 Your enhanced emotion visualizer is now live at:"
echo "   https://1on1.website/"
echo ""
echo "✨ New features deployed:"
echo "   • Enhanced video previews with hover-to-play"
echo "   • Video manager with MP4/WebM support"
echo "   • Fixed video fit behavior (no cropping)"
echo "   • Admin panel improvements"
echo "   • All latest optimizations"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "   1. Visit https://1on1.website/ to verify deployment"
echo "   2. Check video previews are working correctly"
echo "   3. Test admin panel functionality"
echo "   4. Monitor server logs if needed" 