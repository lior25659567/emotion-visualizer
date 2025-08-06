# Conversation Wizard Integration Guide

This guide explains how to add the conversation wizard functionality to your existing server **without editing the main server file**.

## 🎯 What This Adds

- **Hebrew speech-to-text** using Whisper
- **92-emotion analysis system** using your existing server's advanced emotion detection
- **Live webcam visualization** with emotion-based parameters (no blob effects)
- **Voice-based conversation input** in the מעבדת שיחות page
- **Same analysis quality** as your main conversation system

## 📁 Files Created

- `backend/conversation_analyzer_module.py` - Core functionality module
- `add_conversation_wizard.py` - Integration helper
- `backend/requirements_conversation_analyzer.txt` - Dependencies

## 🚀 Integration Steps

### Option 1: Import Integration (Recommended)

Add these 2 lines to your `start_server.py` file:

```python
# Add this import near the top with other imports
from add_conversation_wizard import add_conversation_wizard

# Add this line after your Flask app is created (after app = Flask(__name__))
add_conversation_wizard(app)
```

### Option 2: Manual Integration

If you prefer not to edit `start_server.py`, you can create a new server file that extends the existing one:

```python
# Create: server_with_wizard.py
from start_server import *  # Import everything from the main server
from add_conversation_wizard import add_conversation_wizard

# Add conversation wizard functionality
add_conversation_wizard(app)

# Run the enhanced server
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

## 📦 Dependencies Installation

Install additional dependencies for the conversation wizard:

```bash
pip install -r backend/requirements_conversation_analyzer.txt
```

Dependencies include:
- `openai-whisper` - Hebrew speech recognition
- `openai` - Emotion analysis (optional, falls back to keywords)
- `torch` & `torchaudio` - Required by Whisper

## 🔗 New API Endpoints

Once integrated, these endpoints become available:

- `POST /api/conversation-wizard/transcribe-audio` - Convert Hebrew speech to text
- `POST /api/conversation-wizard/analyze-conversation` - Analyze emotion from text  
- `GET /api/conversation-wizard/health` - Check functionality status

## ✅ Testing Integration

Test that integration worked:

```bash
python add_conversation_wizard.py
```

Or check in browser:
```
http://localhost:5000/api/conversation-wizard/health
```

## 🎤 User Experience

1. User enters מעבדת שיחות page
2. Voice interface appears with microphone button
3. User clicks and speaks in Hebrew about their conversation
4. System transcribes speech using Whisper
5. **Advanced emotion analysis** using your server's 92-emotion system
6. **Live webcam feed** adjusts parameters based on detected emotions (no blob effects)
7. Screenshot of live camera is captured and ready for upload to placeholder

## 🚨 Troubleshooting

**If Whisper model fails to load:**
- Ensure sufficient RAM (2GB+ recommended)
- Install torch with appropriate platform support

**If OpenAI analysis fails:**
- System automatically falls back to Hebrew keyword matching
- Set `OPENAI_API_KEY` environment variable for full functionality

**If integration fails:**
- Check Python path includes project root
- Verify all dependencies are installed
- Check server logs for detailed error messages

## 🔧 Configuration

The system uses:
- **Your existing 92-emotion system** from `config/emotions_config.json`
- **Same OpenAI analysis** as your main conversation system
- **Automatic fallback** to keyword matching if OpenAI unavailable
- **Hebrew language detection** in Whisper
- **Live camera parameters** mapped from emotion intensity and type

### 📊 Emotion Analysis Integration

- **Uses `analyze_text_emotion_advanced()`** - same function as main server
- **Loads `emotions_config.json`** - your existing 92 emotions
- **Applies emotion colors** from your admin panel configuration
- **Live camera settings** based on emotion intensity (`godel_to_regesh`)
- **No blob effects** - clean live webcam visualization

No additional configuration needed - the system integrates seamlessly with your existing emotion system! 