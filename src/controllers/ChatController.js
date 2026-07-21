async function enviarChat(req, res) {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      return res.status(500).json({ ok: false, mensaje: 'No se encontró la URL del webhook en el servidor.' });
    }

    const payload = req.body;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    return res.status(response.status).send(responseText);
  } catch (err) {
    return res.status(500).json({ ok: false, mensaje: 'Error al reenviar la solicitud al webhook.', error: err.message });
  }
}

module.exports = { enviarChat };