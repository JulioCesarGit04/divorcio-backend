const service = require('../services/expedienteService');

async function listar(req, res) {
  try {
    const data = await service.listar();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
}

async function detalle(req, res) {
  try {
    const data = await service.detalle(Number(req.params.id));
    if (!data) return res.status(404).json({ ok: false, mensaje: 'Expediente no encontrado.' });
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
}

async function crear(req, res) {
  try {
    const { preSolicitudId, numeroExpediente, numeroMesaPartes, fechaPago } = req.body;
    if (!preSolicitudId || !numeroExpediente || !numeroMesaPartes) {
      return res.status(400).json({ ok: false, mensaje: 'Faltan campos obligatorios.' });
    }
    const result = await service.crear({
      preSolicitudId: Number(preSolicitudId),
      numeroExpediente,
      numeroMesaPartes,
      fechaPago,
      usuarioNombre: req.session.usuario.nombre,
    });
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ ok: false, mensaje: err.message });
  }
}

async function cambiarEtapa(req, res) {
  try {
    const { etapaNueva, estadoNuevo, comentario } = req.body;
    if (!etapaNueva) {
      return res.status(400).json({ ok: false, mensaje: 'La etapa es obligatoria.' });
    }
    await service.cambiarEtapa({
      id:          Number(req.params.id),
      etapaNueva,
      estadoNuevo,
      comentario,
      usuarioId:   req.session.usuario.id,
    });
    res.json({ ok: true, mensaje: 'Etapa actualizada correctamente.' });
  } catch (err) {
    res.status(400).json({ ok: false, mensaje: err.message });
  }
}

module.exports = { listar, detalle, crear, cambiarEtapa };