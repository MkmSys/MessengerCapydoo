// Node.js сервер с группами, чатами и WebRTC
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('../client'));

const db = new sqlite3.Database('./db.sqlite');

// Таблицы пользователей, сообщений, групп
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender TEXT, receiver TEXT, content TEXT, group_id INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
  db.run(`CREATE TABLE IF NOT EXISTS group_members (group_id INTEGER, username TEXT)`);
});

// API регистрации и логина
app.post('/api/register', (req,res)=>{ const {username,password}=req.body; db.run('INSERT INTO users(username,password) VALUES(?,?)',[username,password],function(err){ if(err) return res.status(400).json({error:'Username exists'}); res.json({id:this.lastID,username});});});
app.post('/api/login', (req,res)=>{ const {username,password}=req.body; db.get('SELECT * FROM users WHERE username=? AND password=?',[username,password],(err,row)=>{ if(!row) return res.status(400).json({error:'Invalid login'}); res.json({id:row.id,username:row.username});});});

// Получить пользователей
app.get('/api/users',(req,res)=>{ db.all('SELECT username FROM users',[],(err,rows)=>{ res.json(rows); }); });

// Группы
app.post('/api/groups',(req,res)=>{ const {name}=req.body; db.run('INSERT INTO groups(name) VALUES(?)',[name],function(err){ if(err) return res.status(400).json({error:'Group exists'}); res.json({id:this.lastID,name}); });});
app.get('/api/groups',(req,res)=>{ db.all('SELECT * FROM groups',[],(err,rows)=>{ res.json(rows); }); });
app.post('/api/groups/:id/join',(req,res)=>{ const {id}=req.params; const {username}=req.body; db.run('INSERT INTO group_members(group_id,username) VALUES(?,?)',[id,username],(err)=>{ if(err) return res.status(400).json({error:'Already in group'}); res.json({success:true});});});

// Сообщения
app.post('/api/messages',(req,res)=>{ const {sender,receiver,content,group_id}=req.body; db.run('INSERT INTO messages(sender,receiver,content,group_id) VALUES(?,?,?,?)',[sender,receiver,content,group_id],function(err){ if(err) return res.status(500).json({error:'DB error'}); res.json({id:this.lastID,sender,receiver,content,group_id}); }); });
app.get('/api/messages/:user1/:user2',(req,res)=>{ const {user1,user2}=req.params; db.all('SELECT * FROM messages WHERE ((sender=? AND receiver=?) OR (sender=? AND receiver=?)) AND group_id IS NULL ORDER BY timestamp ASC',[user1,user2,user2,user1],(err,rows)=>{ res.json(rows); }); });
app.get('/api/messages/group/:id',(req,res)=>{ const {id}=req.params; db.all('SELECT * FROM messages WHERE group_id=? ORDER BY timestamp ASC',[id],(err,rows)=>{ res.json(rows); }); });

// WebSocket для сообщений и WebRTC
const server = app.listen(port,()=>console.log(`Server on ${port}`));
const wss = new WebSocket.Server({server});
wss.on('connection', ws=>{ ws.on('message',msg=>{ const data=JSON.parse(msg); wss.clients.forEach(c=>{ if(c.readyState===WebSocket.OPEN) c.send(JSON.stringify(data)); }); });});