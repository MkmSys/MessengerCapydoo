import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import sqlite3
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'messenger.db')

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db = get_db()
    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        );
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER,
            receiver_id INTEGER,
            text TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            caller_id INTEGER,
            receiver_id INTEGER,
            status TEXT,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
    db.commit()

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='eventlet')

init_db()

@app.route('/')
def index():
    return jsonify({'status': 'ok', 'message': 'Messenger server running'})

@app.route('/register', methods=['POST'])
def register():
    data = request.form or request.json
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({'ok': False, 'error': 'missing fields'}), 400
    db = get_db()
    try:
        db.execute('INSERT INTO users(username, password) VALUES(?, ?)', (username, password))
        db.commit()
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.form or request.json
    username = data.get('username')
    password = data.get('password')
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username=? AND password=?', (username, password)).fetchone()
    if user:
        return jsonify({'ok': True, 'user': {'id': user['id'], 'username': user['username']}})
    return jsonify({'ok': False, 'error': 'invalid credentials'}), 401

@app.route('/messages/<int:userid>', methods=['GET'])
def get_messages(userid):
    db = get_db()
    rows = db.execute('SELECT * FROM messages WHERE receiver_id=? OR sender_id=? ORDER BY timestamp DESC', (userid, userid)).fetchall()
    messages = [dict(r) for r in rows]
    return jsonify({'ok': True, 'messages': messages})

@app.route('/send', methods=['POST'])
def send_message():
    data = request.form or request.json
    sender = int(data.get('sender_id'))
    receiver = int(data.get('receiver_id'))
    text = data.get('text','')
    db = get_db()
    db.execute('INSERT INTO messages(sender_id, receiver_id, text) VALUES(?,?,?)', (sender, receiver, text))
    db.commit()
    # emit via socketio to room of receiver if connected
    socketio.emit('message', {'sender_id': sender, 'receiver_id': receiver, 'text': text, 'timestamp': datetime.utcnow().isoformat()}, room=f'user_{receiver}')
    return jsonify({'ok': True})

# Signaling and realtime events
@socketio.on('connect')
def on_connect():
    print('client connected', request.sid)
    emit('connected', {'sid': request.sid})

@socketio.on('register_socket')
def on_register_socket(data):
    # data: {user_id: <int>}
    user_id = data.get('user_id')
    if user_id:
        join_room(f'user_{user_id}')
        emit('registered', {'ok': True})

@socketio.on('join_call')
def on_join_call(data):
    room = data.get('room')
    join_room(room)
    emit('user_joined', {'sid': request.sid}, room=room, include_self=False)

@socketio.on('signal')
def on_signal(data):
    # forward signaling data to room participants (offer/answer/candidate)
    room = data.get('room')
    socketio.emit('signal', data, room=room, include_self=False)

@socketio.on('message')
def on_ws_message(data):
    # data: {sender_id, receiver_id, text}
    receiver = data.get('receiver_id')
    socketio.emit('message', data, room=f'user_{receiver}')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port)