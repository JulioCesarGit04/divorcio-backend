const service = require('../services/ciudadanoAuthService');

async function registrar(req, res) {
  try {
    const { nombres, apellidos, dni, sexo, telefono, correo, password, repetirPassword } = req.body;

    if (!nombres || !apellidos || !dni || !sexo || !correo || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Todos los campos obligatorios deben completarse.' });
    }
    if (!/^\d{8}$/.test(dni)) {
      return res.status(400).json({ ok: false, mensaje: 'El DNI debe tener 8 dígitos.' });
    }
    if (password !== repetirPassword) {
      return res.status(400).json({ ok: false, mensaje: 'Las contraseñas no coinciden.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok: false, mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    await service.registrar({ nombres, apellidos, dni, sexo, telefono, correo, password });
    res.status(201).json({ ok: true, mensaje: 'Registro exitoso. Revisa tu correo para verificar tu cuenta.' });
  } catch (err) {
    res.status(400).json({ ok: false, mensaje: err.message });
  }
}

async function verificarCodigo(req, res) {
  try {
    const { correo, codigo } = req.body;
    await service.verificarCodigo({ correo, codigo });
    res.json({ ok: true, mensaje: 'Cuenta verificada exitosamente. Ya puedes iniciar sesión.' });
  } catch (err) {
    res.status(400).json({ ok: false, mensaje: err.message });
  }
}

async function login(req, res) {
  try {
    const { correo, password } = req.body;
    const ciudadano = await service.login({ correo, password });
    req.session.ciudadano = ciudadano;
    res.json({ ok: true, ciudadano });
  } catch (err) {
    res.status(401).json({ ok: false, mensaje: err.message });
  }
}

async function logout(req, res) {
  req.session.destroy(() => res.json({ ok: true, mensaje: 'Sesión cerrada.' }));
}

async function sesion(req, res) {
  if (req.session.ciudadano) return res.json({ ok: true, ciudadano: req.session.ciudadano });
  res.status(401).json({ ok: false, mensaje: 'Sin sesión activa.' });
}

async function solicitarRecuperacion(req, res) {
  try {
    const { correo } = req.body;
    await service.solicitarRecuperacion({ correo });
    res.json({ ok: true, mensaje: 'Código de recuperación enviado a tu correo.' });
  } catch (err) {
    res.status(400).json({ ok: false, mensaje: err.message });
  }
}

async function restablecerPassword(req, res) {
  try {
    const { correo, token, nuevaPassword, repetirPassword } = req.body;
    if (nuevaPassword !== repetirPassword) {
      return res.status(400).json({ ok: false, mensaje: 'Las contraseñas no coinciden.' });
    }
    await service.restablecerPassword({ correo, token, nuevaPassword });
    res.json({ ok: true, mensaje: 'Contraseña restablecida exitosamente.' });
  } catch (err) {
    res.status(400).json({ ok: false, mensaje: err.message });
  }
}

module.exports = { registrar, verificarCodigo, login, logout, sesion, solicitarRecuperacion, restablecerPassword };