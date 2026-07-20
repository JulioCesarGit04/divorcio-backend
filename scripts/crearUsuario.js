const bcrypt = require('bcrypt');
const { getPool, sql } = require('../src/config/db');

async function crearUsuarios() {
  const pool = await getPool();

  const usuarios = [
    {
      nombre: 'Admin Municipal',
      correo: 'admin@municipalidad.gob.pe',
      password: 'Admin123',
      rol: 'ADMINISTRADOR',
    },
    {
      nombre: 'Asistente Legal',
      correo: 'asistente@municipalidad.gob.pe',
      password: 'Asistente123',
      rol: 'ASISTENTE',
    },
  ];

  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.request()
      .input('nombre',   sql.VarChar, u.nombre)
      .input('correo',   sql.VarChar, u.correo)
      .input('password', sql.VarChar, hash)
      .input('rol',      sql.VarChar, u.rol)
      .query(`
        INSERT INTO usuarios (nombre, correo, password, rol)
        VALUES (@nombre, @correo, @password, @rol)
      `);
    console.log(` Usuario creado: ${u.correo} / ${u.password}`);
  }

  process.exit(0);
}

crearUsuarios().catch((err) => {
  console.error(' Error:', err.message);
  process.exit(1);
});