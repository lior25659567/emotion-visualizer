#!/bin/bash

# 🚀 Force Upload Latest Files to 1on1.website
# This script forces upload of the latest files with timestamp verification

echo "🚀 Force uploading latest files to 1on1.website..."

# Configuration
SERVER_IP="167.172.51.184"
SERVER_USER="root"
WEB_ROOT="/var/www/html"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🎯 Target: $SERVER_USER@$SERVER_IP:$WEB_ROOT"
echo ""

# Add timestamp to index.html to force update
echo "📝 Adding timestamp to index.html..."
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
sed -i.bak "s|<title>|<title> [Updated: $TIMESTAMP] |" index.html

# Upload the updated index.html
echo "📤 Uploading updated index.html..."
scp index.html "$SERVER_USER@$SERVER_IP:$WEB_ROOT/"

# Restore original index.html
mv index.html.bak index.html

# Force clear all caches
echo ""
echo "🧹 Force clearing all caches..."
ssh "$SERVER_USER@$SERVER_IP" "
    # Clear nginx cache
    rm -rf /var/cache/nginx/* 2>/dev/null || true
    
    # Clear any proxy cache
    systemctl restart nginx 2>/dev/null || true
    systemctl restart apache2 2>/dev/null || true
    
    # Clear any CDN cache headers
    echo 'Cache-Control: no-cache, no-store, must-revalidate' > /var/www/html/.htaccess 2>/dev/null || true
    echo 'Pragma: no-cache' >> /var/www/html/.htaccess 2>/dev/null || true
    echo 'Expires: 0' >> /var/www/html/.htaccess 2>/dev/null || true
    
    # Force reload nginx
    nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null || true
    
    echo '✅ All caches cleared'
"

# Create a version check file
echo ""
echo "🧪 Creating version check file..."
ssh "$SERVER_USER@$SERVER_IP" "
    cd $WEB_ROOT
    echo \"<html><head><title>Version Check</title></head><body>\" > version_check.html
    echo \"<h1>🔄 Version Check</h1>\" >> version_check.html
    echo \"<p><strong>Last Updated:</strong> $TIMESTAMP</p>\" >> version_check.html
    echo \"<p><strong>Server Time:</strong> \$(date)</p>\" >> version_check.html
    echo \"<p><strong>File Size:</strong> \$(ls -lh index.html | awk '{print \$5}')</p>\" >> version_check.html
    echo \"<p><strong>Cache Headers:</strong> Added</p>\" >> version_check.html
    echo \"<p><a href='/'>← Back to Main Site</a></p>\" >> version_check.html
    echo \"</body></html>\" >> version_check.html
    echo '✅ Version check file created'
"

# Check for CDN or proxy
echo ""
echo "🔍 Checking for CDN or proxy..."
ssh "$SERVER_USER@$SERVER_IP" "
    echo 'Checking nginx configuration...'
    nginx -T 2>/dev/null | grep -i 'proxy\|cdn\|cache' || echo 'No proxy/CDN found in nginx config'
    
    echo ''
    echo 'Checking for Cloudflare or other CDN...'
    curl -I https://1on1.website/ 2>/dev/null | grep -i 'cf-\|cloudflare\|cdn' || echo 'No CDN headers detected'
"

echo ""
echo -e "${GREEN}🎉 Force upload completed!${NC}"
echo ""
echo "🔗 Test URLs:"
echo "   • https://1on1.website/version_check.html (version info)"
echo "   • https://1on1.website/ (main site with timestamp)"
echo ""
echo "💡 If you still see old version:"
echo "   1. Try incognito mode"
echo "   2. Clear browser cache completely"
echo "   3. Try different browser"
echo "   4. Check if your ISP is caching"
echo "   5. Wait 5-10 minutes for DNS propagation"
echo ""
echo "✨ The main site should now show: [Updated: $TIMESTAMP] in the title" 