#!/usr/bin/env python3
"""
WhisperX integration for the Hebrew emotion analyzer
Adds word-level timestamps and better transcription
"""

import whisperx
import os
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

def enhance_transcript_with_whisperx(mp3_path, device="cpu", hf_token=None):
    """
    Enhanced transcription using WhisperX instead of regular Whisper
    Returns both transcript and word-level timing data
    """
    if not Path(mp3_path).exists():
        return None, None
    
    try:
        logger.info(f"🎤 Transcribing {mp3_path} with WhisperX...")
        
        # 1. Load WhisperX model - use large-v3 for best Hebrew
        model = whisperx.load_model(
            "large-v3", 
            device, 
            compute_type="int8" if device == "cpu" else "float16",
            language="he"
        )
        
        # 2. Load and transcribe audio
        audio = whisperx.load_audio(mp3_path)
        result = model.transcribe(
            audio, 
            batch_size=16,
            language="he"  # Force Hebrew
        )
        
        # 3. Align for word-level timestamps
        logger.info("🎯 Aligning for word-level timestamps...")
        model_a, metadata = whisperx.load_align_model(
            language_code="he", 
            device=device
        )
        result = whisperx.align(
            result["segments"], 
            model_a, 
            metadata, 
            audio, 
            device,
            return_char_alignments=False
        )
        
        # 4. Optional speaker diarization
        if hf_token and len(result.get("segments", [])) > 1:
            logger.info("👥 Running speaker diarization...")
            diarize_model = whisperx.diarize.DiarizationPipeline(
                use_auth_token=hf_token,
                device=device
            )
            diarize_segments = diarize_model(audio, min_speakers=2, max_speakers=2)
            result = whisperx.assign_word_speakers(diarize_segments, result)
        
        # Extract full transcript
        full_transcript = " ".join([
            seg.get("text", "").strip() 
            for seg in result.get("segments", [])
        ])
        
        logger.info(f"✅ WhisperX transcription completed: '{full_transcript[:50]}...'")
        
        # Return both transcript and full result with word timing
        return full_transcript, result
        
    except Exception as e:
        logger.error(f"❌ WhisperX transcription failed: {e}")
        return None, None

def update_emotion_json_with_whisperx(emotion_json_path, use_whisperx=True, hf_token=None):
    """
    Update existing emotion JSON files with WhisperX transcription
    Adds word-level timestamps to each segment
    """
    if not Path(emotion_json_path).exists():
        logger.error(f"File not found: {emotion_json_path}")
        return False
    
    # Load existing emotion data
    with open(emotion_json_path, 'r', encoding='utf-8') as f:
        emotion_data = json.load(f)
    
    # Get audio directory
    audio_dir = Path(emotion_json_path).parent
    updated_count = 0
    
    for i, segment in enumerate(emotion_data):
        audio_file = audio_dir / segment.get("file", "")
        
        if not audio_file.exists():
            logger.warning(f"Audio file not found: {audio_file}")
            continue
        
        # Transcribe with WhisperX
        transcript, whisperx_result = enhance_transcript_with_whisperx(
            str(audio_file),
            device="cpu",  # Change to "cuda" if you have GPU
            hf_token=hf_token
        )
        
        if transcript and whisperx_result:
            # Update transcript
            segment["transcript"] = transcript
            segment["words"] = transcript
            
            # Add word-level timing data
            word_timestamps = []
            for seg in whisperx_result.get("segments", []):
                for word in seg.get("words", []):
                    word_timestamps.append({
                        "word": word.get("word", ""),
                        "start": word.get("start", 0),
                        "end": word.get("end", 0),
                        "confidence": word.get("score", 1.0)
                    })
            
            segment["word_timestamps"] = word_timestamps
            
            # Update speaker if diarization was run
            if whisperx_result.get("segments") and "speaker" in whisperx_result["segments"][0]:
                speaker_id = whisperx_result["segments"][0].get("speaker", "SPEAKER_00")
                segment["speaker"] = 0 if speaker_id == "SPEAKER_00" else 1
            
            updated_count += 1
            logger.info(f"✅ Updated segment {i+1}: {segment['file']}")
    
    # Save updated data
    output_path = emotion_json_path.replace('.json', '_whisperx.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(emotion_data, f, ensure_ascii=False, indent=2)
    
    logger.info(f"🎉 Updated {updated_count} segments, saved to: {output_path}")
    return True

def compare_transcription_quality(original_json, whisperx_json):
    """Compare transcription quality between original and WhisperX"""
    with open(original_json, 'r', encoding='utf-8') as f:
        original = json.load(f)
    
    with open(whisperx_json, 'r', encoding='utf-8') as f:
        whisperx = json.load(f)
    
    print("\n📊 Transcription Comparison:")
    print("=" * 60)
    
    for i, (orig, wx) in enumerate(zip(original[:5], whisperx[:5])):
        print(f"\n🎵 {orig['file']}:")
        print(f"Original: {orig.get('transcript', 'N/A')[:100]}")
        print(f"WhisperX: {wx.get('transcript', 'N/A')[:100]}")
        
        if 'word_timestamps' in wx:
            print(f"📍 Word timestamps: {len(wx['word_timestamps'])} words with timing")

if __name__ == "__main__":
    # Example: Update an existing emotion JSON with WhisperX
    emotion_file = "conversations/convo1/emotions1.json"
    
    if Path(emotion_file).exists():
        print("🚀 Upgrading transcription with WhisperX...")
        
        # Optional: Add your HuggingFace token for speaker diarization
        # hf_token = "your_token_here"
        hf_token = None
        
        success = update_emotion_json_with_whisperx(
            emotion_file,
            use_whisperx=True,
            hf_token=hf_token
        )
        
        if success:
            # Compare results
            original = emotion_file
            whisperx_version = emotion_file.replace('.json', '_whisperx.json')
            
            if Path(whisperx_version).exists():
                compare_transcription_quality(original, whisperx_version) 