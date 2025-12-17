// server.js - сервер для Railway
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Данные храним в памяти (на Railway лучше использовать переменные окружения или БД)
let classData = {
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
        { id: 1, title: 'Российская электронная школа', url: 'https://resh.edu.ru', description: 'Бесплатные уроки и задания по всем предметам' },
        { id: 2, title: 'Яндекс.Учебник', url: 'https://education.yandex.ru', description: 'Интерактивные задания для школьников' },
        { id: 3, title: 'Учи.ру', url: 'https://uchi.ru', description: 'Образовательная онлайн-платформа' }
    ]
};

// API Routes

// Health check (обязательно для Railway)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Сервер сайта 6Г класса работает',
        timestamp: new Date().toISOString(),
        data: {
            homework: classData.homework.length,
            news: classData.news.length,
            schedule: classData.schedule.length,
            links: classData.links.length
        }
    });
});

// Расписание
app.get('/api/schedule', (req, res) => {
    res.json(classData.schedule);
});

app.post('/api/schedule', (req, res) => {
    try {
        const { day, lessons } = req.body;
        
        if (!day || !lessons) {
            return res.status(400).json({ error: 'Необходимы day и lessons' });
        }
        
        const index = classData.schedule.findIndex(item => item.day === day);
        
        if (index >= 0) {
            classData.schedule[index].lessons = lessons;
        } else {
            classData.schedule.push({
                id: Date.now(),
                day,
                lessons
            });
        }
        
        res.json({ success: true, message: 'Расписание обновлено' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Домашние задания
app.get('/api/homework', (req, res) => {
    res.json(classData.homework.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

app.post('/api/homework', (req, res) => {
    try {
        const { subject, task, date } = req.body;
        
        if (!subject || !task || !date) {
            return res.status(400).json({ error: 'Заполните все поля' });
        }
        
        const newHomework = {
            id: Date.now(),
            subject,
            task,
            date,
            timestamp: new Date().toISOString()
        };
        
        classData.homework.push(newHomework);
        res.status(201).json(newHomework);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// Новости
app.get('/api/news', (req, res) => {
    res.json(classData.news.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

app.post('/api/news', (req, res) => {
    try {
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Заполните заголовок и содержание' });
        }
        
        const newNews = {
            id: Date.now(),
            title,
            content,
            date: new Date().toLocaleDateString('ru-RU'),
            timestamp: new Date().toISOString()
        };
        
        classData.news.push(newNews);
        res.status(201).json(newNews);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// Ссылки
app.get('/api/links', (req, res) => {
    res.json(classData.links);
});

app.post('/api/links', (req, res) => {
    try {
        const { title, url, description } = req.body;
        
        if (!title || !url) {
            return res.status(400).json({ error: 'Заполните название и URL' });
        }
        
        const newLink = {
            id: Date.now(),
            title,
            url,
            description: description || '',
            timestamp: new Date().toISOString()
        };
        
        classData.links.push(newLink);
        res.status(201).json(newLink);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// Статические файлы
app.use(express.static(path.join(__dirname)));

// Все остальные GET запросы отправляют index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📡 API доступен: /api/health`);
    console.log(`🏫 Сайт 6Г класса готов к работе!`);
});
