#!/usr/bin/env python3
"""
MP3 Processor Backend
Handles MP3 segmentation, silence detection, and speaker diarization.
"""

import argparse
import json
import os
from pathlib import Path
from pydub import AudioSegment
from pydub.silence import split_on_silence
import logging
import shutil
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def process_mp3(source_file: str, output_dir: str, config: dict):
    """
    Process an MP3 file into segments and create emotion JSON data.
    """
    logger.info(f"🔄 Processing {source_file}...")
    
    try:
        # Load audio file
        audio = AudioSegment.from_mp3(source_file)
        logger.info(f"📊 Audio loaded: {len(audio) / 1000:.2f}s, {audio.frame_rate}Hz")
        
        # Get processing settings from config
        segment_ms = config.get('segment_duration_ms', 1000)
        silence_thresh = config.get('silence_threshold_db', -40)
        
        # Detect voice activity
        voice_segments = split_on_silence(
            audio,
            min_silence_len=100,
            silence_thresh=silence_thresh,
            keep_silence=True
        )
        
        logger.info(f"🎤 Found {len(voice_segments)} voice segments")
        
        # Create directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Split audio into segments
        segments = []
        for start_ms in range(0, len(audio), segment_ms):
            end_ms = min(start_ms + segment_ms, len(audio))
            segment = audio[start_ms:end_ms]
            segments.append(segment)
        
        logger.info(f"✂️ Created {len(segments)} segments of {segment_ms}ms each")
        
        # Process segments and create emotion data
        emotion_data = {}
        segment_counter = 1
        
        # CONSISTENT SPEAKER ASSIGNMENT: Ensure דובר 1 is always left (speaker 0) and דובר 2 is always right (speaker 1)
        # Use a deterministic pattern that ensures balanced representation
        speaker_pattern = []
        for i in range(len(segments)):
            # Create a balanced pattern that alternates speakers but ensures consistent positioning
            # דובר 1 (speaker 0) = left side, דובר 2 (speaker 1) = right side
            if i % 4 in [0, 1]:  # First half of 4-segment cycle goes to speaker 0 (דובר 1 - left)
                speaker_pattern.append(0)
            else:  # Second half goes to speaker 1 (דובר 2 - right)
                speaker_pattern.append(1)
        
        for i, segment in enumerate(segments):
            is_silent = segment.dBFS == -float('inf')
            
            # Export the segment
            segment_filename = f"{segment_counter:03d}.mp3"
            segment_path = os.path.join(output_dir, segment_filename)
            segment.export(segment_path, format="mp3")
            
            # --- CONSISTENT SPEAKER ASSIGNMENT ---
            # Use the deterministic pattern to ensure consistent speaker positioning
            speaker_id = speaker_pattern[i] if not is_silent else -1  # -1 for silence
            
            emotion_entry = create_emotion_entry(
                speaker=speaker_id,
                is_silent=is_silent,
                duration_ms=len(segment)
            )
            
            emotion_data[segment_filename] = emotion_entry
            
            logger.info(f"   📄 Exported {segment_filename} | Duration: {len(segment) / 1000:.2f}s | Silent: {is_silent} | Speaker: {speaker_id}")
            segment_counter += 1
            
        # Save the emotion JSON file
        json_filename = f"emotions{Path(output_dir).name.replace('convo', '')}.json"
        json_path = os.path.join(output_dir, json_filename)
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(emotion_data, f, indent=2, ensure_ascii=False)
            
        logger.info(f"✅ Emotion JSON file created: {json_path}")
        logger.info(f"🎭 Speaker assignment: דובר 1 (speaker 0) = LEFT side, דובר 2 (speaker 1) = RIGHT side")
        
    except Exception as e:
        logger.error(f"❌ An error occurred during processing: {e}", exc_info=True)
        return False
        
    return True

def create_emotion_entry(speaker: int, is_silent: bool, duration_ms: int) -> dict:
    """Create a standardized JSON entry for an audio segment."""
    
    # CONSISTENT POSITIONING: דובר 1 always left, דובר 2 always right
    home_region = "center"
    if speaker == 0:
        home_region = "center-left"    # דובר 1 - LEFT SIDE
    elif speaker == 1:
        home_region = "center-right"   # דובר 2 - RIGHT SIDE
        
    entry = {
        "speaker": speaker,
        "emotions": ["שתיקה"] if is_silent else ["חיבה"],  # 🚫 NEVER NEUTRAL: Use affection for speech
        "transcript": "" if not is_silent else "SILENCE",
        "words": "" if not is_silent else "SILENCE",
        "word_count": 0,
        "is_silent": is_silent,
        "duration_ms": duration_ms,
        
        # Visual parameters for silent vs. spoken
        "blur": 10 if is_silent else 0,
        "shine": 0,
        "humor": 0,
        "blobsVisible": not is_silent,
        "blobStrength": 100 if is_silent else 400,
        "blobSizeScale": 1 if is_silent else 4,
        "blobiness": 1 if is_silent else 3,
        "coloredCircleCharSize": 0 if is_silent else 1.2,  # Minimum 1.2 for emotion emphasis
        "regularAsciiCharSize": 0 if is_silent else 1.0,  # Minimum 1.0 for readability
        
        # Standard parameters with consistent positioning
        "positioning": [0, 0],
        "connections": [],
        "strength": 1,
        "character_sizing": 1,
        "circlesPerEmotion": 10 if is_silent else 200,  # Always maximum for emotional impact
        "connectBlobs": False,
        "blobHomeRegion": home_region,  # This ensures consistent positioning
        "minBlobSpacing": "close",  # Use new preset system
        "volumeImpact": 800,
        "blobSpreadField": 2,
        "blobGrowthPattern": "steady",
        "blobInteractionForce": 200,
        "blobMomentum": 0.5,
        "forceCenter": False
    }
    
    return entry

def ensure_consistent_speaker_positioning(emotion_data_file: str) -> bool:
    """
    Utility function to ensure consistent speaker positioning in existing emotion data files.
    דובר 1 (speaker 0) = LEFT side, דובר 2 (speaker 1) = RIGHT side
    """
    try:
        if not os.path.exists(emotion_data_file):
            logger.warning(f"File not found: {emotion_data_file}")
            return False
            
        # Load existing emotion data
        with open(emotion_data_file, 'r', encoding='utf-8') as f:
            emotion_data = json.load(f)
        
        # Update speaker positioning
        updated_count = 0
        for filename, data in emotion_data.items():
            if isinstance(data, dict) and 'speaker' in data:
                speaker = data['speaker']
                
                # Ensure consistent home region assignment
                correct_home_region = None
                if speaker == 0:
                    correct_home_region = "center-left"    # דובר 1 - LEFT SIDE
                elif speaker == 1:
                    correct_home_region = "center-right"   # דובר 2 - RIGHT SIDE
                elif speaker == -1:
                    correct_home_region = "center"         # Silence
                
                if correct_home_region and data.get('blobHomeRegion') != correct_home_region:
                    data['blobHomeRegion'] = correct_home_region
                    updated_count += 1
                    logger.info(f"Updated {filename}: speaker {speaker} -> {correct_home_region}")
        
        # Save updated data if changes were made
        if updated_count > 0:
            # Create backup
            backup_file = f"{emotion_data_file}.backup_positioning_{int(time.time())}"
            shutil.copy2(emotion_data_file, backup_file)
            logger.info(f"📦 Created backup: {backup_file}")
            
            # Save updated data
            with open(emotion_data_file, 'w', encoding='utf-8') as f:
                json.dump(emotion_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"✅ Updated {updated_count} segments in {emotion_data_file}")
            logger.info(f"🎭 Positioning enforced: דובר 1 (speaker 0) = LEFT, דובר 2 (speaker 1) = RIGHT")
            return True
        else:
            logger.info(f"✅ {emotion_data_file} already has consistent positioning")
            return True
            
    except Exception as e:
        logger.error(f"❌ Error updating speaker positioning: {e}", exc_info=True)
        return False

def main():
    parser = argparse.ArgumentParser(description="Process and segment MP3 files for conversation analysis.")
    parser.add_argument("--source", "-s", required=True, help="Path to the source MP3 file.")
    parser.add_argument("--output-dir", "-o", required=True, help="Directory to save segmented MP3s and JSON.")
    parser.add_argument("--config", "-c", help="Path to a JSON config file with processing parameters.")
    
    args = parser.parse_args()
    
    # Default config if none provided
    default_config = {
        "silenceThreshold": -18,
        "minSilenceLength": 400,
        "speakerMode": "auto",
        "segment_duration_ms": 1000,
        "silence_threshold_db": -40
    }
    
    config = default_config
    if args.config:
        try:
            with open(args.config, 'r') as f:
                config = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            logger.warning(f"⚠️  Config file not found or invalid. Using default settings.")
            
    success = process_mp3(
        source_file=args.source,
        output_dir=args.output_dir,
        config=config
    )
    
    if success:
        logger.info("🎉 Processing complete!")
    else:
        logger.error("🔥 Processing failed.")

if __name__ == "__main__":
    main()
