const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function enviarCorreo({ destinatario, asunto, html }) {
  await transporter.sendMail({
    from: `"Municipalidad distrital de El Porvenir" <${process.env.MAIL_USER}>`,
    to: destinatario,
    subject: asunto,
    html,
  });
}

module.exports = { enviarCorreo };