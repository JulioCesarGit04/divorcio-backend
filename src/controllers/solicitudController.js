const path = require('path');
const { registrarPreSolicitud, existePreSolicitudActiva } = require('../services/solicitudService');

const DOCS_OBLIGATORIOS = [
  'solicitud_alcalde',
  'dni_conyuge1',
  'dni_conyuge2',
  'acta_matrimonio',
  'dj_hijos_menores',
  'dj_hijos_incapacidad',
  'dj_bienes',
  'dj_domicilio',
];

async function crearPreSolicitud(req, res) {
  try {
    const { conyuge1, conyuge2, inicioFormulario } = req.body;
    const archivos = req.files;

    const c1 = typeof conyuge1 === 'string' ? JSON.parse(conyuge1) : conyuge1;
    const c2 = typeof conyuge2 === 'string' ? JSON.parse(conyuge2) : conyuge2;
    const errores = [];

    // =============================================================
    // 🔥 CORRECCIÓN: Convertir UTC a hora Perú (UTC-5)
    // =============================================================
    let inicioFormularioPeru = null;
    if (inicioFormulario) {
      const fechaUTC = new Date(inicioFormulario);
      // Restar 5 horas para obtener hora Perú
      inicioFormularioPeru = new Date(fechaUTC.getTime() - 5 * 60 * 60 * 1000);
    } else {
      // Si no viene, usar la hora actual en Perú
      inicioFormularioPeru = new Date();
      // Ajustar a hora Perú (restar 5 horas)
      inicioFormularioPeru = new Date(inicioFormularioPeru.getTime() - 5 * 60 * 60 * 1000);
    }

    // =============================================================
    // Validaciones
    // =============================================================
    if (!/^\d{8}$/.test(c1.dni)) errores.push('DNI del solicitante debe tener 8 dígitos.');
    if (!/^\d{8}$/.test(c2.dni)) errores.push('DNI del demandado debe tener 8 dígitos.');

    if (c1.dni === c2.dni) errores.push('Los DNIs de ambos cónyuges no pueden ser iguales.');

    const camposC1 = ['nombres', 'apellidos', 'dni', 'direccion'];
    const camposC2 = ['nombres', 'apellidos', 'dni', 'direccion'];
    camposC1.forEach(campo => {
      if (!c1[campo]) errores.push(`Campo "${campo}" del solicitante es obligatorio.`);
    });
    camposC2.forEach(campo => {
      if (!c2[campo]) errores.push(`Campo "${campo}" del demandado es obligatorio.`);
    });

    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (c1.correo && !regexCorreo.test(c1.correo)) errores.push('Correo del solicitante no es válido.');
    if (c2.correo && !regexCorreo.test(c2.correo)) errores.push('Correo del demandado no es válido.');

    DOCS_OBLIGATORIOS.forEach(tipo => {
      if (!archivos[tipo]) errores.push(`Documento "${tipo}" es obligatorio.`);
    });

    if (errores.length > 0) {
      return res.status(400).json({ ok: false, errores });
    }

    const activa = await existePreSolicitudActiva(c1.dni);
    if (activa) {
      return res.status(409).json({
        ok: false,
        errores: ['Ya existe una pre-solicitud activa con el DNI del solicitante.'],
      });
    }

    const documentos = Object.entries(archivos).map(([campo, archivosArr]) => {
      const archivo = Array.isArray(archivosArr) ? archivosArr[0] : archivosArr;
      return {
        tipoDocumento: campo,
        nombreArchivo: archivo.originalname,
        rutaArchivo: archivo.path,
      };
    });

    const conyuges = [
      { ...c1, tipo: 'SOLICITANTE' },
      { ...c2, tipo: 'DEMANDADO' },
    ];


    const { codigo } = await registrarPreSolicitud({
      conyuges,
      documentos,
      inicioFormulario: inicioFormularioPeru,  
    });

    return res.status(201).json({
      ok: true,
      mensaje: 'Pre-solicitud registrada exitosamente.',
      codigo,
    });

  } catch (err) {
    console.error('Error al crear pre-solicitud:', err);
    return res.status(500).json({ ok: false, errores: ['Error interno del servidor.'] });
  }
}

module.exports = { crearPreSolicitud };