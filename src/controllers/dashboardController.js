const service = require('../services/dashboardService');

/**
 * GET /api/dashboard/resumen
 * Retorna datos para gráficos y tablas (sp_dashboard_resumen)
 */
const getResumen = async (req, res) => {
    try {
        const { etapa, fecha_desde, fecha_hasta, top } = req.query;
        const data = await service.getResumenDashboard({ etapa, fecha_desde, fecha_hasta, top });
        res.json({ ok: true, data });
    } catch (error) {
        console.error('Error en getResumen:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al obtener el resumen del dashboard', error: error.message });
    }
};

/**
 * GET /api/dashboard/completo
 * Retorna los 5 KPIs en un solo objeto
 * Espera query params: fecha_desde, fecha_hasta (opcionales)
 */
const getDashboardCompleto = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;

        // Ejecutar los 5 KPIs en paralelo
        const [
            tiempoPromedioEnvio,
            audienciasPlazo,
            disolucionPlazo,
            expedientesObservaciones,
            documentosSubsanados
        ] = await Promise.all([
            service.getTiempoPromedioEnvio(),
            service.getAudienciasDentroPlazo(fecha_desde, fecha_hasta),
            service.getDisolucionEnPlazo(fecha_desde, fecha_hasta),
            service.getExpedientesConObservaciones(fecha_desde, fecha_hasta),
            service.getDocumentosSubsanadosPlazo(fecha_desde, fecha_hasta)
        ]);

        // Asegurar que cada KPI sea un array (el frontend espera arrays)
        const data = {
            tiempoPromedioEnvio: Array.isArray(tiempoPromedioEnvio) ? tiempoPromedioEnvio : [tiempoPromedioEnvio],
            audienciasPlazo: Array.isArray(audienciasPlazo) ? audienciasPlazo : [audienciasPlazo],
            disolucionPlazo: Array.isArray(disolucionPlazo) ? disolucionPlazo : [disolucionPlazo],
            expedientesObservaciones: Array.isArray(expedientesObservaciones) ? expedientesObservaciones : [expedientesObservaciones],
            documentosSubsanados: Array.isArray(documentosSubsanados) ? documentosSubsanados : [documentosSubsanados]
        };

        res.json({ ok: true, data });
    } catch (error) {
        console.error('Error en getDashboardCompleto:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al obtener el dashboard completo', error: error.message });
    }
};

/**
 * Métodos individuales (opcionales, por si se necesitan)
 */
const getTiempoPromedioEnvio = async (req, res) => {
    try {
        const data = await service.getTiempoPromedioEnvio();
        res.json({ ok: true, data });
    } catch (error) {
        console.error('Error en getTiempoPromedioEnvio:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al obtener tiempo promedio de envío', error: error.message });
    }
};

const getAudienciasDentroPlazo = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;
        const data = await service.getAudienciasDentroPlazo(fecha_desde, fecha_hasta);
        res.json({ ok: true, data });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: 'Error al obtener audiencias dentro de plazo', error: error.message });
    }
};

const getDisolucionEnPlazo = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;
        const data = await service.getDisolucionEnPlazo(fecha_desde, fecha_hasta);
        res.json({ ok: true, data });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: 'Error al obtener disolución en plazo', error: error.message });
    }
};

const getExpedientesConObservaciones = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;
        const data = await service.getExpedientesConObservaciones(fecha_desde, fecha_hasta);
        res.json({ ok: true, data });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: 'Error al obtener expedientes con observaciones', error: error.message });
    }
};

const getDocumentosSubsanadosPlazo = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;
        const data = await service.getDocumentosSubsanadosPlazo(fecha_desde, fecha_hasta);
        res.json({ ok: true, data });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: 'Error al obtener documentos subsanados en plazo', error: error.message });
    }
};

module.exports = {
    getResumen,
    getDashboardCompleto,
    getTiempoPromedioEnvio,
    getAudienciasDentroPlazo,
    getDisolucionEnPlazo,
    getExpedientesConObservaciones,
    getDocumentosSubsanadosPlazo
};