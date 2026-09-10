const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const { logger } = require('../middleware/logger');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `product-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('صيغة الصورة غير مدعومة'));
  }
});

// GET /api/products - all products (optionally filter by category)
router.get('/', (req, res) => {
  const db = getDatabase();
  const { category } = req.query;

  let query = 'SELECT * FROM products';
  const params = [];

  if (category && category !== 'all') {
    query += ' WHERE category = ?';
    params.push(category);
  }

  query += ' ORDER BY id ASC';

  const products = db.prepare(query).all(...params);
  res.json(products);
});

// GET /api/products/new - newest first
router.get('/new', (req, res) => {
  const db = getDatabase();
  const { category } = req.query;

  let query = 'SELECT * FROM products';
  const params = [];

  if (category && category !== 'all') {
    query += ' WHERE category = ?';
    params.push(category);
  }

  query += ' ORDER BY id DESC';

  const products = db.prepare(query).all(...params);
  res.json(products);
});

// GET /api/categories/list - unique categories
router.get('/categories/list', (req, res) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
  res.json(rows.map(r => r.category));
});

// GET /api/products/:id - single product
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }

  res.json(product);
});

// POST /api/products - create (admin, multipart)
router.post('/', requireAdmin, upload.single('image'), (req, res) => {
  const { name, category, specs, price, oldPrice, img, description } = req.body;

  if (!name || !category || !specs || price === undefined || price === '' || !description) {
    return res.status(400).json({ error: 'جميع الحقول الأساسية مطلوبة' });
  }

  const finalImage = req.file ? `/uploads/${req.file.filename}` : (img || null);
  if (!finalImage) {
    return res.status(400).json({ error: 'صورة المنتج مطلوبة' });
  }

  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO products (name, category, specs, price, oldPrice, img, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, category, specs, parseFloat(price), oldPrice ? parseFloat(oldPrice) : null, finalImage, description);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  logger.info('Product created', { id: product.id, name: product.name });

  res.status(201).json(product);
});

// PUT /api/products/:id - update (admin, multipart)
router.put('/:id', requireAdmin, upload.single('image'), (req, res) => {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }

  const { name, category, specs, price, oldPrice, img, description } = req.body;

  if (!name || !category || !specs || price === undefined || price === '' || !description) {
    return res.status(400).json({ error: 'جميع الحقول الأساسية مطلوبة' });
  }

  const finalImage = req.file ? `/uploads/${req.file.filename}` : (img || existing.img);

  db.prepare(`
    UPDATE products
    SET name = ?, category = ?, specs = ?, price = ?, oldPrice = ?, img = ?, description = ?
    WHERE id = ?
  `).run(name, category, specs, parseFloat(price), oldPrice ? parseFloat(oldPrice) : null, finalImage, description, existing.id);

  // Remove old uploaded image if replaced
  if (req.file && existing.img && existing.img.startsWith('/uploads/')) {
    const oldPath = path.join(__dirname, '..', 'public', existing.img);
    fs.unlink(oldPath, () => {});
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(existing.id);
  logger.info('Product updated', { id: product.id, name: product.name });

  res.json(product);
});

// DELETE /api/products/:id - delete (admin)
router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }

  const deleteProduct = db.transaction(() => {
    db.prepare('DELETE FROM order_items WHERE product_id = ?').run(existing.id);
    db.prepare('DELETE FROM products WHERE id = ?').run(existing.id);
  });
  deleteProduct();

  if (existing.img && existing.img.startsWith('/uploads/')) {
    const oldPath = path.join(__dirname, '..', 'public', existing.img);
    fs.unlink(oldPath, () => {});
  }

  logger.info('Product deleted', { id: existing.id, name: existing.name });
  res.json({ success: true });
});

module.exports = router;