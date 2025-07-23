#!/usr/bin/env python3
"""
Enhanced Web Server for Emotion Visualizer
Multi-threaded HTTP server with proper MIME type handling and caching
"""

import os
import sys
import json
import time
import hashlib
import mimetypes
import threading
import subprocess
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from http.server import HTTPServer, BaseHTTPRequestHandler
from http import HTTPStatus
import gzip
import io

# Add Flask imports for the sync API
try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    flask_available = True
except ImportError:
    flask_available = False
    print("Flask not available - sync API will not be available")

class EnhancedHTTPRequestHandler(BaseHTTPRequestHandler):
    """Enhanced HTTP request handler with caching and compression"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        """Handle GET requests with caching and compression"""
        try:
            # Get ETag from client
            client_etag = self.headers.get('If-None-Match', '')
            
            # Special handling for JSON files with caching
            if self.path.endswith('.json') and '/conversations/' in self.path:
                self.serve_json_with_caching(client_etag)
            # Special handling for static assets and MP3 files
            elif self.path.endswith(('.js', '.css', '.otf', '.png', '.jpg', '.jpeg', '.mp3')):
                self.serve_static_with_compression(client_etag)
            else:
                super().do_GET()
                
        except Exception as e:
            print(f"Error in GET request: {e}")
            self.send_error(500, f"Internal server error: {str(e)}")
    
    def serve_json_with_caching(self, client_etag):
        """Serve JSON files with ETag caching"""
        try:
            # Convert URL path to file path
            filepath = self.path.lstrip('/')
            
            if not os.path.exists(filepath):
                self.send_error(404, "File not found")
                return
            
            # Get file stats
            stat = os.stat(filepath)
            file_size = stat.st_size
            last_modified = stat.st_mtime
            
            # Generate ETag
            etag_content = f"{last_modified}-{file_size}-{hash(filepath)}"
            etag = hashlib.md5(etag_content.encode()).hexdigest()
            
            # Check if client has cached version
            if client_etag == etag:
                self.send_response(304)
                self.send_header('ETag', etag)
                self.end_headers()
                return
            
            # Read and serve file
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(content.encode('utf-8'))))
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('ETag', etag)
            self.send_header('Last-Modified', self.date_time_string(last_modified))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            self.wfile.write(content.encode('utf-8'))
            
        except Exception as e:
            print(f"Error serving JSON: {e}")
            self.send_error(500, f"Error serving JSON: {str(e)}")
    
    def serve_static_with_compression(self, client_etag):
        """Serve static files with compression and caching"""
        try:
            # Convert URL path to file path
            filepath = self.path.lstrip('/')
            
            if not os.path.exists(filepath):
                self.send_error(404, "File not found")
                return
            
            # Get file stats
            stat = os.stat(filepath)
            file_size = stat.st_size
            last_modified = stat.st_mtime
            
            # Generate ETag
            etag_content = f"{last_modified}-{file_size}-{hash(filepath)}"
            etag = hashlib.md5(etag_content.encode()).hexdigest()
            
            # Check if client has cached version
            if client_etag == etag:
                self.send_response(304)
                self.send_header('ETag', etag)
                self.end_headers()
                return
            
            # Determine content type
            content_type = 'application/octet-stream'
            if filepath.endswith('.js'):
                content_type = 'application/javascript'
            elif filepath.endswith('.css'):
                content_type = 'text/css'
            elif filepath.endswith('.png'):
                content_type = 'image/png'
            elif filepath.endswith('.jpg') or filepath.endswith('.jpeg'):
                content_type = 'image/jpeg'
            elif filepath.endswith('.otf'):
                content_type = 'font/otf'
            elif filepath.endswith('.mp3'):
                content_type = 'audio/mpeg'
            
            # Read file
            with open(filepath, 'rb') as f:
                content = f.read()
            
            # Check if client accepts gzip (but not for MP3 files)
            should_compress = ('gzip' in self.headers.get('Accept-Encoding', '') and 
                             not filepath.endswith('.mp3') and 
                             len(content) > 1024)
            
            if should_compress:
                # Compress content
                compressed_buffer = io.BytesIO()
                with gzip.GzipFile(fileobj=compressed_buffer, mode='wb') as gz:
                    gz.write(content)
                compressed_content = compressed_buffer.getvalue()
                
                # Send compressed response
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(compressed_content)))
                self.send_header('Content-Encoding', 'gzip')
                self.send_header('Cache-Control', 'public, max-age=3600')
                self.send_header('ETag', etag)
                self.send_header('Last-Modified', self.date_time_string(last_modified))
                self.send_header('Access-Control-Allow-Origin', '*')
                
                # Add filename for MP3 files
                if filepath.endswith('.mp3'):
                    filename = os.path.basename(filepath)
                    self.send_header('Content-Disposition', f'inline; filename={filename}')
                
                self.end_headers()
                self.wfile.write(compressed_content)
            else:
                # Send uncompressed response
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('ETag', etag)
                self.send_header('Last-Modified', self.date_time_string(last_modified))
                self.send_header('Access-Control-Allow-Origin', '*')
                
                # Add filename for MP3 files
                if filepath.endswith('.mp3'):
                    filename = os.path.basename(filepath)
                    self.send_header('Content-Disposition', f'inline; filename={filename}')
                
                self.end_headers()
                self.wfile.write(content)
                
        except Exception as e:
            print(f"Error serving static file: {e}")
            self.send_error(500, f"Error serving static file: {str(e)}")
    
    def log_message(self, format, *args):
        """Override to provide more detailed logging"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {self.address_string()} - {format % args}")


# Flask app for sync API (optional)
if flask_available:
    app = Flask(__name__)
    CORS(app)
    
    @app.route('/api/sync-to-production', methods=['POST'])
    def sync_to_production():
        """Sync new/updated conversation files to production server"""
        try:
            data = request.json
            conversation_folder = data.get('conversation', 'all')
            sync_type = data.get('type', 'incremental')  # 'incremental' or 'full'
            
            print(f"🔄 Starting sync to production: {conversation_folder} ({sync_type})")
            
            # Production server details
            PRODUCTION_SERVER = "167.172.51.184"
            PRODUCTION_USER = "root"
            PRODUCTION_PATH = "/root/emotion-visualizer"
            
            sync_commands = []
            
            if sync_type == 'full':
                # Full sync - sync entire conversations directory
                sync_commands.append([
                    'rsync', '-av', '--delete',
                    'conversations/',
                    f'{PRODUCTION_USER}@{PRODUCTION_SERVER}:{PRODUCTION_PATH}/conversations/'
                ])
            else:
                # Incremental sync - sync specific conversation or recent changes
                if conversation_folder == 'all':
                    # Sync all conversations but don't delete
                    sync_commands.append([
                        'rsync', '-av',
                        'conversations/',
                        f'{PRODUCTION_USER}@{PRODUCTION_SERVER}:{PRODUCTION_PATH}/conversations/'
                    ])
                else:
                    # Sync specific conversation folder
                    sync_commands.append([
                        'rsync', '-av',
                        f'conversations/{conversation_folder}/',
                        f'{PRODUCTION_USER}@{PRODUCTION_SERVER}:{PRODUCTION_PATH}/conversations/{conversation_folder}/'
                    ])
            
            # Execute sync commands
            results = []
            for cmd in sync_commands:
                try:
                    print(f"📤 Executing: {' '.join(cmd)}")
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                    
                    if result.returncode == 0:
                        results.append({
                            'command': ' '.join(cmd),
                            'success': True,
                            'output': result.stdout,
                            'error': result.stderr
                        })
                        print(f"✅ Sync successful: {' '.join(cmd)}")
                    else:
                        results.append({
                            'command': ' '.join(cmd),
                            'success': False,
                            'output': result.stdout,
                            'error': result.stderr
                        })
                        print(f"❌ Sync failed: {result.stderr}")
                        
                except subprocess.TimeoutExpired:
                    results.append({
                        'command': ' '.join(cmd),
                        'success': False,
                        'error': 'Sync timeout (>5 minutes)'
                    })
                except Exception as e:
                    results.append({
                        'command': ' '.join(cmd),
                        'success': False,
                        'error': str(e)
                    })
            
            # Check if all syncs were successful
            all_successful = all(r['success'] for r in results)
            
            return jsonify({
                'success': all_successful,
                'results': results,
                'message': 'Sync completed successfully' if all_successful else 'Some syncs failed'
            })
            
        except Exception as e:
            print(f"❌ Sync error: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

def sync_to_production_async(conversation_folder, sync_type='incremental'):
    """Async wrapper for production sync"""
    def sync_worker():
        try:
            import requests
            
            # Call the sync API endpoint
            response = requests.post('http://localhost:5000/api/sync-to-production', 
                                   json={
                                       'conversation': conversation_folder,
                                       'type': sync_type
                                   })
            
            if response.status_code == 200:
                print(f"✅ Async sync completed: {conversation_folder}")
            else:
                print(f"❌ Async sync failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Async sync error: {str(e)}")
    
    # Start sync in background thread
    sync_thread = threading.Thread(target=sync_worker)
    sync_thread.daemon = True
    sync_thread.start()
    
    return True


class ThreadedHTTPServer(HTTPServer):
    """Thread-safe HTTP server"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.daemon_threads = True


def start_simple_server(port=8000):
    """Start the enhanced HTTP server"""
    try:
        # Change to the project directory
        os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')
        
        # Set up server
        server_address = ('', port)
        httpd = ThreadedHTTPServer(server_address, EnhancedHTTPRequestHandler)
        
        print(f"🚀 Enhanced Server running on http://localhost:{port}")
        print(f"📁 Serving from: {os.getcwd()}")
        print(f"🎵 MP3 Support: Enabled")
        print(f"🗜️  Compression: Enabled")
        print(f"💾 Caching: Enabled")
        
        if flask_available:
            print(f"🔄 Sync API: Available at http://localhost:5000/api/sync-to-production")
            
            # Start Flask app in a separate thread for sync API
            def run_flask():
                app.run(host='0.0.0.0', port=5000, debug=False)
            
            flask_thread = threading.Thread(target=run_flask)
            flask_thread.daemon = True
            flask_thread.start()
            
        print("=" * 60)
        
        # Start serving
        httpd.serve_forever()
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
    finally:
        try:
            httpd.shutdown()
            httpd.server_close()
        except:
            pass


if __name__ == '__main__':
    # Get port from command line args
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number, using default 8000")
    
    start_simple_server(port)
