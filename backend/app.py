from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory, jsonify
from flask_socketio import SocketIO, emit
from werkzeug.utils import secure_filename
import os
import time
import uuid
import subprocess
import logging

def create_app():
    # Get the absolute path to the project root
    current_dir = os.path.dirname(os.path.abspath(__file__))  # This is backend/
    project_root = os.path.dirname(current_dir)  # Go up one level from backend/
    
    app = Flask(__name__, 
                template_folder=os.path.join(project_root, 'templates'),
                static_folder=os.path.join(project_root, 'static'))
    
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'fallback-secret-key-change-this')
    
    # Updated paths using absolute paths
    app.config['UPLOAD_FOLDER'] = os.path.join(project_root, 'static', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max

    VOICE_FOLDER = os.path.join(project_root, 'static', 'voice')
    SNAP_FOLDER = os.path.join(project_root, 'static', 'snaps')
    FILE_FOLDER = os.path.join(project_root, 'static', 'files')
    app.config['VOICE_FOLDER'] = VOICE_FOLDER
    app.config['SNAP_FOLDER'] = SNAP_FOLDER
    app.config['FILE_FOLDER'] = FILE_FOLDER

    socketio = SocketIO(app)
    logging.basicConfig(level=logging.INFO)

    users = {}
    messages = []

    # Updated allowed extensions - separated for avatar vs media files
    AVATAR_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    MEDIA_EXTENSIONS = {'png', 'jpg', 'jpeg', 'mp4', 'mov', 'gif', 'webm'}

    def allowed_file(filename, file_type='media'):
        if not filename or '.' not in filename:
            return False
        extension = filename.rsplit('.', 1)[1].lower()
        if file_type == 'avatar':
            return extension in AVATAR_EXTENSIONS
        return extension in MEDIA_EXTENSIONS

    # Ensure folders exist with proper error handling
    for folder in [app.config['UPLOAD_FOLDER'], VOICE_FOLDER, SNAP_FOLDER, FILE_FOLDER]:
        try:
            os.makedirs(folder, exist_ok=True)
            app.logger.info(f"Directory ensured: {folder}")
        except Exception as e:
            app.logger.error(f"Failed to create directory {folder}: {e}")

    def convert_webm_to_mp3(input_path, output_path):
        command = [
            'ffmpeg',
            '-y',
            '-i', input_path,
            '-vn',
            '-ar', '44100',
            '-ac', '2',
            '-b:a', '192k',
            output_path
        ]

        try:
            subprocess.run(command, check=True, capture_output=True)
        except subprocess.CalledProcessError as e:
            app.logger.error(f"FFmpeg error: {e.stderr.decode()}")
            raise

    # ---------- ROUTES ----------

    @app.route('/', methods=['GET', 'POST'])
    def index():
        if request.method == 'POST':
            nickname = request.form.get('nickname', '').strip()
            if not nickname:
                return render_template('index.html', error="Nickname required.")
            if 'admin' in nickname.lower():
                return render_template('index.html', error="Username cannot contain 'admin'.")

            avatar = None
            
            # Enhanced avatar upload handling with debugging
            if 'avatar' in request.files:
                file = request.files['avatar']
                app.logger.info(f"Avatar upload attempt - Filename: {file.filename}")
                
                if file and file.filename:
                    # Check file size first
                    file.seek(0, os.SEEK_END)
                    file_size = file.tell()
                    file.seek(0)  # Reset file pointer
                    
                    app.logger.info(f"File size: {file_size} bytes")
                    
                    if file_size == 0:
                        app.logger.warning("Empty file uploaded")
                        return render_template('index.html', error="Please select a valid image file.")
                    
                    if file_size > 10 * 1024 * 1024:  # 10MB limit for avatars
                        return render_template('index.html', error="Image file too large. Please choose a file under 10MB.")
                    
                    # Check file extension
                    if not allowed_file(file.filename, 'avatar'):
                        app.logger.warning(f"Invalid file extension: {file.filename}")
                        return render_template('index.html', error="Please upload a PNG, JPG, JPEG, or GIF image.")
                    
                    # Generate secure filename with fallback
                    original_filename = file.filename
                    timestamp = int(time.time())
                    secure_name = secure_filename(f"{timestamp}_{original_filename}")
                    
                    # Handle case where secure_filename returns empty string
                    if not secure_name or secure_name == f"{timestamp}_":
                        file_ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'png'
                        secure_name = f"{timestamp}_avatar.{file_ext}"
                        app.logger.info(f"Used fallback filename: {secure_name}")
                    
                    # Ensure upload directory exists
                    upload_path = app.config['UPLOAD_FOLDER']
                    if not os.path.exists(upload_path):
                        try:
                            os.makedirs(upload_path, exist_ok=True)
                            app.logger.info(f"Created upload directory: {upload_path}")
                        except Exception as e:
                            app.logger.error(f"Failed to create upload directory: {e}")
                            return render_template('index.html', error="Server error. Please try again.")
                    
                    # Save the file
                    file_path = os.path.join(upload_path, secure_name)
                    try:
                        file.save(file_path)
                        app.logger.info(f"Avatar saved successfully: {file_path}")
                        
                        # Verify file was saved
                        if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
                            avatar = url_for('uploaded_file', filename=secure_name)
                            app.logger.info(f"Avatar URL generated: {avatar}")
                        else:
                            app.logger.error("File save verification failed")
                            avatar = None
                            
                    except Exception as e:
                        app.logger.error(f"Error saving avatar file: {e}")
                        return render_template('index.html', error="Failed to save image. Please try again.")
                else:
                    app.logger.info("No file selected or empty filename")

            # Use default avatar if upload failed or no file provided
            if not avatar:
                avatar = url_for('static', filename='img/default-avatar.png')
                app.logger.info(f"Using default avatar: {avatar}")

            session['nickname'] = nickname
            session['avatar'] = avatar
            session['is_admin'] = False
            
            app.logger.info(f"User {nickname} joining with avatar: {avatar}")
            return redirect(url_for('chat'))

        return render_template('index.html')

    @app.route('/chat')
    def chat():
        if 'nickname' not in session or session.get('is_admin'):
            return redirect(url_for('index'))
        return render_template('chat.html',
                               nickname=session['nickname'],
                               avatar=session['avatar'],
                               is_admin=False)

    @app.route('/admin', methods=['GET', 'POST'])
    @app.route('/admin/', methods=['GET', 'POST'])
    def admin_login():
        if request.method == 'POST':
            password = request.form.get('password', '').strip()
            if password == os.environ.get('ADMIN_PASSWORD', 'default123'): 
                session['nickname'] = 'admin'
                session['avatar'] = url_for('static', filename='img/sus.jpeg')  # Admin avatar
                session['is_admin'] = True
                return redirect(url_for('admin_chat'))
            else:
                return render_template('admin_login.html', error="Incorrect password.")
        return render_template('admin_login.html')

    @app.route('/admin/chat')
    def admin_chat():
        if not session.get('is_admin'):
            return redirect(url_for('admin_login'))
        return render_template('chat.html',
                               nickname='admin',
                               avatar=session['avatar'],
                               is_admin=True)

    @app.route('/uploads/<filename>')
    def uploaded_file(filename):
        # Use absolute path
        upload_folder = app.config['UPLOAD_FOLDER']
        app.logger.info(f"Serving file: {filename} from {upload_folder}")
        
        # Security check
        if not os.path.exists(os.path.join(upload_folder, filename)):
            app.logger.warning(f"File not found: {filename}")
            default_avatar_path = os.path.join(project_root, 'static', 'img')
            return send_from_directory(default_avatar_path, 'default-avatar.png')
        
        return send_from_directory(upload_folder, filename)

    @app.route('/upload_voice', methods=['POST'])
    def upload_voice():
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio'}), 400
        
        audio = request.files['audio']
        webm_filename = secure_filename(f"{uuid.uuid4()}.webm")
        webm_path = os.path.join(app.config['VOICE_FOLDER'], webm_filename)
        audio.save(webm_path)

        # Convert to mp3
        mp3_filename = f"{os.path.splitext(webm_filename)[0]}.mp3"
        mp3_path = os.path.join(app.config['VOICE_FOLDER'], mp3_filename)
        
        try:
            convert_webm_to_mp3(webm_path, mp3_path)
        except Exception as e:
            app.logger.error(f"Voice conversion failed: {str(e)}")
            return jsonify({'error': 'Conversion failed', 'details': str(e)}), 500
        finally:
            if os.path.exists(webm_path):
                os.remove(webm_path)

        url = url_for('static', filename=f'voice/{mp3_filename}')
        return jsonify({'url': url, 'timestamp': request.form.get('timestamp')})

    @app.route('/upload_snap', methods=['POST'])
    def upload_snap():
        if 'snap' not in request.files:
            return jsonify({'error': 'No snap'}), 400
        snap = request.files['snap']
        snap_id = str(uuid.uuid4())
        filename = secure_filename(f"{snap_id}.png")
        path = os.path.join(app.config['SNAP_FOLDER'], filename)
        snap.save(path)
        url = url_for('static', filename=f'snaps/{filename}')
        return jsonify({'url': url, 'timestamp': request.form.get('timestamp'), 'snap_id': snap_id})

    @app.route('/upload_file', methods=['POST'])
    def upload_file():
        if 'file' not in request.files:
            return jsonify({'error': 'No file'}), 400
        
        file = request.files['file']
        if not allowed_file(file.filename, 'media'):
            return jsonify({'error': 'File type not allowed'}), 400

        filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
        path = os.path.join(app.config['FILE_FOLDER'], filename)
        file.save(path)
        
        url = url_for('static', filename=f'files/{filename}')
        return jsonify({'url': url, 'timestamp': request.form.get('timestamp')})

    # ---------- SOCKET EVENTS ----------

    @socketio.on('join')
    def handle_join():
        sid = request.sid
        nickname = session.get('nickname')
        avatar = session.get('avatar')
        users[sid] = {'nickname': nickname, 'avatar': avatar}
        emit('user_list', list(users.values()), broadcast=True)

        # Only send message history to admin
        if session.get('is_admin'):
            emit('chat_history', messages, room=sid)

    @socketio.on('disconnect')
    def handle_disconnect():
        sid = request.sid
        users.pop(sid, None)
        emit('user_list', list(users.values()), broadcast=True)

    @socketio.on('send_message')
    def handle_message(data):
        msg = {
            'id': str(uuid.uuid4()),
            'nickname': session.get('nickname'),
            'avatar': session.get('avatar'),
            'message': data.get('message', '').strip(),
            'timestamp': time.strftime('%Y-%m-%d %I:%M:%S %p'),
            'parent_id': data.get('parent_id')
        }
        
        if msg['parent_id']:
            parent_msg = next((m for m in messages if m['id'] == msg['parent_id']), None)
            if parent_msg:
                msg['parent_preview'] = parent_msg['message'][:50]

        if not msg['message']:
            return  # Ignore empty messages

        messages.append(msg)
        if len(messages) > 100:
            messages.pop(0)
            
        emit('new_message', msg, broadcast=True)

    @socketio.on('typing')
    def handle_typing(data):
        nickname = session.get('nickname')
        emit('user_typing', {'nickname': nickname, 'isTyping': data.get('isTyping', False)}, broadcast=True, include_self=False)

    @socketio.on('admin_kick')
    def handle_admin_kick(data):
        if not session.get('is_admin'):
            return
        nickname_to_kick = data.get('nickname')
        sid_to_kick = next((sid for sid, user in users.items() if user['nickname'] == nickname_to_kick), None)
        if sid_to_kick:
            emit('kicked', room=sid_to_kick)
            socketio.server.disconnect(sid_to_kick)
            users.pop(sid_to_kick, None)
            emit('user_list', list(users.values()), broadcast=True)

    @socketio.on('admin_mute')
    def handle_admin_mute(data):
        if not session.get('is_admin'):
            return
        nickname_to_mute = data.get('nickname')
        sid_to_mute = next((sid for sid, user in users.items() if user['nickname'] == nickname_to_mute), None)
        if sid_to_mute:
            emit('muted', room=sid_to_mute)

    @socketio.on('admin_unmute')
    def handle_admin_unmute(data):
        if not session.get('is_admin'):
            return
        nickname_to_unmute = data.get('nickname')
        sid_to_unmute = next((sid for sid, user in users.items() if user['nickname'] == nickname_to_unmute), None)
        if sid_to_unmute:
            emit('unmuted', room=sid_to_unmute)

    @socketio.on('voice_message')
    def handle_voice_message(data):
        msg = {
            'id': str(uuid.uuid4()),
            'url': data['url'],
            'nickname': data['nickname'],
            'timestamp': time.strftime('%Y-%m-%d %I:%M:%S %p'),
            'avatar': session.get('avatar'),
            'parent_id': data.get('parent_id')
        }
        if msg['parent_id']:
            parent_msg = next((m for m in messages if m['id'] == msg['parent_id']), None)
            if parent_msg:
                msg['parent_preview'] = parent_msg.get('message', '[Media]')[:50]
        messages.append(msg)
        if len(messages) > 100:
            messages.pop(0)
        emit('new_voice_message', msg, broadcast=True)

    @socketio.on('snap_message')
    def handle_snap_message(data):
        msg = {
            'id': str(uuid.uuid4()),
            'url': data['url'],
            'nickname': data['nickname'],
            'timestamp': time.strftime('%Y-%m-%d %I:%M:%S %p'),
            'avatar': session.get('avatar'),
            'snap_id': data.get('snap_id'),
            'parent_id': data.get('parent_id')
        }
        if msg['parent_id']:
            parent_msg = next((m for m in messages if m['id'] == msg['parent_id']), None)
            if parent_msg:
                msg['parent_preview'] = parent_msg.get('message', '[Media]')[:50]
        messages.append(msg)
        if len(messages) > 100:
            messages.pop(0)
        emit('new_snap_message', msg, broadcast=True)

    @socketio.on('file_message')
    def handle_file_message(data):
        msg = {
            'id': str(uuid.uuid4()),
            'url': data['url'],
            'nickname': data['nickname'],
            'timestamp': time.strftime('%Y-%m-%d %I:%M:%S %p'),
            'avatar': session.get('avatar'),
            'parent_id': data.get('parent_id')
        }
        if msg['parent_id']:
            parent_msg = next((m for m in messages if m['id'] == msg['parent_id']), None)
            if parent_msg:
                msg['parent_preview'] = parent_msg.get('message', '[Media]')[:50]
        messages.append(msg)
        if len(messages) > 100:
            messages.pop(0)
        emit('new_file_message', msg, broadcast=True)

    return app, socketio

# Create the app and socketio instances
app, socketio = create_app()