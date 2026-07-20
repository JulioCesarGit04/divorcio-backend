// routes/modulo4Routes.js
const { Router } = require('express');
const controller = require('../controllers/modulo4Controller');
const upload = require('../config/multer'); // Asegúrate de que la ruta sea correcta

const router = Router();

// Middleware de sesión (si no lo tienes global, lo defines aquí o lo importas)
const validarSesion = (req, res, next) => {
    if (!req.session?.usuario) {
        return res.status(401).json({ ok: false, mensaje: 'No hay sesión activa.' });
    }
    next();
};

// ============================================================
// NUEVA RUTA: Obtener el siguiente número de resolución (vista previa)
// ============================================================
router.get('/resolucion-disolucion/next-number', validarSesion, controller.getNextNumber);

// Registrar segundo pago (inicia el plazo de 15 días hábiles)
router.put('/expedientes/:id/segundo-pago', validarSesion, controller.registrarSegundoPago);

// Registrar pago de copias certificadas (trámite aparte)
router.put('/expedientes/:id/pago-copias', validarSesion, controller.registrarPagoCopias);

// Subir resolución de disolución (con bloqueo, sin reemplazo)
router.post('/expedientes/:id/resolucion-disolucion',
    validarSesion,
    upload.single('archivo'),
    controller.subirResolucionDisolucion
);

// Avanzar a archivamiento (cambiar etapa a ARCHIVADO)
router.put('/expedientes/:id/avanzar-archivamiento', validarSesion, controller.avanzarArchivamiento);

// Subir cargos externos (SUNARP y RENIEC) para finalizar
router.post('/expedientes/:id/cargos-externos',
    validarSesion,
    upload.fields([
        { name: 'sunarp', maxCount: 1 },
        { name: 'reniec', maxCount: 1 }
    ]),
    controller.registrarCargosExternos
);

// Obtener datos consolidados para la pantalla de archivamiento
router.get('/expedientes/:id/archivamiento-data', validarSesion, controller.getArchivamientoData);

module.exports = router;