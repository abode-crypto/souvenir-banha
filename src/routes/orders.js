const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../config/database');
const { logger } = require('../middleware/logger');
const { sendOrderEmail } = require('../services/mailer');

// POST /api/orders - create new order
router.post('/', (req, res) => {
  const { customer_name, customer_phone, customer_address, customer_city, order_items } = req.body;

  if (!customer_name || !customer_phone || !customer_address || !customer_city) {
    return res.status(400).json({ error: 'جميع بيانات العميل مطلوبة' });
  }

  if (!order_items || order_items.length === 0) {
    return res.status(400).json({ error: 'السلة فارغة' });
  }

  const db = getDatabase();
  const orderUuid = uuidv4();
  
  const total = order_items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const insertOrder = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO orders (uuid, customer_name, customer_phone, customer_address, customer_city, total, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(orderUuid, customer_name, customer_phone, customer_address, customer_city, total);

    const orderId = result.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, quantity, price)
      VALUES (?, ?, ?, ?)
    `);

    for (const item of order_items) {
      insertItem.run(orderId, item.productId, item.quantity, item.price);
    }

    return orderId;
  });

  const orderId = insertOrder();
  req.session.cart = [];

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const items = db.prepare(`
    SELECT oi.*, p.name as product_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(orderId);

  logger.info('New order created', { orderId, uuid: orderUuid, total });
  res.status(201).json(order);

  // Send email in background (non-blocking)
  sendOrderEmail(order, items).catch(() => {});
});

// GET /api/orders/:uuid - get order details
router.get('/:uuid', (req, res) => {
  const db = getDatabase();
  const order = db.prepare('SELECT * FROM orders WHERE uuid = ?').get(req.params.uuid);

  if (!order) {
    return res.status(404).json({ error: 'الطلب غير موجود' });
  }

  const items = db.prepare(`
    SELECT oi.*, p.name as product_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(order.id);

  res.json({ ...order, items });
});

module.exports = router;
