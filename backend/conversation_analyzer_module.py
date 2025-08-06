#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Conversation Analyzer Module
This module provides Hebrew speech-to-text and emotion analysis functionality
that can be integrated into the existing Flask server.
"""

import json
import logging
import os
import tempfile
from datetime import datetime
from pathlib import Path

from flask import request, jsonify

# Configure logging
logger = logging.getLogger(__name__)

# Global variables for models (will be initialized when needed)
whisper_model = None
openai_client = None

def initialize_models():
    """Initialize Whisper and OpenAI models if available"""
    global whisper_model, openai_client
    
    # Initialize Whisper model for Hebrew transcription
    if whisper_model is None:
        try:
            import whisper
            whisper_model = whisper.load_model("base")
            logger.info("✅ Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load Whisper model: {e}")
            whisper_model = False  # Mark as attempted but failed
    
    # Initialize OpenAI client
    if openai_client is None:
        try:
            from openai import OpenAI
            
            # Try to get API key from environment or existing config
            api_key = os.getenv('OPENAI_API_KEY')
            if api_key:
                openai_client = OpenAI(api_key=api_key)
                logger.info("✅ OpenAI client configured with new API format")
            else:
                logger.warning("⚠️ OpenAI API key not found - emotion analysis will use fallback method")
                openai_client = False  # Mark as attempted but failed
                
        except Exception as e:
            logger.error(f"❌ OpenAI configuration error: {e}")
            openai_client = False

# Fallback Hebrew emotion keywords for when main server is unavailable
FALLBACK_EMOTION_KEYWORDS = {
    'שמח': ['שמח', 'שמחה', 'כיף', 'צחוק', 'מהנה', 'נפלא', 'מעולה', 'טוב', 'נהדר'],
    'עצוב': ['עצוב', 'עצב', 'דאגה', 'כואב', 'קשה', 'בכיתי', 'עצבני', 'מדכא'],
    'כועס': ['כועס', 'כעס', 'עצבים', 'מרגיז', 'מתוח', 'זועם', 'נרגז'],
    'רגוע': ['רגוע', 'שלו', 'נינוח', 'נחמד', 'שקט', 'יפה'],
    'מתרגש': ['מרגש', 'מתרגש', 'התרגשתי', 'נפעם', 'מדהים', 'מעניין'],
    'אהבה': ['אהבה', 'אוהב', 'אוהבת', 'חיבה', 'לב', 'חבק'],
    'דאגה': ['דאגה', 'דואג', 'מודאג', 'חושש', 'פחד', 'לחץ'],
    'סקרנות': ['סקרן', 'סקרנות', 'מעניין', 'רוצה לדעת', 'שואל'],
    'הכרת תודה': ['תודה', 'מודה', 'אסיר תודה', 'אסירת תודה'],
    'הפתעה': ['הפתעה', 'מופתע', 'מופתעת', 'לא האמנתי', 'ואו']
}

def transcribe_audio_route():
    """Route function for transcribing Hebrew audio to text using Whisper"""
    try:
        logger.info("🎤 Transcription request received")
        
        # Initialize models if needed
        initialize_models()
        
        # Check model status with detailed logging
        logger.info(f"📊 Whisper model status: {type(whisper_model)}")
        if whisper_model is None:
            logger.error("❌ Whisper model is None - initialization failed")
            return jsonify({'error': 'Whisper model not initialized'}), 500
        elif whisper_model is False:
            logger.error("❌ Whisper model is False - loading failed")
            return jsonify({'error': 'Whisper model failed to load'}), 500
        
        if 'audio' not in request.files:
            logger.warning("⚠️ No audio file in request")
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            logger.warning("⚠️ Empty audio filename")
            return jsonify({'error': 'No audio file selected'}), 400
        
        logger.info(f"📁 Processing audio file: {audio_file.filename}")
        
        # Save audio to temporary file with better error handling
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
                audio_data = audio_file.read()
                logger.info(f"📊 Audio data size: {len(audio_data)} bytes")
                
                # Validate audio data
                if len(audio_data) < 100:  # Too small to be valid audio
                    logger.warning("⚠️ Audio data too small, likely corrupted")
                    return jsonify({'error': 'Audio data too small or corrupted'}), 400
                
                temp_audio.write(audio_data)
                temp_audio.flush()
                temp_audio_path = temp_audio.name
            
            logger.info(f"💾 Audio saved to: {temp_audio_path}")
            
        except Exception as e:
            logger.error(f"❌ Failed to save audio file: {e}")
            return jsonify({'error': f'Failed to save audio: {str(e)}'}), 500
        
        try:
            # Transcribe using Whisper
            logger.info("🎤 Starting Hebrew transcription...")
            result = whisper_model.transcribe(
                temp_audio_path, 
                language='he',  # Hebrew language code
                task='transcribe'
            )
            
            transcribed_text = result['text'].strip()
            logger.info(f"📝 Transcription result: {transcribed_text}")
            
            if not transcribed_text:
                logger.warning("⚠️ Empty transcription result")
                return jsonify({'error': 'Could not transcribe audio'}), 400
            
            logger.info("✅ Transcription successful")
            return jsonify({
                'success': True,
                'transcription': transcribed_text,
                'language': 'he'
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
                logger.info(f"🗑️ Cleaned up temp file: {temp_audio_path}")
                
    except Exception as e:
        logger.error(f"❌ Transcription error: {e}")
        import traceback
        logger.error(f"📍 Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Transcription failed: {str(e)}'}), 500

def analyze_conversation_route():
    """Route function for analyzing conversation text using the exact same system as main application"""
    try:
        # Initialize models if needed
        initialize_models()
        
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({'error': 'Empty text provided'}), 400
        
        logger.info(f"🧠 Analyzing conversation using MAIN SERVER emotion system: {text[:50]}...")
        
        # Use the EXACT SAME emotion analysis system as the main server
        try:
            from backend.ai_analyzer_backend import analyze_single_segment
            from start_server import load_emotions_config
            
            logger.info(f"🎭 Using MAIN SERVER HebrewEmotionAnalyzer for conversation wizard...")
            
            # Call the exact same function used by the main application
            hebrew_analysis = analyze_single_segment(
                transcript=text, 
                use_fast_mode=True,  # Fast mode for real-time conversation
                is_conversation_start=False  # This is ongoing conversation
            )
            
            logger.info(f"✅ Main server analysis complete: {hebrew_analysis}")
            
            # Extract emotions from the analysis result
            detected_emotions = hebrew_analysis.get("emotions", [])
            confidence = hebrew_analysis.get("confidence", 0.5)
            
            # Create response in the format expected by conversation wizard
            ai_analysis = {
                'primary_emotion': detected_emotions[0] if detected_emotions else 'שמחה',
                'emotions_detected': detected_emotions,
                'confidence': confidence,
                'godel_to_regesh': hebrew_analysis.get('voice_intensity', 1.0),
                'summary': f'ניתוח מערכת ראשית - זוהו {len(detected_emotions)} רגשות',
                'analysis_method': 'main_server_hebrew_analyzer',
                'blur': hebrew_analysis.get('blur', 0),
                'shine': hebrew_analysis.get('shine', 0),
                'humor': hebrew_analysis.get('humor', 0),
                'blobiness': hebrew_analysis.get('blobiness', 1.0),
                'proximity': hebrew_analysis.get('proximity', 1.0),
                'auto_blob_spacing': hebrew_analysis.get('auto_blob_spacing', 1.0),
                'detected_patterns': hebrew_analysis.get('detected_patterns', []),
                'raw_scores': hebrew_analysis.get('raw_scores', {})
            }
            logger.info(f"🎭 Converted to wizard format: emotions={detected_emotions}, confidence={confidence}")
            
            # Load emotions configuration for camera settings
            emotions_data = load_emotions_config()
            logger.info(f"📊 Loaded emotions config: {len(emotions_data.get('config', {}))} emotions")
            
            # Extract emotions and create camera settings
            detected_emotions = ai_analysis.get("emotions_detected", [])
            primary_emotion = ai_analysis.get("primary_emotion", detected_emotions[0] if detected_emotions else "שמחה")
            
            # Create live webcam settings with FULL effects
            camera_settings = create_live_webcam_settings(primary_emotion, detected_emotions, emotions_data, ai_analysis)
            
            result = {
                'success': True,
                'emotion': primary_emotion,
                'emotions_detected': detected_emotions,
                'confidence': ai_analysis.get('confidence', 0.8),
                'intensity': ai_analysis.get('godel_to_regesh', 1.5),
                'camera_settings': camera_settings,
                'analysis_method': 'main_server_hebrew_analyzer',
                'timestamp': datetime.now().isoformat(),
                'full_analysis': ai_analysis  # Include full analysis for debugging
            }
            
            logger.info(f"✅ Analysis complete: {primary_emotion} + {len(detected_emotions)} emotions")
            logger.info(f"🎭 Camera settings: {camera_settings}")
            return jsonify(result)
                
        except ImportError as e:
            logger.error(f"❌ Failed to import main server client: {e}")
            # Ultimate fallback
            emotion_analysis = analyze_with_keywords(text)
            camera_settings = create_simple_live_settings(emotion_analysis['emotion'])
        except Exception as e:
            logger.error(f"❌ Main server analysis failed: {e}")
            # Ultimate fallback
            emotion_analysis = analyze_with_keywords(text)
            camera_settings = create_simple_live_settings(emotion_analysis['emotion'])
            
            result = {
                'success': True,
                'emotion': emotion_analysis['emotion'],
                'emotions_detected': [emotion_analysis['emotion']],
                'confidence': emotion_analysis['confidence'],
                'intensity': emotion_analysis['intensity'],
                'camera_settings': camera_settings,
                'analysis_method': 'fallback',
                'timestamp': datetime.now().isoformat()
            }
            
            return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ Analysis error: {e}")
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

def analyze_with_openai(text):
    """Analyze emotion using OpenAI API"""
    try:
        prompt = f"""
        נתח את הטקסט הבא ותן לי את הרגש העיקרי:
        
        "{text}"
        
        החזר תשובה בפורמט JSON עם הפרטים הבאים:
        {{
            "emotion": "רגש עיקרי בעברית",
            "confidence": מספר בין 0 ל-1,
            "intensity": מספר בין 1 ל-10,
            "explanation": "הסבר קצר"
        }}
        
        רגשות אפשריים: שמח, עצוב, כועס, רגוע, מתרגש, אהבה, פחד, הפתעה, גאווה, אכזבה
        """
        
        # Use the new OpenAI API format (v1.0+)
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "אתה מנתח רגשות מקצועי הכותב בעברית."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            temperature=0.3
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Try to extract JSON from the response
        import re
        json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            result['method'] = 'openai'
            return result
        else:
            raise ValueError("No valid JSON in OpenAI response")
            
    except Exception as e:
        logger.error(f"OpenAI analysis failed: {e}")
        raise

def analyze_with_keywords(text):
    """Fallback emotion analysis using Hebrew keywords"""
    text_lower = text.lower()
    emotion_scores = {}
    
    # Calculate scores for each emotion
    for emotion, keywords in FALLBACK_EMOTION_KEYWORDS.items():
        score = 0
        matches = []
        
        for keyword in keywords:
            if keyword in text_lower:
                score += 1
                matches.append(keyword)
        
        if score > 0:
            emotion_scores[emotion] = {
                'score': score,
                'matches': matches
            }
    
    if not emotion_scores:
        # Default to neutral/calm
        return {
            'emotion': 'רגוע',
            'confidence': 0.5,
            'intensity': 1.5,
            'method': 'keyword_fallback'
        }
    
    # Find the emotion with highest score
    best_emotion = max(emotion_scores.keys(), key=lambda e: emotion_scores[e]['score'])
    best_score = emotion_scores[best_emotion]['score']
    
    # Calculate confidence and intensity (similar to main server format)
    total_words = len(text_lower.split())
    confidence = min(best_score / max(total_words * 0.1, 1), 1.0)
    intensity = min(1.0 + best_score * 0.3, 3.0)  # Scale 1.0-3.0 like main server
    
    return {
        'emotion': best_emotion,
        'confidence': confidence,
        'intensity': intensity,
        'matches': emotion_scores[best_emotion]['matches'],
        'method': 'keyword'
    }

def create_live_webcam_settings(primary_emotion, detected_emotions, emotions_data, ai_analysis):
    """Create live webcam settings based on emotion analysis with FULL visual effects"""
    try:
        # Get the main emotion's configuration
        emotion_config = None
        if emotions_data and 'config' in emotions_data:
            # Find the emotion configuration by Hebrew name
            for eng_key, config in emotions_data['config'].items():
                if config.get('hebrew') == primary_emotion and config.get('active', True):
                    emotion_config = config
                    break
        
        # Default live webcam settings with ALL effects enabled
        base_settings = {
            'brightness': 0,
            'contrast': 120,
            'charSet': 'standard',
            'colorMode': 'original',
            'resolution': 8,
            'blobEffect': True,  # ENABLE blob effects for live cam
            'mirrorMode': True,
            'invertMode': False,
            'showHumor': True,   # Enable humor effects
            'emotionBlobs': True,  # Enable emotion blobs
            'dynamicEffects': True,  # Enable dynamic visual effects
            'glowEffect': True,  # Enable glow/shine effects
            'particleEffects': True  # Enable particle effects
        }
        
        if emotion_config:
            # Apply emotion-specific adjustments for live camera
            color = emotion_config.get('color', '#777777')
            
            # Convert emotion intensity to camera parameters
            intensity = ai_analysis.get('godel_to_regesh', 1.5)
            
            # Brightness based on emotion (subtle adjustments for live cam)
            if 'שמח' in primary_emotion or 'התרגשות' in primary_emotion:
                base_settings['brightness'] = min(30, int(intensity * 15))
                base_settings['contrast'] = min(150, int(120 + intensity * 10))
            elif 'עצב' in primary_emotion or 'דאגה' in primary_emotion:
                base_settings['brightness'] = max(-20, int(-intensity * 10))
                base_settings['contrast'] = max(80, int(120 - intensity * 15))
            elif 'כעס' in primary_emotion or 'זעם' in primary_emotion:
                base_settings['brightness'] = int(intensity * 5)
                base_settings['contrast'] = min(160, int(120 + intensity * 20))
            
            # Character set based on emotion type
            if len(detected_emotions) > 2:
                base_settings['charSet'] = 'standard'  # Complex emotions
            elif 'אהבה' in primary_emotion or 'חיבה' in primary_emotion:
                base_settings['charSet'] = 'hearts'
            elif 'עצב' in primary_emotion:
                base_settings['charSet'] = 'dots'
            elif intensity > 2.0:
                base_settings['charSet'] = 'blocks'  # High intensity
            else:
                base_settings['charSet'] = 'minimal'  # Calm
            
            # Resolution based on intensity
            base_settings['resolution'] = max(4, min(12, int(8 + (2.0 - intensity) * 2)))
            
            # Color mode from emotion color
            base_settings['emotionColor'] = color
            base_settings['colorMode'] = 'emotion'  # Use emotion color
            
        return base_settings
        
    except Exception as e:
        logger.error(f"❌ Error creating live webcam settings: {e}")
        # Return safe defaults
        return {
            'brightness': 0,
            'contrast': 120,
            'charSet': 'standard',
            'colorMode': 'original',
            'resolution': 8,
            'blobEffect': False,
            'mirrorMode': True,
            'invertMode': False
        }

def create_simple_live_settings(emotion):
    """Create simple live camera settings for fallback emotions"""
    simple_mapping = {
        'שמח': {'brightness': 20, 'contrast': 140, 'charSet': 'hearts', 'resolution': 6},
        'עצוב': {'brightness': -10, 'contrast': 80, 'charSet': 'dots', 'resolution': 10},
        'כועס': {'brightness': 10, 'contrast': 160, 'charSet': 'blocks', 'resolution': 4},
        'רגוע': {'brightness': 5, 'contrast': 100, 'charSet': 'minimal', 'resolution': 8},
        'מתרגש': {'brightness': 15, 'contrast': 130, 'charSet': 'matrix', 'resolution': 5}
    }
    
    settings = simple_mapping.get(emotion, simple_mapping['רגוע'])
    settings.update({
        'colorMode': 'original',
        'blobEffect': False,  # No blob effects for live cam
        'mirrorMode': True,
        'invertMode': False
    })
    
    return settings

def conversation_analyzer_health():
    """Health check for conversation analyzer functionality"""
    initialize_models()
    
    # Check if main server functions are available
    main_server_available = False
    try:
        from start_server import load_emotions_config
        emotions_data = load_emotions_config()
        main_server_available = bool(emotions_data and 'config' in emotions_data)
    except Exception as e:
        logger.warning(f"Main server functions not available: {e}")
    
    # For conversation wizard, we use keyword analysis to avoid OpenAI conflicts
    openai_available = False  # We intentionally don't use OpenAI for the wizard
    
    return jsonify({
        'status': 'healthy',
        'whisper_available': whisper_model is not None and whisper_model is not False,
        'openai_available': openai_available,
        'main_server_emotions': main_server_available,
        'emotions_count': len(emotions_data.get('config', {})) if main_server_available else 0,
        'timestamp': datetime.now().isoformat()
    })

def register_conversation_analyzer_routes(app):
    """Register conversation analyzer routes with the Flask app"""
    
    # Initialize models when routes are registered
    logger.info("🔄 Initializing models during route registration...")
    initialize_models()
    
    @app.route('/api/conversation-wizard/transcribe-audio', methods=['POST'])
    def transcribe_audio():
        return transcribe_audio_route()
    
    @app.route('/api/conversation-wizard/analyze-conversation', methods=['POST'])
    def analyze_conversation():
        return analyze_conversation_route()
    
    @app.route('/api/conversation-wizard/health', methods=['GET'])
    def health():
        return conversation_analyzer_health()
    
    logger.info("✅ Conversation analyzer routes registered:")
    logger.info("   - /api/conversation-wizard/transcribe-audio")
    logger.info("   - /api/conversation-wizard/analyze-conversation") 
    logger.info("   - /api/conversation-wizard/health") 