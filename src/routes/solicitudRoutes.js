const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { crearPreSolicitud } = require('../controllers/solicitudController');

// Campos de archivos esperados
const camposArchivos = [
  { name: 'solicitud_alcalde',    maxCount: 1 },
  { name: 'dni_conyuge1',         maxCount: 1 },
  { name: 'dni_conyuge2',         maxCount: 1 },
  { name: 'acta_matrimonio',      maxCount: 1 },
  // Declaraciones juradas separadas
  { name: 'dj_hijos_menores',     maxCount: 1 },
  { name: 'dj_hijos_incapacidad', maxCount: 1 },
  { name: 'dj_bienes',            maxCount: 1 },
  { name: 'dj_domicilio',         maxCount: 1 },
  // Opcionales
  { name: 'acta_nacimiento',      maxCount: 1 },
  { name: 'acta_conciliacion',    maxCount: 1 },
  { name: 'escritura_separacion', maxCount: 1 },
  { name: 'representacion_legal', maxCount: 1 },
];

router.post('/', upload.fields(camposArchivos), crearPreSolicitud);

module.exports = router;