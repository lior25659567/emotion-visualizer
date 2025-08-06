#!/bin/bash

# 🗑️  Remove Files from 1on1.website Server
# This script removes specific files/directories from your DigitalOcean server

echo "🗑️  Removing files from 1on1.website server..."

# Configuration
SERVER_IP="167.172.51.184"  # DigitalOcean droplet IP for 1on1.website
SERVER_USER="root"          # Usually root for DigitalOcean droplets
WEB_ROOT="/var/www/html"    # Standard web root

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  WARNING: This will permanently delete files from your server!${NC}"
echo "🎯 Target: $SERVER_USER@$SERVER_IP:$WEB_ROOT"
echo ""

# Function to remove specific files/directories
remove_files() {
    local files_to_remove=("$@")
    
    for file in "${files_to_remove[@]}"; do
        echo "🗑️  Removing: $file"
        ssh "$SERVER_USER@$SERVER_IP" "
            cd $WEB_ROOT
            if [ -e '$file' ]; then
                rm -rf '$file'
                echo '✅ Removed: $file'
            else
                echo '⚠️  Not found: $file'
            fi
        "
    done
}

# Function to list current files on server
list_server_files() {
    echo "📋 Current files on server:"
    ssh "$SERVER_USER@$SERVER_IP" "
        cd $WEB_ROOT
        echo '📁 Directory structure:'
        find . -type f -name '*.html' -o -name '*.js' -o -name '*.py' -o -name '*.json' | head -20
        echo ''
        echo '📊 File count:'
        find . -type f | wc -l
    "
}

# Function to backup before removal
create_backup() {
    echo "💾 Creating backup before removal..."
    ssh "$SERVER_USER@$SERVER_IP" "
        mkdir -p /root/backups
        cd $WEB_ROOT
        tar -czf /root/backups/pre_removal_backup_\$(date +%Y%m%d_%H%M%S).tar.gz * 2>/dev/null || true
        echo '✅ Backup created in /root/backups/'
    "
}

# Main menu
echo "What would you like to remove?"
echo "1. List current files on server"
echo "2. Remove specific files/directories"
echo "3. Remove all files (nuclear option)"
echo "4. Create backup only"
echo "5. Exit"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        list_server_files
        ;;
    2)
        echo ""
        echo "Enter files/directories to remove (space-separated):"
        echo "Examples: index.html admin_panel.html videos/ conversations/"
        read -p "Files to remove: " files_input
        
        # Convert space-separated string to array
        IFS=' ' read -ra files_array <<< "$files_input"
        
        echo ""
        echo -e "${YELLOW}⚠️  About to remove:${NC}"
        for file in "${files_array[@]}"; do
            echo "   • $file"
        done
        
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            create_backup
            remove_files "${files_array[@]}"
            echo -e "${GREEN}✅ File removal completed!${NC}"
        else
            echo "❌ Operation cancelled"
        fi
        ;;
    3)
        echo -e "${RED}⚠️  NUCLEAR OPTION: This will remove ALL files from the server!${NC}"
        read -p "Are you absolutely sure? Type 'DELETE ALL' to confirm: " confirm
        if [[ $confirm == "DELETE ALL" ]]; then
            create_backup
            echo "🗑️  Removing all files..."
            ssh "$SERVER_USER@$SERVER_IP" "
                cd $WEB_ROOT
                rm -rf * .*[^.]* 2>/dev/null || true
                echo '✅ All files removed'
            "
            echo -e "${GREEN}✅ All files removed from server!${NC}"
        else
            echo "❌ Operation cancelled"
        fi
        ;;
    4)
        create_backup
        ;;
    5)
        echo "👋 Exiting..."
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🔗 Server URL: https://1on1.website/"
echo "📁 Server path: $WEB_ROOT" 