const { Router } = require('express');
const controller = require('../controllers/ConsultaController');
const validarConsulta = require('../middlewares/validarConsulta');

const router = Router();

router.post('/consultar', validarConsulta, controller.consultar);

router.get('/:id/historial', controller.historial);
router.post('/seguimiento', validarConsulta, controller.seguimiento);

module.exports = router;