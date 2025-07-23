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

    def analyze_single_segment(self, transcript: str, use_fast_mode: bool = True) -> Dict[str, Any]:
        """
        Analyze a single Hebrew transcript segment
        
        Args:
            transcript: Hebrew text to analyze
            use_fast_mode: Whether to use fast analysis (pattern matching only)
            
        Returns:
            Dictionary with emotion analysis results
        """
        if not transcript or not transcript.strip():
            return {
                "emotions": ["neutral"],
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
        
        return {
            "emotions": emotions if emotions else ["neutral"],
            "confidence": confidence,
            "blur": blur,
            "shine": shine, 
            "humor": humor,
            "voice_intensity": voice_intensity,
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
        
        # Emotion mapping rules
        emotion_mapping = {
            'humor_indicators': 'amusement',
            'happiness_indicators': 'happiness', 
            'joy_indicators': 'joy',
            'sadness_indicators': 'sadness',
            'anger_indicators': 'anger',
            'fear_indicators': 'fear',
            'surprise_indicators': 'surprise',
            'curiosity_indicators': 'curiosity',
            'disgust_indicators': 'disgust',
            'frustration_indicators': 'frustration',
            'excitement_indicators': 'excitement',
            'love_indicators': 'love',
            'anxiety_indicators': 'anxiety',
            'hope_indicators': 'hope',
            'pride_indicators': 'pride',
            'admiration_indicators': 'admiration',
            'amusement_indicators': 'amusement',
            'annoyance_indicators': 'annoyance',
            'approval_indicators': 'approval',
            'awe_indicators': 'awe',
            'caring_indicators': 'caring'
        }
        
        # Find top scoring emotions
        sorted_scores = sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True)
        
        for category, score in sorted_scores:
            if score > 0.5:  # Threshold for inclusion
                if category in emotion_mapping:
                    emotion = emotion_mapping[category]
                    if emotion not in emotions:
                        emotions.append(emotion)
        
        # Handle special cases
        if 'agreement_indicators' in emotion_scores and emotion_scores['agreement_indicators'] > 1.0:
            if 'approval' not in emotions:
                emotions.append('approval')
                
        if 'disagreement_indicators' in emotion_scores and emotion_scores['disagreement_indicators'] > 1.0:
            if 'annoyance' not in emotions:
                emotions.append('annoyance')
        
        return emotions[:3]  # Limit to top 3 emotions
    
    def _calculate_blur(self, emotion_scores: Dict[str, float], text: str) -> int:
        """Calculate blur level (0-10) based on confusion indicators"""
        blur_score = emotion_scores.get('blur_indicators', 0)
        
        # Add points for question marks and unclear speech
        blur_score += text.count('?') * 0.5
        blur_score += text.count('מה') * 0.3
        blur_score += text.count('אה') * 0.2
        
        return min(10, int(blur_score))
    
    def _calculate_shine(self, emotion_scores: Dict[str, float], text: str) -> int:
        """Calculate shine level (0-10) based on positive indicators"""
        shine_score = 0
        
        # Positive emotions contribute to shine
        positive_emotions = ['happiness_indicators', 'joy_indicators', 'excitement_indicators', 
                           'pride_indicators', 'amusement_indicators']
        
        for emotion in positive_emotions:
            shine_score += emotion_scores.get(emotion, 0) * 0.8
            
        # Exclamation marks add shine
        shine_score += text.count('!') * 0.3
        
        return min(10, int(shine_score))
    
    def _calculate_humor(self, emotion_scores: Dict[str, float], text: str) -> int:
        """Calculate humor level (0-10)"""
        humor_score = emotion_scores.get('humor_indicators', 0)
        humor_score += emotion_scores.get('amusement_indicators', 0)
        
        # Laughter indicators
        humor_score += text.lower().count('חח') * 0.5
        humor_score += text.lower().count('lol') * 0.5
        
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

# Global analyzer instance
_analyzer = None

def get_analyzer() -> HebrewEmotionAnalyzer:
    """Get the global analyzer instance"""
    global _analyzer
    if _analyzer is None:
        _analyzer = HebrewEmotionAnalyzer()
    return _analyzer

def analyze_single_segment(transcript: str, use_fast_mode: bool = True) -> Dict[str, Any]:
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
