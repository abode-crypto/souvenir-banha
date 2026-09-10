const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');

// GET /api/categories
router.get('/', (req, res) => {
  const db = getDatabase();
  const categories = db.prepare(`
    SELECT c.id, c.name,
      (SELECT COUNT(*) FROM products p WHERE p.category = c.name) as product_count
    FROM categories c
    ORDER BY c.id
  `).all();
  res.json(categories);
});

module.exports = router;