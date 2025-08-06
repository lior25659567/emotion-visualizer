# 🎭 Emotion Standardization Guide

## Overview
This guide ensures all conversations use consistent Hebrew emotions, preventing color inconsistencies in your visualizations.

## ⚡ Quick Usage

### For Current Conversations
```bash
# Check if any conversations need fixing
./auto_standardize_emotions.sh check

# Automatically fix any issues found
./auto_standardize_emotions.sh auto

# Force run on all conversations (if needed)
./auto_standardize_emotions.sh force
```

### For New Conversations
When you add new conversations, simply run:
```bash
./auto_standardize_emotions.sh auto
```

This will automatically detect and fix any English emotions.

## 🔧 Tools Provided

### 1. emotion_standardizer.py
**Main standardization engine**
- Converts English emotions to Hebrew equivalents
- Validates emotion file integrity  
- Creates automatic backups
- Supports dry-run mode for testing

**Usage:**
```bash
# Test what would be changed (safe)
python3 emotion_standardizer.py --dry-run

# Apply fixes
python3 emotion_standardizer.py
```

### 2. auto_standardize_emotions.sh
**Automation wrapper**
- Automatically detects when standardization is needed
- Provides easy commands for maintenance
- Creates monitoring status files

**Commands:**
- `check` - Check if standardization needed
- `auto` - Auto-run if needed (recommended)
- `force` - Force run on all files
- `help` - Show usage information

## 🎯 What Gets Fixed

### English → Hebrew Emotion Mapping
The system automatically converts these emotions:

**Basic Emotions:**
- `happiness` → `שמחה`
- `sadness` → `עצב` 
- `anger` → `כעס`
- `fear` → `פחד`
- `surprise` → `הפתעה`
- `disgust` → `גועל`
- `neutral` → `נייטרלי`

**Complex Emotions:**
- `curiosity` → `סקרנות`
- `frustration` → `תסכול`
- `excitement` → `התרגשות`
- `anxiety` → `חרדה`
- `confusion` → `בלבול`
- `gratitude` → `הכרת תודה`

**Social Emotions:**
- `approval` → `אישור`
- `admiration` → `הערצה`
- `affection` → `חיבה`
- `anticipation` → `ציפייה`
- `agreement` → `הסכמה`

[Plus 25+ more emotions - see emotion_standardizer.py for complete list]

## 🚀 Integration with Your Workflow

### When Adding New Conversations

1. **Create your conversation files** as usual
2. **Run the auto-standardizer:**
   ```bash
   ./auto_standardize_emotions.sh auto
   ```
3. **Done!** All emotions will be standardized to Hebrew

### Regular Maintenance

**Weekly/Monthly check:**
```bash
./auto_standardize_emotions.sh check
```

If it finds issues, run:
```bash
./auto_standardize_emotions.sh auto
```

### Before Important Presentations

**Ensure everything is perfect:**
```bash
./auto_standardize_emotions.sh force
```

## 🛡️ Safety Features

### Automatic Backups
Every file processed gets a timestamped backup:
- `emotions1_ai_analyzed.json.backup.1633024800`
- Backups are created before any changes
- You can restore if needed

### Validation
- Files are validated before processing
- Corrupt files are skipped with warnings
- Only processes valid emotion files

### Dry-Run Mode
Test changes before applying:
```bash
python3 emotion_standardizer.py --dry-run
```

## 📊 Monitoring

The system creates `emotion_status.json` with:
- Last standardization timestamp
- Number of files processed
- Current status

## 🔍 Troubleshooting

### "No changes needed" but colors are inconsistent
This might indicate:
1. Browser cache issues - refresh your browser
2. Server needs restart
3. Check if you're loading a different conversation file

### "English emotions found" but they're not in emotions arrays
The checker might find English emotions in metadata fields (like `emotionDistribution`). This is normal and doesn't affect colors.

### Script permissions error
Make scripts executable:
```bash
chmod +x emotion_standardizer.py auto_standardize_emotions.sh
```

## 📝 File Structure Requirements

Your emotion files should follow this structure:
```json
{
  "001.mp3": {
    "emotions": ["Hebrew", "emotions", "here"],
    "transcript": "...",
    "speaker": 0
  }
}
```

The `emotions` array is what controls visualization colors.

## 🎯 Best Practices

### For New Conversations
1. Always run standardization after creating new emotion files
2. Test visualization colors after adding conversations
3. Keep the standardizer scripts in your project root

### For Existing Conversations  
1. Run monthly maintenance checks
2. After any manual emotion file edits, run standardization
3. Before demonstrations, run a force update

### For Team Collaboration
1. Share this guide with team members
2. Include standardization in your deployment process
3. Document any new emotions you discover

## 🎉 Benefits

✅ **Consistent Colors**: No more random color changes between loads
✅ **Hebrew Standard**: All emotions display in Hebrew as intended  
✅ **Automatic**: Once set up, runs with minimal intervention
✅ **Safe**: Automatic backups prevent data loss
✅ **Scalable**: Works with unlimited conversations

## 🔄 Future Updates

To add new emotion mappings:
1. Edit `EMOTION_MAPPING` in `emotion_standardizer.py`
2. Add the English → Hebrew mapping
3. Run standardization on all files

## 💡 Pro Tips

- Run `auto` mode regularly - it's smart and only fixes what needs fixing
- Use `check` mode to monitor system health
- Keep your emotion config file (`config/emotions_config.json`) up to date with color mappings
- The system works with your existing 92-emotion configuration

---

**Quick Start:** Just run `./auto_standardize_emotions.sh auto` and you're good to go! 🚀 