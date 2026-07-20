const { Router } = require('express');
const controller = require('../controllers/dashboardController');

const router = Router();

router.get('/completo', controller.getDashboardCompleto);

router.get('/resumen', controller.getResumen);

router.get('/tiempo-promedio-envio', controller.getTiempoPromedioEnvio);
router.get('/audiencias-plazo', controller.getAudienciasDentroPlazo);
router.get('/disolucion-plazo', controller.getDisolucionEnPlazo);
router.get('/expedientes-observaciones', controller.getExpedientesConObservaciones);
router.get('/documentos-subsanados', controller.getDocumentosSubsanadosPlazo);

module.exports = router;