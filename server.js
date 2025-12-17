const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Для обслуживания статических файлов

// Подключение к MongoDB
mongoose.connect('mongodb://localhost:27017/class6g', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Модели данных
const HomeworkSchema = new mongoose.Schema({
    subject: String,
    task: String,
    date: String,
    timestamp: { type: Date, default: Date.now }
});

const NewsSchema = new mongoose.Schema({
    title: String,
    content: String,
    date: String,
    timestamp: { type: Date, default: Date.now }
});

const ScheduleSchema = new mongoose.Schema({
    day: String,
    lessons: [String]
});

const LinkSchema = new mongoose.Schema({
    title: String,
    url: String,
    description: String,
    timestamp: { type: Date, default: Date.now }
});

const Homework = mongoose.model('Homework', HomeworkSchema);
const News = mongoose.model('News', NewsSchema);
const Schedule = mongoose.model('Schedule', ScheduleSchema);
const Link = mongoose.model('Link', LinkSchema);

// Маршруты API

// Проверка здоровья сервера
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Сервер работает' });
});

// Домашние задания
app.get('/api/homework', async (req, res) => {
    try {
        const homework = await Homework.find().sort({ timestamp: -1 });
        res.json(homework);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при получении домашних заданий' });
    }
});

app.post('/api/homework', async (req, res) => {
    try {
        const newHomework = new Homework(req.body);
        await newHomework.save();
        res.status(201).json(newHomework);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при сохранении домашнего задания' });
    }
});

// Новости
app.get('/api/news', async (req, res) => {
    try {
        const news = await News.find().sort({ timestamp: -1 });
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при получении новостей' });
    }
});

app.post('/api/news', async (req, res) => {
    try {
        const newNews = new News(req.body);
        await newNews.save();
        res.status(201).json(newNews);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при сохранении новости' });
    }
});

// Расписание
app.get('/api/schedule', async (req, res) => {
    try {
        const schedule = await Schedule.find();
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при получении расписания' });
    }
});

app.post('/api/schedule', async (req, res) => {
    try {
        const { day, lessons } = req.body;
        
        // Проверяем, существует ли уже расписание на этот день
        const existing = await Schedule.findOne({ day });
        
        if (existing) {
            // Обновляем существующее расписание
            existing.lessons = lessons;
            await existing.save();
            res.json(existing);
        } else {
            // Создаем новое расписание
            const newSchedule = new Schedule({ day, lessons });
            await newSchedule.save();
            res.status(201).json(newSchedule);
        }
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при сохранении расписания' });
    }
});

app.delete('/api/schedule/:day', async (req, res) => {
    try {
        const { day } = req.params;
        await Schedule.deleteOne({ day });
        res.json({ message: 'Расписание удалено' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при удалении расписания' });
    }
});

// Ссылки
app.get('/api/links', async (req, res) => {
    try {
        const links = await Link.find().sort({ timestamp: -1 });
        res.json(links);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при получении ссылок' });
    }
});

app.post('/api/links', async (req, res) => {
    try {
        const newLink = new Link(req.body);
        await newLink.save();
        res.status(201).json(newLink);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при сохранении ссылки' });
    }
});

app.delete('/api/links/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Link.findByIdAndDelete(id);
        res.json({ message: 'Ссылка удалена' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при удалении ссылки' });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});