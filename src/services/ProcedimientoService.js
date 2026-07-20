const { getPool, sql } = require('../config/db');
const { sumarDiasHabiles, diasHabilesEntre, diasHabilesRestantes } = require('../utils/diasHabiles');

const getPreExpedientes = async () => {
    const pool = await getPool();
    const result = await pool.request()
        .execute('sp_pre_expedientes_listar');
    return result.recordset;
};

const vincularExpediente = async (pre_solicitud_id, numero_mesa_partes, fecha_pago, usuario) => {
    const pool = await getPool();
    
    const [year, month, day] = fecha_pago.split('-');
    const fechaPagoObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    const fechaLimiteHabiles = sumarDiasHabiles(fechaPagoObj, 15);
        
    const result = await pool.request()
        .input('pre_solicitud_id', sql.Int, pre_solicitud_id)
        .input('numero_mesa_partes', sql.VarChar(50), numero_mesa_partes)
        .input('fecha_pago', sql.Date, fecha_pago)
        .input('fecha_limite_habiles', sql.Date, fechaLimiteHabiles)
        .input('registrado_por', sql.VarChar(100), usuario)
        .execute('sp_vincular_expediente');
    
    return result.recordset[0];
};

const getExpedientes = async (estado, etapa, numero_mesa_partes, dni) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('estado', sql.VarChar(20), estado || null)
        .input('etapa', sql.VarChar(30), etapa || null)
        .input('numero_mesa_partes', sql.VarChar(50), numero_mesa_partes || null)
        .input('dni', sql.VarChar(8), dni || null)
        .execute('sp_expedientes_listar');
    return result.recordset;
};

const getExpedienteById = async (id) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, id)
        .execute('sp_expedientes_obtener');
    
    const expediente = result.recordsets[0][0] || null;
    const documentos_ciudadano = result.recordsets[1] || [];
    const documentos_internos = result.recordsets[2] || [];
    const audiencias = result.recordsets[3] || [];
    
    if (expediente) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (expediente.fecha_limite_audiencia) {
    const fechaLimite = new Date(expediente.fecha_limite_audiencia);
expediente.dias_restantes_audiencia_habiles = diasHabilesEntre(hoy, fechaLimite) - 1;
} else {
    expediente.dias_restantes_audiencia_habiles = null;
}
        
        if (expediente.fecha_fin_espera) {
            const fechaFin = new Date(expediente.fecha_fin_espera);
            expediente.dias_restantes_espera_habiles = diasHabilesEntre(hoy, fechaFin);
        } else {
            expediente.dias_restantes_espera_habiles = null;
        }
        
        if (expediente.dias_restantes_audiencia_habiles !== null) {
            const dias = expediente.dias_restantes_audiencia_habiles;
            if (dias < 0) {
                expediente.plazo_color = 'vencido';
                expediente.plazo_texto = 'PLAZO VENCIDO';
            } else if (dias < 3) {
                expediente.plazo_color = 'urgente';
                expediente.plazo_texto = `${dias} días restantes (URGENTE)`;
            } else if (dias <= 7) {
                expediente.plazo_color = 'proximo';
                expediente.plazo_texto = `${dias} días restantes`;
            } else {
                expediente.plazo_color = 'normal';
                expediente.plazo_texto = `${dias} días restantes`;
            }
        }
        
        if (expediente.fecha_pago && expediente.fecha_limite_audiencia) {
            const fechaPago = new Date(expediente.fecha_pago);
            const fechaLimite = new Date(expediente.fecha_limite_audiencia);
            expediente.total_dias_habiles_audiencia = diasHabilesEntre(fechaPago, fechaLimite);
        }
    }
    
    return {
        expediente,
        documentos_ciudadano,
        documentos_internos,
        audiencias
    };
};

const actualizarMesaPartes = async (id, nuevo_numero, motivo, usuario) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, id)
        .input('nuevo_numero', sql.VarChar(50), nuevo_numero)
        .input('motivo', sql.VarChar(300), motivo)
        .input('usuario', sql.VarChar(100), usuario)
        .execute('sp_actualizar_mesa_partes');
    return result.recordset[0];
};

const cambiarEstado = async (id, nuevo_estado, nueva_etapa, motivo, usuario) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, id)
        .input('nuevo_estado', sql.VarChar(20), nuevo_estado || null)
        .input('nueva_etapa', sql.VarChar(30), nueva_etapa || null)
        .input('motivo', sql.VarChar(300), motivo)
        .input('usuario', sql.VarChar(100), usuario)
        .execute('sp_cambiar_estado_expediente');
    return result.recordset[0];
};

const subirDocumentoInterno = async (expediente_id, tipo_documento, numero_documento, fecha_elaboracion, ruta_archivo, subido_por, motivo_reemplazo = null) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .input('tipo_documento', sql.VarChar(50), tipo_documento)
        .input('numero_documento', sql.VarChar(50), numero_documento)
        .input('fecha_elaboracion', sql.Date, fecha_elaboracion)
        .input('ruta_archivo', sql.VarChar(500), ruta_archivo)
        .input('subido_por', sql.VarChar(100), subido_por)
        .input('motivo_reemplazo', sql.VarChar(500), motivo_reemplazo)
        .execute('sp_subir_documento_interno');
    return result.recordset[0];
};

const getDocumentosInternos = async (expediente_id) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .execute('sp_documentos_internos_listar');
    return result.recordset;
};

const getHistorialDocumento = async (documento_id) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('documento_id', sql.Int, documento_id)
        .execute('sp_historial_documento_obtener');
    return result.recordset;
};


const getCronograma = async () => {
    const pool = await getPool();
    const result = await pool.request()
        .execute('sp_cronograma_listar');
    return result.recordset;
};

const programarAudiencia = async (expediente_id, fecha_hora, registrado_por) => {
    const pool = await getPool();
    
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .input('fecha_hora', sql.DateTime, fecha_hora)
        .input('registrado_por', sql.VarChar(100), registrado_por)
        .execute('sp_programar_audiencia');
    
    return result.recordset[0];
};

const registrarResultadoAudiencia = async (
    audiencia_id,
    resultado,
    asistio_c1,
    asistio_c2,
    conyuge1_id,
    conyuge2_id,
    registrado_por,
    fecha_programada) => {
    const pool = await getPool();
    
    let nuevaFechaLimite = null;
    if (resultado === 'INASISTENCIA' && fecha_programada) {
        const fechaAudiencia = new Date(fecha_programada);
        const fechaCalculada = sumarDiasHabiles(fechaAudiencia, 15);
        nuevaFechaLimite = fechaCalculada.toISOString().split('T')[0];

    }
    
    const result = await pool.request()
        .input('audiencia_id', sql.Int, audiencia_id)
        .input('resultado', sql.VarChar(20), resultado)
        .input('asistio_c1', sql.Bit, asistio_c1)
        .input('asistio_c2', sql.Bit, asistio_c2)
        .input('conyuge1_id', sql.Int, conyuge1_id)
        .input('conyuge2_id', sql.Int, conyuge2_id)
        .input('registrado_por', sql.VarChar(100), registrado_por)
        .input('nueva_fecha_limite', sql.Date, nuevaFechaLimite)
        .execute('sp_registrar_resultado_audiencia');
    
    return result.recordset[0];
};

const corregirAsistencia = async (asistencia_id, nuevo_valor, registrado_por) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('asistencia_id', sql.Int, asistencia_id)
        .input('nuevo_valor', sql.Bit, nuevo_valor)
        .input('registrado_por', sql.VarChar(100), registrado_por)
        .execute('sp_corregir_asistencia');
    return result.recordset[0];
};

const getAudiencias = async (expediente_id) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .execute('sp_audiencias_listar');
    return result.recordset;
};

const registrarResolucionFundada = async (expediente_id, numero_documento, fecha_elaboracion, ruta_archivo, subido_por) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .input('numero_documento', sql.VarChar(50), numero_documento || null)
        .input('fecha_elaboracion', sql.Date, fecha_elaboracion)
        .input('ruta_archivo', sql.VarChar(500), ruta_archivo)
        .input('subido_por', sql.VarChar(100), subido_por)
        .execute('sp_registrar_resolucion_fundada');
    return result.recordset[0];
};

const getPlazos = async (expediente_id) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .execute('sp_plazos_obtener');
    
    const plazos = result.recordset[0] || null;
    
    if (plazos && plazos.fecha_limite_audiencia) {
        const hoy = new Date();
        const fechaLimite = new Date(plazos.fecha_limite_audiencia);
        const diasRestantesHabiles = diasHabilesEntre(hoy, fechaLimite);
        plazos.dias_restantes_habiles = diasRestantesHabiles;
    }
    
    return plazos;
};

const verificarEsperaDisolucion = async (expediente_id, usuario) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .input('usuario', sql.VarChar(100), usuario)
        .execute('sp_verificar_espera_disolucion');
    return result.recordset[0];
};


const getHistorialExpediente = async (expediente_id) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .execute('sp_historial_expediente_listar');
    return result.recordset;
};

const reemplazarDocumentoCiudadano = async (documento_id, nueva_ruta, reemplazado_por) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('documento_id', sql.Int, documento_id)
        .input('nueva_ruta', sql.VarChar(500), nueva_ruta)
        .input('reemplazado_por', sql.VarChar(100), reemplazado_por)
        .execute('sp_reemplazar_documento_ciudadano');
    return result.recordset[0];
};

const obtenerUltimoCorrelativo = async (tipoDocumento) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('tipo_documento', sql.VarChar(50), tipoDocumento)
        .execute('sp_obtener_ultimo_correlativo'); 
    return result.recordset[0]?.ultimo_correlativo || 0;
};

const verificarUnicidadNumeroDocumento = async (tipoDocumento, numeroDocumento) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('tipo_documento', sql.VarChar(50), tipoDocumento)
        .input('numero_documento', sql.VarChar(255), numeroDocumento)
        .execute('sp_verificar_unicidad_numero_documento');
    return result.recordset[0]?.existe === 1;
};

const verificarUnicidadCorrelativo = async (tipoDocumento, correlativo, anio, dependencia) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('tipo_documento', sql.VarChar(50), tipoDocumento)
        .input('correlativo', sql.Int, correlativo)
        .input('anio', sql.Int, anio)
        .input('dependencia', sql.VarChar(50), dependencia)
        .execute('sp_verificar_unicidad_correlativo');
    return result.recordset[0]?.existe === 1;
};

const getHistorialGlobal = async (pre_solicitud_id, expediente_id) => {
    const pool = await getPool();
    const request = pool.request();
    if (pre_solicitud_id) request.input('pre_solicitud_id', sql.Int, pre_solicitud_id);
    if (expediente_id)    request.input('expediente_id', sql.Int, expediente_id);
    const result = await request.execute('sp_historial_global');
    return result.recordset;
};
const getHistorialTarjetas = async (filtros = {}) => {
    const { codigo, solicitante, demandado, etapa, fecha_desde, fecha_hasta, pagina, por_pagina } = filtros;
    const pool = await getPool();
    const request = pool.request();
    if (codigo)      request.input('codigo', sql.VarChar(20), codigo);
    if (solicitante) request.input('solicitante', sql.VarChar(150), solicitante);
    if (demandado)   request.input('demandado', sql.VarChar(150), demandado);
    if (etapa)       request.input('etapa', sql.VarChar(30), etapa);
    if (fecha_desde) request.input('fecha_desde', sql.DateTime, fecha_desde);
    if (fecha_hasta) request.input('fecha_hasta', sql.DateTime, fecha_hasta);
    request.input('pagina', sql.Int, pagina || 1);
    request.input('por_pagina', sql.Int, por_pagina || 20);
 
    const result = await request.execute('sp_historial_listado_tarjetas');
    return result.recordset;
};

module.exports = {   
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
    getHistorialGlobal,
    obtenerUltimoCorrelativo,
    verificarUnicidadNumeroDocumento,
    verificarUnicidadCorrelativo
};