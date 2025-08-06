#!/bin/bash

# Enhanced Emotion Visualizer Startup Script with OpenAI Integration
echo "🚀 Starting Enhanced Emotion Visualizer with OpenAI Integration"
echo "==============================================================="

# Set the OpenAI API key (ensure it persists)
# export OPENAI_API_KEY="your-api-key-here"

# Verify API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️ Warning: OPENAI_API_KEY not set"
    echo "   Please set your OpenAI API key before running this script"
    echo "   Example: export OPENAI_API_KEY='your-api-key-here'"
else
    key_length=${#OPENAI_API_KEY}
    echo "🔑 API Key Status:"
    echo "   ✅ Length: $key_length characters"
    echo "   ✅ Format: ${OPENAI_API_KEY:0:20}...${OPENAI_API_KEY: -20}"
fi

# Check if port 8000 is in use and free it if needed
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Port 8000 is in use. Killing existing processes..."
    lsof -Pi :8000 -sTCP:LISTEN -t | xargs kill -9 2>/dev/null
    sleep 2
fi

# Start the server
echo "🌐 Starting server on port 8000..."
echo "📱 Access your visualization at: http://localhost:8000"
echo "⚙️ Admin panel: http://localhost:8000/admin_panel.html"
echo ""
echo "🎭 Features enabled:"
echo "   ✅ ChatGPT-4 powered emotion analysis"
echo "   ✅ Hebrew conversation processing"
echo "   ✅ Advanced visualization parameters"
echo "   ✅ Real-time conversation analysis"
echo ""
echo "Press Ctrl+C to stop the server"
echo "==============================================================="

# Start the Python server
python3 start_server.py 