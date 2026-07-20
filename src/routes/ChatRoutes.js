const express = require('express');
const router = express.Router();
const { enviarChat } = require('../controllers/ChatController');

router.post('/', enviarChat);

module.exports = router;
