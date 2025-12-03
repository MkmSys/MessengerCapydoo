const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

let users = [];

app.post('/register', (req, res) => {
    const { username } = req.body;
    if(!username) return res.json({ success: false, message: "Введите юзернейм" });
    if(users.includes(username)) return res.json({ success: false, message: "Юзернейм занят" });

    users.push(username);
    res.json({ success: true });
});

app.post('/login', (req, res) => {
    const { username } = req.body;
    if(users.includes(username)) {
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Юзернейм не найден" });
    }
});

app.post('/joinCall', (req, res) => {
    res.json({ message: "Вы присоединились к групповому звонку!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
