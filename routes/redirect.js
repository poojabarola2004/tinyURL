// routes/redirect.js
const express = require('express');
const pool = require('../db');
const router = express.Router();

/**
 * Redirect: GET /:code
 * If exists -> increment clicks + update last_clicked -> 302 redirect to target_url
 * If not -> 404
 */
router.get('/:code', async (req, res, next) => {
  const code = req.params.code;
  if (!code) return next();

  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query('SELECT id, target_url FROM links WHERE code = ?', [code]);
      if (rows.length === 0) {
        return res.status(404).send('Not found');
      }
      const link = rows[0];
      // increment clicks and update last_clicked
      await conn.query('UPDATE links SET clicks = clicks + 1, last_clicked = NOW() WHERE id = ?', [link.id]);
      // 302 redirect
      return res.redirect(302, link.target_url);
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

module.exports = router;
