const { getPool, sql } = require('../config/db');
const { enviarCorreo } = require('../config/mailer');

const ETIQUETAS_ETAPA = {
  RECIBIDO:            'Recibido',
  EVALUACION:          'En Evaluación',
  DOCUMENTOS_INTERNOS: 'Documentos Internos',
  AUDIENCIA:           'Audiencia',
  ESPERA_LEGAL:        'Espera Legal',
  DISOLUCION:          'Disolución',
};

const ETIQUETAS_ESTADO = {
  ACTIVO:    'Activo',
  CANCELADO: 'Cancelado',
  ARCHIVADO: 'Archivado',
};

const DESCRIPCION_ETAPA = {
  RECIBIDO:            'El expediente ha sido recibido y está pendiente de vinculación con mesa de partes.',
  EVALUACION:          'El expediente está siendo evaluado por el área correspondiente.',
  DOCUMENTOS_INTERNOS: 'Se están generando la resolución de admisión e informe legal.',
  AUDIENCIA:           'El expediente está listo para programar la audiencia.',
  ESPERA_LEGAL:        'Se ha iniciado el período de espera legal de 2 meses.',
  DISOLUCION:          'Se están generando los documentos de disolución del vínculo matrimonial.',
};

async function listar() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      e.id, e.numero_expediente, e.numero_mesa_partes,
      e.estado, e.etapa, e.fecha_recepcion, e.registrado_por,
      ps.codigo AS codigo_pre_solicitud,
      c1.nombres   AS nombres_solicitante,
      c1.apellidos AS apellidos_solicitante,
      c1.dni       AS dni_solicitante
    FROM expedientes e
    INNER JOIN pre_solicitudes ps ON ps.id = e.pre_solicitud_id
    LEFT JOIN conyuges c1 ON c1.pre_solicitud_id = ps.id AND c1.tipo = 'SOLICITANTE'
    WHERE e.activo = 1
    ORDER BY e.fecha_recepcion DESC
  `);
  return result.recordset;
} 

async function detalle(id) {
  const pool = await getPool();

  const resExp = await pool.request()
    .input('id', sql.Int, id)
    .query(`
      SELECT
        e.id, e.numero_expediente, e.numero_mesa_partes,
        e.estado, e.etapa, e.fecha_recepcion,
        e.fecha_pago, e.registrado_por,
        ps.id AS pre_solicitud_id, ps.codigo AS codigo_pre_solicitud,
        c1.nombres   AS nombres_solicitante,
        c1.apellidos AS apellidos_solicitante,
        c1.dni       AS dni_solicitante,
        c1.correo    AS correo_solicitante,
        c2.nombres   AS nombres_demandado,
        c2.apellidos AS apellidos_demandado,
        c2.dni       AS dni_demandado
      FROM expedientes e
      INNER JOIN pre_solicitudes ps ON ps.id = e.pre_solicitud_id
      LEFT JOIN conyuges c1 ON c1.pre_solicitud_id = ps.id AND c1.tipo = 'SOLICITANTE'
      LEFT JOIN conyuges c2 ON c2.pre_solicitud_id = ps.id AND c2.tipo = 'DEMANDADO'
      WHERE e.id = @id AND e.activo = 1
    `);

  if (resExp.recordset.length === 0) return null;

  const resHistorial = await pool.request()
    .input('id', sql.Int, id)
    .query(`
      SELECT
        h.etapa_anterior, h.etapa_nueva, h.estado_nuevo,
        h.comentario, h.cambiado_en,
        u.nombre AS cambiado_por
      FROM historial_etapas_expediente h
      LEFT JOIN usuarios u ON u.id = h.usuario_id
      WHERE h.expediente_id = @id
      ORDER BY h.cambiado_en ASC
    `);

  return {
    ...resExp.recordset[0],
    historial: resHistorial.recordset,
  };
}

async function crear({ preSolicitudId, numeroExpediente, numeroMesaPartes, fechaPago, usuarioNombre }) {
  const pool = await getPool();

  const resPre = await pool.request()
    .input('id', sql.Int, preSolicitudId)
    .query(`SELECT estado FROM pre_solicitudes WHERE id = @id`);

  if (resPre.recordset.length === 0) throw new Error('Pre-solicitud no encontrada.');
  if (resPre.recordset[0].estado !== 'ADMISIBLE') {
    throw new Error('Solo se pueden crear expedientes de pre-solicitudes ADMISIBLES.');
  }

  const resExiste = await pool.request()
    .input('id', sql.Int, preSolicitudId)
    .query(`SELECT id FROM expedientes WHERE pre_solicitud_id = @id AND activo = 1`);
  if (resExiste.recordset.length > 0) throw new Error('Ya existe un expediente para esta pre-solicitud.');

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    const resExp = await new sql.Request(transaction)
      .input('pre_solicitud_id',  sql.Int,     preSolicitudId)
      .input('numero_expediente', sql.VarChar, numeroExpediente)
      .input('numero_mesa_partes',sql.VarChar, numeroMesaPartes)
      .input('fecha_pago',        sql.Date,    fechaPago || null)
      .input('registrado_por',    sql.VarChar, usuarioNombre)
      .query(`
        INSERT INTO expedientes
          (pre_solicitud_id, numero_expediente, numero_mesa_partes, fecha_pago, registrado_por)
        OUTPUT INSERTED.id
        VALUES
          (@pre_solicitud_id, @numero_expediente, @numero_mesa_partes, @fecha_pago, @registrado_por)
      `);

    const expedienteId = resExp.recordset[0].id;

    await new sql.Request(transaction)
      .input('expediente_id', sql.Int,     expedienteId)
      .input('etapa_nueva',   sql.VarChar, 'RECIBIDO')
      .input('estado_nuevo',  sql.VarChar, 'ACTIVO')
      .input('comentario',    sql.VarChar, 'Expediente creado y vinculado a pre-solicitud.')
      .query(`
        INSERT INTO historial_etapas_expediente
          (expediente_id, etapa_nueva, estado_nuevo, comentario)
        VALUES
          (@expediente_id, @etapa_nueva, @estado_nuevo, @comentario)
      `);

    await transaction.commit();

    await notificarCiudadano({ preSolicitudId, etapaNueva: 'RECIBIDO', estadoNuevo: 'ACTIVO', numeroExpediente, comentario: null });

    return { expedienteId };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function cambiarEtapa({ id, etapaNueva, estadoNuevo, comentario, usuarioId }) {
  const pool = await getPool();

  const resExp = await pool.request()
    .input('id', sql.Int, id)
    .query(`SELECT etapa, estado, numero_expediente, pre_solicitud_id FROM expedientes WHERE id = @id AND activo = 1`);

  if (resExp.recordset.length === 0) throw new Error('Expediente no encontrado.');

  const { etapa: etapaActual, estado: estadoActual, numero_expediente, pre_solicitud_id } = resExp.recordset[0];

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    await new sql.Request(transaction)
      .input('etapa',  sql.VarChar, etapaNueva  || etapaActual)
      .input('estado', sql.VarChar, estadoNuevo || estadoActual)
      .input('id',     sql.Int,     id)
      .query(`UPDATE expedientes SET etapa = @etapa, estado = @estado WHERE id = @id`);

    await new sql.Request(transaction)
      .input('expediente_id',  sql.Int,     id)
      .input('etapa_anterior', sql.VarChar, etapaActual)
      .input('etapa_nueva',    sql.VarChar, etapaNueva  || etapaActual)
      .input('estado_nuevo',   sql.VarChar, estadoNuevo || estadoActual)
      .input('comentario',     sql.VarChar, comentario  || null)
      .input('usuario_id',     sql.Int,     usuarioId)
      .query(`
        INSERT INTO historial_etapas_expediente
          (expediente_id, etapa_anterior, etapa_nueva, estado_nuevo, comentario, usuario_id)
        VALUES
          (@expediente_id, @etapa_anterior, @etapa_nueva, @estado_nuevo, @comentario, @usuario_id)
      `);

    await transaction.commit();

    await notificarCiudadano({
      preSolicitudId: pre_solicitud_id,
      etapaNueva:     etapaNueva  || etapaActual,
      estadoNuevo:    estadoNuevo || estadoActual,
      numeroExpediente: numero_expediente,
      comentario,
    });

    return { ok: true };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function notificarCiudadano({ preSolicitudId, etapaNueva, estadoNuevo, numeroExpediente, comentario }) {
  const pool = await getPool();

  const result = await pool.request()
    .input('id', sql.Int, preSolicitudId)
    .query(`
      SELECT c.correo, c.nombres
      FROM conyuges c
      WHERE c.pre_solicitud_id = @id AND c.tipo = 'SOLICITANTE'
    `);

  if (result.recordset.length === 0) return;
  const { correo, nombres } = result.recordset[0];

  const COLOR_ESTADO = {
    ACTIVO:    '#276749',
    CANCELADO: '#9b2c2c',
    ARCHIVADO: '#1a3a6b',
  };

  await enviarCorreo({
    destinatario: correo,
    asunto: `Actualización de tu expediente ${numeroExpediente} — Municipalidad El Porvenir`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1a3a6b;padding:20px;text-align:center;">
          <h2 style="color:#c9a84c;margin:0;">Municipalidad Distrital de El Porvenir</h2>
          <p style="color:#fff;margin:6px 0 0;font-size:13px;">Sistema de Divorcio Municipal</p>
        </div>
        <div style="padding:28px;border:1px solid #dde2ec;">
          <p>Estimado/a <strong>${nombres}</strong>,</p>
          <p>Su expediente ha avanzado a una nueva etapa.</p>
          <p><strong>Número de expediente:</strong>
            <span style="color:#1a3a6b;font-weight:800;letter-spacing:1px;margin-left:6px;">${numeroExpediente}</span>
          </p>

          <div style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap;">
            <div style="background:#1a3a6b;color:#c9a84c;padding:10px 18px;border-radius:6px;font-weight:700;">
              ${ETIQUETAS_ETAPA[etapaNueva] || etapaNueva}
            </div>
            <div style="background:${COLOR_ESTADO[estadoNuevo] || '#276749'};color:#fff;padding:10px 18px;border-radius:6px;font-weight:700;">
              ${ETIQUETAS_ESTADO[estadoNuevo] || estadoNuevo}
            </div>
          </div>

          <div style="background:#f4f6f9;border-left:4px solid #c9a84c;padding:12px 16px;border-radius:0 6px 6px 0;margin:16px 0;">
            <p style="margin:0;color:#4a5568;font-size:13px;">
              ${DESCRIPCION_ETAPA[etapaNueva] || ''}
            </p>
          </div>

          ${comentario ? `
            <p style="margin-top:14px;font-size:13px;"><strong>Comentario del encargado:</strong></p>
            <p style="color:#4a5568;font-size:13px;">${comentario}</p>
          ` : ''}

          <p style="margin-top:20px;font-size:13px;color:#4a5568;">
            Puede hacer seguimiento de su trámite ingresando al portal con su cuenta.
          </p>
        </div>
        <div style="background:#f4f6f9;padding:14px;text-align:center;font-size:12px;color:#4a5568;">
          Municipalidad Distrital de El Porvenir — Sistema de Divorcio Municipal
        </div>
      </div>
    `,
  });
}

module.exports = { listar, detalle, crear, cambiarEtapa };