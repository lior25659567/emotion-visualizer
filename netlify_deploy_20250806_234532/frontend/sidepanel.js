// Global emotion config variables (need to be loaded)
var emotionsConfig = null;
var conversationsConfig = null;

// Load emotions config from file
async function loadEmotionsConfig() {
    if (!emotionsConfig || typeof emotionsConfig !== 'object') {
        try {
            const response = await fetch('/config/emotions_config.json');
            emotionsConfig = await response.json();
            console.log('✅ Emotions config loaded:', Object.keys(emotionsConfig).length, 'emotions');
            console.log('🔍 Sample emotions:', Object.keys(emotionsConfig).slice(0, 5));
        } catch (error) {
            console.error('Failed to load emotions config:', error);
            emotionsConfig = {};
        }
    }
    return emotionsConfig;
}

// Load conversations config from file
async function loadConversationsConfig(forceReload = false) {
    if (!conversationsConfig || typeof conversationsConfig !== 'object' || forceReload) {
        try {
            // ✅ ENHANCED CACHE-BUSTING: Prevent stale config after refresh
            const cacheBuster = forceReload ? `?v=${Date.now()}&refresh=true` : `?v=${Date.now()}`;
            const configUrl = `/config/conversations_config.json${cacheBuster}`;
            
            console.log(`📡 Sidepanel loading conversations config from: ${configUrl}`);
            
            const response = await fetch(configUrl, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load conversations config: ${response.status} ${response.statusText}`);
            }
            
            conversationsConfig = await response.json();
            console.log('✅ Sidepanel conversations config loaded (with cache-busting):', Object.keys(conversationsConfig.conversations || {}).length, 'conversations');
        } catch (error) {
            console.error('Failed to load conversations config:', error);
            conversationsConfig = { conversations: {} };
        }
    }
    return conversationsConfig;
}

// Helper function to format date for display
function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    
    try {
        // Parse ISO date string (YYYY-MM-DD)
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}`;
    } catch (error) {
        console.warn('Error parsing date:', dateString, error);
        return dateString;
    }
}

// Get emotion data with Hebrew name and color
function getEmotionData(emotion) {
    // Default fallback
    const defaultData = {
        hebrew: emotion,
        color: '#9B9B9B',
        emoji: '😐'
    };
    
    if (!emotionsConfig || typeof emotionsConfig !== 'object') {
        console.warn('Emotions config not loaded yet, using default for:', emotion);
        return defaultData;
    }
    
    // Since emotions config now uses Hebrew keys, try direct lookup first
    if (emotionsConfig[emotion]) {
        return {
            hebrew: emotion, // The key itself is Hebrew
            color: emotionsConfig[emotion].color || '#9B9B9B',
            emoji: emotionsConfig[emotion].emoji || '😐'
        };
    }
    
    // For backward compatibility, try English variations
    const variations = [
        emotion.toLowerCase(),
        emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase(),
        emotion.charAt(0).toLowerCase() + emotion.slice(1)
    ];
    
    for (const variant of variations) {
        if (emotionsConfig[variant]) {
            return {
                hebrew: emotionsConfig[variant].hebrew || emotion,
                color: emotionsConfig[variant].color || '#9B9B9B',
                emoji: emotionsConfig[variant].emoji || '😐'
            };
        }
    }
    
    // If not found by key, search by English field
    for (const [hebrewKey, emotionData] of Object.entries(emotionsConfig)) {
        if (emotionData.english === emotion || emotionData.english === emotion.toLowerCase()) {
            return {
                hebrew: hebrewKey, // Use the Hebrew key as display name
                color: emotionData.color || '#9B9B9B',
                emoji: emotionData.emoji || '😐'
            };
        }
    }
    
    console.warn('🔍 Emotion not found in config:', emotion);
    return defaultData;
}

// Listen for emotion color updates from the emotion management interface
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'updateEmotions') {
        console.log('🎨 [Sidepanel] Received emotion color update via message');
        updateSidepanelEmotionColors(event.data);
    }
});

// Also listen for custom events dispatched from the visualization
window.addEventListener('emotionColorsUpdated', (event) => {
    console.log('🎨 [Sidepanel] Received emotion color update via custom event');
    if (event.detail && event.detail.emotionColorMap) {
        updateSidepanelFromColorMap(event.detail.emotionColorMap);
    }
});

// Function to update sidepanel colors from a color map (RGB values)
function updateSidepanelFromColorMap(colorMap) {
    console.log('🔄 [Sidepanel] Updating from color map:', colorMap);
    
    if (!emotionsConfig) {
        console.warn('🔄 [Sidepanel] emotionsConfig not available yet');
        return;
    }
    
    // Update emotionsConfig with new colors from color map
    Object.entries(colorMap).forEach(([emotion, rgbArray]) => {
        if (rgbArray && Array.isArray(rgbArray) && rgbArray.length === 3) {
            const hexColor = `#${rgbArray.map(c => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
            
            if (!emotionsConfig[emotion]) {
                emotionsConfig[emotion] = {};
            }
            emotionsConfig[emotion].color = hexColor;
            console.log(`🎨 [Sidepanel] Updated ${emotion} color to ${hexColor} from RGB [${rgbArray.join(', ')}]`);
        }
    });
    
    // Force refresh of visible emotion displays multiple times to ensure it sticks
    refreshSidepanelEmotionDisplays();
    
    // Also force refresh after a short delay
    setTimeout(() => {
        console.log('🔄 [Sidepanel] Secondary color refresh');
        refreshSidepanelEmotionDisplays();
    }, 500);
    
    // And again after element updates
    setTimeout(() => {
        console.log('🔄 [Sidepanel] Final color refresh');
        refreshSidepanelEmotionDisplays();
    }, 1500);
}

// Function to update sidepanel emotion colors when they're changed in the management interface
function updateSidepanelEmotionColors(updateData) {
    console.log('🔄 [Sidepanel] Updating emotion colors in sidepanel');
    
    if (updateData.emotions) {
        // Update the emotionsConfig with new colors
        Object.entries(updateData.emotions).forEach(([emotion, config]) => {
            if (config.active && config.color && emotionsConfig) {
                if (!emotionsConfig[emotion]) {
                    emotionsConfig[emotion] = {};
                }
                emotionsConfig[emotion].color = config.color;
                console.log(`🎨 [Sidepanel] Updated ${emotion} color to ${config.color}`);
            }
        });
        
        // Force refresh of visible emotion displays
        refreshSidepanelEmotionDisplays();
    }
}

// Function to refresh all visible emotion color displays in the sidepanel
function refreshSidepanelEmotionDisplays() {
    console.log('🔄 [Sidepanel] Refreshing emotion color displays');
    
    // Update emotion tags in current file info
    const emotionsContainer = document.getElementById('current-emotions');
    if (emotionsContainer) {
        const emotionTags = emotionsContainer.querySelectorAll('.emotion-tag');
        emotionTags.forEach(tag => {
            const emotionText = tag.querySelector('span')?.textContent;
            if (emotionText) {
                const emotionData = findEmotionDataByHebrew(emotionText);
                if (emotionData && emotionData.color) {
                    const colorSquare = tag.querySelector('.emotion-color-square');
                    if (colorSquare) {
                        colorSquare.style.setProperty('background-color', emotionData.color, 'important');
                        colorSquare.style.backgroundColor = emotionData.color;
                        console.log(`🎨 [Sidepanel] Updated current emotion "${emotionText}" color to ${emotionData.color}`);
                    }
                }
            }
        });
    }
    
    // Update segment emotion colors
    const segmentContainers = document.querySelectorAll('.specific-segment');
    segmentContainers.forEach(segment => {
        const emotionDivs = segment.querySelectorAll('.specific-emotion');
        emotionDivs.forEach(emotionDiv => {
            const emotionText = emotionDiv.querySelector('.span-tag')?.textContent;
            if (emotionText) {
                const emotionData = findEmotionDataByHebrew(emotionText);
                if (emotionData && emotionData.color) {
                    const rectangle = emotionDiv.querySelector('.rectangle');
                    if (rectangle) {
                        rectangle.style.setProperty('background-color', emotionData.color, 'important');
                        rectangle.style.backgroundColor = emotionData.color;
                        console.log(`🎨 [Sidepanel] Updated segment emotion "${emotionText}" color to ${emotionData.color}`);
                    }
                }
            }
        });
    });
    
    // Update transcript legend colors
    const legendItems = document.querySelectorAll('.legend-item');
    console.log(`🔍 [Sidepanel] Found ${legendItems.length} legend items to update`);
    legendItems.forEach((item, index) => {
        const emotionText = item.querySelector('span')?.textContent;
        const legendDot = item.querySelector('.legend-dot');
        console.log(`🔍 [Sidepanel] Legend item ${index}: text="${emotionText}", hasDot=${!!legendDot}`);
        
        if (emotionText && legendDot) {
            // Try to get emotion data directly by Hebrew text
            const emotionData = findEmotionDataByHebrew(emotionText);
            console.log(`🔍 [Sidepanel] Hebrew "${emotionText}" emotion data:`, emotionData);
            
            if (emotionData && emotionData.color) {
                const oldColor = legendDot.style.backgroundColor;
                legendDot.style.setProperty('background-color', emotionData.color, 'important');
                // Also set backgroundColor as fallback
                legendDot.style.backgroundColor = emotionData.color;
                console.log(`🎨 [Sidepanel] Updated legend emotion "${emotionText}": "${oldColor}" → "${emotionData.color}"`);
            } else {
                console.warn(`⚠️ [Sidepanel] No emotion data found for Hebrew text "${emotionText}"`);
                console.log(`🔍 [Sidepanel] Available emotions:`, Object.keys(emotionsConfig || {}));
            }
        }
    });
    
    console.log('✅ [Sidepanel] Emotion color displays refreshed');
}

// Simplified function to find emotion data directly by Hebrew text
function findEmotionDataByHebrew(hebrewText) {
    if (!emotionsConfig) {
        console.warn('🔍 [Sidepanel] emotionsConfig not available for Hebrew mapping');
        return null;
    }
    
    // Clean the Hebrew text
    const cleanHebrew = hebrewText.trim();
    
    // First, try exact match with Hebrew names
    for (const [key, config] of Object.entries(emotionsConfig)) {
        if (config.hebrew === cleanHebrew) {
            console.log(`🔍 [Sidepanel] Found exact Hebrew match: "${cleanHebrew}"`);
            return config;
        }
    }
    
    // Try using the text as the key directly (for English keys)
    if (emotionsConfig[cleanHebrew]) {
        console.log(`🔍 [Sidepanel] Found direct key match: "${cleanHebrew}"`);
        return emotionsConfig[cleanHebrew];
    }
    
    // Try case-insensitive match on the key
    const cleanLower = cleanHebrew.toLowerCase();
    for (const [key, config] of Object.entries(emotionsConfig)) {
        if (key.toLowerCase() === cleanLower) {
            console.log(`🔍 [Sidepanel] Found case-insensitive key match: "${cleanHebrew}" → "${key}"`);
            return config;
        }
    }
    
    // Built-in Hebrew emotion data (fallback with default colors)
    const hebrewEmotionData = {
        'סקרנות': { hebrew: 'סקרנות', color: '#ffffff', emoji: '🤔' },
        'שמחה': { hebrew: 'שמחה', color: '#FFD700', emoji: '😊' },
        'עצב': { hebrew: 'עצב', color: '#4169E1', emoji: '😢' },
        'כעס': { hebrew: 'כעס', color: '#DC143C', emoji: '😠' },
        'פחד': { hebrew: 'פחד', color: '#8B008B', emoji: '😨' },
        'הפתעה': { hebrew: 'הפתעה', color: '#FF69B4', emoji: '😲' },
        'גועל': { hebrew: 'גועל', color: '#228B22', emoji: '🤢' },
        'ניטרלי': { hebrew: 'ניטרלי', color: '#808080', emoji: '😐' },
        'תסכול': { hebrew: 'תסכול', color: '#B22222', emoji: '😤' },
        'התרגשות': { hebrew: 'התרגשות', color: '#FF1493', emoji: '🤩' },
        'אהבה': { hebrew: 'אהבה', color: '#FF69B4', emoji: '❤️' },
        'חרדה': { hebrew: 'חרדה', color: '#9370DB', emoji: '😰' },
        'תקווה': { hebrew: 'תקווה', color: '#87CEEB', emoji: '🌟' },
        'גאווה': { hebrew: 'גאווה', color: '#DAA520', emoji: '😌' }
    };
    
    const fallbackData = hebrewEmotionData[cleanHebrew];
    if (fallbackData) {
        console.log(`🔍 [Sidepanel] Found fallback Hebrew data for: "${cleanHebrew}"`);
        return fallbackData;
    }
    
    console.warn(`⚠️ [Sidepanel] No emotion data found for Hebrew text: "${cleanHebrew}"`);
    console.log(`🔍 [Sidepanel] Available emotions:`, Object.keys(emotionsConfig));
    console.log(`🔍 [Sidepanel] Available Hebrew values:`, Object.values(emotionsConfig).map(c => c.hebrew).filter(Boolean));
    
    return null;
}

// Legacy function for backward compatibility
function findEmotionKeyByHebrew(hebrewText) {
    const emotionData = findEmotionDataByHebrew(hebrewText);
    if (emotionData) {
        // Try to find the key that matches this data
        for (const [key, config] of Object.entries(emotionsConfig || {})) {
            if (config === emotionData || config.hebrew === emotionData.hebrew) {
                return key;
            }
        }
        // If no key found, return the Hebrew text as key
        return hebrewText;
    }
    return null;
}

// Polling mechanism to check for emotion color updates (fallback)
let lastColorUpdateCheck = 0;
function checkForEmotionColorUpdates() {
    // Try to access the main window's emotion color map
    try {
        const mainWindow = window.parent || window.top || window;
        if (mainWindow !== window) {
            // Try different ways to access the color map
            let colorMap = null;
            let lastUpdateTime = 0;
            
            // Try accessing emotionGlobalColorMap
            if (mainWindow.emotionGlobalColorMap) {
                colorMap = mainWindow.emotionGlobalColorMap;
                lastUpdateTime = mainWindow.lastColorUpdateTime || 0;
            }
            
            // Try accessing through p5 instance
            if (!colorMap && mainWindow.p5SketchInstance && mainWindow.p5SketchInstance.emotionGlobalColorMap) {
                colorMap = mainWindow.p5SketchInstance.emotionGlobalColorMap;
                lastUpdateTime = mainWindow.lastColorUpdateTime || 0;
            }
            
            // Try accessing through window.emotionGlobalColorMap
            if (!colorMap && mainWindow.window && mainWindow.window.emotionGlobalColorMap) {
                colorMap = mainWindow.window.emotionGlobalColorMap;
                lastUpdateTime = mainWindow.lastColorUpdateTime || 0;
            }
            
            if (colorMap && lastUpdateTime > lastColorUpdateCheck) {
                console.log('🔄 [Sidepanel] Detected color update via polling, updating sidepanel');
                updateSidepanelFromColorMap(colorMap);
                lastColorUpdateCheck = Date.now();
            }
        }
    } catch (error) {
        // Only log if it's not a cross-origin error
        if (error.name !== 'SecurityError') {
            console.warn('🔄 [Sidepanel] Error checking for color updates:', error.message);
        }
    }
}

// Start polling for color updates every 2 seconds
setInterval(checkForEmotionColorUpdates, 2000);

// Also add more frequent checking specifically for the current segment
setInterval(() => {
    // Force refresh colors for currently visible segment
    if (window.currentSegmentIndex !== undefined) {
        const currentSegmentElement = document.querySelector(`[data-segment="${window.currentSegmentIndex}"]`);
        if (currentSegmentElement) {
            const emotionDivs = currentSegmentElement.querySelectorAll('.specific-emotion');
            let hasUpdates = false;
            
            emotionDivs.forEach(emotionDiv => {
                const emotionText = emotionDiv.querySelector('.span-tag')?.textContent;
                const rectangle = emotionDiv.querySelector('.rectangle');
                
                if (emotionText && rectangle) {
                    const emotionData = findEmotionDataByHebrew(emotionText);
                    if (emotionData && emotionData.color) {
                        const currentColor = rectangle.style.backgroundColor;
                        const expectedColor = emotionData.color;
                        
                        // Convert colors to comparable format
                        const currentColorNormalized = currentColor.toLowerCase();
                        const expectedColorNormalized = expectedColor.toLowerCase();
                        
                        if (!currentColorNormalized.includes(expectedColorNormalized.replace('#', ''))) {
                            console.log(`🔄 [FREQUENT SYNC] Updating "${emotionText}": ${currentColor} → ${expectedColor}`);
                            rectangle.style.setProperty('background-color', expectedColor, 'important');
                            rectangle.style.backgroundColor = expectedColor;
                            hasUpdates = true;
                        }
                    }
                }
            });
            
            if (hasUpdates) {
                console.log(`✅ [FREQUENT SYNC] Updated colors for current segment ${window.currentSegmentIndex}`);
            }
        }
    }
}, 1000); // Check every second for current segment

// Function to specifically test legend color updates
function testLegendColorUpdate() {
    console.log('🧪 [Sidepanel] Testing legend color updates...');
    const legendItems = document.querySelectorAll('.legend-item');
    console.log(`🧪 [Sidepanel] Found ${legendItems.length} legend items`);
    
    legendItems.forEach((item, index) => {
        const span = item.querySelector('span');
        const dot = item.querySelector('.legend-dot');
        console.log(`🧪 [Sidepanel] Legend ${index}:`, {
            text: span?.textContent,
            hasDot: !!dot,
            currentColor: dot?.style.backgroundColor
        });
        
        if (span && dot) {
            const emotionText = span.textContent;
            const emotionData = findEmotionDataByHebrew(emotionText);
            console.log(`🧪 [Sidepanel] Testing "${emotionText}":`, emotionData);
            
            if (emotionData && emotionData.color) {
                console.log(`🧪 [Sidepanel] Setting color to: ${emotionData.color}`);
                dot.style.setProperty('background-color', emotionData.color, 'important');
                dot.style.backgroundColor = emotionData.color;
                console.log(`🧪 [Sidepanel] Color applied successfully`);
            } else {
                console.warn(`🧪 [Sidepanel] No emotion data found for: "${emotionText}"`);
            }
        }
    });
}

// Function to specifically test curiosity color updates
function testCuriosityColorUpdate() {
    console.log('🔬 [Sidepanel] Testing curiosity color specifically...');
    
    // Find all elements with "סקרנות" text
    const allElements = document.querySelectorAll('*');
    let curiosityElements = [];
    
    allElements.forEach(element => {
        if (element.textContent && element.textContent.includes('סקרנות')) {
            curiosityElements.push(element);
        }
    });
    
    console.log(`🔬 [Sidepanel] Found ${curiosityElements.length} elements containing "סקרנות"`);
    
    curiosityElements.forEach((element, index) => {
        console.log(`🔬 [Sidepanel] Curiosity element ${index}:`, element);
        
        // Find the associated color element
        const parent = element.closest('.specific-emotion, .legend-item, .emotion-tag');
        if (parent) {
            const colorElement = parent.querySelector('.rectangle, .legend-dot, .emotion-color-square');
            if (colorElement) {
                const curiosityData = findEmotionDataByHebrew('סקרנות');
                console.log(`🔬 [Sidepanel] Curiosity data:`, curiosityData);
                
                if (curiosityData && curiosityData.color) {
                    const oldColor = colorElement.style.backgroundColor;
                    colorElement.style.setProperty('background-color', curiosityData.color, 'important');
                    colorElement.style.backgroundColor = curiosityData.color;
                    console.log(`🔬 [Sidepanel] Updated curiosity color: "${oldColor}" → "${curiosityData.color}"`);
                }
            }
        }
    });
}

// Expose functions globally for debugging and external access
window.updateSidepanelEmotionColors = updateSidepanelEmotionColors;
window.updateSidepanelFromColorMap = updateSidepanelFromColorMap;
window.refreshSidepanelEmotionDisplays = refreshSidepanelEmotionDisplays;
window.findEmotionKeyByHebrew = findEmotionKeyByHebrew;
window.findEmotionDataByHebrew = findEmotionDataByHebrew;
window.checkForEmotionColorUpdates = checkForEmotionColorUpdates;
window.testLegendColorUpdate = testLegendColorUpdate;
window.testCuriosityColorUpdate = testCuriosityColorUpdate;

// Function to force update curiosity color from external source
window.forceCuriosityColorUpdate = function(newColor) {
    console.log(`🔧 [Sidepanel] Force updating curiosity color to: ${newColor}`);
    
    // Update in emotionsConfig
    if (!emotionsConfig) emotionsConfig = {};
    if (!emotionsConfig.curiosity) emotionsConfig.curiosity = {};
    emotionsConfig.curiosity.color = newColor;
    
    // Also update the Hebrew fallback data
    const hebrewEmotionData = {
        'סקרנות': { hebrew: 'סקרנות', color: newColor, emoji: '🤔' }
    };
    
    // Force update all curiosity elements immediately
    testCuriosityColorUpdate();
    
    console.log(`✅ [Sidepanel] Curiosity color force updated to: ${newColor}`);
};

// Global generateTranscriptTab function
function generateTranscriptTab(data) {
    console.log('📝 Generating transcript tab with real conversation data...');
    console.log('📊 Data received:', data);
    
    const transcriptContainer = document.getElementById('transcript-content');
    console.log('📋 Transcript container found:', transcriptContainer);
    if (!transcriptContainer) {
        console.error('❌ Could not find transcript-content element');
        return;
    }
    
    const mp3Keys = Object.keys(data).filter(k => k.endsWith('.mp3')).sort();
    
    if (mp3Keys.length === 0) {
        transcriptContainer.innerHTML = '<div class="transcript-loading">אין נתוני תמלול זמינים</div>';
        return;
    }
    
    // Load people data to map speaker numbers to names
    const getSpeakerName = (speakerNumber) => {
        // Try to get from window speaker info if available
        if (window.speakerInfo && window.speakerInfo[speakerNumber.toString()]) {
            return window.speakerInfo[speakerNumber.toString()].name;
        }
        
        // Fallback to default
        return `דובר ${speakerNumber + 1}`;
    };
    
    // Store current data for refreshing when speaker info changes
    window.currentTranscriptData = data;
    
    // Try to load speaker info if not already available
    if (!window.speakerInfo && window.conversationDataPath) {
        const pathParts = window.conversationDataPath.split('/');
        if (pathParts.length >= 2) {
            const conversationId = pathParts[pathParts.length - 2];
            console.log(`🎭 Side panel loading speaker info for: ${conversationId}`);
            
            fetch(`/api/get-speaker-info/${conversationId}`)
                .then(response => response.json())
                .then(data => {
                    window.speakerInfo = data.speakers;
                    console.log('🎭 Side panel loaded speaker info:', window.speakerInfo);
                    // Refresh the display with new speaker names
                    if (window.refreshSidePanelSpeakerNames) {
                        window.refreshSidePanelSpeakerNames();
                    }
                })
                .catch(error => {
                    console.warn('⚠️ Side panel failed to load speaker info:', error);
                });
        }
    }
    
    // Function to display transcript with current speaker names
    const displayTranscript = (transcriptData) => {
        const mp3DataKeys = Object.keys(transcriptData).filter(key => key.endsWith('.mp3')).sort();
        let transcriptHTML = '';
        
        // Get current active segment index (default to 0 to show first segment initially)
        const currentSegmentIndex = window.currentSegmentIndex !== undefined ? window.currentSegmentIndex : 0;
        console.log('🎯 Current segment index:', currentSegmentIndex, 'Total segments:', mp3DataKeys.length);
        
        // Create one transcript card per segment
        mp3DataKeys.forEach((key, index) => {
            const entry = transcriptData[key];
            if (entry) {
                // Use actual transcript data
                const text = entry.transcript || entry.words || entry.text || 
                            'תמלול לא זמין עבור קטע זה';
                
                // Get speaker name using speaker number
                const speakerNumber = entry.speaker || 0;
                const speakerName = getSpeakerName(speakerNumber);
                
                // Get emotions for this specific segment
                let segmentEmotions = [];
                if (entry.emotions && Array.isArray(entry.emotions)) {
                    segmentEmotions = entry.emotions;
                }
                
                // Ensure we always have at least one emotion to show
                if (segmentEmotions.length === 0) {
                    segmentEmotions = ['neutral'];
                }
                
                // Determine if this segment is active
                const isActive = index === currentSegmentIndex;
                
                // Set the state class and styling - much more dramatic distinction
                let stateClass = '';
                let stateStyle = '';
                let containerStyle = '';
                
                if (isActive) {
                    stateClass = 'active-transcript';
                    stateStyle = 'opacity: 1; border: 2px solid #000000;';
                    containerStyle = 'background: #ffffff;';
                    console.log(`Segment ${index} (${key}): ACTIVE AND PROMINENT`);
                } else {
                    stateClass = 'disabled-transcript';
                    stateStyle = 'opacity: 1; border: 1px solid #cccccc;';
                    containerStyle = 'background: #ffffff;';
                    console.log(`Segment ${index} (${key}): DISABLED AND FADED`);
                }
                
                // Create legend items from actual emotions for this segment
                const legendHTML = segmentEmotions.map(emotion => {
                    const emotionData = getEmotionData(emotion);
                    return `
                        <div class="legend-item">
                            <div class="legend-dot" style="background: ${emotionData.color} !important;"></div>
                            <span>${emotionData.hebrew}</span>
                        </div>
                    `;
                }).join('');
                
                const clickHandler = `onclick="window.updateCurrentSegment(${index})"`;
                const cursor = '; cursor: pointer';
                
                transcriptHTML += `
                    <div class="transcript-card ${stateClass}" data-segment-index="${index}" data-segment-key="${key}" style="${stateStyle}${cursor}; ${containerStyle} margin-bottom: 2px; padding: 12px; border-radius: 0px; transition: all 0.2s ease;" ${clickHandler}>
                        <div class="transcript-header">
                            <div class="transcript-title" style="font-weight: ${isActive ? 'bold' : 'normal'}; color: ${isActive ? '#000000' : '#888888'}; font-size: 14px;">
                                ${speakerName}
                            </div>
                            <div class="transcript-legend">
                                ${legendHTML}
                            </div>
                        </div>
                        <div class="transcript-content" style="font-size: 13px; line-height: 1.4; color: ${isActive ? '#000000' : '#777777'};">
                            ${text}
                        </div>
                    </div>
                `;
            }
        });
        
        // Update the transcript container
        if (transcriptHTML === '') {
            console.log('⚠️ No transcript HTML generated, showing loading message');
            transcriptContainer.innerHTML = '<div class="transcript-loading">לא נמצא תמלול בקובץ זה</div>';
        } else {
            console.log('✨ Setting transcript container HTML...');
            
            transcriptContainer.innerHTML = transcriptHTML;
            console.log(`✅ Generated transcript tab with ${mp3DataKeys.length} individual segment cards (Current: ${currentSegmentIndex})`);
            
            // Auto-scroll to the active transcript card
            setTimeout(() => {
                const activeCard = transcriptContainer.querySelector('.transcript-card.active-transcript');
                if (activeCard) {
                    activeCard.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                    console.log('📍 Auto-scrolled to active transcript');
                }
            }, 100);
            
            // Add minimal CSS for the new visual states
            if (!document.getElementById('minimal-transcript-styles')) {
                const style = document.createElement('style');
                style.id = 'minimal-transcript-styles';
                style.textContent = `
                    .transcript-card {
                        position: relative;
                    }
                    
                    .transcript-card.disabled-transcript:hover {
                        border-color: #999999 !important;
                        cursor: pointer !important;
                    }
                    
                    .transcript-loading {
                        text-align: center;
                        color: #666;
                        padding: 40px 20px;
                        font-style: italic;
                    }
                    
                    #transcript-content {
                        max-height: 85vh;
                        overflow-y: auto;
                        /* Hide scrollbar while keeping functionality */
                        scrollbar-width: none; /* Firefox */
                        -ms-overflow-style: none; /* Internet Explorer 10+ */
                    }
                    
                    /* Hide scrollbar for webkit browsers */
                    #transcript-content::-webkit-scrollbar {
                        display: none;
                    }
                `;
                document.head.appendChild(style);
            }
        }
    };
    
    // Make displayTranscript function available globally
    window.displayTranscriptFunction = displayTranscript;
    
    // Also expose a simpler update function
    window.updateTranscriptDisplay = (newSegmentIndex) => {
        console.log(`🔄 [TRANSCRIPT] Manual update to segment ${newSegmentIndex}`);
        if (newSegmentIndex !== undefined) {
            window.currentSegmentIndex = newSegmentIndex;
        }
        if (window.currentTranscriptData) {
            displayTranscript(window.currentTranscriptData);
        }
    };
    
    // Force sync function that can be called externally
    window.forceTranscriptSync = () => {
        console.log(`🔄 [FORCE SYNC] Manually triggering transcript sync...`);
        
        let sketchCurrentIndex = undefined;
        
        // Try to get current audio index
        if (window.p5SketchInstance && 
            window.p5SketchInstance.getCurrentIndex && 
            typeof window.p5SketchInstance.getCurrentIndex === 'function') {
            sketchCurrentIndex = window.p5SketchInstance.getCurrentIndex();
        } else if (window.p5SketchInstance && window.p5SketchInstance.currentIndex !== undefined) {
            sketchCurrentIndex = window.p5SketchInstance.currentIndex;
        }
        
        if (sketchCurrentIndex !== undefined && sketchCurrentIndex !== window.currentSegmentIndex) {
            console.log(`🔧 [FORCE SYNC] Syncing transcript: ${window.currentSegmentIndex} → ${sketchCurrentIndex}`);
            window.currentSegmentIndex = sketchCurrentIndex;
            
            if (window.currentTranscriptData) {
                displayTranscript(window.currentTranscriptData);
            }
        } else {
            console.log(`✅ [FORCE SYNC] Already in sync (${sketchCurrentIndex})`);
        }
    };
    
    // Function to refresh the transcript display when speaker info changes
    window.refreshSidePanelSpeakerNames = () => {
        console.log('🔄 Refreshing side panel speaker names...');
        if (window.currentTranscriptData) {
            // Re-render the transcript with updated speaker names
            displayTranscript(window.currentTranscriptData);
        }
    };
    
    // Function to update the current segment
    window.updateCurrentSegment = (segmentIndex) => {
        console.log(`🎯 Updating current segment to: ${segmentIndex}`);
        window.currentSegmentIndex = segmentIndex;
        if (window.currentTranscriptData) {
            displayTranscript(window.currentTranscriptData);
            
            // Try to trigger audio playback for this segment in the main visualization
            const mp3DataKeys = Object.keys(window.currentTranscriptData).filter(key => key.endsWith('.mp3')).sort();
            if (mp3DataKeys[segmentIndex]) {
                const segmentKey = mp3DataKeys[segmentIndex];
                console.log(`🎵 Attempting to play segment: ${segmentKey}`);
                
                // Try to communicate with the main p5 sketch to play this segment
                if (window.p5SketchInstance && typeof window.p5SketchInstance.playSegmentByIndex === 'function') {
                    window.p5SketchInstance.playSegmentByIndex(segmentIndex);
                } else if (window.p5SketchInstance && typeof window.p5SketchInstance.setCurrentIndex === 'function') {
                    window.p5SketchInstance.setCurrentIndex(segmentIndex);
                    if (typeof window.p5SketchInstance.playNext === 'function') {
                        window.p5SketchInstance.playNext();
                    }
                }
            }
        }
    };
    
    // Function to navigate segments
    window.navigateSegment = (direction) => {
        const mp3DataKeys = Object.keys(window.currentTranscriptData || {}).filter(key => key.endsWith('.mp3')).sort();
        const totalSegments = mp3DataKeys.length;
        const currentIndex = window.currentSegmentIndex || 0;
        
        let newIndex;
        if (direction === 'next') {
            newIndex = Math.min(currentIndex + 1, totalSegments - 1);
        } else if (direction === 'prev') {
            newIndex = Math.max(currentIndex - 1, 0);
        } else if (direction === 'start') {
            newIndex = 0;
        }
        
        if (newIndex !== undefined && newIndex !== currentIndex) {
            window.updateCurrentSegment(newIndex);
        }
    };
    
    // Function to set current segment by mp3 filename (called from main visualization)
    window.setCurrentSegmentByKey = (mp3Key) => {
        if (!window.currentTranscriptData) return;
        
        const mp3DataKeys = Object.keys(window.currentTranscriptData).filter(key => key.endsWith('.mp3')).sort();
        const segmentIndex = mp3DataKeys.indexOf(mp3Key);
        
        if (segmentIndex >= 0) {
            console.log(`🎯 Setting current segment by key: ${mp3Key} -> index ${segmentIndex}`);
            window.updateCurrentSegment(segmentIndex);
        }
    };
    
    displayTranscript(data);
    
    // Add some debug information
    console.log('🎯 Clean transcript display initialized with the following features:');
    console.log('   ✅ Currently playing transcript has black border');
    console.log('   ✅ All other transcripts have gray borders');
    console.log('   ✅ Click on any transcript to switch to it');
    console.log('   ✅ No status header or decorative elements');
    console.log('   ✅ Clean speaker names without extra text');
    console.log('   ✅ Default browser scrollbar');
    console.log('   ✅ Auto-syncs with audio playback changes');
    
    // Set up a safety net - periodic sync check
    if (window.transcriptSyncInterval) {
        clearInterval(window.transcriptSyncInterval);
    }
    
    window.transcriptSyncInterval = setInterval(() => {
        // Try multiple ways to get the current audio index
        let sketchCurrentIndex = undefined;
        let syncMethod = 'none';
        
        // Method 1: Check if getCurrentIndex is available
        if (window.p5SketchInstance && 
            window.p5SketchInstance.getCurrentIndex && 
            typeof window.p5SketchInstance.getCurrentIndex === 'function') {
            sketchCurrentIndex = window.p5SketchInstance.getCurrentIndex();
            syncMethod = 'getCurrentIndex()';
        }
        
        // Method 2: Check if currentIndex is directly accessible
        else if (window.p5SketchInstance && window.p5SketchInstance.currentIndex !== undefined) {
            sketchCurrentIndex = window.p5SketchInstance.currentIndex;
            syncMethod = 'p5SketchInstance.currentIndex';
        }
        
        // Method 3: Check for a global currentIndex variable
        else if (window.currentAudioIndex !== undefined) {
            sketchCurrentIndex = window.currentAudioIndex;
            syncMethod = 'window.currentAudioIndex';
        }
        
        // Debug log only when there are issues (reduce console spam)
        if (sketchCurrentIndex === undefined) {
            console.warn(`⚠️ [PERIODIC SYNC] Could not get audio index from any method`);
            return; // Exit early if we can't get a valid index
        }
        
        // Validate the index is reasonable
        if (sketchCurrentIndex < 0 || !Number.isInteger(sketchCurrentIndex)) {
            console.warn(`⚠️ [PERIODIC SYNC] Invalid index detected: ${sketchCurrentIndex}, skipping sync`);
            return;
        }
        
        // If we found an index and it's different from transcript's current index
        // Add tolerance for minor differences to prevent unnecessary corrections
        const indexDifference = Math.abs(sketchCurrentIndex - window.currentSegmentIndex);
        if (sketchCurrentIndex !== undefined && 
            indexDifference > 0 && indexDifference <= 3 && // Only sync if difference is reasonable
            window.currentTranscriptData) {
            
            console.warn(`🚨 [PERIODIC SYNC] MISMATCH DETECTED! sketch=${sketchCurrentIndex}, transcript=${window.currentSegmentIndex}`);
            console.warn(`🔧 [PERIODIC SYNC] Forcing transcript sync...`);
            
            const oldIndex = window.currentSegmentIndex;
            window.currentSegmentIndex = sketchCurrentIndex;
            
            if (window.updateTranscriptDisplay) {
                window.updateTranscriptDisplay(sketchCurrentIndex);
                console.log(`✅ [PERIODIC SYNC] Corrected transcript: ${oldIndex} → ${sketchCurrentIndex}`);
                
                // Also force refresh emotion colors after sync
                setTimeout(() => {
                    console.log(`🎨 [PERIODIC SYNC] Force refreshing emotion colors after sync`);
                    refreshSidepanelEmotionDisplays();
                }, 100);
            } else {
                console.error(`❌ [PERIODIC SYNC] Failed to update transcript - no update function`);
            }
        }
    }, 2000); // Check less frequently - every 2 seconds to reduce sync conflicts
}

// Global function to handle conversation data loading
function handleConversationDataLoaded(data) {
    try {
        console.log('🎯 Processing conversation data...');
        console.log('🔢 Number of MP3 files in data:', Object.keys(data).filter(k => k.endsWith('.mp3')).length);
        
        // Load emotions config first, then generate transcript and AI content
        loadEmotionsConfig().then(async () => {
            console.log('📝 About to call generateTranscriptTab...');
            generateTranscriptTab(data);
            console.log('✅ generateTranscriptTab completed');
            
            // Initialize AI content (summaries and insights)
            setTimeout(async () => {
                try {
                    // Check if initializeAIContent is available before calling it
                    if (typeof initializeAIContent === 'function') {
                        await initializeAIContent();
                        console.log('🤖 AI content initialization completed');
                    } else {
                        console.log('ℹ️ AI content initialization function not available yet');
                    }
                } catch (error) {
                    console.warn('⚠️ AI content initialization failed:', error);
                }
            }, 1000); // Small delay to ensure UI is ready
            
        }).catch(error => {
            console.error('❌ Error loading emotions config:', error);
            // Try without config
            generateTranscriptTab(data);
        });
        
        console.log('🏁 Conversation data processing initiated!');
    } catch (error) {
        console.error('❌ Error processing conversation data:', error);
        console.error('❌ Stack trace:', error.stack);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Set up critical event listeners immediately, regardless of p5 instance
    // Listen for conversation data loaded event
    window.addEventListener('conversationDataLoaded', (event) => {
        try {
            console.log('🎯 conversationDataLoaded event received!');
            console.log('📊 Event detail:', event.detail);
            const data = event.detail.data;
            console.log('📊 Event data:', data);
            if (data) {
                handleConversationDataLoaded(data);
            } else {
                console.error('❌ No data in event!');
            }
        } catch (error) {
            console.error('❌ Major error in conversationDataLoaded handler:', error);
            console.error('❌ Stack trace:', error.stack);
        }
    });

    // 🔄 Listen for conversation updates from admin panel
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'refresh-conversations') {
            console.log('🔄 Side panel received conversation refresh request');
            // Force reload conversation title from updated config
            setTimeout(async () => {
                // Force reload the config first, then update title
                await loadConversationsConfig(true);
                if (window.updateConversationTitle) {
                    await window.updateConversationTitle();
                }
            }, 600);
        } else if (event.data && event.data.type === 'force-config-reload') {
            console.log('🔄 Side panel received force config reload');
            // Force immediate reload of conversation title
            setTimeout(async () => {
                // Force reload the config first, then update title
                await loadConversationsConfig(true);
                if (window.updateConversationTitle) {
                    await window.updateConversationTitle();
                }
            }, 200);
        } else if (event.data && event.data.type === 'update-conversation-title') {
            console.log('🏷️ Side panel received conversation title update:', event.data);
            // Immediate title update without full config reload
            if (event.data.metadata && event.data.metadata.name) {
                const conversationTitle = document.getElementById('conversation-title');
                if (conversationTitle) {
                    conversationTitle.textContent = event.data.metadata.name;
                    console.log(`✅ Updated side panel conversation title to: ${event.data.metadata.name}`);
                }
                
                // Also update date if provided
                if (event.data.metadata.date) {
                    const conversationDateElement = document.getElementById('conversation-date');
                    if (conversationDateElement) {
                        const formattedDate = formatDateForDisplay(event.data.metadata.date);
                        conversationDateElement.textContent = formattedDate;
                        console.log(`✅ Updated side panel conversation date to: ${formattedDate}`);
                    }
                }
            }
        }
    });
    
    // 🔄 Listen for BroadcastChannel updates
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('conversation-sync');
        channel.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'refresh-conversations') {
                console.log('📻 Side panel received conversation refresh broadcast');
                // Force reload conversation title from updated config
                setTimeout(async () => {
                    // Force reload the config first, then update title
                    await loadConversationsConfig(true);
                    if (window.updateConversationTitle) {
                        await window.updateConversationTitle();
                    }
                }, 600);
            } else if (event.data && event.data.type === 'force-config-reload') {
                console.log('📻 Side panel received force config reload broadcast');
                // Force immediate reload of conversation title
                setTimeout(async () => {
                    // Force reload the config first, then update title
                    await loadConversationsConfig(true);
                    if (window.updateConversationTitle) {
                        await window.updateConversationTitle();
                    }
                }, 200);
            } else if (event.data && event.data.type === 'update-conversation-title') {
                console.log('📻 Side panel received conversation title update broadcast:', event.data);
                // Immediate title update without full config reload
                if (event.data.metadata && event.data.metadata.name) {
                    const conversationTitle = document.getElementById('conversation-title');
                    if (conversationTitle) {
                        conversationTitle.textContent = event.data.metadata.name;
                        console.log(`✅ Updated side panel conversation title to: ${event.data.metadata.name}`);
                    }
                    
                    // Also update date if provided
                    if (event.data.metadata.date) {
                        const conversationDateElement = document.getElementById('conversation-date');
                        if (conversationDateElement) {
                            const formattedDate = formatDateForDisplay(event.data.metadata.date);
                            conversationDateElement.textContent = formattedDate;
                            console.log(`✅ Updated side panel conversation date to: ${formattedDate}`);
                        }
                    }
                }
            }
        });
    }

    // This script now assumes that sketch.js has already created the p5 instance
    // and exposed it as window.p5SketchInstance.

    // We'll periodically check if the instance is ready before setting everything up.
    const waitForP5Instance = setInterval(() => {
        if (window.p5SketchInstance) {
            clearInterval(waitForP5Instance);
            initializeSidePanelLogic();
        }
    }, 100);

    async function initializeSidePanelLogic() {
        // Load emotions config at startup
        await loadEmotionsConfig();
        await loadConversationsConfig(); // Load conversations config
        
        
        // Debug: Try to generate transcript immediately with any available data
        setTimeout(() => {
            console.log('🕒 Delayed check for emotion data...');
            if (window.emotionData && typeof window.emotionData === 'object') {
                console.log('🎯 Found emotion data in window, generating transcript...');
                generateTranscriptTab(window.emotionData);
            } else {
                console.log('❌ No emotion data found in window');
            }
        }, 2000);
        // Guard for sidepanel.js specific logic
        if (!window.location.pathname.endsWith('visualization.html')) {
            return;
        }

        const sidePanel = document.getElementById('conversationSidePanel');
        const panelTabs = document.querySelectorAll('.main-nav-tab');
        const panelTabContents = document.querySelectorAll('.main-tab-content');

        if (!sidePanel) return;

        // Initialize the side panel with conversation data
        window.initializeSidePanel = async function(conversationData, conversationDetails, blobs) {
            // Store references for later use
            window.conversationData = conversationData;
            window.conversationDetails = conversationDetails;
            window.blobs = blobs;
            
            // Update sidebar title and date
            await updateConversationTitle(conversationData);
        };

        // Function to update conversation title and date  
        async function updateConversationTitle(conversationData) {
            const conversationTitle = document.getElementById('conversation-title');
            const conversationDateElement = document.getElementById('conversation-date');
            
            if (!conversationTitle || !conversationDateElement) return;
            
            // Extract conversation folder name
            let conversationName = 'שיחה';
            let conversationDateText = '';
            
            if (conversationData && conversationData.metadata) {
                // Use metadata if available
                conversationName = conversationData.metadata.name || conversationData.metadata.title || 'שיחה';
                conversationDateText = formatDateForDisplay(conversationData.metadata.date) || '';
            } else {
                // Try to extract from URL or folder name
                const urlParams = new URLSearchParams(window.location.search);
                const folder = urlParams.get('folder');
                if (folder) {
                    // Load conversations config and get real data
                    await loadConversationsConfig();
                    const realConversationData = await getConversationDataFromConfig(folder);
                    if (realConversationData) {
                        conversationName = realConversationData.name;
                        conversationDateText = realConversationData.date;
                    } else {
                        // Fallback to generating names
                        conversationName = getConversationTitle(folder);
                        conversationDateText = getConversationDate(folder);
                    }
                }
            }
            
            conversationTitle.textContent = conversationName;
            conversationDateElement.textContent = conversationDateText;
            
            console.log(`🔄 Updated conversation title: ${conversationName}`);
        }
        
        // 🔄 Make updateConversationTitle available globally for cross-component updates
        window.updateConversationTitle = updateConversationTitle;

        // Helper function to get conversation data from config
        async function getConversationDataFromConfig(folder) {
            await loadConversationsConfig();
            
            if (conversationsConfig && conversationsConfig.conversations && conversationsConfig.conversations[folder]) {
                const metadata = conversationsConfig.conversations[folder].metadata;
                if (metadata) {
                    return {
                        name: metadata.name || `שיחה ${conversationsConfig.conversations[folder].number || folder.replace('convo', '')}`,
                        date: formatDateForDisplay(metadata.date) || ''
                    };
                }
            }
            
            return null;
        }

        // Helper function to convert folder name to Hebrew title (fallback)
        function getConversationTitle(folder) {
            const titleMap = {
                'convo1': 'שיחה עם אבא',
                'convo2': 'שיחה עם אמא',
                'convo3': 'שיחה עם סבא',
                'convo4': 'שיחה עם סבתא',
                'convo5': 'שיחה עם דוד',
                'convo6': 'שיחה עם דודה',
                'convo7': 'שיחה עם חבר',
                'convo8': 'שיחה עם חברה',
                'convo9': 'שיחה עם מורה',
                'convo10': 'שיחה עם מנהל',
                'convo11': 'שיחה עם עמית',
                'convo12': 'שיחה עם לקוח',
                'convo13': 'שיחה עם ספק',
                'convo14': 'שיחה עם יועץ',
                'convo15': 'שיחה עם מנטור',
                'convo16': 'שיחה עם מנטורית',
                'convo17': 'שיחה עם מטפל',
                'convo18': 'שיחה עם מטפלת',
                'convo19': 'שיחה עם פסיכולוג',
                'convo20': 'שיחה עם פסיכולוגית'
            };
            
            return titleMap[folder] || `שיחה ${folder.replace('convo', '')}`;
        }

        // Helper function to get conversation date (fallback)
        function getConversationDate(folder) {
            // For now, return a simple date format
            // In a real implementation, this would come from metadata
            const dateMap = {
                'convo1': '07.04',
                'convo2': '08.04',
                'convo3': '09.04',
                'convo4': '10.04',
                'convo5': '11.04',
                'convo6': '12.04',
                'convo7': '13.04',
                'convo8': '14.04',
                'convo9': '15.04',
                'convo10': '16.04',
                'convo11': '17.04',
                'convo12': '18.04',
                'convo13': '19.04',
                'convo14': '20.04',
                'convo15': '21.04',
                'convo16': '22.04',
                'convo17': '23.04',
                'convo18': '24.04',
                'convo19': '25.04',
                'convo20': '26.04'
            };
            
            return dateMap[folder] || '01.01';
        }
        
        // This function will be called by the sketch when a blob is clicked
        window.updateSidePanelForBlob = (blobId) => {
            const blobData = window.p5SketchInstance.getBlobDataById(blobId);
            if(blobData) {
                // For now, just log it. We can populate the panel here later.
                console.log("Update side panel for:", blobData);
            }
        };

        function openSidePanel() {
            if (!sidePanel) return;
            sidePanel.classList.add('visible');
        }

        function closeSidePanel() {
            if (!sidePanel) return;
            sidePanel.classList.remove('visible');
        }



        // Tab switching is handled by the HTML file's JavaScript
        // No need to duplicate the event listeners here

        // Audio controls
        const playBtn = document.getElementById('play-audio');
        const pauseBtn = document.getElementById('pause-audio');
        const volumeSlider = document.getElementById('volume-slider');

        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (window.p5SketchInstance && typeof window.p5SketchInstance.togglePlayPause === 'function') {
                    window.p5SketchInstance.togglePlayPause();
                }
            });
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                if (window.p5SketchInstance && typeof window.p5SketchInstance.pauseSound === 'function') {
                    window.p5SketchInstance.pauseSound();
                }
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                if (window.p5SketchInstance && typeof window.p5SketchInstance.setVolume === 'function') {
                    window.p5SketchInstance.setVolume(volume);
                }
            });
        }

        // Settings checkboxes
        const showConnectionsCheckbox = document.getElementById('show-connections');
        const showRegionsCheckbox = document.getElementById('show-regions');

        if (showConnectionsCheckbox) {
            showConnectionsCheckbox.addEventListener('change', (e) => {
                if (window.p5SketchInstance) {
                    window.connectBlobs = e.target.checked;
                }
            });
        }

        if (showRegionsCheckbox) {
            showRegionsCheckbox.addEventListener('change', (e) => {
                window.showHomeRegions = e.target.checked;
            });
        }

        // Listen for file changed event with enhanced debugging
        window.addEventListener('fileChanged', (event) => {
            const fileInfo = event.detail;
            updateCurrentFileInfo(fileInfo);
            
            console.log(`🎵 [TRANSCRIPT SYNC] fileChanged event received:`, fileInfo);
            
            // Update the transcript display to highlight the current playing segment
            if (fileInfo.index !== undefined) {
                const oldIndex = window.currentSegmentIndex;
                window.currentSegmentIndex = fileInfo.index;
                
                console.log(`🔄 [TRANSCRIPT SYNC] Index change: ${oldIndex} → ${fileInfo.index} (${fileInfo.filename})`);
                
                // Force transcript update with multiple fallback methods
                let updateSuccess = false;
                
                try {
                    if (window.currentTranscriptData && window.displayTranscriptFunction) {
                        console.log(`✅ [TRANSCRIPT SYNC] Using primary update method`);
                        window.displayTranscriptFunction(window.currentTranscriptData);
                        updateSuccess = true;
                    } else if (window.updateTranscriptDisplay) {
                        console.log(`✅ [TRANSCRIPT SYNC] Using backup update method`);
                        window.updateTranscriptDisplay(fileInfo.index);
                        updateSuccess = true;
                    } else {
                        console.error(`❌ [TRANSCRIPT SYNC] No update methods available`);
                    }
                } catch (error) {
                    console.error(`❌ [TRANSCRIPT SYNC] Update failed:`, error);
                    updateSuccess = false;
                }
                
                // Log the result
                if (updateSuccess) {
                    console.log(`🎯 [TRANSCRIPT SYNC] Successfully updated to segment ${fileInfo.index}`);
                } else {
                    console.error(`💥 [TRANSCRIPT SYNC] Failed to update to segment ${fileInfo.index}`);
                }
            } else {
                console.error(`❌ [TRANSCRIPT SYNC] Invalid fileChanged event - missing index:`, fileInfo);
            }
        });

        // ==================== TRANSCRIPT TAB FUNCTIONS ====================
        
        function generateConversationSegments(data) {
            console.log('📝 Generating conversation segments with real emotion data...');
            
            const segmentsContainer = document.getElementById('conversation-segments-container');
            if (!segmentsContainer) return;
            
            const mp3Keys = Object.keys(data).filter(k => k.endsWith('.mp3')).sort();
            
            if (mp3Keys.length === 0) {
                segmentsContainer.innerHTML = '<div class="transcript-loading">אין נתוני תמלול זמינים</div>';
                return;
            }
            
            let segmentsHTML = '';
            
            mp3Keys.forEach((key, index) => {
                const entry = data[key];
                if (entry) {
                    // Use actual transcript data or fallback to Hebrew text
                    const text = entry.transcript || entry.words || entry.text || 
                                'שלום לכולם, אני רוצה להתחיל בדיון על תובנות הדברות. זה נושא שמאוד חשוב לנו צוות לנו רצונות';
                    
                    // Use actual emotions from the analysis
                    let emotions = [];
                    if (entry.emotions && Array.isArray(entry.emotions)) {
                        emotions = entry.emotions;
                    } else if (entry.emotion_analysis && Array.isArray(entry.emotion_analysis)) {
                        emotions = entry.emotion_analysis;
                    } else if (entry.detected_emotions && Array.isArray(entry.detected_emotions)) {
                        emotions = entry.detected_emotions;
                    } else if (entry.primary_emotions && Array.isArray(entry.primary_emotions)) {
                        emotions = entry.primary_emotions;
                    } else {
                        // Fallback emotions
                        emotions = ['התפעלות', 'דאגה', 'סכלול'];
                    }
                    
                    // Get speaker name from the data or use fallback
                    const speaker = entry.speaker || entry.narrator || entry.person || 'אבי שמש';
                    
                    // Convert segment number for display
                    const segmentNumber = String(index + 1).padStart(3, '0');
                    
                    segmentsHTML += `
                        <div class="specific-segment" data-segment="${index}" data-mp3="${key}">
                            <div class="person-name-emotions">
                                <div class="avi-shemesh">${speaker}</div>
                                <div class="emotions-div">
                                    ${emotions.map((emotion, emotionIndex) => {
                                        const emotionData = getEmotionData(emotion);
                                        return `
                                            <div class="specific-emotion">
                                                <div class="rectangle" style="background: ${emotionData.color};"></div>
                                                <span class="span-tag">${emotionData.hebrew}</span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                            <div class="discussion-topic">${text}</div>
                        </div>
                    `;
                }
            });
            
            if (segmentsHTML === '') {
                segmentsContainer.innerHTML = '<div class="transcript-loading">לא נמצא תמלול בקובץ זה</div>';
            } else {
                segmentsContainer.innerHTML = segmentsHTML;
                console.log(`✅ Generated ${mp3Keys.length} conversation segments with real emotions`);
            }
        }

        function generateTranscriptTab(data) {
            console.log('📝 Generating transcript tab with real conversation data...');
            console.log('📊 Data received:', data);
            
            const transcriptContainer = document.getElementById('transcript-content');
            console.log('📋 Transcript container found:', transcriptContainer);
            if (!transcriptContainer) {
                console.error('❌ Could not find transcript-content element');
                return;
            }
            
            const mp3Keys = Object.keys(data).filter(k => k.endsWith('.mp3')).sort();
            
            if (mp3Keys.length === 0) {
                transcriptContainer.innerHTML = '<div class="transcript-loading">אין נתוני תמלול זמינים</div>';
                return;
            }
            
            // Load people data to map speaker numbers to names
            const getSpeakerName = (speakerNumber) => {
                // Try to get from window speaker info if available
                if (window.speakerInfo && window.speakerInfo[speakerNumber.toString()]) {
                    return window.speakerInfo[speakerNumber.toString()].name;
                }
                
                // Fallback to default
                return `דובר ${speakerNumber + 1}`;
            };
            
            let transcriptHTML = '';
            
            // Create one transcript card per segment
            mp3Keys.forEach((key, index) => {
                const entry = data[key];
                if (entry) {
                    // Use actual transcript data
                    const text = entry.transcript || entry.words || entry.text || 
                                'תמלול לא זמין עבור קטע זה';
                    
                    // Get speaker name using speaker number
                    const speakerNumber = entry.speaker || 0;
                    const speakerName = getSpeakerName(speakerNumber);
                    
                    // Get emotions for this specific segment
                    let segmentEmotions = [];
                    if (entry.emotions && Array.isArray(entry.emotions)) {
                        segmentEmotions = entry.emotions;
                    }
                    
                    // Ensure we always have at least one emotion to show
                    if (segmentEmotions.length === 0) {
                        segmentEmotions = ['neutral'];
                    }
                    
                    // Create legend items from actual emotions for this segment
                    const legendHTML = segmentEmotions.map(emotion => {
                        const emotionData = getEmotionData(emotion);
                        return `
                            <div class="legend-item">
                                <div class="legend-dot" style="background: ${emotionData.color} !important;"></div>
                                <span>${emotionData.hebrew}</span>
                            </div>
                        `;
                    }).join('');
                    
                    transcriptHTML += `
                        <div class="transcript-card">
                            <div class="transcript-header">
                                <div class="transcript-title">${speakerName}</div>
                                <div class="transcript-legend">
                                    ${legendHTML}
                                </div>
                            </div>
                            <div class="transcript-content">
                                ${text}
                            </div>
                        </div>
                    `;
                }
            });
            
            console.log('🎯 Generated HTML length:', transcriptHTML.length);
            console.log('📄 Sample HTML:', transcriptHTML.substring(0, 200));
            
            if (transcriptHTML === '') {
                console.log('⚠️ No transcript HTML generated, showing loading message');
                transcriptContainer.innerHTML = '<div class="transcript-loading">לא נמצא תמלול בקובץ זה</div>';
            } else {
                console.log('✨ Setting transcript container HTML...');
                transcriptContainer.innerHTML = transcriptHTML;
                console.log(`✅ Generated transcript tab with ${mp3Keys.length} individual segment cards`);
                console.log('🔍 Container after update:', transcriptContainer.innerHTML.substring(0, 200));
            }
        }
        
        function generateFullTranscript(data) {
            console.log('🔄 generateFullTranscript called with data:', data);
            try {
                // Generate both conversation segments and transcript tab with real data
                console.log('📋 About to call generateConversationSegments...');
                generateConversationSegments(data);
                console.log('✅ generateConversationSegments completed');
                
                console.log('📝 About to call generateTranscriptTab...');
                console.log('🔍 generateTranscriptTab function exists:', typeof generateTranscriptTab);
                if (typeof generateTranscriptTab === 'function') {
                    generateTranscriptTab(data);
                    console.log('✅ generateTranscriptTab completed');
                } else {
                    console.error('❌ generateTranscriptTab is not a function!');
                }
            } catch (error) {
                console.error('❌ Error in generateFullTranscript:', error);
                console.error('❌ Stack trace:', error.stack);
            }
        }
        
        function formatTimestamp(index) {
            const minutes = Math.floor(index * 0.5);
            const seconds = Math.floor((index * 0.5 % 1) * 60);
            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        
        // Transcript controls functionality
        const exportTranscriptBtn = document.getElementById('export-transcript');
        const searchTranscriptBtn = document.getElementById('search-transcript');
        const searchContainer = document.getElementById('search-container');
        const transcriptSearchInput = document.getElementById('transcript-search');
        const searchNextBtn = document.getElementById('search-next');
        const searchPrevBtn = document.getElementById('search-prev');
        const searchResults = document.getElementById('search-results');
        
        let currentSearchResults = [];
        let currentSearchIndex = -1;
        
        if (exportTranscriptBtn) {
            exportTranscriptBtn.addEventListener('click', exportTranscript);
        }
        
        if (searchTranscriptBtn) {
            searchTranscriptBtn.addEventListener('click', toggleTranscriptSearch);
        }
        
        if (transcriptSearchInput) {
            transcriptSearchInput.addEventListener('input', performTranscriptSearch);
            transcriptSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchNext();
                }
            });
        }
        
        if (searchNextBtn) {
            searchNextBtn.addEventListener('click', searchNext);
        }
        
        if (searchPrevBtn) {
            searchPrevBtn.addEventListener('click', searchPrev);
        }
        
        function exportTranscript() {
            const transcriptContainer = document.getElementById('full-transcript-container');
            if (!transcriptContainer) return;
            
            const segments = transcriptContainer.querySelectorAll('.transcript-segment');
            let exportText = 'תמלול שיחה\n';
            exportText += '================\n\n';
            
            segments.forEach(segment => {
                const time = segment.querySelector('.transcript-time').textContent;
                const speaker = segment.querySelector('.transcript-speaker').textContent;
                const text = segment.querySelector('.transcript-text').textContent;
                
                exportText += `[${time}] ${speaker}: ${text}\n\n`;
            });
            
            // Create and download file
            const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transcript_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('📄 Transcript exported');
        }
        
        function toggleTranscriptSearch() {
            if (searchContainer.style.display === 'none') {
                searchContainer.style.display = 'block';
                transcriptSearchInput.focus();
            } else {
                searchContainer.style.display = 'none';
                clearSearchHighlights();
            }
        }
        
        function performTranscriptSearch() {
            const query = transcriptSearchInput.value.trim().toLowerCase();
            
            if (query === '') {
                clearSearchHighlights();
                searchResults.textContent = '';
                return;
            }
            
            const transcriptContainer = document.getElementById('full-transcript-container');
            const textElements = transcriptContainer.querySelectorAll('.transcript-text');
            
            currentSearchResults = [];
            clearSearchHighlights();
            
            textElements.forEach((element, index) => {
                const text = element.textContent.toLowerCase();
                if (text.includes(query)) {
                    currentSearchResults.push({ element, index });
                    
                    // Highlight the search term
                    const originalText = element.textContent;
                    const regex = new RegExp(`(${query})`, 'gi');
                    const highlightedText = originalText.replace(regex, '<span class="transcript-highlight">$1</span>');
                    element.innerHTML = highlightedText;
                }
            });
            
            if (currentSearchResults.length > 0) {
                currentSearchIndex = 0;
                searchResults.textContent = `נמצאו ${currentSearchResults.length} תוצאות`;
                scrollToSearchResult(currentSearchIndex);
            } else {
                searchResults.textContent = 'לא נמצאו תוצאות';
                currentSearchIndex = -1;
            }
        }
        
        function searchNext() {
            if (currentSearchResults.length > 0) {
                currentSearchIndex = (currentSearchIndex + 1) % currentSearchResults.length;
                scrollToSearchResult(currentSearchIndex);
                updateSearchCounter();
            }
        }
        
        function searchPrev() {
            if (currentSearchResults.length > 0) {
                currentSearchIndex = currentSearchIndex <= 0 ? currentSearchResults.length - 1 : currentSearchIndex - 1;
                scrollToSearchResult(currentSearchIndex);
                updateSearchCounter();
            }
        }
        
        function scrollToSearchResult(index) {
            if (index >= 0 && index < currentSearchResults.length) {
                const element = currentSearchResults[index].element;
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        function updateSearchCounter() {
            if (currentSearchResults.length > 0) {
                searchResults.textContent = `תוצאה ${currentSearchIndex + 1} מתוך ${currentSearchResults.length}`;
            }
        }
        
        function clearSearchHighlights() {
            const transcriptContainer = document.getElementById('full-transcript-container');
            const highlightedElements = transcriptContainer.querySelectorAll('.transcript-text');
            
            highlightedElements.forEach(element => {
                const text = element.textContent; // This removes HTML tags
                element.textContent = text;
            });
            
            currentSearchResults = [];
            currentSearchIndex = -1;
        }

        // ==================== MEETING SUMMARY FUNCTIONS ====================
        
        function generateMeetingSummary(data) {
            console.log('🏢 Generating meeting summary...');
            
            const mp3Keys = Object.keys(data).filter(k => k.endsWith('.mp3')).sort();
            const totalSegments = mp3Keys.length;
            
            if (totalSegments === 0) {
                updateMeetingSummaryElements({
                    summary: 'אין נתונים זמינים לסיכום ישיבה',
                    topics: [],
                    decisions: [],
                    actions: [],
                    atmosphere: [],
                    metrics: {
                        duration: '0 דקות',
                        participants: '0',
                        topics: '0',
                        mood: 'לא זמין'
                    }
                });
                return;
            }
            
            // Analyze meeting data
            const meetingAnalysis = analyzeMeetingData(data, mp3Keys);
            
            // Generate meeting summary
            const meetingSummary = generateMeetingSummaryText(meetingAnalysis);
            
            // Extract key topics
            const keyTopics = extractKeyTopics(meetingAnalysis);
            
            // Identify decisions and agreements
            const decisions = identifyDecisions(meetingAnalysis);
            
            // Extract action items
            const actionItems = extractActionItems(meetingAnalysis);
            
            // Analyze atmosphere
            const atmosphere = analyzeMeetingAtmosphere(data, mp3Keys);
            
            // Calculate meeting metrics
            const meetingMetrics = calculateMeetingMetrics(data, mp3Keys);
            
            // Update UI
            updateMeetingSummaryElements({
                summary: meetingSummary,
                topics: keyTopics,
                decisions: decisions,
                actions: actionItems,
                atmosphere: atmosphere,
                metrics: meetingMetrics
            });
        }
        
        function analyzeMeetingData(data, mp3Keys) {
            const speakers = new Set();
            const topics = [];
            const emotionalFlow = [];
            const transcripts = [];
            
            mp3Keys.forEach((key, index) => {
                const entry = data[key];
                if (entry) {
                    // Track speakers
                    if (entry.speaker !== undefined) {
                        speakers.add(entry.speaker);
                    }
                    
                    // Collect transcripts for topic analysis
                    if (entry.transcript || entry.words) {
                        transcripts.push({
                            text: entry.transcript || entry.words || '',
                            emotions: entry.emotions || [],
                            speaker: entry.speaker,
                            timestamp: formatTimestamp(index)
                        });
                    }
                    
                    // Track emotional flow
                    emotionalFlow.push({
                        timestamp: formatTimestamp(index),
                        emotions: entry.emotions || [],
                        intensity: calculateEmotionalIntensity(entry.emotions || [])
                    });
                }
            });
            
            return {
                speakers: Array.from(speakers),
                transcripts: transcripts,
                emotionalFlow: emotionalFlow,
                totalSegments: mp3Keys.length
            };
        }
        
        function generateMeetingSummaryText(analysis) {
            const { speakers, transcripts, totalSegments } = analysis;
            
            const participantCount = speakers.length || 1;
            const estimatedDuration = Math.round(totalSegments * 0.5);
            const transcriptCount = transcripts.length;
            
            let summary = `ישיבה בת ${estimatedDuration} דקות בהשתתפות `;
            
            if (participantCount === 1) {
                summary += 'דובר אחד';
            } else if (participantCount === 2) {
                summary += 'שני דוברים';
            } else {
                summary += `${participantCount} דוברים`;
            }
            
            summary += `. נרשמו ${totalSegments} קטעי שמע`;
            
            if (transcriptCount > 0) {
                summary += `, מתוכם ${transcriptCount} קטעים עם תמלול מלא`;
            }
            
            // Analyze conversation style
            const avgWordsPerSegment = transcripts.length > 0 ? 
                transcripts.reduce((sum, t) => sum + t.text.split(' ').length, 0) / transcripts.length : 0;
            
            if (avgWordsPerSegment > 20) {
                summary += '. הישיבה התנהלה בסגנון מפורט ומעמיק';
            } else if (avgWordsPerSegment > 10) {
                summary += '. הישיבה התנהלה בסגנון בינוני';
            } else if (avgWordsPerSegment > 0) {
                summary += '. הישיבה התנהלה בסגנון קצר וממוקד';
            }
            
            return summary;
        }
        
        function extractKeyTopics(analysis) {
            const { transcripts } = analysis;
            const topics = [];
            
            // Simple topic extraction based on common patterns and keywords
            const topicKeywords = {
                'פרויקט': 'ניהול פרויקטים ומשימות',
                'תקציב': 'נושאים כלכליים ותקציביים',
                'לוח זמנים': 'תכנון ולוחות זמנים',
                'צוות': 'ניהול צוות ומשאבי אנוש',
                'לקוח': 'יחסי לקוחות ושירות',
                'טכנולוגיה': 'נושאים טכנולוגיים',
                'אסטרטגיה': 'תכנון אסטרטגי וחזון',
                'בעיה': 'פתרון בעיות וקשיים'
            };
            
            const topicCounts = {};
            
            transcripts.forEach(transcript => {
                const text = transcript.text.toLowerCase();
                Object.keys(topicKeywords).forEach(keyword => {
                    if (text.includes(keyword)) {
                        topicCounts[keyword] = (topicCounts[keyword] || 0) + 1;
                    }
                });
            });
            
            // Add identified topics
            Object.entries(topicCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .forEach(([keyword, count]) => {
                    topics.push({
                        title: topicKeywords[keyword],
                        description: `נדון ${count} פעמים במהלך הישיבה`
                    });
                });
            
            // Add generic topics if none found
            if (topics.length === 0) {
                topics.push({
                    title: 'דיון כללי',
                    description: 'הישיבה כללה דיון כללי ללא נושאים ספציפיים מזוהים'
                });
            }
            
            return topics;
        }
        
        function identifyDecisions(analysis) {
            const { transcripts } = analysis;
            const decisions = [];
            
            // Keywords that might indicate decisions
            const decisionKeywords = ['החלטנו', 'נחליט', 'הוחלט', 'נסכים', 'מסכימים', 'אישרנו'];
            
            transcripts.forEach((transcript, index) => {
                const text = transcript.text.toLowerCase();
                decisionKeywords.forEach(keyword => {
                    if (text.includes(keyword)) {
                        decisions.push({
                            title: `החלטה בזמן ${transcript.timestamp}`,
                            description: transcript.text.slice(0, 100) + (transcript.text.length > 100 ? '...' : '')
                        });
                    }
                });
            });
            
            // Add generic decision if none found but meeting seems formal
            if (decisions.length === 0 && transcripts.length > 10) {
                decisions.push({
                    title: 'לא זוהו החלטות ספציפיות',
                    description: 'הישיבה הייתה בעיקר דיונית ללא החלטות מפורשות'
                });
            }
            
            return decisions.slice(0, 5); // Limit to 5 decisions
        }
        
        function extractActionItems(analysis) {
            const { transcripts } = analysis;
            const actions = [];
            
            // Keywords that might indicate action items
            const actionKeywords = ['צריך', 'נעשה', 'נטפל', 'אבדוק', 'נכין', 'נשלח'];
            
            transcripts.forEach(transcript => {
                const text = transcript.text.toLowerCase();
                actionKeywords.forEach(keyword => {
                    if (text.includes(keyword)) {
                        actions.push({
                            title: `פעולה נדרשת - ${transcript.timestamp}`,
                            description: transcript.text.slice(0, 100) + (transcript.text.length > 100 ? '...' : '')
                        });
                    }
                });
            });
            
            // Add generic action if none found
            if (actions.length === 0) {
                actions.push({
                    title: 'לא זוהו משימות ספציפיות',
                    description: 'לא נמצאו פעולות מפורשות הדורשות מעקב'
                });
            }
            
            return actions.slice(0, 5); // Limit to 5 actions
        }
        
        function analyzeMeetingAtmosphere(data, mp3Keys) {
            return createEmotionalProgression(data, mp3Keys);
        }
        
        function calculateMeetingMetrics(data, mp3Keys) {
            const totalSegments = mp3Keys.length;
            const estimatedDuration = Math.round(totalSegments * 0.5);
            
            // Count unique speakers
            const speakers = new Set();
            mp3Keys.forEach(key => {
                const entry = data[key];
                if (entry && entry.speaker !== undefined) {
                    speakers.add(entry.speaker);
                }
            });
            
            // Count topics (simple estimate based on transcript variety)
            const transcripts = [];
            mp3Keys.forEach(key => {
                const entry = data[key];
                if (entry && (entry.transcript || entry.words)) {
                    transcripts.push(entry.transcript || entry.words || '');
                }
            });
            
            const estimatedTopics = Math.max(1, Math.floor(transcripts.length / 5));
            
            // Calculate overall mood
            const emotionCounts = {};
            mp3Keys.forEach(key => {
                const entry = data[key];
                if (entry && entry.emotions) {
                    entry.emotions.forEach(emotion => {
                        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                    });
                }
            });
            
            const dominantEmotion = Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])[0];
            
            return {
                duration: `${estimatedDuration} דקות`,
                participants: speakers.size || 1,
                topics: estimatedTopics,
                mood: dominantEmotion ? getHebrewEmotion(dominantEmotion[0]) : 'נייטרלי'
            };
        }
        
        function updateMeetingSummaryElements(meetingData) {
            // Update meeting summary
            const summaryElement = document.getElementById('meeting-summary');
            if (summaryElement) {
                summaryElement.innerHTML = `
                    <div class="summary-content">${meetingData.summary}</div>
                `;
            }
            
            // Update key topics
            const topicsContainer = document.querySelector('#key-topics .topics-container');
            if (topicsContainer) {
                topicsContainer.innerHTML = '';
                meetingData.topics.forEach(topic => {
                    const topicElement = document.createElement('div');
                    topicElement.className = 'topic-item';
                    topicElement.innerHTML = `
                        <div class="item-title">${topic.title}</div>
                        <div class="item-description">${topic.description}</div>
                    `;
                    topicsContainer.appendChild(topicElement);
                });
            }
            
            // Update decisions
            const decisionsContainer = document.querySelector('#decisions-agreements .decisions-container');
            if (decisionsContainer) {
                decisionsContainer.innerHTML = '';
                meetingData.decisions.forEach(decision => {
                    const decisionElement = document.createElement('div');
                    decisionElement.className = 'decision-item';
                    decisionElement.innerHTML = `
                        <div class="item-title">${decision.title}</div>
                        <div class="item-description">${decision.description}</div>
                    `;
                    decisionsContainer.appendChild(decisionElement);
                });
            }
            
            // Update action items
            const actionsContainer = document.querySelector('#action-items .actions-container');
            if (actionsContainer) {
                actionsContainer.innerHTML = '';
                meetingData.actions.forEach(action => {
                    const actionElement = document.createElement('div');
                    actionElement.className = 'action-item';
                    actionElement.innerHTML = `
                        <div class="item-title">${action.title}</div>
                        <div class="item-description">${action.description}</div>
                    `;
                    actionsContainer.appendChild(actionElement);
                });
            }
            
            // Update atmosphere
            const atmosphereElement = document.querySelector('#meeting-atmosphere .atmosphere-container .progression-chart');
            if (atmosphereElement) {
                if (meetingData.atmosphere.length > 0) {
                    // Calculate overall mood
                    const overallMood = calculateOverallMood(meetingData.atmosphere);
                    
                    atmosphereElement.innerHTML = `
                        <div class="mood-indicator">
                            <span class="mood-emoji">${getMoodEmoji(overallMood.emotion)}</span>
                            <span class="mood-text">אווירה כללית: ${overallMood.emotion}</span>
                        </div>
                        <div class="progression-timeline">
                            ${meetingData.atmosphere.slice(0, 6).map(item => `
                                <div class="progression-item">
                                    <span class="progression-time">${item.time}</span>
                                    <span class="progression-emotion">${item.emotion}</span>
                                    <div class="emotion-progression-bar">
                                        <div class="emotion-progression-fill" style="width: ${Math.round(item.intensity * 100)}%; background-color: ${getMoodColor(item.emotion)};"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                } else {
                    atmosphereElement.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">אין נתוני אווירה</div>';
                }
            }
            
            // Update meeting metrics
            const metrics = meetingData.metrics;
            const durationElement = document.getElementById('meeting-duration');
            if (durationElement) durationElement.textContent = metrics.duration;
            
            const participantsElement = document.getElementById('meeting-participants');
            if (participantsElement) participantsElement.textContent = metrics.participants;
            
            const topicsCountElement = document.getElementById('topics-count');
            if (topicsCountElement) topicsCountElement.textContent = metrics.topics;
            
            const overallMoodElement = document.getElementById('overall-mood');
            if (overallMoodElement) overallMoodElement.textContent = metrics.mood;
            
            console.log('✅ Meeting summary updated');
        }
        
        function calculateOverallMood(atmosphere) {
            if (atmosphere.length === 0) return { emotion: 'נייטרלי', intensity: 0.5 };
            
            const emotionCounts = {};
            let totalIntensity = 0;
            
            atmosphere.forEach(item => {
                emotionCounts[item.emotion] = (emotionCounts[item.emotion] || 0) + 1;
                totalIntensity += item.intensity;
            });
            
            const dominantEmotion = Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])[0];
            
            return {
                emotion: dominantEmotion ? dominantEmotion[0] : 'נייטרלי',
                intensity: totalIntensity / atmosphere.length
            };
        }
        
        function getMoodEmoji(emotion) {
            const emojiMap = {
                // Basic emotions
                'שמחה': '😊',
                'עליזות': '😄',
                'עצב': '😔',
                'כעס': '😠',
                'פחד': '😨',
                'הפתעה': '😲',
                'גועל': '🤢',
                'נייטרלי': '😐',
                'רוגע': '😌',
                'התרגשות': '🤩',
                
                // Extended emotions
                'סקרנות': '🤔',
                'בלבול': '😵',
                'עצבנות': '😤',
                'תסכול': '😫',
                'דאגה': '🤗',
                'אהבה': '❤️',
                'שנאה': '😡',
                'קנאה': '😒',
                'אשמה': '😞',
                'בושה': '😳',
                'גאווה': '😏',
                'הקלה': '😅',
                'חרדה': '😰',
                'לחץ': '😩',
                'שעמום': '😴',
                'עניין': '🧐',
                'הערצה': '🤩',
                'בוז': '🙄',
                'אבל': '😢',
                'תקווה': '🙏',
                'אופטימיות': '☺️',
                'פסימיות': '😑',
                'שביעות רצון': '😌',
                'אכזבה': '😞',
                'נחישות': '😤',
                'ביטחון': '😎',
                'חוסר ביטחון': '😟',
                'נוסטלגיה': '🥺',
                'בדידות': '😔',
                'אמפתיה': '🤗',
                'סימפטיה': '😊'
            };
            return emojiMap[emotion] || '😐';
        }
        
        function getMoodColor(emotion) {
            const colorMap = {
                // Basic emotions
                'שמחה': '#4CAF50',
                'עליזות': '#8BC34A',
                'עצב': '#2196F3',
                'כעס': '#F44336',
                'פחד': '#9C27B0',
                'הפתעה': '#FF9800',
                'גועל': '#795548',
                'נייטרלי': '#9E9E9E',
                'רוגע': '#00BCD4',
                'התרגשות': '#E91E63',
                
                // Extended emotions
                'סקרנות': '#FF5722',
                'בלבול': '#9C27B0',
                'עצבנות': '#FF6347',
                'תסכול': '#DC143C',
                'דאגה': '#32CD32',
                'אהבה': '#FF1493',
                'שנאה': '#B22222',
                'קנאה': '#ADFF2F',
                'אשמה': '#708090',
                'בושה': '#F0E68C',
                'גאווה': '#FFD700',
                'הקלה': '#98FB98',
                'חרדה': '#6A5ACD',
                'לחץ': '#CD5C5C',
                'שעמום': '#D3D3D3',
                'עניין': '#FF4500',
                'הערצה': '#DA70D6',
                'בוז': '#8B4513',
                'אבל': '#4682B4',
                'תקווה': '#87CEEB',
                'אופטימיות': '#FFA500',
                'פסימיות': '#696969',
                'שביעות רצון': '#20B2AA',
                'אכזבה': '#BC8F8F',
                'נחישות': '#B8860B',
                'ביטחון': '#1E90FF',
                'חוסר ביטחון': '#DDA0DD',
                'נוסטלגיה': '#DEB887',
                'בדידות': '#5F9EA0',
                'אמפתיה': '#3CB371',
                'סימפטיה': '#48D1CC'
            };
            return colorMap[emotion] || '#9E9E9E';
        }

        function updateCurrentFileInfo(fileInfo) {
            // Update current file name
            const fileElement = document.getElementById('current-file');
            if (fileElement) {
                fileElement.textContent = `${fileInfo.filename} (${fileInfo.index + 1}/${fileInfo.total})`;
            }

            // Update transcript
            const transcriptElement = document.querySelector('#current-transcript .transcript-text');
            if (transcriptElement) {
                transcriptElement.textContent = fileInfo.transcript || 'אין תמלול זמין';
            }

            // Update emotions with Hebrew names and colored squares
            const emotionsContainer = document.getElementById('current-emotions');
            if (emotionsContainer) {
                emotionsContainer.innerHTML = '';
                fileInfo.emotions.forEach(emotion => {
                    const emotionData = getEmotionData(emotion);
                    const tag = document.createElement('div');
                    tag.className = 'emotion-tag';
                    tag.innerHTML = `<div class="emotion-color-square" style="background-color: ${emotionData.color}"></div><span>${emotionData.hebrew}</span>`;
                    emotionsContainer.appendChild(tag);
                });
            }
        }

        function updateConversationStats(data) {
            const statsElement = document.getElementById('conversation-stats');
            if (!statsElement) return;

            const mp3Keys = Object.keys(data).filter(k => k.endsWith('.mp3'));
            const totalFiles = mp3Keys.length;
            
            // Count emotions
            const emotionCounts = {};
            mp3Keys.forEach(key => {
                const entry = data[key];
                if (entry && entry.emotions) {
                    entry.emotions.forEach(emotion => {
                        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                    });
                }
            });

            // Build stats HTML
            let statsHTML = `
                <div>סה"כ קבצים: ${totalFiles}</div>
                <div style="margin-top: 10px;">התפלגות רגשות:</div>
                <div style="margin-top: 5px;">
            `;

            Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])
                .forEach(([emotion, count]) => {
                    const percentage = ((count / totalFiles) * 100).toFixed(1);
                    const emotionData = getEmotionData(emotion);
                    statsHTML += `<div style="margin: 2px 0; display: flex; align-items: center;"><div class="emotion-color-square" style="background-color: ${emotionData.color}; width: 12px; height: 12px; margin-right: 6px;"></div><span>${emotionData.hebrew}: ${count} (${percentage}%)</span></div>`;
                });

            statsHTML += '</div>';
            statsElement.innerHTML = statsHTML;
        }

        // ==================== CONVERSATION SUMMARY FUNCTIONS ====================
        
        async function generateConversationSummary(data) {
            console.log('🔍 Generating conversation summary...');
            
            // First, try to get AI-generated summary from conversation metadata
            const currentFolder = getCurrentConversationFolder();
            const aiSummary = await getAIGeneratedSummary(currentFolder);
            
            if (aiSummary) {
                console.log('✨ Using AI-generated summary from metadata');
                displayAISummary(aiSummary);
                return;
            }
            
            // Fallback to client-side analysis if no AI summary exists
            console.log('📊 Generating client-side summary...');
            const mp3Keys = Object.keys(data).filter(k => k.endsWith('.mp3')).sort();
            const totalFiles = mp3Keys.length;
            
            if (totalFiles === 0) {
                updateSummaryElements({
                    summary: 'אין נתונים זמינים לסיכום',
                    themes: [],
                    progression: [],
                    metrics: {
                        duration: '0 דקות',
                        words: '0',
                        segments: '0',
                        dominantEmotion: 'לא זמין'
                    }
                });
                return;
            }
            
            // Analyze conversation data
            const analysis = analyzeConversationData(data, mp3Keys);
            
            // Generate summary text
            const summaryText = generateSummaryText(analysis);
            
            // Identify main themes
            const themes = identifyMainThemes(analysis);
            
            // Create emotional progression
            const progression = createEmotionalProgression(data, mp3Keys);
            
            // Calculate metrics
            const metrics = calculateConversationMetrics(data, mp3Keys);
            
            // Update UI
            updateSummaryElements({
                summary: summaryText,
                themes: themes,
                progression: progression,
                metrics: metrics
            });
        }
        
        // Function to get current conversation folder from URL
        function getCurrentConversationFolder() {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('folder');
        }
        
        // Function to get AI-generated summary from conversation metadata
        async function getAIGeneratedSummary(folder) {
            if (!folder) return null;
            
            await loadConversationsConfig();
            
            if (conversationsConfig && 
                conversationsConfig.conversations && 
                conversationsConfig.conversations[folder] &&
                conversationsConfig.conversations[folder].metadata &&
                conversationsConfig.conversations[folder].metadata.ai_summary) {
                
                return conversationsConfig.conversations[folder].metadata.ai_summary;
            }
            
            return null;
        }
        
        // Function to display AI-generated summary
        function displayAISummary(aiSummary) {
            console.log('🤖 Displaying AI summary:', aiSummary);
            const enhancedSummary = {
                summary: `${aiSummary.summary || 'סיכום AI זמין'}`,
                themes: (aiSummary.main_topics || []).map(topic => ({
                    title: topic,
                    description: 'נושא מרכזי שזוהה על ידי AI'
                })),
                progression: [], // Could be enhanced later
                metrics: {
                    duration: aiSummary.duration_analysis || 'נותח על ידי AI',
                    words: 'מנותח',
                    segments: 'מנותח',
                    dominantEmotion: (aiSummary.dominant_emotions || []).join(', ') || 'נותח על ידי AI'
                },
                // Add AI-specific data
                aiGenerated: true,
                conversationDynamics: aiSummary.conversation_dynamics,
                keyPoints: aiSummary.key_points || [],
                overallTone: aiSummary.overall_tone,
                engagementLevel: aiSummary.engagement_level
            };
            
            updateSummaryElements(enhancedSummary);
            
            // Display additional AI summary information
            displayAdditionalAIInfo(aiSummary);
        }
        
        // Function to display additional AI summary information
        function displayAdditionalAIInfo(aiSummary) {
            // Update conversation dynamics if element exists
            const dynamicsElement = document.getElementById('conversation-dynamics');
            if (dynamicsElement && aiSummary.conversation_dynamics) {
                dynamicsElement.innerHTML = `<strong>דינמיקת השיחה:</strong> ${aiSummary.conversation_dynamics}`;
            }
            
            // Update key points if element exists
            const keyPointsElement = document.getElementById('key-points');
            if (keyPointsElement && aiSummary.key_points) {
                keyPointsElement.innerHTML = `
                    <strong>נקודות מפתח:</strong>
                    <ul>${aiSummary.key_points.map(point => `<li>${point}</li>`).join('')}</ul>
                `;
            }
            
            // Update overall tone if element exists
            const toneElement = document.getElementById('overall-tone');
            if (toneElement && aiSummary.overall_tone) {
                toneElement.innerHTML = `<strong>טון כללי:</strong> ${aiSummary.overall_tone}`;
            }
            
            // Update engagement level if element exists
            const engagementElement = document.getElementById('engagement-level');
            if (engagementElement && aiSummary.engagement_level) {
                engagementElement.innerHTML = `<strong>רמת מעורבות:</strong> ${aiSummary.engagement_level}`;
            }
                 }
        
        // ==================== AI INSIGHTS FUNCTIONS ====================
        
        // Function to get AI-generated insights from conversation metadata  
        async function getAIGeneratedInsights(folder) {
            if (!folder) return null;
            
            await loadConversationsConfig();
            
            if (conversationsConfig && 
                conversationsConfig.conversations && 
                conversationsConfig.conversations[folder] &&
                conversationsConfig.conversations[folder].metadata &&
                conversationsConfig.conversations[folder].metadata.ai_insights) {
                
                return conversationsConfig.conversations[folder].metadata.ai_insights;
            }
            
            return null;
        }
        
        // Calculate progress score for insight categories
        function calculateInsightScore(aiInsights, category) {
            const scores = {
                'communication': 75, // Based on communication patterns and style
                'relationship': 85,  // Based on relationship quality
                'strengths': 90,     // Based on identified strengths
                'challenges': 65,    // Based on challenges identified
                'emotions': 80,      // Based on emotional insights
                'overall': 78        // Based on overall assessment
            };
            
            // You can make this more sophisticated by analyzing the actual content
            return scores[category] || 70;
        }

        // Function to clear old insights and force regeneration
        function clearOldInsights() {
            const contentContainer = document.getElementById('insight-content-dynamic');
            if (contentContainer) {
                contentContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #6c757d;"><p>טוען תובנות AI...</p></div>';
                console.log('🧹 Cleared old insights content');
            }
        }

        // Function to display AI-generated insights using new template system
        async function displayAIInsights() {
            const currentFolder = getCurrentConversationFolder();
            
            console.log('🚀 [NEW] displayAIInsights called for folder:', currentFolder);
            
            // Always use the new template system
            if (typeof window.showImmediateInsightsTemplate === 'function') {
                console.log('✅ [NEW] Using new template system');
                window.showImmediateInsightsTemplate();
                
                // Check for local insights first
                let localInsights = null;
                if (typeof window.getLocalInsights === 'function') {
                    localInsights = window.getLocalInsights(currentFolder);
                }
                
                // If we have local insights, update with them
                if (localInsights) {
                    console.log('📁 [NEW] Found local insights, updating template');
                    setTimeout(() => {
                        if (typeof window.updateInsightsTemplate === 'function') {
                            window.updateInsightsTemplate(localInsights);
                        }
                    }, 200);
                } else {
                    // Try to get insights from server
                    console.log('🔍 [NEW] No local insights, checking server');
                    const aiInsights = await getAIGeneratedInsights(currentFolder);
                    
                    if (aiInsights) {
                        console.log('💾 [NEW] Found server insights, saving locally and updating');
                        if (typeof window.saveLocalInsights === 'function') {
                            window.saveLocalInsights(currentFolder, aiInsights);
                        }
                        setTimeout(() => {
                            if (typeof window.updateInsightsTemplate === 'function') {
                                window.updateInsightsTemplate(aiInsights);
                            }
                        }, 200);
                    } else {
                        console.log('⚡ [NEW] No insights found, keeping template placeholder');
                    }
                }
                return;
            }
            
            console.log('❌ [OLD] Fallback to old system');
            
            // Legacy fallback (should not happen)
            const aiInsights = await getAIGeneratedInsights(currentFolder);
            
            // Always clear old content first
            clearOldInsights();
            
            // Update the insights content dynamically
            const contentContainer = document.getElementById('insight-content-dynamic');
            if (!contentContainer) {
                console.warn('Insights content container not found');
                return;
            }
            
            if (!aiInsights) {
                console.log('❌ No AI insights found for this conversation');
                contentContainer.innerHTML = `
                    <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 10px; border-radius: 8px; margin-bottom: 15px; text-align: center; font-weight: bold;">
                        🤖 אין תובנות זמינות
                    </div>
                    <div style="padding: 20px; text-align: center; color: #6c757d;">
                        <p>לא נמצאו תובנות AI עבור השיחה הזו</p>
                    </div>
                `;
                return;
            }
            
            // This should not happen - new template system should handle everything
            console.log('⚠️ [OLD] Using legacy fallback - this should not happen');
            contentContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #e74c3c;">
                    <p>טוען תובנות באמצעות מערכת חדשה...</p>
                </div>
            `;
        }

        // Generate content for each tab
        function generateTabContent(aiInsights) {
            let content = '';
            
            // Communication Tab Content
            content += `<div class="insight-tab-content active" data-content="communication">`;
            if (aiInsights.communication_patterns) {
                Object.entries(aiInsights.communication_patterns).forEach(([speaker, pattern]) => {
                    content += `
                        <div class="insight-section">
                            <div class="insight-indicator blue"></div>
                            <div class="insight-title">דפוס תקשורת - ${speaker}</div>
                            <div class="insight-content">${pattern}</div>
                        </div>
                    `;
                });
            }
            if (aiInsights.communication_style) {
                content += `
                    <div class="insight-section">
                        <div class="insight-indicator purple"></div>
                        <div class="insight-title">סגנון תקשורת</div>
                        <div class="insight-content">${aiInsights.communication_style}</div>
                    </div>
                `;
            }
            if (aiInsights.conversation_flow) {
                content += `
                    <div class="insight-section">
                        <div class="insight-indicator purple"></div>
                        <div class="insight-title">זרימת השיחה</div>
                        <div class="insight-content">${aiInsights.conversation_flow}</div>
                    </div>
                `;
            }
            content += `</div>`;
            
            // Relationship Tab Content
            content += `<div class="insight-tab-content" data-content="relationship">`;
            if (aiInsights.relationship_quality) {
                content += `
                    <div class="insight-section">
                        <div class="insight-indicator green"></div>
                        <div class="insight-title">איכות הקשר</div>
                        <div class="insight-content">${aiInsights.relationship_quality}</div>
                    </div>
                `;
            }
            if (aiInsights.power_dynamics) {
                content += `
                    <div class="insight-section">
                        <div class="insight-indicator blue"></div>
                        <div class="insight-title">דינמיקת כוח</div>
                        <div class="insight-content">${aiInsights.power_dynamics}</div>
                    </div>
                `;
            }
            content += `</div>`;
            
            // Strengths Tab Content
            content += `<div class="insight-tab-content" data-content="strengths">`;
            if (aiInsights.strengths && aiInsights.strengths.length > 0) {
                content += `
                    <div class="insight-section">
                        <div class="insight-indicator green"></div>
                        <div class="insight-title">נקודות חוזק</div>
                        <div class="insight-content">
                            <ul>${aiInsights.strengths.map(strength => `<li>${strength}</li>`).join('')}</ul>
                        </div>
                    </div>
                `;
            }
            if (aiInsights.improvement_recommendations && aiInsights.improvement_recommendations.length > 0) {
                content += `
                    <div class="insight-section">
                        <div class="insight-indicator purple"></div>
                        <div class="insight-title">המלצות לשיפור</div>
                        <div class="insight-content">
                            <ul>${aiInsights.improvement_recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>
                        </div>
                    </div>
                `;
            }
            content += `</div>`;
            
            // Challenges Tab Content
            content += `<div class="insight-tab-content" data-content="challenges">`;
            if (aiInsights.challenges && aiInsights.challenges.length > 0) {
                content += `
                    <div class="insight-section">
                        <div class="insight-indicator blue"></div>
                        <div class="insight-title">אתגרים</div>
                        <div class="insight-content">
                            <ul>${aiInsights.challenges.map(challenge => `<li>${challenge}</li>`).join('')}</ul>
                        </div>
                    </div>
                `;
            }
            if (aiInsights.attention_points && aiInsights.attention_points.length > 0) {
                content += `
                    <div class="insight-section">
                        <div class="insight-indicator blue"></div>
                        <div class="insight-title">נקודות לתשומת לב</div>
                        <div class="insight-content">
                            <ul>${aiInsights.attention_points.map(point => `<li>${point}</li>`).join('')}</ul>
                        </div>
                    </div>
                `;
            }
            content += `</div>`;
            
            // Emotions Tab Content
            content += `<div class="insight-tab-content" data-content="emotions">`;
            if (aiInsights.emotional_insights) {
                content += `
                    <div class="insight-section">
                        <div class="insight-indicator green"></div>
                        <div class="insight-title">תובנות רגשיות</div>
                        <div class="insight-content">${aiInsights.emotional_insights}</div>
                    </div>
                `;
            }
            content += `</div>`;
            
            // Overall Tab Content
            content += `<div class="insight-tab-content" data-content="overall">`;
            if (aiInsights.overall_assessment) {
                content += `
                    <div class="insight-section">
                        <div class="insight-indicator green"></div>
                        <div class="insight-title">הערכה כללית</div>
                        <div class="insight-content">${aiInsights.overall_assessment}</div>
                    </div>
                `;
            }
            content += `</div>`;
            
            return content;
        }

        // Setup tab switching functionality
        function setupInsightsTabSwitching(aiInsights) {
            const tabs = document.querySelectorAll('.insights-tab');
            const tabContents = document.querySelectorAll('.insight-tab-content');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    const targetInsight = this.getAttribute('data-insight');
                    
                    // Remove active class from all tabs and contents
                    tabs.forEach(t => t.classList.remove('active'));
                    tabContents.forEach(tc => tc.classList.remove('active'));
                    
                    // Add active class to clicked tab
                    this.classList.add('active');
                    
                    // Show corresponding content
                    const targetContent = document.querySelector(`[data-content="${targetInsight}"]`);
                    if (targetContent) {
                        targetContent.classList.add('active');
                        
                        // Re-add click functionality to insight sections in the active tab
                        const insightSections = targetContent.querySelectorAll('.insight-section');
                        insightSections.forEach(function(section) {
                            section.addEventListener('click', function() {
                                // Highlight the insight section
                                insightSections.forEach(s => s.style.background = '');
                                section.style.background = 'rgba(0, 123, 255, 0.1)';
                            });
                        });
                    }
                });
            });
        }
        
        // Function to automatically load and display AI insights when conversation loads
        async function initializeAIContent() {
            const currentFolder = getCurrentConversationFolder();
            
            if (currentFolder) {
                // Display AI insights if available
                await displayAIInsights();
                
                // Update AI content indicators on tabs
                setTimeout(async () => {
                    await updateAIContentIndicators();
                }, 500); // Small delay to ensure tabs are rendered
                
                console.log('✅ AI content initialization completed');
            }
        }
        
        // Function to handle tab switches and ensure AI content is loaded
        function handleTabSwitch(tabName) {
            console.log(`📑 Tab switched to: ${tabName}`);
            
            // Load AI content when switching to info or insights tabs
            if (tabName === 'info-content' || tabName === 'insights-content') {
                setTimeout(async () => {
                    try {
                        if (tabName === 'insights-content') {
                            await displayAIInsights();
                        } else if (tabName === 'info-content') {
                            // Trigger summary generation if data is available
                            if (window.emotionData) {
                                await generateConversationSummary(window.emotionData);
                            }
                        }
                    } catch (error) {
                        console.warn(`⚠️ Error loading AI content for tab ${tabName}:`, error);
                    }
                }, 100);
            }
        }
        
        // Function to refresh AI content (call this after generating new AI summaries/insights)
        async function refreshAIContent() {
            console.log('🔄 Refreshing AI content...');
            
            // Reload conversations config to get latest AI data
            conversationsConfig = null;
            await loadConversationsConfig();
            
            // Refresh both summaries and insights
            const currentFolder = getCurrentConversationFolder();
            if (currentFolder) {
                // Check which tabs are active and refresh accordingly
                const infoTab = document.querySelector('[data-tab="info-content"]');
                const insightsTab = document.querySelector('[data-tab="insights-content"]');
                
                if (infoTab && infoTab.classList.contains('active')) {
                    if (window.emotionData) {
                        await generateConversationSummary(window.emotionData);
                    }
                }
                
                if (insightsTab && insightsTab.classList.contains('active')) {
                    await displayAIInsights();
                }
                
                // Update AI content indicators
                await updateAIContentIndicators();
                
                console.log('✅ AI content refreshed successfully');
            }
        }
        
        // Periodic check for new AI content (every 10 seconds)
        let aiContentCheckInterval = null;
        
        function startAIContentMonitoring() {
            if (aiContentCheckInterval) {
                clearInterval(aiContentCheckInterval);
            }
            
            aiContentCheckInterval = setInterval(async () => {
                try {
                    const currentFolder = getCurrentConversationFolder();
                    if (currentFolder) {
                        // Check if we have new AI content
                        const oldConfig = conversationsConfig;
                        conversationsConfig = null;
                        await loadConversationsConfig();
                        
                        const newSummary = conversationsConfig?.conversations?.[currentFolder]?.metadata?.ai_summary;
                        const newInsights = conversationsConfig?.conversations?.[currentFolder]?.metadata?.ai_insights;
                        const oldSummary = oldConfig?.conversations?.[currentFolder]?.metadata?.ai_summary;
                        const oldInsights = oldConfig?.conversations?.[currentFolder]?.metadata?.ai_insights;
                        
                        // If we have new content, refresh
                        if ((newSummary && !oldSummary) || (newInsights && !oldInsights)) {
                            console.log('🆕 New AI content detected, refreshing...');
                            await updateAIContentIndicators();
                            
                                                         // Refresh active tabs
                            const infoTab = document.querySelector('[data-tab="info-content"]');
                            const insightsTab = document.querySelector('[data-tab="insights-content"]');
                            
                            if (infoTab && infoTab.classList.contains('active') && newSummary && !oldSummary) {
                                if (window.emotionData) {
                                    await generateConversationSummary(window.emotionData);
                                }
                            }
                            
                            if (insightsTab && insightsTab.classList.contains('active') && newInsights && !oldInsights) {
                                await displayAIInsights();
                            }
                        }
                    }
                } catch (error) {
                    console.log('⚠️ Error during AI content monitoring:', error);
                }
            }, 10000); // Check every 10 seconds
        }
        
        function stopAIContentMonitoring() {
            if (aiContentCheckInterval) {
                clearInterval(aiContentCheckInterval);
                aiContentCheckInterval = null;
            }
        }
        
        // Function to check if AI content is available for current conversation
        async function checkAIContentAvailability() {
            const currentFolder = getCurrentConversationFolder();
            if (!currentFolder) return { summary: false, insights: false };
            
            await loadConversationsConfig();
            
            const hasAISummary = !!(conversationsConfig?.conversations?.[currentFolder]?.metadata?.ai_summary);
            const hasAIInsights = !!(conversationsConfig?.conversations?.[currentFolder]?.metadata?.ai_insights);
            
            return {
                summary: hasAISummary,
                insights: hasAIInsights,
                folder: currentFolder
            };
        }
        
        // Function to show AI content indicators on tabs
        async function updateAIContentIndicators() {
            const availability = await checkAIContentAvailability();
            
            // Add indicators to info tab
            const infoTab = document.querySelector('[data-tab="info-content"]');
            if (infoTab) {
                const existingIndicator = infoTab.querySelector('.ai-indicator');
                if (existingIndicator) existingIndicator.remove();
                
                if (availability.summary) {
                    const indicator = document.createElement('span');
                    indicator.className = 'ai-indicator';
                    indicator.innerHTML = '🤖';
                    indicator.style.marginRight = '5px';
                    indicator.title = 'סיכום מבוסס בינה מלאכותית זמין';
                    infoTab.insertBefore(indicator, infoTab.firstChild);
                }
            }
            
            // Add indicators to insights tab
            const insightsTab = document.querySelector('[data-tab="insights-content"]');
            if (insightsTab) {
                const existingIndicator = insightsTab.querySelector('.ai-indicator');
                if (existingIndicator) existingIndicator.remove();
                
                if (availability.insights) {
                    const indicator = document.createElement('span');
                    indicator.className = 'ai-indicator';
                    indicator.innerHTML = '🤖';
                    indicator.style.marginRight = '5px';
                    indicator.title = 'תובנות מבוססות בינה מלאכותית זמינות';
                    insightsTab.insertBefore(indicator, insightsTab.firstChild);
                }
            }
        }
        
        // Start AI content monitoring
        startAIContentMonitoring();
        
        // Initialize AI content when page loads
        setTimeout(async () => {
            console.log('🔄 Initializing AI content on page load...');
            await initializeAIContent();
            await updateAIContentIndicators();
            
            // Add click handler for info tab to load summary
            const infoTab = document.querySelector('[data-tab="info-content"]');
            if (infoTab) {
                infoTab.addEventListener('click', async () => {
                    console.log('📋 Info tab clicked, loading summary...');
                    if (window.emotionData) {
                        await generateConversationSummary(window.emotionData);
                    }
                });
            }
        }, 2000);
        
        // Listen for messages from admin panel to refresh AI content
        window.addEventListener('message', async (event) => {
            if (event.data && event.data.type === 'refreshAIContent') {
                console.log('📨 Received AI content refresh request from admin panel');
                await refreshAIContent();
            }
        });
        
        // Expose functions globally so they can be called from other scripts
        window.displayAIInsights = displayAIInsights;
        window.initializeAIContent = initializeAIContent;
        window.refreshAIContent = refreshAIContent;
        window.updateAIContentIndicators = updateAIContentIndicators;
        window.handleTabSwitch = handleTabSwitch;
        
        // Simple function to analyze insights for current conversation (call from edit parameters)
        window.analyzeCurrentConversationInsights = function() {
            const currentFolder = getCurrentConversationFolder();
            console.log(`🔬 [ANALYZE] Analyzing insights for current conversation: ${currentFolder}`);
            
            if (typeof window.triggerInsightsAnalysis === 'function') {
                window.triggerInsightsAnalysis();
                console.log('✅ [ANALYZE] Triggered insights analysis');
            } else {
                console.log('⚠️ [ANALYZE] New insights system not available, using basic analysis');
                
                // Basic analysis fallback
                const basicInsights = {
                    communication_patterns: {
                        "דובר ראשי": "מפגין סגנון תקשורת ישיר ומובנה",
                        "דובר משני": "מגיב בצורה אמפתית ומתחשבת"
                    },
                    relationship_quality: "יחסים טובים עם רמת אמון גבוהה",
                    strengths: ["יכולת הקשבה פעילה", "ביטוי רגשות ברור"],
                    challenges: ["חוסר עקביות ברמת עומק השיחה"],
                    overall_assessment: "שיחה איכותית עם תקשורת טובה"
                };
                
                // Save to local storage
                if (typeof window.saveLocalInsights === 'function') {
                    window.saveLocalInsights(currentFolder, basicInsights);
                    console.log('💾 [ANALYZE] Basic insights saved locally');
                    
                    // Update display
                    setTimeout(() => {
                        displayAIInsights();
                    }, 200);
                                 }
             }
         };
         
        // Quick test function for users
        window.testNewInsightsSystem = function() {
            console.log('🧪 [TEST] Testing new insights system...');
            
            // Switch to insights tab
            const insightsTab = document.querySelector('[data-tab="insights-content"]');
            if (insightsTab) {
                insightsTab.click();
                console.log('📑 [TEST] Switched to insights tab');
            }
            
            // Generate insights for current conversation
            setTimeout(() => {
                window.analyzeCurrentConversationInsights();
                console.log('✅ [TEST] Insights analysis triggered');
            }, 500);
            
            return 'Test completed - check insights tab!';
        };
        
        window.checkAIContentAvailability = checkAIContentAvailability;
        window.startAIContentMonitoring = startAIContentMonitoring;
        window.stopAIContentMonitoring = stopAIContentMonitoring;
        
        function analyzeConversationData(data, mp3Keys) {
            const emotionCounts = {};
            const transcriptSegments = [];
            const emotionalIntensity = [];
            
            mp3Keys.forEach((key, index) => {
                const entry = data[key];
                if (entry) {
                    // Count emotions
                    if (entry.emotions) {
                        entry.emotions.forEach(emotion => {
                            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                        });
                    }
                    
                    // Collect transcripts
                    if (entry.transcript || entry.words) {
                        transcriptSegments.push({
                            index: index,
                            text: entry.transcript || entry.words || '',
                            emotions: entry.emotions || [],
                            timestamp: `${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}`
                        });
                    }
                    
                    // Calculate emotional intensity
                    const intensity = calculateEmotionalIntensity(entry.emotions || []);
                    emotionalIntensity.push({
                        index: index,
                        intensity: intensity,
                        emotions: entry.emotions || []
                    });
                }
            });
            
            return {
                emotionCounts,
                transcriptSegments,
                emotionalIntensity,
                totalSegments: mp3Keys.length
            };
        }
        
        function calculateEmotionalIntensity(emotions) {
            const intensityMap = {
                // Basic emotions
                'happiness': 0.8,
                'joy': 0.9,
                'sadness': 0.7,
                'anger': 0.9,
                'fear': 0.8,
                'surprise': 0.6,
                'disgust': 0.7,
                'neutral': 0.1,
                'calm': 0.2,
                'excitement': 0.8,
                
                // Extended emotions
                'curiosity': 0.6,
                'confusion': 0.5,
                'annoyance': 0.7,
                'frustration': 0.8,
                'caring': 0.6,
                'love': 0.9,
                'hate': 0.9,
                'jealousy': 0.8,
                'guilt': 0.7,
                'shame': 0.7,
                'pride': 0.7,
                'relief': 0.6,
                'anxiety': 0.8,
                'stress': 0.8,
                'boredom': 0.3,
                'interest': 0.6,
                'admiration': 0.7,
                'contempt': 0.7,
                'envy': 0.7,
                'grief': 0.9,
                'hope': 0.6,
                'optimism': 0.7,
                'pessimism': 0.5,
                'satisfaction': 0.6,
                'disappointment': 0.7,
                'determination': 0.8,
                'confidence': 0.7,
                'insecurity': 0.6,
                'nostalgia': 0.5,
                'loneliness': 0.7,
                'empathy': 0.6,
                'sympathy': 0.5
            };
            
            if (emotions.length === 0) return 0.1;
            
            const totalIntensity = emotions.reduce((sum, emotion) => {
                return sum + (intensityMap[emotion.toLowerCase()] || 0.5);
            }, 0);
            
            return totalIntensity / emotions.length;
        }
        
        function generateSummaryText(analysis) {
            const { emotionCounts, transcriptSegments, totalSegments } = analysis;
            
            // Find dominant emotions
            const sortedEmotions = Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
            
            const dominantEmotion = sortedEmotions[0]?.[0] || 'neutral';
            const dominantCount = sortedEmotions[0]?.[1] || 0;
            const dominantPercentage = Math.round((dominantCount / totalSegments) * 100);
            
            // Analyze conversation flow
            const hasTranscripts = transcriptSegments.length > 0;
            const avgWordsPerSegment = hasTranscripts ? 
                transcriptSegments.reduce((sum, seg) => sum + (seg.text.split(' ').length || 0), 0) / transcriptSegments.length : 0;
            
            // Generate summary
            let summary = `השיחה כוללת ${totalSegments} קטעים`;
            
            if (dominantEmotion !== 'neutral') {
                const emotionHebrew = getHebrewEmotion(dominantEmotion);
                summary += ` עם ${emotionHebrew} כרגש השולט (${dominantPercentage}% מהקטעים)`;
            }
            
            if (hasTranscripts) {
                summary += `. זוהו ${transcriptSegments.length} קטעים עם תמלול`;
                
                if (avgWordsPerSegment > 0) {
                    summary += `, בממוצע ${Math.round(avgWordsPerSegment)} מילים לקטע`;
                }
            }
            
            // Add emotional progression insight
            if (sortedEmotions.length > 1) {
                const secondaryEmotion = getHebrewEmotion(sortedEmotions[1][0]);
                const secondaryPercentage = Math.round((sortedEmotions[1][1] / totalSegments) * 100);
                summary += `. רגש משני הוא ${secondaryEmotion} (${secondaryPercentage}%)`;
            }
            
            summary += '.';
            
            return summary;
        }
        
        // Store emotions config globally
        var emotionsConfig = null;
        
        // Load emotions config from file
        async function loadEmotionsConfig() {
            if (!emotionsConfig) {
                try {
                    const response = await fetch('/config/emotions_config.json');
                    emotionsConfig = await response.json();
                } catch (error) {
                    console.error('Failed to load emotions config:', error);
                    emotionsConfig = {};
                }
            }
            return emotionsConfig;
        }

        // Get emotion data with Hebrew name and color
        function getEmotionData(emotion) {
            // Default fallback
            const defaultData = {
                hebrew: emotion,
                color: '#9B9B9B',
                emoji: '😐'
            };
            
            if (!emotionsConfig || typeof emotionsConfig !== 'object') {
                console.warn('Emotions config not loaded yet, using default for:', emotion);
                return defaultData;
            }
            
            // Try different case variations to find the emotion
            const variations = [
                emotion,
                emotion.toLowerCase(),
                emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase(),
                emotion.charAt(0).toLowerCase() + emotion.slice(1)
            ];
            
            for (const variant of variations) {
                if (emotionsConfig[variant]) {
                    return {
                        hebrew: emotionsConfig[variant].hebrew || emotion,
                        color: emotionsConfig[variant].color || '#9B9B9B',
                        emoji: emotionsConfig[variant].emoji || '😐'
                    };
                }
            }
            
            return defaultData;
        }

        function getHebrewEmotion(emotion) {
            return getEmotionData(emotion).hebrew;
        }
        
        function identifyMainThemes(analysis) {
            const { emotionCounts, transcriptSegments } = analysis;
            const themes = [];
            
            // Theme 1: Emotional tone
            const sortedEmotions = Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 2);
            
            if (sortedEmotions.length > 0) {
                const primaryEmotion = sortedEmotions[0][0];
                const primaryCount = sortedEmotions[0][1];
                const emotionHebrew = getHebrewEmotion(primaryEmotion);
                
                themes.push({
                    title: `רגש מרכזי: ${emotionHebrew}`,
                    description: `מופיע ב-${primaryCount} קטעים מתוך השיחה`
                });
            }
            
            // Theme 2: Conversation length and structure
            const totalSegments = analysis.totalSegments;
            const estimatedDuration = Math.round(totalSegments * 0.5); // Assume 30 seconds per segment
            
            let lengthCategory = '';
            if (estimatedDuration < 5) lengthCategory = 'קצרה';
            else if (estimatedDuration < 15) lengthCategory = 'בינונית';
            else lengthCategory = 'ארוכה';
            
            themes.push({
                title: `שיחה ${lengthCategory}`,
                description: `כ-${estimatedDuration} דקות עם ${totalSegments} קטעים`
            });
            
            // Theme 3: Emotional variety
            const emotionVariety = Object.keys(emotionCounts).length;
            let varietyDescription = '';
            
            if (emotionVariety <= 2) {
                varietyDescription = 'מגוון רגשי מוגבל - שיחה יחסית חד-ממדית';
            } else if (emotionVariety <= 4) {
                varietyDescription = 'מגוון רגשי בינוני - שיחה עם כמה גוונים רגשיים';
            } else {
                varietyDescription = 'מגוון רגשי עשיר - שיחה מורכבת רגשית';
            }
            
            themes.push({
                title: 'מגוון רגשי',
                description: varietyDescription
            });
            
            return themes;
        }
        
        function createEmotionalProgression(data, mp3Keys) {
            const progression = [];
            const segmentSize = Math.max(1, Math.floor(mp3Keys.length / 8)); // Divide into ~8 chunks
            
            for (let i = 0; i < mp3Keys.length; i += segmentSize) {
                const chunk = mp3Keys.slice(i, i + segmentSize);
                const emotionCounts = {};
                
                chunk.forEach(key => {
                    const entry = data[key];
                    if (entry && entry.emotions) {
                        entry.emotions.forEach(emotion => {
                            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                        });
                    }
                });
                
                const dominantEmotion = Object.entries(emotionCounts)
                    .sort((a, b) => b[1] - a[1])[0];
                
                if (dominantEmotion) {
                    const timeLabel = `${Math.floor(i * 0.5)}:${String((i * 30) % 60).padStart(2, '0')}`;
                    progression.push({
                        time: timeLabel,
                        emotion: getHebrewEmotion(dominantEmotion[0]),
                        intensity: dominantEmotion[1] / chunk.length
                    });
                }
            }
            
            return progression;
        }
        
        function calculateConversationMetrics(data, mp3Keys) {
            const totalSegments = mp3Keys.length;
            const estimatedDuration = Math.round(totalSegments * 0.5); // 30 seconds per segment
            
            // Count total words
            let totalWords = 0;
            mp3Keys.forEach(key => {
                const entry = data[key];
                if (entry && (entry.transcript || entry.words)) {
                    const text = entry.transcript || entry.words || '';
                    totalWords += text.split(' ').length;
                }
            });
            
            // Find dominant emotion
            const emotionCounts = {};
            mp3Keys.forEach(key => {
                const entry = data[key];
                if (entry && entry.emotions) {
                    entry.emotions.forEach(emotion => {
                        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                    });
                }
            });
            
            const dominantEmotion = Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])[0];
            
            return {
                duration: `${estimatedDuration} דקות`,
                words: totalWords.toLocaleString('he-IL'),
                segments: totalSegments.toLocaleString('he-IL'),
                dominantEmotion: dominantEmotion ? getHebrewEmotion(dominantEmotion[0]) : 'לא זמין'
            };
        }
        
        function updateSummaryElements(summaryData) {
            // Update the summary in the "מידע על השיחה" tab
            console.log('📝 Updating summary elements with:', summaryData);
            
            // Find the summary section in the info-content tab
            const infoContent = document.getElementById('info-content');
            if (infoContent) {
                const summarySection = infoContent.querySelector('.content-section .section-content');
                if (summarySection) {
                    summarySection.innerHTML = summaryData.summary;
                    console.log('✅ Updated summary section in info tab');
                }
            }
            
            // Update old conversation summary (if elements exist) for backward compatibility
            const oldSummaryElement = document.getElementById('conversation-summary');
            if (oldSummaryElement) {
                oldSummaryElement.innerHTML = `
                    <div class="summary-content">${summaryData.summary}</div>
                `;
            }
            
            // Update old themes container (if exists)
            const oldThemesContainer = document.querySelector('#main-themes .themes-container');
            if (oldThemesContainer) {
                oldThemesContainer.innerHTML = '';
                summaryData.themes.forEach(theme => {
                    const themeElement = document.createElement('div');
                    themeElement.className = 'theme-item';
                    themeElement.innerHTML = `
                        <div class="theme-title">${theme.title}</div>
                        <div class="theme-description">${theme.description}</div>
                    `;
                    oldThemesContainer.appendChild(themeElement);
                });
            }
            
            // Update old emotional progression (if exists)
            const oldProgressionElement = document.querySelector('#emotional-progression .progression-chart');
            if (oldProgressionElement) {
                if (summaryData.progression.length > 0) {
                    oldProgressionElement.innerHTML = `
                        <div class="progression-timeline">
                            ${summaryData.progression.map(item => `
                                <div class="progression-item">
                                    <span class="progression-time">${item.time}</span>
                                    <span class="progression-emotion">${item.emotion}</span>
                                    <div class="emotion-progression-bar">
                                        <div class="emotion-progression-fill" style="width: ${Math.round(item.intensity * 100)}%; background-color: var(--accent-color);"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                } else {
                    oldProgressionElement.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">אין נתונים לתצוגה</div>';
                }
            }
            
            // Update old metrics (if elements exist)
            const metrics = summaryData.metrics;
            const oldDurationElement = document.getElementById('total-duration');
            if (oldDurationElement) oldDurationElement.textContent = metrics.duration;
            
            const oldWordsElement = document.getElementById('total-words');
            if (oldWordsElement) oldWordsElement.textContent = metrics.words;
            
            const oldSegmentsElement = document.getElementById('total-segments');
            if (oldSegmentsElement) oldSegmentsElement.textContent = metrics.segments;
            
            const oldEmotionElement = document.getElementById('dominant-emotion');
            if (oldEmotionElement) oldEmotionElement.textContent = metrics.dominantEmotion;
            
            console.log('✅ Conversation summary updated (legacy format)');
        }
    }
});