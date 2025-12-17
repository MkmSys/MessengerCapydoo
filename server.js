// server-simple.js - самый простой сервер без зависимостей
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Данные храним в памяти (можно сохранять в файл)
let data = {
    homework: [],
    news: [],
    schedule: [
        { id: 1, day: 'Понедельник', lessons: ['Математика', 'Русский язык', 'Литература', 'Физкультура', 'Английский'] },
        { id: 2, day: 'Вторник', lessons: ['История', 'География', 'Биология', 'Технология', 'Музыка'] },
        { id: 3, day: 'Среда', lessons: ['Математика', 'Русский язык', 'Физика', 'Химия', 'ИЗО'] },
        { id: 4, day: 'Четверг', lessons: ['Английский', 'Обществознание', 'Информатика', 'Физкультура', 'Классный час'] },
        { id: 5, day: 'Пятница', lessons: ['Литература', 'География', 'Биология', 'История', 'ОБЖ'] }
    ],
    links: [
        { id: 1, title: 'Российская электронная школа', url: 'https://resh.edu.ru', description: 'Бесплатные уроки и задания' }
    ]
};

// Сохраняем данные в файл при выходе
process.on('SIGINT', () => {
    console.log('\n💾 Сохраняем данные...');
    fs.writeFileSync('data-backup.json', JSON.stringify(data, null, 2));
    process.exit();
});

// Сервер
const server = http.createServer((req, res) => {
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // OPTIONS запрос
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // API endpoints
    if (req.url === '/api/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OK', message: 'Сервер работает' }));
        return;
    }
    
    if (req.url === '/api/schedule' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data.schedule));
        return;
    }
    
    if (req.url === '/api/schedule' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { day, lessons } = JSON.parse(body);
                const index = data.schedule.findIndex(item => item.day === day);
                
                if (index >= 0) {
                    data.schedule[index].lessons = lessons;
                } else {
                    data.schedule.push({ id: Date.now(), day, lessons });
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка' }));
            }
        });
        return;
    }
    
    if (req.url === '/api/homework' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data.homework));
        return;
    }
    
    if (req.url === '/api/homework' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const homework = JSON.parse(body);
                data.homework.push({
                    id: Date.now(),
                    ...homework,
                    timestamp: new Date().toISOString()
                });
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка' }));
            }
        });
        return;
    }
    
    if (req.url === '/api/news' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data.news));
        return;
    }
    
    if (req.url === '/api/news' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const news = JSON.parse(body);
                data.news.push({
                    id: Date.now(),
                    ...news,
                    timestamp: new Date().toISOString()
                });
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка' }));
            }
        });
        return;
    }
    
    if (req.url === '/api/links' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data.links));
        return;
    }
    
    if (req.url === '/api/links' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const link = JSON.parse(body);
                data.links.push({
                    id: Date.now(),
                    ...link,
                    timestamp: new Date().toISOString()
                });
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка' }));
            }
        });
        return;
    }
    
    // Отдача статических файлов
    if (req.method === 'GET') {
        let filePath = '.' + req.url;
        if (filePath === './') {
            filePath = './index.html';
        }
        
        const extname = path.extname(filePath);
        let contentType = 'text/html';
        
        switch (extname) {
            case '.js': contentType = 'text/javascript'; break;
            case '.css': contentType = 'text/css'; break;
            case '.json': contentType = 'application/json'; break;
            case '.png': contentType = 'image/png'; break;
            case '.jpg': contentType = 'image/jpg'; break;
            case '.ico': contentType = 'image/x-icon'; break;
        }
        
        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404);
                    res.end('Файл не найден');
                } else {
                    res.writeHead(500);
                    res.end('Ошибка сервера');
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
        return;
    }
    
    // 404
    res.writeHead(404);
    res.end('Not Found');
});

// Запуск
server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🚀 СЕРВЕР ЗАПУЩЕН!');
    console.log('='.repeat(50));
    console.log(`📡 Адрес: http://localhost:${PORT}`);
    console.log(`📊 API доступно по: http://localhost:${PORT}/api/`);
    console.log(`🔑 Пароль для редактирования: 990909`);
    console.log('='.repeat(50));
    console.log('Нажмите Ctrl+C для остановки сервера');
});
