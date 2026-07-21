const { listarPreSolicitudes, obtenerDetalle, evaluarDocumentos } = require('../services/revisionService');

async function listar(req, res) {
  try {
    const lista = await listarPreSolicitudes();
    res.json({ ok: true, data: lista });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener la lista.' });
  }
}

async function detalle(req, res) {
  try {
    const { id } = req.params;
    const data = await obtenerDetalle(Number(id));
    if (!data) return res.status(404).json({ ok: false, mensaje: 'Pre-solicitud no encontrada.' });
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener el detalle.' });
  }
}

async function evaluar(req, res) {
  try {
    const { id }         = req.params;
    const { evaluaciones } = req.body;
    const usuarioId      = req.session.usuario.id;

    if (!evaluaciones || evaluaciones.length === 0) {
      return res.status(400).json({ ok: false, mensaje: 'Debes evaluar al menos un documento.' });
    }

    const observadoSinMensaje = evaluaciones.find(
      (e) => e.estado === 'OBSERVADO' && (!e.observacion || !e.observacion.trim())
    );
    if (observadoSinMensaje) {
      return res.status(400).json({ ok: false, mensaje: 'Todos los documentos observados deben tener una observación.' });
    }

    const { nuevoEstado } = await evaluarDocumentos({
      preSolicitudId: Number(id),
      evaluaciones,
      usuarioId,
    });

    res.json({ ok: true, mensaje: `Pre-solicitud marcada como ${nuevoEstado}.`, nuevoEstado });
  } catch (err) {
    console.error(err);
    res.status(400).json({ ok: false, mensaje: err.message });
  }
}

module.exports = { listar, detalle, evaluar };