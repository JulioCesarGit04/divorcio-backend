const { getPool, sql } = require('../config/db');
const path = require('path');
const fs   = require('fs');

async function resubirDocumento(req, res) {
  try {
    const { preSolicitudId } = req.params;
    const archivos = req.files;

    if (!archivos || Object.keys(archivos).length === 0) {
      return res.status(400).json({ ok: false, mensaje: 'No se enviaron archivos.' });
    }

    const pool = await getPool();

    // Verificar que la pre-solicitud esté en estado OBSERVADA
    const resPre = await pool.request()
      .input('id', sql.Int, preSolicitudId)
      .query(`SELECT estado FROM pre_solicitudes WHERE id = @id`);

    if (resPre.recordset.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Pre-solicitud no encontrada.' });
    }

    if (resPre.recordset[0].estado !== 'OBSERVADA') {
      return res.status(400).json({ ok: false, mensaje: 'Solo se pueden resubir documentos en solicitudes OBSERVADAS.' });
    }

    // Actualizar cada documento en BD
    for (const [campo, archivosArr] of Object.entries(archivos)) {
      const archivo = Array.isArray(archivosArr) ? archivosArr[0] : archivosArr;

      // Obtener documento actual para borrar archivo viejo
      const resDoc = await pool.request()
        .input('pre_solicitud_id', sql.Int,     Number(preSolicitudId))
        .input('tipo_documento',   sql.VarChar, campo)
        .query(`
          SELECT id, ruta_archivo
          FROM documentos
          WHERE pre_solicitud_id = @pre_solicitud_id
            AND tipo_documento   = @tipo_documento
            AND origen           = 'WEB'
        `);

      if (resDoc.recordset.length === 0) continue;

      const docActual = resDoc.recordset[0];

      // Eliminar archivo físico anterior
      if (fs.existsSync(docActual.ruta_archivo)) {
        fs.unlinkSync(docActual.ruta_archivo);
      }

      // Actualizar ruta en BD
// Actualizar ruta en BD
await pool.request()
  .input('ruta_archivo',   sql.VarChar, archivo.path)
  .input('nombre_archivo', sql.VarChar, archivo.originalname)
  .input('id',             sql.Int,     docActual.id)
  .query(`
    UPDATE documentos
    SET ruta_archivo   = @ruta_archivo,
        nombre_archivo = @nombre_archivo,
        subido_en      = GETDATE(),
        fecha_correccion = GETDATE(),
        estado_correccion = 'CORREGIDO'
    WHERE id = @id
  `);

      // Limpiar evaluación anterior de ese documento
      await pool.request()
        .input('documento_id', sql.Int, docActual.id)
        .query(`DELETE FROM evaluacion_documentos WHERE documento_id = @documento_id`);
    }

    // Volver a EN_CALIFICACION
    await pool.request()
      .input('id', sql.Int, Number(preSolicitudId))
      .query(`
        UPDATE pre_solicitudes
        SET estado = 'EN_CALIFICACION', actualizado_en = GETDATE()
        WHERE id = @id
      `);

    return res.json({ ok: true, mensaje: 'Documentos actualizados correctamente. La solicitud vuelve a revisión.' });

  } catch (err) {
    console.error('Error al resubir documento:', err);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor.' });
  }
}

module.exports = { resubirDocumento };