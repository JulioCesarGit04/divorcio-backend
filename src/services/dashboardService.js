const { getPool, sql } = require('../config/db');
const getTiempoPromedioEnvio = async () => {
    const pool = await getPool();
    const result = await pool.request().execute('sp_KPI_TiempoPromedioEnvioSolicitudes');
    return result.recordsets[0] || [];
};

const getAudienciasDentroPlazo = async (fechaDesde, fechaHasta) => {
    const pool = await getPool();
    const request = pool.request();
    if (fechaDesde) request.input('fecha_desde', sql.Date, fechaDesde);
    if (fechaHasta) request.input('fecha_hasta', sql.Date, fechaHasta);
    const result = await request.execute('sp_KPI_AudienciasDentroPlazo');
    return result.recordsets[0] || [];
};
const getDisolucionEnPlazo = async (fechaDesde, fechaHasta) => {
    const pool = await getPool();
    const request = pool.request();
    if (fechaDesde) request.input('fecha_desde', sql.Date, fechaDesde);
    if (fechaHasta) request.input('fecha_hasta', sql.Date, fechaHasta);
    const result = await request.execute('sp_KPI_DisolucionEnPlazo');
    return result.recordsets[0] || [];
};

const getExpedientesConObservaciones = async (fechaDesde, fechaHasta) => {
    const pool = await getPool();
    const request = pool.request();
    if (fechaDesde) request.input('fecha_desde', sql.Date, fechaDesde);
    if (fechaHasta) request.input('fecha_hasta', sql.Date, fechaHasta);
    const result = await request.execute('sp_KPI_ExpedientesConObservaciones');
    return result.recordsets[0] || [];
};

const getDocumentosSubsanadosPlazo = async (fechaDesde, fechaHasta) => {
    const pool = await getPool();
    const request = pool.request();
    if (fechaDesde) request.input('fecha_desde', sql.Date, fechaDesde);
    if (fechaHasta) request.input('fecha_hasta', sql.Date, fechaHasta);
    const result = await request.execute('sp_KPI_DocumentosSubsanadosPlazo');
    return result.recordsets[0] || [];
};

const getResumenDashboard = async (filtros = {}) => {
    const { etapa, fecha_desde, fecha_hasta, top } = filtros;
    const pool = await getPool();
    const request = pool.request();

    if (etapa) request.input('etapa', sql.VarChar(30), etapa);
    if (fecha_desde) request.input('fecha_desde', sql.Date, fecha_desde);
    if (fecha_hasta) request.input('fecha_hasta', sql.Date, fecha_hasta);
    if (top) request.input('top', sql.Int, parseInt(top) || 5);

    const result = await request.execute('sp_dashboard_resumen');

    const [
        resumen,
        proximasAudiencias,
        inactivos,
        docsObservados,
        distribucionMensual,
        topFuncionarios,
        distribucionEtapas
    ] = result.recordsets;

    return {
        resumen: resumen[0] || {},
        proximasAudiencias: proximasAudiencias || [],
        inactivos: inactivos || [],
        docsObservados: docsObservados || [],
        distribucionMensual: distribucionMensual || [],
        topFuncionarios: topFuncionarios || [],
        distribucionEtapas: distribucionEtapas || []
    };
};

module.exports = {
    getTiempoPromedioEnvio,
    getAudienciasDentroPlazo,
    getDisolucionEnPlazo,
    getExpedientesConObservaciones,
    getDocumentosSubsanadosPlazo,
    getResumenDashboard
};