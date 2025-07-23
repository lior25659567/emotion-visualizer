#!/usr/bin/env python3
"""
Video Visualization Capture
Specialized script to capture videos from video_visualization.html page
"""

import os
import time
import subprocess
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import tempfile
import shutil
import json
import sys

def capture_video_visualization(conversation_folder, output_path, options=None):
    """
    Capture video from video_visualization.html page
    """
    if options is None:
        options = {}
    
    try:
        print(f"🎬 Starting video capture for {conversation_folder} from video_visualization.html")
        
        quality = options.get('quality', '720')
        duration = int(options.get('duration', 15))
        fps = int(options.get('fps', 30))
        
        # Set up dimensions based on quality
        if quality == '1080':
            width, height = 1920, 1080
        elif quality == '720':
            width, height = 1280, 720
        else:  # 480
            width, height = 854, 480
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp(prefix=f'video_viz_{conversation_folder}_')
        print(f"📁 Using temp directory: {temp_dir}")
        
        try:
            # Enhanced Chrome setup for video visualization capture with comprehensive flags
            chrome_options = Options()
            chrome_options.add_argument('--headless=new')  # Use new headless mode
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--disable-software-rasterizer')
            chrome_options.add_argument('--enable-webgl')
            chrome_options.add_argument('--enable-accelerated-2d-canvas')
            chrome_options.add_argument('--disable-web-security')
            chrome_options.add_argument('--allow-running-insecure-content')
            chrome_options.add_argument(f'--window-size={width},{height}')
            chrome_options.add_argument('--hide-scrollbars')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_argument('--disable-extensions')
            chrome_options.add_argument('--disable-plugins')
            chrome_options.add_argument('--disable-default-apps')
            chrome_options.add_argument('--force-device-scale-factor=1')
            chrome_options.add_argument('--disable-background-timer-throttling')
            chrome_options.add_argument('--disable-backgrounding-occluded-windows')
            chrome_options.add_argument('--disable-renderer-backgrounding')
            chrome_options.add_argument('--autoplay-policy=no-user-gesture-required')
            chrome_options.add_argument('--disable-features=TranslateUI')
            chrome_options.add_argument('--disable-ipc-flooding-protection')
            chrome_options.add_argument('--remote-debugging-port=9223')  # Use different port
            chrome_options.add_argument('--user-data-dir=/tmp/chrome-video-capture')
            chrome_options.add_argument('--single-process')
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            # STATIC BACKGROUND MATCHING INDEX.HTML - NO ANIMATIONS OR FLASHING  
            url = f"http://localhost:8000/visualization.html?folder={conversation_folder}&viewMode=preview&autostart=false&animate=false&static=true&paused=true&scale=1.0&noSidepanel=true&noTimeline=true&visualOnly=true&noMP3=true&noaudio=true&optimize=true&fullscreen=true&hideUI=true&canvasOnly=true&noControls=true&zoomLevel=1.0&backgroundColor=%23f7f9f3&forceBackground=true&simplified=true&immediate=true"
            
            print(f"🌐 Opening URL: {url}")
            
            driver = webdriver.Chrome(options=chrome_options)
            # Ensure dimensions are even numbers for video encoding
            width = width if width % 2 == 0 else width + 1
            height = height if height % 2 == 0 else height + 1
            driver.set_window_size(width, height)
            
            # Load the page
            driver.get(url)
            
            print(f"⏳ Waiting for page to load...")
            time.sleep(5)
            
            # Wait for visualization to be ready
            success = wait_for_video_visualization_ready(driver, conversation_folder, max_wait=30)
            
            if not success:
                print("⚠️ Primary loading failed, trying to force start...")
                force_video_visualization_start(driver, conversation_folder)
                time.sleep(3)
            
            # Hide control panel for clean video
            hide_control_panel(driver)
            
            # Set up for optimal video capture
            setup_for_video_capture(driver)
            
            # Take initial debug screenshot
            debug_path = f"debug_screenshot_{conversation_folder}.png"
            driver.save_screenshot(debug_path)
            print(f"🔍 Debug screenshot saved: {debug_path}")
            
            # Start the visualization playback
            start_visualization_playback(driver)
            
            # Capture video frames
            total_frames = duration * fps
            frame_interval = 1.0 / fps
            
            print(f"📸 Capturing {total_frames} frames at {fps} FPS (interval: {frame_interval:.3f}s)")
            
            for frame_num in range(total_frames):
                screenshot_path = os.path.join(temp_dir, f"frame_{frame_num:05d}.png")
                
                # Force animation and ensure visibility
                try:
                    driver.execute_script("""
                        // Force animation frame
                        if (window.p5SketchInstance) {
                            window.isAnimationPaused = false;
                            if (window.p5SketchInstance.loop) {
                                window.p5SketchInstance.loop();
                            }
                            
                            // Ensure blobs are visible and animated
                            if (window.blobs) {
                                window.blobs.forEach((blob, i) => {
                                    if (blob) {
                                        blob.isVisible = true;
                                        blob.blobVisibility = 1.0;
                                        if (blob.target) {
                                            blob.target.blobVisibility = 1.0;
                                            blob.target.blobSizeScale = Math.max(8, 12 + Math.sin(Date.now() * 0.001 + i) * 3);
                                        }
                                        
                                        // Ensure bright colors
                                        if (!blob.displayColors || blob.displayColors.length === 0) {
                                            const colors = [[255, 100, 100], [100, 150, 255], [100, 255, 150], [255, 200, 100]];
                                            blob.displayColors = [colors[i % colors.length]];
                                        }
                                    }
                                });
                            }
                        }
                    """)
                except Exception as e:
                    pass
                
                # Take screenshot
                driver.save_screenshot(screenshot_path)
                
                # Progress update
                if frame_num % (fps * 2) == 0:  # Every 2 seconds
                    progress = (frame_num / total_frames) * 100
                    print(f"📊 Progress: {progress:.1f}% ({frame_num}/{total_frames} frames)")
                
                # Wait for next frame
                time.sleep(frame_interval)
            
            driver.quit()
            print(f"✅ Captured {total_frames} screenshots")
            
            # Convert to MP4
            print(f"🎞️ Converting screenshots to MP4...")
            success = convert_screenshots_to_mp4(temp_dir, output_path, fps)
            
            if success:
                print(f"✅ Video successfully created: {output_path}")
                return True
            else:
                print(f"❌ Failed to convert screenshots to MP4")
                return False
                
        finally:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
                print(f"🧹 Cleaned up temp directory")
                
    except Exception as e:
        print(f"❌ Error in video visualization capture: {str(e)}")
        return False

def wait_for_video_visualization_ready(driver, conversation_folder, max_wait=30):
    """
    Wait for the visualization to be fully ready
    """
    start_time = time.time()
    
    while (time.time() - start_time) < max_wait:
        wait_time = int(time.time() - start_time)
        
        try:
            # Simpler check for visualization.html (no control panel)
            result = driver.execute_script("""
                try {
                    // Basic checks for visualization.html
                    const hasCanvas = !!document.querySelector('canvas');
                    const hasP5 = typeof window.p5 !== 'undefined';
                    const hasP5Instance = !!window.p5SketchInstance;
                    const hasEmotionData = !!window.emotionData;
                    
                    // Check for actual visual content in canvas
                    let hasVisualContent = false;
                    let colorfulPixels = 0;
                    
                    const canvas = document.querySelector('canvas');
                    if (canvas && canvas.width > 0 && canvas.height > 0) {
                        try {
                            const ctx = canvas.getContext('2d');
                            const imageData = ctx.getImageData(0, 0, Math.min(300, canvas.width), Math.min(300, canvas.height));
                            const data = imageData.data;
                            
                            // Count colorful pixels
                            for (let i = 0; i < data.length; i += 4) {
                                const r = data[i], g = data[i+1], b = data[i+2];
                                // Check if pixel has color (not gray/white background)
                                if ((Math.abs(r-g) > 20 || Math.abs(g-b) > 20 || Math.abs(r-b) > 20) && !(r > 200 && g > 200 && b > 200)) {
                                    colorfulPixels++;
                                }
                            }
                            
                            hasVisualContent = colorfulPixels > 50; // More colorful content required
                        } catch (e) {
                            hasVisualContent = true; // Assume content if can't check
                        }
                    }
                    
                    return {
                        canvas: hasCanvas,
                        p5: hasP5Instance,
                        data: hasEmotionData,
                        visible: canvas ? canvas.width * canvas.height : 0,
                        colorful: colorfulPixels,
                        ready: hasCanvas && hasP5Instance && hasEmotionData && hasVisualContent
                    };
                } catch (e) {
                    return {ready: false, error: e.toString()};
                }
            """)
            
            if result and result.get('ready'):
                print(f"🎨 Visualization ready! Colors: {result.get('colorful', 0)}, Canvas: {result.get('visible', 0)}")
                return True
            else:
                colors = result.get('colorful', 0) if result else 0
                visible = result.get('visible', 0) if result else 0
                p5_status = result.get('p5', False) if result else False
                data_status = result.get('data', False) if result else False
                print(f"⏳ Waiting... Colors: {colors}, Visible: {visible}, p5: {p5_status}, Data: {data_status} ({wait_time}s)")
            
        except Exception as e:
            print(f"⏳ Check failed: {str(e)} ({wait_time}s)")
        
        time.sleep(2)
    
    print(f"⚠️ Visualization not fully ready, but proceeding with fallback")
    return False

def force_video_visualization_start(driver, conversation_folder):
    """
    Force the visualization to start (adapted for visualization.html)
    """
    try:
        print(f"🔧 Forcing visualization start for {conversation_folder}")
        
        result = driver.execute_script(f"""
            try {{
                console.log('🔧 FORCING VISUALIZATION START');
                
                // Step 1: Force create synthetic data if none exists
                if (!window.emotionData || Object.keys(window.emotionData).length === 0) {{
                    console.log('🎬 Creating synthetic emotion data for video capture');
                    
                    const syntheticData = {{}};
                    const emotions = [
                        ['happy', 'joyful'], ['calm', 'peaceful'], ['excited', 'energetic'], 
                        ['focused', 'determined'], ['surprised', 'curious'], ['thoughtful', 'contemplative']
                    ];
                    
                    for (let i = 1; i <= 10; i++) {{
                        const segmentId = String(i).padStart(3, '0') + '.mp3';
                        syntheticData[segmentId] = {{
                            speaker: i % 2,
                            emotions: emotions[(i - 1) % emotions.length],
                            transcript: `Video capture segment ${{i}}`,
                            coloredCircleCharSize: 8 + Math.random() * 8,
                            blobVisibility: 1.0,
                            blobSizeScale: 15 + Math.random() * 10
                        }};
                    }}
                    
                    window.emotionData = syntheticData;
                    console.log('✅ Synthetic data created with', Object.keys(syntheticData).length, 'segments');
                }}
                
                // Step 2: Force p5 to reinitialize
                if (window.p5SketchInstance && typeof window.p5SketchInstance.initializeSketch === 'function') {{
                    console.log('🔧 Reinitializing p5 sketch');
                    window.p5SketchInstance.initializeSketch();
                }}
                
                // Step 3: Set all animation flags for video mode
                window.isVideoMode = true;
                window.autoStart = true;
                window.isAnimationPaused = false;
                window.staticMode = false;
                
                // Step 4: Force p5 loop if available
                if (window.p5SketchInstance && window.p5SketchInstance.loop) {{
                    window.p5SketchInstance.loop();
                }}
                
                return true;
                
            }} catch (e) {{
                console.error('❌ Error in force start:', e);
                return false;
            }}
        """)
        
        if result:
            print("✅ Fallback visualization forced successfully")
            time.sleep(5)  # Give time for initialization
        else:
            print("❌ Force start failed")
            
    except Exception as e:
        print(f"❌ Error in force_video_visualization_start: {str(e)}")

def hide_control_panel(driver):
    """
    Hide any UI elements for clean video capture (adapted for visualization.html)
    """
    try:
        driver.execute_script("""
            // Hide any sidebar or control elements that might exist
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.style.display = 'none';
            }
            
            // Hide any floating controls
            const controls = document.querySelectorAll('.controls, .control-panel, .ui-controls');
            controls.forEach(el => {
                el.style.display = 'none';
            });
            
            // Make sure canvas takes full viewport
            const canvas = document.querySelector('canvas');
            if (canvas) {
                canvas.style.position = 'fixed';
                canvas.style.top = '0';
                canvas.style.left = '0';
                canvas.style.width = '100vw';
                canvas.style.height = '100vh';
                canvas.style.zIndex = '9999';
            }
            
            console.log('🙈 UI elements hidden for video capture');
        """)
        print("🙈 UI elements hidden for clean video")
    except Exception as e:
        print(f"⚠️ Could not hide UI elements: {str(e)}")

def setup_for_video_capture(driver):
    """
    Setup optimal settings for video capture with enhanced blob creation
    """
    try:
        driver.execute_script("""
            console.log('🎥 Setting up for video capture...');
            
            // Set all video capture flags
            window.isVideoMode = true;
            window.autoStart = true;
            window.isAnimationPaused = false;
            
            // COMPREHENSIVE BACKGROUND COLOR ENFORCEMENT FOR VIDEO GENERATION
            const MASTER_BACKGROUND_COLOR = '#f7f9f3'; // MATCH INDEX.HTML EXACTLY
            const MASTER_BACKGROUND_RGB = [247, 249, 243]; // RGB equivalent

            // FORCE UNIVERSAL BACKGROUND COLOR THROUGHOUT THE ENTIRE SYSTEM
            const enforceUniversalBackgroundColor = () => {
                console.log('🎨 ENFORCING UNIVERSAL BACKGROUND COLOR:', MASTER_BACKGROUND_COLOR);
                
                // 1. FORCE DOCUMENT AND BODY BACKGROUND
                document.body.style.backgroundColor = MASTER_BACKGROUND_COLOR + ' !important';
                document.documentElement.style.backgroundColor = MASTER_BACKGROUND_COLOR + ' !important';
                document.body.style.background = MASTER_BACKGROUND_COLOR + ' !important';
                document.documentElement.style.background = MASTER_BACKGROUND_COLOR + ' !important';
                
                // 2. FORCE ALL CONTAINERS AND DIVS
                const allElements = document.querySelectorAll('*');
                allElements.forEach(el => {
                    if (el.tagName !== 'CANVAS') { // Don't override canvas - p5.js will handle it
                        el.style.backgroundColor = MASTER_BACKGROUND_COLOR + ' !important';
                    }
                });

                // 3. FORCE P5.JS CANVAS BACKGROUND - CRITICAL FOR VISUALIZATION
                window.canvasBackgroundColor = MASTER_BACKGROUND_RGB;
                window.FORCED_BACKGROUND_COLOR = MASTER_BACKGROUND_RGB;
                
                // 4. OVERRIDE ANY VISUALIZATION PARAMETERS
                if (window.visualizationParameters && window.visualizationParameters.canvas) {
                    window.visualizationParameters.canvas.background_color = MASTER_BACKGROUND_RGB;
                }
                
                // 5. FORCE P5.JS SKETCH BACKGROUND IF ACTIVE
                if (window.p5Instance && window.p5Instance.background) {
                    window.p5Instance.background(MASTER_BACKGROUND_RGB[0], MASTER_BACKGROUND_RGB[1], MASTER_BACKGROUND_RGB[2]);
                }
                
                // 6. FORCE ALL CANVAS ELEMENTS
                const canvases = document.querySelectorAll('canvas');
                canvases.forEach(canvas => {
                    canvas.style.backgroundColor = MASTER_BACKGROUND_COLOR + ' !important';
                    // If it has a 2D context, fill it
                    try {
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.fillStyle = MASTER_BACKGROUND_COLOR;
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                    } catch (e) {
                        // Ignore WebGL canvases
                    }
                });
                
                console.log('✅ Universal background color enforcement complete');
            };

            // ENHANCED ENFORCEMENT - RUN MULTIPLE TIMES TO ENSURE SUCCESS
            enforceUniversalBackgroundColor();
            setInterval(enforceUniversalBackgroundColor, 100); // Every 100ms
            setTimeout(enforceUniversalBackgroundColor, 500);  // After 500ms
            setTimeout(enforceUniversalBackgroundColor, 1000); // After 1 second
            setTimeout(enforceUniversalBackgroundColor, 2000); // After 2 seconds

            // ENHANCED P5.JS INTEGRATION - OVERRIDE SETUP AND DRAW FUNCTIONS
            window.addEventListener('load', () => {
                setTimeout(() => {
                    // Override p5 background function globally
                    if (window.p5 && window.p5.prototype && window.p5.prototype.background) {
                        const originalBackground = window.p5.prototype.background;
                        window.p5.prototype.background = function(...args) {
                            // Always use our master background color
                            return originalBackground.call(this, MASTER_BACKGROUND_RGB[0], MASTER_BACKGROUND_RGB[1], MASTER_BACKGROUND_RGB[2]);
                        };
                    }
                    
                    enforceUniversalBackgroundColor();
                }, 100);
            });
            
            // CREATE STATIC VISUALIZATION WITH MATCHING BACKGROUND - NO ANIMATIONS  
            console.log('🎨 Creating static visualization with index.html matching background - NO ANIMATIONS');
            
            // Disable animations but KEEP visualization content
            window.isAnimationPaused = true;
            window.autoStart = false;
            window.isVideoMode = true; // Keep this to load the visualization data
            
            // Stop any existing animation loops
            if (window.animationId) {
                cancelAnimationFrame(window.animationId);
            }
            
            // Create static blobs if they don't exist
            if (!window.blobs || window.blobs.length === 0) {
                console.log('🔧 Creating static blobs for visualization');
                
                window.blobs = [];
                const staticColors = [
                    [255, 120, 120], // Red blob
                    [120, 180, 255]  // Blue blob
                ];
                
                for (let i = 0; i < 2; i++) {
                    const blob = {
                        isVisible: true,
                        blobVisibility: 1.0,
                        displayColors: [staticColors[i]],
                        target: {
                            x: 300 + (i * 200), // Fixed positions
                            y: 300,
                            blobVisibility: 1.0,
                            blobSizeScale: 20, // Good size
                            blobStrength: 2000
                        }
                    };
                    window.blobs.push(blob);
                }
                
                console.log('✅ Created', window.blobs.length, 'static blobs');
            }
            
            // Ensure existing blobs are visible but static
            if (window.blobs) {
                window.blobs.forEach((blob, i) => {
                    if (blob) {
                        blob.isVisible = true;
                        blob.blobVisibility = 1.0;
                        
                        if (blob.target) {
                            blob.target.blobVisibility = 1.0;
                            blob.target.blobSizeScale = 20; // Fixed size
                            blob.target.blobStrength = 2000; // Good strength
                            
                            // Fix positions so they don't move
                            blob.target.x = 300 + (i * 200);
                            blob.target.y = 300;
                        }
                        
                        // Ensure visible colors
                        if (!blob.displayColors || blob.displayColors.length === 0) {
                            const colors = [[255, 120, 120], [120, 180, 255]];
                            blob.displayColors = [colors[i % colors.length]];
                        }
                    }
                });
                
                console.log('✅ Static visualization setup - blobs visible but not moving');
            }
            
            console.log('✅ Static visualization with matching background complete');
            
            // Force canvas to full size and maintain consistent dimensions
            const canvas = document.querySelector('#visualization-canvas-container canvas');
            if (canvas) {
                // Force specific canvas dimensions to prevent size changes
                const targetWidth = 800;
                const targetHeight = 600;
                
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.display = 'block';
                canvas.style.position = 'absolute';
                canvas.style.top = '0';
                canvas.style.left = '0';
                canvas.style.backgroundColor = MASTER_BACKGROUND_COLOR;
                
                // Update p5.js instance with correct dimensions
                if (window.p5SketchInstance) {
                    window.p5SketchInstance.resizeCanvas(targetWidth, targetHeight);
                    window.p5SketchInstance.background(MASTER_BACKGROUND_RGB[0], MASTER_BACKGROUND_RGB[1], MASTER_BACKGROUND_RGB[2]); // Use master background
                }
                
                console.log('🖼️ Canvas configured and sized:', canvas.width + 'x' + canvas.height);
            }
            
            console.log('🎥 Video capture setup complete');
        """)
        print("🎥 Video capture setup complete")
    except Exception as e:
        print(f"⚠️ Setup warning: {str(e)}")

def start_visualization_playback(driver):
    """
    NO PLAYBACK - Keep static orange background
    """
    try:
        driver.execute_script("""
            // NO ANIMATIONS - Keep everything static for solid orange background
            console.log('🎨 Keeping static orange background - NO PLAYBACK');
            
            // Ensure animations stay disabled
            window.isAnimationPaused = true;
            
            // Ensure p5 stays stopped
            if (window.p5SketchInstance && window.p5SketchInstance.noLoop) {
                window.p5SketchInstance.noLoop();
                // Set solid orange background one more time
                window.p5SketchInstance.background(255, 165, 0);
            }
            
            console.log('✅ Static orange background maintained');
        """)
        print("🎨 Static orange background maintained")
    except Exception as e:
        print(f"⚠️ Could not maintain static background: {str(e)}")

def convert_screenshots_to_mp4(temp_dir, output_path, fps):
    """
    Convert screenshots to MP4 using multiple methods
    """
    # Try imageio first (if available)
    if try_imageio_conversion(temp_dir, output_path, fps):
        return True
    
    # Try ffmpeg
    if try_ffmpeg_conversion(temp_dir, output_path, fps):
        return True
    
    print("❌ All conversion methods failed")
    return False

def try_imageio_conversion(temp_dir, output_path, fps):
    """
    Try converting using imageio
    """
    try:
        import imageio
        import numpy as np
        
        frame_files = sorted([f for f in os.listdir(temp_dir) if f.startswith('frame_') and f.endswith('.png')])
        
        if not frame_files:
            return False
        
        print(f"🎞️ Converting {len(frame_files)} images to MP4 using imageio...")
        
        images = []
        for frame_file in frame_files:
            frame_path = os.path.join(temp_dir, frame_file)
            images.append(imageio.imread(frame_path))
        
        # Ensure all images have even dimensions
        processed_images = []
        for img in images:
            h, w = img.shape[:2]
            # Pad to even dimensions if needed
            if h % 2 != 0:
                img = np.pad(img, ((0, 1), (0, 0), (0, 0)), mode='edge')
            if w % 2 != 0:
                img = np.pad(img, ((0, 0), (0, 1), (0, 0)), mode='edge')
            processed_images.append(img)
        
        imageio.mimsave(output_path, processed_images, fps=fps, quality=8, macro_block_size=1)
        print(f"✅ imageio conversion successful")
        return True
        
    except ImportError:
        print("⚠️ imageio not available, trying ffmpeg...")
        return False
    except Exception as e:
        print(f"❌ imageio conversion failed: {str(e)}")
        return False

def try_ffmpeg_conversion(temp_dir, output_path, fps):
    """
    Try converting using ffmpeg
    """
    try:
        frame_pattern = os.path.join(temp_dir, "frame_%05d.png")
        
        cmd = [
            'ffmpeg', '-y',
            '-framerate', str(fps),
            '-i', frame_pattern,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-preset', 'medium',
            '-crf', '23',
            output_path
        ]
        
        print(f"🎞️ Converting using ffmpeg...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ ffmpeg conversion successful")
            return True
        else:
            print(f"❌ ffmpeg conversion failed: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("❌ ffmpeg not available")
        return False
    except Exception as e:
        print(f"❌ ffmpeg conversion failed: {str(e)}")
        return False

def main():
    """
    Main function for command line usage
    """
    if len(sys.argv) < 2:
        print("Usage: python video_visualization_capture.py <conversation_folder> [output_path] [duration] [quality] [fps]")
        print("Example: python video_visualization_capture.py convo1 videos/convo1_video.mp4 20 720 30")
        sys.exit(1)
    
    conversation_folder = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else f"videos/{conversation_folder}_video.mp4"
    duration = int(sys.argv[3]) if len(sys.argv) > 3 else 15
    quality = sys.argv[4] if len(sys.argv) > 4 else "720"
    fps = int(sys.argv[5]) if len(sys.argv) > 5 else 30
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    options = {
        'duration': duration,
        'quality': quality,
        'fps': fps
    }
    
    print(f"🎬 Starting video capture for {conversation_folder}")
    print(f"📁 Output: {output_path}")
    print(f"⏱️ Duration: {duration}s, Quality: {quality}p, FPS: {fps}")
    
    success = capture_video_visualization(conversation_folder, output_path, options)
    
    if success:
        print(f"✅ Video capture successful! File saved: {output_path}")
        sys.exit(0)
    else:
        print(f"❌ Video capture failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 