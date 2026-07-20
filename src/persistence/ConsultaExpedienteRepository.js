const { getPool, sql } = require('../config/db');

/**
 * @param {string} dni
 * @param {string} numeroExpediente
 * @returns {Promise<object|null>}
 */
const consultarExpediente = async (dni, numeroExpediente) => {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('dni', sql.VarChar(8), dni)
    .input('numero_expediente', sql.VarChar(50), numeroExpediente)
    .execute('sp_consultar_expediente');

  const rows = result.recordset;
  if (!rows || rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    numeroExpediente: row.numero_expediente,
    estadoActual: row.estado_actual,
  };
};

/**
 * @param {number} expedienteId
 * @returns {Promise<Array>}
 */
const obtenerHistorial = async (expedienteId) => {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('expediente_id', sql.Int, expedienteId)
    .execute('sp_historial_expediente');

  const rows = result.recordset;
  if (!rows || rows.length === 0) return [];

  return rows.map((row) => ({
    estado: row.estado,
    descripcion: row.descripcion,
    fecha: row.fecha,
  }));
};

const registrarConsulta = async (dni, numeroExpediente) => {
  const pool = await getPool();

  await pool
    .request()
    .input('dni', sql.VarChar(8), dni)
    .input('numero_expediente', sql.VarChar(30), numeroExpediente)
    .execute('sp_registrar_consulta');
};


const seguimientoCompleto = async (dni, codigo) => {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('dni',    sql.VarChar(8),  dni)
    .input('codigo', sql.VarChar(50), codigo)
    .execute('sp_seguimiento_completo');

  const rowsPre  = result.recordsets[0];
  const rowsPost = result.recordsets[1];

  if (!rowsPre || rowsPre.length === 0) return null;

  const pre  = rowsPre[0];

  if (pre.tipo === 'NO_ENCONTRADO') return null;

  const post = rowsPost && rowsPost.length > 0 ? rowsPost[0] : null;

  return { pre, post };
};

const obtenerHistorialPre = async (preSolicitudId) => {
  const pool = await getPool();

  const result = await pool
    .request()
    .input('pre_id', sql.Int, preSolicitudId)
    .execute('sp_historial_pre_solicitud');

  const rows = result.recordset;
  if (!rows || rows.length === 0) return [];

  return rows.map((row) => ({
    estado:      row.estado,
    descripcion: row.descripcion,
    fecha:       row.fecha,
  }));
};

module.exports = {
  consultarExpediente,
  obtenerHistorial,
  obtenerHistorialPre,
  registrarConsulta,
  seguimientoCompleto,
};