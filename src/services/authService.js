const bcrypt = require('bcrypt');
const { getPool, sql } = require('../config/db');

async function login(correo, password) {
  const pool = await getPool();

  const result = await pool.request()
    .input('correo', sql.VarChar, correo)
    .query(`
      SELECT id, nombre, correo, password, rol, activo
      FROM usuarios
      WHERE correo = @correo
    `);

  if (result.recordset.length === 0) {
    throw new Error('Credenciales incorrectas.');
  }

  const usuario = result.recordset[0];

  if (!usuario.activo) {
    throw new Error('Usuario inactivo. Contacte al administrador.');
  }

  const passwordValido = await bcrypt.compare(password, usuario.password);
  if (!passwordValido) {
    throw new Error('Credenciales incorrectas.');
  }

  // No devolver el hash
  delete usuario.password;
  return usuario;
}

module.exports = { login };