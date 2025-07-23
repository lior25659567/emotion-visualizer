// SKETCH-LIVE.JS - Enhanced Live Microphone Version of the Emotion Visualizer
// Maintains ALL visualization features from sketch.js but uses live audio input

const p5SketchLiveFunction = (p) => {
    const diagnosticSketchId = Math.random().toString(36).substring(2, 7);
    const sketchInstanceId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    console.log(`🎤 [${sketchInstanceId}] Initializing ENHANCED LIVE p5 sketch instance`);

    // === MICROPHONE AND AUDIO ANALYSIS ===
    let mic;
    let fft;
    let amplitude;
    let isListening = false;
    
    // Multiple microphone support
    let blobMicrophones = [null, null]; // One mic per blob
    let blobFFTs = [null, null];
    let blobAmplitudes = [null, null];
    let blobAudioLevels = [0, 0];
    
    // Live audio processing
    let audioLevel = 0;
    let frequencyData = [];
    let currentSpeaker = 0;
    let speakerSwitchThreshold = 0.3;
    let lastSpeakerSwitch = 0;
    let speakerSwitchCooldown = 1000; // ms
    
    // Current segment metadata
    let currentMeta = {}; // Store current MP3 metadata for drawing functions
    
    // Volume effects control
    let volumeEffectsEnabled = true; // ENABLED by default for better microphone responsiveness
    
    // Advanced audio analysis
    let bassLevel = 0;
    let trebleLevel = 0;
    let midLevel = 0;
    let spectralCentroid = 0;
    let spectralRolloff = 0;
    
    // === DYNAMIC VISUALIZATION PARAMETERS ===
    let baseGridSize = 25; // Base resolution (lower = less detailed, faster)
    let maxGridSize = 80;  // Maximum resolution (higher = more detailed, slower)
    let gridsize = baseGridSize; // Dynamic grid size that changes with audio
    let grid = [];
    let asciiBuffer;
    let blobs = [];
    let highlightGrids = [];
    
    // Default blob visuals (exact copy from sketch.js)
    const defaultBlobVisuals = {
        blobStrength: 1000,
        blobSizeScale: 8,
        volumeImpact: 1500,
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
        minBlobSpacing: 200,
        movementEasing: 0.03,
        blobDensity: 1.2,
    };
    
    // Global properties
    let enablePulse = true;
    let forceCenter = false;
    let connectBlobs = true; // Enable blob connections for live mode
    let repulsionStrength = 3.0;
    let drawThreshold = 0.000001; // Lower threshold for better visibility
    let finalDrawThreshold = 0.0000005;
    
    // Home regions for blobs
    let blobHomeRegions = ['center-left', 'center-right'];
    
    // ASCII and emotion characters
    const asciiChars = [' ', '░', '▒', '▓', '█'];
    const coloredEmotionChar = '●';
    
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
                'שמחה': ['☺', '😊', '✨', '★', '◉', '●', '○'],
                'שמח': ['☺', '😊', '✨', '★', '◉', '●', '○'],
                'עליזות': ['●', '◉', '⬢', '⬡', '◯', '○', '◦', '•'],
                'התרגשות': ['✨', '★', '☆', '◉', '●', '○', '◎'],
                'אהבה': ['♥', '❤', '💕', '●', '◉', '○', '◯'],
                'הפתעה': ['!', '?', '◉', '○', '◎', '◯', '●'],
                'כעס': ['▲', '▼', '◆', '■', '●', '▪', '♦'],
                'פחד': ['!', '‼', '⚡', '◊', '◈', '◉', '○'],
                'עצב': ['💧', '◔', '◕', '○', '◯', '•', '·'],
                'גועל': ['×', '✕', '✖', '◈', '◊', '○', '●'],
                'סקרנות': ['?', '¿', '◔', '◕', '●', '○', '◯'],
                'תסכול': ['●', '◉', '⬢', '⬡', '◯', '○', '◦', '•'],
                'חרדה': ['~', '≈', '◔', '◕', '●', '○', '◯'],
                'תקווה': ['☆', '★', '✨', '◯', '○', '●', '◎'],
                'גאווה': ['★', '☆', '◉', '●', '⬢', '⬡', '○'],
                'נייטרלי': ['—', '–', '−', '•', '·', '∘', '○'],
                'ניטרלי': ['—', '–', '−', '•', '·', '∘', '○'],
                'default': ['●', '◉', '○', '◯', '◦', '•', '∘']
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
    
    // Canvas and colors
    let canvasBackgroundColor = [247, 249, 243];
    const blobAsciiColor = [0, 0, 0];
    const fadeAlpha = 20;
    
    // Animation and timing
    let isReadyToDrawVisualization = false;
    let animationFrame = 0;
    
    // === ENHANCED EMOTION DETECTION SYSTEM ===
    const emotionThresholds = {
        neutral: { min: 0.0, max: 0.2, color: [120, 120, 120] },
        curiosity: { min: 0.2, max: 0.4, color: [50, 200, 255] }, // Bright cyan
        happiness: { min: 0.4, max: 0.7, color: [255, 220, 0] }, // Bright yellow
        excitement: { min: 0.7, max: 1.0, color: [255, 50, 50] }, // Bright red
        focus: { min: 0.3, max: 0.6, color: [150, 50, 255] }, // Bright purple
        energy: { min: 0.5, max: 0.9, color: [255, 100, 0] } // Bright orange
    };
    
    const emotionCharsets = {
        neutral: ['●'],
        curiosity: ['●'],
        happiness: ['●'],
        excitement: ['●'],
        focus: ['●'],
        energy: ['●']
    };
    
    let emotionGlobalColorMap = {};
    Object.keys(emotionThresholds).forEach(emotion => {
        emotionGlobalColorMap[emotion] = emotionThresholds[emotion].color;
    });
    
    // Listen for emotion color updates from admin panel
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'updateEmotions') {
            console.log('🎨 [Live] Received emotion color update from admin panel');
            
            const emotionColorMap = event.data.emotionColorMap;
            const newEmotions = event.data.emotions;
            
            if (emotionColorMap) {
                // Use the pre-converted RGB color map
                Object.assign(emotionGlobalColorMap, emotionColorMap);
                console.log('🎨 [Live] Updated emotion color map:', emotionGlobalColorMap);
            } else if (newEmotions) {
                // Fallback: convert hex colors to RGB
                Object.entries(newEmotions).forEach(([emotion, config]) => {
                    if (config.active && config.color) {
                        emotionGlobalColorMap[emotion] = hexToRgb(config.color);
                    }
                });
                console.log('🎨 [Live] Updated emotion mapping (fallback):', emotionGlobalColorMap);
            }
            
            // Update emotion charsets if provided
            if (newEmotions) {
                Object.entries(newEmotions).forEach(([emotion, config]) => {
                    if (config.charset && config.charset.length > 0) {
                        emotionCharsets[emotion.toLowerCase()] = config.charset;
                    }
                });
            }
            
            // Force update blob colors with new emotion mapping
            if (blobs && blobs.length > 0) {
                blobs.forEach(blob => {
                    if (blob.emotions && blob.emotions.length > 0) {
                        blob.setEmotions(blob.emotions);
                    }
                });
                console.log('✅ [Live] Applied new emotion colors to blobs');
            }
        }
    });
    
    // Helper function to convert hex to RGB
    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return [r, g, b];
    }
    
    // === BLOB CLASS (Enhanced from sketch.js) ===
    class Blob {
        constructor(i, initialPos = {}) {
            this.index = i;
            this.homeRegion = blobHomeRegions[i] || 'center';
            
            // Position and movement - Fix: Create proper p5.Vector objects
            this.pos = p.createVector(initialPos.x || p.width/2, initialPos.y || p.height/2);
            this.targetPos = p.createVector(0, 0);
            this.vel = p.createVector(0, 0);
            
            // Set initial target position
            const homeCenter = getRegionCenter(this.homeRegion);
            this.targetPos.set(homeCenter.x, homeCenter.y);
            
            // Visual properties (copy from defaultBlobVisuals)
            this.target = {};
            Object.keys(defaultBlobVisuals).forEach(key => {
                this.target[key] = defaultBlobVisuals[key];
                this[key] = defaultBlobVisuals[key];
            });
            
            // Additional properties
            this.isVisible = true; // Always start visible
            this.audioLevel = 0.3; // Start with some default activity
            this.emotions = ['neutral'];
            this.displayColors = [[100, 100, 100]]; // Default gray
            this.cachedStrength = this.blobStrength;
            
            // Set initial visibility and activity
            this.setAudioLevel(0.3); // Give initial activity
            
            console.log(`🎭 [${sketchInstanceId}] Created enhanced blob ${i} in region ${this.homeRegion}`);
        }
        
        teleportToHome() {
            const homeCenter = getRegionCenter(this.homeRegion);
            this.pos.set(homeCenter.x, homeCenter.y);
        }
        
        setAudioLevel(level) {
            this.audioLevel = level;
            // Always keep blobs visible with minimum visibility
            this.target.blobVisibility = Math.max(0.6, level > 0.1 ? 1.0 : 0.6);
            this.isVisible = true; // Always visible for demo purposes
            
            // CONDITIONAL: Apply volume effects only if enabled
            if (volumeEffectsEnabled) {
                // MEGA ULTRA ENHANCED: INSANE size response to audio - MAXIMUM DRAMA!
                this.target.blobSizeScale = Math.max(0.3, 1 + (level * 120)); // INSANE size changes! Quiet=tiny (0.3), Loud=huge (121)!
                this.target.blobStrength = Math.max(100, 200 + (level * 12000)); // COLOSSAL strength variation (was 8000, now 12000!)
                
                // MEGA ULTRA ENHANCED: INSANE movement and visual properties based on audio
                this.target.blobMotionRange = 0.02 + (level * 3.0); // INSANE movement with louder audio
                this.target.breathSpeed = 0.00002 + (level * 0.015); // ULTRA fast breathing with audio
                this.target.blobiness = 0.3 + (level * 8.0); // INSANE distortion with audio
                this.target.gradientStrength = Math.max(3, 5 + (level * 120)); // INSANE gradient with audio
                this.target.volumeImpact = 400 + (level * 10000); // COLOSSAL volume impact boost
                
                // ENHANCED: Add stronger pulsing background effect for high volume
                if (level > 0.5) {
                    this.target.backgroundPulse = level * 3.0; // Stronger pulsing background effect
                }
                
                // MEGA ENHANCED: Screen shake effect for very loud audio
                if (level > 0.8) {
                    this.target.screenShake = (level - 0.8) * 50; // Screen shake for super loud audio
                }
            } else {
                // STATIC: Keep consistent visual properties when volume effects disabled
                this.target.blobSizeScale = 8; // Fixed size
                this.target.blobStrength = 1000; // Fixed strength
                this.target.blobMotionRange = 0.4; // Fixed movement range
                this.target.breathSpeed = 0.0003; // Fixed breathing speed
                this.target.blobiness = 1.5; // Fixed distortion
                this.target.gradientStrength = 15; // Fixed gradient
            }
        }
        
        setEmotions(emotions) {
            this.emotions = emotions || ['neutral'];
            
            // Generate colors based on emotions
            this.displayColors = [];
            emotions.forEach(emotion => {
                const normalizedEmotion = emotion.toLowerCase();
                if (emotionGlobalColorMap[normalizedEmotion]) {
                    this.displayColors.push(emotionGlobalColorMap[normalizedEmotion]);
                } else {
                    this.displayColors.push([100, 100, 100]); // Default gray
                }
            });
            
            if (this.displayColors.length === 0) {
                this.displayColors.push([100, 100, 100]);
            }
        }
        
        // ENHANCED: Set frequency-specific responses
        setFrequencyResponse(bassLevel, midLevel, trebleLevel) {
            // Different blobs respond to different frequency ranges
            if (this.index === 0) {
                // Blob 0 responds more to bass and mid frequencies
                const freqResponse = (bassLevel * 0.6) + (midLevel * 0.4);
                this.target.volumeImpact = 1000 + (freqResponse * 2000);
                this.target.blobDensity = 1.0 + (bassLevel * 0.8); // Bass affects density
                this.target.repulsionStrength = 2.0 + (midLevel * 4.0); // Mid affects repulsion
            } else if (this.index === 1) {
                // Blob 1 responds more to mid and treble frequencies  
                const freqResponse = (midLevel * 0.4) + (trebleLevel * 0.6);
                this.target.volumeImpact = 1000 + (freqResponse * 2000);
                this.target.blobDensity = 1.0 + (trebleLevel * 0.8); // Treble affects density
                this.target.repulsionStrength = 2.0 + (bassLevel * 4.0); // Bass affects repulsion
            }
        }
        
        getStrength() {
            return this.cachedStrength;
        }
        
        updateStrength() {
            // DRAMATICALLY ENHANCED: Apply massive audio impact to strength with enhanced effects
            const volumeBoost = this.audioLevel * this.volumeImpact * 1.5; // 1.5x amplifier
            
            // Add much stronger pulsing effect based on audio level
            const pulseBoost = Math.sin(p.frameCount * 0.3) * this.audioLevel * 1500; // 3x stronger (was 500)
            
            // Add much more rapid audio-reactive "bounce"
            const bounceBoost = Math.sin(p.frameCount * 1.2 + this.index) * this.audioLevel * 1000; // 3x stronger (was 300)
            
            // Add new jitter effect for high audio levels
            const jitterBoost = (this.audioLevel > 0.5) ? Math.random() * this.audioLevel * 800 : 0;
            
            this.cachedStrength = this.blobStrength + volumeBoost + pulseBoost + bounceBoost + jitterBoost;
        }
        
        applyDynamicMovement(homeCenter, homeRadius) {
            // ENHANCED movement system with more audio responsiveness
            const t = p.frameCount * this.breathSpeed;
            const motionRange = this.blobMotionRange * homeRadius;
            
            // Basic breathing motion
            const breathX = Math.sin(t * 2) * motionRange * 0.2;
            const breathY = Math.cos(t * 1.5) * motionRange * 0.15;
            
            // ENHANCED: Much more dramatic audio-reactive movement
            const audioIntensity = this.audioLevel * 2; // Amplify audio effect
            const audioMotionX = Math.sin(audioIntensity * 15 + t) * motionRange * audioIntensity * 1.5;
            const audioMotionY = Math.cos(audioIntensity * 12 + t) * motionRange * audioIntensity * 1.5;
            
            // ENHANCED: Add pulsing motion based on audio
            const pulseX = Math.sin(t * 8) * motionRange * this.audioLevel * 0.8;
            const pulseY = Math.cos(t * 6) * motionRange * this.audioLevel * 0.8;
            
            // ENHANCED: Add spiral motion for high audio levels
            const spiralRadius = this.audioLevel * motionRange * 0.5;
            const spiralX = Math.sin(t * 4) * spiralRadius;
            const spiralY = Math.cos(t * 4) * spiralRadius;
            
            this.targetPos.x = homeCenter.x + breathX + audioMotionX + pulseX + spiralX;
            this.targetPos.y = homeCenter.y + breathY + audioMotionY + pulseY + spiralY;
            
            // Apply humor effect (jitter) - enhanced with audio
            if (this.humor > 0) {
                const jitterAmount = (this.humor + this.audioLevel) * 25;
                this.targetPos.x += p.random(-jitterAmount, jitterAmount);
                this.targetPos.y += p.random(-jitterAmount, jitterAmount);
            }
        }
        
        update() {
            // Update all visual properties with easing
            Object.keys(this.target).forEach(key => {
                if (typeof this.target[key] === 'number' && typeof this[key] === 'number') {
                    this[key] = p.lerp(this[key], this.target[key], this.movementEasing);
                }
            });
            
            // Update position - Fix: Use proper vector operations
            this.vel.mult(0.95); // Damping
            const force = p5.Vector.sub(this.targetPos, this.pos);
            force.mult(this.movementEasing);
            this.vel.add(force);
            this.pos.add(this.vel);
            
            // Update strength
            this.updateStrength();
            
            // Apply dynamic movement
            const homeCenter = getRegionCenter(this.homeRegion);
            const homeRadius = Math.min(p.width, p.height) * 0.15;
            this.applyDynamicMovement(homeCenter, homeRadius);
        }
        
        applyBlobSpacing() {
            // Blob repulsion system
            for (let j = 0; j < blobs.length; j++) {
                if (j === this.index) continue;
                
                const other = blobs[j];
                if (!other.isVisible) continue;
                
                const distance = p5.Vector.dist(this.pos, other.pos);
                const minDistance = this.minBlobSpacing;
                
                if (distance < minDistance && distance > 0) {
                    const repulsion = p5.Vector.sub(this.pos, other.pos);
                    repulsion.normalize();
                    repulsion.mult(repulsionStrength);
                    this.vel.add(repulsion);
                }
            }
        }
    }
    
    // === UTILITY FUNCTIONS ===
    function getRegionCenter(regionName) {
        const margin = 80;
        const regions = {
            'center': { x: p.width / 2, y: p.height / 2 },
            'center-left': { x: p.width * 0.3, y: p.height / 2 },
            'center-right': { x: p.width * 0.7, y: p.height / 2 },
            'top-left': { x: margin, y: margin },
            'top-right': { x: p.width - margin, y: margin },
            'bottom-left': { x: margin, y: p.height - margin },
            'bottom-right': { x: p.width - margin, y: p.height - margin },
        };
        return regions[regionName] || regions['center'];
    }
    
    function detectEmotionFromAudio() {
        // Enhanced emotion detection based on audio characteristics
        const emotions = [];
        
        // Base emotion on overall audio level
        if (audioLevel < 0.2) {
            emotions.push('neutral');
        } else if (audioLevel < 0.4) {
            emotions.push('curiosity');
        } else if (audioLevel < 0.7) {
            emotions.push('happiness');
        } else {
            emotions.push('excitement');
        }
        
        // Add secondary emotions based on frequency characteristics
        if (bassLevel > 0.6) {
            emotions.push('energy');
        }
        if (trebleLevel > 0.5 && midLevel > 0.4) {
            emotions.push('focus');
        }
        
        return emotions;
    }
    
    function getAnimationFrame() {
        return animationFrame;
    }
    
    // Function to draw background charset behind the blobs
    function drawBackgroundCharset(g) {
        // Get appropriate charset based on grid resolution
        const backgroundCharset = getBackgroundCharset(gridsize);
        
        // Set text properties for background - ENHANCED VISIBILITY
        g.textAlign(p.CENTER, p.CENTER);
        g.fill(150, 150, 150, 80); // Darker gray with higher opacity for better visibility
        g.textSize(p.width / gridsize * 0.9); // Larger size for better visibility
        
        // Draw background characters across the entire grid
        for (let x = 0; x < gridsize; x++) {
            for (let y = 0; y < gridsize; y++) {
                const gx = x * (p.width / gridsize) + (p.width / gridsize) / 2;
                const gy = y * (p.height / gridsize) + (p.height / gridsize) / 2;
                
                // Use noise to create organic distribution pattern
                const noiseValue = p.noise(x * 0.1, y * 0.1, animationFrame * 0.001);
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
        g.textSize(p.width / gridsize * 0.7); // Smaller size for second layer
        
        for (let x = 0; x < gridsize; x++) {
            for (let y = 0; y < gridsize; y++) {
                const gx = x * (p.width / gridsize) + (p.width / gridsize) / 2;
                const gy = y * (p.height / gridsize) + (p.height / gridsize) / 2;
                
                // Use different noise pattern for second layer
                const noiseValue = p.noise(x * 0.15, y * 0.15, animationFrame * 0.002);
                const charIndex = Math.floor(noiseValue * backgroundCharset.length);
                const char = backgroundCharset[charIndex] || '·';
                
                if (noiseValue > 0.4) { // Higher threshold for second layer
                    g.text(char, gx, gy);
                }
            }
        }
    }
    
    // === METABALL ASCII RENDERING SYSTEM ===
    function drawMetaballAscii(g) {
        // Use dynamic grid resolution if specified in segment metadata
        let effectiveGridSize = gridsize;
        if (currentMeta && currentMeta.gridResolution !== undefined) {
            effectiveGridSize = Math.max(20, Math.min(150, Math.round(currentMeta.gridResolution)));
        }
        
        // Initialize grid if needed with effective size
        if (grid.length === 0 || grid.length !== effectiveGridSize) {
            grid = [];
            for (let i = 0; i < effectiveGridSize; i++) {
                grid[i] = [];
                for (let j = 0; j < effectiveGridSize; j++) {
                    grid[i][j] = 0;
                }
            }
        }
        
        const stepX = p.width / effectiveGridSize;
        const stepY = p.height / effectiveGridSize;
        
        // Calculate metaball influences (no background)
        for (let i = 0; i < effectiveGridSize; i++) {
            for (let j = 0; j < effectiveGridSize; j++) {
                grid[i][j] = 0;
                
                const gx = i * stepX + stepX / 2;
                const gy = j * stepY + stepY / 2;
                
                for (let b = 0; b < blobs.length; b++) {
                    const blob = blobs[b];
                    if (!blob.isVisible) continue;
                    
                    const dx = gx - blob.pos.x;
                    const dy = gy - blob.pos.y;
                    let d2 = dx * dx + dy * dy;
                    if (d2 === 0) d2 = 1;
                    
                    // Enhanced metaball calculation with noise
                    const t = getAnimationFrame() * blob.breathSpeed;
                    let angle = Math.atan2(dy, dx);
                    let n1 = p.noise(0.01 * blob.pos.x + Math.cos(angle * 3.0 + t), 0.01 * blob.pos.y + Math.sin(angle * 2.5 - t));
                    let n2 = p.noise(0.015 * blob.pos.x + Math.cos(angle * 1.7 - t * 0.5), 0.015 * blob.pos.y + Math.sin(angle * 1.3 + t * 0.3));
                    let distortion = Math.sin(n1 * Math.PI) * Math.cos(n2 * Math.PI);
                    
                    let distortedStrength = blob.getStrength() * blob.blobSizeScale * (1 + blob.blobiness * 0.3 * distortion);
                    let influence = (distortedStrength * blob.blobDensity) / (d2 * blob.blobSpreadField + 1e-6);
                    
                    grid[i][j] += influence;
                }
            }
        }
        
        // Draw ASCII characters based on metaball influence
        g.fill(blobAsciiColor[0], blobAsciiColor[1], blobAsciiColor[2]);
        g.textAlign(p.CENTER, p.CENTER);
        
        for (let i = 0; i < effectiveGridSize; i++) {
            for (let j = 0; j < effectiveGridSize; j++) {
                const influence = grid[i][j];
                
                if (influence > drawThreshold) {
                    const gx = i * stepX + stepX / 2;
                    const gy = j * stepY + stepY / 2;
                    
                    // Check for emotion highlights
                    let isEmotionHighlight = false;
                    let emotionChar = '';
                    let emotionColor = null;
                    
                    for (let blobIndex = 0; blobIndex < highlightGrids.length; blobIndex++) {
                        const highlights = highlightGrids[blobIndex] || [];
                        for (const highlight of highlights) {
                            if (highlight.x === i && highlight.y === j) {
                                isEmotionHighlight = true;
                                emotionChar = highlight.char || coloredEmotionChar;
                                emotionColor = highlight.color || [255, 100, 100];
                                break;
                            }
                        }
                        if (isEmotionHighlight) break;
                    }
                    
                                                if (isEmotionHighlight) {
                                // Draw colored emotion character with DYNAMIC SIZE & EFFECTS
                                
                                // MEGA ENHANCED: INSANE dynamic character size based on audio level!
                                const baseEmotionSize = 10 * defaultBlobVisuals.coloredCircleCharSize; // Smaller base for more contrast
                                const audioSizeMultiplier = 0.5 + (audioLevel * 5.0); // INSANE: 0.5x to 5.5x size range!
                                const dynamicEmotionSize = baseEmotionSize * audioSizeMultiplier;
                                
                                // ENHANCED: Add glow effect for high audio levels
                                if (audioLevel > 0.6) {
                                    const glowIntensity = (audioLevel - 0.6) * 2.5; // 0 to 1 intensity
                                    const glowAlpha = Math.floor(glowIntensity * 100);
                                    
                                    // Draw glow behind character
                                    g.fill(emotionColor[0], emotionColor[1], emotionColor[2], glowAlpha);
                                    g.textSize(dynamicEmotionSize * 1.5); // Larger glow
                                    g.text(emotionChar, gx, gy);
                                }
                                
                                // Draw main character
                                g.fill(emotionColor[0], emotionColor[1], emotionColor[2]);
                                g.textSize(dynamicEmotionSize);
                                g.text(emotionChar, gx, gy);
                            } else {
                                // Draw regular ASCII character with DYNAMIC SIZE & EFFECTS
                                const charIndex = Math.floor(p.map(influence, drawThreshold, 1, 0, asciiChars.length - 1));
                                const char = asciiChars[p.constrain(charIndex, 0, asciiChars.length - 1)];
                                
                                // MEGA ENHANCED: INSANE dynamic character size based on audio level!
                                const baseAsciiSize = 8 * defaultBlobVisuals.regularAsciiCharSize; // Smaller base for more contrast
                                const audioSizeMultiplier = 0.3 + (audioLevel * 4.0); // INSANE: 0.3x to 4.3x size range!
                                const dynamicAsciiSize = baseAsciiSize * audioSizeMultiplier;
                                
                                // ENHANCED: Add subtle glow effect for high audio levels
                                if (audioLevel > 0.7) {
                                    const glowIntensity = (audioLevel - 0.7) * 3.33; // 0 to 1 intensity
                                    const glowAlpha = Math.floor(glowIntensity * 80);
                                    
                                    // Draw glow behind character
                                    g.fill(blobAsciiColor[0], blobAsciiColor[1], blobAsciiColor[2], glowAlpha);
                                    g.textSize(dynamicAsciiSize * 1.3); // Larger glow
                                    g.text(char, gx, gy);
                                }
                                
                                // Draw main character
                                g.fill(blobAsciiColor[0], blobAsciiColor[1], blobAsciiColor[2]);
                                g.textSize(dynamicAsciiSize);
                                g.text(char, gx, gy);
                            }
                }
            }
        }
    }
    
    // === BLOB CONNECTIONS SYSTEM ===
    function drawBlobConnections() {
        if (!connectBlobs) return;
        
        p.strokeWeight(2);
        let connectionsDrawn = 0;
        
        for (let i = 0; i < blobs.length; i++) {
            for (let j = i + 1; j < blobs.length; j++) {
                const blob1 = blobs[i];
                const blob2 = blobs[j];
                
                if (!blob1.isVisible || !blob2.isVisible) continue;
                
                const distance = p5.Vector.dist(blob1.pos, blob2.pos);
                const maxConnectionDistance = p.width * 0.6;
                
                if (distance < maxConnectionDistance) {
                    const opacity = p.map(distance, 0, maxConnectionDistance, 180, 20);
                    
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
                    
                    const animationOffset = p.sin(getAnimationFrame() * 0.02 + i + j) * 0.1;
                    const connectionWeight = p.map(distance, 0, maxConnectionDistance, 3, 1) + animationOffset;
                    p.strokeWeight(connectionWeight);
                    
                    p.line(blob1.pos.x, blob1.pos.y, blob2.pos.x, blob2.pos.y);
                    
                    // Connection points
                    p.fill(connectionColor);
                    p.noStroke();
                    const circleSize = 4 + animationOffset * 2;
                    p.ellipse(blob1.pos.x, blob1.pos.y, circleSize, circleSize);
                    p.ellipse(blob2.pos.x, blob2.pos.y, circleSize, circleSize);
                    
                    connectionsDrawn++;
                }
            }
        }
        
        p.noStroke();
    }
    
    // === EMOTION HIGHLIGHT SYSTEM ===
    function createEmotionHighlightGrids(emotions, speakerIndex, meta = null) {
        if (!highlightGrids[speakerIndex]) {
            highlightGrids[speakerIndex] = [];
        } else {
            highlightGrids[speakerIndex] = [];
        }
        
        const blob = blobs[speakerIndex];
        if (!blob || !blob.isVisible) return;
        
        // Use dynamic grid size for highlight positioning if available  
        let effectiveGridSize = gridsize;
        if (meta && meta.gridResolution !== undefined) {
            effectiveGridSize = Math.max(20, Math.min(150, Math.round(meta.gridResolution)));
        }
        
        const stepX = p.width / effectiveGridSize;
        const stepY = p.height / effectiveGridSize;
        const centerX = Math.floor(blob.pos.x / stepX);
        const centerY = Math.floor(blob.pos.y / stepY);
        
        // Calculate base emotion characters based on audio level
        const baseCirclesPerEmotion = Math.max(3, Math.floor(audioLevel * 15)); // More highlights for louder audio
        
        // Apply emotionCharAmount scaling if meta is provided (for segment-based visualization)
        let circlesPerEmotion = baseCirclesPerEmotion;
        if (meta && meta.emotionCharAmount !== undefined) {
            const emotionCharAmount = meta.emotionCharAmount || 50; // Default 50%
            const emotionMultiplier = emotionCharAmount / 50; // Convert to multiplier
            circlesPerEmotion = Math.round(baseCirclesPerEmotion * emotionMultiplier);
            circlesPerEmotion = Math.max(0, Math.min(circlesPerEmotion, 100)); // Bounds check
        }
        const searchRadius = Math.max(10, Math.floor(blob.blobSizeScale * 3));
        const minDistance = 2;
        
        for (let i = 0; i < circlesPerEmotion; i++) {
            let validPosition = false;
            let attempts = 0;
            let x, y;
            
            while (!validPosition && attempts < 100) {
                const angle = p.random(0, 2 * Math.PI);
                const radius = Math.sqrt(p.random()) * searchRadius;
                
                x = Math.floor(centerX + Math.cos(angle) * radius);
                y = Math.floor(centerY + Math.sin(angle) * radius);
                
                x = p.constrain(x, 0, effectiveGridSize - 1);
                y = p.constrain(y, 0, effectiveGridSize - 1);
                
                // Check if position has blob influence
                if (grid[x] && grid[x][y] && grid[x][y] > drawThreshold) {
                    // Check distance from existing highlights
                    validPosition = true;
                    for (const existingHighlight of highlightGrids[speakerIndex]) {
                        const distance = Math.sqrt(Math.pow(x - existingHighlight.x, 2) + Math.pow(y - existingHighlight.y, 2));
                        if (distance < minDistance) {
                            validPosition = false;
                            break;
                        }
                    }
                }
                attempts++;
            }
            
            if (validPosition || attempts >= 100) {
                const selectedEmotion = emotions[i % emotions.length] || 'neutral';
                const emotionChars = emotionCharsets[selectedEmotion] || [coloredEmotionChar];
                const emotionChar = emotionChars[Math.floor(p.random(emotionChars.length))];
                const emotionColor = emotionGlobalColorMap[selectedEmotion] || [100, 100, 100];
                
                highlightGrids[speakerIndex].push({
                    x: x,
                    y: y,
                    char: emotionChar,
                    color: emotionColor,
                    emotion: selectedEmotion
                });
            }
        }
    }
    
    // === ENHANCED AUDIO ANALYSIS FUNCTIONS ===
    function analyzeAudio() {
        if (!fft || !amplitude) return;
        
        // Get frequency spectrum
        frequencyData = fft.analyze();
        audioLevel = amplitude.getLevel();
        
        // DRAMATIC ENHANCEMENT: Dynamic resolution based on volume!
        // Quiet = Low resolution (fast), Loud = High resolution (detailed)
        const targetGridSize = Math.floor(baseGridSize + (audioLevel * (maxGridSize - baseGridSize)));
        
        // Smooth grid size transitions to avoid jarring changes
        if (Math.abs(targetGridSize - gridsize) > 1) {
            gridsize = Math.floor(p.lerp(gridsize, targetGridSize, 0.1)); // Smooth transition
            
            // Reinitialize grid with new size
            grid = [];
            for (let i = 0; i < gridsize; i++) {
                grid[i] = [];
                for (let j = 0; j < gridsize; j++) {
                    grid[i][j] = 0;
                }
            }
            
            // Log resolution changes for debugging
            if (p.frameCount % 30 === 0) {
                console.log(`📐 [${sketchInstanceId}] DYNAMIC RESOLUTION: ${gridsize} (audio: ${(audioLevel * 100).toFixed(0)}%)`);
            }
        }
        
        // Analyze frequency bands
        const nyquist = 22050;
        const bassRange = Math.floor(150 / nyquist * frequencyData.length);
        const midRange = Math.floor(2000 / nyquist * frequencyData.length);
        const trebleRange = Math.floor(8000 / nyquist * frequencyData.length);
        
        // Calculate frequency band levels
        bassLevel = 0;
        for (let i = 0; i < bassRange; i++) {
            bassLevel += frequencyData[i];
        }
        bassLevel /= (bassRange * 255);
        
        midLevel = 0;
        for (let i = bassRange; i < midRange; i++) {
            midLevel += frequencyData[i];
        }
        midLevel /= ((midRange - bassRange) * 255);
        
        trebleLevel = 0;
        for (let i = midRange; i < trebleRange; i++) {
            trebleLevel += frequencyData[i];
        }
        trebleLevel /= ((trebleRange - midRange) * 255);
        
        // ENHANCED speaker detection based on frequency characteristics
        const currentTime = Date.now();
        if (currentTime - lastSpeakerSwitch > speakerSwitchCooldown) {
            let newSpeaker = currentSpeaker;
            
            // Enhanced speaker detection with clearer thresholds
            if (bassLevel > trebleLevel * 1.2 && bassLevel > speakerSwitchThreshold) {
                newSpeaker = 0; // Bass-heavy speaker
            } else if (trebleLevel > bassLevel * 1.2 && trebleLevel > speakerSwitchThreshold) {
                newSpeaker = 1; // Treble-heavy speaker
            }
            
            if (newSpeaker !== currentSpeaker) {
                currentSpeaker = newSpeaker;
                lastSpeakerSwitch = currentTime;
                console.log(`🔄 [${sketchInstanceId}] Speaker switched to ${currentSpeaker} (bass: ${bassLevel.toFixed(2)}, treble: ${trebleLevel.toFixed(2)}, grid: ${gridsize})`);
            }
        }
    }
    
    function updateBlobsFromAudio() {
        if (blobs.length === 0) return;
        
        // Add some default breathing animation even without audio
        const breathingLevel = 0.2 + 0.1 * Math.sin(p.frameCount * 0.02);
        
        // ENHANCED: Update each blob with individual microphone input
        for (let i = 0; i < blobs.length; i++) {
            if (blobMicrophones[i] && blobAmplitudes[i] && isListening) {
                // Get individual audio level for this blob
                const blobLevel = blobAmplitudes[i].getLevel();
                blobAudioLevels[i] = blobLevel;
                
                // Get frequency data for this blob
                if (blobFFTs[i]) {
                    const spectrum = blobFFTs[i].analyze();
                    const bass = p.map(spectrum.slice(0, 64).reduce((a, b) => a + b) / 64, 0, 255, 0, 1);
                    const mid = p.map(spectrum.slice(64, 128).reduce((a, b) => a + b) / 64, 0, 255, 0, 1);
                    const treble = p.map(spectrum.slice(128, 256).reduce((a, b) => a + b) / 128, 0, 255, 0, 1);
                    
                    // Set frequency response for this blob
                    blobs[i].setFrequencyResponse(bass, mid, treble);
                }
                
                // Update blob with individual audio level
                blobs[i].setAudioLevel(blobLevel);
                
                // Emotion detection based on audio characteristics
                const emotions = detectEmotionFromLevel(blobLevel);
                blobs[i].setEmotions(emotions);
                
                // Create emotion highlights for active blobs
                if (blobLevel > 0.1) {
                    createEmotionHighlightGrids(emotions, i, currentMeta);
                }
                
                // Update speaker indicator based on audio activity
                if (blobLevel > speakerSwitchThreshold) {
                    currentSpeaker = i;
                }
            } else {
                // Default breathing animation for blobs without microphones or when not listening
                const blobBreathing = breathingLevel + 0.05 * Math.sin(p.frameCount * 0.03 + i);
                blobs[i].setAudioLevel(Math.max(blobBreathing, blobs[i].audioLevel * 0.98));
                blobs[i].setEmotions(['neutral']);
                
                // Simulate subtle frequency variations for visual interest
                const simBass = 0.2 + 0.1 * Math.sin(p.frameCount * 0.01);
                const simMid = 0.3 + 0.1 * Math.cos(p.frameCount * 0.015);
                const simTreble = 0.2 + 0.1 * Math.sin(p.frameCount * 0.02);
                blobs[i].setFrequencyResponse(simBass, simMid, simTreble);
                
                // Add some default emotion highlights
                if (p.frameCount % 120 === i * 60) { // Every 2 seconds, staggered
                    createEmotionHighlightGrids(['neutral'], i, currentMeta);
                }
            }
        }
    }
    
    // Helper function for emotion detection from audio level
    function detectEmotionFromLevel(level) {
        if (level > 0.8) {
            return ['excitement', 'energy'];
        } else if (level > 0.6) {
            return ['happiness', 'excitement'];
        } else if (level > 0.4) {
            return ['happiness', 'curiosity'];
        } else if (level > 0.2) {
            return ['curiosity', 'focus'];
        } else {
            return ['neutral'];
        }
    }
    
    // ENHANCED: Add energy particle effects for high audio levels
    function drawEnergyParticles() {
        const particleCount = Math.floor(audioLevel * 20); // More particles for louder audio
        
        p.noStroke();
        for (let i = 0; i < particleCount; i++) {
            // Random particle position
            const x = p.random(0, p.width);
            const y = p.random(0, p.height);
            
            // Particle size based on audio level
            const size = p.random(2, audioLevel * 8);
            
            // Particle color based on frequency content
            let particleColor;
            if (bassLevel > trebleLevel) {
                // Bass-heavy = warm colors (red/orange)
                particleColor = p.color(255, p.random(100, 200), 50, p.random(100, 200));
            } else {
                // Treble-heavy = cool colors (blue/cyan)
                particleColor = p.color(50, p.random(150, 255), 255, p.random(100, 200));
            }
            
            p.fill(particleColor);
            
            // Add some movement/animation to particles
            const offsetX = Math.sin(animationFrame * 0.1 + i) * audioLevel * 3;
            const offsetY = Math.cos(animationFrame * 0.1 + i * 1.5) * audioLevel * 3;
            
            p.ellipse(x + offsetX, y + offsetY, size, size);
        }
    }
    
    // === P5.JS SETUP AND DRAW ===
    p.setup = () => {
        // Fix: Ensure the container exists before creating canvas
        const container = document.getElementById('live-canvas-container');
        if (!container) {
            console.error('❌ Canvas container not found!');
            return;
        }
        
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent(container);
        
        console.log(`🎨 [${sketchInstanceId}] Enhanced live visualization canvas created: ${p.width}x${p.height}`);
        
        // Initialize audio components
        mic = new p5.AudioIn();
        fft = new p5.FFT(0.8, 256);
        amplitude = new p5.Amplitude();
        
        fft.setInput(mic);
        amplitude.setInput(mic);
        
        // Initialize grid
        for (let i = 0; i < gridsize; i++) {
            grid[i] = [];
            for (let j = 0; j < gridsize; j++) {
                grid[i][j] = 0;
            }
        }
        
        // Initialize blobs with proper home centers
        for (let i = 0; i < 2; i++) {
            const homeCenter = getRegionCenter(blobHomeRegions[i]);
            blobs.push(new Blob(i, { x: homeCenter.x, y: homeCenter.y }));
        }
        
        // Initialize highlight grids
        for (let i = 0; i < blobs.length; i++) {
            highlightGrids.push([]);
        }
        
        isReadyToDrawVisualization = true;
        console.log(`✅ [${sketchInstanceId}] Enhanced live visualization setup complete`);
    };
    
    p.draw = () => {
        animationFrame++;
        
        // ENHANCED: Dynamic background with audio-reactive effects
        let bgR = canvasBackgroundColor[0];
        let bgG = canvasBackgroundColor[1]; 
        let bgB = canvasBackgroundColor[2];
        
        // Add subtle audio-reactive background pulse
        if (isListening && audioLevel > 0.3) {
            const pulseIntensity = (audioLevel - 0.3) * 0.3; // Scale pulse intensity
            const pulse = Math.sin(animationFrame * 0.3) * pulseIntensity * 30;
            
            // Slightly brighten background based on audio
            bgR = Math.min(255, bgR + pulse);
            bgG = Math.min(255, bgG + pulse); 
            bgB = Math.min(255, bgB + pulse);
            
            // Add colored tint based on dominant frequency
            if (bassLevel > trebleLevel) {
                bgR = Math.min(255, bgR + pulse * 0.5); // Red tint for bass
            } else {
                bgB = Math.min(255, bgB + pulse * 0.5); // Blue tint for treble
            }
        }
        
        p.background(bgR, bgG, bgB);
        
        if (!isReadyToDrawVisualization) return;
        
        // Analyze audio
        if (isListening) {
            analyzeAudio();
            updateBlobsFromAudio();
        }
        
        // Update blobs
        blobs.forEach(blob => {
            blob.update();
            blob.applyBlobSpacing();
        });
        
        // ENHANCED: Add screen shake effect for very loud audio
        if (isListening && audioLevel > 0.8) {
            const shakeIntensity = (audioLevel - 0.8) * 10;
            p.translate(
                p.random(-shakeIntensity, shakeIntensity),
                p.random(-shakeIntensity, shakeIntensity)
            );
        }
        
        // Draw metaball ASCII
        drawMetaballAscii(p);
        
        // Draw blob connections
        drawBlobConnections();
        
        // ENHANCED: Add particle effects for high energy
        if (isListening && audioLevel > 0.7) {
            drawEnergyParticles();
        }
        
        // Enhanced debug info (every 60 frames)
        if (p.frameCount % 60 === 0 && isListening) {
            const emotionSizeMultiplier = 0.5 + (audioLevel * 5.0);
            const asciiSizeMultiplier = 0.3 + (audioLevel * 4.0);
            const blobSizeMultiplier = Math.max(0.3, 1 + (audioLevel * 120));
            console.log(`🎵 [${sketchInstanceId}] MEGA AUDIO: level=${audioLevel.toFixed(3)}, speaker=${currentSpeaker}, bass=${bassLevel.toFixed(2)}, treble=${trebleLevel.toFixed(2)}, grid=${gridsize}, blobSize=${blobSizeMultiplier.toFixed(1)}x, charSize=${asciiSizeMultiplier.toFixed(1)}x`);
        }
    };
    
    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        
        // Update blob home positions - Fix: Ensure vectors are properly initialized
        blobs.forEach((blob, i) => {
            const homeCenter = getRegionCenter(blob.homeRegion);
            if (blob.targetPos) {
                blob.targetPos.set(homeCenter.x, homeCenter.y);
            } else {
                blob.targetPos = p.createVector(homeCenter.x, homeCenter.y);
            }
        });
        
        console.log(`📐 [${sketchInstanceId}] Canvas resized: ${p.width}x${p.height}`);
    };
    
    // === GLOBAL FUNCTIONS FOR EXTERNAL CONTROL ===
    window.liveVisualization = {
        startMicrophone: async () => {
            try {
                await mic.start();
                isListening = true;
                console.log(`🎤 [${sketchInstanceId}] Enhanced microphone started successfully`);
                return true;
            } catch (error) {
                console.error(`❌ [${sketchInstanceId}] Microphone start failed:`, error);
                return false;
            }
        },
        
        stopMicrophone: () => {
            if (mic) {
                mic.stop();
                isListening = false;
                audioLevel = 0;
                
                // Reset all blobs
                blobs.forEach(blob => {
                    blob.setAudioLevel(0);
                    blob.setEmotions(['neutral']);
                });
                
                // Clear highlight grids
                highlightGrids.forEach(grid => grid.length = 0);
                
                console.log(`🛑 [${sketchInstanceId}] Enhanced microphone stopped`);
            }
        },
        
        isActive: () => isListening,
        getAudioLevel: () => audioLevel,
        getCurrentSpeaker: () => currentSpeaker,
        getEmotions: () => {
            if (blobs[currentSpeaker]) {
                return blobs[currentSpeaker].emotions;
            }
            return ['neutral'];
        },
        
        // Configuration functions
        setConnectionsEnabled: (enabled) => {
            connectBlobs = enabled;
        },
        
        setGridSize: (size) => {
            gridsize = Math.max(20, Math.min(100, size));
            // Reinitialize grid
            grid = [];
            for (let i = 0; i < gridsize; i++) {
                grid[i] = [];
                for (let j = 0; j < gridsize; j++) {
                    grid[i][j] = 0;
                }
            }
        },
        
        getGridSize: () => gridsize,
        
        setBlobParameter: (blobIndex, parameter, value) => {
            if (blobs[blobIndex] && blobs[blobIndex].target[parameter] !== undefined) {
                blobs[blobIndex].target[parameter] = value;
            }
        },
        
        // Volume effects control
        setVolumeEffectsEnabled: (enabled) => {
            volumeEffectsEnabled = enabled;
            console.log(`🔊 Volume effects ${enabled ? 'enabled' : 'disabled'}`);
        },
        
        getVolumeEffectsEnabled: () => volumeEffectsEnabled,
        
        // Microphone selection for blobs
        setBlobMicrophone: async (blobIndex, deviceId) => {
            if (blobIndex < 0 || blobIndex >= blobs.length) return;
            
            try {
                // Stop existing microphone for this blob
                if (blobMicrophones[blobIndex]) {
                    blobMicrophones[blobIndex].stop();
                }
                
                // Create new microphone input for this blob
                const constraints = deviceId === 'default' ? 
                    { audio: true } : 
                    { audio: { deviceId: { exact: deviceId } } };
                
                blobMicrophones[blobIndex] = new p5.AudioIn();
                blobFFTs[blobIndex] = new p5.FFT(0.8, 256);
                blobAmplitudes[blobIndex] = new p5.Amplitude();
                
                // Set up audio chain
                blobFFTs[blobIndex].setInput(blobMicrophones[blobIndex]);
                blobAmplitudes[blobIndex].setInput(blobMicrophones[blobIndex]);
                
                // Start the microphone
                await blobMicrophones[blobIndex].start();
                
                console.log(`🎤 Blob ${blobIndex} assigned to microphone: ${deviceId}`);
                return true;
            } catch (error) {
                console.error(`❌ Failed to assign microphone to blob ${blobIndex}:`, error);
                return false;
            }
        },
        
        // Get individual blob audio levels
        getBlobAudioLevel: (blobIndex) => {
            if (blobIndex >= 0 && blobIndex < blobAudioLevels.length) {
                return blobAudioLevels[blobIndex];
            }
            return 0;
        }
    };
    
    // Store frequency data globally for UI access
    window.liveVisualizationP5 = {
        bassLevel: 0,
        midLevel: 0,
        trebleLevel: 0
    };
    
    // Update global frequency data for UI
    setInterval(() => {
        if (window.liveVisualizationP5) {
            window.liveVisualizationP5.bassLevel = bassLevel;
            window.liveVisualizationP5.midLevel = midLevel;
            window.liveVisualizationP5.trebleLevel = trebleLevel;
        }
    }, 100);
    
    console.log(`🚀 [${sketchInstanceId}] Enhanced live visualization ready with advanced features!`);
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎬 Initializing enhanced live visualization...');
    
    // Wait for container to be ready
    setTimeout(() => {
        const container = document.getElementById('live-canvas-container');
        if (container) {
            // Create p5 instance
            const liveVisualizationInstance = new p5(p5SketchLiveFunction, 'live-canvas-container');
            
            // Store reference globally
            window.liveVisualizationP5Instance = liveVisualizationInstance;
            
            console.log('✅ Enhanced live visualization instance created');
        } else {
            console.error('❌ Canvas container not ready, retrying...');
            setTimeout(() => {
                const retryContainer = document.getElementById('live-canvas-container');
                if (retryContainer) {
                    new p5(p5SketchLiveFunction, 'live-canvas-container');
                    console.log('✅ Enhanced live visualization instance created (retry)');
                }
            }, 500);
        }
    }, 100);
}); 