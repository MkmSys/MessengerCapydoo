const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');

const PORT = 3000;
const DATA_FILE = './class6g-data.json';

// Начальные данные
const initialData = {
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
        { id: 1, title: 'Российская электронная школа', url: 'https://resh.edu.ru', description: 'Бесплатные уроки и задания' },
        { id: 2, title: 'Яндекс.Учебник', url: 'https://education.yandex.ru', description: 'Интерактивные задания' },
        { id: 3, title: 'Учи.ру', url: 'https://uchi.ru', description: 'Образовательная платформа' }
    ]
};

// Загрузка данных
async function loadData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
}

// Сохранение данных
async function saveData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Сервер
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Обработка OPTIONS запроса
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // API endpoints
    if (pathname === '/api/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OK', message: 'Сервер работает' }));
        return;
    }
    
    if (pathname === '/api/schedule' && req.method === 'GET') {
        try {
            const data = await loadData();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data.schedule));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка загрузки' }));
        }
        return;
    }
    
    if (pathname === '/api/schedule' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const { day, lessons } = JSON.parse(body);
                const data = await loadData();
                const index = data.schedule.findIndex(item => item.day === day);
                
                if (index >= 0) {
                    data.schedule[index].lessons = lessons;
                } else {
                    data.schedule.push({
                        id: Date.now(),
                        day,
                        lessons
                    });
                }
                
                await saveData(data);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка сохранения' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/homework' && req.method === 'GET') {
        try {
            const data = await loadData();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data.homework.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка загрузки' }));
        }
        return;
    }
    
    if (pathname === '/api/homework' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const homework = JSON.parse(body);
                const data = await loadData();
                data.homework.push({
                    id: Date.now(),
                    ...homework,
                    timestamp: new Date().toISOString()
                });
                await saveData(data);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка сохранения' }));
            }
        });
        return;
    }
    
    // Отдача статических файлов
    if (req.method === 'GET') {
        let filePath = '.' + pathname;
        if (filePath === './') {
            filePath = './index.html';
        }
        
        const extname = path.extname(filePath);
        let contentType = 'text/html';
        
        switch (extname) {
            case '.js':
                contentType = 'text/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.json':
                contentType = 'application/json';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
                contentType = 'image/jpg';
                break;
        }
        
        try {
            const content = await fs.readFile(filePath);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Файл не найден');
            } else {
                res.writeHead(500);
                res.end('Ошибка сервера');
            }
        }
        return;
    }
    
    // 404 для остальных запросов
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Откройте: http://localhost:${PORT}`);
    console.log(`💾 Данные сохраняются в: ${DATA_FILE}`);
});
