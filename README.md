
Messenger server (Flask + Socket.IO + SQLite)

Run locally:
    pip install -r requirements.txt
    python app.py

The server exposes:
  POST /register  {username,password}
  POST /login     {username,password}
  POST /send      {sender_id,receiver_id,text}
  GET  /messages/<userid>

WebSocket (socket.io) events:
  connect
  register_socket {user_id}
  message {sender_id,receiver_id,text}
  join_call {room}
  signal {room,offer/answer/candidate}
