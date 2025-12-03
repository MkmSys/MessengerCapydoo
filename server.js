const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

let users = {};      // { socketId: { username, userId } }
let usernames = {};  // { username: userId }
let chats = {};      // { chatId: { users: [userId1, userId2], messages: [] } }

let nextUserId = 1;
let nextChatId = 1;

// Регистрация
app.post('/register', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Введите юзернейм' });
    if (usernames[username]) return res.status(400).json({ error: 'Юзернейм занят' });

    const userId = nextUserId++;
    usernames[username] = userId;
    res.json({ success: true, userId });
});

// Вход
app.post('/login', (req, res) => {
    const { username } = req.body;
    const userId = usernames[username];
    if (!userId) return res.status(400).json({ error: 'Юзернейм не найден' });
    res.json({ success: true, userId });
});

// Поиск пользователей
app.get('/search/:username', (req, res) => {
    const search = req.params.username.toLowerCase();
    const results = Object.keys(usernames)
        .filter(name => name.toLowerCase().includes(search));
    res.json({ results });
});

// Socket.IO
io.on('connection', socket => {
    console.log('Пользователь подключился', socket.id);

    // Пользователь присоединился
    socket.on('join', data => {
        users[socket.id] = { username: data.username, userId: data.userId };
        console.log(users[socket.id]);
    });

    // Отправка сообщений
    socket.on('send-message', data => {
        const { toUserId, text } = data;

        // Найти чат между пользователями
        let chatId = null;
        for (let id in chats) {
            const c = chats[id];
            if (c.users.includes(users[socket.id].userId) && c.users.includes(toUserId)) {
                chatId = id;
                break;
            }
        }

        if (!chatId) {
            chatId = nextChatId++;
            chats[chatId] = { users: [users[socket.id].userId, toUserId], messages: [] };
        }

        const message = { from: users[socket.id].userId, text, time: Date.now() };
        chats[chatId].messages.push(message);

        // Отправить сообщение пользователю
        for (let id in users) {
            if (users[id].userId === toUserId || id === socket.id) {
                io.to(id).emit('receive-message', { chatId, message, fromUsername: users[socket.id].username });
            }
        }
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        console.log('Пользователь отключился');
    });
});

http.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
