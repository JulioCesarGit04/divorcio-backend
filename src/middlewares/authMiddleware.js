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

function requireAuthCiudadano(req, res, next) {
  if (!req.session || !req.session.ciudadano) {
    return res.status(401).json({ ok: false, mensaje: 'No autorizado. Inicia sesión.' });
  }
  req.user = { id_usuario: req.session.ciudadano.id };
  next();
}

module.exports = { requireAuth, requireAdmin, requireAuthCiudadano };