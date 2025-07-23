#!/usr/bin/env python3
"""
Conversation Manager - Scalable conversation system for 50+ conversations
Automatically discovers, validates, and manages conversation data consistency
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional

class ConversationManager:
    def __init__(self, conversations_dir: str = "conversations"):
        self.conversations_dir = Path(conversations_dir)
        self.conversations = {}
        self.discover_conversations()
    
    def discover_conversations(self) -> Dict:
        """Auto-discover all conversation folders and their files"""
        conversations = {}
        
        if not self.conversations_dir.exists():
            print(f"❌ Conversations directory not found: {self.conversations_dir}")
            return conversations
        
        # Find all conversation folders
        for folder in sorted(self.conversations_dir.iterdir()):
            if folder.is_dir() and folder.name.startswith('convo'):
                convo_num = self.extract_conversation_number(folder.name)
                if convo_num:
                    conversations[folder.name] = self.analyze_conversation_folder(folder, convo_num)
        
        self.conversations = conversations
        return conversations
    
    def extract_conversation_number(self, folder_name: str) -> Optional[int]:
        """Extract conversation number from folder name (e.g., 'convo1' -> 1)"""
        match = re.match(r'convo(\d+)', folder_name)
        return int(match.group(1)) if match else None
    
    def analyze_conversation_folder(self, folder: Path, convo_num: int) -> Dict:
        """Analyze a conversation folder and return its structure"""
        mp3_files = list(folder.glob("*.mp3"))
        json_files = list(folder.glob("*.json"))
        
        # Standard naming convention
        expected_emotion_file = f"emotions{convo_num}.json"
        expected_ai_file = f"emotions{convo_num}_ai_analyzed.json"
        
        return {
            'folder_path': str(folder),
            'conversation_number': convo_num,
            'mp3_count': len(mp3_files),
            'mp3_files': sorted([f.name for f in mp3_files]),
            'json_files': [f.name for f in json_files],
            'expected_emotion_file': expected_emotion_file,
            'expected_ai_file': expected_ai_file,
            'has_emotion_file': any(expected_emotion_file in f.name for f in json_files),
            'has_ai_file': any(expected_ai_file in f.name for f in json_files),
            'emotion_file_path': self.find_emotion_file(folder, convo_num),
            'ai_file_path': self.find_ai_file(folder, convo_num),
        }
    
    def find_emotion_file(self, folder: Path, convo_num: int) -> Optional[str]:
        """Find the emotion file, checking standard and legacy naming"""
        standard_name = f"emotions{convo_num}.json"
        legacy_patterns = [
            f"emotions{convo_num}_*.json",
            "emotions*.json"
        ]
        
        # Check standard naming first
        standard_path = folder / standard_name
        if standard_path.exists():
            return str(standard_path)
        
        # Check legacy patterns
        for pattern in legacy_patterns:
            matches = list(folder.glob(pattern))
            if matches:
                # Prefer non-AI files
                non_ai_files = [f for f in matches if '_ai_analyzed' not in f.name]
                if non_ai_files:
                    return str(non_ai_files[0])
                return str(matches[0])
        
        return None
    
    def find_ai_file(self, folder: Path, convo_num: int) -> Optional[str]:
        """Find the AI-analyzed file, checking standard and legacy naming"""
        standard_name = f"emotions{convo_num}_ai_analyzed.json"
        legacy_patterns = [
            f"emotions*_ai_analyzed.json"
        ]
        
        # Check standard naming first
        standard_path = folder / standard_name
        if standard_path.exists():
            return str(standard_path)
        
        # Check legacy patterns
        for pattern in legacy_patterns:
            matches = list(folder.glob(pattern))
            if matches:
                return str(matches[0])
        
        return None
    
    def validate_conversation_consistency(self, folder_name: str) -> Dict:
        """Validate a conversation for consistency and return issues"""
        if folder_name not in self.conversations:
            return {'valid': False, 'error': 'Conversation not found'}
        
        convo = self.conversations[folder_name]
        issues = []
        
        # Check if files exist
        if not convo['emotion_file_path']:
            issues.append(f"Missing emotion file: {convo['expected_emotion_file']}")
        
        if not convo['ai_file_path']:
            issues.append(f"Missing AI file: {convo['expected_ai_file']}")
        
        # Validate JSON structure if files exist
        if convo['emotion_file_path']:
            json_issues = self.validate_json_structure(convo['emotion_file_path'])
            issues.extend(json_issues)
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'conversation': convo
        }
    
    def validate_json_structure(self, file_path: str) -> List[str]:
        """Validate JSON file structure for consistency"""
        issues = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            mp3_entries = {k: v for k, v in data.items() if k.endswith('.mp3')}
            
            if not mp3_entries:
                issues.append("No MP3 entries found in JSON")
                return issues
            
            # Check required fields consistency
            required_fields = ['speaker', 'emotions', 'blobsVisible', 'blobHomeRegion']
            
            for mp3_file, entry in mp3_entries.items():
                for field in required_fields:
                    if field not in entry:
                        issues.append(f"{mp3_file}: Missing required field '{field}'")
                
                # Validate emotions format
                if 'emotions' in entry:
                    if not isinstance(entry['emotions'], list):
                        issues.append(f"{mp3_file}: 'emotions' should be a list, not {type(entry['emotions'])}")
                
                # Validate speaker assignment
                if 'speaker' in entry:
                    speaker = entry['speaker']
                    if not isinstance(speaker, int) or speaker not in [0, 1]:
                        issues.append(f"{mp3_file}: 'speaker' should be 0 or 1, not {speaker}")
                
                # Validate blob settings
                if 'blobsVisible' in entry and not isinstance(entry['blobsVisible'], bool):
                    issues.append(f"{mp3_file}: 'blobsVisible' should be boolean")
                
                # Validate home region consistency
                if 'speaker' in entry and 'blobHomeRegion' in entry:
                    speaker = entry['speaker']
                    region = entry['blobHomeRegion']
                    expected_region = 'center-left' if speaker == 0 else 'center-right'
                    if region != expected_region:
                        issues.append(f"{mp3_file}: Speaker {speaker} should have region '{expected_region}', not '{region}'")
        
        except json.JSONDecodeError as e:
            issues.append(f"Invalid JSON format: {e}")
        except Exception as e:
            issues.append(f"Error reading file: {e}")
        
        return issues
    
    def fix_conversation_consistency(self, folder_name: str, create_missing: bool = True) -> Dict:
        """Fix consistency issues in a conversation"""
        if folder_name not in self.conversations:
            return {'success': False, 'error': 'Conversation not found'}
        
        convo = self.conversations[folder_name]
        fixes_applied = []
        
        # Rename files to standard naming if needed
        if convo['emotion_file_path'] and not convo['has_emotion_file']:
            old_path = Path(convo['emotion_file_path'])
            new_path = old_path.parent / convo['expected_emotion_file']
            old_path.rename(new_path)
            fixes_applied.append(f"Renamed {old_path.name} to {new_path.name}")
            convo['emotion_file_path'] = str(new_path)
        
        if convo['ai_file_path'] and not convo['has_ai_file']:
            old_path = Path(convo['ai_file_path'])
            new_path = old_path.parent / convo['expected_ai_file']
            old_path.rename(new_path)
            fixes_applied.append(f"Renamed {old_path.name} to {new_path.name}")
            convo['ai_file_path'] = str(new_path)
        
        # Fix JSON structure
        if convo['emotion_file_path']:
            json_fixes = self.fix_json_structure(convo['emotion_file_path'])
            fixes_applied.extend(json_fixes)
        
        if convo['ai_file_path']:
            json_fixes = self.fix_json_structure(convo['ai_file_path'])
            fixes_applied.extend(json_fixes)
        
        return {
            'success': True,
            'fixes_applied': fixes_applied
        }
    
    def fix_json_structure(self, file_path: str) -> List[str]:
        """Fix JSON structure issues"""
        fixes = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            mp3_entries = {k: v for k, v in data.items() if k.endswith('.mp3')}
            modified = False
            
            for mp3_file, entry in mp3_entries.items():
                # Fix emotions format
                if 'emotions' in entry and isinstance(entry['emotions'], dict):
                    # Convert from object to array format
                    emotions_obj = entry['emotions']
                    entry['emotions'] = [emotion for emotion, value in emotions_obj.items() if value > 0.2]
                    fixes.append(f"{mp3_file}: Converted emotions from object to array")
                    modified = True
                
                # Add missing required fields
                if 'blobsVisible' not in entry:
                    entry['blobsVisible'] = True
                    fixes.append(f"{mp3_file}: Added missing 'blobsVisible'")
                    modified = True
                
                # Fix speaker and blob region consistency
                if 'speaker' in entry:
                    speaker = entry['speaker']
                    expected_region = 'center-left' if speaker == 0 else 'center-right'
                    
                    if 'blobHomeRegion' not in entry or entry['blobHomeRegion'] != expected_region:
                        entry['blobHomeRegion'] = expected_region
                        fixes.append(f"{mp3_file}: Fixed blobHomeRegion for speaker {speaker}")
                        modified = True
            
            # Save if modified
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                fixes.append(f"Saved updated file: {file_path}")
        
        except Exception as e:
            fixes.append(f"Error fixing {file_path}: {e}")
        
        return fixes
    
    def generate_web_config(self) -> Dict:
        """Generate configuration for web frontend"""
        config = {
            'conversations': {},
            'total_conversations': len(self.conversations),
            'file_mappings': {}
        }
        
        for folder_name, convo in self.conversations.items():
            config['conversations'][folder_name] = {
                'number': convo['conversation_number'],
                'mp3_count': convo['mp3_count'],
                'emotion_file': convo['emotion_file_path'],
                'ai_file': convo['ai_file_path'],
                'image_path': f"conversion images/{folder_name}.png"
            }
            
            # File mappings for sketch.js - use original emotion files
            if convo['emotion_file_path']:
                relative_path = os.path.relpath(convo['emotion_file_path'])
                config['file_mappings'][folder_name] = relative_path
        
        return config
    
    def update_conversations_config(self):
        """Update the conversations configuration file"""
        web_config = self.generate_web_config()
        with open('conversations_config.json', 'w', encoding='utf-8') as f:
            json.dump(web_config, f, ensure_ascii=False, indent=2)
        print("📝 Updated conversations_config.json for web frontend")
    
    def validate_all_conversations(self) -> Dict:
        """Validate all conversations and return summary"""
        results = {}
        total_issues = 0
        
        for folder_name in self.conversations:
            validation = self.validate_conversation_consistency(folder_name)
            results[folder_name] = validation
            if not validation['valid']:
                total_issues += len(validation['issues'])
        
        return {
            'results': results,
            'total_conversations': len(self.conversations),
            'valid_conversations': sum(1 for r in results.values() if r['valid']),
            'total_issues': total_issues
        }
    
    def fix_all_conversations(self) -> Dict:
        """Fix all conversations to ensure consistency"""
        results = {}
        total_fixes = 0
        
        for folder_name in self.conversations:
            fix_result = self.fix_conversation_consistency(folder_name)
            results[folder_name] = fix_result
            if fix_result['success']:
                total_fixes += len(fix_result['fixes_applied'])
        
        # Refresh conversation data after fixes
        self.discover_conversations()
        
        return {
            'results': results,
            'total_fixes': total_fixes
        }
    
    def print_summary(self):
        """Print a summary of all conversations"""
        print(f"\n🎯 Conversation Management System")
        print(f"📁 Found {len(self.conversations)} conversations")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        
        for folder_name, convo in sorted(self.conversations.items()):
            status = "✅" if convo['emotion_file_path'] and convo['ai_file_path'] else "⚠️"
            print(f"{status} {folder_name}: {convo['mp3_count']} MP3 files")
            if convo['emotion_file_path']:
                print(f"   📄 Emotion: {os.path.basename(convo['emotion_file_path'])}")
            if convo['ai_file_path']:
                print(f"   🤖 AI: {os.path.basename(convo['ai_file_path'])}")
            print()

def main():
    """Main function to demonstrate conversation management"""
    manager = ConversationManager()
    
    # Print summary
    manager.print_summary()
    
    # Validate all conversations
    print("🔍 Validating all conversations...")
    validation_results = manager.validate_all_conversations()
    
    if validation_results['total_issues'] > 0:
        print(f"❌ Found {validation_results['total_issues']} issues across conversations")
        
        # Fix all issues
        print("🔧 Fixing all issues...")
        fix_results = manager.fix_all_conversations()
        print(f"✅ Applied {fix_results['total_fixes']} fixes")
        
        # Re-validate
        final_validation = manager.validate_all_conversations()
        if final_validation['total_issues'] == 0:
            print("🎉 All conversations are now consistent!")
        else:
            print(f"⚠️ {final_validation['total_issues']} issues remain")
    else:
        print("✅ All conversations are consistent!")
    
    # Generate web config
    web_config = manager.generate_web_config()
    with open('conversations_config.json', 'w', encoding='utf-8') as f:
        json.dump(web_config, f, ensure_ascii=False, indent=2)
    print("📝 Generated conversations_config.json for web frontend")

if __name__ == "__main__":
    main() 