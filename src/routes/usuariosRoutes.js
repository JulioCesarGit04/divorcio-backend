const { Router } = require('express');
const controller = require('../controllers/UsuariosController');

const router = Router();

// ─── Middleware de autenticación ────────────────────────────────────
const validarSesion = (req, res, next) => {
    if (!req.session?.usuario) {
        return res.status(401).json({ ok: false, mensaje: 'No hay sesión activa.' });
    }
    next();
};

// ─── Middleware de autorización (solo administradores) ─────────────
const soloAdmin = (req, res, next) => {
    if (req.session?.usuario?.rol !== 'ADMINISTRADOR') {
        return res.status(403).json({ ok: false, mensaje: 'Solo el Administrador puede realizar esta acción.' });
    }
    next();
};

// ─── Todas las rutas requieren autenticación y rol ADMINISTRADOR ────
router.use(validarSesion, soloAdmin);

// ─── CRUD de usuarios ────────────────────────────────────────────────
router.get('/', controller.listar);                         // Listar usuarios
router.get('/:id', controller.obtener);                     // Obtener un usuario
router.post('/', controller.crear);                         // Crear usuario
router.put('/:id', controller.actualizar);                  // Actualizar usuario
router.patch('/:id/estado', controller.cambiarEstado);      // Habilitar/Deshabilitar
router.patch('/:id/password', controller.cambiarPassword);  // Cambiar contraseña (opcional)

module.exports = router;