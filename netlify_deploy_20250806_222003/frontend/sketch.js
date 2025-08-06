    // SKETCH.JS (Further refined for Insights Page visibility and Index Grid)

    // --- GLOBAL P5 INSTANCE ---
    const sketchInstanceId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    console.log(`🎨 [${sketchInstanceId}] Initializing p5 sketch instance`);

    // Listen for messages from parent window
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'ensure-emotion-data') {
            console.log(`📨 [${sketchInstanceId}] Received ensure-emotion-data message for ${event.data.folder}`);
            
            // Check if we have emotion data loaded
            if (window.p5Instance && window.p5Instance.hasEmotionData) {
                const hasData = window.p5Instance.hasEmotionData();
                if (!hasData) {
                    console.log(`⚠️ [${sketchInstanceId}] No emotion data detected, forcing reload`);
                    // Force reload the conversation data
                    if (window.p5Instance.reloadConversationData) {
                        window.p5Instance.reloadConversationData();
                    }
                } else {
                    // Even if we have data, ensure blobs are showing emotions
                    console.log(`✅ [${sketchInstanceId}] Emotion data exists, ensuring blobs display it`);
                    
                    // Force update blob visuals to ensure emotions are visible
                    if (window.emotionData && window.blobs && window.blobs.length > 0) {
                        // Check first MP3 entry
                        const firstMp3 = Object.keys(window.emotionData).find(k => k.endsWith('.mp3'));
                        if (firstMp3 && window.emotionData[firstMp3]) {
                            const segmentData = window.emotionData[firstMp3];
                            const speaker = segmentData.speaker || 0;
                            
                            // Force apply emotions to the correct blob
                            if (window.blobs[speaker]) {
                                window.blobs[speaker].setEmotions(segmentData.emotions || ['neutral']);
                                console.log(`🎭 [${sketchInstanceId}] Force applied emotions to blob ${speaker}: ${segmentData.emotions}`);
                            }
                        }
                    }
                }
            }
        }
    });

    const p5SketchFunction = (p) => {
        const diagnosticSketchId = Math.random().toString(36).substring(2, 7);
    
        let isGridThumbnailMode = false; 
        let currentConvoFolderFromData = null; 
    
        let urlParams = new URLSearchParams(window.location.search);
        const folderParamOnInit = urlParams.get('folder');
        const dateParam = urlParams.get('date');
        const segmentParam = urlParams.get('segment'); // Get specific segment parameter
        
        // Initialize currentConvoFolderFromData from URL parameter if available
        if (folderParamOnInit) {
            currentConvoFolderFromData = folderParamOnInit;
            console.log(`[Init] Set conversation folder from URL: ${currentConvoFolderFromData}`);
        }
        
        // Page type flags - these will be mostly false if isGridThumbnailMode is true
        let isIndexPage = !isGridThumbnailMode && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '');
        let isCompareMode = !isGridThumbnailMode && urlParams.get('viewMode') === 'compare';
        let isGridModeIframe = !isGridThumbnailMode && urlParams.get('viewMode') === 'grid';
        let isStaticGridPreview = !isGridThumbnailMode && urlParams.get('viewMode') === 'grid_static';
        let isSegmentMode = !isGridThumbnailMode && urlParams.get('viewMode') === 'segment' && segmentParam; // NEW: Individual segment mode
        let isPreviewMode = !isGridThumbnailMode && (urlParams.get('viewMode') === 'preview' || window.isPreviewMode); // NEW: Preview mode
        let isPreviewFast = window.isPreviewFast || urlParams.get('preview') === 'fast'; // Fast preview mode with optimizations
        let isPreviewInstant = window.isPreviewInstant || urlParams.get('preview') === 'instant'; // Instant preview with no loading
        let previewNoAudio = window.previewNoAudio || urlParams.get('noaudio') === 'true'; // Disable audio in preview
        let previewOptimized = window.previewOptimized || urlParams.get('optimize') === 'true'; // Full optimization mode
        let previewNoLoading = window.previewNoLoading || urlParams.get('noloading') === 'true'; // Skip loading messages
        let previewNoMP3 = window.previewNoMP3 || urlParams.get('nomp3') === 'true'; // Skip MP3 loading entirely for faster preview
        let previewVisualOnly = window.previewVisualOnly || urlParams.get('visual-only') === 'true'; // Visual representation only
        let isInsightsPage = !isGridThumbnailMode && window.location.pathname.endsWith('statistics.html');
        let shouldAutoPlay = !(isIndexPage || isCompareMode || isInsightsPage || isGridModeIframe || isStaticGridPreview || isGridThumbnailMode || isSegmentMode || isPreviewMode || previewNoAudio); // Don't autoplay in preview mode or when audio disabled
        let hideTimeline = window.noTimeline || isPreviewMode; // Hide timeline in preview mode
        
        // Performance optimization flags for preview mode
        let isSimpleMode = urlParams.get('simple') === 'true';
        let useCircles = urlParams.get('circles') === 'true';
        let gridParam = parseInt(urlParams.get('grid')) || (previewOptimized ? 35 : 50);
        
        let previewFrameSkip = isPreviewFast ? 2 : (isSimpleMode ? 3 : 2); // Moderate frame skipping for simple mode
        let previewReducedGrid = isSimpleMode ? Math.min(gridParam, 12) : gridParam; // Very small grid for simple mode
    
        let sketchInstanceId = urlParams.get('iframeId') || diagnosticSketchId;
        
        // Initialize paused state based on URL parameters
        let isStatic = urlParams.get('static') === 'true';
        let shouldAnimate = urlParams.get('animate') !== 'false';
        let shouldAutostart = urlParams.get('autostart') !== 'false';
        
        // Set animation state based on static mode or paused parameter
        window.isAnimationPaused = urlParams.get('paused') === 'true' || isStatic || !shouldAnimate || isPreviewMode;
        
        console.log(`🎬 [${sketchInstanceId}] Initial animation state: ${window.isAnimationPaused ? 'PAUSED' : 'PLAYING'} (static: ${isStatic}, animate: ${shouldAnimate}, autostart: ${shouldAutostart})`);
        
        if (isSimpleMode) {
            console.log(`⚡ [${sketchInstanceId}] Simple mode enabled: grid=${gridParam}, circles=${useCircles}, frameSkip=${previewFrameSkip}`);
        }
    
        let conversationDataPath; // Will be set by the new function
        
        // Function for visualization.html to set the data path
        window.setConversationDataPath = function(path) {
            console.log(`[${sketchInstanceId}] Data path set to: ${path}`);
            conversationDataPath = path;
            // If p5 is already running, tell it to load the data
            if (p5 && p5.instance) {
                p.loadData();
            }
        };

        // Handle messages from parameter control panel
        window.addEventListener('message', function(event) {
            if (event.data.type === 'updateParameters') {
                console.log(`[${sketchInstanceId}] Received parameter update from control panel`);
                
                // Update global parameters
                const params = event.data.parameters;
                if (params) {
                    // Update blob defaults
                    Object.keys(defaultBlobVisuals).forEach(key => {
                        if (params[key] !== undefined) {
                            defaultBlobVisuals[key] = params[key];
                        }
                    });
                    
                    // Update other global parameters
                    if (params.gridsize !== undefined) gridsize = params.gridsize;
                    if (params.connectBlobs !== undefined) connectBlobs = params.connectBlobs;
                    if (params.forceCenter !== undefined) forceCenter = params.forceCenter;
                    
                    // Update home regions for blobs
                    if (params.blobHomeRegion0 !== undefined) blobHomeRegions[0] = params.blobHomeRegion0;
                    if (params.blobHomeRegion1 !== undefined) blobHomeRegions[1] = params.blobHomeRegion1;
                    
                    // Apply updates to existing blobs
                    blobs.forEach((blob, index) => {
                        // Update blob properties
                        Object.keys(defaultBlobVisuals).forEach(key => {
                            if (params[key] !== undefined) {
                                blob.target[key] = params[key];
                            }
                        });
                        
                        // Update home regions
                        if (index === 0 && params.blobHomeRegion0 !== undefined) {
                            blob.homeRegion = params.blobHomeRegion0;
                            blob.targetPos = getRegionCenter(blob.homeRegion);
                        }
                        if (index === 1 && params.blobHomeRegion1 !== undefined) {
                            blob.homeRegion = params.blobHomeRegion1;
                            blob.targetPos = getRegionCenter(blob.homeRegion);
                        }
                    });
                    
                    // Recreate grids if gridsize changed
                    if (params.gridsize !== undefined) {
                        grid = [];
                        for (let i = 0; i < gridsize; i++) {
                            grid[i] = [];
                            for (let j = 0; j < gridsize; j++) {
                                grid[i][j] = 0;
                            }
                        }
                    }
                }
                
                // Send confirmation back
                if (event.source) {
                    event.source.postMessage({
                        type: 'visualizationReady',
                        message: 'Parameters updated successfully'
                    }, '*');
                }
                    } else if (event.data.type === 'updateEmotions') {
            console.log(`[${sketchInstanceId}] Received emotion update from admin panel`);
            console.log(`🔍 [${sketchInstanceId}] Update data:`, {
                hasEmotions: !!event.data.emotions,
                hasEmotionColorMap: !!event.data.emotionColorMap,
                emotionKeys: event.data.emotions ? Object.keys(event.data.emotions) : [],
                colorMapKeys: event.data.emotionColorMap ? Object.keys(event.data.emotionColorMap) : []
            });
            
            // Update emotion mapping
            const newEmotions = event.data.emotions;
            const emotionColorMap = event.data.emotionColorMap;
            
            if (emotionColorMap) {
                // Use the pre-converted RGB color map
                emotionGlobalColorMap = { ...emotionColorMap };
                
                // Ensure all instances are synchronized
                if (window.p5SketchInstance) {
                    window.p5SketchInstance.emotionGlobalColorMap = { ...emotionGlobalColorMap };
                }
                if (!window.emotionGlobalColorMap) window.emotionGlobalColorMap = {};
                window.emotionGlobalColorMap = { ...emotionGlobalColorMap };
                
                console.log(`[${sketchInstanceId}] Updated emotion color map with ${Object.keys(emotionGlobalColorMap).length} emotions:`, emotionGlobalColorMap);
                
                // Log each emotion color for debugging
                Object.entries(emotionGlobalColorMap).forEach(([emotion, color]) => {
                    console.log(`🎨 [${sketchInstanceId}] Emotion "${emotion}" → RGB [${color.join(', ')}]`);
                });
                
            } else if (newEmotions) {
                // Fallback: convert hex colors to RGB
                emotionGlobalColorMap = {};
                Object.entries(newEmotions).forEach(([emotion, config]) => {
                    if (config.active && config.color) {
                        emotionGlobalColorMap[emotion] = hexToRgb(config.color);
                        console.log(`🎨 [${sketchInstanceId}] Fallback color for "${emotion}" → RGB [${emotionGlobalColorMap[emotion].join(', ')}]`);
                    }
                });
                
                // Ensure all instances are synchronized
                if (window.p5SketchInstance) {
                    window.p5SketchInstance.emotionGlobalColorMap = { ...emotionGlobalColorMap };
                }
                if (!window.emotionGlobalColorMap) window.emotionGlobalColorMap = {};
                window.emotionGlobalColorMap = { ...emotionGlobalColorMap };
                
                console.log(`[${sketchInstanceId}] Updated emotion mapping (fallback):`, emotionGlobalColorMap);
            }
            
            // Update emotion charsets if provided
            if (newEmotions) {
                Object.entries(newEmotions).forEach(([emotion, config]) => {
                    if (config.charset && config.charset.length > 0) {
                        emotionCharsets[emotion.toLowerCase()] = config.charset;
                    }
                });
            }
            
            // Force refresh of current visualization to apply new colors IMMEDIATELY
            if (blobs && blobs.length > 0 && currentMeta) {
                console.log(`[${sketchInstanceId}] 🎨 Applying new emotion colors to current visualization`);
                
                // Re-apply current segment parameters with new colors
                const currentSpeaker = currentMeta.speaker || 0;
                updateBlobVisualsForSegment(currentSpeaker, currentMeta);
                
                // Recreate highlight grids with new colors
                if (currentMeta.emotions) {
                    createEmotionHighlightGrids(currentMeta, currentSpeaker);
                }
                
                // Force immediate color update for all blobs
                console.log(`🔍 [${sketchInstanceId}] Starting color update for ${blobs.length} blobs`);
                blobs.forEach((blob, index) => {
                    console.log(`🔍 [${sketchInstanceId}] Checking blob ${index}:`, {
                        hasCurrentEmotions: !!blob.currentEmotions,
                        emotionsLength: blob.currentEmotions ? blob.currentEmotions.length : 0,
                        emotions: blob.currentEmotions,
                        currentDisplayColors: blob.displayColors
                    });
                    
                    if (blob.currentEmotions && blob.currentEmotions.length > 0) {
                        const newColors = blob.currentEmotions.map(emotion => {
                            const color = getEmotionColor(emotion);
                            if (color) {
                                console.log(`✅ [${sketchInstanceId}] Updated blob ${index} emotion "${emotion}" → [${color.join(', ')}]`);
                                return color;
                            } else {
                                console.warn(`⚠️ [${sketchInstanceId}] No color found for emotion "${emotion}"`);
                                console.log(`🔍 [${sketchInstanceId}] Available emotion keys:`, getEmotionColorMapKeys());
                                return [150, 150, 150]; // Fallback gray
                            }
                        });
                        
                        // Update blob's display colors immediately
                        blob.displayColors = newColors;
                        console.log(`🔄 [${sketchInstanceId}] Updated blob ${index} with ${newColors.length} emotion colors:`, newColors);
                        
                        // Force the blob to refresh its visual state
                        if (blob.forceRefresh && typeof blob.forceRefresh === 'function') {
                            blob.forceRefresh();
                        }
                    } else {
                        console.log(`⚠️ [${sketchInstanceId}] Blob ${index} has no emotions to update`);
                    }
                });
                
                console.log(`[${sketchInstanceId}] ✅ Emotion colors updated and applied to visualization`);
                
                // Force a visual refresh by setting a flag that the draw loop can check
                window.forceVisualizationRefresh = true;
                window.lastColorUpdateTime = Date.now();
                
                // Dispatch custom event for sidepanel to listen to
                window.dispatchEvent(new CustomEvent('emotionColorsUpdated', {
                    detail: {
                        emotionColorMap: emotionGlobalColorMap,
                        timestamp: Date.now()
                    }
                }));
                
                console.log(`[${sketchInstanceId}] 📡 Dispatched emotionColorsUpdated event for sidepanel`);
                
                // Also trigger a redraw immediately
                if (typeof p !== 'undefined' && p.redraw) {
                    p.redraw();
                }
                
            } else {
                console.log(`[${sketchInstanceId}] ℹ️ No active visualization to update - colors will be applied when content loads`);
            }
            }
            else if (event.data.type === 'setLoopMode') {
                // Set loop mode for current audio
                window.isLoopMode = event.data.loop;
                console.log(`[${sketchInstanceId}] Loop mode set to:`, window.isLoopMode);
            }
            else if (event.data.type === 'reloadData') {
                // Reload the current conversation data
                if (conversationDataPath) {
                    console.log(`[${sketchInstanceId}] Reloading conversation data...`);
                    p.loadData();
                }
            }
            else if (event.data.action === 'startSegmentLoop') {
                // Start looping a specific segment
                console.log(`[${sketchInstanceId}] 🔁 Starting segment loop for: ${event.data.segment}`);
                window.isSegmentLoopMode = true;
                window.loopingSegment = event.data.segment;
                window.loopingConversation = event.data.conversation;
                window.loopingSegmentData = event.data.segmentData; // Store segment data for continuous updates
                
                // Find the segment in the conversation data and play it on loop
                if (convo && emotionData) {
                    const segmentIndex = convo.findIndex(item => item.file === event.data.segment);
                    if (segmentIndex >= 0) {
                        currentIndex = segmentIndex;
                        p.currentIndex = currentIndex; // Sync exposed property
                        
                        // Update emotion data with the provided segment data if available
                        if (event.data.segmentData) {
                            emotionData[event.data.segment] = { ...emotionData[event.data.segment], ...event.data.segmentData };
                        }
                        
                        console.log(`[${sketchInstanceId}] 🎯 Found segment at index ${segmentIndex}, starting continuous loop...`);
                        startContinuousSegmentLoop();
                    } else {
                        console.warn(`[${sketchInstanceId}] ❌ Segment ${event.data.segment} not found in conversation data`);
                    }
                }
            }
            else if (event.data.action === 'updateLoopingSegment') {
                // Update parameters for currently looping segment
                if (window.isSegmentLoopMode && window.loopingSegment === event.data.segment) {
                    console.log(`[${sketchInstanceId}] 🔄 Updating looping segment parameters for: ${event.data.segment}`);
                    
                    // Update the emotion data with new parameters
                    if (event.data.segmentData) {
                        emotionData[event.data.segment] = { ...emotionData[event.data.segment], ...event.data.segmentData };
                        window.loopingSegmentData = event.data.segmentData;
                        
                        // Immediately apply the updated parameters to the current visualization
                        applySegmentParameters(event.data.segment, event.data.segmentData);
                    }
                }
            }
            else if (event.data.action === 'stopSegmentLoop') {
                // Stop segment loop and return to normal mode
                console.log(`[${sketchInstanceId}] 🔄 Stopping segment loop, returning to normal mode`);
                window.isSegmentLoopMode = false;
                window.loopingSegment = null;
                window.loopingConversation = null;
                window.loopingSegmentData = null;
                
                // Stop current playback
                if (soundFiles && soundFiles[currentIndex] && typeof soundFiles[currentIndex].stop === 'function') {
                    soundFiles[currentIndex].stop();
                }
                isCurrentlyPlaying = false;
                
                // Reset to normal visualization mode
                console.log(`[${sketchInstanceId}] 🏠 Returning to normal conversation mode`);
            }
            else if (event.data.action === 'updateSegmentData') {
                // Update individual segment visualization in real-time
                console.log(`[${sketchInstanceId}] 🎨 Updating individual segment visualization for: ${event.data.segment}`);
                
                if (isSegmentMode && segmentParam === event.data.segment) {
                    // Update the emotion data with new parameters for this specific segment
                    if (event.data.segmentData && emotionData) {
                        emotionData[event.data.segment] = { ...emotionData[event.data.segment], ...event.data.segmentData };
                        
                        // Find the segment in the conversation data and apply parameters immediately
                        if (convo) {
                            const segmentIndex = convo.findIndex(item => item.file === event.data.segment);
                            if (segmentIndex >= 0) {
                                // Apply the updated parameters to the current visualization
                                applySegmentParameters(event.data.segment, event.data.segmentData);
                                console.log(`[${sketchInstanceId}] ✅ Updated segment visualization parameters for ${event.data.segment}`);
                            }
                        }
                    }
                } else {
                    console.log(`[${sketchInstanceId}] ℹ️ Ignoring segment update - not in segment mode or different segment`);
                }
            }
            else if (event.data.type === 'optimize-performance') {
                // Handle performance optimization messages from parent window
                const layout = event.data.layout;
                const options = {
                    spinning: event.data.spinning,
                    reduceQuality: event.data.reduceQuality
                };
                
                console.log(`📈 [${sketchInstanceId}] Received performance optimization request: ${layout}`, options);
                
                if (p.optimizeForLayout) {
                    p.optimizeForLayout(layout, options);
                }
            }
            else if (event.data.type === 'start-animation') {
                // Start animation for hover effect
                console.log(`🎬 [${sketchInstanceId}] Starting animation for hover - was paused: ${window.isAnimationPaused}`);
                window.isAnimationPaused = false;
                isReadyToDrawVisualization = true;
                
                // Force blob visibility for immediate animation
                if (blobs && blobs.length > 0) {
                    blobs.forEach(blob => {
                        blob.target.blobVisibility = 1.0;
                        blob.isVisible = true;
                    });
                }
            }
            else if (event.data.type === 'stop-animation') {
                // Stop animation when hover ends
                console.log(`⏸️ [${sketchInstanceId}] Stopping animation for hover - was paused: ${window.isAnimationPaused}`);
                window.isAnimationPaused = true;
                // Keep blobs visible but stop their movement
                if (blobs && blobs.length > 0) {
                    blobs.forEach(blob => {
                        // Keep visibility but stop movement
                        blob.target.blobVisibility = 1.0;
                        blob.isVisible = true;
                    });
                }
            }
            else if (event.data.type === 'initial-pause') {
                // Set initial paused state
                console.log(`🎬 [${sketchInstanceId}] Received initial pause message`);
                window.isAnimationPaused = true;
                isReadyToDrawVisualization = true;
                
                // Force initial visibility for all blobs
                if (blobs && blobs.length > 0) {
                    blobs.forEach(blob => {
                        blob.target.blobVisibility = 1.0;
                        blob.isVisible = true;
                        blob.blobVisibility = 1.0;
                    });
                }
            }
            else if (event.data.type === 'force-static-visible') {
                // Force static mode with immediate visibility
                console.log(`🎨 [${sketchInstanceId}] Received force-static-visible message`);
                window.isAnimationPaused = event.data.static || false;
                isReadyToDrawVisualization = true;
                
                // Initialize blobs if not already done
                if (!blobs || blobs.length === 0) {
                    blobs = [];
                    for (let i = 0; i < 2; i++) {
                        blobs.push(new Blob(i));
                    }
                }
                
                // Force immediate visibility for all blobs with default properties
                if (blobs && blobs.length > 0) {
                    blobs.forEach((blob, i) => {
                        blob.target.blobVisibility = 1.0;
                        blob.isVisible = true;
                        blob.blobVisibility = 1.0;
                        blob.target.blobSizeScale = 5;
                        blob.target.blobStrength = 1000;
                        
                        // Ensure colors for immediate visibility
                        if (!blob.displayColors || blob.displayColors.length === 0) {
                            const defaultColors = [
                                [230, 50, 50], // Red for speaker 0
                                [50, 130, 200] // Blue for speaker 1
                            ];
                            blob.displayColors = [defaultColors[i % defaultColors.length]];
                        }
                        
                        console.log(`🎨 [${sketchInstanceId}] Force-static-visible: blob ${i} set to visible with color [${blob.displayColors[0]}]`);
                    });
                }
                
                // Force a redraw to ensure visibility
                if (p && p.redraw) {
                    p.redraw();
                }
            }
        });

        let currentConvoFolder = "conversations/convo2/"; // Default, overridden by specific modes
    
        const fullColorPalette = [
          '#f37021','#664de5','#a42d2d','#3c7a41','#2d4366','#842e2b','#c5c0eb','#8db5dd',
          '#f5c0c1','#dc8630','#aefe57','#f7c164','#f9d523','#bde0f1','#8e9ea2','#f69f87',
          '#a3a3a3','#6f6f6f','#b5cbe0'
        ];
        let coloredCircleSizeMin = 2;
        let coloredCircleSizeMax = 18;
    
        const folderParamForConvoLogic = urlParams.get('folder');
        if (!isGridThumbnailMode && (window.location.pathname.endsWith('visualization.html') || isGridModeIframe) && folderParamForConvoLogic) {
            currentConvoFolder = `conversations/${folderParamForConvoLogic}/`;
        } else if (!isGridThumbnailMode && window.location.pathname.endsWith('compare.html')) {
        } else if (!isGridThumbnailMode && isInsightsPage) {
            currentConvoFolder = "conversations/convo2/";
        }
    
        let emotionData;
        let emotionCodeMapping = {};
        let emotionGlobalColorMap = {};
        let convo = [];
        
        // Helper function to reliably access emotion color map
        function getEmotionColor(emotionCode) {
            // Enhanced debug logging
            console.log(`[${sketchInstanceId}] 🔍 Looking up color for emotion: "${emotionCode}"`);
            
            // Function to try multiple lookup approaches
            const tryLookup = (code, colorMap) => {
                if (!colorMap) return null;
                
                // 1. Direct lookup (exact match)
                if (colorMap[code]) return colorMap[code];
                
                // 2. Dynamic English-to-Hebrew translation using global emotions config
                // First try to get the config from various sources
                let emotionsConfig = null;
                if (window.emotionsConfig) {
                    emotionsConfig = window.emotionsConfig;
                } else if (typeof window !== 'undefined') {
                    // Try to fetch from global or parent window
                    try {
                        if (window.parent && window.parent.emotionsConfig) {
                            emotionsConfig = window.parent.emotionsConfig;
                        }
                    } catch (e) {
                        // Cross-origin access might fail, that's okay
                    }
                }
                
                // If we have emotions config, use it for dynamic translation
                if (emotionsConfig) {
                    for (const [hebrewName, config] of Object.entries(emotionsConfig)) {
                        if (config.english && config.english.toLowerCase() === code.toLowerCase()) {
                            if (colorMap[hebrewName]) {
                                console.log(`[${sketchInstanceId}] 🔄 Dynamic translation "${code}" → "${hebrewName}"`);
                                return colorMap[hebrewName];
                            }
                        }
                    }
                }
                
                // 3. No fallback needed - all translations are now in the emotions config
                
                // 3. Case variations
                const variations = [
                    code.toLowerCase(),
                    code.charAt(0).toUpperCase() + code.slice(1).toLowerCase(),
                    code.charAt(0).toLowerCase() + code.slice(1)
                ];
                
                for (const variant of variations) {
                    if (colorMap[variant]) return colorMap[variant];
                }
                
                return null;
            };
            
            // Try local scope first
            if (typeof emotionGlobalColorMap !== 'undefined') {
                const result = tryLookup(emotionCode, emotionGlobalColorMap);
                if (result) {
                    console.log(`[${sketchInstanceId}] ✅ Found in local scope:`, result);
                    return result;
                }
            }
            
            // Fallback to window.p5SketchInstance
            if (window.p5SketchInstance && window.p5SketchInstance.emotionGlobalColorMap) {
                const result = tryLookup(emotionCode, window.p5SketchInstance.emotionGlobalColorMap);
                if (result) {
                    console.log(`[${sketchInstanceId}] ✅ Found in p5SketchInstance:`, result);
                    return result;
                }
            }
            
            // Fallback to window.emotionGlobalColorMap
            if (window.emotionGlobalColorMap) {
                const result = tryLookup(emotionCode, window.emotionGlobalColorMap);
                if (result) {
                    console.log(`[${sketchInstanceId}] ✅ Found in window.emotionGlobalColorMap:`, result);
                    return result;
                }
            }
            
            // Enhanced debugging - show available keys
            console.log(`[${sketchInstanceId}] ❌ No color found for "${emotionCode}" after translation attempt`);
            console.log(`[${sketchInstanceId}] 🗂️ Local map keys:`, typeof emotionGlobalColorMap !== 'undefined' ? Object.keys(emotionGlobalColorMap) : 'undefined');
            console.log(`[${sketchInstanceId}] 🗂️ p5Instance map keys:`, window.p5SketchInstance?.emotionGlobalColorMap ? Object.keys(window.p5SketchInstance.emotionGlobalColorMap) : 'undefined');
            console.log(`[${sketchInstanceId}] 🗂️ Window map keys:`, window.emotionGlobalColorMap ? Object.keys(window.emotionGlobalColorMap) : 'undefined');
            
            return null;
        }
        
        // Helper function to get all available emotion keys
        function getEmotionColorMapKeys() {
            if (typeof emotionGlobalColorMap !== 'undefined' && Object.keys(emotionGlobalColorMap).length > 0) {
                return Object.keys(emotionGlobalColorMap);
            }
            if (window.p5SketchInstance && window.p5SketchInstance.emotionGlobalColorMap) {
                return Object.keys(window.p5SketchInstance.emotionGlobalColorMap);
            }
            if (window.emotionGlobalColorMap) {
                return Object.keys(window.emotionGlobalColorMap);
            }
            return [];
        }
        
        // Force reload emotion colors from config
        function forceReloadEmotionColors() {
            console.log(`[${sketchInstanceId}] 🔄 Force reloading emotion colors from config...`);
            
            fetch('/config/emotions_config.json?t=' + Date.now())
                .then(response => response.json())
                .then(emotionsConfig => {
                    console.log(`[${sketchInstanceId}] 📥 Loaded emotions config:`, Object.keys(emotionsConfig).length, 'emotions');
                    
                    // Store the config globally for translation lookup
                    window.emotionsConfig = emotionsConfig;
                    
                    // Clear existing maps
                    emotionGlobalColorMap = {};
                    if (!window.emotionGlobalColorMap) window.emotionGlobalColorMap = {};
                    
                    let loadedCount = 0;
                    Object.entries(emotionsConfig).forEach(([emotion, config]) => {
                        if (config.active && config.color) {
                            const rgbColor = hexToRgb(config.color);
                            emotionGlobalColorMap[emotion] = rgbColor;
                            window.emotionGlobalColorMap[emotion] = rgbColor;
                            loadedCount++;
                            console.log(`[${sketchInstanceId}] 🎨 Loaded "${emotion}": ${config.color} → [${rgbColor.join(', ')}]`);
                        }
                    });
                    
                    console.log(`[${sketchInstanceId}] ✅ Successfully loaded ${loadedCount} emotion colors`);
                    console.log(`[${sketchInstanceId}] 🗂️ Available emotions:`, Object.keys(emotionGlobalColorMap));
                    
                    // Force update any existing blobs
                    if (blobs && blobs.length > 0) {
                        console.log(`[${sketchInstanceId}] 🔄 Updating ${blobs.length} existing blobs with new colors...`);
                        blobs.forEach((blob, index) => {
                            if (blob.currentEmotions && blob.currentEmotions.length > 0) {
                                const newColors = blob.currentEmotions.map(emotion => {
                                    const color = getEmotionColor(emotion);
                                    return color || [150, 150, 150]; // Fallback gray
                                });
                                blob.displayColors = newColors;
                                console.log(`[${sketchInstanceId}] 🎨 Updated blob ${index} emotions: ${blob.currentEmotions.join(', ')}`);
                            }
                        });
                    }
                })
                .catch(error => {
                    console.error(`[${sketchInstanceId}] ❌ Failed to load emotions config:`, error);
                });
        }
        
        // Function to manually refresh all blob colors - exposed for debugging
        function refreshAllBlobColors() {
            console.log(`🔄 [${sketchInstanceId}] Manual color refresh triggered`);
            if (blobs && blobs.length > 0) {
                blobs.forEach((blob, index) => {
                    if (blob.currentEmotions && blob.currentEmotions.length > 0) {
                        const newColors = blob.currentEmotions.map(emotion => {
                            const color = getEmotionColor(emotion);
                            return color || [150, 150, 150]; // Fallback gray
                        });
                        blob.displayColors = newColors;
                        console.log(`🔄 [${sketchInstanceId}] Refreshed blob ${index} colors:`, newColors);
                    }
                });
                
                // Force a visual redraw
                if (typeof p !== 'undefined' && p.redraw) {
                    p.redraw();
                }
                
                console.log(`✅ [${sketchInstanceId}] Manual color refresh complete`);
            } else {
                console.log(`⚠️ [${sketchInstanceId}] No blobs available for color refresh`);
            }
        }
        
        // Parameters loaded from configuration file
        let vizParams = null;
        
        // Dynamic numBlobs based on conversation length
        let numBlobs = 2; // Default, will be updated when data is loaded
        let soundFiles = [], currentIndex = 0, started = false;
        
        // Expose currentIndex for transcript synchronization
        p.getCurrentIndex = () => currentIndex;
        p.currentIndex = currentIndex;
        
        let gridsize = isSimpleMode ? Math.min(previewReducedGrid, 12) : (previewOptimized ? previewReducedGrid : 50); // Very small grid for simple mode performance
        let currentMeta = {}; // Store current MP3 metadata for drawing functions
    
        const fadeAlpha = 20;
        let asciiBuffer;
        let grid = [];
        let analyzers = [];
        let prevVols = [];
        let blobs = [];
        let lastSpeakerParams = [{}, {}]; // Store last-used params for each speaker
        // MASTER BACKGROUND COLOR - MUST MATCH INDEX.HTML EXACTLY
// --- Master Color Palette ---

// Define the master background color once to ensure consistency.
const MASTER_BACKGROUND_HEX = '#f7f9f3';
const MASTER_BACKGROUND_RGB = [247, 249, 243];

// This is the main variable for the p5.js sketch background. It's initialized with the master color.
let canvasBackgroundColor = [...MASTER_BACKGROUND_RGB];

// Color for foreground elements like text.
const blobAsciiColor = [0, 0, 0]; // Black
        const defaultBlobVisuals = {
            blobStrength: 1000,
            blobSizeScale: 5,
            volumeImpact: 3000,
            blobSpreadField: 6.0,
            blobVisibility: 1.0,
            blobMotionRange: 0.4,
            breathSpeed: 0.0003,
            gradientStrength: 15,
            blobiness: 1.5,
            blur: 0,
            humor: 0,
            shine: 0,
            characterSpacing: 2,

            coloredCircleCharSize: 1,
            regularAsciiCharSize: 1,
                            minBlobSpacing: "close",
            movementEasing: 0.03,
            blobDensity: 1.2,
        };
        
        // Global properties that control general behavior
        let enablePulse = true;
        let forceCenter = false;
        let connectBlobs = false;
        let repulsionStrength = 3.0;
        let drawThreshold = 0.00001; // Even lower threshold for better visibility
        let finalDrawThreshold = 0.000005; // Allow very subtle blob extensions
        
        // blobHomeRegions: FIXED POSITIONING - Red speaker (0) always left, Blue speaker (1) always right
        // This ensures consistent speaker positioning regardless of segment settings
        let blobHomeRegions = ['center-left', 'center-right']; // Speaker 0 (red) = left, Speaker 1 (blue) = right
        
        // Default blob spacing presets (will be overridden by config)
        let blobSpacingPresets = {
            "together": 0,
            "close": 300,
            "far away": 900
        };
    
        const asciiChars = ['#', '@', '!', '?', '*'];
                        const coloredEmotionChar = '█';  // Use solid block character
        
        let isCurrentlyPlaying = false;
        let isMasterMuted = false;
        let lastVolumeBeforeMute = 0.8;
        let isReadyToDrawVisualization = false;
        let visualOnlyMode = false; // Track when audio fails and we're in visual-only mode
        let audioInitializationAttempted = false; // Track if we've already tried to initialize audio
        let globalAudioFailure = false; // Track if audio has permanently failed
        
        // Check if audio has already failed globally (from previous instances)
        if (window.globalAudioWorkletFailure) {
            globalAudioFailure = true;
            visualOnlyMode = true;
            console.log(`[${sketchInstanceId}] Detected previous audio failure, starting in visual-only mode`);
        }
        
        // Function to show visual-only mode notification
        function showVisualOnlyNotification(message) {
            // Remove existing notification if any
            const existingNotification = document.getElementById('visual-only-notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            // Create notification element
            const notification = document.createElement('div');
            notification.id = 'visual-only-notification';
            notification.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    background: rgba(255, 152, 0, 0.9);
                    color: white;
                    padding: 12px 16px;
                    border-radius: 6px;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    max-width: 300px;
                    text-align: center;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                ">
                    🎵 ${message}
                    <br>
                    <small style="opacity: 0.8; font-size: 12px;">Visualization will continue without audio</small>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Auto-remove after 8 seconds
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.style.transition = 'opacity 0.5s ease-out';
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 500);
                }
            }, 8000);
        }
        
        // Force initial visibility for static mode
        if (isStatic) {
            isReadyToDrawVisualization = true;
            window.isAnimationPaused = true; // Static mode means no animation
            console.log(`🎨 [${sketchInstanceId}] Static mode: Forced isReadyToDrawVisualization = true, animation paused = true`);
        }
    
        // Add highlight grids for colored ASCII (from reference code)
        let highlightGrids = [];

        // Function to load visualization parameters
        function loadVisualizationParameters() {
            return new Promise((resolve, reject) => {
                fetch('../config/visualization_parameters.json')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Parameters file not found, using defaults');
                        }
                        return response.json();
                    })
                    .then(params => {
                        vizParams = params.visualization_parameters;
                        applyParameters();
                        console.log(`✅ [${sketchInstanceId}] Visualization parameters loaded`);
                        resolve(vizParams);
                    })
                    .catch(error => {
                        console.warn(`⚠️ [${sketchInstanceId}] ${error.message}`);
                        // Use default parameters
                        vizParams = createDefaultParameters();
                        applyParameters();
                        resolve(vizParams);
                    });
            });
        }
        
        // Function to apply loaded parameters to global variables
        function applyParameters() {
            if (!vizParams) return;
            
            // Apply canvas parameters
            if (vizParams.canvas) {
                // FORCE MASTER BACKGROUND COLOR - OVERRIDE ANY CONFIG
    canvasBackgroundColor = MASTER_BACKGROUND_RGB; // Always use master color
    vizParams.canvas.background_color = MASTER_BACKGROUND_RGB; // Override any config
                gridsize = vizParams.grid?.default_size || gridsize;
            }
            
            // Apply grid parameters  
            if (vizParams.grid) {
                drawThreshold = vizParams.grid.ascii_threshold || drawThreshold;
                finalDrawThreshold = vizParams.grid.final_draw_threshold || finalDrawThreshold;
            }
            
            // Apply blob parameters
            if (vizParams.blobs) {
                numBlobs = vizParams.blobs.count || numBlobs;
                blobHomeRegions = vizParams.blobs.default_home_regions || blobHomeRegions;
                
                // Update blob spacing presets
                if (vizParams.blobs.spacing_presets) {
                    Object.assign(blobSpacingPresets, vizParams.blobs.spacing_presets);
                    console.log(`✅ [${sketchInstanceId}] Loaded spacing presets:`, blobSpacingPresets);
                    
                    // Update existing blobs if they exist
                    if (typeof blobs !== 'undefined' && blobs.length > 0) {
                        blobs.forEach((blob, index) => {
                            // Force re-apply current spacing to use new preset values
                            if (blob.minBlobSpacing) {
                                const currentSpacing = blob.minBlobSpacing;
                                blob.minBlobSpacing = currentSpacing; // This will trigger applyBlobSpacing with new presets
                                console.log(`🔄 [${sketchInstanceId}] Updated blob ${index} spacing: ${currentSpacing}`);
                            }
                        });
                    }
                }
                
                // Update default blob visuals
                if (vizParams.blobs.default_visuals) {
                    Object.assign(defaultBlobVisuals, vizParams.blobs.default_visuals);
                }
            }
            
            // Apply connection parameters
            if (vizParams.connections) {
                connectBlobs = vizParams.connections.enabled || false;
            }
            
            // Apply emotion colors
            if (vizParams.colors && vizParams.colors.emotion_palette) {
                Object.entries(vizParams.colors.emotion_palette).forEach(([emotion, color]) => {
                    emotionGlobalColorMap[emotion] = hexToRgb(color);
                });
            }
            
            console.log(`🔧 [${sketchInstanceId}] Parameters applied - Grid: ${gridsize}, Blobs: ${numBlobs}`);
        }
        
        // Function to create default parameters if file loading fails
        function createDefaultParameters() {
            return {
                canvas: { background_color: [247, 249, 243] },
                grid: { default_size: 50, ascii_threshold: 0.00001, final_draw_threshold: 0.000005 },
                blobs: { 
                    count: 2, 
                    default_home_regions: ['center-left', 'center-right'],
                    spacing_presets: blobSpacingPresets,
                    default_visuals: defaultBlobVisuals
                },
                connections: { enabled: false },
                colors: { emotion_palette: {} }
            };
        }
        
        // Emotion-based character sets for different emotions - standardized circular characters
        const emotionCharsets = {
            'joy': ['○', '●'],
            'happiness': ['○', '●'],
            'surprise': ['○', '●'],
            'curiosity': ['○', '●'],
            'anger': ['○', '●'],
            'frustration': ['○', '●'],
            'disgust': ['○', '●'],
            'fear': ['○', '●'],
            'sadness': ['○', '●'],
            'neutral': ['○', '●'],
            'default': ['○', '●']
        };
        
        // Background charset that changes according to grid resolution
        const backgroundCharsets = {
            'low': ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '=', '-', '~', '`'], // ASCII symbols for low resolution
            'medium': ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '=', '-', '~', '`', '|', '\\', '/', ':', ';', '"', "'", '<', '>', ',', '.', '?', '1', '2', '3'], // Medium density with more symbols
            'high': ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '=', '-', '~', '`', '|', '\\', '/', ':', ';', '"', "'", '<', '>', ',', '.', '?', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'b', 'c'], // High density with letters
            'ultra': ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '=', '-', '~', '`', '|', '\\', '/', ':', ';', '"', "'", '<', '>', ',', '.', '?', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'] // Ultra high density with full alphabet
        };
        
        // Smooth transition variables for background charset
        let currentBackgroundCharset = backgroundCharsets.low;
        let targetBackgroundCharset = backgroundCharsets.low;
        let charsetTransitionProgress = 0;
        let charsetTransitionSpeed = 0.02; // Speed of transition (0.01 = slow, 0.05 = fast)
        
        // Function to get background charset based on grid resolution with smooth transitions
        function getBackgroundCharset(gridSize) {
            let targetCharset;
            
            // ENHANCED: Check if current segment has custom charset
            if (currentMeta && currentMeta.regularCharset && Array.isArray(currentMeta.regularCharset)) {
                // Use segment-specific charset as background
                targetCharset = currentMeta.regularCharset;
                console.log(`🎨 [${sketchInstanceId}] Using segment-specific background charset: ${targetCharset.length} characters`);
            } else if (currentMeta && currentMeta.emotions && currentMeta.emotions.length > 0) {
                // Use emotion-specific charset as background
                const primaryEmotion = currentMeta.emotions[0];
                const emotionSpecificChars = {
                    'שמחה': ['○', '●'],        // happiness
                    'שמח': ['○', '●'],         // happy
                    'עליזות': ['○', '●'],     // joy
                    'התרגשות': ['○', '●'],    // excitement
                    'אהבה': ['○', '●'],       // love
                    'הפתעה': ['○', '●'],      // surprise
                    'כעס': ['○', '●'],        // anger
                    'פחד': ['○', '●'],        // fear
                    'עצב': ['○', '●'],        // sadness
                    'גועל': ['○', '●'],       // disgust
                    'סקרנות': ['○', '●'],     // curiosity
                    'תסכול': ['○', '●'],      // frustration
                    'חרדה': ['○', '●'],       // anxiety
                    'תקווה': ['○', '●'],      // hope
                    'גאווה': ['○', '●'],      // pride
                    'נייטרלי': ['○', '●'],    // neutral
                    'ניטרלי': ['○', '●'],     // neutral (alt)
                    'default': ['○', '●']
                };
                
                targetCharset = emotionSpecificChars[primaryEmotion] || 
                               emotionSpecificChars[primaryEmotion?.toLowerCase()] || 
                               emotionSpecificChars.default;
                console.log(`🎭 [${sketchInstanceId}] Using emotion-specific background charset for '${primaryEmotion}': ${targetCharset.length} characters`);
            } else {
                // Fall back to resolution-based charset
                if (gridSize <= 30) targetCharset = backgroundCharsets.low;
                else if (gridSize <= 60) targetCharset = backgroundCharsets.medium;
                else if (gridSize <= 100) targetCharset = backgroundCharsets.high;
                else targetCharset = backgroundCharsets.ultra;
            }
            
            // Update target charset if it changed
            if (targetCharset !== targetBackgroundCharset) {
                targetBackgroundCharset = targetCharset;
                charsetTransitionProgress = 0; // Reset transition
                console.log(`🔄 [${sketchInstanceId}] Background charset transition started: ${targetCharset.length} characters`);
            }
            
            // Smooth transition between charsets
            if (charsetTransitionProgress < 1) {
                charsetTransitionProgress += charsetTransitionSpeed;
                charsetTransitionProgress = Math.min(charsetTransitionProgress, 1);
                
                // Interpolate between current and target charset
                const currentLength = currentBackgroundCharset.length;
                const targetLength = targetBackgroundCharset.length;
                const maxLength = Math.max(currentLength, targetLength);
                
                const interpolatedCharset = [];
                for (let i = 0; i < maxLength; i++) {
                    const currentChar = currentBackgroundCharset[i] || ' ';
                    const targetChar = targetBackgroundCharset[i] || ' ';
                    
                    // Use current char during transition, then switch to target
                    const char = charsetTransitionProgress < 0.5 ? currentChar : targetChar;
                    interpolatedCharset.push(char);
                }
                
                // Update current charset when transition is complete
                if (charsetTransitionProgress >= 1) {
                    currentBackgroundCharset = targetBackgroundCharset;
                    console.log(`✅ [${sketchInstanceId}] Background charset transition completed`);
                }
                
                return interpolatedCharset;
            }
            
            return currentBackgroundCharset;
        }
        
        // Function to get character set based on current emotions
        function getEmotionCharset(emotions) {
            if (!emotions || emotions.length === 0) {
                return emotionCharsets.default;
            }
            
            // Use the first emotion to determine character set
            const primaryEmotion = emotions[0].toLowerCase();
            const charset = emotionCharsets[primaryEmotion] || emotionCharsets.default;
            return charset;
        }
        
        // Function to draw background charset behind the blobs
        function drawBackgroundCharset(g, targetWidth, targetHeight, useGridSize) {
            const stepX = targetWidth / useGridSize;
            const stepY = targetHeight / useGridSize;
            
            // Get appropriate charset based on grid resolution
            const backgroundCharset = getBackgroundCharset(useGridSize);
            
            // Set text properties for background - ENHANCED VISIBILITY
            g.textAlign(p.CENTER, p.CENTER);
            g.fill(150, 150, 150, 80); // Darker gray with higher opacity for better visibility
            // Fixed background character size independent of grid resolution
            const baseBgSize = 18; // Base background character size in pixels
            g.textSize(baseBgSize * 0.9); // Larger size for better visibility
            
            // Draw background characters across the entire grid
            for (let x = 0; x < useGridSize; x++) {
                for (let y = 0; y < useGridSize; y++) {
                    const gx = x * stepX + stepX / 2;
                    const gy = y * stepY + stepY / 2;
                    
                    // Use noise to create organic distribution pattern
                    const noiseValue = p.noise(x * 0.1, y * 0.1, getAnimationFrame() * 0.001);
                    const charIndex = Math.floor(noiseValue * backgroundCharset.length);
                    const char = backgroundCharset[charIndex] || '·';
                    
                    // ENHANCED: Draw more characters for better visibility
                    if (noiseValue > 0.2) { // Lower threshold to show more characters
                        g.text(char, gx, gy);
                    }
                }
            }
            
            // ENHANCED: Add a second layer of background characters for more density
            g.fill(120, 120, 120, 60); // Even darker gray for second layer
            g.textSize(baseBgSize * 0.7); // Smaller size for second layer
            
            for (let x = 0; x < useGridSize; x++) {
                for (let y = 0; y < useGridSize; y++) {
                    const gx = x * stepX + stepX / 2;
                    const gy = y * stepY + stepY / 2;
                    
                    // Use different noise pattern for second layer
                    const noiseValue = p.noise(x * 0.15, y * 0.15, getAnimationFrame() * 0.002);
                    const charIndex = Math.floor(noiseValue * backgroundCharset.length);
                    const char = backgroundCharset[charIndex] || '·';
                    
                    if (noiseValue > 0.4) { // Higher threshold for second layer
                        g.text(char, gx, gy);
                    }
                }
            }
        }
        
        function hexToRgb(hex) { let r = 0, g = 0, b = 0; if (hex.length == 4) { r = "0x" + hex[1] + hex[1]; g = "0x" + hex[2] + hex[2]; b = "0x" + hex[3] + hex[3]; } else if (hex.length == 7) { r = "0x" + hex[1] + hex[2]; g = "0x" + hex[3] + hex[4]; b = "0x" + hex[5] + hex[6]; } return [+r, +g, +b]; }
        
        function hsbToRgb(h, s, v) {
            let r, g, b, i, f, p, q, t;
            i = Math.floor(h * 6);
            f = h * 6 - i;
            p = v * (1 - s);
            q = v * (1 - f * s);
            t = v * (1 - (1 - f) * s);
            switch (i % 6) {
                case 0: r = v, g = t, b = p; break;
                case 1: r = q, g = v, b = p; break;
                case 2: r = p, g = v, b = t; break;
                case 3: r = p, g = q, b = v; break;
                case 4: r = t, g = p, b = v; break;
                case 5: r = v, g = p, b = q; break;
            }
            return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
        }

        function generateDistinctColors(count) { const colors = []; const saturation = 0.85; const brightness = 0.9; if (count === 0) return colors; for (let i = 0; i < count; i++) { const hue = (i * (1 / count)); colors.push(hsbToRgb(hue, saturation, brightness)); } return colors; }
    
        // Cache for region centers to avoid recalculating every frame
        let regionCenterCache = {};
        let lastCanvasSize = { w: 0, h: 0 };
        
        function getRegionCenter(regionName) {
            const w = p.width;
            const h = p.height;
            
            // Clear cache if canvas size changed
            if (w !== lastCanvasSize.w || h !== lastCanvasSize.h) {
                regionCenterCache = {};
                lastCanvasSize = { w, h };
            }
            
            // Return cached result if available
            if (regionCenterCache[regionName]) {
                return regionCenterCache[regionName];
            }
            
            let x, y;
            // Create distinct regions with proper spacing for blob territories
            const offsetRange = Math.min(w, h) * 0.15; // Increased to 15% for better separation
            switch (regionName) {
                case 'top-left':      x = w / 2 - offsetRange; y = h / 2 - offsetRange; break;
                case 'center-left':   x = w / 2 - offsetRange; y = h / 2; break;
                case 'bottom-left':   x = w / 2 - offsetRange; y = h / 2 + offsetRange; break;
                case 'top-center':    x = w / 2; y = h / 2 - offsetRange; break;
                case 'center':        x = w / 2; y = h / 2; break;
                case 'bottom-center': x = w / 2; y = h / 2 + offsetRange; break;
                case 'top-right':     x = w / 2 + offsetRange; y = h / 2 - offsetRange; break;
                case 'center-right':  x = w / 2 + offsetRange; y = h / 2; break;
                case 'bottom-right':  x = w / 2 + offsetRange; y = h / 2 + offsetRange; break;
                default:              x = w / 2; y = h / 2; break;
            }
            
            const result = p.createVector(x, y);
            regionCenterCache[regionName] = result;
            return result;
        }
    
        class Blob {
            constructor(i, initialPos = {}) {
                // Initialize blobs at their home region centers instead of screen center
                this.homeRegion = blobHomeRegions[i] || 'center';
                const homeCenter = getRegionCenter(this.homeRegion);
                this.pos = p.createVector(initialPos.x || homeCenter.x, initialPos.y || homeCenter.y);
                this.vel = p5.Vector.random2D().mult(p.random(0.7, 1.2)); // Add velocity for movement
                this.targetPos = null; // Target position for smooth movement to home region
                this.spacingTransitionActive = false; // Track if blob is transitioning due to spacing change
                this.spacingTransitionSpeed = null; // Custom speed for spacing transitions
                this.noiseOffset = p.createVector(p.random(1e3), p.random(1e3));
                this.timeOffset = p.random(1e3);
                this.cachedStrength = 0;
                this.asciiChars = p.shuffle([...asciiChars]);
                this.audioLevel = 0;
                this.smoothedAudioLevel = 0; // Add smoothed audio level
                this.audioHistory = []; // Store audio history for smoother response
                this.id = i;
                this.cachedHomeCenter = null; // Cache home center to avoid repeated calculations
                this.cachedHomeRadius = 0; // Cache home radius
                this.isFlashing = false;
                this.currentEmotions = []; // Store current emotions for character selection
                this.humor = 0; // Individual humor level (0-10+) for jitter effects
                this.shine = 0; // Individual shine level (0-10+) for highlighting effects
                this.minBlobSpacing = "close"; // Default spacing setting (can be overridden by JSON)
                this.blobGrowthPattern = "linear"; // Default growth pattern (can be: linear, exponential, logarithmic, sine)
                
                Object.assign(this, defaultBlobVisuals);
                this.target = { ...defaultBlobVisuals };
                this.displayColors = [[150, 150, 150]];
                
                this.isVisible = true; 
                if (this.blobSizeScale <= 0.1) this.blobSizeScale = 1;
                if (this.target.blobSizeScale <= 0.1) this.target.blobSizeScale = 1;
            }

            teleportToHome() { this.pos = getRegionCenter(this.homeRegion); }
            
            setTargetVisuals(newVisuals) {
                Object.assign(this.target, newVisuals);
                this.target.isVisible = newVisuals.isVisible !== false;
                if (this.target.blobSizeScale <= 0.1) this.target.blobSizeScale = 1;
            }
            
            // 🔧 FIX: Add missing updateVisuals method (alias for setTargetVisuals)
            updateVisuals(newVisuals) {
                this.setTargetVisuals(newVisuals);
            }
            
            setAudioLevel(l) { 
                this.audioLevel = l;
                
                // Add to audio history for smoothing
                this.audioHistory.push(l);
                if (this.audioHistory.length > 10) { // Keep last 10 samples
                    this.audioHistory.shift();
                }
                
                // Calculate smoothed audio level using moving average
                const sum = this.audioHistory.reduce((acc, val) => acc + val, 0);
                const average = sum / this.audioHistory.length;
                
                // Apply exponential smoothing for even smoother response
                this.smoothedAudioLevel = p.lerp(this.smoothedAudioLevel, average, 0.15); // Very smooth
            }
            
            setEmotions(emotions) {
                this.currentEmotions = emotions || [];
                
                // Enhanced debugging for multiple emotions
                if (this.currentEmotions.length > 1) {
                    console.log(`🎭 [${sketchInstanceId}] Blob ${this.id} has ${this.currentEmotions.length} emotions:`, this.currentEmotions);
                    console.log(`🎨 [${sketchInstanceId}] Blob ${this.id} colors (${this.displayColors?.length || 0}):`, this.displayColors);
                    
                    // Verify emotion-color correlation
                    if (this.displayColors && this.displayColors.length === this.currentEmotions.length) {
                        this.currentEmotions.forEach((emotion, i) => {
                            if (this.displayColors[i]) {
                                console.log(`🔗 [${sketchInstanceId}] Emotion ${i}: "${emotion}" → color [${this.displayColors[i].join(', ')}]`);
                            }
                        });
                    } else {
                        console.warn(`⚠️ [${sketchInstanceId}] Emotion-color mismatch! ${this.currentEmotions.length} emotions but ${this.displayColors?.length || 0} colors`);
                    }
                }
            }

            getStrength() { return this.cachedStrength; }
            
            updateStrength() {
                // Cache strength calculation to avoid recalculating every frame
                const baseStrength = 300 + (this.smoothedAudioLevel * this.volumeImpact);
                this.cachedStrength = baseStrength * this.blobStrength;
            }
            
            applyDynamicMovement(homeCenter, homeRadius) {
                // Get current blob spacing setting to check if we should limit movement
                let spacingDistance = this.minBlobSpacing;
                if (typeof spacingDistance === 'string' && blobSpacingPresets[spacingDistance]) {
                    spacingDistance = blobSpacingPresets[spacingDistance];
                } else if (typeof spacingDistance !== 'number') {
                    // Fallback to default if invalid
                    spacingDistance = 200; // Default spacing
                }
                
                // Check if any other blob is too close - if so, reduce dynamic movement
                let isSpacingConstrained = false;
                let minDistanceToOtherBlob = Infinity;
                
                for (const otherBlob of blobs) {
                    if (otherBlob === this || !otherBlob.isVisible) continue;
                    const distance = p5.Vector.dist(this.pos, otherBlob.pos);
                    minDistanceToOtherBlob = Math.min(minDistanceToOtherBlob, distance);
                    
                    if (distance < spacingDistance) {
                        isSpacingConstrained = true;
                        break;
                    }
                }
                
                // Create varied movement patterns based on blob ID and audio
                const time = getAnimationFrame() * 0.01 + this.timeOffset;
                const audioInfluence = this.smoothedAudioLevel * 2; // Audio affects movement intensity
                
                // Reduce movement intensity when spacing is constrained
                let movementIntensity = 1.0;
                
                // BLUR EFFECT: Reduce movement when blur is active
                if (this.blur > 0) {
                    const blurReduction = Math.min(this.blur / 5, 0.9); // Max 90% reduction
                    movementIntensity *= (1 - blurReduction);
                    
                    if (p.frameCount % 180 === 0 && this.id === 0) {
                    }
                }
                if (isSpacingConstrained) {
                    // The closer we are to the spacing limit, the less we move
                    const spacingRatio = minDistanceToOtherBlob / spacingDistance;
                    movementIntensity = Math.max(0.1, spacingRatio); // Never go below 10% movement
                    
                    // For "far away" spacing, be extra conservative
                    if (spacingDistance >= 600) {
                        movementIntensity *= 0.3; // Very limited movement when far spacing is required
                    }
                }
                
                // Base movement patterns - each blob gets a different "personality"
                let movementForce = p.createVector(0, 0);
                
                switch (this.id % 4) {
                    case 0: // Orbital movement
                        {
                            const orbitRadius = homeRadius * 0.3 * (1 + audioInfluence * 0.5) * movementIntensity;
                            const orbitSpeed = 0.02 + audioInfluence * 0.01;
                            const orbitX = homeCenter.x + Math.cos(time * orbitSpeed) * orbitRadius;
                            const orbitY = homeCenter.y + Math.sin(time * orbitSpeed) * orbitRadius;
                            movementForce = p5.Vector.sub(p.createVector(orbitX, orbitY), this.pos);
                            movementForce.mult(0.1 * movementIntensity);
                        }
                        break;
                        
                    case 1: // Figure-8 movement
                        {
                            const fig8Scale = homeRadius * 0.4 * (1 + audioInfluence * 0.3) * movementIntensity;
                            const fig8Speed = 0.015 + audioInfluence * 0.008;
                            const fig8X = homeCenter.x + Math.sin(time * fig8Speed) * fig8Scale;
                            const fig8Y = homeCenter.y + Math.sin(time * fig8Speed * 2) * fig8Scale * 0.5;
                            movementForce = p5.Vector.sub(p.createVector(fig8X, fig8Y), this.pos);
                            movementForce.mult(0.08 * movementIntensity);
                        }
                        break;
                        
                    case 2: // Pulsing movement (in and out from center)
                        {
                            const pulseRadius = homeRadius * 0.6 * (0.3 + 0.7 * Math.abs(Math.sin(time * 0.03))) * movementIntensity;
                            const pulseAngle = this.timeOffset + audioInfluence * 0.5;
                            const pulseX = homeCenter.x + Math.cos(pulseAngle) * pulseRadius;
                            const pulseY = homeCenter.y + Math.sin(pulseAngle) * pulseRadius;
                            movementForce = p5.Vector.sub(p.createVector(pulseX, pulseY), this.pos);
                            movementForce.mult(0.12 * movementIntensity);
                        }
                        break;
                        
                    case 3: // Wandering movement with noise
                        {
                            const wanderRadius = homeRadius * 0.5 * movementIntensity;
                            const noiseScale = 0.005;
                            const wanderX = homeCenter.x + (p.noise(time * noiseScale, this.timeOffset) - 0.5) * wanderRadius * 2;
                            const wanderY = homeCenter.y + (p.noise(time * noiseScale + 100, this.timeOffset + 100) - 0.5) * wanderRadius * 2;
                            movementForce = p5.Vector.sub(p.createVector(wanderX, wanderY), this.pos);
                            movementForce.mult(0.06 * movementIntensity);
                        }
                        break;
                }
                
                // Add some randomness for more organic movement (also scaled by movement intensity)
                let randomJitter = p5.Vector.random2D().mult((0.1 + audioInfluence * 0.1) * movementIntensity);
                movementForce.add(randomJitter);
                
                // Add audio-reactive "dancing" - stronger when audio is present (also scaled)
                if (this.smoothedAudioLevel > 0.1) {
                    let dancingForce = p5.Vector.random2D().mult(audioInfluence * 0.3 * movementIntensity);
                    // Make dancing more rhythmic
                    let rhythm = Math.sin(time * 2) * Math.sin(time * 3.7) * 0.5 + 0.5;
                    dancingForce.mult(rhythm);
                    movementForce.add(dancingForce);
                }
                
                // Apply the calculated movement force
                this.vel.add(movementForce);
                
                // Limit velocity to prevent too erratic movement (also consider spacing)
                const maxVelocity = (1.8 + audioInfluence * 0.5) * movementIntensity;
                this.vel.limit(maxVelocity);
                
                if (p.frameCount % 300 === 0 && this.id === 0) {
                }
            }

            update() {
                // Handle visibility immediately (not interpolated)
                this.isVisible = this.target.isVisible;
                
                // Update cached strength
                this.updateStrength();
                
                // Faster parameter transitions for better emotion responsiveness
                for (const key in defaultBlobVisuals) {
                    if (typeof this[key] === 'number' && key !== 'blur' && key !== 'humor' && key !== 'shine') {
                        this[key] = p.lerp(this[key], this.target[key], 0.15); // Much faster transitions for responsiveness
                    } else {
                        this[key] = this.target[key]; // Direct assignment for non-numeric values and special effects (blur, humor, shine)
                    }
                }
                
                // Apply blob spacing and repulsion forces 
                this.applyBlobSpacing(); // Always apply spacing regardless of blur level (this sets dynamic home regions)
                
                // Get home region center for tethering (with caching) - ONLY if blob spacing didn't set it
                // Skip home region setup completely if blob spacing is active
                const hasActiveSpacing = this.minBlobSpacing && (
                    typeof this.minBlobSpacing === 'string' ? blobSpacingPresets[this.minBlobSpacing] !== undefined : 
                    typeof this.minBlobSpacing === 'number'
                );
                if (!hasActiveSpacing && (!this.cachedHomeCenter || this.homeRegion !== this.lastHomeRegion)) {
                    this.cachedHomeCenter = getRegionCenter(this.homeRegion);
                    this.cachedHomeRadius = Math.min(p.width, p.height) * 0.12; // Larger radius for distinct territories
                    this.lastHomeRegion = this.homeRegion;
                    
                    // Log home region updates
                    if (p.frameCount % 60 === 0) {
                        console.log(`🏠 [${sketchInstanceId}] Blob ${this.id} home region: ${this.homeRegion} at (${this.cachedHomeCenter.x.toFixed(0)}, ${this.cachedHomeCenter.y.toFixed(0)})`);
                    }
                } else if (this.minBlobSpacing && p.frameCount % 300 === 0) {
                    // Log when using dynamic blob spacing instead of home regions
                    console.log(`🎯 [${sketchInstanceId}] Blob ${this.id} using DYNAMIC spacing positioning instead of home regions`);
                }
                
                // Only use home region movement if blob spacing is not active
                // hasActiveSpacing already declared above
                const homeCenter = this.cachedHomeCenter;
                const homeRadius = this.cachedHomeRadius;
                
                // Calculate distance from home center (for debugging)
                const distanceFromHome = homeCenter ? p5.Vector.dist(this.pos, homeCenter) : 0;
                
                // Dynamic movement within home region (unless at maximum blur OR paused OR blob spacing is active)
                if (!hasActiveSpacing && this.blur < 5 && !window.pausedRenderingMode && homeCenter) {
                    this.applyDynamicMovement(homeCenter, homeRadius);
                } else if (hasActiveSpacing && p.frameCount % 300 === 0 && this.id === 0) {
                    console.log(`🎯 [${sketchInstanceId}] Home region movement DISABLED - using blob spacing: ${this.minBlobSpacing}`);
                } else {
                    // Maximum blur OR paused: stay completely stationary
                    this.vel.mult(0.1); // Drastically reduce any existing velocity
                    if (p.frameCount % 180 === 0 && this.id === 0) {
                    }
                }
                
                // Smooth movement towards target position (when changing regions, unless paused)
                if (this.targetPos && !window.pausedRenderingMode) {
                    const distanceToTarget = p5.Vector.dist(this.pos, this.targetPos);
                    if (distanceToTarget > 5) { // Only move if not close enough
                        // Create movement force towards target
                        let moveForce = p5.Vector.sub(this.targetPos, this.pos);
                        moveForce.normalize();
                        
                        // Enhanced movement speed for spacing transitions
                        let movementSpeed = 0.8; // Default movement speed
                        if (this.spacingTransitionActive && this.spacingTransitionSpeed) {
                            movementSpeed = this.spacingTransitionSpeed; // Use custom transition speed
                            // Add smooth easing for spacing transitions
                            const easingFactor = Math.min(1.0, distanceToTarget / 200); // Ease out as we get closer
                            movementSpeed *= easingFactor;
                        }
                        
                        moveForce.mult(movementSpeed);
                        this.vel.add(moveForce);
                        
                        // Log transition progress
                        if (this.spacingTransitionActive && p.frameCount % 30 === 0) {
                            console.log(`🎬 [${sketchInstanceId}] Blob ${this.id} transitioning: ${distanceToTarget.toFixed(1)}px remaining`);
                        }
                    } else {
                        // Close enough to target, clear it and resume normal movement
                        if (this.spacingTransitionActive) {
                            console.log(`✅ [${sketchInstanceId}] Blob ${this.id} reached new spacing position - transition complete`);
                            this.spacingTransitionActive = false;
                            this.spacingTransitionSpeed = null;
                        }
                        this.targetPos = null;
                    }
                }
                
                // Apply movement (unless at maximum blur OR paused) with increased responsiveness
                if (this.blur < 5 && !window.pausedRenderingMode) {
                    this.pos.add(this.vel);
                    
                    // Stronger home region guidance to keep blobs in their territories
                    if (distanceFromHome > homeRadius * 1.5) { // Pull back when moderately far from home
                        const blurReduction = this.blur > 0 ? (1 - this.blur / 10) : 1; // Reduce pull when blurred
                        
                        // Stronger pull back towards home center, scaled by distance
                        let pullForce = p5.Vector.sub(homeCenter, this.pos);
                        pullForce.normalize();
                        const pullStrength = p.map(distanceFromHome, homeRadius * 1.5, homeRadius * 3, 0.03, 0.08);
                        pullForce.mult(pullStrength * blurReduction);
                        this.vel.add(pullForce);
                    }
                }

                // Minimal edge boundaries - allow blobs to flow naturally to edges
                let margin = 10; // Very small margin, just to prevent completely going off-screen
                if (this.pos.x < margin) {
                    this.vel.x = Math.abs(this.vel.x) * 0.1; // Gentle push back
                }
                if (this.pos.x > p.width - margin) {
                    this.vel.x = -Math.abs(this.vel.x) * 0.1; // Gentle push back
                }
                if (this.pos.y < margin) {
                    this.vel.y = Math.abs(this.vel.y) * 0.1; // Gentle push back
                }
                if (this.pos.y > p.height - margin) {
                    this.vel.y = -Math.abs(this.vel.y) * 0.1; // Gentle push back
                }
                
                // Add gentle damping for smoother movement (stronger damping when blurred)
                const dampingFactor = this.blur > 0 ? (0.95 - this.blur * 0.05) : 0.98; // More damping when blurred
                this.vel.mult(dampingFactor);
                
                // Soft canvas bounds - allow slight overflow for natural blob edges
                this.pos.x = p.constrain(this.pos.x, -margin, p.width + margin);
                this.pos.y = p.constrain(this.pos.y, -margin, p.height + margin);

                // Audio response with breathing effect - using smoothed audio level
                let breathingPulse = p.sin(getAnimationFrame() * 0.05 + this.timeOffset) * 0.5 + 1;
                
                // Use smoothed audio level for much more linear response
                let audioResponse = 1 + this.smoothedAudioLevel * (this.volumeImpact * 0.03); // Reduced multiplier for gentler response
                
                // Apply growth pattern to audio response
                if (this.blobGrowthPattern && this.smoothedAudioLevel > 0) {
                    const audioLevel = this.smoothedAudioLevel;
                    switch (this.blobGrowthPattern) {
                        case "exponential":
                            audioResponse = 1 + Math.pow(audioLevel * 2, 2) * (this.volumeImpact * 0.02);
                            break;
                        case "logarithmic":
                            audioResponse = 1 + Math.log(1 + audioLevel * 10) * (this.volumeImpact * 0.05);
                            break;
                        case "sine":
                            audioResponse = 1 + Math.sin(audioLevel * Math.PI * 0.5) * (this.volumeImpact * 0.04);
                            break;
                        case "linear":
                        default:
                            // Already calculated above
                            break;
                    }
                }
                
                this.cachedStrength = this.blobStrength * audioResponse * breathingPulse;
            }

            applyBlobSpacing() {
                // DYNAMIC POSITIONING: Use spacing to create virtual home regions on left/right sides
                // This allows blobs to move freely within their side while maintaining spacing
                
                // Debug logging
                if (p.frameCount % 60 === 0 && this.id === 0) {
                    console.log(`🐛 [${sketchInstanceId}] DEBUG: Blob ${this.id} minBlobSpacing = '${this.minBlobSpacing}' (type: ${typeof this.minBlobSpacing})`);
                    console.log(`🔍 [${sketchInstanceId}] Available presets:`, Object.keys(blobSpacingPresets));
                    console.log(`🔍 [${sketchInstanceId}] Preset value for '${this.minBlobSpacing}':`, blobSpacingPresets[this.minBlobSpacing]);
                }
                
                // Convert minBlobSpacing from string to pixel distance using presets
                let spacingDistance;
                if (typeof this.minBlobSpacing === 'string' && blobSpacingPresets[this.minBlobSpacing]) {
                    spacingDistance = blobSpacingPresets[this.minBlobSpacing];
                    if (p.frameCount % 300 === 0 && this.id === 0) {
                        console.log(`🎯 [${sketchInstanceId}] Using spacing: ${this.minBlobSpacing} = ${spacingDistance}px`);
                    }
                } else if (typeof this.minBlobSpacing === 'string' && !blobSpacingPresets[this.minBlobSpacing]) {
                    // Handle invalid preset names by defaulting to 'close'
                    spacingDistance = blobSpacingPresets['close'] || 300;
                    if (p.frameCount % 300 === 0 && this.id === 0) {
                        console.warn(`⚠️ [${sketchInstanceId}] Invalid spacing preset '${this.minBlobSpacing}', using close (${spacingDistance}px)`);
                    }
                } else if (typeof this.minBlobSpacing === 'number') {
                    spacingDistance = this.minBlobSpacing;
                    if (p.frameCount % 300 === 0 && this.id === 0) {
                        console.log(`🎯 [${sketchInstanceId}] Using numeric spacing: ${spacingDistance}px`);
                    }
                } else {
                    // Fallback to default proportional distance
                    spacingDistance = Math.min(p.width, p.height) * 0.15;
                    if (p.frameCount % 300 === 0 && this.id === 0) {
                        console.log(`🎯 [${sketchInstanceId}] Using default spacing: ${spacingDistance}px (no minBlobSpacing set)`);
                    }
                }
                
                // DYNAMIC HOME REGIONS: Update home regions based on spacing
                const centerX = p.width / 2;
                const centerY = p.height / 2;
                const halfSpacing = spacingDistance / 2;
                
                // Store previous position for smooth transition detection
                const prevHomeCenter = this.cachedHomeCenter ? this.cachedHomeCenter.copy() : null;
                
                if (this.id === 0) {
                    // Red speaker (Speaker 0) - LEFT SIDE with dynamic home region
                    const targetX = centerX - halfSpacing;
                    
                    // Update the cached home center to reflect spacing
                    this.cachedHomeCenter = p.createVector(targetX, centerY);
                    
                    // Dynamic radius based on spacing setting - more spacing = more freedom to move
                    if (spacingDistance === 0) {
                        this.cachedHomeRadius = 30; // Together = minimal movement area
                    } else if (spacingDistance <= 300) {
                        this.cachedHomeRadius = Math.max(80, spacingDistance * 0.4); // Close = medium movement area
                    } else {
                        this.cachedHomeRadius = Math.min(p.width * 0.3, spacingDistance * 0.4); // Far away = large movement area but not too large
                    }
                    
                    if (p.frameCount % 300 === 0) {
                        console.log(`🔴 [${sketchInstanceId}] Red speaker (0) LEFT side: center x=${targetX.toFixed(0)}, radius=${this.cachedHomeRadius.toFixed(0)}, spacing=${spacingDistance}`);
                    }
                } else if (this.id === 1) {
                    // Blue speaker (Speaker 1) - RIGHT SIDE with dynamic home region  
                    const targetX = centerX + halfSpacing;
                    
                    // Update the cached home center to reflect spacing
                    this.cachedHomeCenter = p.createVector(targetX, centerY);
                    
                    // Dynamic radius based on spacing setting - more spacing = more freedom to move
                    if (spacingDistance === 0) {
                        this.cachedHomeRadius = 30; // Together = minimal movement area
                    } else if (spacingDistance <= 300) {
                        this.cachedHomeRadius = Math.max(80, spacingDistance * 0.4); // Close = medium movement area
                    } else {
                        this.cachedHomeRadius = Math.min(p.width * 0.3, spacingDistance * 0.4); // Far away = large movement area but not too large
                    }
                    
                    if (p.frameCount % 300 === 0) {
                        console.log(`🔵 [${sketchInstanceId}] Blue speaker (1) RIGHT side: center x=${targetX.toFixed(0)}, radius=${this.cachedHomeRadius.toFixed(0)}, spacing=${spacingDistance}`);
                    }
                }
                
                // ENHANCED: If the home center changed significantly, update target position immediately for responsive feedback
                if (prevHomeCenter && this.cachedHomeCenter) {
                    const centerDistance = p5.Vector.dist(prevHomeCenter, this.cachedHomeCenter);
                    if (centerDistance > 10) { // Significant change threshold
                        this.targetPos = this.cachedHomeCenter.copy();
                        console.log(`🎯 [${sketchInstanceId}] Blob ${this.id} spacing changed significantly (${centerDistance.toFixed(1)}px), updating target position immediately`);
                    }
                }
            }
        }
    
        // Function to get highlight information for colored ASCII (from reference code)
        function getHighlight(blob, x, y) {
            const index = blobs.indexOf(blob);
            if (index === -1) {
                return null;
            }
            
            if (!highlightGrids[index]) {
                return null;
            }
            
            const highlight = highlightGrids[index].find(h => h.x === x && h.y === y);
            
            if (p.frameCount % 300 === 0 && x === 10 && y === 10) {
            }
            
            return highlight;
        }
    
        function drawMetaballAscii(g, renderWidth = null, renderHeight = null) {
            g.textAlign(p.CENTER, p.CENTER);
            g.textFont('Miriam Libre, sans-serif');
            const targetWidth = renderWidth || g.width;
            const targetHeight = renderHeight || g.height;
            
            // Use dynamic grid resolution if specified in segment metadata
            let effectiveGridSize = gridsize;
            if (currentMeta && currentMeta.gridResolution !== undefined) {
                effectiveGridSize = Math.max(40, Math.min(150, Math.round(currentMeta.gridResolution)));
                if (p.frameCount % 300 === 0) {
                    console.log(`🔍 [${sketchInstanceId}] Using custom grid resolution: ${effectiveGridSize} (from ${currentMeta.gridResolution}) - Word-based calculation`);
                }
            }
            
            const stepX = targetWidth / effectiveGridSize;
            const stepY = targetHeight / effectiveGridSize;
            
            // Draw only the blobs (no background)
            drawMetaballAsciiCore(g, targetWidth, targetHeight, effectiveGridSize);
        }
        
        function drawMetaballAsciiWithCustomGrid(g, renderWidth, renderHeight, customGridSize) {
            g.textAlign(p.CENTER, p.CENTER);
            g.textFont('Miriam Libre, sans-serif');
            
            // Override with segment-specific grid resolution if available
            let effectiveGridSize = customGridSize;
            if (currentMeta && currentMeta.gridResolution !== undefined) {
                effectiveGridSize = Math.max(40, Math.min(150, Math.round(currentMeta.gridResolution)));
            }
            
            // Draw only the blobs (no background)
            drawMetaballAsciiCore(g, renderWidth, renderHeight, effectiveGridSize);
        }
        
        function drawMetaballAsciiCore(g, targetWidth, targetHeight, useGridSize) {
            const stepX = targetWidth / useGridSize;
            const stepY = targetHeight / useGridSize;
            
            let charactersDrawn = 0;
            let maxInfluenceFound = 0;
            let shapedInfluenceCount = 0;
            let maxShapedInfluence = 0;
            let emotionDrawCount = {}; // Track how many of each emotion are drawn
        
            for (let x = 0; x < useGridSize; x++) {
                for (let y = 0; y < useGridSize; y++) {
                    const gx = x * stepX + stepX / 2;
                    const gy = y * stepY + stepY / 2;
                    let maxInfluence = 0;
                    let dominantBlob = null;
            
                                    for (const b of blobs) {
                    if (!b.isVisible) {
                        if (p.frameCount % 60 === 0) { // Log every 60 frames to avoid spam
                        }
                        continue;
                    }
                        
                        const t = getAnimationFrame() * b.breathSpeed;
                        const dx = gx - b.pos.x;
                        const dy = gy - b.pos.y;
                        let d2 = dx * dx + dy * dy;
                        if (d2 === 0) d2 = 1;
            
                        let angle = Math.atan2(dy, dx);
                        let n1 = p.noise(0.01 * b.pos.x + Math.cos(angle * 3.0 + t), 0.01 * b.pos.y + Math.sin(angle * 2.5 - t));
                        let n2 = p.noise(0.015 * b.pos.x + Math.cos(angle * 1.7 - t * 0.5), 0.015 * b.pos.y + Math.sin(angle * 1.3 + t * 0.3));
                        let distortion = Math.sin(n1 * Math.PI) * Math.cos(n2 * Math.PI);
                        
                        let distortedStrength = b.getStrength() * b.blobSizeScale * (1 + b.blobiness * 0.3 * distortion);
                        let influence = (distortedStrength * b.blobDensity) / (d2 * b.blobSpreadField + 1e-6);
            
                        if (influence > maxInfluence) {
                            maxInfluence = influence;
                            dominantBlob = b;
                        }
                    }
                    
                    if (maxInfluence > maxInfluenceFound) {
                        maxInfluenceFound = maxInfluence;
                    }
            
                    if (maxInfluence > drawThreshold && dominantBlob) {
                        const influence = p.constrain(maxInfluence, 0, 1);
                        let shapedInfluence = p.pow(influence, dominantBlob.gradientStrength);
                        shapedInfluence = 1.0 - p.pow(1.0 - shapedInfluence, dominantBlob.gradientStrength);
                        
                        shapedInfluenceCount++;
                        if (shapedInfluence > maxShapedInfluence) {
                            maxShapedInfluence = shapedInfluence;
                        }
                        
                        if (shapedInfluence >= finalDrawThreshold) {
                            // Check if this specific position should be a colored emotion character
                            const circlesPerEmotion = currentMeta.circlesPerEmotion || 5;
                            
                            // Map blur grid coordinates to normal grid coordinates for highlight lookup
                            const normalGridX = useGridSize === gridsize ? x : Math.min(gridsize - 1, Math.floor((x / useGridSize) * gridsize));
                            const normalGridY = useGridSize === gridsize ? y : Math.min(gridsize - 1, Math.floor((y / useGridSize) * gridsize));
                            
                            // Get the blob index to check its specific highlight positions
                            const blobIndex = blobs.indexOf(dominantBlob);
                            const highlight = getHighlight(dominantBlob, normalGridX, normalGridY);
                            const shouldBeColored = highlight && dominantBlob.currentEmotions.length > 0;
                            
                            if (p.frameCount % 120 === 0 && x === 10 && y === 10) {
                                if (blobIndex >= 0 && highlightGrids[blobIndex]) {
                                }
                                // Log coordinate mapping for blur rendering
                                if (useGridSize !== gridsize) {
                                }
                            }
                            
                            if (shouldBeColored) {
                                // Pick an emotion using better randomization to avoid grouping
                                // Use mapped coordinates for consistent emotion selection between blur and normal rendering
                                const hashX = useGridSize === gridsize ? x : normalGridX;
                                const hashY = useGridSize === gridsize ? y : normalGridY;
                                const emotionHash = ((hashX * 12345) ^ (hashY * 67890)) % dominantBlob.currentEmotions.length;
                                const selectedEmotion = dominantBlob.currentEmotions[emotionHash];
                                
                                // Count this emotion
                                emotionDrawCount[selectedEmotion] = (emotionDrawCount[selectedEmotion] || 0) + 1;
                                
                                // Enhanced logging for multiple emotions (reduced frequency)
                                if (p.frameCount % 240 === 0 && dominantBlob.currentEmotions.length > 1 && x < 5 && y < 5) {
                                    console.log(`🎨 [${sketchInstanceId}] Multi-emotion blob ${blobs.indexOf(dominantBlob)}: ${dominantBlob.currentEmotions.length} emotions`);
                                    console.log(`🎭 [${sketchInstanceId}] Available emotions:`, dominantBlob.currentEmotions);
                                    console.log(`🎨 [${sketchInstanceId}] Available colors:`, dominantBlob.displayColors);
                                    console.log(`🎯 [${sketchInstanceId}] Selected emotion: "${selectedEmotion}" (index ${emotionHash})`);
                                }
                                
                                // Colored ASCII with noise-based animation
                                let n = p.noise(x * 0.1, y * 0.1, getAnimationFrame() * 0.01); // Position-based noise
                                
                                // Use emotion colors if available, otherwise use default palette
                                let baseColor = [150, 150, 150]; // Default gray
                                let colorInfo = "default";
                                
                                if (dominantBlob.displayColors.length > 0) {
                                    // Find the index of the selected emotion in the blob's current emotions
                                    const emotionIndex = dominantBlob.currentEmotions.indexOf(selectedEmotion);
                                    if (emotionIndex !== -1 && emotionIndex < dominantBlob.displayColors.length) {
                                        baseColor = dominantBlob.displayColors[emotionIndex];
                                        colorInfo = `emotion[${emotionIndex}]:"${selectedEmotion}"`;
                                        
                                        // Enhanced debugging for multiple emotion colors
                                        if (p.frameCount % 240 === 0 && dominantBlob.currentEmotions.length > 1) {
                                            console.log(`✅ [${sketchInstanceId}] Perfect match: emotion "${selectedEmotion}" → color [${baseColor.join(', ')}]`);
                                        }
                                    } else {
                                        // Fallback to random color from available colors
                                        const colorIndex = Math.floor(p.random(dominantBlob.displayColors.length));
                                        baseColor = dominantBlob.displayColors[colorIndex];
                                        colorInfo = `fallback[${colorIndex}]`;
                                        
                                        if (p.frameCount % 240 === 0 && dominantBlob.currentEmotions.length > 1) {
                                            console.warn(`⚠️ [${sketchInstanceId}] Fallback color for "${selectedEmotion}" → [${baseColor.join(', ')}]`);
                                        }
                                    }
                                }
                                
                                // Create MUCH more subtle color variation to preserve emotion colors
                                let r = p.lerp(baseColor[0] * 0.9, baseColor[0] * 1.1, n); // Reduced from 0.7-1.3 to 0.9-1.1
                                let g_val = p.lerp(baseColor[1] * 0.9, baseColor[1] * 1.1, n);
                                let b = p.lerp(baseColor[2] * 0.9, baseColor[2] * 1.1, n);
                                
                                // Add gentle pulsing (reduced intensity to preserve emotion color)
                                let pulse = 0.95 + 0.05 * p.sin(getAnimationFrame() * 0.03 + x + y); // Reduced from 0.85-1.0 to 0.95-1.0
                                
                                let finalColor = p.color(r * pulse, g_val * pulse, b * pulse);
                                if (dominantBlob.isFlashing && getAnimationFrame() % 8 < 4) finalColor = p.color(255);
                                
                                // Apply individual blob blur effects (pure opacity reduction only)
                                if (dominantBlob.blur > 0) {
                                    // Reduce opacity based on blur level
                                    const blurOpacity = p.map(dominantBlob.blur, 0, 10, 255, 20);
                                    finalColor.setAlpha(Math.max(20, blurOpacity)); // Minimum 20 opacity
                                }
                                
                                // NO SHINE EFFECTS on emotion colored characters - keep pure emotion colors!
                                
                                g.fill(finalColor);
                                // Fixed character size independent of grid resolution
                                const baseCharSize = 20; // Base character size in pixels
                                g.textSize(baseCharSize * dominantBlob.coloredCircleCharSize * 2.3); // Size multiplier from reference
                                
                                // Enhanced emotion system - emotions INSIDE the blob with webcam-like movement
                                let emotionCharset;
                                let emotionActivity = 0;
                                let currentEmotionIndex = 0;
                                
                                // Get ALL emotions for the current segment (not just primary)
                                const allEmotions = dominantBlob.currentEmotions || [selectedEmotion];
                                const emotionCount = allEmotions.length;
                                
                                // Calculate activity level with webcam-inspired motion
                                if (dominantBlob) {
                                    const normalizedStrength = Math.min(1, dominantBlob.cachedStrength / 2000);
                                    const audioLevel = dominantBlob.smoothedAudioLevel || 0;
                                    
                                    // Webcam-inspired motion simulation
                                    const time = getAnimationFrame() * 0.01;
                                    const motionNoise = p.noise(x * 0.05 + time, y * 0.05 + time * 0.8);
                                    const motionActivity = Math.abs(motionNoise - 0.5) * 2;
                                    
                                    // Combine activity factors like webcam code
                                    emotionActivity = (normalizedStrength * 0.4) + (audioLevel * 0.3) + (motionActivity * 0.3);
                                    
                                    // GUARANTEED ALL EMOTIONS DISPLAY - Spatial distribution ensures every emotion appears
                                    if (emotionCount > 1) {
                                        // Method 1: Spatial sectors - divide blob area into emotion zones
                                        const blobCenterX = dominantBlob.pos.x;
                                        const blobCenterY = dominantBlob.pos.y;
                                        const distanceFromCenter = Math.sqrt((gx - blobCenterX) ** 2 + (gy - blobCenterY) ** 2);
                                        const angleFromCenter = Math.atan2(gy - blobCenterY, gx - blobCenterX);
                                        
                                        // Create emotion sectors in a circle (like pie slices)
                                        const normalizedAngle = (angleFromCenter + Math.PI) / (2 * Math.PI); // 0 to 1
                                        const sectorIndex = Math.floor(normalizedAngle * emotionCount);
                                        
                                        // Method 2: Distance-based rings for additional distribution
                                        const maxDistance = stepX * 10; // Approximate blob radius
                                        const normalizedDistance = Math.min(1, distanceFromCenter / maxDistance);
                                        const ringIndex = Math.floor(normalizedDistance * emotionCount);
                                        
                                        // Method 3: Grid-based distribution for comprehensive coverage
                                        const gridSizeX = Math.ceil(Math.sqrt(emotionCount));
                                        const gridSizeY = Math.ceil(emotionCount / gridSizeX);
                                        const gridX = Math.floor(((gx - blobCenterX + stepX * 5) / stepX) % gridSizeX);
                                        const gridY = Math.floor(((gy - blobCenterY + stepY * 5) / stepY) % gridSizeY);
                                        const gridIndex = (gridY * gridSizeX + gridX) % emotionCount;
                                        
                                        // Method 4: Time-based cycling with position offset for guaranteed coverage
                                        const fastCycle = (time * 2 + x * 0.1 + y * 0.1) % emotionCount;
                                        const timeCycleIndex = Math.floor(fastCycle);
                                        
                                        // Combine methods to ensure ALL emotions appear across different areas
                                        const methodSelector = (x + y) % 4;
                                        switch (methodSelector) {
                                            case 0: currentEmotionIndex = sectorIndex; break;     // Pie sectors
                                            case 1: currentEmotionIndex = ringIndex; break;      // Distance rings
                                            case 2: currentEmotionIndex = gridIndex; break;      // Grid distribution
                                            case 3: currentEmotionIndex = timeCycleIndex; break; // Time cycling
                                        }
                                        
                                        // Ensure valid index
                                        currentEmotionIndex = Math.max(0, Math.min(emotionCount - 1, currentEmotionIndex));
                                        
                                        // Store method info for debugging (declare here to access in debug section)
                                        window.debugMethodSelector = methodSelector;
                                        window.debugSectorIndex = sectorIndex;
                                        window.debugRingIndex = ringIndex;
                                        window.debugGridIndex = gridIndex;
                                        window.debugTimeCycleIndex = timeCycleIndex;
                                        
                                    } else {
                                        currentEmotionIndex = 0; // Single emotion
                                    }
                                }
                                
                                // Get the current emotion for this position in the blob
                                const currentEmotion = allEmotions[currentEmotionIndex] || selectedEmotion;
                                
                                // Emotion-specific character sets - standardized circular characters for all emotions
                                const emotionSpecificChars = {
                                    'שמחה': ['○', '●'],        // happiness
                                    'שמח': ['○', '●'],         // happy (alternative)
                                    'עליזות': ['○', '●'],     // joy
                                    'התרגשות': ['○', '●'],    // excitement
                                    'אהבה': ['○', '●'],       // love
                                    'הפתעה': ['○', '●'],      // surprise
                                    'כעס': ['○', '●'],        // anger
                                    'פחד': ['○', '●'],        // fear
                                    'עצב': ['○', '●'],        // sadness
                                    'גועל': ['○', '●'],       // disgust
                                    'סקרנות': ['○', '●'],     // curiosity
                                    'תסכול': ['○', '●'],      // frustration
                                    'חרדה': ['○', '●'],       // anxiety
                                    'תקווה': ['○', '●'],      // hope
                                    'גאווה': ['○', '●'],      // pride
                                    'נייטרלי': ['○', '●'],    // neutral
                                    'ניטרלי': ['○', '●'],     // neutral (alternative)
                                    'default': ['○', '●']
                                };
                                
                                // Select character set based on current emotion and activity (like webcam)
                                const baseCharset = emotionSpecificChars[currentEmotion] || 
                                                   emotionSpecificChars[currentEmotion?.toLowerCase()] || 
                                                   emotionSpecificChars.default;
                                
                                // Activity-based character selection (inspired by webcam intensity levels)
                                let activityCharset;
                                if (emotionActivity < 0.2) {
                                    activityCharset = baseCharset.slice(-2);  // Calm - simple chars
                                } else if (emotionActivity < 0.5) {
                                    activityCharset = baseCharset.slice(-3);  // Moderate - medium variety
                                } else if (emotionActivity < 0.8) {
                                    activityCharset = baseCharset.slice(-4);  // Active - more variety
                                } else {
                                    activityCharset = baseCharset;  // Very active - full variety
                                }
                                
                                emotionCharset = activityCharset;
                                
                                // Enhanced color system - apply emotion colors within the blob
                                if (emotionGlobalColorMap && emotionGlobalColorMap[currentEmotion]) {
                                    // Use emotion-specific color from the global color map
                                    const emotionColor = emotionGlobalColorMap[currentEmotion];
                                    
                                    // Blend emotion color with base color based on activity (like webcam)
                                    const blendFactor = 0.6 + (emotionActivity * 0.4); // More emotion color with higher activity
                                    r = baseColor[0] * (1 - blendFactor) + emotionColor[0] * blendFactor;
                                    g_val = baseColor[1] * (1 - blendFactor) + emotionColor[1] * blendFactor;
                                    b = baseColor[2] * (1 - blendFactor) + emotionColor[2] * blendFactor;
                                    
                                } else if (emotionGlobalColorMap && emotionGlobalColorMap[currentEmotion?.toLowerCase()]) {
                                    // Try lowercase version
                                    const emotionColor = emotionGlobalColorMap[currentEmotion.toLowerCase()];
                                    const blendFactor = 0.6 + (emotionActivity * 0.4);
                                    r = baseColor[0] * (1 - blendFactor) + emotionColor[0] * blendFactor;
                                    g_val = baseColor[1] * (1 - blendFactor) + emotionColor[1] * blendFactor;
                                    b = baseColor[2] * (1 - blendFactor) + emotionColor[2] * blendFactor;
                                }
                                
                                // Webcam-inspired color enhancements
                                const colorTime = getAnimationFrame() * 0.01;
                                if (emotionActivity > 0.8) {
                                    // Very high activity - pulsing effect like webcam high intensity
                                    const pulseFactor = 1.2 + 0.3 * Math.sin(colorTime * 6 + x * 0.1 + y * 0.1);
                                    r = Math.min(255, r * pulseFactor);
                                    g_val = Math.min(255, g_val * pulseFactor);
                                    b = Math.min(255, b * pulseFactor);
                                } else if (emotionActivity > 0.6) {
                                    // High activity - enhanced brightness
                                    const enhanceFactor = 1.1 + (emotionActivity * 0.3);
                                    r = Math.min(255, r * enhanceFactor);
                                    g_val = Math.min(255, g_val * enhanceFactor);
                                    b = Math.min(255, b * enhanceFactor);
                                }
                                
                                // Multi-emotion variation - slight color shift for different emotions
                                if (emotionCount > 1) {
                                    const emotionShift = 0.9 + (currentEmotionIndex * 0.1); // Subtle variation per emotion
                                    r *= emotionShift;
                                    g_val *= emotionShift;
                                    b *= emotionShift;
                                } else if (currentMeta && currentMeta.colorCharset && Array.isArray(currentMeta.colorCharset)) {
                                    emotionCharset = currentMeta.colorCharset;
                                } else {
                                    emotionCharset = getEmotionCharset([selectedEmotion]);
                                }
                                
                                // Apply humor jitter effects (smooth noise-based movement)
                                let drawX = gx;
                                let drawY = gy;
                                if (dominantBlob.humor > 0) {
                                    // Smooth, organic jitter using Perlin noise
                                    const time = getAnimationFrame() * 0.02; // Animation speed
                                    const noiseScale = 0.01; // How zoomed in the noise is
                                    
                                    // Create unique noise coordinates for each position
                                    const noiseX = (gx * noiseScale) + time + (dominantBlob.id * 100);
                                    const noiseY = (gy * noiseScale) + time + (dominantBlob.id * 200);
                                    
                                    // Get smooth noise values (-1 to 1 range)
                                    const noiseOffsetX = (p.noise(noiseX, noiseY, time * 0.5) - 0.5) * 2;
                                    const noiseOffsetY = (p.noise(noiseX + 1000, noiseY + 1000, time * 0.7) - 0.5) * 2;
                                    
                                    // Scale jitter based on humor level (much larger scatter)
                                    const baseJitter = p.map(dominantBlob.humor, 0, 10, 0, stepX * 1.5); // Increased from 0.8 to 1.5
                                    
                                    // Add extra scatter for high humor levels
                                    let extraScatter = 0;
                                    if (dominantBlob.humor >= 6) {
                                        extraScatter = p.map(dominantBlob.humor, 6, 10, 0, stepX * 1.0); // Additional scatter
                                        // Add some randomness to the extra scatter for variety
                                        const randomMultiplier = 0.5 + p.noise(time * 0.3 + gx * 0.01 + gy * 0.01) * 1.0;
                                        extraScatter *= randomMultiplier;
                                    }
                                    
                                    const totalJitter = baseJitter + extraScatter;
                                    
                                    // Apply smooth jitter
                                    drawX += noiseOffsetX * totalJitter;
                                    drawY += noiseOffsetY * totalJitter;
                                    
                                    if (p.frameCount % 120 === 0 && gx < 100 && gy < 100) {
                                    }
                                }
                                
                                // Enhanced character selection with webcam-like movement INSIDE the blob
                                let charIndex;
                                let finalDrawX = drawX;
                                let finalDrawY = drawY;
                                
                                // Webcam-inspired character selection and movement within blob
                                const moveTime = getAnimationFrame() * 0.01;
                                
                                // Character selection based on activity level (like webcam intensity)
                                if (emotionActivity > 0.7) {
                                    // Very high activity - rapid character cycling like webcam high motion
                                    const rapidCycle = Math.floor(moveTime * 4 + x * 0.15 + y * 0.15 + currentEmotionIndex * 50) % emotionCharset.length;
                                    charIndex = rapidCycle;
                                } else if (emotionActivity > 0.4) {
                                    // High activity - medium cycling
                                    const mediumCycle = Math.floor(moveTime * 2 + x * 0.1 + y * 0.1 + currentEmotionIndex * 30) % emotionCharset.length;
                                    charIndex = mediumCycle;
                                } else if (emotionActivity > 0.2) {
                                    // Medium activity - slow cycling
                                    const slowCycle = Math.floor(moveTime * 1 + x * 0.05 + y * 0.05 + currentEmotionIndex * 20) % emotionCharset.length;
                                    charIndex = slowCycle;
                                } else {
                                    // Low activity - mostly static with subtle changes
                                    charIndex = Math.abs((x * 137 + y * 149 + currentEmotionIndex * 73 + Math.floor(getAnimationFrame() / 30)) % emotionCharset.length);
                                }
                                
                                // Webcam-inspired movement behavior WITHIN the blob
                                const motionIntensity = emotionActivity;
                                
                                if (motionIntensity > 0.6) {
                                    // High motion - create internal blob movement (like webcam blob effect)
                                    const blobCenterX = gx;
                                    const blobCenterY = gy;
                                    
                                    // Create virtual moving centers within the blob area
                                    const moveCenter1X = blobCenterX + Math.sin(moveTime * 1.5 + currentEmotionIndex) * stepX * 2;
                                    const moveCenter1Y = blobCenterY + Math.cos(moveTime * 1.2 + currentEmotionIndex) * stepY * 2;
                                    const moveCenter2X = blobCenterX + Math.sin(moveTime * 1.8 + currentEmotionIndex * 2) * stepX * 1.5;
                                    const moveCenter2Y = blobCenterY + Math.cos(moveTime * 1.6 + currentEmotionIndex * 2) * stepY * 1.5;
                                    
                                    // Calculate distance influence
                                    const dist1 = Math.sqrt((gx - moveCenter1X) ** 2 + (gy - moveCenter1Y) ** 2);
                                    const dist2 = Math.sqrt((gx - moveCenter2X) ** 2 + (gy - moveCenter2Y) ** 2);
                                    
                                    const influence1 = Math.max(0, 1 - dist1 / (stepX * 4));
                                    const influence2 = Math.max(0, 1 - dist2 / (stepX * 3));
                                    
                                    // Apply movement within blob bounds
                                    if (influence1 > 0.1 || influence2 > 0.1) {
                                        const moveX = Math.sin(moveTime * 2 + x * 0.1 + currentEmotionIndex) * stepX * motionIntensity * 0.2;
                                        const moveY = Math.cos(moveTime * 2.2 + y * 0.1 + currentEmotionIndex) * stepY * motionIntensity * 0.2;
                                        
                                        finalDrawX = drawX + moveX;
                                        finalDrawY = drawY + moveY;
                                    }
                                } else if (motionIntensity > 0.3) {
                                    // Medium motion - subtle organic movement within blob
                                    const organicX = (p.noise(x * 0.03 + moveTime + currentEmotionIndex, y * 0.03) - 0.5) * stepX * motionIntensity * 0.3;
                                    const organicY = (p.noise(y * 0.03 + moveTime + currentEmotionIndex, x * 0.03) - 0.5) * stepY * motionIntensity * 0.3;
                                    
                                    finalDrawX = drawX + organicX;
                                    finalDrawY = drawY + organicY;
                                }
                                
                                // Multi-emotion effect - slight position variation for different emotions
                                if (emotionCount > 1) {
                                    const emotionOffset = currentEmotionIndex * 0.3;
                                    const offsetX = Math.sin(moveTime + emotionOffset) * stepX * 0.1;
                                    const offsetY = Math.cos(moveTime * 1.1 + emotionOffset) * stepY * 0.1;
                                    
                                    finalDrawX += offsetX;
                                    finalDrawY += offsetY;
                                }
                                
                                // Activity-based size variation (like webcam intensity scaling)
                                if (emotionActivity > 0.2) {
                                    const baseSize = 1.0 + (currentEmotionIndex * 0.05); // Slight size difference per emotion
                                    const activitySize = baseSize + (emotionActivity * 0.4); // Scale with activity
                                    const pulseSize = 1.0 + Math.sin(moveTime * 3 + x * 0.1 + y * 0.1) * (emotionActivity * 0.1); // Activity-based pulsing
                                    g.textSize(baseCharSize * dominantBlob.coloredCircleCharSize * 2.3 * activitySize * pulseSize);
                                }
                                
                                g.text(emotionCharset[charIndex], finalDrawX, finalDrawY); // Use enhanced positioning
                                charactersDrawn++;
                                
                                if (p.frameCount % 120 === 0) {
                                    const finalRGB = [Math.round(p.red(finalColor)), Math.round(p.green(finalColor)), Math.round(p.blue(finalColor))];
                                    
                                    // Enhanced debug logging to verify ALL emotions are displayed
                                    if (x < 5 && y < 5 && p.frameCount % 600 === 0 && emotionCount > 1) {
                                        console.log(`🎭 [ALL EMOTIONS GUARANTEED] Segment has ${emotionCount} emotions: [${allEmotions.join(', ')}]`);
                                        console.log(`🎯 [Method ${window.debugMethodSelector || 'N/A'}] Current: ${currentEmotion} (${currentEmotionIndex}/${emotionCount}), Activity: ${emotionActivity.toFixed(2)}`);
                                        console.log(`📍 [Distribution] Sector:${window.debugSectorIndex || 'N/A'}, Ring:${window.debugRingIndex || 'N/A'}, Grid:${window.debugGridIndex || 'N/A'}, Time:${window.debugTimeCycleIndex || 'N/A'}`);
                                    }
                                    
                                    // Track emotion coverage for verification (reduced frequency)
                                    if (p.frameCount % 1200 === 0 && emotionCount > 1) {
                                        const coverageTracker = {};
                                        for (let testX = 0; testX < 20; testX++) {
                                            for (let testY = 0; testY < 20; testY++) {
                                                const testMethodSelector = (testX + testY) % 4;
                                                const testTime = getAnimationFrame() * 0.01;
                                                let testEmotionIndex = 0;
                                                
                                                // Test each method to verify coverage
                                                const testBlobCenterX = dominantBlob.pos.x;
                                                const testBlobCenterY = dominantBlob.pos.y;
                                                const testAngle = Math.atan2(testY - 10, testX - 10);
                                                const testNormalizedAngle = (testAngle + Math.PI) / (2 * Math.PI);
                                                const testSectorIndex = Math.floor(testNormalizedAngle * emotionCount);
                                                
                                                switch (testMethodSelector) {
                                                    case 0: testEmotionIndex = testSectorIndex; break;
                                                    case 1: testEmotionIndex = Math.floor((testX / 20) * emotionCount); break;
                                                    case 2: testEmotionIndex = (testX + testY) % emotionCount; break;
                                                    case 3: testEmotionIndex = Math.floor((testTime * 2 + testX * 0.1) % emotionCount); break;
                                                }
                                                
                                                testEmotionIndex = Math.max(0, Math.min(emotionCount - 1, testEmotionIndex));
                                                const testEmotion = allEmotions[testEmotionIndex];
                                                coverageTracker[testEmotion] = (coverageTracker[testEmotion] || 0) + 1;
                                            }
                                        }
                                        
                                        const coveredEmotions = Object.keys(coverageTracker);
                                        const coveragePercentage = (coveredEmotions.length / emotionCount) * 100;
                                        console.log(`📊 [EMOTION COVERAGE REPORT] ${coveredEmotions.length}/${emotionCount} emotions displayed (${coveragePercentage.toFixed(1)}%)`);
                                        console.log(`✅ [COVERED EMOTIONS] ${coveredEmotions.join(', ')}`);
                                        
                                        if (coveredEmotions.length < emotionCount) {
                                            const missedEmotions = allEmotions.filter(e => !coveredEmotions.includes(e));
                                            console.warn(`⚠️ [MISSED EMOTIONS] ${missedEmotions.join(', ')}`);
                                        }
                                    }
                                }
                            } else {
                                // Regular ASCII characters
                                let targetIndex = p.floor(p.map(shapedInfluence, 0, 1, 0, dominantBlob.asciiChars.length - 1));
                                let charToDraw = dominantBlob.asciiChars[targetIndex];
                                
                                // Check if there's a custom regularCharset parameter from the JSON
                                if (currentMeta && currentMeta.regularCharset && Array.isArray(currentMeta.regularCharset)) {
                                    const customCharset = currentMeta.regularCharset;
                                    targetIndex = p.floor(p.map(shapedInfluence, 0, 1, 0, customCharset.length - 1));
                                    charToDraw = customCharset[targetIndex];
                                    // Reduced logging frequency to reduce spam
                                    if (p.frameCount % 600 === 0) { // Only log occasionally
                                    }
                                }
                                
                                let asciiFillColor = p.color(...blobAsciiColor);
                                if (dominantBlob.isFlashing && getAnimationFrame() % 8 < 4) asciiFillColor = p.color(230, 230, 230);
                                
                                // Apply individual blob blur effects to regular ASCII (pure opacity reduction only)
                                if (dominantBlob.blur > 0) {
                                    // Reduce opacity based on blur level
                                    const blurOpacity = p.map(dominantBlob.blur, 0, 10, 255, 40);
                                    asciiFillColor.setAlpha(Math.max(30, blurOpacity)); // Minimum 30 opacity
                                }
                                
                                // Apply enhanced shine effects to regular ASCII
                                if (dominantBlob.shine > 0) {
                                    // Get current color components
                                    let shineR = p.red(asciiFillColor);
                                    let shineG = p.green(asciiFillColor);
                                    let shineB = p.blue(asciiFillColor);
                                    let shineA = p.alpha(asciiFillColor);
                                    
                                    // Enhanced brightness boost (slightly less than colored ASCII but still strong)
                                    const brightnessBoost = p.map(dominantBlob.shine, 0, 10, 1.0, 3.2); // Up to 3.2x brighter (was 2x)
                                    shineR = Math.min(255, shineR * brightnessBoost);
                                    shineG = Math.min(255, shineG * brightnessBoost);
                                    shineB = Math.min(255, shineB * brightnessBoost);
                                    
                                    // Add white glow overlay for high shine levels
                                    if (dominantBlob.shine >= 7) {
                                        const glowIntensity = p.map(dominantBlob.shine, 7, 10, 0.2, 0.6); // Slightly less than colored
                                        shineR = Math.min(255, shineR + (255 - shineR) * glowIntensity);
                                        shineG = Math.min(255, shineG + (255 - shineG) * glowIntensity);
                                        shineB = Math.min(255, shineB + (255 - shineB) * glowIntensity);
                                    }
                                    
                                    // Enhanced pulsing effect for higher shine levels
                                    if (dominantBlob.shine >= 2) { // Start pulsing earlier (was 3)
                                        const pulseSpeed = p.map(dominantBlob.shine, 2, 10, 0.07, 0.20); // Faster pulse (was 0.04-0.12)
                                        const pulseIntensity = p.map(dominantBlob.shine, 2, 10, 0.3, 1.0); // Much stronger pulse (was 0.15-0.6)
                                        const pulse = 1 + Math.sin(getAnimationFrame() * pulseSpeed + gx * 0.08 + gy * 0.08) * pulseIntensity;
                                        
                                        shineR = Math.min(255, shineR * pulse);
                                        shineG = Math.min(255, shineG * pulse);
                                        shineB = Math.min(255, shineB * pulse);
                                    }
                                    
                                    // Enhanced opacity for shine (stronger effect)
                                    const shineOpacity = p.map(dominantBlob.shine, 0, 10, shineA, 255);
                                    shineA = Math.min(255, shineOpacity * 1.15); // Extra opacity boost
                                    
                                    asciiFillColor = p.color(shineR, shineG, shineB, shineA);
                                }
                                
                                g.fill(asciiFillColor);
                                // Fixed character size independent of grid resolution
                                const baseAsciiSize = 16; // Base ASCII character size in pixels
                                g.textSize(baseAsciiSize * dominantBlob.regularAsciiCharSize);
                                
                                // Apply humor jitter effects to regular ASCII (smooth noise-based movement)
                                let drawX = gx;
                                let drawY = gy;
                                if (dominantBlob.humor > 0) {
                                    // Smooth, organic jitter using Perlin noise (same as colored ASCII)
                                    const time = getAnimationFrame() * 0.02; // Animation speed
                                    const noiseScale = 0.01; // How zoomed in the noise is
                                    
                                    // Create unique noise coordinates for each position
                                    const noiseX = (gx * noiseScale) + time + (dominantBlob.id * 100);
                                    const noiseY = (gy * noiseScale) + time + (dominantBlob.id * 200);
                                    
                                    // Get smooth noise values (-1 to 1 range)
                                    const noiseOffsetX = (p.noise(noiseX, noiseY, time * 0.5) - 0.5) * 2;
                                    const noiseOffsetY = (p.noise(noiseX + 1000, noiseY + 1000, time * 0.7) - 0.5) * 2;
                                    
                                    // Scale jitter based on humor level (slightly less than colored for balance)
                                    const baseJitter = p.map(dominantBlob.humor, 0, 10, 0, stepX * 1.2); // Slightly less than colored ASCII
                                    
                                    // Add extra scatter for high humor levels
                                    let extraScatter = 0;
                                    if (dominantBlob.humor >= 6) {
                                        extraScatter = p.map(dominantBlob.humor, 6, 10, 0, stepX * 0.8); // Additional scatter
                                        // Add some randomness to the extra scatter for variety
                                        const randomMultiplier = 0.5 + p.noise(time * 0.3 + gx * 0.01 + gy * 0.01) * 1.0;
                                        extraScatter *= randomMultiplier;
                                    }
                                    
                                    const totalJitter = baseJitter + extraScatter;
                                    
                                    // Apply smooth jitter
                                    drawX += noiseOffsetX * totalJitter;
                                    drawY += noiseOffsetY * totalJitter;
                                    
                                    if (p.frameCount % 180 === 0 && gx < 100 && gy < 100) {
                                    }
                                }
                                
                                g.text(charToDraw, drawX, drawY);
                                charactersDrawn++;
                            }
                        }
                    }
                }
            }
            
            if (p.frameCount % 60 === 0) {
                const renderMode = useGridSize === gridsize ? "NORMAL" : "BLUR";
                if (Object.keys(emotionDrawCount).length > 0) {
                    // Log total count
                    const totalEmotionCircles = Object.values(emotionDrawCount).reduce((sum, count) => sum + count, 0);
                    
                    // Enhanced logging for multiple emotions
                    const emotionBreakdown = Object.entries(emotionDrawCount)
                        .sort(([,a], [,b]) => b - a) // Sort by count descending
                        .map(([emotion, count]) => `${emotion}:${count}`)
                        .join(', ');
                    
                    if (Object.keys(emotionDrawCount).length > 1) {
                        console.log(`🎨 [${sketchInstanceId}] ${renderMode} MULTI-EMOTION DISPLAY: ${Object.keys(emotionDrawCount).length} emotions, ${totalEmotionCircles} total characters`);
                        console.log(`📊 [${sketchInstanceId}] Emotion breakdown: ${emotionBreakdown}`);
                    } else if (totalEmotionCircles > 0) {
                        console.log(`🎨 [${sketchInstanceId}] ${renderMode} Single emotion: ${emotionBreakdown} (${totalEmotionCircles} characters)`);
                    }
                }
                
                // Log blur, humor and shine status for each blob
                blobs.forEach((blob, index) => {
                    let effects = [];
                    if (blob.blur > 0) {
                        effects.push(`blur: ${blob.blur}/10 (opacity reduction)`);
                    }
                    if (blob.humor > 0) {
                        effects.push(`humor: ${blob.humor}/10 (position jitter)`);
                    }
                    if (blob.shine > 0) {
                        effects.push(`shine: ${blob.shine}/10 (brightness + pulsing)`);
                    }
                    if (index === 0) { // Only for first blob to avoid spam
                    }
                    if (effects.length > 0) {
                    }
                });
            }
        }
        
        function drawBlobConnections() {
            p.strokeWeight(2);
            let connectionsDrawn = 0;
            
            // Draw connections between all visible blobs
            for (let i = 0; i < blobs.length; i++) {
                for (let j = i + 1; j < blobs.length; j++) {
                    const blob1 = blobs[i];
                    const blob2 = blobs[j];
                    
                    if (!blob1.isVisible || !blob2.isVisible) continue;
                    
                    const distance = p5.Vector.dist(blob1.pos, blob2.pos);
                    const maxConnectionDistance = p.width * 0.6; // Maximum distance for connections
                    
                    if (distance < maxConnectionDistance) {
                        // Calculate connection opacity based on distance
                        const opacity = p.map(distance, 0, maxConnectionDistance, 180, 20);
                        
                        // Use a blend of both blob colors for the connection
                        let connectionColor;
                        if (blob1.displayColors.length > 0 && blob2.displayColors.length > 0) {
                            const color1 = blob1.displayColors[0];
                            const color2 = blob2.displayColors[0];
                            connectionColor = p.color(
                                (color1[0] + color2[0]) / 2,
                                (color1[1] + color2[1]) / 2,
                                (color1[2] + color2[2]) / 2,
                                opacity
                            );
                        } else {
                            connectionColor = p.color(150, 150, 150, opacity);
                        }
                        
                        p.stroke(connectionColor);
                        
                        // Add subtle animation to connection
                        const animationOffset = p.sin(getAnimationFrame() * 0.02 + i + j) * 0.1;
                        const connectionWeight = p.map(distance, 0, maxConnectionDistance, 3, 1) + animationOffset;
                        p.strokeWeight(connectionWeight);
                        
                        // Draw the connection line
                        p.line(blob1.pos.x, blob1.pos.y, blob2.pos.x, blob2.pos.y);
                        
                        // Optional: Draw small circles at connection points
                        p.fill(connectionColor);
                        p.noStroke();
                        const circleSize = 4 + animationOffset * 2;
                        p.ellipse(blob1.pos.x, blob1.pos.y, circleSize, circleSize);
                        p.ellipse(blob2.pos.x, blob2.pos.y, circleSize, circleSize);
                        
                        connectionsDrawn++;
                    }
                }
            }
            
            if (p.frameCount % 120 === 0 && connectionsDrawn > 0) {
            }
            
            // Reset stroke settings
            p.noStroke();
        }
        

        
        function drawHomeRegions() {
            // Draw semi-transparent circles showing each blob's home region
            for (let i = 0; i < blobs.length; i++) {
                const blob = blobs[i];
                if (!blob.isVisible) continue;
                
                const homeCenter = getRegionCenter(blob.homeRegion);
                const homeRadius = Math.min(p.width, p.height) * 0.15;
                
                // Draw home region boundary
                p.stroke(100, 100, 200, 100);
                p.strokeWeight(2);
                p.noFill();
                p.ellipse(homeCenter.x, homeCenter.y, homeRadius * 2, homeRadius * 2);
                
                // Draw center point
                p.fill(100, 100, 200, 150);
                p.noStroke();
                p.ellipse(homeCenter.x, homeCenter.y, 8, 8);
                
                // Draw blob ID
                p.fill(100, 100, 200, 200);
                p.textAlign(p.CENTER, p.CENTER);
                p.textFont('Miriam Libre, sans-serif');
                p.textSize(12);
                p.text(`Blob ${i}`, homeCenter.x, homeCenter.y - homeRadius - 15);
            }
            
            // Reset drawing settings
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
        }
    
        // REMOVED: Duplicate p.setup function that was causing layering issues
        
        // REMOVED: Duplicate p.draw function that was causing layering issues

        // Essential auto-start function for audio playback
        function tryAutoStart() {
            // If audio has already failed globally, skip audio initialization
            if (globalAudioFailure || window.globalAudioWorkletFailure) {
                console.log(`[${sketchInstanceId}] Skipping audio initialization due to previous failure, starting visual-only`);
                visualOnlyMode = true;
                started = true;
                isReadyToDrawVisualization = true;
                showVisualOnlyNotification('Audio disabled due to previous AudioWorklet error - running in visual-only mode');
                playNext();
                return;
            }
            
            if (!started) {
                // Check if we should focus on a specific file
                if (window.focusedMP3File) {
                    // Find the index of the focused file
                    const focusIndex = convo.findIndex(item => item.file === window.focusedMP3File);
                    if (focusIndex !== -1) {
                        currentIndex = focusIndex;
                        console.log(`🎯 [${sketchInstanceId}] Focusing on file: ${window.focusedMP3File} at index ${focusIndex}`);
                    }
                }
                
                try {
                    if (p.getAudioContext && p.getAudioContext().state !== 'running') {
                        p.userStartAudio().then(() => { 
                            // Reconnect master analyzer after audio context starts
                            try {
                                if (analyzers.masterAnalyzer) {
                                    analyzers.masterAnalyzer.setInput();
                                }
                            } catch (analyzerError) {
                                console.warn('Master analyzer setup error:', analyzerError);
                            }
                            playNext(); 
                            started = true; 
                        }).catch((error) => {
                            console.warn('Audio initialization failed, starting in visual-only mode:', error);
                            // Start without audio if needed
                            visualOnlyMode = true;
                            globalAudioFailure = true;
                            window.globalAudioWorkletFailure = true; // Set global flag to prevent future attempts
                            started = true;
                            isReadyToDrawVisualization = true;
                            
                            // Show visual-only indicator
                            window.dispatchEvent(new CustomEvent('visualOnlyMode', { 
                                detail: { 
                                    enabled: true, 
                                    reason: 'Audio initialization failed during userStartAudio' 
                                } 
                            }));
                            
                            // Create visual notification element
                            showVisualOnlyNotification('Audio initialization failed - running in visual-only mode');
                            
                            playNext();
                        });
                    } else { 
                        playNext(); 
                        started = true; 
                    }
                                } catch (audioError) {
                    console.warn('Audio context error, continuing in visual-only mode:', audioError);
                    visualOnlyMode = true;
                    globalAudioFailure = true;
                    window.globalAudioWorkletFailure = true; // Set global flag to prevent future attempts
                    started = true;
                    // Still try to show visual without audio
                    isReadyToDrawVisualization = true;
                    
                    // Show visual-only indicator
                    window.dispatchEvent(new CustomEvent('visualOnlyMode', { 
                        detail: { 
                            enabled: true, 
                            reason: 'Audio context initialization failed' 
                        } 
                    }));
                    
                    // Create visual notification element
                    showVisualOnlyNotification('Audio context failed - running in visual-only mode');
                    
                    // Start the visualization loop even without audio
                    playNext();
                }
            }
        }

        // Enable user interaction to start audio
        p.mousePressed = () => {
            tryAutoStart();
        };
        
        // Key handler for debugging features
        p.keyPressed = () => {
            if (p.key === 'h' || p.key === 'H') {
                window.showHomeRegions = !window.showHomeRegions;
                console.log(`🏠 [${sketchInstanceId}] Home regions ${window.showHomeRegions ? 'SHOWN' : 'HIDDEN'} (press 'h' to toggle)`);
            }
        };
        
        // Audio control functions for sidepanel
        p.togglePlayPause = () => {
            if (!soundFiles || soundFiles.length === 0) return;
            
            if (isCurrentlyPlaying) {
                // Pause current sound
                if (currentIndex < soundFiles.length && soundFiles[currentIndex]) {
                    const sfx = soundFiles[currentIndex];
                    if (sfx && typeof sfx.pause === 'function') {
                        sfx.pause();
                        isCurrentlyPlaying = false;
                    }
                }
            } else {
                // Resume or start playing
                if (currentIndex < soundFiles.length) {
                    if (soundFiles[currentIndex] && typeof soundFiles[currentIndex].play === 'function') {
                        // Resume current sound
                        soundFiles[currentIndex].play();
                        isCurrentlyPlaying = true;
                    } else {
                        // Start from beginning
                        currentIndex = 0;
                        p.currentIndex = currentIndex; // Sync exposed property
                        playNext();
                    }
                } else {
                    // Restart from beginning
                    currentIndex = 0;
                    playNext();
                }
            }
        };
        
        p.pauseSound = () => {
            if (!soundFiles || soundFiles.length === 0) return;
            
            if (currentIndex < soundFiles.length && soundFiles[currentIndex]) {
                const sfx = soundFiles[currentIndex];
                if (sfx && typeof sfx.pause === 'function') {
                    sfx.pause();
                    isCurrentlyPlaying = false;
                }
            }
        };
        
        p.setVolume = (volume) => {
            // Clamp volume between 0 and 1
            volume = Math.max(0, Math.min(1, volume));
            
            // Set master volume for all sounds
            if (soundFiles && soundFiles.length > 0) {
                soundFiles.forEach(sound => {
                    if (sound && typeof sound.setVolume === 'function') {
                        sound.setVolume(volume);
                    }
                });
            }
            
            // Store volume for future sounds
            lastVolumeBeforeMute = volume;
        };
        
        // Listen for messages from parent window
        if (window.parent !== window) {
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'enable-audio') {
                    tryAutoStart();
                }
            });
        }

        // Function to recreate highlight grids when gridsize changes
        function recreateHighlightGrids() {
            
            // Initialize empty highlight grids - they'll be populated by createEmotionHighlightGrids()
            highlightGrids = [];
            for (let i = 0; i < blobs.length; i++) {
                highlightGrids.push([]);
            }
        }

        // Function to create emotion-specific highlight grids for a specific utterance
        function createEmotionHighlightGrids(meta, speakerIndex) {
            if (!meta) {
                console.warn(`[${sketchInstanceId}] createEmotionHighlightGrids called with no meta for speaker ${speakerIndex}.`);
                return;
            }
            const emotions = meta.emotions || [];
            
            // Calculate base amount of emotion characters
            const baseCirclesPerEmotion = meta.circlesPerEmotion || 5;
            
            // Apply emotionCharAmount scaling (0-200% range)
            const emotionCharAmount = meta.emotionCharAmount || 50; // Default 50%
            const emotionMultiplier = emotionCharAmount / 50; // Convert to multiplier: 50% = 1.0x, 100% = 2.0x, 200% = 4.0x
            
            // Calculate final number of emotion characters with dramatic scaling
            let circlesPerEmotion = Math.round(baseCirclesPerEmotion * emotionMultiplier);
            
            // Ensure minimum visibility even at low grid resolutions  
            // For Hebrew characters (תוים), we need more characters at low resolutions
            let minCharactersForLowGrid = 0;
            if (gridsize < 80) {
                // At very low resolutions, ensure good Hebrew character visibility
                minCharactersForLowGrid = Math.max(8, Math.floor(gridsize * 0.2));
            } else if (gridsize < 50) {
                minCharactersForLowGrid = Math.max(4, Math.floor(gridsize * 0.15));
            }
            circlesPerEmotion = Math.max(minCharactersForLowGrid, circlesPerEmotion);
            
            // Ensure maximum bounds for performance
            circlesPerEmotion = Math.max(0, Math.min(circlesPerEmotion, 100)); // 0 to 100 emotion characters max
            
            // Clear existing highlights for this speaker
            if (!highlightGrids[speakerIndex]) {
                highlightGrids[speakerIndex] = [];
            } else {
                highlightGrids[speakerIndex] = [];
            }
            
            // Get the blob's position to place highlights near it
            const blob = blobs[speakerIndex];
            let centerX = gridsize / 2;
            let centerY = gridsize / 2;
            
            if (blob) {
                // Convert blob position to grid coordinates
                const stepX = p.width / gridsize;
                const stepY = p.height / gridsize;
                centerX = Math.floor(blob.pos.x / stepX);
                centerY = Math.floor(blob.pos.y / stepY);
            }
            
            // Calculate blob's maximum possible influence area for MAXIMUM SPREAD inside the blob
            const blobSize = blob ? blob.blobSizeScale : 1;
            // Scale search radius relative to grid size to ensure emotion characters are visible even at low resolutions
            const minSearchRadius = Math.max(5, Math.floor(gridsize * 0.15)); // Minimum 15% of grid size
            const maxSearchRadius = Math.max(minSearchRadius, Math.min(Math.floor(gridsize * 0.5), Math.floor(blobSize * 6))); // Maximum 50% of grid size
            const searchRadius = Math.max(minSearchRadius, maxSearchRadius);
            
            // Use aggressive spreading with minimal distance constraints for maximum coverage
            // Scale minimum distance relative to grid size to prevent overcrowding at low resolutions
            const baseMinDistance = Math.max(1, Math.min(4, Math.floor(Math.sqrt(circlesPerEmotion) * 0.5)));
            const minDistance = Math.max(1, Math.min(baseMinDistance, Math.floor(gridsize * 0.05))); // Scale with grid size
            
            // Log the scaling effect for debugging (moved after all variables are calculated)
            if (p.frameCount % 300 === 0 && speakerIndex === 0) {
                console.log(`🎭 [${sketchInstanceId}] Emotion char scaling: ${emotionCharAmount}% → ${circlesPerEmotion} chars (base: ${baseCirclesPerEmotion}, multiplier: ${emotionMultiplier.toFixed(2)}x)`);
                console.log(`🔍 [${sketchInstanceId}] Grid: ${gridsize}x${gridsize}, SearchRadius: ${searchRadius}, MinDistance: ${minDistance}, MinChars: ${minCharactersForLowGrid}`);
            }
            const maxAttempts = 600; // Even more attempts for maximum blob coverage
            
            // Log distribution method being used
            if (circlesPerEmotion > 0 && emotions.length > 0) {
            }
            
            for (let i = 0; i < circlesPerEmotion; i++) {
                let validPosition = false;
                let attempts = 0;
                let x, y;
                let bestX = centerX, bestY = centerY;
                let bestInfluence = 0;
                
                while (!validPosition && attempts < maxAttempts) {
                    let candidateX, candidateY;
                    
                    if (attempts < maxAttempts * 0.7) {
                        // First 70% of attempts: AGGRESSIVE exploration of entire blob area
                        let angle = p.random(0, 2 * Math.PI);
                        let radius;
                        
                        // More aggressive sampling - explore the FULL blob extent
                        if (i < circlesPerEmotion / 4) {
                            // First quarter: center to mid-range
                            radius = Math.sqrt(p.random()) * searchRadius * 0.6;
                        } else if (i < circlesPerEmotion / 2) {
                            // Second quarter: mid-range to far
                            radius = (0.4 + Math.sqrt(p.random()) * 0.6) * searchRadius;
                        } else if (i < 3 * circlesPerEmotion / 4) {
                            // Third quarter: explore the edges more aggressively
                            radius = (0.7 + Math.sqrt(p.random()) * 0.3) * searchRadius;
                        } else {
                            // Last quarter: MAXIMUM radius exploration - find the blob boundaries
                            radius = (0.8 + p.random() * 0.2) * searchRadius;
                        }
                        
                        candidateX = Math.floor(centerX + Math.cos(angle) * radius);
                        candidateY = Math.floor(centerY + Math.sin(angle) * radius);
                    } else if (attempts < maxAttempts * 0.9) {
                        // 20% of attempts: systematic grid exploration to fill gaps
                        const gridStep = Math.max(2, Math.floor(searchRadius / 8));
                        const gridX = (attempts % 9) - 4; // -4 to 4
                        const gridY = Math.floor((attempts % 81) / 9) - 4; // -4 to 4
                        candidateX = Math.floor(centerX + gridX * gridStep);
                        candidateY = Math.floor(centerY + gridY * gridStep);
                    } else {
                        // Last 10% of attempts: completely random exploration of full search area
                        candidateX = Math.floor(centerX + p.random(-searchRadius, searchRadius));
                        candidateY = Math.floor(centerY + p.random(-searchRadius, searchRadius));
                    }
                    
                    // Ensure coordinates are within grid bounds
                    candidateX = p.constrain(candidateX, 0, gridsize - 1);
                    candidateY = p.constrain(candidateY, 0, gridsize - 1);
                    
                    x = candidateX;
                    y = candidateY;
                    
                    // Check if this position would have blob influence (where ASCII would be drawn)
                    const stepX = p.width / gridsize;
                    const stepY = p.height / gridsize;
                    const gx = x * stepX + stepX / 2;
                    const gy = y * stepY + stepY / 2;
                    
                    // Calculate blob influence at this position
                    let maxInfluence = 0;
                    const t = p.frameCount * blob.breathSpeed;
                    const dx = gx - blob.pos.x;
                    const dy = gy - blob.pos.y;
                    let d2 = dx * dx + dy * dy;
                    if (d2 === 0) d2 = 1;
                    
                    let angle = Math.atan2(dy, dx);
                    let n1 = p.noise(0.01 * blob.pos.x + Math.cos(angle * 3.0 + t), 0.01 * blob.pos.y + Math.sin(angle * 2.5 - t));
                    let n2 = p.noise(0.015 * blob.pos.x + Math.cos(angle * 1.7 - t * 0.5), 0.015 * blob.pos.y + Math.sin(angle * 1.3 + t * 0.3));
                    let distortion = Math.sin(n1 * Math.PI) * Math.cos(n2 * Math.PI);
                    
                    let distortedStrength = blob.getStrength() * blob.blobSizeScale * (1 + blob.blobiness * 0.3 * distortion);
                    maxInfluence = (distortedStrength * blob.blobDensity) / (d2 * blob.blobSpreadField + 1e-6);
                    
                    let shapedInfluence = p.constrain(maxInfluence, 0, 1);
                    shapedInfluence = p.pow(shapedInfluence, blob.gradientStrength);
                    shapedInfluence = 1.0 - p.pow(1.0 - shapedInfluence, blob.gradientStrength);
                    
                    // Check if this position has blob influence (inside the blob) - use LOWER threshold for maximum spread
                    const relaxedThreshold = finalDrawThreshold * 0.3; // Much more permissive threshold for edge exploration
                    const hasEnoughInfluence = shapedInfluence >= relaxedThreshold;
                    
                    // Keep track of the best position found so far (highest influence)
                    if (hasEnoughInfluence && shapedInfluence > bestInfluence) {
                        bestInfluence = shapedInfluence;
                        bestX = x;
                        bestY = y;
                    }
                    
                    if (!hasEnoughInfluence) {
                        validPosition = false;
                        attempts++;
                        continue;
                    }
                    
                    // Check if this position is far enough from existing highlights
                    validPosition = true;
                    for (const existingHighlight of highlightGrids[speakerIndex]) {
                        const distance = Math.sqrt(Math.pow(x - existingHighlight.x, 2) + Math.pow(y - existingHighlight.y, 2));
                        if (distance < minDistance) {
                            validPosition = false;
                            break;
                        }
                    }
                    
                    attempts++;
                }
                
                // If we couldn't find a perfectly spaced position, use the best position we found inside the blob
                if (!validPosition && bestInfluence > 0) {
                    x = bestX;
                    y = bestY;
                } else if (attempts >= maxAttempts) {
                }
                
                // Pick emotion based on distribution percentages or cycle through emotions
                let selectedEmotion;
                let emotionIndex;
                
                if (meta.emotionDistribution && typeof meta.emotionDistribution === 'object' && emotions.length > 0) {
                    // Check if emotionDistribution matches actual emotions
                    const distributionKeys = Object.keys(meta.emotionDistribution);
                    const actualEmotions = emotions || [];
                    const distributionMatchesEmotions = distributionKeys.every(key => 
                        actualEmotions.some(emotion => emotion.toLowerCase() === key.toLowerCase())
                    );
                    
                    if (!distributionMatchesEmotions) {
                        // Fall through to even distribution instead of using mismatched emotionDistribution
                        selectedEmotion = emotions[i % emotions.length] || 'neutral';
                        emotionIndex = emotions.indexOf(selectedEmotion);
                    } else {
                        // Use percentage-based distribution from the total circlesPerEmotion
                        const emotionCounts = {};
                        let totalAssigned = 0;
                    
                        // First pass: calculate counts
                        for (const emotion of distributionKeys) {
                            const percentage = meta.emotionDistribution[emotion];
                            const count = Math.floor((percentage / 100) * circlesPerEmotion);
                            emotionCounts[emotion] = count;
                            totalAssigned += count;
                        }
                        
                        // Handle remaining circles due to rounding (distribute to emotions with highest remainder)
                        const remaining = circlesPerEmotion - totalAssigned;
                        if (remaining > 0) {
                            const remainders = [];
                            for (const emotion of distributionKeys) {
                                const percentage = meta.emotionDistribution[emotion];
                                const exactCount = (percentage / 100) * circlesPerEmotion;
                                const remainder = exactCount - Math.floor(exactCount);
                                remainders.push({ emotion, remainder });
                            }
                            
                            // Sort by remainder (highest first) and add 1 to top emotions
                            remainders.sort((a, b) => b.remainder - a.remainder);
                            for (let j = 0; j < remaining; j++) {
                                emotionCounts[remainders[j].emotion]++;
                            }
                        }
                        
                        // Create ordered list of emotions for assignment
                        const emotionAssignments = [];
                        for (const [emotion, count] of Object.entries(emotionCounts)) {
                            for (let j = 0; j < count; j++) {
                                emotionAssignments.push(emotion);
                            }
                        }
                        
                        // Assign emotion to this highlight
                        selectedEmotion = emotionAssignments[i] || emotions[0] || 'neutral';
                        emotionIndex = emotions.indexOf(selectedEmotion);
                        if (emotionIndex === -1) emotionIndex = 0;
                        
                        if (i === 0) {
                            for (const [emotion, count] of Object.entries(emotionCounts)) {
                                const actualPercentage = ((count / circlesPerEmotion) * 100).toFixed(1);
                            }
                        }
                    }
                } else {
                    // Fallback to cycling through emotions evenly
                    selectedEmotion = (emotions.length > 0) ? (emotions[i % emotions.length] || 'neutral') : 'neutral';
                    emotionIndex = (emotions.length > 0) ? emotions.indexOf(selectedEmotion) : 0;
                }
                
                const highlightPos = {
                    x: x,
                    y: y,
                    noiseOffset: p.random(1000),
                    emotion: selectedEmotion,
                    emotionIndex: Math.max(0, emotionIndex)
                };
                highlightGrids[speakerIndex].push(highlightPos);
            }
            
        }

        // Function to start continuous segment loop for focused editing
        function startContinuousSegmentLoop() {
            if (!soundFiles || !convo || currentIndex >= soundFiles.length) {
                console.warn(`[${sketchInstanceId}] ❌ Cannot start continuous segment loop: invalid data or index`);
                return;
            }
            
            const { speaker, file } = convo[currentIndex];
            const sfx = soundFiles[currentIndex];
            
            if (!sfx || typeof sfx.play !== 'function') {
                console.warn(`[${sketchInstanceId}] ❌ Cannot start continuous segment loop: invalid sound file`);
                return;
            }
            
            console.log(`[${sketchInstanceId}] 🔁 Starting CONTINUOUS visualization loop for ${file} (speaker ${speaker})`);
            
            // Stop all other sounds
            soundFiles.forEach((sound, index) => { 
                if (index !== currentIndex && sound && typeof sound.isPlaying === 'function' && sound.isPlaying()) { 
                    sound.stop(); 
                } 
            });
            
            // Connect analyzer for continuous visualization
            analyzers.forEach((analyzer, index) => {
                if (analyzer) analyzer.setInput(); // Disconnect all
            });
            
            if (analyzers[speaker]) {
                analyzers[speaker].setInput(sfx);
            }
            
            // Apply initial segment parameters
            const meta = window.loopingSegmentData || emotionData[file] || {};
            applySegmentParameters(file, meta);
            
            // Function to continuously play the segment
            const playContinuousLoop = () => {
                if (!window.isSegmentLoopMode || window.loopingSegment !== file) return; // Stop if loop mode was disabled
                
                if (sfx.isPlaying()) sfx.stop();
                
                // Re-apply current parameters (in case they were updated)
                const currentMeta = window.loopingSegmentData || emotionData[file] || {};
                applySegmentParameters(file, currentMeta);
                
                // Start the audio
                sfx.play();
                isCurrentlyPlaying = true;
                
                // Set up immediate loop when this sound ends
                sfx.onended(() => {
                    if (window.isSegmentLoopMode && window.loopingSegment === file) {
                        setTimeout(() => playContinuousLoop(), 100); // Very short delay for continuous experience
                    }
                });
            };
            
            // Start the continuous loop
            playContinuousLoop();
        }
        
        // Function to apply segment parameters to visualization immediately
        function applySegmentParameters(filename, segmentData) {
            if (!segmentData) return;
            
            console.log(`[${sketchInstanceId}] 🎨 Applying parameters for ${filename}:`, segmentData);
            
            // Update current meta
            currentMeta = segmentData;
            // Sync with exposed property
            if (p.currentMeta !== undefined) p.currentMeta = currentMeta;
            
            // Trigger parameter panel update
            if (typeof window !== 'undefined' && window.parent) {
                window.parent.postMessage({
                    type: 'metadataUpdate',
                    metadata: currentMeta
                }, '*');
            }
            
            // Find speaker
            const speaker = segmentData.speaker || 0;
            
            // Update blob visuals immediately
            updateBlobVisualsForSegment(speaker, segmentData);
            
            // Update emotion highlights immediately
            if (segmentData.emotions) {
                createEmotionHighlightGrids(segmentData, speaker);
            }
            
            // Apply global parameters if they exist in the segment data
            if (typeof segmentData.gridsize !== 'undefined') {
                gridsize = segmentData.gridsize;
            }
            if (typeof segmentData.connectBlobs !== 'undefined') {
                connectBlobs = segmentData.connectBlobs;
            }
            if (typeof segmentData.forceCenter !== 'undefined') {
                forceCenter = segmentData.forceCenter;
            }
            if (typeof segmentData.drawThreshold !== 'undefined') {
                drawThreshold = segmentData.drawThreshold;
            }
            if (typeof segmentData.finalDrawThreshold !== 'undefined') {
                finalDrawThreshold = segmentData.finalDrawThreshold;
            }
            
            console.log(`[${sketchInstanceId}] ✅ Parameters applied successfully for continuous loop`);
        }
        
        // Function to start segment loop playback for visualization (legacy support)
        function startSegmentLoopPlayback() {
            return startContinuousSegmentLoop();
        }
        
        // Helper function to update blob visuals for a specific segment
        function updateBlobVisualsForSegment(speaker, meta) {
            blobs.forEach((blob, index) => {
                let newVisuals = {};
                if (index === speaker) {
                    // For the speaking blob, apply the emotion data parameters
                    newVisuals = { ...defaultBlobVisuals };
                    for (const key in defaultBlobVisuals) {
                        if (typeof meta[key] !== 'undefined') {
                            if (key === 'blobSizeScale') {
                                newVisuals[key] = Math.min(5, meta[key]);  // Cap at maximum 5
                            } else {
                                newVisuals[key] = meta[key];
                            }
                        }
                    }
                    newVisuals.isVisible = meta.blobsVisible !== false;
                    
                    // IMMEDIATE SPACING: Apply minBlobSpacing setting immediately (same as regular playback)
                    if (typeof meta.minBlobSpacing !== 'undefined') {
                        // SAFEGUARD: Ensure minBlobSpacing stays as string
                        let spacingValue = meta.minBlobSpacing;
                        if (typeof meta.minBlobSpacing === 'number') {
                            console.warn(`⚠️ [${sketchInstanceId}] REAL-TIME: Converting numeric spacing ${meta.minBlobSpacing} back to string preset`);
                            // Try to find the corresponding preset name
                            const presetName = Object.keys(blobSpacingPresets).find(key => blobSpacingPresets[key] === meta.minBlobSpacing);
                            spacingValue = presetName || 'close';
                        }
                        
                        newVisuals.minBlobSpacing = spacingValue;
                        console.log(`↔️ [${sketchInstanceId}] REAL-TIME: Setting blob ${index} spacing to: ${spacingValue}`);
                        
                        // CRITICAL: Apply spacing to ALL blobs immediately, not just the speaking one
                        blobs.forEach((otherBlob, otherIndex) => {
                            // SAFEGUARD: Ensure minBlobSpacing stays as string
                            if (typeof meta.minBlobSpacing === 'number') {
                                console.warn(`⚠️ [${sketchInstanceId}] REAL-TIME: Converting numeric spacing ${meta.minBlobSpacing} back to string preset`);
                                // Try to find the corresponding preset name
                                const presetName = Object.keys(blobSpacingPresets).find(key => blobSpacingPresets[key] === meta.minBlobSpacing);
                                otherBlob.minBlobSpacing = presetName || 'close';
                            } else {
                                otherBlob.minBlobSpacing = meta.minBlobSpacing;
                            }
                            
                            // Force immediate spacing application to ensure new preset values are used
                            otherBlob.applyBlobSpacing();
                            
                            // ENHANCED: Set target position for smooth animated transition
                            if (otherBlob.cachedHomeCenter) {
                                otherBlob.targetPos = otherBlob.cachedHomeCenter.copy();
                                // Set transition properties for smooth spacing animation
                                const distance = p5.Vector.dist(otherBlob.pos, otherBlob.targetPos);
                                otherBlob.spacingTransitionActive = true;
                                otherBlob.spacingTransitionSpeed = distance > 400 ? 1.2 : 0.8; // Faster for large distances
                                console.log(`🎬 [${sketchInstanceId}] TRANSITION: Blob ${otherIndex} starting smooth transition to new spacing position (${distance.toFixed(1)}px away)`);
                            }
                            
                            console.log(`↔️ [${sketchInstanceId}] REAL-TIME GLOBAL: Applied spacing ${otherBlob.minBlobSpacing} to blob ${otherIndex} at pos (${otherBlob.pos.x.toFixed(1)}, ${otherBlob.pos.y.toFixed(1)})`);
                        });
                    }
                    
                    // Apply home region if specified
                    if (meta.blobHomeRegion) {
                        blob.homeRegion = meta.blobHomeRegion;
                        const newCenter = getRegionCenter(meta.blobHomeRegion);
                        blob.pos.x = newCenter.x;
                        blob.pos.y = newCenter.y;
                        blob.targetPos = null;
                    }
                } else {
                    // For non-speaking blobs, use idle parameters
                    newVisuals = {
                        ...defaultBlobVisuals,
                        blobSizeScale: (defaultBlobVisuals.blobSizeScale || 3) * 0.6,
                        blobStrength: (defaultBlobVisuals.blobStrength || 1000) * 0.4,
                        isVisible: meta.blobsVisible !== false
                    };
                    
                    // Apply spacing to non-speaking blobs as well
                    if (typeof meta.minBlobSpacing !== 'undefined') {
                        let spacingValue = meta.minBlobSpacing;
                        if (typeof meta.minBlobSpacing === 'number') {
                            const presetName = Object.keys(blobSpacingPresets).find(key => blobSpacingPresets[key] === meta.minBlobSpacing);
                            spacingValue = presetName || 'close';
                        }
                        blob.minBlobSpacing = spacingValue;
                        blob.applyBlobSpacing();
                        
                        // ENHANCED: Set target position for smooth animated transition (non-speaking blobs)
                        if (blob.cachedHomeCenter) {
                            blob.targetPos = blob.cachedHomeCenter.copy();
                            // Set transition properties for smooth spacing animation
                            const distance = p5.Vector.dist(blob.pos, blob.targetPos);
                            blob.spacingTransitionActive = true;
                            blob.spacingTransitionSpeed = distance > 400 ? 1.2 : 0.8; // Faster for large distances
                            console.log(`🎬 [${sketchInstanceId}] TRANSITION: Non-speaking blob starting smooth transition to new spacing position (${distance.toFixed(1)}px away)`);
                        }
                    }
                }
                
                // Apply visual parameters
                blob.updateVisuals(newVisuals);
                
                // Set colors for the speaking blob
                if (index === speaker && meta.emotions && meta.emotions.length > 0) {
                    let currentColors = [];
                    console.log(`[${sketchInstanceId}] 🎭 Processing ${meta.emotions.length} emotions for segment:`, meta.emotions);
                    console.log(`[${sketchInstanceId}] 🗺️ Available emotion color map:`, getEmotionColorMapKeys());
                    
                    meta.emotions.forEach((code, i) => {
                        console.log(`[${sketchInstanceId}] 🔍 Looking for color for emotion: "${code}"`);
                        console.log(`[${sketchInstanceId}] 🗂️ Current emotionGlobalColorMap keys:`, Object.keys(emotionGlobalColorMap || {}));
                        console.log(`[${sketchInstanceId}] 🌐 Window emotionsConfig available:`, !!(window.emotionsConfig));
                        
                        // Try multiple case variations to find the color (enhanced lookup)
                        let color = null;
                        const variations = [
                            code,                                                           // Exact case
                            code.toLowerCase(),                                             // lowercase
                            code.charAt(0).toUpperCase() + code.slice(1).toLowerCase(),   // Title case
                            code.charAt(0).toLowerCase() + code.slice(1)                  // camelCase
                        ];
                        
                        // Try each variation until we find a match using helper function
                        for (const variant of variations) {
                            color = getEmotionColor(variant);
                            if (color) {
                                console.log(`[${sketchInstanceId}] ✅ Found mapped color for ${code} (via "${variant}"):`, color);
                                break;
                            } else {
                                console.log(`[${sketchInstanceId}] ❌ No color found for "${variant}"`);
                            }
                        }
                        
                        if (!color) {
                            // Enhanced debugging - try direct lookup in emotionGlobalColorMap
                            console.log(`[${sketchInstanceId}] 🔍 Direct lookup attempt in emotionGlobalColorMap:`, emotionGlobalColorMap[code]);
                            
                            // Check if we have emotions config for translation
                            if (window.emotionsConfig) {
                                console.log(`[${sketchInstanceId}] 🔄 Checking emotions config for English->Hebrew translation of "${code}"`);
                                for (const [hebrewName, config] of Object.entries(window.emotionsConfig)) {
                                    if (config.english && config.english.toLowerCase() === code.toLowerCase()) {
                                        console.log(`[${sketchInstanceId}] 🎯 Found Hebrew equivalent: "${code}" -> "${hebrewName}"`);
                                        if (emotionGlobalColorMap[hebrewName]) {
                                            color = emotionGlobalColorMap[hebrewName];
                                            console.log(`[${sketchInstanceId}] ✅ Got color via translation: ${hebrewName} ->`, color);
                                            break;
                                        }
                                    }
                                }
                            }
                            
                            if (!color) {
                                // No fallback colors - skip emotions without assigned colors
                                console.log(`[${sketchInstanceId}] ⚠️ No color assigned for emotion: ${code} - skipping`);
                                console.log(`[${sketchInstanceId}] 🗺️ Available emotion keys:`, getEmotionColorMapKeys());
                                return; // Skip this emotion in forEach
                            }
                        }
                        currentColors.push(color);
                    });
                    
                    blob.displayColors = currentColors;
                    blob.setEmotions(meta.emotions);
                    
                    console.log(`[${sketchInstanceId}] 🎨 FINAL: Updated blob ${index} with ${currentColors.length} emotion colors:`, currentColors);
                    console.log(`[${sketchInstanceId}] 🎭 Emotions applied: ${meta.emotions.join(', ')}`);
                }
            });
        }

        function playNext() {
            if (!soundFiles || currentIndex >= soundFiles.length) { isCurrentlyPlaying = false; return; }
            
            // Progressive loading: Check if current file is loaded yet
            if (!soundFiles[currentIndex] || soundFiles[currentIndex] === 'loading') { 
                console.log(`⏳ [${sketchInstanceId}] File ${currentIndex + 1}/${soundFiles.length} not loaded yet, waiting...`);
                
                // Try to load this specific file if it's null (progressive loading)
                if (!soundFiles[currentIndex] && convo[currentIndex]) {
                    // Ensure we have a valid folder
                p.ensureConversationFolder();
                
                const soundPath = `conversations/${currentConvoFolderFromData}/${convo[currentIndex].file}`;
                    console.log(`🚀 [${sketchInstanceId}] On-demand loading: ${convo[currentIndex].file}`);
                    soundFiles[currentIndex] = 'loading'; // Mark as loading to prevent duplicate loads
                    
                    soundFiles[currentIndex] = p.loadSound(soundPath, 
                        () => {
                            console.log(`✅ [${sketchInstanceId}] On-demand load complete: ${convo[currentIndex].file}`);
                            // Once loaded, try playing again
                            setTimeout(() => playNext(), 50);
                        },
                        (err) => { 
                            console.error(`❌ [${sketchInstanceId}] On-demand load failed: ${soundPath}`, err);
                            soundFiles[currentIndex] = 'failed';
                            setTimeout(() => playNext(), 50);
                        }
                    );
                } else {
                    // File is already being loaded, wait a bit longer
                    setTimeout(() => playNext(), 200); 
                }
                return; 
            }
            
            if (soundFiles[currentIndex] === 'failed' || !convo[currentIndex]) { 
                console.warn(`⚠️ [${sketchInstanceId}] Skipping failed audio ${currentIndex}`);
                currentIndex++; 
                p.currentIndex = currentIndex; // Sync exposed property
                playNext(); 
                return; 
            }
            
            const { speaker, file } = convo[currentIndex]; 
            const sfx = soundFiles[currentIndex];
            if (typeof sfx.play !== 'function') { currentIndex++; p.currentIndex = currentIndex; playNext(); return; }
            
            console.log(`🎵 [${sketchInstanceId}] Playing ${file} (speaker ${speaker}) - UPDATING existing ${blobs.length} blobs`);
            
            try {
                soundFiles.forEach((sound, index) => { 
                    if (index !== currentIndex && sound && typeof sound.isPlaying === 'function') {
                        try {
                            if (sound.isPlaying()) sound.stop();
                        } catch (stopError) {
                            console.warn(`Error stopping sound ${index}:`, stopError);
                        }
                    }
                });
                if (sfx.isPlaying()) sfx.stop();
            } catch (audioStopError) {
                console.warn('Error during audio stop operations:', audioStopError);
            }
            
            // Connect ONLY the current speaker's analyzer to the audio
            // Disconnect all analyzers first
            try {
                analyzers.forEach((analyzer, index) => {
                    if (analyzer) {
                        try {
                            analyzer.setInput(); // Disconnect from any input
                        } catch (disconnectError) {
                            console.warn(`Analyzer ${index} disconnect error:`, disconnectError);
                        }
                    }
                });
            } catch (analyzerError) {
                console.warn('Analyzer forEach error:', analyzerError);
            }
            
            // Connect only the speaking blob's analyzer to the current sound
            try {
                if (analyzers[speaker]) {
                    analyzers[speaker].setInput(sfx);
                }
            } catch (analyzerError) {
                console.warn('Audio analyzer connection error, continuing without audio analysis:', analyzerError);
                // Continue without audio analysis - visual will still work
            }
            

            const meta = emotionData[file] || {};

            // Store current meta for drawing functions
            currentMeta = meta;
            // Sync with exposed property
            if (p.currentMeta !== undefined) p.currentMeta = currentMeta;
            
            // Trigger parameter panel update
            if (typeof window !== 'undefined' && window.parent) {
                window.parent.postMessage({
                    type: 'metadataUpdate',
                    metadata: currentMeta
                }, '*');
            }
            
            // Update sidepanel with current file info
            const fileInfo = {
                filename: file,
                speaker: speaker,
                transcript: meta.transcript || '',
                emotions: meta.emotions || [],
                index: currentIndex,
                total: soundFiles.length
            };
            window.dispatchEvent(new CustomEvent('fileChanged', { detail: fileInfo }));
            
            // Force transcript sync as backup
            setTimeout(() => {
                if (window.forceTranscriptSync && typeof window.forceTranscriptSync === 'function') {
                    window.forceTranscriptSync();
                }
            }, 100);

            // --- NEW: Set global parameters from meta if present ---
            let gridsizeChanged = false;
            let oldGridsize = gridsize;
            
            // gridsize or grid_density
            if (typeof meta.gridsize !== 'undefined') {
                gridsize = meta.gridsize;
                if (gridsize !== oldGridsize) gridsizeChanged = true;
            } else if (typeof meta.grid_density !== 'undefined') {
                gridsize = meta.grid_density;
                if (gridsize !== oldGridsize) gridsizeChanged = true;
            }
            
            // If gridsize changed, recreate highlight grids
            if (gridsizeChanged) {
                recreateHighlightGrids();
            }
            
            // Create emotion-specific highlights for the speaking blob
            if (meta && meta.emotions) {
                createEmotionHighlightGrids(meta, speaker);
            }
            
            // Clear or reduce highlights for non-speaking blobs
            blobs.forEach((blob, index) => {
                if (index !== speaker) {
                    // Give non-speaking blobs minimal neutral highlights
                    if (!highlightGrids[index]) {
                        highlightGrids[index] = [];
                    } else {
                        highlightGrids[index] = [];
                    }
                    
                    // Add a few neutral highlights for idle blobs
                    const neutralHighlights = 2; // Minimal highlights for idle blobs
                    for (let j = 0; j < neutralHighlights; j++) {
                        const highlightPos = {
                            x: p.floor(p.random(gridsize)),
                            y: p.floor(p.random(gridsize)),
                            noiseOffset: p.random(1000),
                            emotion: 'neutral',
                            emotionIndex: 0
                        };
                        highlightGrids[index].push(highlightPos);
                    }
                }
            });
            
            // connectBlobs
            if (typeof meta.connectBlobs !== 'undefined') {
                connectBlobs = meta.connectBlobs;
                console.log(`🔗 [${sketchInstanceId}] Blob connections: ${connectBlobs ? 'ENABLED' : 'DISABLED'}`);
            }
            // forceCenter
            if (typeof meta.forceCenter !== 'undefined') {
                forceCenter = meta.forceCenter;
            }
            // repulsionStrength
            if (typeof meta.repulsionStrength !== 'undefined') {
                repulsionStrength = meta.repulsionStrength;
            }
            // drawThreshold
            if (typeof meta.drawThreshold !== 'undefined') {
                drawThreshold = meta.drawThreshold;
            }
            // finalDrawThreshold
            if (typeof meta.finalDrawThreshold !== 'undefined') {
                finalDrawThreshold = meta.finalDrawThreshold;
            }
            // blobHomeRegions (plural) - Allow JSON to set regions but keep them close
            if (Array.isArray(meta.blobHomeRegions)) {
                blobHomeRegions = meta.blobHomeRegions;
            }

            // --- END NEW ---

            blobs.forEach((blob, index) => {
                let newVisuals = {};
                if (index === speaker) {
                    // For the speaking blob, apply the emotion data parameters
                    newVisuals = { ...defaultBlobVisuals }; // Start fresh with defaults
                    for (const key in defaultBlobVisuals) {
                        if (typeof meta[key] !== 'undefined') {
                            newVisuals[key] = meta[key];
                        }
                    }
                    // Ensure volumeImpact has a default value if missing from JSON
                    if (typeof newVisuals.volumeImpact === 'undefined') {
                        newVisuals.volumeImpact = 3000; // Always keep high for maximum audio response
                    }
                    newVisuals.isVisible = meta.blobsVisible !== false;
                    newVisuals.isFlashing = meta.flash === true;
                    
                    if (meta.isDrasticMovement === true) newVisuals.movementEasing = 0.1;
                    
                    // IMMEDIATE SPACING: Apply minBlobSpacing setting immediately
                    if (typeof meta.minBlobSpacing !== 'undefined') {
                        // SAFEGUARD: Ensure minBlobSpacing stays as string
                        let spacingValue = meta.minBlobSpacing;
                        if (typeof meta.minBlobSpacing === 'number') {
                            console.warn(`⚠️ [${sketchInstanceId}] Converting numeric spacing ${meta.minBlobSpacing} back to string preset`);
                            // Try to find the corresponding preset name
                            const presetName = Object.keys(blobSpacingPresets).find(key => blobSpacingPresets[key] === meta.minBlobSpacing);
                            spacingValue = presetName || 'close';
                        }
                        
                        newVisuals.minBlobSpacing = spacingValue;
                        console.log(`↔️ [${sketchInstanceId}] IMMEDIATE: Setting blob ${index} spacing to: ${spacingValue}`);
                        
                        // CRITICAL: Apply spacing to ALL blobs immediately, not just the speaking one
                        blobs.forEach((otherBlob, otherIndex) => {
                            // SAFEGUARD: Ensure minBlobSpacing stays as string
                            if (typeof meta.minBlobSpacing === 'number') {
                                console.warn(`⚠️ [${sketchInstanceId}] Converting numeric spacing ${meta.minBlobSpacing} back to string preset`);
                                // Try to find the corresponding preset name
                                const presetName = Object.keys(blobSpacingPresets).find(key => blobSpacingPresets[key] === meta.minBlobSpacing);
                                otherBlob.minBlobSpacing = presetName || 'close';
                            } else {
                                otherBlob.minBlobSpacing = meta.minBlobSpacing;
                            }
                            
                            // Force immediate spacing application to ensure new preset values are used
                            otherBlob.applyBlobSpacing();
                            
                            // ENHANCED: Set target position for smooth animated transition
                            if (otherBlob.cachedHomeCenter) {
                                otherBlob.targetPos = otherBlob.cachedHomeCenter.copy();
                                // Set transition properties for smooth spacing animation
                                const distance = p5.Vector.dist(otherBlob.pos, otherBlob.targetPos);
                                otherBlob.spacingTransitionActive = true;
                                otherBlob.spacingTransitionSpeed = distance > 400 ? 1.2 : 0.8; // Faster for large distances
                                console.log(`🎬 [${sketchInstanceId}] TRANSITION: Blob ${otherIndex} starting smooth transition to new spacing position (${distance.toFixed(1)}px away)`);
                            }
                            
                            console.log(`↔️ [${sketchInstanceId}] GLOBAL: Applied spacing ${otherBlob.minBlobSpacing} to blob ${otherIndex} at pos (${otherBlob.pos.x.toFixed(1)}, ${otherBlob.pos.y.toFixed(1)})`);
                        });
                    }
                    
                                // Apply humor setting
            if (typeof meta.humor !== 'undefined') {
                newVisuals.humor = meta.humor;
            } else {
                newVisuals.humor = 0; // Ensure humor has a default value
            }
            
            // Apply shine setting
            if (typeof meta.shine !== 'undefined') {
                newVisuals.shine = meta.shine;
            } else {
                newVisuals.shine = 0; // Ensure shine has a default value
            }
            
            // Apply blur setting
            if (typeof meta.blur !== 'undefined') {
                newVisuals.blur = meta.blur;
            } else {
                newVisuals.blur = 0; // Ensure blur has a default value
            }
            
            // Apply blobGrowthPattern setting (affects how blob size changes)
            if (typeof meta.blobGrowthPattern !== 'undefined') {
                // Store this for use in blob size calculations
                blob.blobGrowthPattern = meta.blobGrowthPattern;
                console.log(`📈 [${sketchInstanceId}] Blob ${index} growth pattern: ${meta.blobGrowthPattern}`);
            }
                    
                    // DISABLED: Home region changes to maintain fixed positioning
                    // Speakers maintain fixed positions: Speaker 0 (red) = left, Speaker 1 (blue) = right
                    if (meta.blobHomeRegion) {
                        console.log(`🚫 [${sketchInstanceId}] IGNORED: Segment home region ${meta.blobHomeRegion} for speaker ${index} - using fixed positioning instead`);
                    }

                } else {
                    // For non-speaking blobs, use idle/passive parameters
                    newVisuals = {
                        ...defaultBlobVisuals,
                        blobSizeScale: 3, // Smaller idle size
                        blobStrength: 400, // Reduced strength
                        volumeImpact: 0, // No audio response for non-speaking blobs
                        blobMotionRange: 0.2, // Less movement

                        isVisible: true,
                        isFlashing: false
                    };
                }
                blob.setTargetVisuals(newVisuals);
                lastSpeakerParams[index] = { ...newVisuals };
                console.log(`🔄 [${sketchInstanceId}] Updated blob ${index} visuals (speaker: ${index === speaker ? 'YES' : 'NO'})`);
                
                // Log key parameters for debugging
                if (index === speaker) {
                    console.log(`📊 [${sketchInstanceId}] Blob ${index} parameters:`, {
                        blur: blob.blur,
                        shine: blob.shine,
                        humor: blob.humor,
                        blobiness: blob.blobiness,
                        blobStrength: blob.blobStrength,
                        blobSizeScale: blob.blobSizeScale,
                        volumeImpact: blob.volumeImpact,
                        blobGrowthPattern: blob.blobGrowthPattern,
                        coloredCircleCharSize: blob.coloredCircleCharSize,
                        regularAsciiCharSize: blob.regularAsciiCharSize,
                        minBlobSpacing: blob.minBlobSpacing
                    });
                }
                

                // Set colors only for the speaking blob
                if (index === speaker && meta.emotions && meta.emotions.length > 0) {
                    let currentColors = [];
                    
                    // If emotionGlobalColorMap is empty, try to get color from live config
                    if (Object.keys(emotionGlobalColorMap).length === 0) {
                        console.warn(`⚠️ [${sketchInstanceId}] EmotionGlobalColorMap empty, using getEmotionColor fallback`);
                        meta.emotions.forEach((code, i) => {
                            // Try to get color from live config first
                            let color = getEmotionColor(code);
                            if (color) {
                                currentColors.push(color);
                            } else {
                                // Last resort: use neutral gray
                                console.warn(`⚠️ [${sketchInstanceId}] No color found for "${code}", using gray fallback`);
                                currentColors.push([150, 150, 150]);
                            }
                        });
                    } else {
                        meta.emotions.forEach(code => {
                            // Enhanced case-insensitive lookup
                            let color = null;
                            const variations = [
                                code,                                                           // Exact case
                                code.toLowerCase(),                                             // lowercase
                                code.charAt(0).toUpperCase() + code.slice(1).toLowerCase(),   // Title case
                                code.charAt(0).toLowerCase() + code.slice(1)                  // camelCase
                            ];
                            
                            // Try each variation until we find a match
                            for (const variant of variations) {
                                color = getEmotionColor(variant);
                                if (color) {
                                    currentColors.push(color);
                                    console.log(`[${sketchInstanceId}] ✅ Found color for ${code} (via "${variant}"):`, color);
                                    break;
                                }
                            }
                            
                            if (!color) {
                                console.log(`[${sketchInstanceId}] ⚠️ No color found for ${code}, available keys:`, Object.keys(emotionGlobalColorMap));
                            }
                        });
                    }
                    blob.displayColors = currentColors.length > 0 ? currentColors : [[150, 150, 150]];
                    
                    // Set emotions for character selection
                    blob.setEmotions(meta.emotions);
                    console.log(`🎨 [${sketchInstanceId}] Updated blob ${index} emotions: ${JSON.stringify(meta.emotions)} with ${currentColors.length} colors`);
                } else {
                     // Non-speaking blobs get neutral gray color and neutral emotions
                     blob.displayColors = [[100, 100, 100]]; // Neutral gray for idle blobs
                     blob.setEmotions(['neutral']); // Set neutral emotions for idle blobs
                }
            });

            try {
                sfx.rate(1.0); 
                sfx.play(); 
                isCurrentlyPlaying = true;
                         } catch (audioError) {
                 console.warn('Audio playback error, continuing with visual-only mode:', audioError);
                 // Set visual-only mode flags
                 visualOnlyMode = true;
                 globalAudioFailure = true;
                 window.globalAudioWorkletFailure = true; // Set global flag to prevent future attempts
                 isCurrentlyPlaying = true;
                 isReadyToDrawVisualization = true;
                 
                 // Show visual-only indicator
                 window.dispatchEvent(new CustomEvent('visualOnlyMode', { 
                     detail: { 
                         enabled: true, 
                         reason: 'Audio playback error - AudioWorkletNode not supported' 
                     } 
                 }));
                 
                 // Create visual notification element
                 showVisualOnlyNotification('Audio playback failed - running in visual-only mode');
                 
                 // Still trigger the onended callback for progression
                 setTimeout(() => {
                     if (window.isLoopMode) {
                         console.log(`🔁 [${sketchInstanceId}] Loop mode: replaying ${file}`);
                         playNext();
                     } else {
                         currentIndex++; 
                         p.currentIndex = currentIndex;
                         playNext(); 
                     }
                 }, 3000); // Auto-advance after 3 seconds in visual-only mode
                 return;
             }
            
            // Extra sync trigger when audio starts
            setTimeout(() => {
                if (window.forceTranscriptSync && typeof window.forceTranscriptSync === 'function') {
                    window.forceTranscriptSync();
                }
            }, 200); 
            

            
            setTimeout(() => {
            }, 100);
            
            try {
                sfx.onended(() => { 
                    if (window.isLoopMode) {
                        // In loop mode, replay the same file
                        console.log(`🔁 [${sketchInstanceId}] Loop mode: replaying ${file}`);
                        playNext(); // Don't increment currentIndex
                    } else {
                        currentIndex++; 
                        p.currentIndex = currentIndex; // Sync exposed property
                        playNext(); 
                    }
                });
            } catch (audioError) {
                console.warn('Audio onended callback error, using timeout fallback:', audioError);
                // Fallback: use estimated duration or fixed timeout for progression
                const estimatedDuration = convo[currentIndex]?.duration || 5000; // 5 seconds default
                setTimeout(() => {
                    if (window.isLoopMode) {
                        console.log(`🔁 [${sketchInstanceId}] Loop mode: replaying ${file}`);
                        playNext();
                    } else {
                        currentIndex++; 
                        p.currentIndex = currentIndex;
                        playNext(); 
                    }
                }, estimatedDuration);
            }
        }
        
        p.reinitializeBlobsAndAnalyzers = function() {
            // Add debug info to track multiple calls
            console.log(`🔄 [${sketchInstanceId}] reinitializeBlobsAndAnalyzers called, current blobs:`, blobs?.length || 0);
            console.trace('Call stack for blob initialization'); // Show where this is being called from
            
            // Prevent rapid multiple calls (but allow legitimate reinit for new conversations)
            const now = Date.now();
            if (window.lastBlobInit && (now - window.lastBlobInit < 1000)) {
                console.warn(`⚠️ [${sketchInstanceId}] Preventing rapid blob reinitialization`);
                return;
            }
            window.lastBlobInit = now;
            
            analyzers = []; 
            blobs = [];
            prevVols = [];
            highlightGrids = []; // Reset highlight grids
            // Sync with exposed property
            if (p.blobs !== undefined) p.blobs = blobs;
            const blobsToCreate = isInsightsPage ? 1 : numBlobs;
            
            try {
                // Create a single master analyzer connected to master output
                const masterAnalyzer = new p5.Amplitude();
                masterAnalyzer.setInput(); // Connect to master output to catch all audio
                
                // Create individual analyzers for each blob but also keep the master
                for (let i = 0; i < blobsToCreate; i++) {
                    const analyzer = new p5.Amplitude();
                    analyzers.push(analyzer);
                }
                
                // Also store the master analyzer
                analyzers.masterAnalyzer = masterAnalyzer;
            } catch (audioError) {
                console.warn('Failed to create audio analyzers, continuing without audio analysis:', audioError);
                // Create dummy analyzers to prevent errors
                for (let i = 0; i < blobsToCreate; i++) {
                    analyzers.push(null);
                }
                analyzers.masterAnalyzer = null;
            }
            
            prevVols = new Array(blobsToCreate).fill(0);
            
            
            for (let i = 0; i < blobsToCreate; i++) {
                const regionName = blobHomeRegions[i] || 'center';
                // Position blobs according to their home regions
                const initialPos = getRegionCenter(regionName);
                const blob = new Blob(i, { x: initialPos.x, y: initialPos.y });
                
                // Make blobs visible from the start with strong default values
                blob.setTargetVisuals({
                    ...defaultBlobVisuals,
                    isVisible: true,
                    blobSizeScale: 5, // Larger for better visibility
                    blobStrength: 2000, // Higher strength for better visibility
                    volumeImpact: 1000, // Ensure audio responsiveness
                    blobVisibility: 1.0
                });
                
                // For preview mode or static mode: force immediate visibility
                if (isPreviewMode || isStatic) {
                    blob.target.blobVisibility = 1.0;
                    blob.isVisible = true;
                    blob.blobVisibility = 1.0;
                    console.log(`🎨 [${sketchInstanceId}] Static/Preview mode: Blob ${i} made immediately visible`);
                }
                
                // Set default colors for visibility
                blob.displayColors = [[150, 150, 150]]; // Default gray
                blob.setEmotions(['neutral']);
                
                blobs.push(blob);
                
                console.log(`✨ [${sketchInstanceId}] Created blob ${i} at position (${initialPos.x.toFixed(1)}, ${initialPos.y.toFixed(1)}) for region ${regionName}`);
                
                // Sync with exposed property after adding each blob
                if (p.blobs !== undefined) p.blobs = blobs;
                
                // Create empty highlight grid for this blob - will be populated by emotion highlights
                highlightGrids.push([]);
            }
            
        };
        
        p.loadConversationByFolder = function(folderPath) {
            // Clear any cached conversation data for fresh loading
            emotionData = {};
            convo = [];
            emotionGlobalColorMap = {};
            
            // Clear browser cache for this conversation
            if (window.caches) {
                window.caches.keys().then(cacheNames => {
                    cacheNames.forEach(cacheName => {
                        if (cacheName.includes('conversation') || cacheName.includes('emotion')) {
                            window.caches.delete(cacheName);
                        }
                    });
                });
            }
            
            console.log(`🧹 [${sketchInstanceId}] Cleared cached data for fresh conversation loading`);
            
            let emotionsFileName;
            if (folderPath.includes("convo1")) {
                emotionsFileName = "emotions1_ai_analyzed.json";
            } else if (folderPath.includes("convo2")) {
                emotionsFileName = "emotions2_ai_analyzed.json";
            } else if (folderPath.includes("convo3")) {
                emotionsFileName = "emotions3_ai_analyzed.json";
            } else if (folderPath.includes("convo4")) {
                emotionsFileName = "emotions4_ai_analyzed.json";
            } else if (folderPath.includes("convo5")) {
                emotionsFileName = "emotions5_ai_analyzed.json";
            } else if (folderPath.includes("convo6")) {
                emotionsFileName = "emotions6_ai_analyzed.json";
            } else if (folderPath.includes("convo7")) {
                emotionsFileName = "emotions7_ai_analyzed.json";
            } else if (folderPath.includes("convo8")) {
                emotionsFileName = "emotions8_ai_analyzed.json";
            } else if (folderPath.includes("convo9")) {
                emotionsFileName = "emotions9_ai_analyzed.json";
            } else if (folderPath.includes("convo10")) {
                emotionsFileName = "emotions10_ai_analyzed.json";
            } else if (folderPath.includes("convo11")) {
                emotionsFileName = "emotions11_ai_analyzed.json";
            } else if (folderPath.includes("convo12")) {
                emotionsFileName = "emotions12_ai_analyzed.json";
            } else if (folderPath.includes("convo19")) {
                emotionsFileName = "emotions19_ai_analyzed.json";
            } else {
                emotionsFileName = "emotions1_ai_analyzed.json"; // fallback
            }
            
            // Enhanced cache-busting for consistent emotion loading
            const cacheBuster = Date.now() + '_v' + Math.random().toString(36).substr(2, 9);
            const emotionUrl = folderPath + emotionsFileName + '?cb=' + cacheBuster;
            
            console.log(`🔄 [${sketchInstanceId}] Loading conversation: ${folderPath}`);
            console.log(`📁 [${sketchInstanceId}] Emotion file: ${emotionUrl}`);
            
            // Add loading timeout and retry mechanism
            let loadAttempts = 0;
            const maxAttempts = 3;
            
            const attemptLoad = () => {
                loadAttempts++;
                console.log(`🔄 [${sketchInstanceId}] Load attempt ${loadAttempts}/${maxAttempts}`);
                
                p.loadJSON(emotionUrl, 
                    (loadedData) => {
                        // Enhanced data validation
                        if (!loadedData || typeof loadedData !== 'object') {
                            console.error(`❌ [${sketchInstanceId}] Invalid emotion data format`);
                            if (loadAttempts < maxAttempts) {
                                console.log(`🔄 [${sketchInstanceId}] Retrying in 1 second...`);
                                setTimeout(attemptLoad, 1000);
                                return;
                            } else {
                                console.error(`❌ [${sketchInstanceId}] Failed to load after ${maxAttempts} attempts`);
                                return;
                            }
                        }
                        
                        console.log(`✅ [${sketchInstanceId}] Successfully loaded emotion data on attempt ${loadAttempts}`);
                        
                        // Validate key data integrity
                        const fileKeys = Object.keys(loadedData).filter(key => key !== 'conversation_details');
                        console.log(`📊 [${sketchInstanceId}] Found ${fileKeys.length} MP3 files with emotion data`);
                        
                        // Check for multiple emotions in first few files
                        let multiEmotionCount = 0;
                        fileKeys.slice(0, 5).forEach(key => {
                            const emotions = loadedData[key]?.emotions;
                            if (emotions && Array.isArray(emotions) && emotions.length > 1) {
                                multiEmotionCount++;
                                console.log(`🎭 [${sketchInstanceId}] ${key}: ${emotions.length} emotions [${emotions.join(', ')}]`);
                            }
                        });
                        
                        if (multiEmotionCount > 0) {
                            console.log(`✅ [${sketchInstanceId}] Validated: ${multiEmotionCount} files have multiple emotions`);
                        } else {
                            console.warn(`⚠️ [${sketchInstanceId}] Warning: No multiple emotions detected in sample`);
                        }
                        
                        emotionData = loadedData;
                        convo = []; 
                        let fileNames = Object.keys(emotionData).filter(key => key !== 'conversation_details'); 
                        fileNames.sort();
                        fileNames.forEach(fileName => { 
                            const speaker = emotionData[fileName]?.speaker;
                            if(typeof speaker !== 'undefined') convo.push({ file: fileName, speaker });
                        });

                        // ALWAYS prioritize live emotions config over conversation data
                        console.log(`🎨 [${sketchInstanceId}] Loading fresh emotion colors from emotions_config.json...`);
                        
                        // Use promise-based approach since we're in a callback
                        fetch('/config/emotions_config.json?t=' + Date.now())
                                .then(emotionConfigResponse => {
                                    if (emotionConfigResponse.ok) {
                                        return emotionConfigResponse.json();
                                    } else {
                                        console.warn(`⚠️ [${sketchInstanceId}] Failed to load emotions_config.json:`, emotionConfigResponse.status);
                                        return null;
                                    }
                                })
                                .then(emotionsConfig => {
                                    if (emotionsConfig) {
                                        // Store the config globally for translation lookup
                                        window.emotionsConfig = emotionsConfig;
                                        
                                        emotionGlobalColorMap = {};
                                        
                                        Object.entries(emotionsConfig).forEach(([emotion, config]) => {
                                            if (config.active && config.color) {
                                                emotionGlobalColorMap[emotion] = hexToRgb(config.color);
                                                console.log(`🎨 [${sketchInstanceId}] Loaded color for "${emotion}": ${config.color} → [${emotionGlobalColorMap[emotion].join(', ')}]`);
                                            }
                                        });
                                        
                                        console.log(`✅ [${sketchInstanceId}] Loaded ${Object.keys(emotionGlobalColorMap).length} emotion colors from emotions_config.json`);
                                        
                                        // Also request colors from admin panel to get the latest
                                        setTimeout(() => {
                                            requestEmotionColorsFromAdmin();
                                        }, 500);
                                        
                                        // Force update any existing visualizations
                                        if (window.blobs && window.blobs.length > 0) {
                                            console.log(`🔄 [${sketchInstanceId}] Updating ${window.blobs.length} existing blobs with new colors...`);
                                            window.blobs.forEach((blob, index) => {
                                                if (blob.setEmotions && blob.currentEmotions) {
                                                    blob.setEmotions(blob.currentEmotions);
                                                    console.log(`🎨 [${sketchInstanceId}] Updated blob ${index} with emotions: ${blob.currentEmotions.join(', ')}`);
                                                }
                                            });
                                        }
                                        
                                        // Also force a complete redraw to ensure colors are applied
                                        setTimeout(() => {
                                            if (typeof redraw === 'function') {
                                                redraw();
                                                console.log(`🎨 [${sketchInstanceId}] Forced redraw after color update`);
                                            }
                                            if (typeof loop === 'function' && window.isAnimationPaused) {
                                                loop();
                                                console.log(`🎨 [${sketchInstanceId}] Restarted animation loop for color update`);
                                            }
                                        }, 500);
                                    }
                                })
                                .catch(error => {
                                    console.error(`❌ [${sketchInstanceId}] Error loading emotions_config.json:`, error);
                                });
                        
                        p.reinitializeBlobsAndAnalyzers();
                        
                        // ALWAYS load fresh emotion colors after loading conversation data
                        // This ensures visualizations get the latest colors even if conversation data has old colors
                        setTimeout(() => {
                            console.log(`🎨 [${sketchInstanceId}] Loading fresh emotion colors after conversation data load...`);
                            fetch('/config/emotions_config.json?t=' + Date.now())
                                .then(response => response.json())
                                .then(emotionsConfig => {
                                    console.log(`🎨 [${sketchInstanceId}] Updating emotion colors with fresh config...`);
                                    
                                    // Update emotion color maps with latest colors
                                    Object.entries(emotionsConfig).forEach(([emotion, config]) => {
                                        if (config.active && config.color) {
                                            const rgbColor = hexToRgb(config.color);
                                            emotionGlobalColorMap[emotion] = rgbColor;
                                            console.log(`🎨 [${sketchInstanceId}] Fresh color for "${emotion}": ${config.color} → [${rgbColor.join(', ')}]`);
                                        }
                                    });
                                    
                                    // Force update any blobs that were just created
                                    if (window.blobs && window.blobs.length > 0) {
                                        console.log(`🔄 [${sketchInstanceId}] Applying fresh colors to ${window.blobs.length} blobs...`);
                                        window.blobs.forEach((blob, index) => {
                                            if (blob.setEmotions && blob.currentEmotions) {
                                                blob.setEmotions(blob.currentEmotions);
                                                console.log(`🎨 [${sketchInstanceId}] Applied fresh colors to blob ${index}: ${blob.currentEmotions.join(', ')}`);
                                            }
                                        });
                                        
                                        // Force redraw
                                        if (typeof redraw === 'function') redraw();
                                    }
                                })
                                .catch(error => {
                                    console.error(`❌ [${sketchInstanceId}] Error loading fresh emotion colors:`, error);
                                });
                        }, 1000); // Wait for blobs to be created
                        
                        if (convo.length > 0) {
                            const firstFile = convo[0].file;
                            const firstSpeaker = convo[0].speaker;
                            const firstMeta = emotionData[firstFile] || {};
                            
                            // Enhanced validation for first segment
                            if (firstMeta.emotions && firstMeta.emotions.length > 1) {
                                console.log(`🎭 [${sketchInstanceId}] First segment (${firstFile}) has ${firstMeta.emotions.length} emotions: [${firstMeta.emotions.join(', ')}]`);
                            }
                            
                            // Set global parameters from first meta
                            if (typeof firstMeta.gridsize !== 'undefined') {
                                gridsize = firstMeta.gridsize;
                            } else if (typeof firstMeta.grid_density !== 'undefined') {
                                gridsize = firstMeta.grid_density;
                            }
                            
                            // DISABLED: Segment-specific home regions to maintain fixed positioning
                            // Home regions are now fixed: Speaker 0 (red) = left, Speaker 1 (blue) = right
                            if (firstMeta.blobHomeRegion) {
                                console.log(`🚫 [${sketchInstanceId}] IGNORED: Segment home region ${firstMeta.blobHomeRegion} - using fixed positioning instead`);
                            }
                            
                            // ENFORCE FIXED POSITIONING: Ensure all blobs are positioned correctly
                            blobs.forEach((blob, index) => {
                                // FIXED: Always position Speaker 0 (red) on left, Speaker 1 (blue) on right
                                const fixedRegion = index === 0 ? 'center-left' : 'center-right';
                                blob.homeRegion = fixedRegion;
                                const fixedCenter = getRegionCenter(fixedRegion);
                                blob.pos.x = fixedCenter.x;
                                blob.pos.y = fixedCenter.y;
                                console.log(`🏠 [${sketchInstanceId}] FIXED POSITIONING: Speaker ${index} (${index === 0 ? 'red' : 'blue'}) at ${fixedRegion} (${fixedCenter.x.toFixed(0)}, ${fixedCenter.y.toFixed(0)})`);
                            });

                            // Force recreate highlight grids with the correct gridsize
                            recreateHighlightGrids();
                            
                            // Apply to blobs and make them visible
                            blobs.forEach((blob, index) => {
                                let newVisuals = { ...defaultBlobVisuals };
                                for (const key in defaultBlobVisuals) {
                                    if (typeof firstMeta[key] !== 'undefined') {
                                        newVisuals[key] = firstMeta[key];
                                    }
                                }
                                
                                // Ensure blobs become visible when emotion data loads
                                newVisuals.isVisible = firstMeta.blobsVisible !== false;
                                newVisuals.isFlashing = firstMeta.flash === true;
                                
                                // For non-speaking blobs, give them minimal but visible presence
                                if (index !== firstSpeaker) {
                                    newVisuals.blobSizeScale = Math.max(1, newVisuals.blobSizeScale * 0.3);
                                    newVisuals.blobStrength = Math.max(200, newVisuals.blobStrength * 0.3);
                                    newVisuals.volumeImpact = 0; // No audio response for non-speaking blobs initially
                                }
                                
                                // GLOBAL SPACING: Apply blob spacing settings from first metadata GLOBALLY
                                if (typeof firstMeta.minBlobSpacing !== 'undefined') {
                                    // SAFEGUARD: Ensure minBlobSpacing stays as string
                                    let spacingValue = firstMeta.minBlobSpacing;
                                    if (typeof firstMeta.minBlobSpacing === 'number') {
                                        console.warn(`⚠️ [${sketchInstanceId}] INITIAL LOAD: Converting numeric spacing ${firstMeta.minBlobSpacing} back to string preset`);
                                        // Try to find the corresponding preset name
                                        const presetName = Object.keys(blobSpacingPresets).find(key => blobSpacingPresets[key] === firstMeta.minBlobSpacing);
                                        spacingValue = presetName || 'close';
                                    }
                                    
                                    newVisuals.minBlobSpacing = spacingValue;
                                    // Also set it on the blob directly for immediate effect
                                    blob.minBlobSpacing = spacingValue;
                                    console.log(`↔️ [${sketchInstanceId}] INITIAL LOAD: Blob ${index} spacing set to: ${spacingValue}`);
                                }
                                
                                // Enhanced color and emotion setup with validation
                                if (index === firstSpeaker && firstMeta.emotions && firstMeta.emotions.length > 0) {
                                    let currentColors = [];
                                    if (Object.keys(emotionGlobalColorMap).length === 0) {
                                        console.warn(`⚠️ [${sketchInstanceId}] EmotionGlobalColorMap empty during initial load, using getEmotionColor fallback`);
                                        firstMeta.emotions.forEach((code, i) => {
                                            // Try to get color from live config first
                                            let color = getEmotionColor(code);
                                            if (color) {
                                                currentColors.push(color);
                                            } else {
                                                // Last resort: use neutral gray
                                                console.warn(`⚠️ [${sketchInstanceId}] No color found for "${code}", using gray fallback`);
                                                currentColors.push([150, 150, 150]);
                                            }
                                        });
                                    } else {
                                        firstMeta.emotions.forEach(code => {
                                            // Enhanced case-insensitive lookup
                                            let color = null;
                                            const variations = [
                                                code,                                                           // Exact case
                                                code.toLowerCase(),                                             // lowercase
                                                code.charAt(0).toUpperCase() + code.slice(1).toLowerCase(),   // Title case
                                                code.charAt(0).toLowerCase() + code.slice(1)                  // camelCase
                                            ];
                                            
                                            // Try each variation until we find a match
                                            for (const variant of variations) {
                                                color = getEmotionColor(variant);
                                                if (color) {
                                                    currentColors.push(color);
                                                    console.log(`[${sketchInstanceId}] ✅ Found initial color for ${code} (via "${variant}"):`, color);
                                                    break;
                                                }
                                            }
                                            
                                            if (!color) {
                                                console.log(`[${sketchInstanceId}] ⚠️ No initial color found for ${code}, available keys:`, Object.keys(emotionGlobalColorMap));
                                            }
                                        });
                                    }
                                    blob.displayColors = currentColors.length > 0 ? currentColors : [[150, 150, 150]];
                                    blob.setEmotions(firstMeta.emotions);
                                    
                                    // Enhanced validation logging
                                    console.log(`🎨 [${sketchInstanceId}] Blob ${index} setup: ${firstMeta.emotions.length} emotions, ${currentColors.length} colors`);
                                    if (firstMeta.emotions.length !== currentColors.length) {
                                        console.warn(`⚠️ [${sketchInstanceId}] Emotion-color mismatch detected!`);
                                    }
                                } else {
                                    // Non-speaking blobs get neutral appearance
                                    blob.displayColors = [[100, 100, 100]];
                                    blob.setEmotions(['neutral']);
                                }
                                
                                blob.setTargetVisuals(newVisuals);
                            });
                        }
                        
                        // Load all files for complete conversation playback
                        const maxInitialLoad = convo.length; // Load ALL files
                        const prefetchCount = 5; // Number of files to prefetch ahead (not used when loading all)
                        const initialLoadCount = convo.length; // Load everything
                        let soundsLoadedCount = 0;
                        soundFiles = new Array(convo.length).fill(null);

                        // Create a loading queue for progressive loading
                        let loadingQueue = new Set();
                        let loadedIndices = new Set();

                        // Function to load audio file with better error handling
                        const loadAudioFile = (index) => {
                            if (index < 0 || index >= convo.length || loadingQueue.has(index) || loadedIndices.has(index)) {
                                return;
                            }
                            
                            loadingQueue.add(index);
                            const filePath = folderPath + convo[index].file;
                            
                            console.log(`🎵 [${sketchInstanceId}] Loading audio ${index}: ${convo[index].file}`);
                            
                            p.loadSound(filePath, 
                                (sfx) => { 
                                    soundFiles[index] = sfx; 
                                    loadedIndices.add(index);
                                    loadingQueue.delete(index);
                                    console.log(`✅ [${sketchInstanceId}] Loaded audio ${index+1}/${convo.length}: ${convo[index].file}`);
                                },
                                (error) => { 
                                    console.warn(`⚠️ [${sketchInstanceId}] Failed to load audio ${index}:`, error);
                                    soundFiles[index] = 'failed';
                                    loadedIndices.add(index);
                                    loadingQueue.delete(index);
                                }
                            );
                        };

                        // Override ensureSoundIsLoaded to use the new loading system
                        p.ensureSoundIsLoaded = function(index) {
                            if (index >= 0 && index < convo.length && !soundFiles[index]) {
                                loadAudioFile(index);
                            }
                        };

                        if (initialLoadCount === 0) {
                            isReadyToDrawVisualization = true;
                            console.log('No audio files to load, visualization ready');
                            return;
                        }

                        // Don't set ready until sounds are loaded
                        isReadyToDrawVisualization = false;
                        console.log(`🎵 Loading all ${convo.length} audio files...`);

                        // Load ALL audio files
                        let loadedCount = 0;
                        for (let i = 0; i < convo.length; i++) {
                            loadAudioFile(i);
                        }
                        
                        // Check loading progress
                        const checkLoadProgress = setInterval(() => {
                            const loaded = soundFiles.filter(s => s && s !== 'loading').length;
                            if (loaded !== loadedCount) {
                                loadedCount = loaded;
                                console.log(`🎵 Progress: ${loaded}/${convo.length} audio files loaded`);
                            }
                            if (loaded === convo.length) {
                                clearInterval(checkLoadProgress);
                                isReadyToDrawVisualization = true;
                                console.log(`✅ All ${convo.length} audio files loaded!`);
                            }
                        }, 500);
                        
                        // Wait for all files to load before autostart
                        const waitForAllLoaded = setInterval(() => {
                            if (isReadyToDrawVisualization) {
                                clearInterval(waitForAllLoaded);
                                tryAutoStart();
                            }
                        }, 500);
                    }, (error) => {
                        console.error(`[${sketchInstanceId}] ❌ Failed to load emotion data from ${emotionUrl}:`, error);
                        if (loadAttempts < maxAttempts) {
                            console.log(`🔄 [${sketchInstanceId}] Retrying in 1 second...`);
                            setTimeout(attemptLoad, 1000);
                            return;
                        } else {
                            console.error(`❌ [${sketchInstanceId}] Failed to load after ${maxAttempts} attempts`);
                            return;
                        }
                    }
                );
            };
            
            attemptLoad();
        };

        p.ensureSoundIsLoaded = function(index) {
            // This will be overridden by the progressive loading system in initializeConversation
            if (index < 0 || index >= convo.length || soundFiles[index]) return;
            
            // Ensure we have a valid folder
            p.ensureConversationFolder();
            
            soundFiles[index] = 'loading';
            const soundPath = `conversations/${currentConvoFolderFromData}/${convo[index].file}`;
            p.loadSound(soundPath, 
                sfx => { 
                    soundFiles[index] = sfx; 
                    console.log(`✅ [${sketchInstanceId}] Loaded on demand: ${convo[index].file}`);
                }, 
                () => { 
                    soundFiles[index] = 'failed'; 
                    console.error(`❌ [${sketchInstanceId}] Failed to load: ${convo[index].file}`);
                }
            );
        }

        p.preload = function() {
            // First load visualization parameters
            loadVisualizationParameters().then(() => {
                // Check if the path was already set by visualization.html
                if (window.conversationDataPath && !conversationDataPath) {
                    conversationDataPath = window.conversationDataPath;
                    console.log(`[${sketchInstanceId}] Preload using path from window: ${conversationDataPath}`);
                }

                // If a path is available, load the data
                if (conversationDataPath) {
                    p.loadData();
                } else {
                    console.warn(`[${sketchInstanceId}] No conversationDataPath set. Waiting for it to be provided.`);
                    // Check again in a moment
                    setTimeout(() => {
                        if (window.conversationDataPath && !conversationDataPath) {
                            conversationDataPath = window.conversationDataPath;
                            console.log(`[${sketchInstanceId}] Found path after delay: ${conversationDataPath}`);
                            p.loadData();
                        }
                    }, 500);
                }
            });
        };

        p.loadData = function() {
            if (!conversationDataPath) {
                console.error(`[${sketchInstanceId}] ERROR: loadData called without a path.`);
                // Fallback to a default to prevent crashing
                conversationDataPath = 'conversations/convo1/emotions1_ai_analyzed.json';
            }
            
            // Request throttling to prevent server overload and corruption
            if (!window.lastLoadDataTime) window.lastLoadDataTime = 0;
            const now = Date.now();
            const REQUEST_THROTTLE_MS = 500; // Minimum 500ms between requests
            
            if (now - window.lastLoadDataTime < REQUEST_THROTTLE_MS) {
                console.log(`[${sketchInstanceId}] ⏳ Request throttled, waiting ${REQUEST_THROTTLE_MS - (now - window.lastLoadDataTime)}ms...`);
                setTimeout(() => p.loadData(), REQUEST_THROTTLE_MS - (now - window.lastLoadDataTime));
                return;
            }
            window.lastLoadDataTime = now;
            
            console.log(`[${sketchInstanceId}] 🔄 Loading emotion data from: ${conversationDataPath}`);
            
            // Add cache-busting timestamp to ensure fresh data every time
            const cacheBustingPath = conversationDataPath + '?t=' + new Date().getTime() + '&r=' + Math.random() + '&v=3';
            
            p.loadJSON(cacheBustingPath, (data) => {
                if (!data || Object.keys(data).length === 0) {
                    console.error(`[${sketchInstanceId}] ❌ Loaded emotion data is empty or invalid`);
                    return;
                }
                
                emotionData = data;
                console.log(`[${sketchInstanceId}] ✅ Successfully loaded emotion data from: ${conversationDataPath}`);
                
                // DEBUG: Log all loaded emotions to verify consistency
                const mp3Files = Object.keys(data).filter(k => k.endsWith('.mp3')).sort();
                console.log(`[${sketchInstanceId}] 🎭 EMOTION DEBUG - Loaded ${mp3Files.length} MP3 files:`);
                mp3Files.slice(0, 5).forEach(file => { // Log first 5 files
                    const emotions = data[file]?.emotions || ['no-emotions'];
                    const speaker = data[file]?.speaker || 'no-speaker';
                    console.log(`   📝 ${file}: Speaker ${speaker}, Emotions: [${emotions.join(', ')}]`);
                });
                if (mp3Files.length > 5) {
                    console.log(`   ... and ${mp3Files.length - 5} more files`);
                }
                
                // Dispatch event for side panel to populate transcription
                window.dispatchEvent(new CustomEvent('conversationDataLoaded', { detail: { data: emotionData } }));
                
                // --- Initialize after data is loaded ---
                // Ensure we have a valid conversation folder
                p.ensureConversationFolder();
                
                initializeSketch(); // This will setup blobs and start sound loading
                
                                        // Force visualization refresh after loading to ensure emotions display
                        setTimeout(() => {
                            console.log(`[${sketchInstanceId}] 🔄 Forcing visualization refresh to display emotions`);
                            
                            // CRITICAL FIX: Apply emotions from loaded data to blobs
                            if (emotionData && blobs && blobs.length > 0) {
                                // Get the first MP3 file to display initially
                                const mp3Files = Object.keys(emotionData).filter(k => k.endsWith('.mp3')).sort();
                                if (mp3Files.length > 0) {
                                    const firstFile = mp3Files[0];
                                    const segmentData = emotionData[firstFile];
                                    
                                    if (segmentData) {
                                        console.log(`[${sketchInstanceId}] 🎭 Applying initial emotions from ${firstFile}`);
                                        const speaker = segmentData.speaker || 0;
                                        
                                        // Apply segment parameters to ensure emotions display
                                        applySegmentParameters(firstFile, segmentData);
                                        
                                        // For preview mode: ensure all blobs are visible immediately
                                        if (isPreviewMode && window.isAnimationPaused) {
                                            blobs.forEach(blob => {
                                                blob.target.blobVisibility = 1.0;
                                                blob.isVisible = true;
                                                blob.blobVisibility = 1.0;
                                            });
                                            console.log(`[${sketchInstanceId}] 🎨 Preview mode: Forced all blobs visible`);
                                        }
                                        
                                        // Force redraw after applying parameters
                                        if (p.redraw && typeof p.redraw === 'function') {
                                            p.redraw();
                                        }
                                    }
                                }
                            }
                            
                            // Additional check: verify blobs have emotions after loading
                            if (blobs && blobs.length > 0) {
                                let emotionCount = 0;
                                blobs.forEach((blob, i) => {
                                    if (blob.currentEmotions && blob.currentEmotions.length > 0) {
                                        emotionCount++;
                                        console.log(`[${sketchInstanceId}] 🎨 Blob ${i} has emotions: ${blob.currentEmotions.join(', ')}`);
                                    }
                                });
                                if (emotionCount === 0) {
                                    console.warn(`[${sketchInstanceId}] ⚠️ No blobs have emotions after loading! Attempting to fix...`);
                                    // Try one more time to apply emotions
                                    const mp3Files = Object.keys(emotionData).filter(k => k.endsWith('.mp3'));
                                    if (mp3Files.length > 0 && emotionData[mp3Files[0]]) {
                                        applySegmentParameters(mp3Files[0], emotionData[mp3Files[0]]);
                                    }
                                }
                            }
                        }, 1000);
                
            }, (err) => {
                console.error(`[${sketchInstanceId}] ❌ Failed to load emotion data from ${conversationDataPath}:`, err);
                
                // Try fallback: look for the original emotions file without "_ai_analyzed"
                const fallbackPath = conversationDataPath.replace('_ai_analyzed.json', '.json');
                if (fallbackPath !== conversationDataPath) {
                    console.log(`[${sketchInstanceId}] 🔄 Trying fallback path: ${fallbackPath}`);
                    
                    const fallbackCacheBustingPath = fallbackPath + '?t=' + new Date().getTime() + '&r=' + Math.random();
                    
                    p.loadJSON(fallbackCacheBustingPath, (data) => {
                        emotionData = data;
                        console.log(`[${sketchInstanceId}] ✅ Successfully loaded fallback emotion data from: ${fallbackPath}`);
                        
                        // Dispatch event for side panel to populate transcription
                        window.dispatchEvent(new CustomEvent('conversationDataLoaded', { detail: { data: emotionData } }));
                        
                        // Update current conversation folder from the successful path
                        p.ensureConversationFolder();
                        
                        initializeSketch();
                        
                        // Force refresh for fallback data too
                        setTimeout(() => {
                            if (p.redraw && typeof p.redraw === 'function') {
                                p.redraw();
                            }
                        }, 1000);
                        
                    }, (fallbackErr) => {
                        console.error(`[${sketchInstanceId}] ❌ Fallback also failed. No emotion data available.`, fallbackErr);
                        
                        // Create expanded dummy data to prevent complete failure
                        emotionData = {};
                        
                        // Extract conversation folder to determine appropriate file count
                        const pathSegments = conversationDataPath.split('/');
                        let convoFolder = 'convo1'; // default
                        if (pathSegments.length >= 2) {
                            convoFolder = pathSegments[pathSegments.length - 2];
                        }
                        
                        // Generate realistic dummy data based on actual conversation structures
                        let fileCount = 73; // default to convo1 length
                        let startNum = 1;
                        
                        switch(convoFolder) {
                            case 'convo1': fileCount = 73; startNum = 1; break;
                            case 'convo2': fileCount = 174; startNum = 5; break;  // convo2 starts at 005
                            case 'convo3': fileCount = 4; startNum = 1; break;
                            case 'convo4': fileCount = 20; startNum = 1; break;
                            case 'convo5': fileCount = 73; startNum = 1; break;
                            case 'convo6': fileCount = 104; startNum = 1; break;
                            case 'convo7': fileCount = 68; startNum = 1; break;
                            case 'convo8': fileCount = 14; startNum = 1; break;
                            case 'convo9': fileCount = 14; startNum = 1; break;
                            case 'convo10': fileCount = 104; startNum = 1; break;
                            case 'convo11': fileCount = 14; startNum = 1; break;
                            case 'convo12': fileCount = 14; startNum = 1; break;
                            default: fileCount = 50; startNum = 1; break; // reasonable default
                        }
                        
                        for (let i = 0; i < fileCount; i++) {
                            const fileNum = (startNum + i).toString().padStart(3, '0');
                            emotionData[`${fileNum}.mp3`] = {
                                "speaker": i % 2, // Alternate between speakers
                                "emotions": [["neutral", "calm", "thoughtful", "engaged"][Math.floor(Math.random() * 4)]], // emotions must be an array
                                "transcript": `Dummy segment ${fileNum} - No data available`
                            };
                        }
                        
                        console.warn(`[${sketchInstanceId}] ⚠️ Using dummy data for ${convoFolder} (${Object.keys(emotionData).length} files: ${String(startNum).padStart(3, '0')} to ${String(startNum + fileCount - 1).padStart(3, '0')}) to prevent crash.`);
                        
                        // Extract folder from original path
                        p.ensureConversationFolder();
                        
                        initializeSketch();
                        isReadyToDrawVisualization = true; // Force ready state even with dummy data
                    });
                } else {
                    // No fallback available, create dummy data
                    console.error(`[${sketchInstanceId}] ❌ No fallback available. Creating dummy data.`);
                    emotionData = {};
                    
                    // Extract conversation folder to determine appropriate file count
                    const folderPathSegments = conversationDataPath.split('/');
                    let convoFolder = 'convo1'; // default
                    if (folderPathSegments.length >= 2) {
                        convoFolder = folderPathSegments[folderPathSegments.length - 2];
                    }
                    
                    // Generate realistic dummy data based on actual conversation structures
                    let fileCount = 73; // default to convo1 length
                    let startNum = 1;
                    
                    switch(convoFolder) {
                        case 'convo1': fileCount = 73; startNum = 1; break;
                        case 'convo2': fileCount = 174; startNum = 5; break;  // convo2 starts at 005
                        case 'convo3': fileCount = 4; startNum = 1; break;
                        case 'convo4': fileCount = 20; startNum = 1; break;
                        case 'convo5': fileCount = 73; startNum = 1; break;
                        case 'convo6': fileCount = 104; startNum = 1; break;
                        case 'convo7': fileCount = 68; startNum = 1; break;
                        case 'convo8': fileCount = 14; startNum = 1; break;
                        case 'convo9': fileCount = 14; startNum = 1; break;
                        case 'convo10': fileCount = 104; startNum = 1; break;
                        case 'convo11': fileCount = 14; startNum = 1; break;
                        case 'convo12': fileCount = 14; startNum = 1; break;
                        default: fileCount = 50; startNum = 1; break; // reasonable default
                    }
                    
                    for (let i = 0; i < fileCount; i++) {
                        const fileNum = (startNum + i).toString().padStart(3, '0');
                        emotionData[`${fileNum}.mp3`] = {
                            "speaker": i % 2, // Alternate between speakers
                            "emotions": [["neutral", "calm", "thoughtful", "engaged"][Math.floor(Math.random() * 4)]], // emotions must be an array
                            "transcript": `Dummy segment ${fileNum} - No data available`
                        };
                    }
                    console.log(`[${sketchInstanceId}] 📝 Created dummy data for ${convoFolder} with ${Object.keys(emotionData).length} files (${String(startNum).padStart(3, '0')} to ${String(startNum + fileCount - 1).padStart(3, '0')})`);
                    
                    // Extract folder from original path
                    p.ensureConversationFolder();
                    
                    initializeSketch();
                    isReadyToDrawVisualization = true; // Force ready state even with dummy data
                }
            });
        };

        p.setup = () => {
            // Clean up any existing canvases BEFORE creating a new one
            const existingCanvases = document.querySelectorAll('canvas');
            existingCanvases.forEach((oldCanvas) => {
                console.log(`🗑️ [${sketchInstanceId}] Removing existing canvas before setup`);
                if (oldCanvas.parentNode) {
                    oldCanvas.parentNode.removeChild(oldCanvas);
                }
            });
            
            // Get container dimensions - the canvas will be automatically placed by p5.js constructor
            let containerW = p.windowWidth, containerH = p.windowHeight;

            // Try to get actual container size
            let canvasContainer = p.select('#visualization-canvas-container');
            if (canvasContainer) {
                const containerElement = canvasContainer.elt;
                const rect = containerElement.getBoundingClientRect();
                containerW = rect.width > 0 ? rect.width : p.windowWidth;
                containerH = rect.height > 0 ? rect.height : p.windowHeight;
            } else {
                // Fallback: look for grid container
                canvasContainer = p.select('#grid-preview-canvas-container');
                if (canvasContainer) {
                    const containerElement = canvasContainer.elt;
                    const rect = containerElement.getBoundingClientRect();
                    containerW = rect.width > 0 ? rect.width : 800;
                    containerH = rect.height > 0 ? rect.height : 600;
                }
            }

            // Ensure minimum size for proper blob positioning
            containerW = Math.max(containerW, 800);
            containerH = Math.max(containerH, 600);

            // Create canvas at full resolution - it will be automatically attached by p5.js constructor
            p.createCanvas(containerW, containerH);
            
            if (isSimpleMode) {
                console.log(`🔧 [${sketchInstanceId}] Simple mode: Full-size canvas ${containerW}x${containerH} with simplified rendering`);
            }
            
            // Immediately place the canvas in the correct container
            const canvas = p.canvas;
            if (canvas) {
                const container = document.getElementById('visualization-canvas-container');
                if (container) {
                    // Clear the container first
                    container.innerHTML = '';
                    // Place canvas in the container
                    container.appendChild(canvas);
                    
                                // Apply proper styling for full-size canvas
            canvas.style.cssText = `
                display: block !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                z-index: 1 !important;
                opacity: 1 !important;
                visibility: visible !important;
                pointer-events: auto !important;
            `;
            
            console.log(`🖼️ [${sketchInstanceId}] Canvas created and placed in container: ${p.width}x${p.height}`);
        }
    }
    
    // Force load emotion colors early in setup
    forceReloadEmotionColors();

    asciiBuffer = p.createGraphics(p.width, p.height);
    
    // Set global font for main canvas and ASCII buffer
    p.textFont('Miriam Libre, sans-serif');
    asciiBuffer.textFont('Miriam Libre, sans-serif');
    
    p.background(canvasBackgroundColor);
    
    // Force initial rendering for preview mode when paused, static mode, OR simple mode
    if ((window.isAnimationPaused && isPreviewMode) || isStatic || isSimpleMode) {
        console.log(`🎨 [${sketchInstanceId}] Preview/Static/Simple mode - forcing initial render`);
        isReadyToDrawVisualization = true;
        
        // Initialize blobs immediately for preview/static/simple
        if (!blobs || blobs.length === 0) {
            for (let i = 0; i < 2; i++) {
                blobs.push(new Blob(i));
            }
            
            // Force initial visibility with default properties
            blobs.forEach((blob, i) => {
                blob.target.blobVisibility = 1.0;
                blob.isVisible = true;
                blob.blobVisibility = 1.0;
                blob.target.blobSizeScale = isSimpleMode ? 5 : 5; // Maximum 5 for all modes
                blob.target.blobStrength = 1000; // Default strength
                
                // Set default colors for immediate visibility
                const defaultColors = [
                    [230, 50, 50], // Red for speaker 0
                    [50, 130, 200] // Blue for speaker 1
                ];
                blob.displayColors = [defaultColors[i % defaultColors.length]];
                
                console.log(`🎨 [${sketchInstanceId}] ${isSimpleMode ? 'Simple' : 'Static'} blob ${i} initialized with color [${blob.displayColors[0]}]`);
            });
        }
    }

            // CRITICAL FIX: Reposition blobs now that canvas has proper dimensions
            if (blobs && blobs.length > 0) {
                console.log(`🔧 [${sketchInstanceId}] Repositioning ${blobs.length} blobs after canvas creation`);
                blobs.forEach((blob, i) => {
                    // Clear cached region centers since canvas size was 0 before
                    regionCenterCache = {};
                    lastCanvasSize = { w: 0, h: 0 };
                    
                    // Recalculate home center with proper canvas dimensions
                    const homeCenter = getRegionCenter(blob.homeRegion);
                    blob.pos.x = homeCenter.x;
                    blob.pos.y = homeCenter.y;
                    blob.cachedHomeCenter = homeCenter; // Cache the correct position
                    
                    console.log(`🏠 [${sketchInstanceId}] Blob ${i} repositioned to ${blob.homeRegion}: (${homeCenter.x.toFixed(0)}, ${homeCenter.y.toFixed(0)})`);
                });
            }
        };

        // Expose currentMeta for parameter panel access
        p.currentMeta = currentMeta;

        // Store frozen frame count for paused animations
        let frozenFrameCount = 0;
        let lastAnimationPausedState = false;
        
        // Helper function to get animation frame count
        const getAnimationFrame = () => {
            return window.isAnimationPaused ? frozenFrameCount : p.frameCount;
        };
        
        p.draw = () => {
            // Check if animation is paused (for hover control)
            if (window.isAnimationPaused) {
                // Continue with normal rendering but freeze movement and updates
                // This allows the visualization to be visible but static
                window.pausedRenderingMode = true;
                
                // Capture frame count when first paused
                if (!lastAnimationPausedState) {
                    frozenFrameCount = p.frameCount;
                }
            } else {
                window.pausedRenderingMode = false;
                // Update frozen frame count to current when unpaused
                frozenFrameCount = p.frameCount;
            }
            lastAnimationPausedState = window.isAnimationPaused;
            
            // Confirm initial setup (first frame only)
            if (p.frameCount === 1) {
                console.log(`Visualization initialized - Canvas: ${p.width}x${p.height}, Blobs: ${blobs.length}`);
            }
            
            // Performance optimization: Skip rendering on some frames based on mode
            let skipFrames = 1; // Default: render every frame
            if (isSimpleMode) {
                skipFrames = window.isAnimationPaused ? 4 : 3; // Moderate skipping for simple mode
            } else if (isGridThumbnailMode) {
                skipFrames = 3; // Skip more frames in thumbnail mode  
            } else if (isPreviewFast) {
                skipFrames = window.isAnimationPaused ? 4 : previewFrameSkip; // Moderate skipping when static
            } else if (previewOptimized) {
                // Additional iframe-specific optimization
                const isInViewport = window.parent && window.parent.document.visibilityState === 'visible';
                const baseSkip = window.isAnimationPaused ? 3 : 2;
                skipFrames = isInViewport ? baseSkip : baseSkip * 2; // Skip more when not in viewport
            }
            
            if (p.frameCount % skipFrames !== 0) {
                return; // Skip this frame for performance
            }
            
            if (!isReadyToDrawVisualization) {
                // Show a simple loading indicator (unless in instant/no-loading mode)
                if (!previewNoLoading && !isPreviewInstant) {
                    p.background(MASTER_BACKGROUND_RGB); // Always use master background color
                    
                    // For preview mode when paused OR static mode: force ready state quickly
                    if ((isPreviewMode && window.isAnimationPaused && p.frameCount > 5) || (isStatic && p.frameCount > 2)) {
                        isReadyToDrawVisualization = true;
                        console.log(`[${sketchInstanceId}] 🎨 Preview paused/Static mode: Forcing ready state`);
                        
                        // Initialize blobs if not already done
                        if (blobs.length === 0) {
                            for (let i = 0; i < 2; i++) {
                                blobs.push(new Blob(i));
                            }
                        }
                        
                        // Force visibility with default properties
                        blobs.forEach((blob, i) => {
                            blob.target.blobVisibility = 1.0;
                            blob.isVisible = true;
                            blob.blobVisibility = 1.0;
                            blob.target.blobSizeScale = 5;
                            blob.target.blobStrength = 1000;
                            
                            // Ensure default colors for immediate visibility
                            if (!blob.displayColors || blob.displayColors.length === 0) {
                                const defaultColors = [
                                    [230, 50, 50], // Red for speaker 0
                                    [50, 130, 200] // Blue for speaker 1
                                ];
                                blob.displayColors = [defaultColors[i % defaultColors.length]];
                            }
                        });
                    } else {
                        p.fill(100);
                        p.textAlign(p.CENTER, p.CENTER);
                        p.textFont('Miriam Libre, sans-serif');
                        p.textSize(20);
                        p.text('טוען שיחה', p.width/2, p.height/2);
                        return;
                    }
                } else {
                    // In instant mode or static mode, show preview immediately without waiting
                    p.background(MASTER_BACKGROUND_RGB); // Always use master background color
                    
                    if (isStatic || isSimpleMode) {
                        // Static/Simple mode: show blobs immediately
                        p.fill(230, 50, 50, 150);
                        p.noStroke();
                        p.ellipse(p.width * 0.3, p.height * 0.5, 60, 60);
                        
                        p.fill(50, 130, 200, 150);
                        p.ellipse(p.width * 0.7, p.height * 0.5, 55, 55);
                        
                        // Force ready state immediately for static/simple mode
                        if (p.frameCount > 1) {
                            isReadyToDrawVisualization = true;
                            // Force immediate blob visibility
                            if (blobs && blobs.length > 0) {
                                blobs.forEach((blob, i) => {
                                    blob.target.blobVisibility = 1.0;
                                    blob.isVisible = true;
                                    blob.blobVisibility = 1.0;
                                });
                            }
                        }
                    } else {
                        // Animated placeholder blobs for instant mode
                        const time = p.millis() * 0.002;
                        const pulse1 = 0.8 + 0.2 * Math.sin(time * 2);
                        const pulse2 = 0.7 + 0.3 * Math.sin(time * 2.5 + 1);
                        
                        p.fill(230, 34, 34, 120 * pulse1);
                        p.noStroke();
                        p.ellipse(p.width * 0.3, p.height * 0.5, 35 * pulse1, 35 * pulse1);
                        
                        p.fill(70, 130, 180, 120 * pulse2);
                        p.ellipse(p.width * 0.7, p.height * 0.5, 30 * pulse2, 30 * pulse2);
                        
                        // Force ready state and start loading in background
                        if (p.frameCount > 10) { // Give a few frames for smooth animation
                            isReadyToDrawVisualization = true;
                            // Force immediate blob visibility
                            if (blobs && blobs.length > 0) {
                                blobs.forEach(blob => {
                                    blob.target.blobVisibility = 1.0;
                                    blob.isVisible = true;
                                });
                            }
                        }
                    }
                    return;
                }
            }

            p.background(MASTER_BACKGROUND_RGB); // Always use master background color
            
            // Make sure we have blobs
            if (!blobs || blobs.length === 0) {
                p.fill(100);
                p.textAlign(p.CENTER, p.CENTER);
                p.textFont('Miriam Libre, sans-serif');
                p.textSize(16);
                p.text('מכין ויזואליזציה...', p.width/2, p.height/2);
                return;
            }
            
            // Only update blobs when animation is not paused
            if (!window.isAnimationPaused) {
                for (const blob of blobs) {
                    blob.update();
                }
            }
            
            // Debug: Log blob info less frequently in simple mode for performance
            const debugFrequency = isSimpleMode ? 600 : 300; // Every 10 seconds in simple mode, 5 seconds normally
            if (p.frameCount % debugFrequency === 0) {
                console.log(`🔍 [${sketchInstanceId}] Frame ${p.frameCount}: Rendering ${blobs.length} blobs (simple: ${isSimpleMode}, circles: ${useCircles})`);
                if (!isSimpleMode) { // Skip detailed logging in simple mode
                    blobs.forEach((blob, i) => {
                        console.log(`   Blob ${i}: pos(${blob.pos.x.toFixed(0)}, ${blob.pos.y.toFixed(0)}), visible: ${blob.isVisible}, emotions: ${JSON.stringify(blob.currentEmotions)}`);
                    });
                }
            }

            if (analyzers?.masterAnalyzer) {
                let masterVol = analyzers.masterAnalyzer.getLevel();
                
                for (let i = 0; i < blobs.length; i++) {
                    let vol = analyzers[i] ? analyzers[i].getLevel() : 0;
                    if (isCurrentlyPlaying && vol > 0.001) {
                        blobs[i].setAudioLevel(vol);
                    } else {
                        blobs[i].setAudioLevel(masterVol * 0.3);
                    }
                }
            } else {
                // If no analyzers, give blobs some default audio level for visibility
                const defaultLevel = (isStatic || isSimpleMode) ? 0.3 : 0.1; // Higher level for static or simple mode
                for (let i = 0; i < blobs.length; i++) {
                    blobs[i].setAudioLevel(defaultLevel);
                }
            }

            // Try rendering - use circles for simple mode, ASCII for normal mode
            try {
                if (useCircles && isSimpleMode) {
                    // Simple circle rendering - much faster performance
                    p.background(MASTER_BACKGROUND_RGB); // Always use master background color
                    for (const blob of blobs) {
                        if (blob.isVisible) {
                            // Calculate blob size
                            const baseSize = Math.max(80, blob.target.blobSizeScale * 15);
                            const audioBoost = blob.smoothedAudioLevel * 120;
                            const size = baseSize + audioBoost;
                            
                            // Use blob's actual colors or defaults
                            const color = blob.displayColors[0] || [230, 50, 50];
                            
                            // Draw smooth circle with nice colors
                            p.fill(color[0], color[1], color[2], 180);
                            p.noStroke();
                            p.ellipse(blob.pos.x, blob.pos.y, size, size);
                            
                            // Add a subtle inner glow
                            p.fill(color[0], color[1], color[2], 100);
                            p.ellipse(blob.pos.x, blob.pos.y, size * 0.7, size * 0.7);
                            
                            // Optional: very subtle outer ring
                            p.noFill();
                            p.stroke(color[0], color[1], color[2], 60);
                            p.strokeWeight(2);
                            p.ellipse(blob.pos.x, blob.pos.y, size * 1.2, size * 1.2);
                        }
                    }
                } else {
                    // CRITICAL: Clear ASCII buffer before each frame to prevent accumulation
                    asciiBuffer.clear();
                    asciiBuffer.background(canvasBackgroundColor[0], canvasBackgroundColor[1], canvasBackgroundColor[2]);
                    
                    // Use standard ASCII rendering for normal mode
                    drawMetaballAscii(asciiBuffer);
                    p.image(asciiBuffer, 0, 0);
                }
            } catch (renderError) {
                console.warn('Rendering failed, using fallback circles:', renderError);
                // Enhanced fallback: draw clearly visible circles for blobs
                for (const blob of blobs) {
                    if (blob.isVisible) {
                        // Ensure blob has a visible size even without audio
                        const baseSize = Math.max(50, blob.blobSizeScale * 30);
                        const audioBoost = blob.smoothedAudioLevel * 100;
                        const size = baseSize + audioBoost;
                        
                        // Use bright, contrasting colors for visibility
                        const color = blob.displayColors[0] || [230, 50, 50]; // Default to bright red
                        p.fill(color[0], color[1], color[2], 200); // Semi-transparent
                        p.stroke(255); // White outline for visibility
                        p.strokeWeight(2);
                        
                        // Draw main blob circle
                        p.ellipse(blob.pos.x, blob.pos.y, size, size);
                        
                        // Draw smaller inner circle for better visibility
                        p.fill(color[0], color[1], color[2], 255); // Full opacity
                        p.noStroke();
                        p.ellipse(blob.pos.x, blob.pos.y, size * 0.6, size * 0.6);
                        
                        // Debug: show blob ID
                        p.fill(255);
                        p.textAlign(p.CENTER, p.CENTER);
                        p.textFont('Miriam Libre, sans-serif');
                        p.textSize(16);
                        p.text(`Blob ${blob.id}`, blob.pos.x, blob.pos.y - size/2 - 20);
                    }
                }
            }
            
            // Additional safety: Always draw some visible indication of blobs
            if (p.frameCount % 60 === 0) { // Every second
                let visibleBlobCount = 0;
                for (const blob of blobs) {
                    if (blob.isVisible && blob.pos.x > 0 && blob.pos.y > 0) {
                        visibleBlobCount++;
                    }
                }
                if (visibleBlobCount === 0) {
                    console.warn(`🚨 [${sketchInstanceId}] No visible blobs detected! Forcing visibility...`);
                    // Force at least one blob to be visible for debugging
                    if (blobs.length > 0) {
                        blobs[0].isVisible = true;
                        if (blobs[0].pos.x <= 0 || blobs[0].pos.y <= 0) {
                            blobs[0].pos.x = p.width / 2;
                            blobs[0].pos.y = p.height / 2;
                        }
                    }
                }
            }
            


            if (connectBlobs) drawBlobConnections();
            
            // VISUAL DEBUG: Show home regions (press 'h' to toggle)
            if (window.showHomeRegions) {
                drawHomeRegions();
            }
            
            // Debug: Show blob status (reduced frequency)
            if (p.frameCount % 300 === 0) { // Only log every 300 frames to reduce console spam
                console.log(`Visualization: ${blobs.length} blobs, canvas: ${p.width}x${p.height}, grid: ${gridsize}`);
                blobs.forEach((blob, i) => {
                    console.log(`Blob ${i}: pos(${blob.pos.x.toFixed(1)}, ${blob.pos.y.toFixed(1)}), home: ${blob.homeRegion}, spacing: ${blob.minBlobSpacing}, emotions: ${JSON.stringify(blob.currentEmotions)}`);
                });
            }
            

        };

        // Handle window resize to maintain proper canvas sizing and blob positioning
        p.windowResized = () => {
            let canvasContainer = p.select('#visualization-canvas-container');
            let containerW = p.windowWidth, containerH = p.windowHeight;

            if (canvasContainer) {
                const containerElement = canvasContainer.elt;
                const rect = containerElement.getBoundingClientRect();
                containerW = rect.width > 0 ? rect.width : p.windowWidth;
                containerH = rect.height > 0 ? rect.height : p.windowHeight;
            }

            // Ensure minimum size
            containerW = Math.max(containerW, 800);
            containerH = Math.max(containerH, 600);

            p.resizeCanvas(containerW, containerH);
            
            // Recreate the ASCII buffer with new dimensions
            if (asciiBuffer) {
                asciiBuffer = p.createGraphics(p.width, p.height);
                asciiBuffer.textFont('Miriam Libre, sans-serif');
            }

            // Clear region center cache to recalculate blob positions for new canvas size
            regionCenterCache = {};
            lastCanvasSize = { w: 0, h: 0 };

            // Update blob home positions for new canvas size
            if (blobs && blobs.length > 0) {
                blobs.forEach(blob => {
                    // Force recalculation of home center
                    blob.cachedHomeCenter = null;
                    blob.cachedHomeRadius = 0;
                    
                    // Optionally teleport blobs to their new home positions immediately
                    // blob.teleportToHome();
                });
            }
        };

        let initializeSketch = function() {
            // Ensure we have a valid conversation folder
            p.ensureConversationFolder();
            
            if (!emotionData) {
                console.error(`[${sketchInstanceId}] initializeSketch called before data was loaded.`);
                return;
            }
            
            console.log(`[${sketchInstanceId}] Initializing sketch with loaded data...`);
            
            // Workaround for p5.sound AudioWorkletNode error
            if (window.p5 && window.p5.prototype && window.p5.prototype.registerMethod) {
                // Override the p5.SoundFile to use ScriptProcessorNode instead of AudioWorkletNode
                p5.prototype.userStartAudio = function() {
                    // This prevents the AudioWorkletNode error
                    return Promise.resolve();
                };
            }
            
            // Reset arrays
            convo = [];
            blobs = [];
            soundFiles = [];
            emotionCodeMapping = emotionData.emotion_codes || {};
            emotionGlobalColorMap = {};
            
            const allEmotions = new Set();
            let mp3Keys = Object.keys(emotionData).filter(k => k.endsWith('.mp3'));

            // If in segment mode, only load the specific segment
            if (isSegmentMode && segmentParam) {
                console.log(`[${sketchInstanceId}] 🎯 Segment mode: Loading only ${segmentParam}`);
                mp3Keys = mp3Keys.filter(k => k === segmentParam);
                if (mp3Keys.length === 0) {
                    console.warn(`[${sketchInstanceId}] ❌ Segment ${segmentParam} not found in emotion data`);
                    // Create dummy data for the requested segment
                    emotionData[segmentParam] = { 
                        speaker: 0, 
                        emotions: ['neutral'], 
                        transcript: `Segment ${segmentParam} - No data available` 
                    };
                    mp3Keys = [segmentParam];
                }
            } else {
                // Sort keys numerically for full conversation mode
                mp3Keys.sort((a, b) => {
                    const numA = parseInt(a.match(/\d+/)[0], 10);
                    const numB = parseInt(b.match(/\d+/)[0], 10);
                    return numA - numB;
                });
            }

            mp3Keys.forEach(key => {
                const entry = emotionData[key];
                if (entry && entry.emotions) {
                    entry.emotions.forEach(e => allEmotions.add(e));
                }
                convo.push({
                    file: key,
                    speaker: entry.speaker === undefined ? 0 : entry.speaker
                });
            });

            // Update numBlobs to match conversation length
            numBlobs = 2; // Always 2 blobs - one for each speaker
            console.log(`[${sketchInstanceId}] Setting numBlobs to ${numBlobs} (one per speaker)`);

            const uniqueEmotions = Array.from(allEmotions);
            const generatedColors = generateDistinctColors(uniqueEmotions.length);
            uniqueEmotions.forEach((emotion, i) => {
                emotionGlobalColorMap[emotion] = generatedColors[i];
            });
            // Sync with exposed property
            if (p.emotionGlobalColorMap !== undefined) p.emotionGlobalColorMap = emotionGlobalColorMap;

            // --- Progressive Sound Loading - Start Fast! ---
            const INITIAL_LOAD_COUNT = isSegmentMode ? 1 : 3; // Load only first 3 files initially (or 1 for segment mode)
            let soundsToLoad = Math.min(INITIAL_LOAD_COUNT, convo.length);
            let soundsLoaded = 0;
            let totalFilesLoaded = 0;
            
            if (convo.length === 0) {
                // Check if this is a deleted conversation
                if (emotionData.metadata && emotionData.metadata.note && emotionData.metadata.note.includes('deleted')) {
                    console.log(`[${sketchInstanceId}] ℹ️ This conversation was deleted. Showing placeholder.`);
                    // Create a simple message for deleted conversations
                    isReadyToDrawVisualization = true;
                    
                    // Add a message to the canvas
                    if (typeof p !== 'undefined' && p.createGraphics) {
                        setTimeout(() => {
                            p.background(247, 249, 243);
                            p.fill(100);
                            p.textAlign(p.CENTER, p.CENTER);
                            p.textFont('Miriam Libre, sans-serif');
                            p.textSize(24);
                            p.text('שיחה זו נמחקה', p.width/2, p.height/2);
                            p.textSize(16);
                            p.text('Conversation Deleted', p.width/2, p.height/2 + 40);
                        }, 100);
                    }
                    return;
                }
                
                console.warn(`[${sketchInstanceId}] No MP3 files found in emotion data. Check if emotion data contains MP3 keys.`);
                isReadyToDrawVisualization = true;
                return;
            }

            const onInitialSoundsLoaded = () => {
                console.log(`[${sketchInstanceId}] ✅ Initial ${soundsLoaded} sounds loaded! Starting visualization...`);
                isReadyToDrawVisualization = true;
                
                // Special handling for segment mode
                if (isSegmentMode && segmentParam) {
                    console.log(`[${sketchInstanceId}] 🎨 Setting up segment mode visualization for ${segmentParam}`);
                    
                    // Ensure emotion colors are available before applying segment parameters
                    if (Object.keys(emotionGlobalColorMap).length === 0) {
                        console.log(`[${sketchInstanceId}] 🎨 Generating emotion color map for segment mode...`);
                        const allEmotions = new Set();
                        Object.values(emotionData).forEach(entry => {
                            if (entry.emotions) {
                                entry.emotions.forEach(emotion => allEmotions.add(emotion));
                            }
                        });
                        const uniqueEmotions = Array.from(allEmotions);
                        const generatedColors = generateDistinctColors(uniqueEmotions.length);
                        uniqueEmotions.forEach((emotion, i) => {
                            emotionGlobalColorMap[emotion] = generatedColors[i];
                        });
                        console.log(`[${sketchInstanceId}] 🎨 Generated colors for emotions:`, Object.keys(emotionGlobalColorMap));
                    }
                    
                    // Find the segment and apply its parameters immediately
                    const segmentIndex = convo.findIndex(item => item.file === segmentParam);
                    if (segmentIndex >= 0) {
                        currentIndex = segmentIndex;
                        p.currentIndex = currentIndex; // Sync exposed property
                        const segmentData = emotionData[segmentParam];
                        if (segmentData) {
                            console.log(`[${sketchInstanceId}] 🎭 Segment ${segmentParam} has emotions:`, segmentData.emotions);
                            applySegmentParameters(segmentParam, segmentData);
                            console.log(`[${sketchInstanceId}] ✅ Applied initial segment parameters for ${segmentParam}`);
                        }
                    }
                    // Don't autoplay in segment mode - it's for static visualization
                    return;
                }
                
                // Start background loading of remaining files
                if (convo.length > INITIAL_LOAD_COUNT) {
                    console.log(`[${sketchInstanceId}] 🔄 Starting background loading of remaining ${convo.length - INITIAL_LOAD_COUNT} files...`);
                    loadRemainingFilesInBackground();
                }
                
                if (shouldAutoPlay) {
                    tryAutoStart();
                } else {
                    if (window.parent) {
                        window.parent.postMessage({ type: 'show-audio-prompt', iframeId: sketchInstanceId }, '*');
                    }
                }
            };

            const soundAssetLoaded = (soundPath, isInitial = true) => {
                console.log(`[${sketchInstanceId}] Asset loaded: ${soundPath}`);
                totalFilesLoaded++;
                
                if (isInitial) {
                    soundsLoaded++;
                    if (soundsLoaded === soundsToLoad) {
                        onInitialSoundsLoaded();
                    }
                } else {
                    // Background loading progress
                    const remaining = convo.length - INITIAL_LOAD_COUNT;
                    const loaded = totalFilesLoaded - INITIAL_LOAD_COUNT;
                    if (loaded % 10 === 0 || loaded === remaining) { // Log every 10 files or when complete
                        console.log(`[${sketchInstanceId}] 🔄 Background loading progress: ${loaded}/${remaining} files loaded`);
                    }
                }
            };
            
            const loadRemainingFilesInBackground = () => {
                // Ensure we have a valid folder
                p.ensureConversationFolder();
                
                // Load remaining files with a small delay between each to avoid overwhelming the browser
                for (let i = INITIAL_LOAD_COUNT; i < convo.length; i++) {
                    setTimeout(() => {
                        const soundPath = `conversations/${currentConvoFolderFromData}/${convo[i].file}`;
                        console.log(`[${sketchInstanceId}] 🔄 Background loading ${i+1}/${convo.length}: ${convo[i].file}`);
                        soundFiles[i] = p.loadSound(soundPath, 
                            () => soundAssetLoaded(soundPath, false),
                            (err) => { 
                                console.error(`[${sketchInstanceId}] Failed to load sound: ${soundPath}`, err);
                                soundAssetLoaded(soundPath, false); // Still count it
                            }
                        );
                    }, (i - INITIAL_LOAD_COUNT) * 50); // 50ms delay between each file
                }
            };
            
            // Check if p5.sound is available or if we should skip MP3 loading for fast preview
            if (window.p5SoundUnavailable || !p.loadSound || previewNoMP3 || previewVisualOnly || window.globalAudioWorkletFailure || globalAudioFailure) {
                if (previewNoMP3 || previewVisualOnly) {
                    console.log(`[${sketchInstanceId}] 🚀 Fast preview mode: Skipping MP3 loading for faster performance`);
                } else if (window.globalAudioWorkletFailure || globalAudioFailure) {
                    console.log(`[${sketchInstanceId}] ⚠️ Previous audio failure detected: Skipping MP3 loading to prevent errors`);
                } else {
                    console.warn(`[${sketchInstanceId}] p5.sound not available, skipping audio loading`);
                }
                soundFiles = new Array(convo.length).fill(null);
                isReadyToDrawVisualization = true;
                
                // For fast preview mode or static mode, immediately apply visual parameters from first emotion data
                if ((previewNoMP3 || previewVisualOnly || isStatic) && convo.length > 0) {
                    const firstEntry = emotionData[convo[0].file];
                    if (firstEntry) {
                        console.log(`[${sketchInstanceId}] 🎨 Fast preview/Static mode: Applying initial emotions from ${convo[0].file}`);
                        setTimeout(() => {
                            applySegmentParameters(convo[0].file, firstEntry);
                            
                            // Force blob visibility for immediate display
                            if (blobs && blobs.length > 0) {
                                blobs.forEach(blob => {
                                    blob.target.blobVisibility = 1.0;
                                    blob.isVisible = true;
                                    blob.blobVisibility = 1.0;
                                });
                            }
                        }, 100); // Small delay to ensure blobs are initialized
                    }
                }
            } else {
                // Initialize sound files array with nulls
                soundFiles = new Array(convo.length).fill(null);
                
                // Ensure we have a valid folder before loading sounds
                p.ensureConversationFolder();
                
                // Load only initial files immediately
                for (let i = 0; i < Math.min(INITIAL_LOAD_COUNT, convo.length); i++) {
                    const soundPath = `conversations/${currentConvoFolderFromData}/${convo[i].file}`;
                    console.log(`[${sketchInstanceId}] 🚀 Priority loading ${i+1}/${INITIAL_LOAD_COUNT}: ${convo[i].file}`);
                    soundFiles[i] = p.loadSound(soundPath, 
                        () => soundAssetLoaded(soundPath, true),
                        (err) => { 
                            console.error(`[${sketchInstanceId}] Failed to load sound: ${soundPath}`, err);
                            soundAssetLoaded(soundPath, true); // Still count it to not block the app
                        }
                    );
                }
            }
            
            if (blobs.length === 0) {
                for (let i = 0; i < 2; i++) { // Always create exactly 2 blobs
                    blobs.push(new Blob(i));
                }
                console.log(`[${sketchInstanceId}] Initialized ${2} blobs (one per speaker).`);
                
                // For preview mode OR static mode: ensure blobs are visible immediately
                if ((isPreviewMode && window.isAnimationPaused) || isStatic) {
                    blobs.forEach(blob => {
                        blob.target.blobVisibility = 1.0;
                        blob.isVisible = true;
                        blob.blobVisibility = 1.0;
                    });
                    console.log(`[${sketchInstanceId}] 🎨 Static/Preview mode: Made blobs visible on creation`);
                }
            }
            
            if (analyzers.length === 0 && !window.p5SoundUnavailable && !previewNoMP3 && !previewVisualOnly && p5.Amplitude) {
                for (let i = 0; i < 2; i++) { // Always create exactly 2 analyzers
                    analyzers.push(new p5.Amplitude());
                }
                analyzers.masterAnalyzer = new p5.Amplitude();
                console.log(`[${sketchInstanceId}] Initialized analyzers.`);
            } else if (previewNoMP3 || previewVisualOnly) {
                console.log(`[${sketchInstanceId}] Fast preview mode: Skipping audio analyzers for performance`);
            }
            
            recreateHighlightGrids();
        };

        // Add methods to check and reload emotion data
        p.hasEmotionData = () => {
            // Check if we have emotion data loaded
            if (!emotionData || Object.keys(emotionData).length === 0) {
                return false;
            }
            
            // Check if we have actual MP3 entries
            const mp3Keys = Object.keys(emotionData).filter(k => k.endsWith('.mp3'));
            if (mp3Keys.length === 0) {
                return false;
            }
            
            // Check if 001.mp3 exists specifically
            if (emotionData['001.mp3'] && emotionData['001.mp3'].emotions) {
                console.log(`✅ [${sketchInstanceId}] Emotion data verified: 001.mp3 has emotions: ${JSON.stringify(emotionData['001.mp3'].emotions)}`);
                return true;
            }
            
            return false;
        };
        
        p.reloadConversationData = () => {
            console.log(`🔄 [${sketchInstanceId}] Forcing reload of conversation data`);
            
            // Clear existing data
            emotionData = null;
            isReadyToDrawVisualization = false;
            
            // Force reload with fresh cache-busting
            if (window.conversationDataPath) {
                const timestamp = Date.now();
                const randomId = Math.random().toString(36).substr(2, 9);
                const freshPath = window.conversationDataPath + '?cb=' + timestamp + '&r=' + randomId + '&force=true';
                
                console.log(`🔄 [${sketchInstanceId}] Reloading from: ${freshPath}`);
                
                p.loadJSON(freshPath, (data) => {
                    console.log(`✅ [${sketchInstanceId}] Emotion data reloaded successfully`);
                    emotionData = data;
                    
                    // Extract folder from path
                    p.ensureConversationFolder();
                    
                    // Reinitialize the sketch with new data
                    initializeSketch();
                    isReadyToDrawVisualization = true;
                }, (err) => {
                    console.error(`❌ [${sketchInstanceId}] Failed to reload emotion data:`, err);
                });
            }
        };

        // Add performance optimization method for layout changes
        p.optimizeForLayout = (layout, options = {}) => {
            console.log(`⚡ [${sketchInstanceId}] Optimizing performance for layout: ${layout}`, options);
            
            switch (layout) {
                case 'emotions':
                    // High emotion activity with spinning - aggressive optimization
                    if (options.spinning || options.reduceQuality) {
                        gridsize = 15; // Much smaller grid for spinning
                        previewFrameSkip = 5; // Skip more frames
                        console.log(`🌀 Emotions SPINNING optimization: grid=${gridsize}, skip=${previewFrameSkip}`);
                    } else {
                        gridsize = previewOptimized ? 35 : 50; // Keep original grid size for previews
                        previewFrameSkip = isPreviewMode ? 4 : 3; // Keep frame skipping optimization
                        console.log(`🎭 Emotions view optimization: grid=${gridsize}, skip=${previewFrameSkip}, preview=${isPreviewMode}`);
                    }
                    break;
                case 'timeline':
                    // Timeline view - normal performance
                    gridsize = previewReducedGrid;
                    previewFrameSkip = isPreviewFast ? 2 : 1;
                    console.log(`⏱️ Timeline view optimization: grid=${gridsize}, skip=${previewFrameSkip}`);
                    break;
                case 'people':
                    // People view - balanced performance
                    gridsize = previewOptimized ? 30 : 40;
                    previewFrameSkip = 2;
                    console.log(`👥 People view optimization: grid=${gridsize}, skip=${previewFrameSkip}`);
                    break;
                default:
                    // Default optimization
                    gridsize = previewReducedGrid;
                    previewFrameSkip = isPreviewFast ? 2 : 1;
                    console.log(`🔧 Default optimization: grid=${gridsize}, skip=${previewFrameSkip}`);
            }
            
            // Recreate grids with new size
            grid = [];
            for (let i = 0; i < gridsize; i++) {
                grid[i] = [];
                for (let j = 0; j < gridsize; j++) {
                    grid[i][j] = 0;
                }
            }
            
            // Recreate ASCII buffer if needed
            if (asciiBuffer) {
                asciiBuffer = p.createGraphics(p.width, p.height);
                asciiBuffer.textFont('Miriam Libre, sans-serif');
            }
        };

        // Expose methods to window for external access
        if (!window.p5Instance) {
            window.p5Instance = {};
        }
        window.p5Instance.hasEmotionData = p.hasEmotionData;
        window.p5Instance.reloadConversationData = p.reloadConversationData;
        window.p5Instance.optimizeForLayout = p.optimizeForLayout;
        
        // Expose key variables and functions on the p5 instance for external access
        p.emotionGlobalColorMap = emotionGlobalColorMap;
        p.blobs = blobs;
        p.currentMeta = currentMeta;
        p.updateBlobVisualsForSegment = updateBlobVisualsForSegment;
        p.refreshAllBlobColors = refreshAllBlobColors;
        p.getEmotionColorMapKeys = getEmotionColorMapKeys;
        p.getEmotionColor = getEmotionColor;
        p.resetAudioFailureState = resetAudioFailureState;
        
        // Function to reset audio failure state (for debugging/testing)
        function resetAudioFailureState() {
            console.log(`[${sketchInstanceId}] Resetting audio failure state`);
            globalAudioFailure = false;
            visualOnlyMode = false;
            audioInitializationAttempted = false;
            window.globalAudioWorkletFailure = false;
            
            // Remove visual-only notification if it exists
            const notification = document.getElementById('visual-only-notification');
            if (notification) {
                notification.remove();
            }
            
            console.log(`[${sketchInstanceId}] Audio failure state reset - you can try reloading to test audio again`);
        }
        
        // Also expose for debugging
        window.refreshAllBlobColors = refreshAllBlobColors;
        window.getEmotionColorMapKeys = getEmotionColorMapKeys;
        window.getEmotionColor = getEmotionColor;
        window.resetAudioFailureState = resetAudioFailureState;

        // Add a function to ensure conversation folder is always set correctly
        p.ensureConversationFolder = function() {
            // If we already have a valid folder, return it
            if (currentConvoFolderFromData && currentConvoFolderFromData !== 'null') {
                return currentConvoFolderFromData;
            }
            
            console.log(`[${sketchInstanceId}] 🔍 Attempting to determine conversation folder...`);
            
            // First try: URL parameters (most reliable)
            const urlParams = new URLSearchParams(window.location.search);
            const folderParam = urlParams.get('folder');
            if (folderParam && folderParam !== 'null') {
                currentConvoFolderFromData = folderParam;
                console.log(`[${sketchInstanceId}] ✅ Set folder from URL parameter: ${currentConvoFolderFromData}`);
                return currentConvoFolderFromData;
            }
            
            // Second try: Extract from conversationDataPath
            if (conversationDataPath) {
                const pathParts = conversationDataPath.split('/');
                if (pathParts.length >= 2) {
                    currentConvoFolderFromData = pathParts[pathParts.length - 2];
                    console.log(`[${sketchInstanceId}] ✅ Set folder from conversationDataPath: ${currentConvoFolderFromData}`);
                    return currentConvoFolderFromData;
                }
            }
            
            // Third try: Extract from window.conversationDataPath
            if (window.conversationDataPath) {
                const pathParts = window.conversationDataPath.split('/');
                if (pathParts.length >= 2) {
                    currentConvoFolderFromData = pathParts[pathParts.length - 2];
                    console.log(`[${sketchInstanceId}] ✅ Set folder from window.conversationDataPath: ${currentConvoFolderFromData}`);
                    return currentConvoFolderFromData;
                }
            }
            
            // Last resort: default to convo1
            currentConvoFolderFromData = 'convo1';
            console.log(`[${sketchInstanceId}] ⚠️ Using default folder: ${currentConvoFolderFromData}`);
            return currentConvoFolderFromData;
            
            // Load speaker info for this conversation
            p.loadSpeakerInfoForConversation(currentConvoFolderFromData);
            
            return currentConvoFolderFromData;
        };
        
        // Function to load speaker info for a conversation
        p.loadSpeakerInfoForConversation = async function(conversationId) {
            if (!conversationId) return;
            
            try {
                console.log(`🎭 [${sketchInstanceId}] Loading speaker info for: ${conversationId}`);
                const response = await fetch(`/api/get-speaker-info/${conversationId}`);
                if (response.ok) {
                    const data = await response.json();
                    window.speakerInfo = data.speakers;
                    console.log(`🎭 [${sketchInstanceId}] Speaker info loaded:`, window.speakerInfo);
                    
                    // Notify side panel to refresh speaker names
                    if (window.refreshSidePanelSpeakerNames) {
                        window.refreshSidePanelSpeakerNames();
                    }
                } else {
                    console.warn(`⚠️ [${sketchInstanceId}] Failed to load speaker info for ${conversationId}`);
                    window.speakerInfo = {};
                }
            } catch (error) {
                console.warn(`⚠️ [${sketchInstanceId}] Error loading speaker info:`, error);
                window.speakerInfo = {};
            }
        };
    };

    if (typeof window !== 'undefined') {
        window.p5SketchFunction = p5SketchFunction;
        
        // Global function to set conversation data path
        window.setConversationDataPath = function(path) {
            window.conversationDataPath = path;
            console.log('Global conversationDataPath set to:', path);
            
            // If p5 instance already exists and is waiting for data, load it now
            if (window.p5SketchInstance && window.p5SketchInstance.loadData) {
                window.p5SketchInstance.loadData();
            }
        };
        
        // Listen for emotion color updates from admin panel
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'emotionColorsResponse') {
                console.log(`[${sketchInstanceId}] 📥 Received emotion colors from admin panel:`, event.data);
                
                if (event.data.emotions) {
                    // Store the config globally for translation lookup
                    window.emotionsConfig = event.data.emotions;
                    console.log(`[${sketchInstanceId}] 📋 Stored full emotions config for translation`);
                }
                
                if (event.data.emotionColorMap) {
                    // Update local color map
                    emotionGlobalColorMap = event.data.emotionColorMap;
                    window.emotionGlobalColorMap = event.data.emotionColorMap;
                    
                    console.log(`[${sketchInstanceId}] 🎨 Updated emotion colors from admin panel:`, Object.keys(emotionGlobalColorMap).length, 'emotions');
                    
                    // Force update any existing blobs
                    if (blobs && blobs.length > 0) {
                        console.log(`[${sketchInstanceId}] 🔄 Updating ${blobs.length} existing blobs with new colors...`);
                        blobs.forEach((blob, index) => {
                            if (blob.setEmotions && blob.currentEmotions) {
                                blob.setEmotions(blob.currentEmotions);
                                console.log(`[${sketchInstanceId}] 🎨 Updated blob ${index} with emotions: ${blob.currentEmotions.join(', ')}`);
                            }
                        });
                        
                        // Force redraw
                        if (typeof p !== 'undefined' && p.redraw) {
                            p.redraw();
                        }
                    }
                }
            } else if (event.data && event.data.type === 'updateEmotions') {
                console.log(`[${sketchInstanceId}] 📥 Received emotion update from admin panel:`, event.data);
                
                if (event.data.emotions) {
                    window.emotionsConfig = event.data.emotions;
                }
                
                if (event.data.emotionColorMap) {
                    emotionGlobalColorMap = event.data.emotionColorMap;
                    window.emotionGlobalColorMap = event.data.emotionColorMap;
                    
                    console.log(`[${sketchInstanceId}] 🎨 Updated emotion colors:`, Object.keys(emotionGlobalColorMap).length, 'emotions');
                    
                    // Force update visualization
                    refreshAllBlobColors();
                }
            }
        });
        
        // Request emotion colors from admin panel on load
        function requestEmotionColorsFromAdmin() {
            console.log(`[${sketchInstanceId}] 📡 Requesting emotion colors from admin panel...`);
            
            // Try to request from parent window
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'requestEmotionColors',
                    source: 'sketch',
                    sketchId: sketchInstanceId,
                    timestamp: Date.now()
                }, '*');
            }
            
            // Also try to request from opener (if opened from another window)
            if (window.opener) {
                window.opener.postMessage({
                    type: 'requestEmotionColors',
                    source: 'sketch',
                    sketchId: sketchInstanceId,
                    timestamp: Date.now()
                }, '*');
            }
        }

        // Global function to force emotion color updates on all existing blobs
        window.forceUpdateAllBlobColors = function() {
            console.log('🎨 [Global] Forcing color update on all existing blobs...');
            
            // First try to request from admin panel
            requestEmotionColorsFromAdmin();
            
            // Then fallback to loading from file
            setTimeout(() => {
                // Update all global emotion color maps first
                fetch('/config/emotions_config.json?t=' + Date.now())
                    .then(response => response.json())
                    .then(emotionsConfig => {
                        console.log('🎨 [Global] Loaded fresh emotions config:', Object.keys(emotionsConfig).length, 'emotions');
                        
                        // Store the config globally for translation lookup
                        window.emotionsConfig = emotionsConfig;
                        
                        // Update all the different color map locations
                        if (typeof emotionGlobalColorMap !== 'undefined') {
                            emotionGlobalColorMap = {};
                        }
                        if (!window.emotionGlobalColorMap) window.emotionGlobalColorMap = {};
                    
                    Object.entries(emotionsConfig).forEach(([emotion, config]) => {
                        if (config.active && config.color) {
                            const rgbColor = hexToRgb(config.color);
                            
                            if (typeof emotionGlobalColorMap !== 'undefined') {
                                emotionGlobalColorMap[emotion] = rgbColor;
                            }
                            window.emotionGlobalColorMap[emotion] = rgbColor;
                            
                            // Also update p5 instance if available
                            if (window.p5SketchInstance && window.p5SketchInstance.emotionGlobalColorMap) {
                                window.p5SketchInstance.emotionGlobalColorMap[emotion] = rgbColor;
                            }
                            
                            console.log(`🎨 [Global] Updated ${emotion}: ${config.color} → [${rgbColor.join(', ')}]`);
                        }
                    });
                    
                    // Force update all existing blobs
                    if (window.blobs && window.blobs.length > 0) {
                        console.log(`🔄 [Global] Updating ${window.blobs.length} existing blobs...`);
                        window.blobs.forEach((blob, index) => {
                            if (blob && blob.setEmotions && blob.currentEmotions) {
                                const oldColors = blob.displayColors ? [...blob.displayColors] : [];
                                blob.setEmotions(blob.currentEmotions);
                                console.log(`🎨 [Global] Blob ${index}: ${blob.currentEmotions?.join?.(', ')} - Old colors: ${oldColors.length}, New colors: ${blob.displayColors?.length || 0}`);
                            }
                        });
                    }
                    
                    // Force redraw
                    if (typeof redraw === 'function') redraw();
                    if (typeof loop === 'function') loop();
                    if (window.p5SketchInstance && window.p5SketchInstance.redraw) {
                        window.p5SketchInstance.redraw();
                    }
                    
                    console.log('✅ [Global] All blob colors force updated');
                })
                .catch(error => {
                    console.error('❌ [Global] Error updating blob colors:', error);
                });
            }, 1000); // Close the setTimeout
        };
        
        // Helper function to convert hex to RGB
        function hexToRgb(hex) {
            hex = hex.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return [r, g, b];
        }
        // Function to request current emotion colors from admin panel
        function requestCurrentEmotionColors() {
            console.log(`[${sketchInstanceId}] 🎨 Requesting current emotion colors from admin panel...`);
            
            // Send request to parent window (if in iframe)
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'requestEmotionColors',
                    source: 'visualization',
                    sketchId: sketchInstanceId,
                    timestamp: Date.now()
                }, '*');
                console.log(`[${sketchInstanceId}] 📤 Sent emotion color request to parent window`);
            }
            
            // Send request to opener window (if opened from admin panel)
            if (window.opener && window.opener !== window) {
                window.opener.postMessage({
                    type: 'requestEmotionColors',
                    source: 'visualization',
                    sketchId: sketchInstanceId,
                    timestamp: Date.now()
                }, '*');
                console.log(`[${sketchInstanceId}] 📤 Sent emotion color request to opener window`);
            }
            
            // Also try BroadcastChannel for same-origin communication
            if (typeof BroadcastChannel !== 'undefined') {
                const requestChannel = new BroadcastChannel('emotion-colors-sync');
                requestChannel.postMessage({
                    type: 'requestEmotionColors',
                    source: 'visualization',
                    sketchId: sketchInstanceId,
                    timestamp: Date.now()
                });
                requestChannel.close();
                console.log(`[${sketchInstanceId}] 📻 Broadcast emotion color request via BroadcastChannel`);
            }
        }
        
        // Listen for emotion color updates from admin panel
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'updateEmotions') {
                console.log('🎨 [Frontend] Received emotion color update from admin panel');
                console.log('📦 [Frontend] Full message data:', event.data);
                
                const emotionColorMap = event.data.emotionColorMap;
                const newEmotions = event.data.emotions;
                
                if (emotionColorMap) {
                    console.log('🗺️ [Frontend] Processing emotion color map:', emotionColorMap);
                    
                    // Update all possible color map locations with case-insensitive keys
                    const updateColorMap = (targetMap) => {
                        Object.entries(emotionColorMap).forEach(([emotion, color]) => {
                            // Store with multiple case variations to ensure compatibility
                            const variations = [
                                emotion,
                                emotion.toLowerCase(),
                                emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase(),
                                emotion.charAt(0).toLowerCase() + emotion.slice(1)
                            ];
                            
                            variations.forEach(variant => {
                                targetMap[variant] = color;
                            });
                            
                            console.log(`🎨 [Frontend] Updated color for ${emotion} (${variations.join(', ')}):`, color);
                        });
                    };
                    
                    // Update all available emotion color maps
                    if (typeof emotionGlobalColorMap !== 'undefined') {
                        updateColorMap(emotionGlobalColorMap);
                        console.log('✅ [Frontend] Updated local emotionGlobalColorMap');
                    }
                    
                    if (window.p5SketchInstance && window.p5SketchInstance.emotionGlobalColorMap) {
                        updateColorMap(window.p5SketchInstance.emotionGlobalColorMap);
                        console.log('✅ [Frontend] Updated p5SketchInstance.emotionGlobalColorMap');
                    }
                    
                    if (!window.emotionGlobalColorMap) window.emotionGlobalColorMap = {};
                    updateColorMap(window.emotionGlobalColorMap);
                    console.log('✅ [Frontend] Updated window.emotionGlobalColorMap');
                    
                    // Force update existing blobs with new colors
                    if (window.blobs && window.blobs.length > 0) {
                        console.log('🔄 [Frontend] Updating existing blobs with new colors...');
                        window.blobs.forEach((blob, index) => {
                            if (blob.currentEmotions && blob.currentEmotions.length > 0) {
                                let newColors = [];
                                blob.currentEmotions.forEach(emotion => {
                                    // Try multiple ways to find the color with case-insensitive matching
                                    let color = null;
                                    
                                    // Try exact match first
                                    color = emotionColorMap[emotion];
                                    
                                    // Try case variations
                                    if (!color) {
                                        const variations = [
                                            emotion.toLowerCase(),
                                            emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase(),
                                            emotion.charAt(0).toLowerCase() + emotion.slice(1)
                                        ];
                                        
                                        for (const variant of variations) {
                                            color = emotionColorMap[variant];
                                            if (color) break;
                                        }
                                    }
                                    
                                    if (color) {
                                        newColors.push(color);
                                        console.log(`✅ [Frontend] Found new color for ${emotion}:`, color);
                                    } else {
                                        newColors.push([150, 150, 150]); // fallback gray
                                        console.log(`⚠️ [Frontend] No color found for ${emotion}, using gray`);
                                    }
                                });
                                
                                if (newColors.length > 0) {
                                    blob.displayColors = newColors;
                                    console.log(`✅ [Frontend] Updated blob ${index} colors:`, newColors);
                                }
                            }
                        });
                        
                        // Force a visual refresh with multiple methods
                        console.log('🔄 [Frontend] Attempting to force visual refresh...');
                        
                        // Method 1: p5.js redraw
                        if (window.p5SketchInstance && window.p5SketchInstance.redraw) {
                            window.p5SketchInstance.redraw();
                            console.log('✅ [Frontend] Called p5SketchInstance.redraw()');
                        }
                        
                        // Method 2: Global p5 redraw
                        if (typeof redraw === 'function') {
                            redraw();
                            console.log('✅ [Frontend] Called global redraw()');
                        }
                        
                        // Method 3: Force loop if it's paused
                        if (typeof loop === 'function') {
                            loop();
                            console.log('✅ [Frontend] Called loop() to restart animation');
                        }
                        
                        // Method 4: Direct blob visual update via p5 sketch
                        if (window.p5SketchInstance && window.p5SketchInstance.blobs && window.p5SketchInstance.blobs.length > 0 && window.p5SketchInstance.currentMeta) {
                            const currentSpeaker = Object.keys(window.p5SketchInstance.currentMeta)[0] || 'Speaker 1';
                            window.p5SketchInstance.updateBlobVisualsForSegment(currentSpeaker, window.p5SketchInstance.currentMeta);
                            console.log('✅ [Frontend] Called updateBlobVisualsForSegment()');
                        }
                        
                        // Method 5: Try global updateBlobColors if it exists
                        if (window.updateBlobColors && typeof window.updateBlobColors === 'function') {
                            window.updateBlobColors();
                            console.log('✅ [Frontend] Called updateBlobColors()');
                        }
                        
                        // Method 6: Trigger a conversation reload to refresh colors
                        setTimeout(() => {
                            if (window.loadCurrentConversationData && typeof window.loadCurrentConversationData === 'function') {
                                console.log('🔄 [Frontend] Triggering conversation data reload to refresh colors...');
                                window.loadCurrentConversationData();
                            }
                        }, 100);
                        
                        // Method 7: Force immediate color update on all blobs by re-applying current emotions
                        setTimeout(() => {
                            if (window.blobs && window.blobs.length > 0 && window.p5SketchInstance && window.p5SketchInstance.getCurrentMeta) {
                                console.log('🎨 [Frontend] Force re-applying blob emotions with new colors...');
                                const currentMeta = window.p5SketchInstance.getCurrentMeta();
                                if (currentMeta) {
                                    window.blobs.forEach((blob, index) => {
                                        if (blob.setEmotions && blob.currentEmotions) {
                                            // Re-apply the same emotions to force color update
                                            blob.setEmotions(blob.currentEmotions);
                                            console.log(`✅ [Frontend] Re-applied emotions to blob ${index}:`, blob.currentEmotions);
                                        }
                                    });
                                }
                            }
                        }, 200);
                    }
                    
                } else if (newEmotions) {
                    console.log('🔄 [Frontend] Processing emotions config fallback:', newEmotions);
                    
                    // Fallback: convert hex colors to RGB
                    Object.entries(newEmotions).forEach(([emotion, config]) => {
                        if (config.active && config.color) {
                            const rgbColor = hexToRgb(config.color);
                            console.log(`🎨 [Frontend] Converting ${emotion}: ${config.color} → [${rgbColor.join(', ')}]`);
                            
                            // Store with case variations
                            const variations = [
                                emotion,
                                emotion.toLowerCase(),
                                emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase()
                            ];
                            
                            // Update all available color maps
                            variations.forEach(variant => {
                                if (typeof emotionGlobalColorMap !== 'undefined') {
                                    emotionGlobalColorMap[variant] = rgbColor;
                                }
                                if (window.p5SketchInstance && window.p5SketchInstance.emotionGlobalColorMap) {
                                    window.p5SketchInstance.emotionGlobalColorMap[variant] = rgbColor;
                                }
                                if (!window.emotionGlobalColorMap) window.emotionGlobalColorMap = {};
                                window.emotionGlobalColorMap[variant] = rgbColor;
                            });
                        }
                    });
                    console.log('✅ [Frontend] Updated emotion mapping (fallback mode)');
                }
                
                console.log('✅ [Frontend] Emotion color update processing complete');
            } else if (event.data && event.data.type === 'forceVisualRefresh') {
                console.log('🚀 [Frontend] Received force visual refresh request');
                
                // Force immediate redraw
                if (typeof redraw === 'function') {
                    redraw();
                    console.log('✅ [Frontend] Forced global redraw');
                }
                
                if (typeof loop === 'function') {
                    loop();
                    console.log('✅ [Frontend] Restarted animation loop');
                }
                
                // Force blob color refresh if blobs exist
                if (window.blobs && window.blobs.length > 0) {
                    window.blobs.forEach((blob, index) => {
                        if (blob.setEmotions && blob.currentEmotions) {
                            blob.setEmotions(blob.currentEmotions);
                            console.log(`✅ [Frontend] Force refreshed blob ${index} colors`);
                        }
                    });
                }
                
                console.log('✅ [Frontend] Force visual refresh complete');
            } else if (event.data && event.data.type === 'forceCompleteReload') {
                console.log('🔄 [Frontend] Received force complete reload request');
                
                // Force complete conversation data reload
                if (window.conversationDataPath && window.setConversationDataPath) {
                    console.log('🔄 [Frontend] Forcing complete conversation reload...');
                    window.setConversationDataPath(window.conversationDataPath);
                } else if (window.location && window.location.reload) {
                    console.log('🔄 [Frontend] Reloading entire page...');
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }
                
            } else if (event.data && event.data.type === 'reloadEmotionColors') {
                console.log('🎨 [Frontend] Received reload emotion colors request');
                
                // Reload emotion colors from emotions_config.json
                fetch('/config/emotions_config.json?t=' + Date.now())
                    .then(response => response.json())
                    .then(emotionsConfig => {
                        if (typeof emotionGlobalColorMap !== 'undefined') {
                            emotionGlobalColorMap = {};
                        }
                        if (!window.emotionGlobalColorMap) window.emotionGlobalColorMap = {};
                        
                        Object.entries(emotionsConfig).forEach(([emotion, config]) => {
                            if (config.active && config.color) {
                                const rgbColor = hexToRgb(config.color);
                                
                                if (typeof emotionGlobalColorMap !== 'undefined') {
                                    emotionGlobalColorMap[emotion] = rgbColor;
                                }
                                window.emotionGlobalColorMap[emotion] = rgbColor;
                                
                                // Also update p5 instance if available
                                if (window.p5SketchInstance && window.p5SketchInstance.emotionGlobalColorMap) {
                                    window.p5SketchInstance.emotionGlobalColorMap[emotion] = rgbColor;
                                }
                                
                                console.log(`🎨 [Frontend] Reloaded color for ${emotion}: ${config.color} → [${rgbColor.join(', ')}]`);
                            }
                        });
                        
                        // Force update existing blobs
                        if (window.blobs && window.blobs.length > 0) {
                            window.blobs.forEach((blob, index) => {
                                if (blob.setEmotions && blob.currentEmotions) {
                                    blob.setEmotions(blob.currentEmotions);
                                    console.log(`🔄 [Frontend] Updated blob ${index} with emotions:`, blob.currentEmotions);
                                }
                            });
                        }
                        
                        // Force redraw
                        if (typeof redraw === 'function') redraw();
                        if (typeof loop === 'function') loop();
                        
                        // If we have p5 sketch instance, force it to reload conversation data
                        if (window.p5SketchInstance && window.conversationDataPath) {
                            console.log('🔄 [Frontend] Forcing conversation data reload...');
                            setTimeout(() => {
                                if (window.p5SketchInstance.loadConversationData) {
                                    window.p5SketchInstance.loadConversationData(window.conversationDataPath);
                                } else if (window.setConversationDataPath) {
                                    // Force reload by setting the path again
                                    window.setConversationDataPath(window.conversationDataPath);
                                }
                            }, 100);
                        }
                        
                        console.log('✅ [Frontend] Emotion colors reloaded from emotions_config.json');
                    })
                    .catch(error => {
                        console.error('❌ [Frontend] Error reloading emotion colors:', error);
                    });
            }
            
            // Handle emotion colors response from admin panel
            else if (event.data && event.data.type === 'emotionColorsResponse') {
                console.log(`[${sketchInstanceId}] 🎨 Received current emotion colors from admin panel`);
                
                const emotionColorMap = event.data.emotionColorMap;
                if (emotionColorMap && Object.keys(emotionColorMap).length > 0) {
                    console.log(`[${sketchInstanceId}] 🎨 Loading ${Object.keys(emotionColorMap).length} emotion colors:`, emotionColorMap);
                    
                    // Update emotion color map with case-insensitive variations
                    Object.entries(emotionColorMap).forEach(([emotion, color]) => {
                        const variations = [
                            emotion,
                            emotion.toLowerCase(),
                            emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase(),
                            emotion.charAt(0).toLowerCase() + emotion.slice(1)
                        ];
                        
                        variations.forEach(variant => {
                            // Always use window.p5SketchInstance for emotion colors to ensure accessibility
                            if (!window.p5SketchInstance) window.p5SketchInstance = {};
                            if (!window.p5SketchInstance.emotionGlobalColorMap) {
                                window.p5SketchInstance.emotionGlobalColorMap = {};
                            }
                            window.p5SketchInstance.emotionGlobalColorMap[variant] = color;
                            
                            // Try to also update local scope if available
                            try {
                                if (typeof emotionGlobalColorMap !== 'undefined') {
                                    emotionGlobalColorMap[variant] = color;
                                }
                            } catch (error) {
                                // Local scope not available, which is fine since we're using window scope
                            }
                        });
                        
                        console.log(`[${sketchInstanceId}] 🎨 Loaded color for ${emotion} (${variations.join(', ')}):`, color);
                    });
                    
                    console.log(`[${sketchInstanceId}] ✅ Emotion color map updated with current colors`);
                    
                    // Force refresh of current visualization if already loaded
                    if (typeof blobs !== 'undefined' && blobs && blobs.length > 0 && typeof currentMeta !== 'undefined' && currentMeta) {
                        console.log(`[${sketchInstanceId}] 🔄 Refreshing visualization with new colors`);
                        const currentSpeaker = currentMeta.speaker || 0;
                        if (typeof updateBlobVisualsForSegment === 'function') {
                            updateBlobVisualsForSegment(currentSpeaker, currentMeta);
                        }
                    }
                }
            }
        });
        
        // Also listen for BroadcastChannel emotion color responses
        if (typeof BroadcastChannel !== 'undefined') {
            const emotionColorsResponseChannel = new BroadcastChannel('emotion-colors-sync');
            emotionColorsResponseChannel.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'emotionColorsResponse') {
                    console.log(`[${sketchInstanceId}] 📻 Received emotion colors response via BroadcastChannel`);
                    
                    const emotionColorMap = event.data.emotionColorMap;
                    if (emotionColorMap && Object.keys(emotionColorMap).length > 0) {
                        console.log(`[${sketchInstanceId}] 🎨 Loading ${Object.keys(emotionColorMap).length} emotion colors from broadcast:`, emotionColorMap);
                        
                        // Update emotion color map with case-insensitive variations
                        Object.entries(emotionColorMap).forEach(([emotion, color]) => {
                            const variations = [
                                emotion,
                                emotion.toLowerCase(),
                                emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase(),
                                emotion.charAt(0).toLowerCase() + emotion.slice(1)
                            ];
                            
                            variations.forEach(variant => {
                                // Always use window.p5SketchInstance for emotion colors to ensure accessibility
                                if (!window.p5SketchInstance) window.p5SketchInstance = {};
                                if (!window.p5SketchInstance.emotionGlobalColorMap) {
                                    window.p5SketchInstance.emotionGlobalColorMap = {};
                                }
                                window.p5SketchInstance.emotionGlobalColorMap[variant] = color;
                                
                                // Try to also update local scope if available
                                try {
                                    if (typeof emotionGlobalColorMap !== 'undefined') {
                                        emotionGlobalColorMap[variant] = color;
                                    }
                                } catch (error) {
                                    // Local scope not available, which is fine since we're using window scope
                                }
                            });
                            
                            console.log(`[${sketchInstanceId}] 🎨 Loaded color for ${emotion} (${variations.join(', ')}):`, color);
                        });
                        
                        console.log(`[${sketchInstanceId}] ✅ Emotion color map updated from broadcast`);
                        
                        // Force refresh of current visualization if already loaded - use window scope
                        if (window.p5SketchInstance && window.p5SketchInstance.blobs && window.p5SketchInstance.blobs.length > 0 && window.p5SketchInstance.currentMeta) {
                            console.log(`[${sketchInstanceId}] 🔄 Refreshing visualization with broadcast colors`);
                            const currentSpeaker = window.p5SketchInstance.currentMeta.speaker || 0;
                            window.p5SketchInstance.updateBlobVisualsForSegment(currentSpeaker, window.p5SketchInstance.currentMeta);
                        }
                    }
                }
            });
            
            console.log(`[${sketchInstanceId}] 📻 BroadcastChannel listener for emotion color responses initialized`);
        }
        
        // Request emotion colors when sketch starts - multiple attempts for reliability
        if (typeof sketchInstanceId !== 'undefined') {
            console.log(`[${sketchInstanceId}] 🚀 Initializing emotion color request system...`);
            
            // Immediate request
            requestCurrentEmotionColors();
            
            // Delayed request to ensure all message listeners are set up
            setTimeout(() => {
                console.log(`[${sketchInstanceId}] ⏰ First retry, requesting emotion colors...`);
                requestCurrentEmotionColors();
            }, 500);
            
            // Another request after 1.5 seconds in case the first ones didn't work
            setTimeout(() => {
                console.log(`[${sketchInstanceId}] ⏰ Second retry, requesting emotion colors...`);
                requestCurrentEmotionColors();
            }, 1500);
            
            // Third request after 3 seconds
            setTimeout(() => {
                console.log(`[${sketchInstanceId}] ⏰ Third retry, requesting emotion colors...`);
                requestCurrentEmotionColors();
            }, 3000);
            
            // Fourth request after 6 seconds
            setTimeout(() => {
                console.log(`[${sketchInstanceId}] ⏰ Fourth retry, requesting emotion colors...`);
                requestCurrentEmotionColors();
            }, 6000);
            
            // Final request after 10 seconds for cases where admin panel loads late
            setTimeout(() => {
                console.log(`[${sketchInstanceId}] ⏰ Final retry, requesting emotion colors...`);
                requestCurrentEmotionColors();
            }, 10000);
            
            // Check if we successfully received colors and log status
            setTimeout(() => {
                const colorMap = window.emotionGlobalColorMap || window.p5SketchInstance?.emotionGlobalColorMap || {};
                const colorCount = Object.keys(colorMap).length;
                if (colorCount > 0) {
                    console.log(`✅ [${sketchInstanceId}] Successfully received ${colorCount} emotion colors`);
                } else {
                    console.warn(`⚠️ [${sketchInstanceId}] No emotion colors received after all retry attempts`);
                    console.log(`🔧 [${sketchInstanceId}] Ensure admin panel is open or emotion config is loaded`);
                }
            }, 11000);
            
        } else {
            console.warn('❌ sketchInstanceId not found, cannot request emotion colors');
        }
        
        // Expose debugging functions (need to define inside sketch scope)
        window.emotionDebug = {
            forceReloadColors: () => forceReloadEmotionColors(),
            testColor: (emotion) => getEmotionColor(emotion),
            getColorMap: () => emotionGlobalColorMap,
            getAvailableEmotions: () => getEmotionColorMapKeys(),
            translateEmotion: (englishEmotion) => {
                const englishToHebrew = {
                    'curiosity': 'סקרנות',
                    'interest': 'עניין', 
                    'casual': 'נינוח',
                    'acceptance': 'קבלה'
                };
                return englishToHebrew[englishEmotion.toLowerCase()] || englishEmotion;
            }
        };
    }
