const express = require('express');
const router = express.Router();
const { iniciarSesion, cerrarSesion, obtenerSesion } = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.post('/login',   iniciarSesion);
router.post('/logout',  requireAuth, cerrarSesion);
router.get('/sesion',   obtenerSesion);

module.exports = router;