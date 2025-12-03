from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import sqlite3
from datetime import datetime
import hashlib
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

def init_db():
    conn = sqlite3.connect('messages.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS messages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT,
                  message TEXT,
                  room TEXT,
                  timestamp TEXT,
                  reactions TEXT)''')
    conn.commit()
    conn.close()

    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE,
                  password TEXT,
                  avatar TEXT,
                  is_admin INTEGER DEFAULT 0)''')
    conn.commit()
    conn.close()

init_db()

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = hashlib.sha256(data.get('password').encode()).hexdigest()
    avatar = f"https://api.dicebear.com/5.x/identicon/svg?seed={random.randint(1,10000)}"
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (username,password,avatar) VALUES (?,?,?)", (username,password,avatar))
        conn.commit()
        return jsonify({'status':'ok', 'avatar': avatar})
    except sqlite3.IntegrityError:
        return jsonify({'status':'error', 'msg':'Username taken'})
    finally:
        conn.close()

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = hashlib.sha256(data.get('password').encode()).hexdigest()
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute("SELECT username, avatar, is_admin FROM users WHERE username=? AND password=?", (username, password))
    user = c.fetchone()
    conn.close()
    if user:
        return jsonify({'status':'ok', 'username': user[0], 'avatar': user[1], 'is_admin': user[2]})
    return jsonify({'status':'error', 'msg':'Invalid credentials'})

@app.route('/messages/<room>', methods=['GET'])
def get_messages(room):
    conn = sqlite3.connect('messages.db')
    c = conn.cursor()
    c.execute("SELECT id, username, message, timestamp, reactions FROM messages WHERE room=? ORDER BY id ASC", (room,))
    rows = c.fetchall()
    conn.close()
    messages = [{"id": row[0], "username": row[1], "message": row[2], "timestamp": row[3], "reactions": row[4] or ""} for row in rows]
    return jsonify(messages)

@app.route('/delete_message', methods=['POST'])
def delete_message():
    data = request.json
    msg_id = data.get('id')
    conn = sqlite3.connect('messages.db')
    c = conn.cursor()
    c.execute("DELETE FROM messages WHERE id=?", (msg_id,))
    conn.commit()
    conn.close()
    return jsonify({'status':'ok'})

online_users = set()

@socketio.on('join')
def handle_join(data):
    username = data['username']
    room = data.get('room','general')
    join_room(room)
    online_users.add(username)
    emit('user_update', list(online_users), broadcast=True)
    emit('status', {'msg': f'{username} joined {room}'}, room=room)

@socketio.on('leave')
def handle_leave(data):
    username = data['username']
    room = data.get('room','general')
    leave_room(room)
    if username in online_users:
        online_users.remove(username)
    emit('user_update', list(online_users), broadcast=True)
    emit('status', {'msg': f'{username} left {room}'}, room=room)

@socketio.on('send_message')
def handle_message(data):
    username = data['username']
    message = data['message']
    room = data.get('room','general')
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = sqlite3.connect('messages.db')
    c = conn.cursor()
    c.execute("INSERT INTO messages (username,message,room,timestamp) VALUES (?,?,?,?)",
              (username,message,room,timestamp))
    msg_id = c.lastrowid
    conn.commit()
    conn.close()

    emit('new_message', {'id': msg_id,'username': username, 'message': message, 'timestamp': timestamp, 'room': room, 'reactions': ""}, room=room)

@socketio.on('react')
def handle_react(data):
    msg_id = data['id']
    reaction = data['reaction']
    conn = sqlite3.connect('messages.db')
    c = conn.cursor()
    c.execute("SELECT reactions FROM messages WHERE id=?", (msg_id,))
    row = c.fetchone()
    reactions = row[0] or ""
    reactions += f"{reaction} "
    c.execute("UPDATE messages SET reactions=? WHERE id=?", (reactions,msg_id))
    conn.commit()
    conn.close()
    emit('update_reaction', {'id': msg_id, 'reactions': reactions}, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
