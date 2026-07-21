const service = require('../services/dashboardService');
const getResumen = async (req, res) => {
    try {
        const { etapa, fecha_desde, fecha_hasta, top } = req.query;
        const data = await service.getResumenDashboard({ etapa, fecha_desde, fecha_hasta, top });
        res.json({ ok: true, data });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: 'Error al obtener el resumen del dashboard', error: error.message });
    }
};

const getDashboardCompleto = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;

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

        const data = {
            tiempoPromedioEnvio: Array.isArray(tiempoPromedioEnvio) ? tiempoPromedioEnvio : [tiempoPromedioEnvio],
            audienciasPlazo: Array.isArray(audienciasPlazo) ? audienciasPlazo : [audienciasPlazo],
            disolucionPlazo: Array.isArray(disolucionPlazo) ? disolucionPlazo : [disolucionPlazo],
            expedientesObservaciones: Array.isArray(expedientesObservaciones) ? expedientesObservaciones : [expedientesObservaciones],
            documentosSubsanados: Array.isArray(documentosSubsanados) ? documentosSubsanados : [documentosSubsanados]
        };

        res.json({ ok: true, data });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: 'Error al obtener el dashboard completo', error: error.message });
    }
};

const getTiempoPromedioEnvio = async (req, res) => {
    try {
        const data = await service.getTiempoPromedioEnvio();
        res.json({ ok: true, data });
    } catch (error) {
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