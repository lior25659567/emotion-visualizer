# Emotion Visualizer - מדבק רגשות

A real-time emotion visualization platform that analyzes audio conversations and creates dynamic visual representations.

## ✨ Project Status - CLEANED & ORGANIZED

This project has been thoroughly cleaned and organized:
- ✅ Removed 50+ backup and test files
- ✅ Cleaned up 100+ JSON backup files
- ✅ Fixed undefined URL errors in admin panel
- ✅ Updated dependencies and requirements
- ✅ Installed FFmpeg for audio processing
- ✅ Fixed port conflicts and server issues

## 🚀 Quick Start

1. **Install dependencies:**
```bash
python3 -m pip install -r requirements.txt
```

2. **Start the server:**
```bash
python3 start_server.py
```

3. **Open your browser:**
- Main Interface: `http://localhost:8000`
- Admin Panel: `http://localhost:8000/admin_panel.html`

## 📁 Core Files

### Main Application
- **start_server.py** - Main Flask server with all API endpoints
- **index.html** - Main interface with responsive grid layout
- **admin_panel.html** - Administrative interface for managing conversations
- **visualization.html** - Individual conversation visualization viewer

### Configuration
- **requirements.txt** - Python dependencies (updated)
- **README.md** - This documentation

### Tools & Utilities
- **video_capture.py** - Video generation from visualizations
- **video_studio.html** - Video management interface
- **upload.html** - Audio file upload interface
- **config_editor.html** - Configuration editor

## 📂 Directory Structure

```
emotion-visualizer/
├── conversations/          # Audio files and emotion analysis data
│   ├── convo1/            # Individual conversation folders
│   ├── convo2/            # Each contains MP3 files + emotion JSON
│   └── ...
├── videos/                # Generated MP4 visualization videos
├── config/                # Configuration files
│   ├── conversations_config.json
│   ├── emotions_config.json
│   └── visualization_parameters.json
├── frontend/              # JavaScript visualization modules
│   ├── sketch.js          # Main p5.js visualization
│   ├── sidepanel.js       # UI components
│   └── live-visualization.js
├── assets/                # Static resources
│   └── Fonts/             # Custom fonts
├── backend/               # Backend modules (archived - not in use)
└── components/            # Reusable components
```

## 🎯 Features

- **Audio Upload & Processing** - Upload MP3 files and segment them
- **AI Emotion Analysis** - Analyze emotions in conversation segments
- **Real-time Visualization** - Dynamic p5.js-based emotion visualization
- **Video Generation** - Create MP4 videos from visualizations
- **Administrative Panel** - Manage conversations, emotions, and settings
- **Responsive Design** - Works on desktop and mobile
- **Static Mode** - Optimized for video capture and exhibitions

## 🔧 Technical Details

### Dependencies
- **Flask** - Web server framework
- **p5.js** - Visualization library
- **FFmpeg** - Audio processing (automatically installed)
- **pydub** - Python audio manipulation
- **selenium** - Video capture automation

### Audio Processing
- Segments audio files into 20-second chunks
- Supports MP3 format
- Requires FFmpeg (installed via Homebrew)

### Visualization
- Real-time emotion-based blob animation
- Customizable colors and parameters
- Hover animations for interactive mode
- Static mode for clean video capture

## 🎛️ Configuration

Access the admin panel at `http://localhost:8000/admin_panel.html` to:
- Upload and process new conversations
- Edit emotion colors and parameters
- Generate videos
- Manage conversation metadata
- Sync to production environments

## 🚫 Removed During Cleanup

### Backup Files Removed
- `index_backup_*.html` (5+ files)
- `*_backup_*.py` (3+ files)
- `admin_panel_backup.html`
- All timestamped JSON backups in conversations

### Test/Debug Files Removed
- `test_*.html` (3+ files)
- `debug_*.png` (13+ screenshot files)
- `debug_*.html` files
- Test MP4 files

### Documentation Removed
- 10+ outdated markdown files
- Compressed backup archives
- Log files

## 🔄 Fixes Applied

1. **Port Conflicts** - Stopped conflicting processes
2. **FFmpeg Installation** - Installed via Homebrew for audio processing
3. **Undefined URLs** - Fixed video URL generation in admin panel
4. **Dependencies** - Updated requirements.txt with missing packages
5. **File Organization** - Proper structure and naming

## 🎨 Usage

1. **Upload Audio**: Use admin panel to upload MP3 conversations
2. **Process**: Segment audio and generate emotion analysis
3. **Visualize**: View real-time emotion visualization
4. **Customize**: Edit colors and parameters via admin panel
5. **Export**: Generate MP4 videos for presentations

---

**Status**: ✅ Production Ready - Cleaned & Optimized
**Server**: Running on http://localhost:8000 