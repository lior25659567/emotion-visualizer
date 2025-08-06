#!/bin/bash

# 🔄 Force Cache Clear for 1on1.website
# This script clears server cache and adds cache-busting headers

echo "🔄 Force clearing cache for 1on1.website..."

# Configuration
SERVER_IP="167.172.51.184"
SERVER_USER="root"
WEB_ROOT="/var/www/html"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🎯 Target: $SERVER_USER@$SERVER_IP:$WEB_ROOT"
echo ""

# Clear server-side cache
echo "🧹 Clearing server cache..."
ssh "$SERVER_USER@$SERVER_IP" "
    # Clear nginx cache
    rm -rf /var/cache/nginx/* 2>/dev/null || true
    
    # Clear any application cache
    find $WEB_ROOT -name '*.cache' -delete 2>/dev/null || true
    find $WEB_ROOT -name 'cache' -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Restart nginx to clear memory cache
    systemctl restart nginx 2>/dev/null || true
    
    echo '✅ Server cache cleared'
"

# Add cache-busting headers to HTML files
echo ""
echo "📝 Adding cache-busting headers to HTML files..."
ssh "$SERVER_USER@$SERVER_IP" "
    cd $WEB_ROOT
    
    # Add cache-busting meta tags to HTML files
    for file in *.html; do
        if [ -f \"\$file\" ]; then
            # Add cache-busting meta tag if not already present
            if ! grep -q 'Cache-Control' \"\$file\"; then
                sed -i '/<head>/a \    <meta http-equiv=\"Cache-Control\" content=\"no-cache, no-store, must-revalidate\">' \"\$file\"
                sed -i '/<head>/a \    <meta http-equiv=\"Pragma\" content=\"no-cache\">' \"\$file\"
                sed -i '/<head>/a \    <meta http-equiv=\"Expires\" content=\"0\">' \"\$file\"
                echo \"✅ Added cache headers to \$file\"
            fi
        fi
    done
    
    # Also add to subdirectories
    find . -name '*.html' -exec sed -i '/<head>/a \    <meta http-equiv=\"Cache-Control\" content=\"no-cache, no-store, must-revalidate\">' {} \; 2>/dev/null || true
    find . -name '*.html' -exec sed -i '/<head>/a \    <meta http-equiv=\"Pragma\" content=\"no-cache\">' {} \; 2>/dev/null || true
    find . -name '*.html' -exec sed -i '/<head>/a \    <meta http-equiv=\"Expires\" content=\"0\">' {} \; 2>/dev/null || true
"

# Add nginx cache-busting configuration
echo ""
echo "⚙️  Adding nginx cache-busting configuration..."
ssh "$SERVER_USER@$SERVER_IP" "
    # Backup original nginx config
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup 2>/dev/null || true
    
    # Add cache-busting headers to nginx config
    cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
    server_name 1on1.website www.1on1.website;
    root /var/www/html;
    index index.html index.htm;

    # Cache-busting headers
    add_header Cache-Control \"no-cache, no-store, must-revalidate\" always;
    add_header Pragma \"no-cache\" always;
    add_header Expires \"0\" always;
    
    # Force reload for HTML files
    location ~* \\.html$ {
        add_header Cache-Control \"no-cache, no-store, must-revalidate\" always;
        add_header Pragma \"no-cache\" always;
        add_header Expires \"0\" always;
    }
    
    # Cache static assets for 1 hour
    location ~* \\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1h;
        add_header Cache-Control \"public, immutable\";
    }
    
    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

    # Test nginx config
    nginx -t
    
    # Reload nginx
    systemctl reload nginx
    
    echo '✅ Nginx cache-busting configured'
"

# Create a simple test file to verify updates
echo ""
echo "🧪 Creating test file to verify updates..."
ssh "$SERVER_USER@$SERVER_IP" "
    cd $WEB_ROOT
    echo \"<!-- Updated: \$(date) -->\" > test_update.html
    echo \"<html><head><title>Cache Test</title></head><body><h1>Updated: \$(date)</h1></body></html>\" >> test_update.html
    echo '✅ Test file created'
"

echo ""
echo -e "${GREEN}🎉 Cache clearing completed!${NC}"
echo ""
echo "🔗 Test URLs:"
echo "   • https://1on1.website/test_update.html (should show current time)"
echo "   • https://1on1.website/ (main site)"
echo ""
echo "💡 Browser cache clearing tips:"
echo "   1. Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)"
echo "   2. Open in incognito/private mode"
echo "   3. Clear browser cache manually"
echo "   4. Try different browser"
echo ""
echo "✨ Next steps:"
echo "   1. Visit https://1on1.website/test_update.html to verify cache is cleared"
echo "   2. Hard refresh the main site: https://1on1.website/"
echo "   3. Check that you see the updated version" 