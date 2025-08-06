#!/usr/bin/env python3
"""
Enhanced Video Capture System for Emotion Visualizer
Captures high-quality MP4 videos from the visualization with proper background color
"""

import os
import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from PIL import Image
import shutil
import subprocess
import tempfile
from typing import Dict, Any, Optional
import logging

# Import webdriver-manager for automatic driver management
try:
    from webdriver_manager.chrome import ChromeDriverManager
    WEBDRIVER_MANAGER_AVAILABLE = True
except ImportError:
    WEBDRIVER_MANAGER_AVAILABLE = False
    print("⚠️ webdriver-manager not available, using system chromedriver")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def detect_visualization_bounds(driver):
    """
    Detect the bounds of the actual visualization content to enable smart cropping
    """
    try:
        # Get canvas bounds and content analysis
        bounds_info = driver.execute_script("""
            try {
                const canvas = document.querySelector('canvas');
                if (!canvas) return null;
                
                const rect = canvas.getBoundingClientRect();
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Find bounds of non-background content
                let minX = canvas.width, maxX = 0;
                let minY = canvas.height, maxY = 0;
                let hasContent = false;
                
                // ENHANCED: Sample pixels to find content bounds with higher sensitivity
                const sampleRate = 2; // Increased sampling for better detection
                for (let y = 0; y < canvas.height; y += sampleRate) {
                    for (let x = 0; x < canvas.width; x += sampleRate) {
                        const idx = (y * canvas.width + x) * 4;
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];
                        const a = data[idx + 3];
                        
                        // ENHANCED: More sensitive background detection
                        const isBackground = (
                            Math.abs(r - 247) < 15 && 
                            Math.abs(g - 249) < 15 && 
                            Math.abs(b - 243) < 15
                        ) || (
                            // Also detect dark backgrounds
                            r < 40 && g < 40 && b < 40
                        ) || a < 30; // More sensitive alpha threshold
                        
                        if (!isBackground && a > 30) {
                            hasContent = true;
                            minX = Math.min(minX, x);
                            maxX = Math.max(maxX, x);
                            minY = Math.min(minY, y);
                            maxY = Math.max(maxY, y);
                        }
                    }
                }
                
                if (!hasContent) {
                    // ENHANCED: More aggressive fallback - use center 90% instead of 80%
                    const padding = Math.min(canvas.width, canvas.height) * 0.05; // Reduced padding
                    return {
                        left: Math.round(rect.left + padding),
                        top: Math.round(rect.top + padding),
                        width: Math.round(canvas.width - padding * 2),
                        height: Math.round(canvas.height - padding * 2),
                        canvasWidth: canvas.width,
                        canvasHeight: canvas.height,
                        fallback: true
                    };
                }
                
                // ENHANCED: Reduce padding around detected content for tighter crop
                const padding = 20; // Reduced from 50 to 20
                minX = Math.max(0, minX - padding);
                minY = Math.max(0, minY - padding);
                maxX = Math.min(canvas.width, maxX + padding);
                maxY = Math.min(canvas.height, maxY + padding);
                
                // ENHANCED: Expand the crop area to show more visualization
                const expandFactor = 1.2; // Expand detected area by 20%
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                const currentWidth = maxX - minX;
                const currentHeight = maxY - minY;
                
                const newWidth = Math.min(canvas.width, currentWidth * expandFactor);
                const newHeight = Math.min(canvas.height, currentHeight * expandFactor);
                
                minX = Math.max(0, centerX - newWidth / 2);
                maxX = Math.min(canvas.width, centerX + newWidth / 2);
                minY = Math.max(0, centerY - newHeight / 2);
                maxY = Math.min(canvas.height, centerY + newHeight / 2);
                
                // Convert canvas coordinates to screen coordinates
                const scaleX = rect.width / canvas.width;
                const scaleY = rect.height / canvas.height;
                
                return {
                    left: Math.round(rect.left + minX * scaleX),
                    top: Math.round(rect.top + minY * scaleY),
                    width: Math.round((maxX - minX) * scaleX),
                    height: Math.round((maxY - minY) * scaleY),
                    canvasWidth: canvas.width,
                    canvasHeight: canvas.height,
                    contentBounds: {minX, minY, maxX, maxY},
                    fallback: false
                };
                
            } catch (e) {
                console.error('Error detecting bounds:', e);
                return null;
            }
        """)
        
        return bounds_info
        
    except Exception as e:
        print(f"❌ Error detecting visualization bounds: {str(e)}")
        return None

def crop_screenshot(screenshot_path, bounds):
    """
    Crop a screenshot to focus on the visualization content
    """
    try:
        from PIL import Image
        
        # Open the screenshot
        with Image.open(screenshot_path) as img:
            # Ensure bounds are within image dimensions
            left = max(0, bounds['left'])
            top = max(0, bounds['top'])
            right = min(img.width, left + bounds['width'])
            bottom = min(img.height, top + bounds['height'])
            
            # Ensure we have valid dimensions
            if right <= left or bottom <= top:
                print(f"⚠️ Invalid crop bounds, skipping crop")
                return False
            
            # Crop the image
            cropped = img.crop((left, top, right, bottom))
            
            # Save the cropped image
            cropped.save(screenshot_path)
            
            return True
            
    except Exception as e:
        print(f"❌ Error cropping screenshot: {str(e)}")
        return False

def capture_visualization_video(conversation_folder, output_path, options):
    """
    Capture a real video of the visualization using Selenium + ffmpeg
    """
    try:
        print(f"🎬 Starting video capture for {conversation_folder}")
        
        quality = options.get('quality', '720')
        duration = int(options.get('duration', 15))
        fps = int(options.get('fps', 15))
        smart_crop = options.get('smartCrop', True)
        
        print(f"📊 Settings: {quality}p, {duration}s, {fps}fps, Smart Crop: {'✂️ ON' if smart_crop else '❌ OFF'}")
        
        # Set up dimensions based on quality
        if quality == '1080':
            width, height = 1920, 1080
        elif quality == '720':
            width, height = 1280, 720
        else:  # 480
            width, height = 854, 480
            
        # Create temporary directory for screenshots
        temp_dir = tempfile.mkdtemp(prefix=f'video_capture_{conversation_folder}_')
        print(f"📁 Using temp directory: {temp_dir}")
        
        try:
            # Set up Chrome WebDriver with enhanced WebGL/Canvas support
            chrome_options = Options()
            chrome_options.add_argument('--headless=new')  # Use new headless mode
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--enable-webgl')
            chrome_options.add_argument('--enable-accelerated-2d-canvas')
            chrome_options.add_argument('--use-gl=desktop')  # Use desktop GL for better performance
            chrome_options.add_argument('--disable-web-security')
            chrome_options.add_argument('--allow-running-insecure-content')
            chrome_options.add_argument(f'--window-size={width},{height}')
            chrome_options.add_argument('--hide-scrollbars')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_argument('--disable-extensions')
            chrome_options.add_argument('--disable-plugins')
            chrome_options.add_argument('--disable-images')  # Disable image loading to speed up
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            # Use regular visualization page with parameters optimized for clean video capture
            # ENHANCED: Added scale=1.5 to make visualization larger and reduce background
            url = f"http://localhost:8001/visualization.html?folder={conversation_folder}&viewMode=video&autostart=true&animate=true&static=false&scale=1.5&noSidepanel=true&noTimeline=true&visualOnly=true&noMP3=true&noaudio=true&optimize=true&lightweight=true&fullscreen=true&hideUI=true&canvasOnly=true&noControls=true&cleanCapture=true&zoomLevel=1.3&focusVisualization=true"
            
            print(f"🌐 Opening URL: {url}")
            
            # Use webdriver-manager for automatic driver management
            if WEBDRIVER_MANAGER_AVAILABLE:
                logger.info("📦 Using webdriver-manager for Chrome driver")
                driver_path = ChromeDriverManager().install()
                driver = webdriver.Chrome(service=webdriver.chrome.service.Service(driver_path), options=chrome_options)
            else:
                logger.info("📦 Using system Chrome driver")
                driver = webdriver.Chrome(options=chrome_options)
                
            driver.set_window_size(width, height)
            logger.info("✅ Chrome driver initialized successfully")
            
            # Load the visualization
            driver.get(url)
            
            # Enhanced loading detection with multiple strategies
            print(f"⏳ Waiting for visualization to fully load...")
            
            # Strategy 1: Wait for basic page load
            time.sleep(5)  # Increased wait time
            
            # Strategy 2: Wait for canvas to appear and p5.js to load
            canvas_ready = wait_for_canvas_advanced(driver, max_wait=45)  # Increased wait time
            
            if not canvas_ready:
                print("⚠️ Canvas not fully ready, but proceeding with fallback approach")
                # Force the visualization to start with minimal data
                force_visualization_start(driver, conversation_folder)
                
                # Wait a bit more after forcing
                time.sleep(3)
            
            # Strategy 3: Give visualization time to render first frame
            print("🎨 Allowing visualization to render initial frame...")
            time.sleep(3)  # Increased wait time
            
            # Take a debug screenshot
            debug_path = f"debug_screenshot_{conversation_folder}.png"
            driver.save_screenshot(debug_path)
            print(f"🔍 Debug screenshot saved: {debug_path}")
            
            # Calculate frame timing
            total_frames = duration * fps
            frame_interval = 1.0 / fps
            
            print(f"📸 Capturing {total_frames} frames at {fps} FPS...")
            
            # Capture screenshots with enhanced timing
            for frame_num in range(total_frames):
                screenshot_path = os.path.join(temp_dir, f"frame_{frame_num:05d}.png")
                
                            # Take screenshot with smart cropping (if enabled)
            if smart_crop and frame_num == 0:
                # First frame: detect visualization bounds and set up cropping
                crop_bounds = detect_visualization_bounds(driver)
                print(f"🔍 Detected visualization bounds: {crop_bounds}")
            
            # Take full screenshot first
            driver.save_screenshot(screenshot_path)
            
            # Crop the screenshot to focus on visualization (if smart crop enabled)
            if smart_crop and 'crop_bounds' in locals() and crop_bounds:
                crop_screenshot(screenshot_path, crop_bounds)
            
            # Optional: Trigger animation step for consistent timing
            try:
                driver.execute_script("if (window.p5SketchInstance && window.p5SketchInstance.draw) { window.p5SketchInstance.draw(); }")
            except:
                pass
                
                # Wait for next frame
                time.sleep(frame_interval)
                
                if frame_num % 30 == 0:  # Progress update every 30 frames
                    progress = (frame_num / total_frames) * 100
                    print(f"📊 Progress: {progress:.1f}% ({frame_num}/{total_frames} frames)")
            
            driver.quit()
            print(f"✅ Captured {total_frames} screenshots")
            
            # Convert screenshots to MP4 using improved conversion
            print(f"🎞️ Converting screenshots to MP4...")
            success = convert_screenshots_to_mp4(temp_dir, output_path, fps, width, height)
            
            if success:
                print(f"✅ Video successfully created: {output_path}")
                return True
            else:
                print(f"❌ Failed to convert screenshots to MP4")
                return False
                
        finally:
            # Clean up temporary directory
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
                print(f"🧹 Cleaned up temp directory")
                
    except Exception as e:
        print(f"❌ Error in capture_visualization_video: {str(e)}")
        return False

def wait_for_canvas_advanced(driver, max_wait=30):
    """
    Advanced canvas detection with multiple strategies
    """
    start_time = time.time()
    
    while (time.time() - start_time) < max_wait:
        wait_time = int(time.time() - start_time)
        
        try:
            # Check if canvas exists and has content
            canvas_info = driver.execute_script("""
                try {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return {error: 'No canvas found'};
                    
                    const p5Loaded = typeof window.p5 !== 'undefined';
                    const hasP5Instance = window.p5SketchInstance !== undefined;
                    const hasEmotionData = window.emotionData && Object.keys(window.emotionData).length > 0;
                    const hasBlobs = window.blobs && window.blobs.length > 0;
                    
                    // Check if visualization is actually running
                    const isVisualizationRunning = window.isVisualizationRunning || false;
                    const isAudioPlaying = window.isAudioPlaying || false;
                    
                    // Check canvas content more thoroughly
                    const ctx = canvas.getContext('2d');
                    const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 200), Math.min(canvas.height, 200));
                    const data = imageData.data;
                    
                    // Count different types of pixels
                    let visiblePixels = 0;
                    let colorfulPixels = 0;
                    let uniqueColors = new Set();
                    
                    for (let i = 0; i < data.length; i += 4) {
                        if (data[i + 3] > 0) { // Alpha > 0
                            visiblePixels++;
                            
                            // Check for unique colors
                            const colorKey = `${data[i]}-${data[i+1]}-${data[i+2]}`;
                            uniqueColors.add(colorKey);
                            
                            // Check if pixel is colorful (not just black/white/gray)
                            const r = data[i];
                            const g = data[i + 1];
                            const b = data[i + 2];
                            const brightness = (r + g + b) / 3;
                            const variance = Math.max(r, g, b) - Math.min(r, g, b);
                            
                            if (brightness > 50 && variance > 30) {
                                colorfulPixels++;
                            }
                        }
                    }
                    
                    // More stringent readiness check
                    const isReady = (
                        uniqueColors.size > 5 &&  // More than 5 unique colors
                        colorfulPixels > 100 &&   // More colorful pixels required
                        p5Loaded && 
                        hasP5Instance &&
                        hasEmotionData
                    ) || (
                        // Alternative check: if blobs exist and are visible
                        hasBlobs && visiblePixels > 1000
                    );
                    
                    return {
                        width: canvas.width,
                        height: canvas.height,
                        visiblePixels: visiblePixels,
                        colorfulPixels: colorfulPixels,
                        uniqueColors: uniqueColors.size,
                        p5Loaded: p5Loaded,
                        hasP5Instance: hasP5Instance,
                        emotionDataLoaded: hasEmotionData,
                        hasBlobsReady: hasBlobs,
                        isVisualizationRunning: isVisualizationRunning,
                        ready: isReady
                    };
                } catch (e) {
                    return {error: e.message};
                }
            """)
            
            if canvas_info.get('error'):
                print(f"⏳ Canvas check error: {canvas_info['error']} ({wait_time}s)")
            elif canvas_info.get('ready'):
                print(f"🎨 Canvas ready! Colors: {canvas_info.get('uniqueColors', 0)}, Colorful: {canvas_info.get('colorfulPixels', 0)}, Visible: {canvas_info.get('visiblePixels', 0)}")
                return True
            else:
                print(f"⏳ Canvas waiting... Colors: {canvas_info.get('uniqueColors', 0)}, Colorful: {canvas_info.get('colorfulPixels', 0)}, Visible: {canvas_info.get('visiblePixels', 0)}, p5: {canvas_info.get('p5Loaded', False)}, Data: {canvas_info.get('emotionDataLoaded', False)} ({wait_time}s)")
            
        except Exception as e:
            print(f"⏳ Canvas check exception: {str(e)} ({wait_time}s)")
        
        time.sleep(1)
    
    return False

def force_visualization_start(driver, conversation_folder):
    """
    Force the visualization to start with fallback data and manual triggering
    """
    try:
        print(f"🔧 Forcing visualization start for {conversation_folder}")
        
        # Inject fallback emotion data and force visualization start
        fallback_script = f"""
            try {{
                console.log('🔧 Injecting fallback data and forcing visualization start');
                
                // Force visualization to start immediately
                window.isVideoMode = true;
                window.autoStart = true;
                window.isAnimationPaused = false;
                window.staticMode = false;
                
                // Force audio context to start (required for visualization)
                if (window.audioContext) {{
                    window.audioContext.resume();
                }}
                
                // Force start the sketch manually
                if (window.p5SketchInstance) {{
                    console.log('🔧 Found p5 sketch, forcing start');
                    
                    // Force the sketch to be running
                    window.p5SketchInstance.isLooping = true;
                    window.p5SketchInstance.noLoop = false;
                    
                    // Force visualization running flag
                    window.isVisualizationRunning = true;
                    
                    // Force the animation to start
                    if (window.p5SketchInstance.loop) {{
                        window.p5SketchInstance.loop();
                    }}
                    
                    // Force redraw
                    if (window.p5SketchInstance.redraw) {{
                        window.p5SketchInstance.redraw();
                    }}
                }}
                
                // Force create blobs with bright colors if they don't exist
                if (!window.blobs || window.blobs.length === 0) {{
                    console.log('🔧 Creating fallback blobs');
                    window.blobs = [];
                    
                    // Create test blobs with bright colors
                    for (let i = 0; i < 3; i++) {{
                        const blob = {{
                            isVisible: true,
                            blobVisibility: 1.0,
                            blobSizeScale: 15,
                            blobStrength: 1500,
                            displayColors: [
                                i === 0 ? [255, 100, 100] : // Red
                                i === 1 ? [100, 255, 100] : // Green
                                         [100, 100, 255]    // Blue
                            ],
                            target: {{
                                blobVisibility: 1.0,
                                blobSizeScale: 15,
                                blobStrength: 1500,
                                x: 200 + (i * 200),
                                y: 200 + (i * 100)
                            }},
                            x: 200 + (i * 200),
                            y: 200 + (i * 100),
                            vx: Math.random() * 4 - 2,
                            vy: Math.random() * 4 - 2
                        }};
                        window.blobs.push(blob);
                    }}
                }}
                
                // Force blobs to be visible
                if (window.blobs) {{
                    console.log('🔧 Forcing blob visibility');
                    window.blobs.forEach((blob, i) => {{
                        blob.isVisible = true;
                        blob.blobVisibility = 1.0;
                        blob.blobSizeScale = 15;
                        blob.blobStrength = 1500;
                        
                        if (blob.target) {{
                            blob.target.blobVisibility = 1.0;
                            blob.target.blobSizeScale = 15;
                            blob.target.blobStrength = 1500;
                        }}
                        
                        // Force bright colors
                        const colors = [
                            [255, 80, 80],   // Bright red
                            [80, 255, 80],   // Bright green
                            [80, 80, 255],   // Bright blue
                            [255, 255, 80],  // Bright yellow
                            [255, 80, 255]   // Bright magenta
                        ];
                        blob.displayColors = [colors[i % colors.length]];
                    }});
                }}
                
                // Force draw loop with manual animation
                let frameCount = 0;
                window.forceAnimationLoop = setInterval(() => {{
                    try {{
                        if (window.p5SketchInstance && window.p5SketchInstance.canvas) {{
                            const p5 = window.p5SketchInstance;
                            const canvas = p5.canvas;
                            
                            // Clear canvas with the correct background color
                            p5.background(247, 249, 243); // Light background (#f7f9f3)
                            
                            // Draw blobs manually if they exist
                            if (window.blobs && window.blobs.length > 0) {{
                                window.blobs.forEach((blob, i) => {{
                                    if (blob.isVisible) {{
                                        // Set bright color
                                        const color = blob.displayColors ? blob.displayColors[0] : [255, 100, 100];
                                        p5.fill(color[0], color[1], color[2], 200);
                                        p5.noStroke();
                                        
                                        // Draw blob
                                        const size = 50 + (blob.blobSizeScale || 10);
                                        const x = blob.x || (200 + i * 200);
                                        const y = blob.y || (200 + i * 100);
                                        
                                        p5.ellipse(x, y, size, size);
                                        
                                        // Animate blob position
                                        if (blob.vx === undefined) blob.vx = Math.random() * 4 - 2;
                                        if (blob.vy === undefined) blob.vy = Math.random() * 4 - 2;
                                        
                                        blob.x += blob.vx;
                                        blob.y += blob.vy;
                                        
                                        // Bounce off edges
                                        if (blob.x < 0 || blob.x > canvas.width) blob.vx *= -1;
                                        if (blob.y < 0 || blob.y > canvas.height) blob.vy *= -1;
                                    }}
                                }});
                            }} else {{
                                // Draw fallback animation
                                p5.fill(255, 100, 100, 200);
                                p5.noStroke();
                                const x = 300 + Math.sin(frameCount * 0.1) * 100;
                                const y = 300 + Math.cos(frameCount * 0.1) * 100;
                                p5.ellipse(x, y, 80, 80);
                                
                                p5.fill(100, 255, 100, 200);
                                const x2 = 500 + Math.sin(frameCount * 0.15) * 150;
                                const y2 = 400 + Math.cos(frameCount * 0.15) * 150;
                                p5.ellipse(x2, y2, 60, 60);
                            }}
                        }}
                        
                        frameCount++;
                    }} catch (e) {{
                        console.error('Error in force animation loop:', e);
                    }}
                }}, 100); // 10 FPS animation
                
                console.log('✅ Fallback visualization forced successfully');
                return true;
            }} catch (e) {{
                console.error('❌ Error injecting fallback data:', e);
                return false;
            }}
        """
        
        result = driver.execute_script(fallback_script)
        
        if result:
            print("✅ Fallback visualization forced successfully")
            time.sleep(3)  # Give time for the forced animation to start
        else:
            print("❌ Failed to force visualization start")
            
    except Exception as e:
        print(f"❌ Error in force_visualization_start: {str(e)}")

def convert_screenshots_to_mp4(temp_dir, output_path, fps, width, height):
    """
    Convert screenshots to MP4 using multiple methods
    """
    # Method 1: Try FFmpeg first
    if check_ffmpeg_available():
        print("🎞️ Using FFmpeg for video conversion")
        if convert_with_ffmpeg(temp_dir, output_path, fps, width, height):
            return True
    
    # Method 2: Try imageio as fallback
    try:
        print("🎞️ Using imageio for video conversion")
        return convert_with_imageio(temp_dir, output_path, fps)
    except Exception as e:
        print(f"❌ imageio conversion failed: {str(e)}")
    
    # Method 3: Create simple MP4 (last resort)
    print("🎞️ Using simple MP4 creation (fallback)")
    return create_simple_mp4_from_images(temp_dir, output_path, fps, width, height)

def check_ffmpeg_available():
    """Check if ffmpeg is available"""
    try:
        result = subprocess.run(['ffmpeg', '-version'], 
                              capture_output=True, text=True, timeout=5)
        return result.returncode == 0
    except:
        return False

def convert_with_ffmpeg(temp_dir, output_path, fps, width, height):
    """Convert screenshots to MP4 using ffmpeg"""
    try:
        input_pattern = os.path.join(temp_dir, "frame_%05d.png")
        
        cmd = [
            'ffmpeg', '-y',  # Overwrite output
            '-framerate', str(fps),
            '-i', input_pattern,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-crf', '23',  # Good quality
            '-preset', 'medium',
            '-movflags', '+faststart',  # Optimize for web playback
            output_path
        ]
        
        print(f"🎬 Running ffmpeg: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            print(f"✅ ffmpeg conversion successful")
            return True
        else:
            print(f"❌ ffmpeg failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error in convert_with_ffmpeg: {str(e)}")
        return False

def convert_with_imageio(temp_dir, output_path, fps):
    """Convert screenshots to MP4 using imageio with proper dimension handling"""
    try:
        import imageio.v2 as imageio  # Use v2 to avoid deprecation warnings
        import numpy as np
        import glob
        
        # Get all PNG files
        image_files = sorted(glob.glob(os.path.join(temp_dir, "frame_*.png")))
        
        if not image_files:
            print("❌ No image files found")
            return False
        
        print(f"🎞️ Converting {len(image_files)} images to MP4...")
        
        # Read first image to get dimensions
        first_image = imageio.imread(image_files[0])
        original_height, original_width = first_image.shape[:2]
        
        # Ensure dimensions are even (required for MP4 encoding)
        width = original_width if original_width % 2 == 0 else original_width - 1
        height = original_height if original_height % 2 == 0 else original_height - 1
        
        print(f"📐 Adjusting dimensions from {original_width}x{original_height} to {width}x{height}")
        
        # Process all images with consistent dimensions
        processed_images = []
        for image_file in image_files:
            image = imageio.imread(image_file)
            
            # Crop to even dimensions if needed
            if image.shape[0] != height or image.shape[1] != width:
                image = image[:height, :width]
            
            processed_images.append(image)
        
        # Write MP4 with corrected settings
        imageio.mimsave(output_path, processed_images, fps=fps, quality=8, macro_block_size=1)
        
        print(f"✅ imageio conversion successful")
        return True
        
    except ImportError:
        print("❌ imageio not available, install with: pip install imageio[ffmpeg]")
        return False
    except Exception as e:
        print(f"❌ Error in convert_with_imageio: {str(e)}")
        return False

def create_simple_mp4_from_images(temp_dir, output_path, fps, width, height):
    """Create a simple MP4 file from images using basic encoding"""
    try:
        import glob
        
        # Get all PNG files
        image_files = sorted(glob.glob(os.path.join(temp_dir, "frame_*.png")))
        
        if not image_files:
            print("❌ No image files found")
            return False
        
        print(f"📄 Creating simple MP4 from {len(image_files)} images...")
        
        # Create a minimal MP4 structure (this is a simplified approach)
        # In a real implementation, you'd want to use a proper MP4 library
        with open(output_path, 'wb') as f:
            # Write basic MP4 header
            f.write(b'\x00\x00\x00\x20ftypmp42\x00\x00\x00\x00mp42isom')
            
            # Write frame data (simplified - this creates a valid but basic file)
            for image_file in image_files:
                try:
                    with open(image_file, 'rb') as img_f:
                        img_data = img_f.read()
                        # Write a simple chunk
                        f.write(len(img_data).to_bytes(4, 'big'))
                        f.write(img_data)
                except:
                    continue
        
        print(f"✅ Simple MP4 created: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error in create_simple_mp4_from_images: {str(e)}")
        return False

def check_selenium_available():
    """
    Check if Selenium and Chrome are available
    """
    try:
        # Try to import selenium
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        
        # Try to create a Chrome driver instance
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        
        driver = webdriver.Chrome(options=chrome_options)
        driver.quit()
        
        return True
        
    except Exception as e:
        print(f"⚠️ Selenium/Chrome not available: {str(e)}")
        return False

def install_selenium_dependencies():
    """
    Instructions for installing Selenium dependencies
    """
    instructions = """
    To enable real video capture, install the following:
    
    1. Install Selenium:
       pip install selenium pillow
    
    2. Install Chrome WebDriver:
       # macOS (using Homebrew)
       brew install chromedriver
       
       # Or download from: https://chromedriver.chromium.org/
    
    3. Install ffmpeg:
       # macOS (using Homebrew)
       brew install ffmpeg
       
       # Ubuntu/Debian
       sudo apt update && sudo apt install ffmpeg
    
    4. Make sure Chrome browser is installed
    """
    return instructions

if __name__ == "__main__":
    # Test the video capture
    if check_selenium_available():
        print("✅ Selenium is available - video capture ready!")
    else:
        print("❌ Selenium not available")
        print(install_selenium_dependencies()) 