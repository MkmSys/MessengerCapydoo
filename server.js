const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));

// Простая база пользователей в памяти
const users = {}; // username -> { userId, username }

// Роуты регистрации и входа
app.post('/register', (req, res) => {
    const { username } = req.body;
    if(!username) return res.json({error:'Введите юзернейм'});
    if(users[username]) return res.json({error:'Юзернейм занят'});
    const userId = uuidv4();
    users[username] = { username, userId };
    res.json({userId});
});

app.post('/login', (req, res) => {
    const { username } = req.body;
    if(!username) return res.json({error:'Введите юзернейм'});
    if(!users[username]) return res.json({error:'Пользователь не найден'});
    res.json({userId: users[username].userId});
});

// Поиск пользователей
app.get('/search/:query', (req,res)=>{
    const query = req.params.query.toLowerCase();
    const results = Object.keys(users).filter(u=>u.toLowerCase().includes(query));
    res.json({results});
});

// Socket.IO
const onlineUsers = {}; // userId -> socket.id

io.on('connection', socket=>{
    console.log('Новое подключение', socket.id);

    socket.on('join', (user)=>{
        onlineUsers[user.userId] = socket.id;
        console.log('Пользователь онлайн:', user.username);
    });

    socket.on('send-message', (data)=>{
        const {toUserId,text} = data;
        const fromUserId = Object.keys(onlineUsers).find(id=>onlineUsers[id]===socket.id);
        const toSocketId = onlineUsers[toUserId];
        if(toSocketId){
            io.to(toSocketId).emit('receive-message',{fromUsername: users[toUserId].username, message:{text, from: fromUserId}});
        }
    });

    socket.on('disconnect', ()=>{
        for(const [userId,sid] of Object.entries(onlineUsers)){
            if(sid===socket.id) delete onlineUsers[userId];
        }
        console.log('Пользователь отключился');
    });
});

server.listen(3000, ()=>console.log('Server running on http://localhost:3000'));
