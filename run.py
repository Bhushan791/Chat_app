"""
Main entry point for the Flask Chat Application
Run this file to start the server: python run.py
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def main():
    """Main function to start the Flask application"""
    try:
        # Import the app and socketio from backend
        from backend.app import app, socketio
        
        print("=" * 50)
        print("🚀 Flask Chat Application Starting...")
        print("=" * 50)
        print(f"📍 Server URL: http://localhost:8700")
        print(f"🔧 Admin Panel: http://localhost:8700/admin")
        print(f"🛑 Press Ctrl+C to stop the server")
        print("=" * 50)
        
        # Ensure required directories exist
        required_dirs = [
            'static/uploads', 
            'static/voice', 
            'static/snaps', 
            'static/files', 
            'static/img'
        ]
        
        print("📁 Creating required directories...")
        for directory in required_dirs:
            os.makedirs(directory, exist_ok=True)
            print(f"   ✅ {directory}")
        
        print("\n🔥 Starting Flask-SocketIO server...")
        print("   Host: 0.0.0.0")
        print("   Port: 8700")
        print("   Debug: True")
        print("=" * 50)
        
        # Start the server
        socketio.run(app, host='0.0.0.0', port=8700, debug=True)
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("Make sure you have installed all dependencies:")
        print("   pip install flask flask-socketio")
        sys.exit(1)
        
    except KeyboardInterrupt:
        print("\n🛑 Shutting down gracefully...")
        print("👋 Thanks for using Flask Chat App!")
        
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        print("Please check your configuration and try again.")
        sys.exit(1)

if __name__ == '__main__':
    main()