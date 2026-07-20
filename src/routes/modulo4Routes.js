// routes/modulo4Routes.js
const { Router } = require('express');
const controller = require('../controllers/modulo4Controller');
const upload = require('../config/multer'); 

const router = Router();

const validarSesion = (req, res, next) => {
    if (!req.session?.usuario) {
        return res.status(401).json({ ok: false, mensaje: 'No hay sesión activa.' });
    }
    next();
};

router.get('/resolucion-disolucion/next-number', validarSesion, controller.getNextNumber);
router.put('/expedientes/:id/segundo-pago', validarSesion, controller.registrarSegundoPago);

router.put('/expedientes/:id/pago-copias', validarSesion, controller.registrarPagoCopias);

router.post('/expedientes/:id/resolucion-disolucion',
    validarSesion,
    upload.single('archivo'),
    controller.subirResolucionDisolucion
);

router.put('/expedientes/:id/avanzar-archivamiento', validarSesion, controller.avanzarArchivamiento);

router.post('/expedientes/:id/cargos-externos',
    validarSesion,
    upload.fields([
        { name: 'sunarp', maxCount: 1 },
        { name: 'reniec', maxCount: 1 }
    ]),
    controller.registrarCargosExternos
);

router.get('/expedientes/:id/archivamiento-data', validarSesion, controller.getArchivamientoData);

module.exports = router;