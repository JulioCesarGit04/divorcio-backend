// controllers/modulo4Controller.js
const service = require('../services/modulo4Service');

const registrarSegundoPago = async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha_pago } = req.body;
        if (!fecha_pago) {
            return res.status(400).json({ ok: false, mensaje: 'La fecha de pago es requerida' });
        }
        const result = await service.registrarSegundoPago(id, fecha_pago);
        res.json({ ok: true, data: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const registrarPagoCopias = async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha_pago_copias } = req.body;
        if (!fecha_pago_copias) {
            return res.status(400).json({ ok: false, mensaje: 'La fecha de pago de copias es requerida' });
        }
        const result = await service.registrarPagoCopias(id, fecha_pago_copias);
        res.json({ ok: true, data: result });
    } catch (err) {
        console.error('❌ Error en registrarPagoCopias:', err.message);
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const subirResolucionDisolucion = async (req, res) => {
    try {
        const { id } = req.params;
        const { numero_documento, fecha_elaboracion } = req.body;
        const usuario = req.session?.usuario?.nombre || 'Sistema';
        const archivo = req.file;

        if (!archivo) {
            return res.status(400).json({ ok: false, mensaje: 'Debe seleccionar un archivo PDF' });
        }
        if (!fecha_elaboracion) {
            return res.status(400).json({ ok: false, mensaje: 'La fecha de elaboración es requerida' });
        }

        const ruta_archivo = `/uploads/${archivo.filename}`;
        const result = await service.subirResolucionDisolucion(
            id,
            numero_documento || null,
            fecha_elaboracion,
            ruta_archivo,
            usuario
        );

        if (result && result.resultado === 'ERROR') {
            return res.status(400).json({ ok: false, mensaje: result.mensaje || 'Error al subir la resolución' });
        }

        res.json({
            ok: true,
            data: result,
            numero_generado: result?.numero_generado || null,
            mensaje: result?.mensaje || 'Resolución subida correctamente'
        });
    } catch (err) {
        console.error('❌ Error en subirResolucionDisolucion:', err.message);
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const avanzarArchivamiento = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;
        const usuario = req.session?.usuario?.nombre || 'Sistema';

        if (!motivo) {
            return res.status(400).json({ ok: false, mensaje: 'El motivo es requerido para avanzar' });
        }

        const result = await service.avanzarArchivamiento(id, motivo, usuario);
        res.json({ ok: true, data: result });
    } catch (err) {
        console.error('❌ Error en avanzarArchivamiento:', err.message);
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const registrarCargosExternos = async (req, res) => {
    try {
        const { id } = req.params;
        const files = req.files;
        const sunarp = files?.sunarp?.[0];
        const reniec = files?.reniec?.[0];
        const recibido_por = req.session?.usuario?.nombre || 'Sistema';
        const { observaciones } = req.body;

        console.log(' Archivos recibidos:', { sunarp: sunarp?.filename, reniec: reniec?.filename });

        if (!sunarp || !reniec) {
            return res.status(400).json({ ok: false, mensaje: 'Debe subir ambos archivos (SUNARP y RENIEC)' });
        }

        const ruta_sunarp = `/uploads/${sunarp.filename}`;
        const ruta_reniec = `/uploads/${reniec.filename}`;

        const result = await service.registrarCargosExternos(id, ruta_sunarp, ruta_reniec, recibido_por, observaciones);

        if (result && result.resultado === 'ERROR') {
            console.error(' SP devolvió ERROR:', result.mensaje);
            return res.status(500).json({ ok: false, mensaje: result.mensaje || 'Error del procedimiento almacenado' });
        }

        res.json({ ok: true, data: result, mensaje: 'Cargos registrados correctamente' });
    } catch (err) {
        console.error(' Error en registrarCargosExternos:', err.message);
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const getArchivamientoData = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await service.getArchivamientoData(id);
        if (!data) {
            return res.status(404).json({ ok: false, mensaje: 'Expediente no encontrado' });
        }
        res.json({ ok: true, data });
    } catch (err) {
        console.error(' Error en getArchivamientoData:', err.message);
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const getNextNumber = async (req, res) => {
    try {
        const numero = await service.obtenerSiguienteNumeroDisolucion();
        if (!numero) {
            const year = new Date().getFullYear();
            return res.json({ ok: true, numero: `001-${year}-MDEP` });
        }
        res.json({ ok: true, numero });
    } catch (err) {
        console.error(' Error en getNextNumber:', err.message);
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

module.exports = {
    registrarSegundoPago,
    registrarPagoCopias,
    subirResolucionDisolucion,
    avanzarArchivamiento,
    registrarCargosExternos,
    getArchivamientoData,
    getNextNumber
};