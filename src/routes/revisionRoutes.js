const express = require('express');
const router  = express.Router();
const { listar, detalle, evaluar } = require('../controllers/revisionController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.get('/',              requireAuth, listar);
router.get('/:id',           requireAuth, detalle);
router.post('/:id/evaluar',  requireAuth, evaluar);

module.exports = router;