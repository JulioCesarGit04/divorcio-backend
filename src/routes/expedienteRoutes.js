const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/expedienteController');

router.get('/',            requireAuth, ctrl.listar);
router.get('/:id',         requireAuth, ctrl.detalle);
router.post('/',           requireAuth, ctrl.crear);
router.patch('/:id/etapa', requireAuth, ctrl.cambiarEtapa);

module.exports = router;