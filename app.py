from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory
from flask_socketio import SocketIO, emit
from werkzeug.utils import secure_filename
import os
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key_here'
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max

socketio = SocketIO(app)

users = {}
messages = []

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
        if 'avatar' in request.files:
            file = request.files['avatar']
            if file and allowed_file(file.filename):
                filename = secure_filename(f"{int(time.time())}_{file.filename}")
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                avatar = url_for('uploaded_file', filename=filename)

        if not avatar:
            avatar = url_for('static', filename='img/default-avatar.png')

        session['nickname'] = nickname
        session['avatar'] = avatar
        session['is_admin'] = False
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
        if password == 'adminpass':  # set your admin password
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
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

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
    nickname = session.get('nickname')
    avatar = session.get('avatar')
    text = data.get('message', '').strip()
    if not text:
        return  # Ignore empty messages
    timestamp = time.strftime('%Y-%m-%d %I:%M:%S %p')  # 12-hour format with AM/PM

    msg = {
        'nickname': nickname,
        'avatar': avatar,
        'message': text,
        'timestamp': timestamp
    }
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

# ---------- START ----------

if __name__ == '__main__':
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    socketio.run(app, host='0.0.0.0', port=8000, debug=True)
