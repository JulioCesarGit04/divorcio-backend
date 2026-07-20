// =============================================================
// persistence/expediente.repository.js
// Acceso a datos — ejecuta los stored procedures del módulo 4
// =============================================================

const { getPool, sql } = require('../config/db');

/**
 * Ejecuta sp_consultar_expediente con DNI y número de expediente.
 * Retorna el expediente encontrado o null si no existe.
 *
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
 * Ejecuta sp_historial_expediente para obtener todas las etapas
 * registradas de un expediente, ordenadas cronológicamente.
 *
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

  // Primer recordset → PRE
  const rowsPre  = result.recordsets[0];
  // Segundo recordset → POST (puede estar vacío)
  const rowsPost = result.recordsets[1];

  if (!rowsPre || rowsPre.length === 0) return null;

  const pre  = rowsPre[0];

  // Si viene NO_ENCONTRADO
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