const { Router } = require('express');
const controller = require('../controllers/UsuariosController');

const router = Router();

const validarSesion = (req, res, next) => {
    if (!req.session?.usuario) {
        return res.status(401).json({ ok: false, mensaje: 'No hay sesión activa.' });
    }
    next();
};

const soloAdmin = (req, res, next) => {
    if (req.session?.usuario?.rol !== 'ADMINISTRADOR') {
        return res.status(403).json({ ok: false, mensaje: 'Solo el Administrador puede realizar esta acción.' });
    }
    next();
};

router.use(validarSesion, soloAdmin);

router.get('/', controller.listar);                         
router.get('/:id', controller.obtener);                     
router.post('/', controller.crear);                         
router.put('/:id', controller.actualizar);                  
router.patch('/:id/estado', controller.cambiarEstado);      
router.patch('/:id/password', controller.cambiarPassword);

module.exports = router;