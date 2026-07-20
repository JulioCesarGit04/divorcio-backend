const { getPool, sql } = require('../config/db');

const registrarSegundoPago = async (expediente_id, fecha_pago) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .input('fecha_pago', sql.Date, fecha_pago)
        .execute('sp_registrar_segundo_pago');
    return result.recordset[0];
};

const registrarPagoCopias = async (expediente_id, fecha_pago_copias) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .input('fecha_pago', sql.Date, fecha_pago_copias)
        .execute('sp_registrar_pago_copias');
    return result.recordset[0];
};

const subirResolucionDisolucion = async (expediente_id, numero_documento, fecha_elaboracion, ruta_archivo, subido_por) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .input('numero_documento', sql.VarChar(50), numero_documento || null)
        .input('fecha_elaboracion', sql.Date, fecha_elaboracion)
        .input('ruta_archivo', sql.VarChar(500), ruta_archivo)
        .input('subido_por', sql.VarChar(100), subido_por)
        .execute('sp_subir_resolucion_disolucion');
    return result.recordset[0];
};

const avanzarArchivamiento = async (expediente_id, motivo) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .input('motivo', sql.VarChar(300), motivo || null)
        .execute('sp_avanzar_archivamiento');
    return result.recordset[0];
};

const registrarCargosExternos = async (expediente_id, ruta_sunarp, ruta_reniec, recibido_por, observaciones) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .input('ruta_sunarp', sql.VarChar(500), ruta_sunarp)
        .input('ruta_reniec', sql.VarChar(500), ruta_reniec)
        .input('recibido_por', sql.VarChar(100), recibido_por)
        .input('observaciones', sql.VarChar(500), observaciones || null)
        .execute('sp_registrar_cargos_finalizar');
    return result.recordset[0];
};

const getArchivamientoData = async (expediente_id) => {
    const pool = await getPool();
    const result = await pool.request()
        .input('expediente_id', sql.Int, expediente_id)
        .execute('sp_get_archivamiento_data');
    return result.recordset[0] || null;
};

const obtenerSiguienteNumeroDisolucion = async () => {
    const pool = await getPool();
    const result = await pool.request()
        .execute('sp_siguiente_numero_disolucion');
    return result.recordset[0]?.siguiente_numero || null;
};

module.exports = {
    registrarSegundoPago,
    registrarPagoCopias,
    subirResolucionDisolucion,
    avanzarArchivamiento,
    registrarCargosExternos,
    getArchivamientoData,
    obtenerSiguienteNumeroDisolucion
};