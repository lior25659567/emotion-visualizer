#!/bin/bash

# Auto Emotion Standardization Script
# Automatically ensures all conversations use consistent Hebrew emotions

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STANDARDIZER="$SCRIPT_DIR/emotion_standardizer.py"

echo "🎭 Auto Emotion Standardizer"
echo "=========================="

# Check if the standardizer exists
if [ ! -f "$STANDARDIZER" ]; then
    echo "❌ ERROR: emotion_standardizer.py not found in $SCRIPT_DIR"
    exit 1
fi

# Function to standardize emotions
standardize_emotions() {
    echo "🔄 Running emotion standardization..."
    python3 "$STANDARDIZER"
    return $?
}

# Function to check if any new conversations need processing
check_new_conversations() {
    echo "🔍 Checking for new conversations..."
    
    # Find all AI-analyzed emotion files
    local ai_files=$(find conversations/ -name "*_ai_analyzed.json" 2>/dev/null)
    local file_count=$(echo "$ai_files" | grep -c ".*" 2>/dev/null || echo "0")
    
    echo "📊 Found $file_count AI-analyzed emotion files"
    
    # Check for any English emotions in the files
    if [ $file_count -gt 0 ]; then
        local english_emotions=$(grep -l '"curiosity"\|"interest"\|"happiness"\|"anger"\|"fear"\|"neutral"\|"Anger"\|"Joy"' conversations/*/emotions*_ai_analyzed.json 2>/dev/null | wc -l)
        
        if [ $english_emotions -gt 0 ]; then
            echo "⚠️  Found $english_emotions files with English emotions that need fixing"
            return 1
        else
            echo "✅ All emotion files appear to use Hebrew emotions"
            return 0
        fi
    else
        echo "⚠️  No AI-analyzed emotion files found"
        return 0
    fi
}

# Function to set up automatic monitoring (future feature)
setup_monitoring() {
    echo "📋 Setting up automatic monitoring..."
    
    # Create a simple status file
    cat > emotion_status.json << EOF
{
    "last_standardization": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
    "status": "up_to_date",
    "files_processed": $(find conversations/ -name "*_ai_analyzed.json" 2>/dev/null | wc -l),
    "standardizer_version": "1.0"
}
EOF
    
    echo "✅ Created emotion_status.json for monitoring"
}

# Main execution
main() {
    case "${1:-auto}" in
        "check")
            check_new_conversations
            ;;
        "force")
            echo "🚀 Force running standardization..."
            standardize_emotions
            setup_monitoring
            ;;
        "auto"|"")
            check_new_conversations
            needs_update=$?
            
            if [ $needs_update -eq 1 ]; then
                echo "🔧 Standardization needed, running now..."
                standardize_emotions
                if [ $? -eq 0 ]; then
                    setup_monitoring
                    echo "✅ Auto-standardization complete!"
                else
                    echo "❌ Standardization failed!"
                    exit 1
                fi
            else
                echo "✅ No standardization needed"
                setup_monitoring
            fi
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [check|force|auto|help]"
            echo ""
            echo "Commands:"
            echo "  check  - Check if standardization is needed"
            echo "  force  - Force run standardization on all files" 
            echo "  auto   - Auto-run standardization if needed (default)"
            echo "  help   - Show this help message"
            ;;
        *)
            echo "❌ Unknown command: $1"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

main "$@" 