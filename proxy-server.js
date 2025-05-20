// Servidor proxy sencillo que reenvía peticiones a la API de cotizaciones

// proxy-server.js (formato ESModule)
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = 5174;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: false
}));

app.get('/api/pix-quotes', async (req, res) => {
    try {
        const response = await fetch('https://pix.ferminrp.com/quotes');
        if (!response.ok) throw new Error('No se pudo acceder a la API externa');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Error en el proxy al acceder a la API de PIX' });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy corriendo en http://localhost:${PORT}`);
});
