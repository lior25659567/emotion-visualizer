#!/bin/bash

# Stop Exhibition Script

echo "🛑 Stopping Emotion Visualizer Exhibition..."

# Kill Python servers
echo "📍 Stopping servers..."
for port in 8000 8001 8002 8003; do
    lsof -ti:$port | xargs kill -9 2>/dev/null
done

# Kill any Python processes running our server
pkill -f "simple_web_server.py"

# Close Chrome/Chromium
echo "🌐 Closing browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    pkill -f "Google Chrome"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    pkill -f "chrome"
    pkill -f "chromium"
fi

echo "✅ Exhibition stopped successfully!" 