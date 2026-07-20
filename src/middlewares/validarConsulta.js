const validarConsulta = (req, res, next) => {
  const { dni, numeroExpediente } = req.body;
  const errores = [];

  if (!dni) {
    errores.push('El campo dni es requerido.');
  } else if (!/^\d{8}$/.test(dni.trim())) {
    errores.push('El DNI debe contener exactamente 8 dígitos numéricos.');
  }

  if (!numeroExpediente) {
    errores.push('El campo numeroExpediente es requerido.');
  } else if (typeof numeroExpediente !== 'string' || numeroExpediente.trim().length === 0) {
    errores.push('El número de expediente no puede estar vacío.');
  } else if (numeroExpediente.trim().length > 30) {
    errores.push('El número de expediente no puede exceder 30 caracteres.');
  }

  if (errores.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Datos de consulta inválidos.',
      errores,
    });
  }

  req.body.dni = dni.trim();
  req.body.numeroExpediente = numeroExpediente.trim().toUpperCase();

  next();
};

module.exports = validarConsulta;