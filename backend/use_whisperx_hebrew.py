#!/usr/bin/env python3
"""
Use WhisperX for Hebrew transcription with word-level timestamps
Perfect for emotion analysis where precise timing matters
"""

import whisperx
import json
import os
from pathlib import Path

def transcribe_hebrew_with_whisperx(audio_path, device="cpu", hf_token=None):
    """
    Transcribe Hebrew audio using WhisperX with word-level timestamps
    
    Args:
        audio_path: Path to audio file
        device: "cuda" for GPU or "cpu"
        hf_token: HuggingFace token for speaker diarization (optional)
    """
    print(f"🎤 Transcribing {audio_path} with WhisperX...")
    
    # 1. Load model
    model = whisperx.load_model("large-v3", device, 
                               compute_type="int8",  # Use int8 for CPU
                               language="he")  # Hebrew
    
    # 2. Load audio
    audio = whisperx.load_audio(audio_path)
    
    # 3. Transcribe with VAD filter (reduces hallucination)
    result = model.transcribe(audio, batch_size=16)
    
    print(f"📝 Initial transcript: {result['segments'][0]['text'][:100]}...")
    
    # 4. Align for word-level timestamps
    print("🎯 Aligning for word-level timestamps...")
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
    
    # 5. Optional: Speaker diarization
    if hf_token:
        print("👥 Running speaker diarization...")
        diarize_model = whisperx.diarize.DiarizationPipeline(
            use_auth_token=hf_token, 
            device=device
        )
        diarize_segments = diarize_model(audio, min_speakers=2, max_speakers=2)
        result = whisperx.assign_word_speakers(diarize_segments, result)
    
    return result

def extract_word_timestamps(whisperx_result):
    """Extract word-level timestamps from WhisperX result"""
    words_data = []
    
    for segment in whisperx_result.get("segments", []):
        # Segment level data
        segment_speaker = segment.get("speaker", "SPEAKER_00")
        
        # Word level data
        for word_info in segment.get("words", []):
            words_data.append({
                "word": word_info.get("word", ""),
                "start": word_info.get("start", 0),
                "end": word_info.get("end", 0),
                "confidence": word_info.get("score", 1.0),
                "speaker": segment_speaker
            })
    
    return words_data

def create_emotion_segments_with_whisperx(audio_dir, output_file):
    """
    Create emotion segments from WhisperX transcription
    Compatible with your visualization system
    """
    segments = []
    
    # Process each MP3 file
    mp3_files = sorted(Path(audio_dir).glob("*.mp3"))
    
    for mp3_file in mp3_files:
        print(f"\n🎵 Processing {mp3_file.name}...")
        
        # Transcribe with WhisperX
        result = transcribe_hebrew_with_whisperx(str(mp3_file))
        
        # Extract full transcript
        full_text = " ".join([seg["text"] for seg in result.get("segments", [])])
        
        # Get word timestamps
        words_data = extract_word_timestamps(result)
        
        # Determine speaker (0 or 1)
        speaker = 0  # Default
        if words_data and "speaker" in words_data[0]:
            # Map SPEAKER_00 -> 0, SPEAKER_01 -> 1
            speaker_id = words_data[0]["speaker"]
            speaker = 0 if speaker_id == "SPEAKER_00" else 1
        
        # Create segment compatible with your format
        segment = {
            "file": mp3_file.name,
            "speaker": speaker,
            "transcript": full_text,
            "words": full_text,  # For compatibility
            "word_timestamps": words_data,  # New: detailed word timing
            
            # Emotion defaults (to be filled by AI)
            "happiness": 0,
            "sadness": 0,
            "anger": 0,
            "fear": 0,
            "surprise": 0,
            "disgust": 0,
            "neutral": 1
        }
        
        segments.append(segment)
    
    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(segments, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Created {output_file} with {len(segments)} segments")

# Example usage
if __name__ == "__main__":
    # Example 1: Single file transcription
    audio_file = "conversations/convo1/001.mp3"
    if Path(audio_file).exists():
        result = transcribe_hebrew_with_whisperx(audio_file)
        
        # Show word-level timestamps
        words = extract_word_timestamps(result)
        print("\n📊 Word-level timestamps:")
        for word in words[:10]:  # First 10 words
            print(f"{word['start']:.3f}s - {word['end']:.3f}s: {word['word']}")
    
    # Example 2: Create emotion segments for a conversation
    # create_emotion_segments_with_whisperx(
    #     "conversations/convo3", 
    #     "conversations/convo3/emotions3_whisperx.json"
    # )
    
    print("""
    🎯 WhisperX Advantages for Hebrew:
    
    1. Word-level timestamps (not just sentences)
    2. VAD reduces hallucinations
    3. Speaker diarization (with HF token)
    4. 70x faster than real-time
    5. Better handling of silence
    
    💡 To enable speaker diarization:
    1. Get HF token from https://huggingface.co/settings/tokens
    2. Accept terms at:
       - https://huggingface.co/pyannote/segmentation
       - https://huggingface.co/pyannote/speaker-diarization-3.1
    3. Pass token to function: hf_token="your_token_here"
    """) 