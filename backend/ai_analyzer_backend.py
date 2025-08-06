#!/usr/bin/env python3
"""
AI Analyzer Backend for Hebrew Emotion Analysis
Uses enhanced_analysis_config.json patterns to analyze Hebrew transcripts
"""

import json
import re
import os
from typing import Dict, List, Tuple, Any
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HebrewEmotionAnalyzer:
    def __init__(self):
        self.config = None
        self.patterns_cache = {}
        self.load_config()
        
    def load_config(self):
        """Load the enhanced analysis configuration"""
        try:
            # Try current directory first, then parent directory
            config_path = 'enhanced_analysis_config.json'
            if not os.path.exists(config_path):
                config_path = os.path.join('config', 'enhanced_analysis_config.json')
            if not os.path.exists(config_path):
                config_path = os.path.join('..', 'config', 'enhanced_analysis_config.json')
            with open(config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
            
            # Compile regex patterns for better performance
            self._compile_patterns()
            logger.info("✅ Hebrew analysis configuration loaded successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to load config: {e}")
            # Fallback to basic emotions
            self.config = {
                "hebrew_patterns": {
                    "humor_indicators": {"words": ["חח", "מצחיק"], "weight": 1.0},
                    "agreement_indicators": {"words": ["כן", "נכון"], "weight": 1.0},
                    "disagreement_indicators": {"words": ["לא", "אבל"], "weight": 1.0}
                }
            }
    
    def _compile_patterns(self):
        """Pre-compile regex patterns for better performance"""
        if not self.config:
            return
            
        for category, config_data in self.config.get('hebrew_patterns', {}).items():
            if 'patterns' in config_data:
                compiled_patterns = []
                for pattern in config_data['patterns']:
                    try:
                        compiled_patterns.append(re.compile(pattern, re.IGNORECASE | re.UNICODE))
                    except re.error as e:
                        logger.warning(f"Invalid regex pattern '{pattern}' in {category}: {e}")
                
                self.patterns_cache[category] = compiled_patterns

    def analyze_single_segment(self, transcript: str, use_fast_mode: bool = True, is_conversation_start: bool = False) -> Dict[str, Any]:
        """
        Analyze a single Hebrew transcript segment
        
        Args:
            transcript: Hebrew text to analyze
            use_fast_mode: Whether to use fast analysis (pattern matching only)
            is_conversation_start: Whether this is the start of a conversation
            
        Returns:
            Dictionary with emotion analysis results
        """
        if not transcript or not transcript.strip():
            return {
                "emotions": ["שתיקה"],  # 🚫 NEVER NEUTRAL: Use silence emotion instead
                "confidence": 0.5,
                "blur": 0,
                "shine": 0,
                "humor": 0,
                "voice_intensity": 1.0,
                "analysis_method": "empty_text",
                "detected_patterns": []
            }
        
        # Clean and normalize text
        text = transcript.strip()
        
        # Analyze using Hebrew patterns
        emotion_scores = {}
        detected_patterns = []
        voice_intensity = 1.0
        
        # Analyze each emotion category
        hebrew_patterns = self.config.get('hebrew_patterns', {}) if self.config else {}
        for category, config_data in hebrew_patterns.items():
            score = self._analyze_category(text, category, config_data)
            if score > 0:
                emotion_scores[category] = score
                detected_patterns.append(category)
        
        # Special handling for voice intensity indicators
        if 'voice_intensity_indicators' in emotion_scores:
            voice_intensity = min(3.0, 1.0 + emotion_scores['voice_intensity_indicators'])
        
        # Map categories to emotions
        emotions = self._map_categories_to_emotions(emotion_scores)
        
        # Calculate derived metrics
        blur = self._calculate_blur(emotion_scores, text)
        shine = self._calculate_shine(emotion_scores, text) 
        humor = self._calculate_humor(emotion_scores, text)
        
        # Calculate overall confidence
        confidence = self._calculate_confidence(emotion_scores, text)
        
        # Calculate advanced metrics
        blobiness = self._calculate_blobiness(emotion_scores, text, emotions)
        proximity = self._calculate_proximity(emotion_scores, text)
        
        # NEW: Calculate automatic blob spacing based on conversation dynamics
        auto_spacing = self.calculate_auto_blob_spacing(emotion_scores, text, is_conversation_start=is_conversation_start)
        
        # 🚫 NEVER NEUTRAL: Force emotions if none detected
        if not emotions:
            # Force emotions based on text characteristics
            forced_emotions = []
            text_lower = text.lower()
            
            # Basic pattern forcing
            if '?' in text:
                forced_emotions.append('סקרנות')
            elif '!' in text:
                forced_emotions.append('התרגשות')
            elif len(text) < 10:
                forced_emotions.append('חיבה')
            else:
                forced_emotions.append('שמחה')
                
            emotions = forced_emotions
            print(f"🚨 HEBREW ANALYZER FORCING: No emotions detected, forced {emotions} for text: '{text[:30]}...'")
        
        return {
            "emotions": emotions,  # ✅ GUARANTEED NON-NEUTRAL
            "confidence": confidence,
            "blur": blur,
            "shine": shine, 
            "humor": humor,
            "voice_intensity": voice_intensity,
            "blobiness": blobiness,
            "proximity": proximity,
            "auto_blob_spacing": auto_spacing,  # NEW: AI-determined spacing
            "analysis_method": "hebrew_patterns",
            "detected_patterns": detected_patterns,
            "raw_scores": emotion_scores
        }
    
    def _analyze_category(self, text:  str, category: str, config_data) -> float:
        """Analyze text for a specific emotion category"""
        score = 0.0
        
        # Handle case where config_data might be a list instead of dict
        if isinstance(config_data, list):
            logger.warning(f"Category '{category}' has list config instead of dict, skipping")
            return 0.0
        
        if not isinstance(config_data, dict):
            logger.warning(f"Category '{category}' has invalid config type: {type(config_data)}, skipping")
            return 0.0
            
        weight = config_data.get('weight', 1.0)
        
        # Check words
        for word in config_data.get('words', []):
            if word.lower() in text.lower():
                score += weight
        
        # Check phrases  
        for phrase in config_data.get('phrases', []):
            if phrase.lower() in text.lower():
                score += weight * 1.2  # Phrases get higher weight
        
        # Check regex patterns
        if category in self.patterns_cache:
            for pattern in self.patterns_cache[category]:
                matches = pattern.findall(text)
                score += len(matches) * weight * 0.8
        
        return score
    
    def _map_categories_to_emotions(self, emotion_scores: Dict[str, float]) -> List[str]:
        """Map detected categories to final emotion labels"""
        emotions = []
        
        # Emotion mapping rules - HEBREW ONLY (matching emotions_config.json)
        emotion_mapping = {
            'humor_indicators': 'שעשוע',
            'happiness_indicators': 'שמחה', 
            'joy_indicators': 'שמחה',
            'sadness_indicators': 'עצב',
            'anger_indicators': 'כעס',
            'fear_indicators': 'פחד',
            'surprise_indicators': 'הפתעה',
            'curiosity_indicators': 'סקרנות',
            'disgust_indicators': 'גועל',
            'frustration_indicators': 'תסכול',
            'excitement_indicators': 'התרגשות',
            'love_indicators': 'אהבה',
            'anxiety_indicators': 'חרדה',
            'hope_indicators': 'תקווה',
            'pride_indicators': 'גאווה',
            'admiration_indicators': 'הערצה',
            'amusement_indicators': 'שעשוע',
            'annoyance_indicators': 'עצבנות',
            'approval_indicators': 'אישור',
            'awe_indicators': 'יראת כבוד',
            'caring_indicators': 'דאגה'
        }
        
        # Find top scoring emotions
        sorted_scores = sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True)
        
        for category, score in sorted_scores:
            if score > 0.5:  # Threshold for inclusion
                if category in emotion_mapping:
                    emotion = emotion_mapping[category]
                    if emotion not in emotions:
                        emotions.append(emotion)
        
        # Handle special cases - HEBREW ONLY
        if 'agreement_indicators' in emotion_scores and emotion_scores['agreement_indicators'] > 1.0:
            if 'אישור' not in emotions:
                emotions.append('אישור')
                
        if 'disagreement_indicators' in emotion_scores and emotion_scores['disagreement_indicators'] > 1.0:
            if 'עצבנות' not in emotions:
                emotions.append('עצבנות')
        
        return emotions[:3]  # Limit to top 3 emotions
    
    def _calculate_blur(self, emotion_scores: Dict[str, float], text: str) -> int:
        """Calculate blur level (0-12) based on speech clarity and voice shakiness"""
        blur_score = emotion_scores.get('blur_indicators', 0)
        
        # Strong blur indicators for unclear speech
        unclear_patterns = ['אמ...', 'אה...', 'לא הבנתי', 'מה?', 'הא?']
        for pattern in unclear_patterns:
            blur_score += text.count(pattern) * 1.5
        
        # Voice shakiness indicators (repetitive sounds)
        blur_score += text.count('אממ') * 1.0
        blur_score += text.count('אההה') * 1.0
        
        # Only add light blur for multiple question marks (uncertainty)
        blur_score += text.count('??') * 0.8
        blur_score += text.count('???') * 1.0
        
        return min(12, int(blur_score))
    
    def _calculate_shine(self, emotion_scores: Dict[str, float], text: str) -> int:
        """Calculate shine level (0-10) based on important content and significance"""
        shine_score = 0
        
        # Important content indicators
        important_words = ['חשוב', 'משמעותי', 'מכריע', 'הכרזה', 'החלטה', 'הודעה']
        for word in important_words:
            if word in text.lower():
                shine_score += 2.0
        
        # Strong emotional expressions (not just positive)
        strong_emotions = ['pride_indicators', 'admiration_indicators', 'excitement_indicators']
        for emotion in strong_emotions:
            shine_score += emotion_scores.get(emotion, 0) * 0.6
            
        # Multiple exclamation marks indicate emphasis/importance
        shine_score += text.count('!!') * 0.8
        shine_score += text.count('!!!') * 1.2
        
        # Achievement or significant moment indicators
        achievement_words = ['הצלחתי', 'ניצחתי', 'השגתי', 'גאה']
        for word in achievement_words:
            if word in text.lower():
                shine_score += 1.5
        
        return min(10, int(shine_score))
    
    def _calculate_humor(self, emotion_scores: Dict[str, float], text: str) -> int:
        """Calculate humor level (0-10) - more selective approach"""
        humor_score = 0
        
        # Only count strong humor indicators
        strong_humor_words = ['מצחיק', 'קורע', 'בדיחה', 'קומדיה', 'צחקתי']
        for word in strong_humor_words:
            if word in text.lower():
                humor_score += 1.5
        
        # Count multiple consecutive laughter indicators (not just single ones)
        humor_score += text.lower().count('חחח') * 1.0  # Only 3+ laughs
        humor_score += text.lower().count('חחחח') * 1.5  # Even more laughs
        
        # Only count if there's actual humor context, not just positive emotions
        if humor_score > 0:
            humor_score += emotion_scores.get('humor_indicators', 0) * 0.5
            humor_score += emotion_scores.get('amusement_indicators', 0) * 0.3
        
        return min(10, int(humor_score))
    
    def _calculate_confidence(self, emotion_scores: Dict[str, float], text: str) -> float:
        """Calculate analysis confidence (0.0-1.0)"""
        if not emotion_scores:
            return 0.3  # Low confidence for no matches
            
        # Higher confidence with more pattern matches
        total_score = sum(emotion_scores.values())
        text_length = len(text.split())
        
        # Normalize by text length
        normalized_score = total_score / max(1, text_length * 0.1)
        
        return min(1.0, max(0.1, normalized_score / 5.0))
    
    def _calculate_blobiness(self, emotion_scores: Dict[str, float], text: str, emotions: List[str]) -> int:
        """Calculate blobiness (1-10) based on conversation depth and emotional intensity - ENHANCED PRECISION"""
        blobiness_score = 1.0  # Lower base score for more precision
        
        # TIER 1: EXISTENTIAL & PHILOSOPHICAL DEPTH (High Impact)
        existential_themes = [
            'מה המשמעות', 'למה אני כאן', 'מה התכלית', 'מה הנקודה', 'איך זה יגמר',
            'מה קורה אחרי המוות', 'יש אלוהים', 'מה זה אושר', 'מה זה אהבה אמיתית',
            'פילוסופיה', 'משמעות החיים', 'תכלית הקיום', 'רוחניות עמוקה'
        ]
        
        # TIER 2: DEEP PERSONAL STRUGGLES (High Impact)
        personal_struggles = [
            'אני סובל', 'כל כך קשה לי', 'אני נשבר', 'לא יכול יותר', 'איבדתי הכל',
            'הכי קשה בחיים', 'רוצה למות', 'אין לי כוח', 'הכל נגמר', 'אין תקווה',
            'דיכאון', 'חרדה קשה', 'התמכרות', 'בעיות משפחתיות קשות', 'גירושים'
        ]
        
        # TIER 3: EMOTIONAL VULNERABILITY & INTROSPECTION (Medium-High Impact)
        emotional_vulnerability = [
            'אני פחד', 'לא בטוח בעצמי', 'מה אני עושה עם החיים', 'איך להתמודד',
            'מרגיש לבד', 'אין לי מישהו', 'קשה לי לבטוח', 'פוחד מהעתיד',
            'לא יודע מה לעשות', 'מבולבל מהחיים', 'איך לבחור', 'מה נכון',
            'בושה', 'אשמה', 'חרטה', 'פחד מכישלון', 'פחד מדחייה'
        ]
        
        # TIER 4: LIFE TRANSITIONS & MAJOR DECISIONS (Medium Impact)
        life_transitions = [
            'נישואים', 'הורות', 'קריירה', 'מעבר דירה', 'שינוי גדול בחיים',
            'בחירת מקצוע', 'צבא', 'לימודים', 'פרישה', 'גיל מבוגר',
            'אובדן', 'פרידה', 'יציאה מהבית', 'עצמאות', 'אחריות'
        ]
        
        # TIER 5: RELATIONSHIPS & INTIMACY (Medium Impact)
        relationship_depth = [
            'אהבה עמוקה', 'קשר רומנטי', 'זוגיות', 'ידידות אמיתית',
            'משפחה', 'הורים', 'ילדים', 'אמון', 'בגידה', 'סליחה',
            'קרבה רגשית', 'חיבור', 'הבנה הדדית', 'תמיכה', 'דאגה'
        ]
        
        # Calculate scores for each tier with different weights
        existential_score = sum(3.0 for theme in existential_themes if theme in text.lower())
        struggle_score = sum(2.5 for struggle in personal_struggles if struggle in text.lower())
        vulnerability_score = sum(2.0 for vuln in emotional_vulnerability if vuln in text.lower())
        transition_score = sum(1.5 for trans in life_transitions if trans in text.lower())
        relationship_score = sum(1.2 for rel in relationship_depth if rel in text.lower())
        
        # EMOTIONAL INTENSITY ANALYSIS
        intense_emotions = ['anger', 'sadness', 'fear', 'grief', 'anxiety', 'love', 'ecstasy', 'despair']
        emotional_intensity = sum(2.0 for emotion in emotions if emotion in intense_emotions)
        
        # LINGUISTIC COMPLEXITY INDICATORS
        complex_patterns = 0
        if '...' in text or '…' in text:  # Hesitation/deep thought
            complex_patterns += 1.0
        if len([w for w in text.split() if len(w) > 8]) > 2:  # Complex vocabulary
            complex_patterns += 1.0
        if text.count('?') > 1:  # Multiple questions suggest introspection
            complex_patterns += 1.5
        
        # SMALL TALK PENALTY (More Precise)
        small_talk_phrases = [
            'מה שלומך', 'איך הולך', 'מזג אוויר', 'חם היום', 'קר היום',
            'בוקר טוב', 'לילה טוב', 'שבת שלום', 'איך היה', 'מה חדש',
            'מה אכלת', 'איך העבודה', 'מה התוכניות', 'כמה השעה'
        ]
        
        small_talk_penalty = sum(3.0 for phrase in small_talk_phrases if phrase in text.lower())
        
        # CALCULATE FINAL SCORE WITH PRECISION
        total_depth_score = (existential_score + struggle_score + vulnerability_score + 
                           transition_score + relationship_score + emotional_intensity + complex_patterns)
        
        if small_talk_penalty > 0:
            # Significant penalty for small talk
            blobiness_score = max(1.0, 2.0 - small_talk_penalty)
        elif total_depth_score >= 8.0:
            # Very deep conversation (8-10)
            blobiness_score = min(10.0, 7.0 + total_depth_score * 0.3)
        elif total_depth_score >= 5.0:
            # Moderately deep conversation (6-7)
            blobiness_score = 5.0 + total_depth_score * 0.4
        elif total_depth_score >= 2.0:
            # Some depth (3-5)
            blobiness_score = 2.0 + total_depth_score * 0.5
        else:
            # Shallow conversation (1-3)
            blobiness_score = 1.0 + len(emotions) * 0.3
        
        # Final validation and rounding
        final_score = min(10, max(1, int(round(blobiness_score))))
        
        # Debug logging for precision validation
        if existential_score > 0 or struggle_score > 0 or vulnerability_score > 0:
            print(f"🧠 DEEP ANALYSIS: existential:{existential_score}, struggle:{struggle_score}, vulnerability:{vulnerability_score} → blobiness:{final_score}")
        
        return final_score
    
    def _calculate_proximity(self, emotion_scores: Dict[str, float], text: str) -> str:
        """Calculate proximity based on agreement/disagreement indicators"""
        agreement_score = emotion_scores.get('agreement_indicators', 0)
        disagreement_score = emotion_scores.get('disagreement_indicators', 0)
        
        # Strong agreement words
        strong_agreement = ['מסכים', 'בדיוק', 'נכון מאוד', 'אתה צודק', 'את צודקת']
        for phrase in strong_agreement:
            if phrase in text.lower():
                agreement_score += 2.0
        
        # Strong disagreement words  
        strong_disagreement = ['לא מסכים', 'אתה טועה', 'את טועה', 'זה לא נכון', 'ממש לא']
        for phrase in strong_disagreement:
            if phrase in text.lower():
                disagreement_score += 2.0
        
        # Calculate proximity based on agreement vs disagreement
        net_agreement = agreement_score - disagreement_score
        
        # Map to new simplified spacing presets
        if net_agreement >= 2.0:
            return "together"  # High mutual understanding and agreement
        elif net_agreement >= -0.5:
            return "close"    # Acceptance and good conversation
        else:
            return "far away" # Disagreement or general conversation
    
    def calculate_auto_blob_spacing(self, emotion_scores: Dict[str, float], text: str, is_conversation_start: bool = False) -> str:
        """Calculate automatic blob spacing based on conversation dynamics and AI analysis"""
        
        # If it's the start of conversation, default to far away
        if is_conversation_start:
            return "far away"
        
        agreement_score = emotion_scores.get('agreement_indicators', 0)
        disagreement_score = emotion_scores.get('disagreement_indicators', 0)
        approval_score = emotion_scores.get('approval_indicators', 0)
        
        # Check for mutual understanding indicators
        mutual_understanding_phrases = [
            'אני מבין', 'אני מבינה', 'הבנתי', 'ברור לי', 'אתה צודק', 'את צודקת',
            'בדיוק', 'נכון מאוד', 'מסכים לחלוטין', 'מסכימה לחלוטין'
        ]
        
        # Check for acceptance indicators
        acceptance_phrases = [
            'אוקיי', 'בסדר', 'יפה', 'טוב', 'מעולה', 'נהדר', 'כן', 'נכון'
        ]
        
        # Check for general/opening conversation indicators
        general_conversation_phrases = [
            'מה שלומך', 'איך אתה', 'איך את', 'בוקר טוב', 'שלום', 'מה חדש',
            'איך הולך', 'מה העניינים', 'כמה זמן'
        ]
        
        # Count indicators
        mutual_understanding_count = sum(1 for phrase in mutual_understanding_phrases if phrase in text.lower())
        acceptance_count = sum(1 for phrase in acceptance_phrases if phrase in text.lower())
        general_conversation_count = sum(1 for phrase in general_conversation_phrases if phrase in text.lower())
        
        # Calculate final spacing based on conversation dynamics
        net_agreement = agreement_score - disagreement_score + approval_score
        
        # Together: High mutual understanding and agreement
        if mutual_understanding_count >= 1 and net_agreement >= 1.5:
            return "together"
        
        # Close: Acceptance and good conversation flow
        elif acceptance_count >= 1 or net_agreement >= 0.5:
            return "close"
        
        # Far away: General conversation, disagreement, or start of conversation
        elif general_conversation_count >= 1 or net_agreement < -0.5 or disagreement_score > 0:
            return "far away"
        
        # Default to close for neutral content
        else:
            return "close"

# Global analyzer instance
_analyzer = None

def get_analyzer() -> HebrewEmotionAnalyzer:
    """Get the global analyzer instance"""
    global _analyzer
    if _analyzer is None:
        _analyzer = HebrewEmotionAnalyzer()
    return _analyzer

def analyze_single_segment(transcript: str, use_fast_mode: bool = True, is_conversation_start: bool = False) -> Dict[str, Any]:
    """
    Public API function to analyze a single segment
    """
    analyzer = get_analyzer()
    return analyzer.analyze_single_segment(transcript, use_fast_mode)

def get_cache_stats() -> Dict[str, Any]:
    """Get cache and performance statistics"""
    analyzer = get_analyzer()
    return {
        "patterns_cached": len(analyzer.patterns_cache),
        "config_loaded": analyzer.config is not None,
        "categories_available": len(analyzer.config.get('hebrew_patterns', {})) if analyzer.config else 0,
        "last_updated": datetime.now().isoformat()
    }

if __name__ == "__main__":
    # Test the analyzer
    analyzer = HebrewEmotionAnalyzer()
    
    test_cases = [
        "שלום! מה שלומך היום?",
        "אני כל כך שמח! איזה יום נפלא!",
        "זה מעצבן אותי ממש",
        "לא הבנתי מה אמרת... מה?",
        "חחח איזה מצחיק!"
    ]
    
    for text in test_cases:
        result = analyzer.analyze_single_segment(text)
        print(f"\nText: {text}")
        print(f"Emotions: {result['emotions']}")
        print(f"Confidence: {result['confidence']:.2f}")
        print(f"Patterns: {result['detected_patterns']}")
