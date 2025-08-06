#!/usr/bin/env python3
"""
Emotion Standardizer - Ensures all conversations use consistent Hebrew emotions
Automatically fixes English emotions and validates emotion data integrity
"""

import json
import glob
import os
import sys
from datetime import datetime

# Comprehensive English to Hebrew emotion mapping
EMOTION_MAPPING = {
    # Basic emotions
    "happiness": "שמחה", "joy": "שמחה", "sadness": "עצב", "anger": "כעס",
    "fear": "פחד", "surprise": "הפתעה", "disgust": "גועל", "neutral": "נייטרלי",
    
    # Complex emotions
    "curiosity": "סקרנות", "interest": "עניין", "casual": "נינוח",
    "frustration": "תסכול", "excitement": "התרגשות", "love": "אהבה",
    "anxiety": "חרדה", "hope": "תקווה", "pride": "גאווה",
    
    # Social emotions
    "admiration": "הערצה", "amusement": "שעשוע", "annoyance": "עצבנות",
    "approval": "אישור", "awe": "יראה", "caring": "דאגה",
    "concentration": "ריכוז", "contentment": "שביעות רצון", "desire": "תשוקה",
    "disappointment": "אכזבה", "disapproval": "אי הסכמה", "embarrassment": "מבוכה",
    "gratitude": "הכרת תודה", "relief": "הקלה", "optimism": "אופטימיות",
    "confusion": "בלבול", "calm": "רגוע",
    
    # Capitalized versions
    "Anger": "כעס", "Curiosity": "סקרנות", "Disgust": "גועל", "Fear": "פחד",
    "Frustration": "תסכול", "Joy": "שמחה", "Neutral": "נייטרלי", "Surprise": "הפתעה",
    
    # Additional emotions found in your data
    "affection": "חיבה", "agreeable": "נעים", "agreement": "הסכמה",
    "anticipation": "ציפייה", "appreciation": "הערכה", "assertive": "נחרץ",
    "concern": "דאגה", "curious": "סקרן", "exhaustion": "תשישות",
    "farewell": "פרידה", "hesitation": "היסוס", "urgency": "דחיפות",
    "uncertainty": "אי ודאות"
}

def log_message(message, level="INFO"):
    """Log messages with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def backup_file(file_path):
    """Create a backup of the emotion file"""
    backup_path = f"{file_path}.backup.{int(datetime.now().timestamp())}"
    try:
        os.system(f"cp '{file_path}' '{backup_path}'")
        return backup_path
    except Exception as e:
        log_message(f"Failed to backup {file_path}: {e}", "ERROR")
        return None

def validate_emotion_file(file_path):
    """Validate that an emotion file has proper structure"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not isinstance(data, dict):
            return False, "Root is not a dictionary"
        
        mp3_count = len([k for k in data.keys() if k.endswith('.mp3')])
        if mp3_count == 0:
            return False, "No MP3 entries found"
        
        return True, f"Valid file with {mp3_count} MP3 entries"
    
    except Exception as e:
        return False, f"JSON parsing error: {e}"

def standardize_emotions_in_file(file_path, dry_run=False):
    """Fix English emotions in a single file"""
    log_message(f"Processing: {file_path}")
    
    # Validate file first
    is_valid, validation_msg = validate_emotion_file(file_path)
    if not is_valid:
        log_message(f"Skipping invalid file {file_path}: {validation_msg}", "WARNING")
        return 0
    
    # Backup before processing
    if not dry_run:
        backup_path = backup_file(file_path)
        if backup_path:
            log_message(f"Created backup: {backup_path}")
    
    # Load and process
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        log_message(f"Error loading {file_path}: {e}", "ERROR")
        return 0
    
    fixed_count = 0
    english_emotions_found = []
    
    # Process each MP3 segment
    for segment_key, segment_data in data.items():
        if segment_key.endswith('.mp3') and 'emotions' in segment_data:
            emotions = segment_data['emotions']
            if isinstance(emotions, list):
                new_emotions = []
                for emotion in emotions:
                    if emotion in EMOTION_MAPPING:
                        hebrew_emotion = EMOTION_MAPPING[emotion]
                        new_emotions.append(hebrew_emotion)
                        english_emotions_found.append(f"{segment_key}: {emotion} → {hebrew_emotion}")
                        fixed_count += 1
                    else:
                        new_emotions.append(emotion)
                
                if not dry_run:
                    segment_data['emotions'] = new_emotions
    
    # Save changes
    if not dry_run and fixed_count > 0:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            log_message(f"✅ Fixed {fixed_count} emotions in {file_path}")
        except Exception as e:
            log_message(f"Error saving {file_path}: {e}", "ERROR")
            return 0
    elif dry_run and fixed_count > 0:
        log_message(f"[DRY RUN] Would fix {fixed_count} emotions in {file_path}")
    
    # Show details for first few fixes
    if english_emotions_found:
        for detail in english_emotions_found[:5]:
            log_message(f"  {detail}")
        if len(english_emotions_found) > 5:
            log_message(f"  ... and {len(english_emotions_found) - 5} more")
    
    return fixed_count

def find_all_emotion_files():
    """Find all AI-analyzed emotion files"""
    pattern = "conversations/*/emotions*_ai_analyzed.json"
    files = glob.glob(pattern)
    log_message(f"Found {len(files)} AI-analyzed emotion files")
    return sorted(files)

def check_for_original_files():
    """Check if any original emotion files still exist"""
    pattern = "conversations/*/emotions*.json"
    all_files = glob.glob(pattern)
    ai_files = glob.glob("conversations/*/emotions*_ai_analyzed.json")
    
    original_files = [f for f in all_files if f not in ai_files]
    
    if original_files:
        log_message(f"⚠️  Found {len(original_files)} original emotion files that could cause fallbacks:", "WARNING")
        for f in original_files:
            log_message(f"   {f}", "WARNING")
        return original_files
    else:
        log_message("✅ No problematic original emotion files found")
        return []

def update_config_files():
    """Ensure config files only reference AI-analyzed files"""
    config_file = "config/conversations_config.json"
    
    if not os.path.exists(config_file):
        log_message(f"Config file not found: {config_file}", "WARNING")
        return False
    
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        changes_made = False
        
        # Check each conversation config
        for conv_key, conv_data in config.get('conversations', {}).items():
            # Remove emotion_file references to original files
            if 'emotion_file' in conv_data:
                emotion_file = conv_data['emotion_file']
                if not emotion_file.endswith('_ai_analyzed.json'):
                    log_message(f"Removing obsolete emotion_file reference: {emotion_file}")
                    del conv_data['emotion_file']
                    changes_made = True
        
        # Update file mappings
        if 'file_mappings' in config:
            for conv_key, file_path in config['file_mappings'].items():
                if not file_path.endswith('_ai_analyzed.json'):
                    new_path = file_path.replace('.json', '_ai_analyzed.json')
                    config['file_mappings'][conv_key] = new_path
                    log_message(f"Updated mapping: {conv_key} → {new_path}")
                    changes_made = True
        
        if changes_made:
            # Add update timestamp
            config['last_emotion_standardization'] = datetime.now().isoformat()
            
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            log_message("✅ Updated conversations config file")
        else:
            log_message("✅ Conversations config is already up to date")
        
        return True
        
    except Exception as e:
        log_message(f"Error updating config file: {e}", "ERROR")
        return False

def main():
    """Main execution function"""
    print("=" * 60)
    print("🎭 EMOTION STANDARDIZER - Hebrew Consistency Tool")
    print("=" * 60)
    
    # Parse command line arguments
    dry_run = '--dry-run' in sys.argv
    if dry_run:
        log_message("🔍 Running in DRY RUN mode - no changes will be made")
    
    # Step 1: Check for problematic original files
    log_message("Step 1: Checking for original emotion files...")
    original_files = check_for_original_files()
    
    # Step 2: Find all AI-analyzed files
    log_message("Step 2: Finding AI-analyzed emotion files...")
    emotion_files = find_all_emotion_files()
    
    if not emotion_files:
        log_message("No AI-analyzed emotion files found!", "ERROR")
        return 1
    
    # Step 3: Process each file
    log_message("Step 3: Standardizing emotions in all files...")
    total_fixed = 0
    
    for file_path in emotion_files:
        fixed_count = standardize_emotions_in_file(file_path, dry_run)
        total_fixed += fixed_count
    
    # Step 4: Update config files
    if not dry_run:
        log_message("Step 4: Updating configuration files...")
        update_config_files()
    
    # Summary
    print("\n" + "=" * 60)
    if dry_run:
        log_message(f"🔍 DRY RUN COMPLETE: Would fix {total_fixed} emotions across {len(emotion_files)} files")
        log_message("Run without --dry-run to apply changes")
    else:
        log_message(f"🎉 STANDARDIZATION COMPLETE: Fixed {total_fixed} emotions across {len(emotion_files)} files")
        
        if original_files:
            log_message("⚠️  Consider removing original emotion files to prevent fallbacks:", "WARNING")
            print("   Run: rm " + " ".join(f'"{f}"' for f in original_files))
    
    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main()) 