const express = require('express');
const axios = require('axios');

function startProxy(port = 5152) {
  const app = express();

  app.get('/download', async (req, res) => {
    const { url, name } = req.query;
    if (!url) return res.status(400).send('❌ Missing url parameter');

    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      res.setHeader('Content-Disposition', `attachment; filename="${name || 'file.png'}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(response.data);
    } catch (err) {
      console.error('Proxy-Fehler:', err.message);
      res.status(500).send('❌ Fehler beim Abrufen der Datei');
    }
  });

  app.listen(port, () => {
    console.log(`🚀 Download-Proxy läuft auf ${port}`);
  });
}

module.exports = { startProxy };
