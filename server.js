// server-sqlite.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Инициализация базы данных SQLite
const db = new sqlite3.Database('./class6g.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к SQLite:', err.message);
    } else {
        console.log('✅ Подключено к SQLite базе данных');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Создаем таблицы если их нет
    db.run(`CREATE TABLE IF NOT EXISTS homework (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        task TEXT NOT NULL,
        date TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        date TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT UNIQUE NOT NULL,
        lessons TEXT NOT NULL
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Добавляем начальные данные если таблицы пустые
    db.get("SELECT COUNT(*) as count FROM schedule", (err, row) => {
        if (row.count === 0) {
            const initialSchedule = [
                ['Понедельник', 'Математика, Русский язык, Литература, Физкультура, Английский язык'],
                ['Вторник', 'История, География, Биология, Технология, Музыка'],
                ['Среда', 'Математика, Русский язык, Физика, Химия, ИЗО'],
                ['Четверг', 'Английский язык, Обществознание, Информатика, Физкультура, Классный час'],
                ['Пятница', 'Литература, География, Биология, История, ОБЖ']
            ];
            
            const stmt = db.prepare("INSERT INTO schedule (day, lessons) VALUES (?, ?)");
            initialSchedule.forEach(([day, lessons]) => {
                stmt.run(day, lessons);
            });
            stmt.finalize();
            console.log('📅 Добавлено начальное расписание');
        }
    });
}

// Маршруты API
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Сервер работает', database: 'sqlite' });
});

// Домашние задания
app.get('/api/homework', (req, res) => {
    db.all("SELECT * FROM homework ORDER BY timestamp DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/homework', (req, res) => {
    const { subject, task, date } = req.body;
    db.run("INSERT INTO homework (subject, task, date) VALUES (?, ?, ?)",
        [subject, task, date],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, subject, task, date });
            }
        }
    );
});

// Расписание
app.get('/api/schedule', (req, res) => {
    db.all("SELECT * FROM schedule ORDER BY id", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            // Преобразуем строку lessons в массив
            const schedule = rows.map(row => ({
                ...row,
                lessons: row.lessons.split(', ').map(lesson => lesson.trim())
            }));
            res.json(schedule);
        }
    });
});

app.post('/api/schedule', (req, res) => {
    const { day, lessons } = req.body;
    const lessonsStr = Array.isArray(lessons) ? lessons.join(', ') : lessons;
    
    db.run("INSERT OR REPLACE INTO schedule (day, lessons) VALUES (?, ?)",
        [day, lessonsStr],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ day, lessons: lessonsStr });
            }
        }
    );
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
