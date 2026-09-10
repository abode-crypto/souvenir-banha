const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');

// GET /api/cart - view cart
router.get('/', (req, res) => {
  const cart = req.session.cart || [];
  res.json({ items: cart, total: calculateTotal(cart) });
});

// POST /api/cart/add - add item to cart
router.post('/add', (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'معرف المنتج مطلوب' });
  }

  const db = getDatabase();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

  if (!product) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }

  if (!req.session.cart) {
    req.session.cart = [];
  }

  const cart = req.session.cart;
  const existing = cart.find(item => item.productId === productId);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId: product.id, name: product.name, price: product.price, image: product.image, quantity });
  }

  res.json({ items: cart, total: calculateTotal(cart) });
});

// PUT /api/cart/update - update quantity
router.put('/update', (req, res) => {
  const { productId, quantity } = req.body;
  const cart = req.session.cart || [];

  const item = cart.find(i => i.productId === productId);
  if (!item) {
    return res.status(404).json({ error: 'المنتج غير موجود في السلة' });
  }

  if (quantity <= 0) {
    const index = cart.indexOf(item);
    cart.splice(index, 1);
  } else {
    item.quantity = quantity;
  }

  res.json({ items: cart, total: calculateTotal(cart) });
});

// DELETE /api/cart/:productId - remove item
router.delete('/:productId', (req, res) => {
  const cart = req.session.cart || [];
  const index = cart.findIndex(i => i.productId === parseInt(req.params.productId));

  if (index !== -1) {
    cart.splice(index, 1);
  }

  res.json({ items: cart, total: calculateTotal(cart) });
});

function calculateTotal(cart) {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

module.exports = router;