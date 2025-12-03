
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

let users = [];
let messages = [];
let groups = [];

const SECRET = 'SECRET_KEY';

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if(users.find(u => u.username === username)) return res.status(400).json({error:'Username exists'});
    const hash = await bcrypt.hash(password, 10);
    const id = 'u'+(users.length+1);
    users.push({id, username, email, passwordHash: hash});
    res.json({success:true});
});

app.post('/login', async (req,res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if(!user) return res.status(400).json({error:'User not found'});
    const match = await bcrypt.compare(password, user.passwordHash);
    if(!match) return res.status(400).json({error:'Wrong password'});
    const token = jwt.sign({id:user.id, username:user.username}, SECRET);
    res.json({token});
});

app.get('/users', (req,res)=>res.json(users));
app.post('/message', (req,res)=>{
    const { senderId, chatId, text } = req.body;
    messages.push({senderId, chatId, text, timestamp:Date.now()});
    res.json({success:true});
});
app.get('/messages', (req,res)=>res.json(messages));

app.listen(3000,()=>console.log('Server running on port 3000'));
