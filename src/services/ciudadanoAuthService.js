const bcrypt = require('bcrypt');
const { getPool, sql } = require('../config/db');
const { enviarCorreo } = require('../config/mailer');

function generarCodigo() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function registrar({ nombres, apellidos, dni, sexo, telefono, correo, password }) {
  const pool = await getPool();

  const existe = await pool.request()
    .input('correo', sql.VarChar, correo)
    .input('dni', sql.VarChar, dni)
    .query(`
      SELECT id FROM ciudadanos
      WHERE correo = @correo OR dni = @dni
    `);

  if (existe.recordset.length > 0) {
    throw new Error('Ya existe una cuenta con ese correo o DNI.');
  }

  const hash   = await bcrypt.hash(password, 10);
  const codigo = generarCodigo();
  const expira = new Date(Date.now() + 15 * 60 * 1000); 

  await pool.request()
    .input('nombres',             sql.VarChar,  nombres)
    .input('apellidos',           sql.VarChar,  apellidos)
    .input('dni',                 sql.VarChar,  dni)
    .input('sexo',                sql.VarChar,  sexo)
    .input('telefono',            sql.VarChar,  telefono || null)
    .input('correo',              sql.VarChar,  correo)
    .input('password',            sql.VarChar,  hash)
    .input('codigo_verificacion', sql.VarChar,  codigo)
    .input('codigo_expira_en',    sql.DateTime, expira)
    .query(`
      INSERT INTO ciudadanos
        (nombres, apellidos, dni, sexo, telefono, correo, password, codigo_verificacion, codigo_expira_en)
      VALUES
        (@nombres, @apellidos, @dni, @sexo, @telefono, @correo, @password, @codigo_verificacion, @codigo_expira_en)
    `);

  await enviarCorreo({
  destinatario: correo,
  asunto: 'Verifica tu cuenta — Municipalidad distrital de El Porvenir',
  html: `
    <div style="
      font-family: Arial, Helvetica, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
    ">

      <!-- Cabecera -->
      <div style="
        background: #1a3a6b;
        padding: 30px 20px;
        text-align: center;
        border-radius: 12px 12px 0 0;
      ">

        <div style="
          width: 110px;
          height: 110px;
          background: #ffffff;
          border-radius: 50%;
          margin: 0 auto 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.18);
        ">

          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Escudo_de_el_porvenir.svg"
            alt="Municipalidad El Porvenir"
            style="
              width: 95px;
              margin: 6px;
              height: 95px;
              object-fit: contain;
              transform: translateY(8px);
            "
          >

        </div>

        <h2 style="
          color: #ffffff;
          margin: 0;
          font-size: 24px;
        ">
          Municipalidad Distrital<br>
          de El Porvenir
        </h2>

        <p style="
          color: #c9a84c;
          margin: 10px 0 0;
          font-size: 14px;
          font-weight: bold;
        ">
          Sistema de trámites de divorcio municipal
        </p>

      </div>


      <!-- Contenido -->
      <div style="
        padding: 35px 30px;
        border: 1px solid #dde2ec;
        border-top: none;
        border-radius: 0 0 12px 12px;
      ">


        <h2 style="
          color: #1a3a6b;
          margin-top: 0;
        ">
          ¡Bienvenido, ${nombres}!
        </h2>


        <p style="
          color: #4a5568;
          font-size: 15px;
          line-height: 1.6;
        ">
          Gracias por registrarte en el sistema digital de trámites de divorcio de la
          <strong>Municipalidad Distrital de El Porvenir</strong>.
        </p>


        <p style="
          color: #4a5568;
          font-size: 15px;
          line-height: 1.6;
        ">
          Para completar la activación de tu cuenta, ingresa el siguiente
          código de verificación:
        </p>


        <!-- Código -->
        <div style="
          background: #f4f7fb;
          border: 2px dashed #c9a84c;
          padding: 25px;
          text-align: center;
          border-radius: 10px;
          margin: 25px 0;
        ">

          <span style="
            color: #1a3a6b;
            font-size: 38px;
            font-weight: 800;
            letter-spacing: 10px;
          ">
            ${codigo}
          </span>

        </div>


        <p style="
          color: #4a5568;
          font-size: 14px;
          text-align: center;
        ">
          Este código expira en 
          <strong>15 minutos</strong>.
        </p>


        <!-- Advertencia -->
        <div style="
          background: #fff8e6;
          border-left: 5px solid #c9a84c;
          padding: 15px;
          margin-top: 25px;
          border-radius: 6px;
        ">

          <p style="
            color: #6b5a18;
            font-size: 13px;
            margin: 0;
          ">
            Si no solicitaste este código, puedes ignorar este mensaje.
            Y si lo solicitaste, por seguridad no compartas este código con nadie.
          </p>

        </div>


        <hr style="
          border: none;
          border-top: 1px solid #dde2ec;
          margin: 30px 0;
        ">


        <p style="
          color: #718096;
          font-size: 12px;
          text-align: center;
          margin-bottom: 0;
        ">
          Este es un mensaje automático generado por el sistema.
          <br>
          Municipalidad Distrital de El Porvenir © ${new Date().getFullYear()}
        </p>


      </div>

    </div>
  `,
});
}

async function verificarCodigo({ correo, codigo }) {
  const pool = await getPool();

  const result = await pool.request()
    .input('correo', sql.VarChar, correo)
    .query(`
      SELECT id, codigo_verificacion, codigo_expira_en, verificado
      FROM ciudadanos WHERE correo = @correo
    `);

  if (result.recordset.length === 0) throw new Error('Correo no encontrado.');

  const ciudadano = result.recordset[0];

  if (ciudadano.verificado) throw new Error('La cuenta ya está verificada.');
  if (ciudadano.codigo_verificacion !== codigo) throw new Error('Código incorrecto.');
  if (new Date() > new Date(ciudadano.codigo_expira_en)) throw new Error('El código ha expirado.');

  await pool.request()
    .input('correo', sql.VarChar, correo)
    .query(`
      UPDATE ciudadanos
      SET verificado = 1, codigo_verificacion = NULL, codigo_expira_en = NULL
      WHERE correo = @correo
    `);
}

async function login({ correo, password }) {
  const pool = await getPool();

  const result = await pool.request()
    .input('correo', sql.VarChar, correo)
    .query(`
      SELECT id, nombres, apellidos, dni, sexo, telefono, correo, password, verificado
      FROM ciudadanos WHERE correo = @correo
    `);

  if (result.recordset.length === 0) throw new Error('Credenciales incorrectas.');

  const ciudadano = result.recordset[0];

  if (!ciudadano.verificado) throw new Error('Debes verificar tu correo antes de iniciar sesión.');

  const valido = await bcrypt.compare(password, ciudadano.password);
  if (!valido) throw new Error('Credenciales incorrectas.');

  delete ciudadano.password;
  return ciudadano;
}

async function solicitarRecuperacion({ correo }) {
  const pool = await getPool();

  const result = await pool.request()
    .input('correo', sql.VarChar, correo)
    .query(`SELECT id, nombres FROM ciudadanos WHERE correo = @correo`);

  if (result.recordset.length === 0) throw new Error('No existe una cuenta con ese correo.');

  const { nombres } = result.recordset[0];
  const token  = generarCodigo();
  const expira = new Date(Date.now() + 15 * 60 * 1000);

  await pool.request()
    .input('correo',             sql.VarChar,  correo)
    .input('token',              sql.VarChar,  token)
    .input('expira',             sql.DateTime, expira)
    .query(`
      UPDATE ciudadanos
      SET recuperacion_token = @token, recuperacion_expira = @expira
      WHERE correo = @correo
    `);

  await enviarCorreo({
    destinatario: correo,
    asunto: 'Recuperación de contraseña — Municipalidad El Porvenir',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: #1a3a6b; padding: 20px; text-align: center;">
          <h2 style="color: #c9a84c; margin: 0;">Municipalidad Distrital de El Porvenir</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #dde2ec;">
          <p>Hola <strong>${nombres}</strong>,</p>
          <p>Tu código para restablecer tu contraseña es:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 2rem; font-weight: 800; letter-spacing: 8px; color: #1a3a6b;">
              ${token}
            </span>
          </div>
          <p style="color: #4a5568; font-size: 0.85rem;">Este código expira en <strong>15 minutos</strong>.</p>
        </div>
      </div>
    `,
  });
}

async function restablecerPassword({ correo, token, nuevaPassword }) {
  const pool = await getPool();

  const result = await pool.request()
    .input('correo', sql.VarChar, correo)
    .query(`
      SELECT recuperacion_token, recuperacion_expira
      FROM ciudadanos WHERE correo = @correo
    `);

  if (result.recordset.length === 0) throw new Error('Correo no encontrado.');

  const { recuperacion_token, recuperacion_expira } = result.recordset[0];

  if (recuperacion_token !== token) throw new Error('Código incorrecto.');
  if (new Date() > new Date(recuperacion_expira)) throw new Error('El código ha expirado.');

  const hash = await bcrypt.hash(nuevaPassword, 10);

  await pool.request()
    .input('correo',   sql.VarChar, correo)
    .input('password', sql.VarChar, hash)
    .query(`
      UPDATE ciudadanos
      SET password = @password, recuperacion_token = NULL, recuperacion_expira = NULL
      WHERE correo = @correo
    `);
}

module.exports = { registrar, verificarCodigo, login, solicitarRecuperacion, restablecerPassword };