function requireAuth(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ ok: false, mensaje: 'No autorizado. Inicia sesión.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ ok: false, mensaje: 'No autorizado.' });
  }
  if (req.session.usuario.rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ ok: false, mensaje: 'Acceso restringido a administradores.' });
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ ok: false, mensaje: 'No autorizado. Inicia sesión.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ ok: false, mensaje: 'No autorizado.' });
  }
  if (req.session.usuario.rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ ok: false, mensaje: 'Acceso restringido a administradores.' });
  }
  next();
}

// ⚠️ AJUSTAR: reemplaza 'req.session.ciudadano' por el nombre real
// que usa tu ciudadanoAuthController al loguear (ej: req.session.ciudadano = {...})
function requireAuthCiudadano(req, res, next) {
  if (!req.session || !req.session.ciudadano) {
    return res.status(401).json({ ok: false, mensaje: 'No autorizado. Inicia sesión.' });
  }
  // Normalizamos a req.user para no tocar el resto del controlador
  req.user = { id_usuario: req.session.ciudadano.id };
  next();
}

module.exports = { requireAuth, requireAdmin, requireAuthCiudadano };