#!/bin/bash

# Emotion Visualizer Exhibition Startup Script
# This script starts the server and opens the browser in kiosk mode

echo "🎭 Starting Emotion Visualizer Exhibition..."

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Kill any existing Python servers on our ports
echo "🔄 Cleaning up any existing servers..."
for port in 8000 8001 8002 8003; do
    lsof -ti:$port | xargs kill -9 2>/dev/null
done

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Start the server in production mode
echo "🚀 Starting server in production mode..."
export PRODUCTION_MODE=true
python backend/simple_web_server.py --production > logs/server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Check if server started successfully
if ! curl -s http://localhost:8001 > /dev/null; then
    echo "❌ Server failed to start! Check logs/server.log"
    exit 1
fi

echo "✅ Server started successfully (PID: $SERVER_PID)"

# Open browser in kiosk mode
echo "🌐 Opening browser in kiosk mode..."

# For macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Kill any existing Chrome instances
    pkill -f "Google Chrome"
    sleep 2
    
    # Open Chrome in kiosk mode
    open -a "Google Chrome" --args \
        --kiosk \
        --app="http://localhost:8001/index.html" \
        --disable-pinch \
        --overscroll-history-navigation=0 \
        --disable-session-crashed-bubble \
        --disable-infobars \
        --check-for-update-interval=604800 \
        --disable-component-update

# For Linux
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Kill any existing Chrome/Chromium instances
    pkill -f "chrome"
    pkill -f "chromium"
    sleep 2
    
    # Try Chrome first, then Chromium
    if command -v google-chrome &> /dev/null; then
        google-chrome \
            --kiosk \
            --app="http://localhost:8001/index.html" \
            --disable-pinch \
            --overscroll-history-navigation=0 \
            --disable-session-crashed-bubble \
            --disable-infobars \
            --check-for-update-interval=604800 \
            --disable-component-update &
    elif command -v chromium-browser &> /dev/null; then
        chromium-browser \
            --kiosk \
            --app="http://localhost:8001/index.html" \
            --disable-pinch \
            --overscroll-history-navigation=0 \
            --disable-session-crashed-bubble \
            --disable-infobars &
    else
        echo "❌ Chrome/Chromium not found! Please install Chrome or Chromium."
        exit 1
    fi
fi

echo "🎉 Exhibition mode started successfully!"
echo "📌 Server PID: $SERVER_PID"
echo "💡 To stop: Press Ctrl+C or run ./stop_exhibition.sh"

# Keep script running and monitor server
while true; do
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "⚠️  Server stopped unexpectedly! Restarting..."
        python backend/simple_web_server.py --production > logs/server.log 2>&1 &
        SERVER_PID=$!
        sleep 5
    fi
    sleep 30
done 