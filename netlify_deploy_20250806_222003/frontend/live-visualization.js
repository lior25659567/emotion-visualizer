// Live Emotion Visualization System
// Based on microphone input with real-time emotion detection and visualization

let liveVisualization = {
    // Core components
    mic: null,
    fft: null,
    amplitude: null,
    isRecording: false,
    
    // Canvas and visual properties
    canvas: null,
    particles: [],
    emotionWaves: [],
    currentEmotion: 'neutral',
    emotionIntensity: 0,
    
    // Audio analysis
    audioLevel: 0,
    frequencyData: [],
    dominantFreq: 0,
    
    // Emotion detection
    emotionHistory: [],
    emotionConfidence: 0,
    lastEmotionUpdate: 0,
    
    // Visual effects
    backgroundHue: 200,
    pulseRadius: 0,
    waveOffset: 0,
    particleCount: 50,
    
    // Emotion mapping
    emotions: {
        neutral: { color: [200, 50, 70], emoji: '😐', name: 'ניטרלי' },
        happy: { color: [60, 80, 90], emoji: '😊', name: 'שמח' },
        sad: { color: [240, 60, 50], emoji: '😢', name: 'עצוב' },
        angry: { color: [0, 80, 80], emoji: '😠', name: 'כועס' },
        excited: { color: [30, 90, 95], emoji: '🤩', name: 'נרגש' },
        calm: { color: [120, 40, 80], emoji: '😌', name: 'רגוע' },
        anxious: { color: [280, 70, 60], emoji: '😰', name: 'חרד' },
        focused: { color: [180, 60, 75], emoji: '🤔', name: 'מרוכז' }
    }
};

// Initialize the live visualization system
function initializeLiveVisualization() {
    console.log('🎤 Initializing Live Emotion Visualization System');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize p5.js sketch
    new p5(liveVisualizationSketch, 'live-canvas-container');
}

// Set up event listeners for controls
function setupEventListeners() {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    if (startBtn) {
        startBtn.addEventListener('click', startLiveVisualization);
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopLiveVisualization);
    }
}

// Start live visualization
async function startLiveVisualization() {
    console.log('🎬 Starting live visualization...');
    
    try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Update UI
        updateUI('recording');
        
        // Initialize audio components in p5.js
        if (liveVisualization.mic) {
            liveVisualization.mic.start();
            liveVisualization.isRecording = true;
            console.log('✅ Microphone started successfully');
        }
        
    } catch (error) {
        console.error('❌ Failed to start microphone:', error);
        alert('שגיאה: לא ניתן לגשת למיקרופון. אנא בדק את ההרשאות בדפדפן.');
        updateUI('stopped');
    }
}

// Stop live visualization
function stopLiveVisualization() {
    console.log('🛑 Stopping live visualization...');
    
    if (liveVisualization.mic) {
        liveVisualization.mic.stop();
        liveVisualization.isRecording = false;
    }
    
    // Reset visualization state
    resetVisualizationState();
    
    // Update UI
    updateUI('stopped');
    
    console.log('✅ Live visualization stopped');
}

// Update UI based on state
function updateUI(state) {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const statusIndicator = document.getElementById('status-indicator');
    const micStatus = document.getElementById('mic-status');
    
    if (state === 'recording') {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'flex';
        stopBtn.classList.add('recording');
        statusIndicator.classList.add('active');
        micStatus.textContent = '🎤 מיקרופון: פעיל';
        micStatus.classList.add('active');
    } else {
        startBtn.style.display = 'flex';
        stopBtn.style.display = 'none';
        stopBtn.classList.remove('recording');
        statusIndicator.classList.remove('active');
        micStatus.textContent = '🎤 מיקרופון: כבוי';
        micStatus.classList.remove('active');
    }
}

// Reset visualization state
function resetVisualizationState() {
    liveVisualization.audioLevel = 0;
    liveVisualization.emotionIntensity = 0;
    liveVisualization.currentEmotion = 'neutral';
    liveVisualization.emotionHistory = [];
    liveVisualization.particles = [];
    liveVisualization.emotionWaves = [];
    
    // Reset UI displays
    updateMetrics(0, 0, 'neutral', 0);
}

// Update live metrics display
function updateMetrics(audioLevel, frequency, emotion, confidence) {
    const audioLevelEl = document.getElementById('audio-level');
    const frequencyEl = document.getElementById('frequency-display');
    const emotionIntensityEl = document.getElementById('emotion-intensity');
    
    if (audioLevelEl) {
        audioLevelEl.textContent = `רמת שמע: ${Math.round(audioLevel * 100)}%`;
        audioLevelEl.classList.toggle('active', audioLevel > 0.1);
    }
    
    if (frequencyEl) {
        frequencyEl.textContent = `תדר: ${Math.round(frequency)} Hz`;
        frequencyEl.classList.toggle('active', frequency > 0);
    }
    
    if (emotionIntensityEl) {
        emotionIntensityEl.textContent = `עוצמה רגשית: ${Math.round(confidence * 100)}%`;
        emotionIntensityEl.classList.toggle('active', confidence > 0.3);
    }
}

// Update emotion display
function updateEmotionDisplay(emotion, confidence) {
    const emotionDisplay = document.getElementById('emotion-display');
    const currentEmotionEl = document.getElementById('current-emotion');
    const emotionNameEl = document.getElementById('emotion-name');
    const emotionConfidenceEl = document.getElementById('emotion-confidence');
    
    if (confidence > 0.3) {
        const emotionData = liveVisualization.emotions[emotion];
        
        if (currentEmotionEl) currentEmotionEl.textContent = emotionData.emoji;
        if (emotionNameEl) emotionNameEl.textContent = emotionData.name;
        if (emotionConfidenceEl) emotionConfidenceEl.textContent = `ביטחון: ${Math.round(confidence * 100)}%`;
        
        emotionDisplay.classList.add('visible');
        
        // Hide after 3 seconds
        setTimeout(() => {
            emotionDisplay.classList.remove('visible');
        }, 3000);
    }
}

// p5.js Sketch for Live Visualization
function liveVisualizationSketch(p) {
    
    p.setup = function() {
        // Create canvas
        liveVisualization.canvas = p.createCanvas(p.windowWidth, p.windowHeight - 140);
        liveVisualization.canvas.parent('live-canvas-container');
        
        // Set color mode
        p.colorMode(p.HSB, 360, 100, 100, 100);
        
        // Initialize audio components
        liveVisualization.mic = new p5.AudioIn();
        liveVisualization.fft = new p5.FFT(0.8, 1024);
        liveVisualization.amplitude = new p5.Amplitude();
        
        // Connect microphone to analyzers
        liveVisualization.fft.setInput(liveVisualization.mic);
        liveVisualization.amplitude.setInput(liveVisualization.mic);
        
        // Initialize particles
        initializeParticles();
        
        console.log('✅ Live visualization canvas initialized');
    };
    
    p.draw = function() {
        // Dynamic background based on current emotion
        const emotionColor = liveVisualization.emotions[liveVisualization.currentEmotion].color;
        const bgAlpha = p.map(liveVisualization.emotionIntensity, 0, 1, 5, 20);
        p.background(emotionColor[0], emotionColor[1], emotionColor[2], bgAlpha);
        
        if (liveVisualization.isRecording) {
            // Analyze audio
            analyzeAudio();
            
            // Update emotion detection
            updateEmotionDetection();
            
            // Draw visualizations
            drawAudioWaveform();
            drawFrequencySpectrum();
            drawEmotionWaves();
            drawParticles();
            drawCentralPulse();
            
            // Update metrics
            updateMetrics(
                liveVisualization.audioLevel,
                liveVisualization.dominantFreq,
                liveVisualization.currentEmotion,
                liveVisualization.emotionConfidence
            );
        } else {
            // Draw idle state
            drawIdleState();
        }
        
        // Update wave offset for animation
        liveVisualization.waveOffset += 0.02;
    };
    
    // Analyze incoming audio
    function analyzeAudio() {
        // Get audio level
        liveVisualization.audioLevel = liveVisualization.amplitude.getLevel();
        
        // Get frequency spectrum
        liveVisualization.frequencyData = liveVisualization.fft.analyze();
        
        // Find dominant frequency
        let maxAmp = 0;
        let maxIndex = 0;
        for (let i = 0; i < liveVisualization.frequencyData.length; i++) {
            if (liveVisualization.frequencyData[i] > maxAmp) {
                maxAmp = liveVisualization.frequencyData[i];
                maxIndex = i;
            }
        }
        liveVisualization.dominantFreq = p.map(maxIndex, 0, liveVisualization.frequencyData.length, 0, 22050);
    }
    
    // Update emotion detection based on audio characteristics
    function updateEmotionDetection() {
        const now = p.millis();
        
        // Emotion detection every 500ms
        if (now - liveVisualization.lastEmotionUpdate > 500) {
            const detectedEmotion = detectEmotionFromAudio();
            
            // Add to history
            liveVisualization.emotionHistory.push(detectedEmotion);
            if (liveVisualization.emotionHistory.length > 10) {
                liveVisualization.emotionHistory.shift();
            }
            
            // Calculate dominant emotion
            const emotionCounts = {};
            liveVisualization.emotionHistory.forEach(emotion => {
                emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
            });
            
            let dominantEmotion = 'neutral';
            let maxCount = 0;
            for (const emotion in emotionCounts) {
                if (emotionCounts[emotion] > maxCount) {
                    maxCount = emotionCounts[emotion];
                    dominantEmotion = emotion;
                }
            }
            
            // Update current emotion if confidence is high enough
            const confidence = maxCount / liveVisualization.emotionHistory.length;
            if (confidence > 0.4 && dominantEmotion !== liveVisualization.currentEmotion) {
                liveVisualization.currentEmotion = dominantEmotion;
                liveVisualization.emotionConfidence = confidence;
                updateEmotionDisplay(dominantEmotion, confidence);
            }
            
            liveVisualization.lastEmotionUpdate = now;
        }
    }
    
    // Simple emotion detection based on audio characteristics
    function detectEmotionFromAudio() {
        const audioLevel = liveVisualization.audioLevel;
        const dominantFreq = liveVisualization.dominantFreq;
        
        // Basic emotion mapping based on audio characteristics
        if (audioLevel < 0.05) {
            return 'calm';
        } else if (audioLevel > 0.3 && dominantFreq > 1000) {
            return 'excited';
        } else if (audioLevel > 0.2 && dominantFreq < 500) {
            return 'angry';
        } else if (dominantFreq > 800 && audioLevel > 0.1) {
            return 'happy';
        } else if (dominantFreq < 300 && audioLevel > 0.1) {
            return 'sad';
        } else if (audioLevel > 0.15) {
            return 'focused';
        } else {
            return 'neutral';
        }
    }
    
    // Draw audio waveform
    function drawAudioWaveform() {
        p.stroke(360, 0, 100, 50);
        p.strokeWeight(2);
        p.noFill();
        
        p.beginShape();
        for (let i = 0; i < p.width; i += 5) {
            const waveHeight = p.map(liveVisualization.audioLevel, 0, 1, 0, 200);
            const y = p.height / 2 + p.sin(i * 0.01 + liveVisualization.waveOffset) * waveHeight;
            p.vertex(i, y);
        }
        p.endShape();
    }
    
    // Draw frequency spectrum
    function drawFrequencySpectrum() {
        const barWidth = p.width / liveVisualization.frequencyData.length;
        
        for (let i = 0; i < liveVisualization.frequencyData.length; i++) {
            const barHeight = p.map(liveVisualization.frequencyData[i], 0, 255, 0, p.height / 3);
            const hue = p.map(i, 0, liveVisualization.frequencyData.length, 0, 360);
            
            p.fill(hue, 70, 80, 30);
            p.noStroke();
            p.rect(i * barWidth, p.height - barHeight, barWidth, barHeight);
        }
    }
    
    // Draw emotion-based waves
    function drawEmotionWaves() {
        const emotionColor = liveVisualization.emotions[liveVisualization.currentEmotion].color;
        
        for (let layer = 0; layer < 3; layer++) {
            p.stroke(emotionColor[0], emotionColor[1], emotionColor[2], 30 - layer * 10);
            p.strokeWeight(3 - layer);
            p.noFill();
            
            p.beginShape();
            for (let x = 0; x <= p.width; x += 10) {
                const waveHeight = p.map(liveVisualization.emotionIntensity, 0, 1, 10, 100);
                const y = p.height / 2 + 
                         p.sin(x * 0.01 + liveVisualization.waveOffset + layer * 0.5) * waveHeight +
                         p.cos(x * 0.005 + liveVisualization.waveOffset * 0.7) * waveHeight * 0.5;
                p.vertex(x, y);
            }
            p.endShape();
        }
    }
    
    // Initialize particles
    function initializeParticles() {
        liveVisualization.particles = [];
        for (let i = 0; i < liveVisualization.particleCount; i++) {
            liveVisualization.particles.push({
                x: p.random(p.width),
                y: p.random(p.height),
                vx: p.random(-2, 2),
                vy: p.random(-2, 2),
                size: p.random(2, 8),
                hue: p.random(360),
                alpha: p.random(20, 60)
            });
        }
    }
    
    // Draw and update particles
    function drawParticles() {
        const emotionColor = liveVisualization.emotions[liveVisualization.currentEmotion].color;
        
        liveVisualization.particles.forEach(particle => {
            // Update position
            particle.x += particle.vx * (1 + liveVisualization.audioLevel * 5);
            particle.y += particle.vy * (1 + liveVisualization.audioLevel * 5);
            
            // Wrap around screen
            if (particle.x < 0) particle.x = p.width;
            if (particle.x > p.width) particle.x = 0;
            if (particle.y < 0) particle.y = p.height;
            if (particle.y > p.height) particle.y = 0;
            
            // Draw particle
            const size = particle.size * (1 + liveVisualization.audioLevel * 3);
            p.fill(emotionColor[0], emotionColor[1], emotionColor[2], particle.alpha);
            p.noStroke();
            p.ellipse(particle.x, particle.y, size);
        });
    }
    
    // Draw central pulse
    function drawCentralPulse() {
        const emotionColor = liveVisualization.emotions[liveVisualization.currentEmotion].color;
        
        // Update pulse radius
        liveVisualization.pulseRadius = p.map(liveVisualization.audioLevel, 0, 1, 20, 200);
        
        // Draw multiple pulse rings
        for (let i = 0; i < 5; i++) {
            const alpha = p.map(i, 0, 4, 40, 5);
            const radius = liveVisualization.pulseRadius + i * 20;
            
            p.stroke(emotionColor[0], emotionColor[1], emotionColor[2], alpha);
            p.strokeWeight(3 - i * 0.5);
            p.noFill();
            p.ellipse(p.width / 2, p.height / 2, radius * 2);
        }
    }
    
    // Draw idle state when not recording
    function drawIdleState() {
        p.fill(200, 30, 80, 20);
        p.noStroke();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(24);
        p.text('לחץ על "התחל הקלטה" כדי להתחיל', p.width / 2, p.height / 2);
        
        // Draw gentle breathing animation
        const breatheSize = 50 + p.sin(p.millis() * 0.003) * 20;
        p.fill(200, 50, 70, 30);
        p.ellipse(p.width / 2, p.height / 2 + 100, breatheSize * 2);
    }
    
    // Handle window resize
    p.windowResized = function() {
        p.resizeCanvas(p.windowWidth, p.windowHeight - 140);
        initializeParticles(); // Reinitialize particles for new canvas size
    };
}

// Export for global access
window.liveVisualization = liveVisualization;
window.initializeLiveVisualization = initializeLiveVisualization;
window.startLiveVisualization = startLiveVisualization;
window.stopLiveVisualization = stopLiveVisualization;

console.log('🎵 Live Visualization JavaScript loaded successfully'); 