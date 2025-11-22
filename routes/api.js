// routes/api.js
const express = require('express');
const pool = require('../db');
const router = express.Router();
const validator = require('validator');

// CODE RULE: [A-Za-z0-9]{6,8}
const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;

// Helper: validate target URL
function isValidUrl(url) {
  // Use validator library and require http/https scheme
  return validator.isURL(url, { require_protocol: true, protocols: ['http','https'] });
}

/**
 * POST /api/links
 * Body: { code?: string, target_url: string }
 * 409 if code exists
 */
router.post('/links', async (req, res) => {
  const { code, target_url } = req.body || {};

  if (!target_url || typeof target_url !== 'string') {
    return res.status(400).json({ error: 'target_url is required' });
  }
  if (!isValidUrl(target_url)) {
    return res.status(400).json({ error: 'target_url must be a valid URL with http/https' });
  }

  let finalCode = code;
  if (finalCode) {
    if (!CODE_REGEX.test(finalCode)) {
      return res.status(400).json({ error: 'code must match [A-Za-z0-9]{6,8}' });
    }
  } else {
    // generate random 7 char code (6-8 allowed). If collision, retry a few times.
    const gen = () => Math.random().toString(36).slice(2, 9); // variable length
    let tries = 0;
    do {
      finalCode = gen().replace(/[^A-Za-z0-9]/g, '').slice(0,7);
      tries++;
      if (tries > 5) break;
    } while (!finalCode);
  }

  try {
    const conn = await pool.getConnection();
    try {
      // check uniqueness
      const [existing] = await conn.query('SELECT id FROM links WHERE code = ?', [finalCode]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'code already exists' });
      }
      await conn.query('INSERT INTO links (code, target_url) VALUES (?, ?)', [finalCode, target_url]);
      res.status(201).json({
        code: finalCode,
        target_url,
        short_url: `${process.env.BASE_URL || ''}/${finalCode}`
      });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /api/links
 * List all links
 */
router.get('/links', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT code, target_url, clicks, last_clicked, created_at FROM links ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * GET /api/links/:code
 * Stats for one code (does NOT increment clicks)
 */
router.get('/links/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const [rows] = await pool.query('SELECT code, target_url, clicks, last_clicked, created_at FROM links WHERE code = ?', [code]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * DELETE /api/links/:code
 * Delete a link (after deletion redirect must return 404)
 */
router.delete('/links/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM links WHERE code = ?', [code]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
