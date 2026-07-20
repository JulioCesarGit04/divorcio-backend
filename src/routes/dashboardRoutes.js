const { Router } = require('express');
const controller = require('../controllers/dashboardController');

const router = Router();

// Ruta principal para el dashboard completo
router.get('/completo', controller.getDashboardCompleto);

// Ruta para el resumen (gráficos y tablas)
router.get('/resumen', controller.getResumen);

// Rutas individuales (opcionales)
router.get('/tiempo-promedio-envio', controller.getTiempoPromedioEnvio);
router.get('/audiencias-plazo', controller.getAudienciasDentroPlazo);
router.get('/disolucion-plazo', controller.getDisolucionEnPlazo);
router.get('/expedientes-observaciones', controller.getExpedientesConObservaciones);
router.get('/documentos-subsanados', controller.getDocumentosSubsanadosPlazo);

module.exports = router;