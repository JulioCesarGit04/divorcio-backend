const { getPool, sql } = require('../config/db');
const fs = require('fs');
const { 
    validarDocumentoObservado
} = require('../services/plazoSubsanacionService');

async function ping(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT GETDATE() as hora_servidor');
        res.json({ ok: true, hora_servidor: result.recordset[0].hora_servidor });
    } catch (error) {
        console.error(' Error en ping:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al obtener hora del servidor' });
    }
}

async function getDocumentosObservados(req, res) {
    try {
        const { id } = req.params;
        const { id_usuario } = req.user;

        const pool = await getPool();
        const horaServidor = new Date();

        const preResult = await pool.request()
            .input('id', sql.Int, id)
            .input('id_usuario', sql.Int, id_usuario)
            .query(`
                SELECT ps.id, ps.codigo, ps.estado
                FROM pre_solicitudes ps
                INNER JOIN conyuges c ON c.pre_solicitud_id = ps.id AND c.tipo = 'SOLICITANTE'
                INNER JOIN ciudadanos ci ON ci.dni = c.dni
                WHERE ps.id = @id AND ci.id = @id_usuario
            `);

        if (preResult.recordset.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Pre-solicitud no encontrada' });
        }

        const preSolicitud = preResult.recordset[0];

        const docsResult = await pool.request()
            .input('pre_solicitud_id', sql.Int, id)
            .query(`
                SELECT 
                    d.id,
                    d.tipo_documento,
                    d.ruta_archivo,
                    d.nombre_archivo,
                    ed.estado AS estado_evaluacion,
                    ed.observacion AS observacion_evaluacion,
                    ed.evaluado_en
                FROM documentos d
                INNER JOIN (
                    SELECT *,
                        ROW_NUMBER() OVER (PARTITION BY documento_id ORDER BY evaluado_en DESC) AS rn
                    FROM evaluacion_documentos
                ) ed ON ed.documento_id = d.id AND ed.rn = 1
                WHERE d.pre_solicitud_id = @pre_solicitud_id
                    AND ed.estado = 'OBSERVADO'
                    AND ed.observacion IS NOT NULL
                    AND LTRIM(RTRIM(ed.observacion)) <> ''
                    AND d.origen = 'WEB'
                ORDER BY d.tipo_documento
            `);

        const docsConPlazo = docsResult.recordset.map(doc => {
            const validacion = validarDocumentoObservado(doc.evaluado_en, horaServidor);
            return {
                ...doc,
                fecha_limite_subsanacion: validacion.fechaLimite, 
                plazo_valido: validacion.valido,
                plazo_mensaje: validacion.mensajeUsuario,
                dias_restantes: validacion.diasRestantes
            };
        });

        res.json({
            ok: true,
            data: {
                pre_solicitud_id: id,
                codigo: preSolicitud.codigo,
                estado: preSolicitud.estado,
                documentos: docsConPlazo,
                hora_servidor: horaServidor,
                total: docsConPlazo.length,
                tiene_vencidos: docsConPlazo.some(d => !d.plazo_valido)
            }
        });

    } catch (error) {
        console.error(' Error en getDocumentosObservados:', error);
        res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
    }
}

async function resubirDocumentos(req, res) {
    try {
        const { id } = req.params;
        const { id_usuario } = req.user;
        const archivos = req.files;

        if (!archivos || Object.keys(archivos).length === 0) {
            return res.status(400).json({ ok: false, mensaje: 'No se enviaron archivos.' });
        }

        const pool = await getPool();
        const horaServidor = new Date();

        const preResult = await pool.request()
            .input('id', sql.Int, id)
            .input('id_usuario', sql.Int, id_usuario)
            .query(`
                SELECT ps.id, ps.estado, ps.codigo
                FROM pre_solicitudes ps
                INNER JOIN conyuges c ON c.pre_solicitud_id = ps.id AND c.tipo = 'SOLICITANTE'
                INNER JOIN ciudadanos ci ON ci.dni = c.dni
                WHERE ps.id = @id AND ci.id = @id_usuario
            `);

        if (preResult.recordset.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Pre-solicitud no encontrada' });
        }

        const preSolicitud = preResult.recordset[0];
        if (preSolicitud.estado !== 'OBSERVADA') {
            return res.status(400).json({ ok: false, mensaje: 'Solo se pueden subsanar documentos en estado OBSERVADA' });
        }

        const docsResult = await pool.request()
            .input('pre_solicitud_id', sql.Int, id)
            .query(`
                SELECT d.id, d.tipo_documento, d.ruta_archivo, ed.evaluado_en
                FROM documentos d
                INNER JOIN (
                    SELECT *,
                        ROW_NUMBER() OVER (PARTITION BY documento_id ORDER BY evaluado_en DESC) AS rn
                    FROM evaluacion_documentos
                ) ed ON ed.documento_id = d.id AND ed.rn = 1
                WHERE d.pre_solicitud_id = @pre_solicitud_id
                    AND ed.estado = 'OBSERVADO'
                    AND ed.observacion IS NOT NULL
                    AND LTRIM(RTRIM(ed.observacion)) <> ''
                    AND d.origen = 'WEB'
            `);

        const docsObservados = docsResult.recordset;

        if (docsObservados.length === 0) {
            return res.status(400).json({ ok: false, mensaje: 'No hay documentos observados para subsanar' });
        }

        const docsConPlazo = docsObservados.map(doc => ({
            ...doc,
            validacion: validarDocumentoObservado(doc.evaluado_en, horaServidor)
        }));

        const vencidos = docsConPlazo.filter(d => !d.validacion.valido);
        if (vencidos.length > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El plazo de 2 días hábiles ha vencido para uno o más documentos',
                documentos_vencidos: vencidos.map(d => ({
                    tipo: d.tipo_documento,
                    mensaje: d.validacion.mensajeUsuario
                }))
            });
        }

        const tiposRequeridos = docsObservados.map(d => d.tipo_documento);
        const tiposSubidos = Object.keys(archivos);
        const faltantes = tiposRequeridos.filter(t => !tiposSubidos.includes(t));

        if (faltantes.length > 0) {
            return res.status(400).json({ ok: false, mensaje: `Faltan documentos: ${faltantes.join(', ')}` });
        }

        const actualizados = [];
        for (const doc of docsObservados) {
            const archivo = archivos[doc.tipo_documento];
            const file = Array.isArray(archivo) ? archivo[0] : archivo;

            if (doc.ruta_archivo && fs.existsSync(doc.ruta_archivo)) {
                try {
                    fs.unlinkSync(doc.ruta_archivo);
                } catch (err) {
                    console.warn(' No se pudo eliminar archivo:', err.message);
                }
            }

            await pool.request()
                .input('id', sql.Int, doc.id)
                .input('ruta', sql.VarChar, file.path)
                .input('nombre', sql.VarChar, file.originalname)
                .query(`
                    UPDATE documentos 
                    SET 
                        ruta_archivo = @ruta,
                        nombre_archivo = @nombre,
                        fecha_correccion = GETDATE(),
                        estado_correccion = 'CORREGIDO'
                    WHERE id = @id
                `);

            await pool.request()
                .input('documento_id', sql.Int, doc.id)
                .query(`DELETE FROM evaluacion_documentos WHERE documento_id = @documento_id`);

            actualizados.push(doc.tipo_documento);
        }

        await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE pre_solicitudes 
                SET estado = 'EN_CALIFICACION', actualizado_en = GETDATE()
                WHERE id = @id
            `);

        await pool.request()
            .input('pre_solicitud_id', sql.Int, id)
            .input('estado_anterior', sql.VarChar, 'OBSERVADA')
            .input('estado_nuevo', sql.VarChar, 'EN_CALIFICACION')
            .input('comentario', sql.VarChar, `Subsanación: ${actualizados.join(', ')}`)
            .query(`
                INSERT INTO historial_estado_pre_solicitud 
                (pre_solicitud_id, estado_anterior, estado_nuevo, comentario, cambiado_en)
                VALUES 
                (@pre_solicitud_id, @estado_anterior, @estado_nuevo, @comentario, GETDATE())
            `);

        res.json({
            ok: true,
            mensaje: 'Documentos subsanados correctamente',
            documentos_actualizados: actualizados
        });

    } catch (error) {
        console.error(' Error en resubirDocumentos:', error);
        res.status(500).json({ ok: false, mensaje: 'Error interno del servidor', error: error.message });
    }
}

module.exports = { ping, getDocumentosObservados, resubirDocumentos };