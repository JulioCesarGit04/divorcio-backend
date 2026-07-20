const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/ciudadanoAuthController');
const upload   = require('../middlewares/upload');

router.post('/registro',   ctrl.registrar);
router.post('/verificar',  ctrl.verificarCodigo);
router.post('/login',      ctrl.login);
router.post('/logout',     ctrl.logout);
router.get('/sesion',      ctrl.sesion);
router.post('/recuperar',  ctrl.solicitarRecuperacion);
router.post('/restablecer', ctrl.restablecerPassword);

module.exports = router;