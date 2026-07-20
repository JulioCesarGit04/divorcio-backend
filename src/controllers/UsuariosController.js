const UsuariosService = require('../services/UsuariosService');
const listar = async (req, res) => {
    try {
        const { nombre, correo, rol, activo } = req.query;
        const usuarios = await UsuariosService.listar({ nombre, correo, rol, activo });
        res.json({ ok: true, data: usuarios });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const obtener = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await UsuariosService.obtenerPorId(id);
        if (!usuario) {
            return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
        }
        res.json({ ok: true, data: usuario });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const crear = async (req, res) => {
    try {
        const { nombre, correo, password, rol } = req.body;
        const usuario_creador = req.session?.usuario?.nombre || 'Sistema';

        if (!nombre || !correo || !password || !rol) {
            return res.status(400).json({ ok: false, mensaje: 'Todos los campos son obligatorios' });
        }

        if (!['ADMINISTRADOR', 'ASISTENTE'].includes(rol)) {
            return res.status(400).json({ ok: false, mensaje: 'Rol no válido' });
        }

        const resultado = await UsuariosService.crear({ nombre, correo, password, rol, usuario_creador });
        if (resultado?.resultado === 'ERROR') {
            return res.status(400).json({ ok: false, mensaje: resultado.mensaje });
        }
        res.status(201).json({ ok: true, mensaje: 'Usuario creado correctamente' });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const actualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, correo, rol } = req.body;

        if (!nombre || !correo || !rol) {
            return res.status(400).json({ ok: false, mensaje: 'Nombre, correo y rol son obligatorios' });
        }

        const resultado = await UsuariosService.actualizar(id, { nombre, correo, rol });
        if (resultado?.resultado === 'ERROR') {
            return res.status(400).json({ ok: false, mensaje: resultado.mensaje });
        }
        res.json({ ok: true, mensaje: 'Usuario actualizado correctamente' });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        if (activo === undefined || typeof activo !== 'boolean') {
            return res.status(400).json({ ok: false, mensaje: 'El campo "activo" debe ser booleano' });
        }

        if (req.session?.usuario?.id === parseInt(id)) {
            return res.status(403).json({ ok: false, mensaje: 'No puedes deshabilitar tu propia cuenta' });
        }

        const resultado = await UsuariosService.cambiarEstado(id, activo);
        if (resultado?.resultado === 'ERROR') {
            return res.status(400).json({ ok: false, mensaje: resultado.mensaje });
        }
        res.json({ ok: true, mensaje: resultado.mensaje });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

const cambiarPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevaPassword } = req.body;

        if (!nuevaPassword || nuevaPassword.length < 6) {
            return res.status(400).json({ ok: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const resultado = await UsuariosService.cambiarPassword(id, nuevaPassword);
        if (resultado?.resultado === 'ERROR') {
            return res.status(400).json({ ok: false, mensaje: resultado.mensaje });
        }
        res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' });
    } catch (err) {
        res.status(500).json({ ok: false, mensaje: err.message });
    }
};

module.exports = {
    listar,
    obtener,
    crear,
    actualizar,
    cambiarEstado,
    cambiarPassword
};