const { getPool, sql } = require('../config/db');
const bcrypt = require('bcrypt');

const UsuariosService = {

    // ─── Listar usuarios ──────────────────────────────────────────────
    async listar(filtros = {}) {
        const pool = await getPool();
        const { nombre, correo, rol, activo } = filtros;

        const result = await pool.request()
            .input('nombre', sql.VarChar, nombre || null)
            .input('correo', sql.VarChar, correo || null)
            .input('rol', sql.VarChar, rol || null)
            .input('activo', sql.Bit, activo !== undefined ? activo : null)
            .execute('sp_usuarios_listar');

        return result.recordset;
    },

    // ─── Obtener un usuario por ID ────────────────────────────────────
    async obtenerPorId(id) {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .execute('sp_usuario_obtener');

        return result.recordset[0] || null;
    },

    // ─── Crear usuario ──────────────────────────────────────────────────
    async crear(datos) {
        const { nombre, correo, password, rol, usuario_creador } = datos;
        const pool = await getPool();

        // Hashear contraseña
        const hash = await bcrypt.hash(password, 10);

        const result = await pool.request()
            .input('nombre', sql.VarChar, nombre)
            .input('correo', sql.VarChar, correo)
            .input('password', sql.VarChar, hash)
            .input('rol', sql.VarChar, rol)
            .input('usuario_creador', sql.VarChar, usuario_creador || null)
            .execute('sp_usuario_crear');

        return result.recordset[0];
    },

    // ─── Actualizar usuario (sin password) ────────────────────────────
    async actualizar(id, datos) {
        const { nombre, correo, rol } = datos;
        const pool = await getPool();

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar, nombre)
            .input('correo', sql.VarChar, correo)
            .input('rol', sql.VarChar, rol)
            .execute('sp_usuario_actualizar');

        return result.recordset[0];
    },

    // ─── Cambiar estado (habilitar/deshabilitar) ──────────────────────
    async cambiarEstado(id, activo) {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('activo', sql.Bit, activo)
            .execute('sp_usuario_cambiar_estado');

        return result.recordset[0];
    },

    // ─── Cambiar contraseña ────────────────────────────────────────────
    async cambiarPassword(id, nuevaPassword) {
        const pool = await getPool();
        const hash = await bcrypt.hash(nuevaPassword, 10);

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('nuevo_hash', sql.VarChar, hash)
            .execute('sp_usuario_cambiar_password');

        return result.recordset[0];
    }
};

module.exports = UsuariosService;