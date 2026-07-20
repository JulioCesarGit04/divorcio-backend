const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { requireAuthCiudadano } = require('../middlewares/authMiddleware');
const {
    ping,
    getDocumentosObservados,
    resubirDocumentos
} = require('../controllers/subsanacionController');

router.get('/ping', ping);

router.get('/:id/documentos-observados', 
    requireAuthCiudadano, 
    getDocumentosObservados
);

router.post('/:id/resubir', 
    requireAuthCiudadano,
    upload.fields([
        { name: 'solicitud_alcalde', maxCount: 1 },
        { name: 'dni_conyuge1', maxCount: 1 },
        { name: 'dni_conyuge2', maxCount: 1 },
        { name: 'acta_matrimonio', maxCount: 1 },
        { name: 'dj_hijos_menores', maxCount: 1 },
        { name: 'dj_hijos_incapacidad', maxCount: 1 },
        { name: 'dj_bienes', maxCount: 1 },
        { name: 'dj_domicilio', maxCount: 1 },
        { name: 'acta_nacimiento', maxCount: 1 },
        { name: 'acta_conciliacion', maxCount: 1 },
        { name: 'escritura_separacion', maxCount: 1 },
        { name: 'representacion_legal', maxCount: 1 }
    ]),
    resubirDocumentos
);

module.exports = router;