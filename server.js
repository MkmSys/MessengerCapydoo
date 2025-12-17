const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware с улучшенной обработкой CORS
app.use(cors({
    origin: ['http://localhost', 'http://127.0.0.1', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));

// Логирование всех запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Подключение к MongoDB с обработкой ошибок
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/class6g', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Таймаут 5 секунд
            socketTimeoutMS: 45000, // Таймаут сокета 45 секунд
        });
        console.log('✅ MongoDB подключена успешно');
        
        // Создаем индексы для оптимизации
        await mongoose.connection.db.collection('homeworks').createIndex({ timestamp: -1 });
        await mongoose.connection.db.collection('news').createIndex({ timestamp: -1 });
        console.log('✅ Индексы созданы');
        
    } catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', error.message);
        console.log('⚠️  Работаем без базы данных, используем временное хранилище');
        
        // Создаем временное хранилище в памяти
        createInMemoryStorage();
    }
};

// Временное хранилище в памяти (если MongoDB не доступна)
let inMemoryStorage = {
    homeworks: [],
    news: [],
    schedule: [],
    links: []
};

function createInMemoryStorage() {
    console.log('📝 Создано временное хранилище в памяти');
    
    // Начальные данные для временного хранилища
    inMemoryStorage.schedule = [
        { _id: '1', day: 'Понедельник', lessons: ['Математика', 'Русский язык', 'Литература', 'Физкультура', 'Английский язык'] },
        { _id: '2', day: 'Вторник', lessons: ['История', 'География', 'Биология', 'Технология', 'Музыка'] },
        { _id: '3', day: 'Среда', lessons: ['Математика', 'Русский язык', 'Физика', 'Химия', 'ИЗО'] },
        { _id: '4', day: 'Четверг', lessons: ['Английский язык', 'Обществознание', 'Информатика', 'Физкультура', 'Классный час'] },
        { _id: '5', day: 'Пятница', lessons: ['Литература', 'География', 'Биология', 'История', 'ОБЖ'] }
    ];
    
    inMemoryStorage.links = [
        { _id: '1', title: 'Российская электронная школа', url: 'https://resh.edu.ru', description: 'Бесплатные уроки и задания по всем предметам' },
        { _id: '2', title: 'Яндекс.Учебник', url: 'https://education.yandex.ru', description: 'Интерактивные задания для школьников' },
        { _id: '3', title: 'Учи.ру', url: 'https://uchi.ru', description: 'Образовательная онлайн-платформа' }
    ];
}

// Модели данных
const HomeworkSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    task: { type: String, required: true },
    date: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const NewsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const ScheduleSchema = new mongoose.Schema({
    day: { type: String, required: true, unique: true },
    lessons: { type: [String], required: true }
});

const LinkSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    description: String,
    timestamp: { type: Date, default: Date.now }
});

const Homework = mongoose.model('Homework', HomeworkSchema);
const News = mongoose.model('News', NewsSchema);
const Schedule = mongoose.model('Schedule', ScheduleSchema);
const Link = mongoose.model('Link', LinkSchema);

// Проверка состояния базы данных
let isMongoDBConnected = false;

mongoose.connection.on('connected', () => {
    isMongoDBConnected = true;
    console.log('✅ Соединение с MongoDB установлено');
});

mongoose.connection.on('error', (err) => {
    isMongoDBConnected = false;
    console.error('❌ Ошибка соединения с MongoDB:', err.message);
});

mongoose.connection.on('disconnected', () => {
    isMongoDBConnected = false;
    console.log('⚠️  Соединение с MongoDB разорвано');
});

// Маршруты API

// Проверка здоровья сервера
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Сервер работает',
        database: isMongoDBConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Домашние задания
app.get('/api/homework', async (req, res) => {
    try {
        let homework;
        if (isMongoDBConnected) {
            homework = await Homework.find().sort({ timestamp: -1 }).limit(50);
        } else {
            homework = inMemoryStorage.homeworks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        res.json(homework);
    } catch (error) {
        console.error('Ошибка при получении домашних заданий:', error);
        res.status(500).json({ 
            error: 'Ошибка при получении домашних заданий',
            details: error.message 
        });
    }
});

app.post('/api/homework', async (req, res) => {
    try {
        if (!req.body.subject || !req.body.task || !req.body.date) {
            return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
        }
        
        let savedHomework;
        if (isMongoDBConnected) {
            const newHomework = new Homework(req.body);
            savedHomework = await newHomework.save();
        } else {
            const newHomework = {
                _id: Date.now().toString(),
                ...req.body,
                timestamp: new Date()
            };
            inMemoryStorage.homeworks.push(newHomework);
            savedHomework = newHomework;
        }
        
        res.status(201).json(savedHomework);
    } catch (error) {
        console.error('Ошибка при сохранении домашнего задания:', error);
        res.status(500).json({ 
            error: 'Ошибка при сохранении домашнего задания',
            details: error.message 
        });
    }
});

// Новости
app.get('/api/news', async (req, res) => {
    try {
        let news;
        if (isMongoDBConnected) {
            news = await News.find().sort({ timestamp: -1 }).limit(50);
        } else {
            news = inMemoryStorage.news.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        res.json(news);
    } catch (error) {
        console.error('Ошибка при получении новостей:', error);
        res.status(500).json({ 
            error: 'Ошибка при получении новостей',
            details: error.message 
        });
    }
});

app.post('/api/news', async (req, res) => {
    try {
        if (!req.body.title || !req.body.content) {
            return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
        }
        
        const currentDate = new Date().toLocaleDateString('ru-RU');
        
        let savedNews;
        if (isMongoDBConnected) {
            const newNews = new News({
                ...req.body,
                date: req.body.date || currentDate
            });
            savedNews = await newNews.save();
        } else {
            const newNews = {
                _id: Date.now().toString(),
                ...req.body,
                date: req.body.date || currentDate,
                timestamp: new Date()
            };
            inMemoryStorage.news.push(newNews);
            savedNews = newNews;
        }
        
        res.status(201).json(savedNews);
    } catch (error) {
        console.error('Ошибка при сохранении новости:', error);
        res.status(500).json({ 
            error: 'Ошибка при сохранении новости',
            details: error.message 
        });
    }
});

// Расписание
app.get('/api/schedule', async (req, res) => {
    try {
        let schedule;
        if (isMongoDBConnected) {
            schedule = await Schedule.find().sort({ day: 1 });
        } else {
            schedule = inMemoryStorage.schedule.sort((a, b) => {
                const daysOrder = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
                return daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
            });
        }
        res.json(schedule);
    } catch (error) {
        console.error('Ошибка при получении расписания:', error);
        res.status(500).json({ 
            error: 'Ошибка при получении расписания',
            details: error.message,
            fallback: inMemoryStorage.schedule // Отправляем резервные данные
        });
    }
});

app.post('/api/schedule', async (req, res) => {
    try {
        const { day, lessons } = req.body;
        
        if (!day || !lessons || !Array.isArray(lessons)) {
            return res.status(400).json({ error: 'Неверные данные расписания' });
        }
        
        if (isMongoDBConnected) {
            const existing = await Schedule.findOne({ day });
            
            if (existing) {
                existing.lessons = lessons;
                await existing.save();
                res.json(existing);
            } else {
                const newSchedule = new Schedule({ day, lessons });
                const saved = await newSchedule.save();
                res.status(201).json(saved);
            }
        } else {
            // Работаем с временным хранилищем
            const existingIndex = inMemoryStorage.schedule.findIndex(item => item.day === day);
            
            if (existingIndex >= 0) {
                inMemoryStorage.schedule[existingIndex].lessons = lessons;
                res.json(inMemoryStorage.schedule[existingIndex]);
            } else {
                const newSchedule = {
                    _id: Date.now().toString(),
                    day,
                    lessons
                };
                inMemoryStorage.schedule.push(newSchedule);
                res.status(201).json(newSchedule);
            }
        }
    } catch (error) {
        console.error('Ошибка при сохранении расписания:', error);
        res.status(500).json({ 
            error: 'Ошибка при сохранении расписания',
            details: error.message 
        });
    }
});

app.delete('/api/schedule/:day', async (req, res) => {
    try {
        const { day } = req.params;
        
        if (isMongoDBConnected) {
            await Schedule.deleteOne({ day });
        } else {
            const index = inMemoryStorage.schedule.findIndex(item => item.day === day);
            if (index >= 0) {
                inMemoryStorage.schedule.splice(index, 1);
            }
        }
        
        res.json({ message: 'Расписание удалено' });
    } catch (error) {
        console.error('Ошибка при удалении расписания:', error);
        res.status(500).json({ 
            error: 'Ошибка при удалении расписания',
            details: error.message 
        });
    }
});

// Ссылки
app.get('/api/links', async (req, res) => {
    try {
        let links;
        if (isMongoDBConnected) {
            links = await Link.find().sort({ timestamp: -1 });
        } else {
            links = inMemoryStorage.links.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        res.json(links);
    } catch (error) {
        console.error('Ошибка при получении ссылок:', error);
        res.status(500).json({ 
            error: 'Ошибка при получении ссылок',
            details: error.message 
        });
    }
});

app.post('/api/links', async (req, res) => {
    try {
        const { title, url, description } = req.body;
        
        if (!title || !url) {
            return res.status(400).json({ error: 'Заполните название и URL' });
        }
        
        let savedLink;
        if (isMongoDBConnected) {
            const newLink = new Link({ title, url, description });
            savedLink = await newLink.save();
        } else {
            const newLink = {
                _id: Date.now().toString(),
                title,
                url,
                description: description || '',
                timestamp: new Date()
            };
            inMemoryStorage.links.push(newLink);
            savedLink = newLink;
        }
        
        res.status(201).json(savedLink);
    } catch (error) {
        console.error('Ошибка при сохранении ссылки:', error);
        res.status(500).json({ 
            error: 'Ошибка при сохранении ссылки',
            details: error.message 
        });
    }
});

app.delete('/api/links/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (isMongoDBConnected) {
            await Link.findByIdAndDelete(id);
        } else {
            const index = inMemoryStorage.links.findIndex(link => link._id === id);
            if (index >= 0) {
                inMemoryStorage.links.splice(index, 1);
            }
        }
        
        res.json({ message: 'Ссылка удалена' });
    } catch (error) {
        console.error('Ошибка при удалении ссылки:', error);
        res.status(500).json({ 
            error: 'Ошибка при удалении ссылки',
            details: error.message 
        });
    }
});

// Экспорт всех данных (для резервного копирования)
app.get('/api/export', async (req, res) => {
    try {
        let data = {};
        
        if (isMongoDBConnected) {
            data.homework = await Homework.find();
            data.news = await News.find();
            data.schedule = await Schedule.find();
            data.links = await Link.find();
        } else {
            data = inMemoryStorage;
        }
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            database: isMongoDBConnected ? 'mongodb' : 'memory',
            data: data
        });
    } catch (error) {
        console.error('Ошибка при экспорте данных:', error);
        res.status(500).json({ error: 'Ошибка при экспорте данных' });
    }
});

// Импорт данных (для восстановления)
app.post('/api/import', async (req, res) => {
    try {
        const importData = req.body;
        
        if (!importData || !importData.data) {
            return res.status(400).json({ error: 'Нет данных для импорта' });
        }
        
        if (isMongoDBConnected) {
            if (importData.data.homework) {
                await Homework.deleteMany({});
                await Homework.insertMany(importData.data.homework);
            }
            
            if (importData.data.news) {
                await News.deleteMany({});
                await News.insertMany(importData.data.news);
            }
            
            if (importData.data.schedule) {
                await Schedule.deleteMany({});
                await Schedule.insertMany(importData.data.schedule);
            }
            
            if (importData.data.links) {
                await Link.deleteMany({});
                await Link.insertMany(importData.data.links);
            }
        } else {
            if (importData.data.homework) inMemoryStorage.homeworks = importData.data.homework;
            if (importData.data.news) inMemoryStorage.news = importData.data.news;
            if (importData.data.schedule) inMemoryStorage.schedule = importData.data.schedule;
            if (importData.data.links) inMemoryStorage.links = importData.data.links;
        }
        
        res.json({ 
            success: true, 
            message: 'Данные успешно импортированы',
            imported: Object.keys(importData.data)
        });
    } catch (error) {
        console.error('Ошибка при импорте данных:', error);
        res.status(500).json({ error: 'Ошибка при импорте данных' });
    }
});

// Обработка 404 ошибок
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint не найден',
        path: req.originalUrl,
        method: req.method
    });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
    console.error('🚨 Необработанная ошибка:', err);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Запуск сервера
const startServer = async () => {
    try {
        await connectDB();
        
        app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен на порту ${PORT}`);
            console.log(`📡 API доступен по адресу: http://localhost:${PORT}/api`);
            console.log(`🌐 Проверка здоровья: http://localhost:${PORT}/api/health`);
            console.log(`💾 Состояние базы данных: ${isMongoDBConnected ? 'Подключена' : 'Не подключена'}`);
            console.log('='.repeat(50));
        });
    } catch (error) {
        console.error('❌ Не удалось запустить сервер:', error);
        process.exit(1);
    }
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Получен сигнал SIGINT, завершаем работу...');
    await mongoose.connection.close();
    console.log('✅ Соединение с MongoDB закрыто');
    process.exit(0);
});
