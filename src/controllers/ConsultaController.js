const service = require('../services/ConsultaExpedienteService');

const consultar = async (req, res, next) => {
  try {
    const { dni, numeroExpediente } = req.body;

    const expediente = await service.consultarExpedienteConHistorial(
      dni,
      numeroExpediente
    );

    if (!expediente) {
      return res.status(404).json({
        success: false,
        message: 'Expediente no encontrado',
      });
    }

    try {
      await service.registrarConsulta(dni, numeroExpediente);
    } catch (e) {
      console.warn('No se pudo registrar la consulta:', e.message);
    }

    res.status(200).json({
      success: true,
      data: expediente.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

const historial = async (req, res, next) => {
  try {
    const expedienteId = parseInt(req.params.id, 10);

    if (isNaN(expedienteId) || expedienteId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El ID del expediente debe ser un número entero positivo.',
      });
    }

    const etapas = await service.obtenerHistorial(expedienteId);

    res.status(200).json({
      success: true,
      data: etapas.map((e) => e.toJSON()),
    });
  } catch (error) {
    next(error);
  }
};

const seguimiento = async (req, res, next) => {
  try {
    const { dni, numeroExpediente } = req.body;

    const data = await service.seguimientoCompleto(
      dni,
      numeroExpediente
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { consultar, historial, seguimiento };