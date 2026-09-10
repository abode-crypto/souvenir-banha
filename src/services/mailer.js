const nodemailer = require('nodemailer');
const { logger } = require('../middleware/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    logger.warn('Email not configured - set EMAIL_USER and EMAIL_APP_PASSWORD in .env');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  logger.info('Gmail SMTP transporter initialized', { user });
  return transporter;
}

function buildOrderHtml(order, items) {
  const rows = items.map(item => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #f0f0f0;">${item.product_name || item.product_id}</td>
      <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:center;">x${item.quantity}</td>
      <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:left;">${item.price.toFixed(2)} JOD</td>
    </tr>
  `).join('');

  return `
  <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:600px;margin:20px auto;background:#fff;border-radius:16px;border:1px solid #eee;">
    <div style="background:#ff3b6f;color:#fff;padding:20px;border-radius:16px 16px 0 0;">
      <h2 style="margin:0;">🛒 New Order</h2>
      <p style="margin:6px 0 0;opacity:.9;">Souvenir Banha</p>
    </div>
    <div style="padding:24px;">
      <p style="font-size:15px;"><strong>Order ID:</strong> #${order.uuid.slice(0, 8).toUpperCase()}</p>
      <p style="font-size:15px;"><strong>Date:</strong> ${new Date(order.created_at).toLocaleString('ar')}</p>
      <h3 style="border-top:1px solid #eee;padding-top:12px;color:#1a1a1a;">Customer Info</h3>
      <p style="font-size:15px;"><strong>Name:</strong> ${order.customer_name}</p>
      <p style="font-size:15px;"><strong>Phone:</strong> <a href="tel:${order.customer_phone}" style="color:#ff3b6f;text-decoration:none;">${order.customer_phone}</a></p>
      <p style="font-size:15px;"><strong>City:</strong> ${order.customer_city}</p>
      <p style="font-size:15px;"><strong>Address:</strong> ${order.customer_address}</p>
      <h3 style="border-top:1px solid #eee;padding-top:12px;color:#1a1a1a;">Products</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f7f7f8;">
            <th style="padding:10px;text-align:right;">Product</th>
            <th style="padding:10px;">Qty</th>
            <th style="padding:10px;">Price</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:20px;font-weight:800;color:#ff3b6f;border-top:2px solid #222;padding-top:14px;margin-top:14px;">
        Total: ${order.total.toFixed(2)} JOD
      </p>
    </div>
  </div>`;
}

async function sendOrderEmail(order, items) {
  const transport = getTransporter();
  if (!transport) return false;

  try {
    await transport.sendMail({
      from: `"Souvenir Banha" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER,
      subject: `🛒 New Order #${order.uuid.slice(0, 8).toUpperCase()} - ${order.total.toFixed(2)} JOD`,
      html: buildOrderHtml(order, items)
    });
    logger.info('Order email sent', { orderId: order.id, uuid: order.uuid });
    return true;
  } catch (err) {
    logger.error('Failed to send order email', { error: err.message });
    return false;
  }
}

module.exports = { sendOrderEmail };
