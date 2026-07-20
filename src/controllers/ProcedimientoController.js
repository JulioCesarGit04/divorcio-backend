const service = require('../services/ProcedimientoService');
const { sumarDiasHabiles: sumarDiasHabilesUtils, diasHabilesEntre } = require('../utils/diasHabiles');

// ================================================================
// IMPORTANTE: Renombramos la importación para evitar conflicto
// con la función del controlador que se llama igual.
// ================================================================

const getPreExpedientes = async (req, res) => {
    try {
        const data = await service.getPreExpedientes();
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const vincularExpediente = async (req, res) => {
    try {
        const { pre_solicitud_id, nro_mesa_partes, fecha_pago } = req.body;
        const usuario = req.session?.usuario?.nombre || 'Sistema';

        if (!pre_solicitud_id || !nro_mesa_partes || !fecha_pago) {
            return res.status(400).json({ ok: false, mensaje: 'pre_solicitud_id, nro_mesa_partes y fecha_pago son requeridos' });
        }

        const result = await service.vincularExpediente(pre_solicitud_id, nro_mesa_partes, fecha_pago, usuario);
        res.json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const getExpedientes = async (req, res) => {
    try {
        const { estado, etapa, numero_mesa_partes, dni } = req.query;
        const data = await service.getExpedientes(estado, etapa, numero_mesa_partes, dni);
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const getExpedienteById = async (req, res) => {
    try {
        const data = await service.getExpedienteById(req.params.id);
        if (!data.expediente) {
            return res.status(404).json({ ok: false, mensaje: 'Expediente no encontrado' });
        }
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const actualizarMesaPartes = async (req, res) => {
    try {
        const { nuevo_numero, motivo } = req.body;
        const id = req.params.id;
        const usuario = req.session?.usuario?.nombre || 'Sistema';

        if (!nuevo_numero || !motivo) {
            return res.status(400).json({ ok: false, mensaje: 'nuevo_numero y motivo son requeridos' });
        }

        const result = await service.actualizarMesaPartes(id, nuevo_numero, motivo, usuario);
        res.json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const cambiarEstado = async (req, res) => {
    try {
        const { nuevo_estado, nueva_etapa, motivo } = req.body;
        const id = req.params.id;
        const usuario = req.session?.usuario?.nombre || 'Sistema';

        if (!motivo) {
            return res.status(400).json({ ok: false, mensaje: 'motivo es requerido' });
        }
        if (!nuevo_estado && !nueva_etapa) {
            return res.status(400).json({ ok: false, mensaje: 'Debe enviar nuevo_estado o nueva_etapa' });
        }

        const result = await service.cambiarEstado(id, nuevo_estado, nueva_etapa, motivo, usuario);
        res.json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const subirDocumentoInterno = async (req, res) => {
    try {
        const { tipo_documento, numero_documento, fecha_elaboracion, motivo_reemplazo } = req.body;
        const { id } = req.params;
        const usuario = req.session?.usuario?.nombre || 'Sistema';

        if (!tipo_documento) {
            return res.status(400).json({ ok: false, mensaje: 'tipo_documento es requerido' });
        }
        if (!fecha_elaboracion) {
            return res.status(400).json({ ok: false, mensaje: 'fecha_elaboracion es requerido' });
        }
        if (!req.file) {
            return res.status(400).json({ ok: false, mensaje: 'Debe subir un archivo PDF' });
        }

        const ruta_archivo = `/uploads/${req.file.filename}`;
        const result = await service.subirDocumentoInterno(
            id,
            tipo_documento,
            numero_documento || null,
            fecha_elaboracion,
            ruta_archivo,
            usuario,
            motivo_reemplazo
        );
        res.json({ ok: true, data: result, mensaje: 'Documento subido correctamente' });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const getDocumentosInternos = async (req, res) => {
    try {
        const data = await service.getDocumentosInternos(req.params.id);
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const getHistorialDocumento = async (req, res) => {
    try {
        const data = await service.getHistorialDocumento(req.params.documentoId);
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const reemplazarDocumentoCiudadano = async (req, res) => {
    try {
        const { documentoId } = req.params;
        const usuario = req.session?.usuario?.nombre || 'Sistema';

        if (!req.file) {
            return res.status(400).json({ ok: false, mensaje: 'Debe subir un archivo PDF' });
        }

        const nuevaRuta = `/uploads/${req.file.filename}`;
        const result = await service.reemplazarDocumentoCiudadano(documentoId, nuevaRuta, usuario);
        res.json({ ok: true, mensaje: 'Documento reemplazado correctamente', ruta: nuevaRuta, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const getCronograma = async (req, res) => {
    try {
        const data = await service.getCronograma();
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const programarAudiencia = async (req, res) => {
    try {
        let { fecha_hora } = req.body;
        const id = req.params.id;
        const usuario = req.session?.usuario?.nombre || 'Sistema';

        let fechaCorrecta;
        if (typeof fecha_hora === 'string') {
            const match = fecha_hora.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
            if (match) {
                const [, year, month, day, hour, minute] = match;
                fechaCorrecta = new Date(Date.UTC(year, month - 1, day, hour, minute));
            } else {
                fechaCorrecta = new Date(fecha_hora);
            }
        } else {
            fechaCorrecta = new Date(fecha_hora);
        }

        const result = await service.programarAudiencia(id, fechaCorrecta, usuario);
        res.status(201).json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const registrarResultadoAudiencia = async (req, res) => {
    try {
        const { resultado, asistio_c1, asistio_c2, conyuge1_id, conyuge2_id, fecha_programada } = req.body;
        const { audienciaId } = req.params;
        const usuario = req.session?.usuario?.nombre || 'Sistema';

        if (!resultado || asistio_c1 === undefined || asistio_c2 === undefined || !conyuge1_id || !conyuge2_id) {
            return res.status(400).json({ ok: false, mensaje: 'resultado, asistio_c1, asistio_c2, conyuge1_id y conyuge2_id son requeridos' });
        }

        const result = await service.registrarResultadoAudiencia(
            audienciaId,
            resultado,
            asistio_c1,
            asistio_c2,
            conyuge1_id,
            conyuge2_id,
            usuario,
            fecha_programada
        );
        res.json({ ok: true, data: result });
    } catch (err) {
        console.error('Error en registrarResultadoAudiencia:', err);
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const corregirAsistencia = async (req, res) => {
    try {
        const { nuevo_valor } = req.body;
        const { asistenciaId } = req.params;
        const usuario = req.session?.usuario?.nombre || 'Sistema';

        if (nuevo_valor === undefined) {
            return res.status(400).json({ ok: false, mensaje: 'nuevo_valor es requerido' });
        }

        const result = await service.corregirAsistencia(asistenciaId, nuevo_valor, usuario);
        res.json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const getAudiencias = async (req, res) => {
    try {
        const data = await service.getAudiencias(req.params.id);
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const registrarResolucionFundada = async (req, res) => {
    try {
        const { numero_documento, fecha_elaboracion, ruta_archivo } = req.body;
        const id = req.params.id;
        const usuario = req.session?.usuario?.nombre || 'Sistema';

        if (!fecha_elaboracion || !ruta_archivo) {
            return res.status(400).json({ ok: false, mensaje: 'fecha_elaboracion y ruta_archivo son requeridos' });
        }

        const result = await service.registrarResolucionFundada(id, numero_documento, fecha_elaboracion, ruta_archivo, usuario);
        res.status(201).json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const getPlazos = async (req, res) => {
    try {
        const data = await service.getPlazos(req.params.id);
        if (!data) {
            return res.status(404).json({ ok: false, mensaje: 'No se encontraron plazos para este expediente' });
        }
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const verificarEsperaDisolucion = async (req, res) => {
    try {
        const id = req.params.id;
        const usuario = req.session?.usuario?.nombre || 'Sistema';
        const result = await service.verificarEsperaDisolucion(id, usuario);
        res.json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const getHistorialExpediente = async (req, res) => {
    try {
        const data = await service.getHistorialExpediente(req.params.id);
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const desvincularExpediente = async (req, res) => {
    try {
        const { motivo } = req.body;
        const id = req.params.id;
        const usuario = req.session?.usuario?.nombre || 'Sistema';

        if (!motivo) {
            return res.status(400).json({ ok: false, mensaje: 'motivo es requerido' });
        }

        const result = await service.desvincularExpediente(id, motivo, usuario);
        res.json({ ok: true, data: result });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const getHistorialGlobal = async (req, res) => {
    try {
        const { pre_solicitud_id, expediente_id } = req.query;
        const data = await service.getHistorialGlobal(pre_solicitud_id, expediente_id);
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const getUltimoCorrelativo = async (req, res) => {
    try {
        const { tipo } = req.query;
        if (!tipo) {
            return res.status(400).json({ ok: false, mensaje: 'El parámetro "tipo" es requerido' });
        }
        const correlativo = await service.obtenerUltimoCorrelativo(tipo);
        res.json({ ok: true, correlativo });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const verificarUnicidad = async (req, res) => {
    try {
        const { tipo, numero } = req.body;
        if (!tipo || !numero) {
            return res.status(400).json({ ok: false, mensaje: 'Los campos "tipo" y "numero" son requeridos' });
        }
        const existe = await service.verificarUnicidadNumeroDocumento(tipo, numero);
        res.json({ ok: true, existe });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const getHistorialTarjetas = async (req, res) => {
    try {
        const { codigo, solicitante, demandado, etapa, fecha_desde, fecha_hasta, pagina, por_pagina } = req.query;
        const data = await service.getHistorialTarjetas({
            codigo, solicitante, demandado, etapa, fecha_desde, fecha_hasta, pagina, por_pagina
        });
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

// ================================================================
// FUNCIONES DE DÍAS HÁBILES (usando el archivo utils)
// ================================================================
const getDiasHabilesEntre = async (req, res) => {
    try {
        const { inicio, fin } = req.query;
        if (!inicio || !fin) {
            return res.status(400).json({ ok: false, mensaje: 'Se requieren inicio y fin' });
        }

        const fechaInicio = new Date(inicio + 'T00:00:00');
        const fechaFin = new Date(fin + 'T00:00:00');

        if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
            return res.status(400).json({ ok: false, mensaje: 'Fechas inválidas' });
        }

        const dias = diasHabilesEntre(fechaInicio, fechaFin);
        res.json({ ok: true, dias });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const sumarDiasHabiles = async (req, res) => {
    try {
        const { inicio, dias } = req.query;
        if (!inicio || dias === undefined) {
            return res.status(400).json({ ok: false, mensaje: 'Se requieren inicio y dias' });
        }

        const fechaInicio = new Date(inicio + 'T00:00:00');
        if (isNaN(fechaInicio.getTime())) {
            return res.status(400).json({ ok: false, mensaje: 'Fecha inválida' });
        }

        const fechaResultado = sumarDiasHabilesUtils(fechaInicio, parseInt(dias));
        const fechaStr = fechaResultado.toISOString().split('T')[0];
        res.json({ ok: true, fecha: fechaStr });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

// ================================================================
// EXPORTACIÓN
// ================================================================
module.exports = {
    sumarDiasHabiles,       
    getDiasHabilesEntre,
    getHistorialTarjetas,
    getPreExpedientes,
    vincularExpediente,
    getExpedientes,
    getExpedienteById,
    actualizarMesaPartes,
    cambiarEstado,
    subirDocumentoInterno,
    getDocumentosInternos,
    getHistorialDocumento,
    reemplazarDocumentoCiudadano,
    getCronograma,
    programarAudiencia,
    registrarResultadoAudiencia,
    corregirAsistencia,
    getAudiencias,
    registrarResolucionFundada,
    getPlazos,
    verificarEsperaDisolucion,
    getHistorialExpediente,
    desvincularExpediente,
    getHistorialGlobal,
    getUltimoCorrelativo,
    verificarUnicidad,
};