const { getPool, sql } = require('../config/db');

async function generarCodigo(pool) { 
  const anio = new Date().getFullYear();
  const result = await pool.request().query(`
    SELECT COUNT(*) AS total FROM pre_solicitudes
    WHERE YEAR(creado_en) = ${anio}
  `);
  const total = result.recordset[0].total + 1;
  const numero = String(total).padStart(4, '0');
  return `PSC-${anio}${numero}`;
}

async function existePreSolicitudActiva(dni) {
  const pool = await getPool();
 
  const result = await pool.request()
    .input('dni',    sql.VarChar(8), dni)
    .output('existe', sql.Bit)
    .execute('sp_ExistePreSolicitudActiva');
 
  return result.output.existe === true || result.output.existe === 1;
}
 
async function registrarPreSolicitud({ conyuges, documentos, inicioFormulario }) {
  const pool        = await getPool();
  const transaction = new sql.Transaction(pool);
 
  try {
    await transaction.begin();
    const c1 = conyuges.find(c => c.tipo === 'SOLICITANTE');
    const c2 = conyuges.find(c => c.tipo === 'DEMANDADO');
 
    const resPre = await new sql.Request(transaction)
      // Cónyuge 1
      .input('nombres1',   sql.VarChar(100), c1.nombres)
      .input('apellidos1', sql.VarChar(100), c1.apellidos)
      .input('dni1',       sql.VarChar(8),   c1.dni)
      .input('telefono1',  sql.VarChar(15),  c1.telefono  || null)
      .input('correo1',    sql.VarChar(150), c1.correo    || null)
      .input('direccion1', sql.VarChar(255), c1.direccion)
      // Cónyuge 2
      .input('nombres2',   sql.VarChar(100), c2.nombres)
      .input('apellidos2', sql.VarChar(100), c2.apellidos)
      .input('dni2',       sql.VarChar(8),   c2.dni)
      .input('telefono2',  sql.VarChar(15),  c2.telefono  || null)
      .input('correo2',    sql.VarChar(150), c2.correo    || null)
      .input('direccion2', sql.VarChar(255), c2.direccion)
      .input('inicioFormulario', sql.DateTime, new Date(inicioFormulario))
      .output('codigo',         sql.VarChar(20))
      .output('preSolicitudId', sql.Int)
      .execute('sp_RegistrarPreSolicitud');
 
    const codigo         = resPre.output.codigo;
    const preSolicitudId = resPre.output.preSolicitudId;

    for (const doc of documentos) {
      await new sql.Request(transaction)
        .input('preSolicitudId', sql.Int,        preSolicitudId)
        .input('tipoDocumento',  sql.VarChar(50),  doc.tipoDocumento)
        .input('nombreArchivo',  sql.VarChar(255), doc.nombreArchivo)
        .input('rutaArchivo',    sql.VarChar(500), doc.rutaArchivo)
        .execute('sp_InsertarDocumento');
    }
 
    await transaction.commit();
    return { codigo, preSolicitudId };
 
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
 
module.exports = { registrarPreSolicitud, existePreSolicitudActiva };