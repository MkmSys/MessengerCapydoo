const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Данные в памяти
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

// Загрузка/сохранение данных в файл
const DATA_FILE = 'data.json';

async function loadData() {
    try {
        const fileData = await fs.readFile(DATA_FILE, 'utf8');
        Object.assign(data, JSON.parse(fileData));
    } catch (error) {
        await saveData();
    }
}

async function saveData() {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Сервер работает' });
});

// Расписание
app.get('/api/schedule', (req, res) => {
    res.json(data.schedule);
});

app.post('/api/schedule', (req, res) => {
    const { day, lessons } = req.body;
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
    
    saveData();
    res.json({ success: true });
});

// Домашние задания
app.get('/api/homework', (req, res) => {
    res.json(data.homework.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

app.post('/api/homework', (req, res) => {
    const homework = {
        id: Date.now(),
        ...req.body,
        timestamp: new Date().toISOString()
    };
    data.homework.push(homework);
    saveData();
    res.status(201).json(homework);
});

// Новости
app.get('/api/news', (req, res) => {
    res.json(data.news.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

app.post('/api/news', (req, res) => {
    const news = {
        id: Date.now(),
        ...req.body,
        date: new Date().toLocaleDateString('ru-RU'),
        timestamp: new Date().toISOString()
    };
    data.news.push(news);
    saveData();
    res.status(201).json(news);
});

// Ссылки
app.get('/api/links', (req, res) => {
    res.json(data.links);
});

app.post('/api/links', (req, res) => {
    const link = {
        id: Date.now(),
        ...req.body,
        timestamp: new Date().toISOString()
    };
    data.links.push(link);
    saveData();
    res.status(201).json(link);
});

// Отдача статики
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
loadData().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Сервер Express запущен на порту ${PORT}`);
        console.log(`🌐 Откройте: http://localhost:${PORT}`);
        console.log(`💾 Данные сохраняются в: ${DATA_FILE}`);
    });
});
