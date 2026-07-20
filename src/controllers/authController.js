const { login } = require('../services/authService');

async function iniciarSesion(req, res) {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Correo y contraseña son obligatorios.' });
    }

    const usuario = await login(correo, password);

    req.session.usuario = {
      id:     usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol:    usuario.rol,
    };

    return res.json({ ok: true, usuario: req.session.usuario });

  } catch (err) {
    return res.status(401).json({ ok: false, mensaje: err.message });
  }
}

async function cerrarSesion(req, res) {
  req.session.destroy(() => {
    res.json({ ok: true, mensaje: 'Sesión cerrada.' });
  });
}

async function obtenerSesion(req, res) {
  if (req.session.usuario) {
    return res.json({ ok: true, usuario: req.session.usuario });
  }
  return res.status(401).json({ ok: false, mensaje: 'Sin sesión activa.' });
}

module.exports = { iniciarSesion, cerrarSesion, obtenerSesion };