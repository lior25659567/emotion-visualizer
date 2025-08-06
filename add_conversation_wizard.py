#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Conversation Wizard Integration
This script adds conversation wizard routes to the existing Flask server.

Usage:
1. Import this module in your main server
2. Call add_conversation_wizard(app) to register the routes

Example:
    from add_conversation_wizard import add_conversation_wizard
    add_conversation_wizard(app)
"""

import logging

# Configure logging
logger = logging.getLogger(__name__)

def add_conversation_wizard(app):
    """Add conversation wizard functionality to the existing Flask app"""
    try:
        # Import the conversation analyzer module
        from backend.conversation_analyzer_module import register_conversation_analyzer_routes
        
        # Register the routes
        register_conversation_analyzer_routes(app)
        
        logger.info("🎤 Conversation Wizard functionality added successfully!")
        logger.info("📝 New routes available:")
        logger.info("   - /api/conversation-wizard/transcribe-audio")
        logger.info("   - /api/conversation-wizard/analyze-conversation")
        logger.info("   - /api/conversation-wizard/health")
        
        return True
        
    except ImportError as e:
        logger.error(f"❌ Failed to import conversation analyzer module: {e}")
        logger.warning("⚠️ Conversation wizard functionality not available")
        return False
    except Exception as e:
        logger.error(f"❌ Failed to add conversation wizard: {e}")
        return False

# For direct execution (optional test)
if __name__ == "__main__":
    from flask import Flask
    
    # Create test app
    test_app = Flask(__name__)
    
    # Add conversation wizard
    success = add_conversation_wizard(test_app)
    
    if success:
        print("✅ Conversation wizard integration test successful!")
        print("Routes added:")
        for rule in test_app.url_map.iter_rules():
            if 'conversation-wizard' in rule.rule:
                print(f"  {rule.rule} [{', '.join(rule.methods - {'HEAD', 'OPTIONS'})}]")
    else:
        print("❌ Conversation wizard integration test failed!") 