#!/bin/bash

# 🗑️  Complete Cleanup for 1on1.website
# This script removes ALL files and ALL backups from the server

echo "🗑️  Complete cleanup of 1on1.website server..."

# Configuration
SERVER_IP="167.172.51.184"
SERVER_USER="root"
WEB_ROOT="/var/www/html"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}⚠️  WARNING: This will permanently delete ALL files and ALL backups!${NC}"
echo "🎯 Target: $SERVER_USER@$SERVER_IP"
echo ""

# Kill any running Python processes
echo "🔄 Stopping all Python processes..."
ssh "$SERVER_USER@$SERVER_IP" "
    pkill -f 'python.*8000' 2>/dev/null || true
    pkill -f 'start_server.py' 2>/dev/null || true
    pkill -f 'gunicorn' 2>/dev/null || true
    echo '✅ Python processes stopped'
"

# Remove ALL files from web root
echo ""
echo "🗑️  Removing ALL files from web root..."
ssh "$SERVER_USER@$SERVER_IP" "
    cd $WEB_ROOT
    rm -rf * .*[^.]* 2>/dev/null || true
    echo '✅ Web root cleared'
"

# Remove ALL backups
echo ""
echo "🗑️  Removing ALL backups..."
ssh "$SERVER_USER@$SERVER_IP" "
    rm -rf /root/backups/* 2>/dev/null || true
    rm -rf /var/backups/* 2>/dev/null || true
    rm -rf /tmp/*backup* 2>/dev/null || true
    rm -rf /tmp/*deployment* 2>/dev/null || true
    echo '✅ All backups removed'
"

# Clear all caches
echo ""
echo "🧹 Clearing all caches..."
ssh "$SERVER_USER@$SERVER_IP" "
    rm -rf /var/cache/nginx/* 2>/dev/null || true
    rm -rf /var/cache/apache2/* 2>/dev/null || true
    rm -rf /tmp/* 2>/dev/null || true
    echo '✅ All caches cleared'
"

# Remove any remaining application files
echo ""
echo "🗑️  Removing any remaining application files..."
ssh "$SERVER_USER@$SERVER_IP" "
    find /var/www -name '*1on1*' -exec rm -rf {} + 2>/dev/null || true
    find /home -name '*1on1*' -exec rm -rf {} + 2>/dev/null || true
    find /tmp -name '*1on1*' -exec rm -rf {} + 2>/dev/null || true
    echo '✅ Remaining application files removed'
"

# Create a simple "Site Cleared" page
echo ""
echo "📝 Creating 'Site Cleared' page..."
ssh "$SERVER_USER@$SERVER_IP" "
    cd $WEB_ROOT
    cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Site Cleared - 1on1.website</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f5f5f5; 
        }
        .container { 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            max-width: 500px; 
            margin: 0 auto; 
        }
        .icon { font-size: 48px; margin-bottom: 20px; }
        .status { color: #e74c3c; font-weight: bold; }
        .time { color: #7f8c8d; font-size: 14px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🗑️</div>
        <h1>Site Cleared</h1>
        <p class="status">All files and backups have been removed from 1on1.website</p>
        <p>The server is now completely empty.</p>
        <div class="time">
            Cleared on: $(date)<br>
            Server: 1on1.website
        </div>
    </div>
</body>
</html>
EOF
    echo '✅ "Site Cleared" page created'
"

# Restart web services
echo ""
echo "🔄 Restarting web services..."
ssh "$SERVER_USER@$SERVER_IP" "
    systemctl restart nginx 2>/dev/null || true
    systemctl restart apache2 2>/dev/null || true
    echo '✅ Web services restarted'
"

echo ""
echo -e "${GREEN}🎉 Complete cleanup finished!${NC}"
echo ""
echo "🔗 Visit: https://1on1.website/"
echo "   You should see a 'Site Cleared' page"
echo ""
echo "📋 What was removed:"
echo "   ✅ All website files"
echo "   ✅ All backups"
echo "   ✅ All caches"
echo "   ✅ All Python processes"
echo "   ✅ All temporary files"
echo ""
echo "✨ The server is now completely empty except for the 'Site Cleared' page" 