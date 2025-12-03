const express = require('express');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// Раздаём фронтенд
app.use(express.static(path.join(__dirname, 'public')));

// Запуск HTTP сервера
const server = app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

// WebSocket сервер
const wss = new WebSocket.Server({ server });

let users = {}; // username -> ws
let chats = []; // {id, users:[user1,user2], messages:[]}

// Генератор ID чата
const generateChatId = () => Math.random().toString(36).substr(2, 9);

wss.on('connection', ws => {
  let username = null;

  ws.on('message', msg => {
    const data = JSON.parse(msg);

    if (data.type === 'init') {
      username = data.username;
      users[username] = ws;

      // Создаём чат с новым пользователем, если ещё нет
      if (!chats.some(c => c.users.includes(username))) {
        chats.push({ id: generateChatId(), users: [username], messages: [] });
      }

      // Отправляем список чатов
      ws.send(JSON.stringify({ type: 'chatsUpdate', chats }));
    }

    if (data.type === 'sendMessage') {
      const chat = chats.find(c => c.id === data.chatId);
      if (chat) {
        chat.messages.push(data.message);

        chat.users.forEach(u => {
          if (users[u] && users[u].readyState === WebSocket.OPEN) {
            users[u].send(JSON.stringify({ type: 'newMessage', chatId: chat.id, message: data.message }));
          }
        });
      }
    }

    if (data.type === 'newChat') {
      // Создать новый чат между двумя пользователями
      const existingChat = chats.find(c => c.users.sort().join(',') === data.users.sort().join(','));
      if (!existingChat) {
        const chat = { id: generateChatId(), users: data.users, messages: [] };
        chats.push(chat);
        data.users.forEach(u => {
          if (users[u] && users[u].readyState === WebSocket.OPEN) {
            users[u].send(JSON.stringify({ type: 'chatsUpdate', chats }));
          }
        });
      }
    }
  });

  ws.on('close', () => {
    if (username) delete users[username];
  });
});
