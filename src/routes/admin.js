const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { logger } = require('../middleware/logger');

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ||
  '$2b$10$O8drYjxpgjh2cQ/q5Wtj1u7hhbStYTxMdgohY4aeW/6P49eCVU24e';

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'كلمة السر مطلوبة' });
  }

  const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!valid) {
    return res.status(401).json({ error: 'كلمة السر خاطئة' });
  }

  req.session.isAdmin = true;
  logger.info('Admin logged in', { ip: req.ip });
  res.json({ isAdmin: true });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ isAdmin: false });
});

// GET /api/admin/status
router.get('/status', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

module.exports = router;