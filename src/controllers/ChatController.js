async function enviarChat(req, res) {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      return res.status(500).json({ ok: false, mensaje: 'No se encontró la URL del webhook en el servidor.' });
    }

    const payload = req.body;
    console.log('Payload recibido:', payload);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('Respuesta de n8n:', response.status, responseText);

    return res.status(response.status).send(responseText);
  } catch (err) {
    console.error('Error en enviarChat:', err.message);
    return res.status(500).json({ ok: false, mensaje: 'Error al reenviar la solicitud al webhook.', error: err.message });
  }
}

module.exports = { enviarChat };