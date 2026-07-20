const { getPool, sql } = require('../config/db');
const { enviarCorreo } = require('../config/mailer');

async function listarPreSolicitudes() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      ps.id, ps.codigo, ps.estado, ps.creado_en,
      c1.nombres    AS nombres_solicitante,
      c1.apellidos  AS apellidos_solicitante,
      c1.dni        AS dni_solicitante,
      c2.nombres    AS nombres_demandado,
      c2.apellidos  AS apellidos_demandado,
      c2.dni        AS dni_demandado
    FROM pre_solicitudes ps
    LEFT JOIN conyuges c1 ON c1.pre_solicitud_id = ps.id AND c1.tipo = 'SOLICITANTE'
    LEFT JOIN conyuges c2 ON c2.pre_solicitud_id = ps.id AND c2.tipo = 'DEMANDADO'
    WHERE ps.estado IN ('EN_CALIFICACION', 'OBSERVADA')
    ORDER BY ps.creado_en ASC
  `);
  return result.recordset;
}

async function obtenerDetalle(id) {
  const pool = await getPool();

  const resPre = await pool.request()
    .input('id', sql.Int, id)
    .query(`SELECT id, codigo, estado, creado_en, actualizado_en FROM pre_solicitudes WHERE id = @id`);

  if (resPre.recordset.length === 0) return null;

  const resConyuges = await pool.request()
    .input('id', sql.Int, id)
    .query(`SELECT tipo, nombres, apellidos, dni, telefono, correo, direccion FROM conyuges WHERE pre_solicitud_id = @id`);

const resDocs = await pool.request()
  .input('id', sql.Int, id)
  .query(`
    SELECT
      d.id, d.tipo_documento, d.nombre_archivo, d.ruta_archivo, d.subido_en,
      d.fecha_correccion,
      d.estado_correccion,
      ev.estado        AS estado_evaluacion,
      ev.observacion   AS observacion_evaluacion,
      ev.evaluado_en,
      u.nombre         AS evaluado_por
    FROM documentos d
    LEFT JOIN (
      SELECT e1.*
      FROM evaluacion_documentos e1
      INNER JOIN (
        SELECT documento_id, MAX(evaluado_en) AS ultima
        FROM evaluacion_documentos
        GROUP BY documento_id
      ) e2 ON e1.documento_id = e2.documento_id AND e1.evaluado_en = e2.ultima
    ) ev ON ev.documento_id = d.id
    LEFT JOIN usuarios u ON u.id = ev.usuario_id
    WHERE d.pre_solicitud_id = @id AND d.origen = 'WEB'
  `);

  return {
    ...resPre.recordset[0],
    conyuges:   resConyuges.recordset,
    documentos: resDocs.recordset,
  };
}

async function evaluarDocumentos({ preSolicitudId, evaluaciones, usuarioId }) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const resPre = await new sql.Request(transaction)
      .input('id', sql.Int, preSolicitudId)
      .query(`SELECT estado FROM pre_solicitudes WHERE id = @id`);

const estadoActual = resPre.recordset[0].estado;
if (!['EN_CALIFICACION', 'OBSERVADA'].includes(estadoActual)) {
  throw new Error('Esta pre-solicitud no puede modificarse.');
}

console.log(' ====== EVALUANDO DOCUMENTOS ======');
console.log(' preSolicitudId:', preSolicitudId);
console.log(' usuarioId:', usuarioId);
console.log(' evaluaciones a guardar:', JSON.stringify(evaluaciones, null, 2));

for (const ev of evaluaciones) {
  console.log(`📊 Guardando documento ${ev.documentoId} como ${ev.estado}`);
  await new sql.Request(transaction)
    .input('pre_solicitud_id', sql.Int,     preSolicitudId)
    .input('documento_id',     sql.Int,     ev.documentoId)
    .input('estado',           sql.VarChar, ev.estado)
    .input('observacion',      sql.VarChar, ev.observacion || null)
    .input('usuario_id',       sql.Int,     usuarioId)
    .query(`
      INSERT INTO evaluacion_documentos
        (pre_solicitud_id, documento_id, estado, observacion, usuario_id)
      VALUES
        (@pre_solicitud_id, @documento_id, @estado, @observacion, @usuario_id)
    `);
}
console.log('📊 Evaluaciones guardadas correctamente');

    const tieneInadmisible = evaluaciones.some((e) => e.estado === 'INADMISIBLE');
    const tieneObservado   = evaluaciones.some((e) => e.estado === 'OBSERVADO');
    const todosAprobados   = evaluaciones.every((e) => e.estado === 'APROBADO');

    let nuevoEstado;
    if (tieneInadmisible)  nuevoEstado = 'IMPROCEDENTE';
    else if (tieneObservado) nuevoEstado = 'OBSERVADA';
    else if (todosAprobados) nuevoEstado = 'ADMISIBLE';
    else nuevoEstado = 'EN_CALIFICACION';

    await new sql.Request(transaction)
      .input('estado', sql.VarChar, nuevoEstado)
      .input('id',     sql.Int,     preSolicitudId)
      .query(`UPDATE pre_solicitudes SET estado = @estado, actualizado_en = GETDATE() WHERE id = @id`);

    await new sql.Request(transaction)
      .input('pre_solicitud_id', sql.Int,     preSolicitudId)
      .input('estado_anterior',  sql.VarChar, estadoActual)
      .input('estado_nuevo',     sql.VarChar, nuevoEstado)
      .input('usuario_id',       sql.Int,     usuarioId)
      .query(`
        INSERT INTO historial_estado_pre_solicitud
          (pre_solicitud_id, estado_anterior, estado_nuevo, usuario_id)
        VALUES
          (@pre_solicitud_id, @estado_anterior, @estado_nuevo, @usuario_id)
      `);

    await transaction.commit();

    await enviarNotificacionCiudadano({
      preSolicitudId,
      nuevoEstado,
      evaluaciones,
    });

    return { nuevoEstado };

  } catch (err) {
    console.error('❌ ERROR REAL en evaluarDocumentos:', err.message);
    console.error(err);
    try {
      await transaction.rollback();
    } catch (rollbackErr) {
      console.error('⚠️ Error adicional al intentar rollback:', rollbackErr.message);
    }
    throw err;
  }
}
async function enviarNotificacionCiudadano({ preSolicitudId, nuevoEstado, evaluaciones }) {
  const pool = await getPool();

  const result = await pool.request()
    .input('id', sql.Int, preSolicitudId)
    .query(`
      SELECT 
        ps.codigo,
        c1.correo AS correo_solicitante,
        c1.nombres AS nombres_solicitante,
        c1.apellidos AS apellidos_solicitante,
        c2.correo AS correo_demandado,
        c2.nombres AS nombres_demandado,
        c2.apellidos AS apellidos_demandado
      FROM pre_solicitudes ps
      LEFT JOIN conyuges c1 ON c1.pre_solicitud_id = ps.id AND c1.tipo = 'SOLICITANTE'
      LEFT JOIN conyuges c2 ON c2.pre_solicitud_id = ps.id AND c2.tipo = 'DEMANDADO'
      WHERE ps.id = @id
    `);

  if (result.recordset.length === 0) return;

  const data = result.recordset[0];

  const docsResult = await pool.request()
    .input('pre_solicitud_id', sql.Int, preSolicitudId)
    .query(`
      SELECT 
        d.id,
        d.tipo_documento,
        d.nombre_archivo,
        ev.estado,
        ev.observacion
      FROM documentos d
      LEFT JOIN (
        SELECT e1.*
        FROM evaluacion_documentos e1
        INNER JOIN (
          SELECT documento_id, MAX(evaluado_en) AS ultima
          FROM evaluacion_documentos
          GROUP BY documento_id
        ) e2 ON e1.documento_id = e2.documento_id AND e1.evaluado_en = e2.ultima
      ) ev ON ev.documento_id = d.id
      WHERE d.pre_solicitud_id = @pre_solicitud_id
    `);

  const documentos = docsResult.recordset;

  let docsInadmisibles = documentos.filter(d => d.estado === 'INADMISIBLE');
  let docsObservados = documentos.filter(d => d.estado === 'OBSERVADO');
  let docsAprobados = documentos.filter(d => d.estado === 'APROBADO');

  if (docsInadmisibles.length === 0 && evaluaciones && evaluaciones.length > 0) {
    const idsInadmisibles = evaluaciones.filter(e => e.estado === 'INADMISIBLE').map(e => e.documentoId);
    if (idsInadmisibles.length > 0) {
      const resNombres = await pool.request()
        .query(`SELECT id, tipo_documento FROM documentos WHERE id IN (${idsInadmisibles.join(',')})`);
      
      docsInadmisibles = resNombres.recordset.map(d => ({
        ...d,
        estado: 'INADMISIBLE',
        observacion: evaluaciones.find(e => e.documentoId === d.id)?.observacion || 'No cumple con los requisitos legales'
      }));
    }
  }

  if (docsObservados.length === 0 && evaluaciones && evaluaciones.length > 0) {
    const idsObservados = evaluaciones.filter(e => e.estado === 'OBSERVADO').map(e => e.documentoId);
    if (idsObservados.length > 0) {
      const resNombres = await pool.request()
        .query(`SELECT id, tipo_documento FROM documentos WHERE id IN (${idsObservados.join(',')})`);
      
      docsObservados = resNombres.recordset.map(d => ({
        ...d,
        estado: 'OBSERVADO',
        observacion: evaluaciones.find(e => e.documentoId === d.id)?.observacion || 'Documento incorrecto o incompleto'
      }));
    }
  }

  if (docsAprobados.length === 0 && evaluaciones && evaluaciones.length > 0) {
    const idsAprobados = evaluaciones.filter(e => e.estado === 'APROBADO').map(e => e.documentoId);
    if (idsAprobados.length > 0) {
      const resNombres = await pool.request()
        .query(`SELECT id, tipo_documento FROM documentos WHERE id IN (${idsAprobados.join(',')})`);
      
      docsAprobados = resNombres.recordset.map(d => ({
        ...d,
        estado: 'APROBADO'
      }));
    }
  }

  const ETIQUETAS = {
    solicitud_alcalde:    'Solicitud dirigida al Alcalde',
    dni_conyuge1:         'Copia DNI — Conyuge 1',
    dni_conyuge2:         'Copia DNI — Conyuge 2',
    acta_matrimonio:      'Acta de matrimonio',
    dj_hijos_menores:     'DJ — No tener hijos menores de edad',
    dj_hijos_incapacidad: 'DJ — No tener hijos con incapacidad',
    dj_bienes:            'DJ — No tener bienes en sociedad de gananciales',
    dj_domicilio:         'DJ — Ultimo domicilio conyugal en El Porvenir',
    acta_nacimiento:      'Acta de nacimiento',
    acta_conciliacion:    'Acta de conciliacion',
    escritura_separacion: 'Escritura Publica de Separacion',
    representacion_legal: 'Representacion Legal',
  };

  let asunto = '';
  let mensajeHTML = '';


  if (nuevoEstado === 'ADMISIBLE') {
    asunto = `Su trámite ${data.codigo} fue ADMITIDO - Municipalidad El Porvenir`;
    mensajeHTML = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1a3a6b;padding:20px;text-align:center;">
          <h2 style="color:#c9a84c;margin:0;">Municipalidad Distrital de El Porvenir</h2>
          <p style="color:#fff;margin:6px 0 0;font-size:13px;">Sistema de Divorcio Municipal</p>
        </div>
        <div style="padding:28px;border:1px solid #dde2ec;background:#f0fff4;">
          <div style="text-align:center;margin-bottom:20px;">
            <span style="background:#276749;color:white;padding:8px 24px;border-radius:20px;font-weight:bold;">ADMITIDO</span>
          </div>
          <p>Estimado/a <strong>${data.nombres_solicitante} ${data.apellidos_solicitante}</strong>,</p>
          <p>Buena noticia. Su pre-solicitud de divorcio ha sido <strong>ADMITIDA</strong> satisfactoriamente. Todos sus documentos cumplen con los requisitos establecidos.</p>
          <p><strong>Codigo de tramite:</strong> ${data.codigo}</p>
          
          <div style="background:#e8f5e9;border:1px solid #9ae6b4;border-radius:8px;padding:16px;margin-top:16px;">
            <p style="font-weight:700;color:#276749;margin:0 0 8px;">Proximos pasos:</p>
            <ol style="margin:0;padding-left:20px;color:#4a5568;font-size:13px;line-height:1.8;">
              <li>Dirijase a <a href="https://facilita.gob.pe/t/6356" style="color:#0054a6;font-weight:700;text-decoration:underline;">Mesa de Partes Virtual</a> de la Municipalidad Distrital de El Porvenir.</li>
              <li>Revise que todos sus documentos sean los mismos que fueron admisibles.</li>
              <li>Y haga el envio correctamente de todos sus documentos.</li>
            </ol>
          </div>
        </div>
        <div style="background:#f4f6f9;padding:14px;text-align:center;font-size:12px;color:#4a5568;">
          Municipalidad Distrital de El Porvenir — Sistema de Divorcio Municipal
        </div>
      </div>
    `;
  }
  else if (nuevoEstado === 'OBSERVADA') {
    asunto = `Su tramite ${data.codigo} tiene OBSERVACIONES - Municipalidad El Porvenir`;
    
    const listaObservados = docsObservados.map(d => `
      <div style="background:#fff3e0;border-left:4px solid #b7791f;padding:12px;margin:10px 0;border-radius:6px;">
        <p style="margin:0 0 5px;font-weight:700;">${ETIQUETAS[d.tipo_documento] || d.tipo_documento}</p>
        <p style="margin:0;color:#b7791f;font-size:13px;"><strong>Observacion:</strong> ${d.observacion || 'Documento incorrecto o incompleto'}</p>
      </div>
    `).join('');

    const listaAprobados = docsAprobados.map(d => `
      <div style="background:#e8f5e9;border-left:4px solid #276749;padding:12px;margin:10px 0;border-radius:6px;">
        <p style="margin:0 0 5px;font-weight:700;">${ETIQUETAS[d.tipo_documento] || d.tipo_documento}</p>
        <p style="margin:0;color:#276749;font-size:13px;">Documento correcto y valido</p>
      </div>
    `).join('');

    mensajeHTML = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1a3a6b;padding:20px;text-align:center;">
          <h2 style="color:#c9a84c;margin:0;">Municipalidad Distrital de El Porvenir</h2>
          <p style="color:#fff;margin:6px 0 0;font-size:13px;">Sistema de Divorcio Municipal</p>
        </div>
        <div style="padding:28px;border:1px solid #dde2ec;background:#fffbeb;">
          <div style="text-align:center;margin-bottom:20px;">
            <span style="background:#b7791f;color:white;padding:8px 24px;border-radius:20px;font-weight:bold;">CON OBSERVACIONES</span>
          </div>
          <p>Estimado/a <strong>${data.nombres_solicitante} ${data.apellidos_solicitante}</strong>,</p>
          <p>Su pre-solicitud de divorcio ha sido revisada y presenta <strong>observaciones</strong> que debe corregir para continuar.</p>
          <p><strong>Codigo de tramite:</strong> ${data.codigo}</p>
          
          <div style="background:#fff3e0;padding:16px;border-radius:8px;border:1px solid #f6e05e;">
            <p style="font-weight:700;color:#b7791f;margin:0 0 8px;">Documentos que requieren correccion:</p>
            ${listaObservados}
          </div>

          ${docsAprobados.length > 0 ? `
            <div style="background:#e8f5e9;padding:16px;border-radius:8px;border:1px solid #9ae6b4;margin-top:16px;">
              <p style="font-weight:700;color:#276749;margin:0 0 8px;">Documentos correctos (aprobados):</p>
              ${listaAprobados}
            </div>
          ` : ''}
          
          <div style="background:#fff3e0;border:1px solid #f6e05e;border-radius:8px;padding:16px;margin-top:16px;">
            <p style="font-weight:700;color:#b7791f;margin:0 0 8px;">Acciones requeridas:</p>
            <ol style="margin:0;padding-left:20px;color:#4a5568;font-size:13px;line-height:1.8;">
              <li>Ingrese al sistema con su DNI</li>
              <li>Reemplace los documentos observados</li>
              <li>Los documentos en verde ya estan correctos, no necesita modificarlos</li>
              <li>Una vez corregidos, su solicitud sera reevaluada</li>
            </ol>
            <p style="margin-top:10px;font-size:12px;"><strong>Plazo para corregir:</strong> 2 dias habiles</p>
          </div>
        </div>
        <div style="background:#f4f6f9;padding:14px;text-align:center;font-size:12px;color:#4a5568;">
          Municipalidad Distrital de El Porvenir — Sistema de Divorcio Municipal
        </div>
      </div>
    `;
  }
  else if (nuevoEstado === 'IMPROCEDENTE') {
    asunto = `Su tramite ${data.codigo} fue declarado IMPROCEDENTE - Municipalidad El Porvenir`;
    
    const listaInadmisibles = docsInadmisibles.map(d => `
      <div style="background:#fdeaea;border-left:4px solid #9b2c2c;padding:12px;margin:10px 0;border-radius:6px;">
        <p style="margin:0 0 5px;font-weight:700;">${ETIQUETAS[d.tipo_documento] || d.tipo_documento}</p>
        <p style="margin:0;color:#9b2c2c;font-size:13px;"><strong>Motivo:</strong> ${d.observacion || 'No cumple con los requisitos legales'}</p>
      </div>
    `).join('');

    const listaAprobados = docsAprobados.map(d => `
      <div style="background:#e8f5e9;border-left:4px solid #276749;padding:12px;margin:10px 0;border-radius:6px;">
        <p style="margin:0 0 5px;font-weight:700;">${ETIQUETAS[d.tipo_documento] || d.tipo_documento}</p>
        <p style="margin:0;color:#276749;font-size:13px;">Documento correcto y valido</p>
      </div>
    `).join('');

    mensajeHTML = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1a3a6b;padding:20px;text-align:center;">
          <h2 style="color:#c9a84c;margin:0;">Municipalidad Distrital de El Porvenir</h2>
          <p style="color:#fff;margin:6px 0 0;font-size:13px;">Sistema de Divorcio Municipal</p>
        </div>
        <div style="padding:28px;border:1px solid #dde2ec;background:#fff5f5;">
          <div style="text-align:center;margin-bottom:20px;">
            <span style="background:#9b2c2c;color:white;padding:8px 24px;border-radius:20px;font-weight:bold;">IMPROCEDENTE</span>
          </div>
          <p>Estimado/a <strong>${data.nombres_solicitante} ${data.apellidos_solicitante}</strong>,</p>
          <p>Lamentamos informarle que su pre-solicitud de divorcio ha sido declarada <strong>IMPROCEDENTE</strong>.</p>
          <p><strong>Codigo de tramite:</strong> ${data.codigo}</p>
          
          <div style="background:#fdeaea;padding:16px;border-radius:8px;border:1px solid #feb2b2;">
            <p style="font-weight:700;color:#9b2c2c;margin:0 0 8px;">Documentos con problemas:</p>
            ${docsInadmisibles.length > 0 ? listaInadmisibles : `
              <div style="background:#fdeaea;border-left:4px solid #9b2c2c;padding:12px;margin:10px 0;border-radius:6px;">
                <p style="margin:0;">No cumple con los requisitos legales esenciales para el tramite de divorcio municipal.</p>
              </div>
            `}
          </div>

          ${docsAprobados.length > 0 ? `
            <div style="background:#e8f5e9;padding:16px;border-radius:8px;border:1px solid #9ae6b4;margin-top:16px;">
              <p style="font-weight:700;color:#276749;margin:0 0 8px;">Documentos correctos (aprobados):</p>
              ${listaAprobados}
            </div>
          ` : ''}
          
          <div style="background:#fdeaea;border:1px solid #feb2b2;border-radius:8px;padding:16px;margin-top:16px;">
            <p style="font-weight:700;color:#9b2c2c;margin:0 0 8px;">Que puede hacer?</p>
            <ul style="margin:0;padding-left:20px;color:#4a5568;font-size:13px;line-height:1.8;">
              <li>Revise los requisitos completos del tramite de divorcio</li>
              <li>Corrija los problemas senalados en los documentos</li>
              <li>Puede presentar una NUEVA solicitud corrigiendo las observaciones</li>
              <li>Los documentos en verde ya estan correctos, no necesita modificarlos</li>
            </ul>
            <p style="margin-top:10px;">Para mayor informacion, puede acercarse a nuestras oficinas.</p>
          </div>
        </div>
        <div style="background:#f4f6f9;padding:14px;text-align:center;font-size:12px;color:#4a5568;">
          Municipalidad Distrital de El Porvenir — Sistema de Divorcio Municipal
        </div>
      </div>
    `;
  }

  if (data.correo_solicitante) {
    await enviarCorreo({
      destinatario: data.correo_solicitante,
      asunto: asunto,
      html: mensajeHTML,
    });
  }

  if (data.correo_demandado && data.correo_demandado !== data.correo_solicitante) {
    const mensajeHTMLDemandado = mensajeHTML.replace(
      `Estimado/a <strong>${data.nombres_solicitante} ${data.apellidos_solicitante}</strong>`,
      `Estimado/a <strong>${data.nombres_demandado} ${data.apellidos_demandado}</strong>`
    );
    await enviarCorreo({
      destinatario: data.correo_demandado,
      asunto: asunto,
      html: mensajeHTMLDemandado,
    });
  }
}

module.exports = { listarPreSolicitudes, obtenerDetalle, evaluarDocumentos };

