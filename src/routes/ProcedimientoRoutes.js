const { Router } = require('express');
const controller = require('../controllers/ProcedimientoController');
const upload = require('../config/multer');

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


router.get('/pre-expedientes', validarSesion, controller.getPreExpedientes);

router.get('/historial', controller.getHistorialGlobal);

router.get('/historial/tarjetas', controller.getHistorialTarjetas);

router.post('/expedientes/vincular', validarSesion, controller.vincularExpediente);

router.get('/expedientes', validarSesion, controller.getExpedientes);

router.get('/expedientes/:id', validarSesion, controller.getExpedienteById);

router.put('/expedientes/:id/mesa-partes', validarSesion, soloAdmin, controller.actualizarMesaPartes);

router.put('/expedientes/:id/estado', validarSesion, controller.cambiarEstado);

router.post('/expedientes/:id/documentos', validarSesion, upload.single('archivo'), controller.subirDocumentoInterno);

router.get('/expedientes/:id/documentos', validarSesion, controller.getDocumentosInternos);

router.get('/documentos/:documentoId/historial', validarSesion, controller.getHistorialDocumento);

router.put('/documentos-ciudadano/:documentoId/reemplazar', validarSesion, upload.single('documento'), controller.reemplazarDocumentoCiudadano);

router.get('/cronograma', validarSesion, controller.getCronograma);

router.post('/expedientes/:id/audiencias/programar', validarSesion, controller.programarAudiencia);

router.post('/audiencias/:audienciaId/resultado', validarSesion, controller.registrarResultadoAudiencia);

router.put('/asistencias/:asistenciaId/corregir', validarSesion, controller.corregirAsistencia);

router.get('/expedientes/:id/audiencias', validarSesion, controller.getAudiencias);

router.post('/expedientes/:id/resolucion-fundada', validarSesion, controller.registrarResolucionFundada);

router.get('/expedientes/:id/plazos', validarSesion, controller.getPlazos);

router.post('/expedientes/:id/verificar-disolucion', validarSesion, controller.verificarEsperaDisolucion);

router.get('/expedientes/:id/historial', validarSesion, controller.getHistorialExpediente);

router.get('/documentos/ultimo-correlativo', validarSesion, controller.getUltimoCorrelativo);

router.post('/documentos/verificar-unicidad', validarSesion, controller.verificarUnicidad);

router.get('/dias-habiles-entre', validarSesion, controller.getDiasHabilesEntre);
router.get('/sumar-dias-habiles', validarSesion, controller.sumarDiasHabiles);

module.exports = router;