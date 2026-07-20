// =============================================================
// services/expediente.service.js
// Lógica de negocio del módulo 4
// =============================================================

const repository = require('../persistence/ConsultaExpedienteRepository');
const Expediente = require('../models/ConsultaExpediente');
const HistorialExpediente = require('../models/ConsultaHistorialExpediente');

/**
 * Consulta un expediente por DNI y número de expediente.
 * Valida que el expediente exista en la base de datos.
 * Retorna el expediente sin historial (para la consulta rápida).
 *
 * @param {string} dni
 * @param {string} numeroExpediente
 * @returns {Promise<Expediente>}
 * @throws {Error} si no se encuentra el expediente
 */
const consultarExpediente = async (dni, numeroExpediente) => {
  const data = await repository.consultarExpediente(dni, numeroExpediente);

  if (!data) {
    const error = new Error(
      'No se encontró ningún expediente con los datos proporcionados. ' +
        'Verifique su DNI y número de expediente.'
    );
    error.statusCode = 404;
    throw error;
  }

  return new Expediente(data.id, data.numeroExpediente, data.estadoActual);
};

/**
 * Obtiene el historial completo de etapas de un expediente.
 * Retorna un array vacío si aún no hay etapas registradas.
 *
 * @param {number} expedienteId
 * @returns {Promise<HistorialExpediente[]>}
 */
const obtenerHistorial = async (expedienteId) => {
  const filas = await repository.obtenerHistorial(expedienteId);

  return filas.map(
    (f) => new HistorialExpediente(f.estado, f.descripcion, f.fecha)
  );
};

/**
 * Consulta el expediente e incluye su historial completo.
 * Operación compuesta — usada en la consulta principal del ciudadano.
 *
 * @param {string} dni
 * @param {string} numeroExpediente
 * @returns {Promise<Expediente>}
 */
const consultarExpedienteConHistorial = async (dni, numeroExpediente) => {
  let expediente = null;

  try {
    expediente = await consultarExpediente(dni, numeroExpediente);
  } catch (error) {
    // 🔥 Registrar incluso si falla
    await repository.registrarConsulta(dni, numeroExpediente);
    throw error;
  }

  await repository.registrarConsulta(dni, numeroExpediente);

  const historial = await obtenerHistorial(expediente.id);
  expediente.historial = historial;

  return expediente;
};

const seguimientoCompleto = async (dni, codigo) => {
  const data = await repository.seguimientoCompleto(dni, codigo);

  if (!data) {
    const error = new Error('No se encontró información del trámite.');
    error.statusCode = 404;
    throw error;
  }

  const { pre, post } = data;

  // Historial PRE siempre
  const historialPre = await repository.obtenerHistorialPre(pre.id);

  const resultado = {
    tipo: post ? 'POST' : 'PRE',
    pre: {
      id:        pre.id,
      codigo:    pre.codigo,
      estado:    pre.estado,
      fecha:     pre.creado_en,
      historial: historialPre,
    },
    post: null,
  };

  if (post) {
    const historial = await obtenerHistorial(post.expedientes_id);

    resultado.post = {
      id:      post.expedientes_id,
      numero:  post.numero,
      estado:  post.estado,
      fecha:   post.expedientes_creado_en,
      historial,
    };
  }

  return resultado;
};

module.exports = {
  consultarExpediente,
  obtenerHistorial,
  consultarExpedienteConHistorial,
  seguimientoCompleto
};