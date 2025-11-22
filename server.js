// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const apiRouter = require('./routes/api');
const redirectRouter = require('./routes/redirect');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRouter);

// Stats page route - serves code.html (frontend will fetch /api/links/:code)
app.get('/code/:code', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'code.html'));
});

// Healthcheck (must return 200)
app.get('/healthz', (req, res) => {
  res.json({ ok: true, version: "1.0" });
});

// Redirect route: /:code
app.use('/', redirectRouter);

// Fallback to index.html for root dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TinyLink running on port ${PORT}`);
});
