const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();
const usuariosRoutes = require('./routes/usuariosRoutes');
const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    //poner la ip o dominio que le corresponde
        //'http://ipxxx.xxx.xxx.xxxx',
        //'http://ipxxx.xxx.xxx.xxxx',
    //poner el dominio de los 2 front
        //'https://dominio-Front01',
        //'https://dominio-Front02',
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'municipalidad_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8,
  },
}));

app.use('/api/usuarios', usuariosRoutes);

const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);

app.use('/api/ciudadano/auth', require('./routes/ciudadanoAuthRoutes'));
app.use('/api/pre-solicitud', require('./routes/solicitudRoutes'));
app.use('/api/expediente', require('./routes/ConsultaexpedienteRoutes'));
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/revision',      require('./routes/revisionRoutes'));
app.use('/api/documentos', require('./routes/documentoRoutes'));
app.use('/api/ciudadano', require('./routes/ciudadanoSolicitudRoutes'));
app.use('/api/chat',          require('./routes/ChatRoutes'));
//modulo 03
app.use('/api/procedimiento', require('./routes/ProcedimientoRoutes'));

// Módulo 4 (Disolución y Archivamiento) - NUEVO
app.use('/api/procedimiento', require('./routes/modulo4Routes'));
app.use('/api/expedientes', require('./routes/expedienteRoutes'));

const procedimientoRoutes = require('./routes/ProcedimientoRoutes');
app.use('/api/procedimiento', procedimientoRoutes);

app.use('/api/subsanacion', require('./routes/subsanacionRoutes'));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (req, res) => res.json({ mensaje: 'API Divorcio Municipal - OK' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

module.exports = app;
