const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../config/db');

// Middleware simple para verificar sesión ciudadano
function requireCiudadano(req, res, next) {
  if (!req.session?.ciudadano) {
    return res.status(401).json({ ok: false, mensaje: 'No autorizado.' });
  }
  next();
}

// Listar mis pre-solicitudes (busca en SOLICITANTE o DEMANDADO)
router.get('/mis-solicitudes', requireCiudadano, async (req, res) => {
  try {
    const pool = await getPool();
    const dni = req.session.ciudadano.dni;

    const result = await pool.request()
      .input('dni', sql.VarChar, dni)
      .query(`
        SELECT 
          ps.id, 
          ps.codigo, 
          ps.estado, 
          ps.creado_en
        FROM pre_solicitudes ps
        INNER JOIN conyuges c ON c.pre_solicitud_id = ps.id
        WHERE c.dni = @dni
        ORDER BY ps.creado_en DESC
      `);

    console.log('📋 Solicitudes encontradas para DNI:', dni, result.recordset.length);
    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('Error en mis-solicitudes:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener solicitudes.' });
  }
});

// Detalle de una pre-solicitud con documentos y observaciones
router.get('/mis-solicitudes/:id', requireCiudadano, async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const resPre = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT id, codigo, estado, creado_en FROM pre_solicitudes WHERE id = @id`);

    if (resPre.recordset.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'No encontrada.' });
    }

    const resDocs = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          d.id, d.tipo_documento, d.nombre_archivo, d.ruta_archivo,
          ev.estado      AS estado_evaluacion,
          ev.observacion AS observacion_evaluacion
        FROM documentos d
        LEFT JOIN (
          SELECT e1.*
          FROM evaluacion_documentos e1
          INNER JOIN (
            SELECT documento_id, MAX(evaluado_en) AS ultima
            FROM evaluacion_documentos GROUP BY documento_id
          ) e2 ON e1.documento_id = e2.documento_id AND e1.evaluado_en = e2.ultima
        ) ev ON ev.documento_id = d.id
        WHERE d.pre_solicitud_id = @id AND d.origen = 'WEB'
      `);

    res.json({ ok: true, data: { ...resPre.recordset[0], documentos: resDocs.recordset } });
  } catch (err) {
    console.error('Error en detalle:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener detalle.' });
  }
});

// Seguimiento de expediente por DNI del solicitante
router.get('/seguimiento/:dni', async (req, res) => {
  try {
    const pool = await getPool();
    const { dni } = req.params;

    const result = await pool.request()
      .input('dni', sql.VarChar, dni)
      .query(`
        SELECT
          e.id, e.numero_expediente, e.numero_mesa_partes,
          e.estado, e.etapa, e.fecha_recepcion,
          ps.codigo AS codigo_pre_solicitud
        FROM expedientes e
        INNER JOIN pre_solicitudes ps ON ps.id = e.pre_solicitud_id
        INNER JOIN conyuges c ON c.pre_solicitud_id = ps.id AND c.tipo = 'SOLICITANTE'
        WHERE c.dni = @dni AND e.activo = 1
        ORDER BY e.fecha_recepcion DESC
      `);

    res.json({ ok: true, data: result.recordset });
  } catch (err) {
    console.error('Error en seguimiento:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener seguimiento.' });
  }
});

// Detalle de expediente con historial
router.get('/seguimiento/detalle/:id', requireCiudadano, async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const resExp = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          e.id, e.numero_expediente, e.numero_mesa_partes,
          e.estado, e.etapa, e.fecha_recepcion
        FROM expedientes e WHERE e.id = @id AND e.activo = 1
      `);

    if (resExp.recordset.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Expediente no encontrado.' });
    }

    const resHistorial = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT etapa_anterior, etapa_nueva, estado_nuevo, comentario, cambiado_en
        FROM historial_etapas_expediente
        WHERE expediente_id = @id
        ORDER BY cambiado_en ASC
      `);

    res.json({ ok: true, data: { ...resExp.recordset[0], historial: resHistorial.recordset } });
  } catch (err) {
    console.error('Error en detalle expediente:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener detalle.' });
  }
});

module.exports = router;