const Database = require('better-sqlite3');
const path = require('path');

const src = new Database(path.join(__dirname, 'store.db'), { readonly: true });

function esc(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
}

const out = [];
out.push('CREATE TABLE IF NOT EXISTS categories (');
out.push('  id INT AUTO_INCREMENT PRIMARY KEY,');
out.push('  name VARCHAR(255) NOT NULL UNIQUE');
out.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
out.push('');
out.push('CREATE TABLE IF NOT EXISTS products (');
out.push('  id INT AUTO_INCREMENT PRIMARY KEY,');
out.push('  name VARCHAR(255) NOT NULL,');
out.push('  category VARCHAR(255) NOT NULL,');
out.push('  specs VARCHAR(255),');
out.push('  price DECIMAL(10,2) NOT NULL,');
out.push('  oldPrice DECIMAL(10,2) NULL,');
out.push('  img VARCHAR(255),');
out.push('  description TEXT,');
out.push('  created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
out.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
out.push('');
out.push('CREATE TABLE IF NOT EXISTS orders (');
out.push('  id INT AUTO_INCREMENT PRIMARY KEY,');
out.push('  uuid VARCHAR(36) NOT NULL UNIQUE,');
out.push('  customer_name VARCHAR(255) NOT NULL,');
out.push('  customer_phone VARCHAR(50) NOT NULL,');
out.push('  customer_address TEXT,');
out.push('  customer_city VARCHAR(100),');
out.push('  total DECIMAL(10,2) NOT NULL,');
out.push('  status VARCHAR(20) DEFAULT \'pending\',');
out.push('  created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
out.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
out.push('');
out.push('CREATE TABLE IF NOT EXISTS order_items (');
out.push('  id INT AUTO_INCREMENT PRIMARY KEY,');
out.push('  order_id INT NOT NULL,');
out.push('  product_id INT NULL,');
out.push('  quantity INT NOT NULL,');
out.push('  price DECIMAL(10,2) NOT NULL,');
out.push('  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,');
out.push('  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL');
out.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
out.push('');

out.push('SET FOREIGN_KEY_CHECKS=0;');
out.push('TRUNCATE TABLE order_items;');
out.push('TRUNCATE TABLE orders;');
out.push('DELETE FROM products;');
out.push('DELETE FROM categories;');
out.push('SET FOREIGN_KEY_CHECKS=1;');
out.push('');

const cats = src.prepare('SELECT * FROM categories ORDER BY id').all();
out.push('INSERT INTO categories (id, name) VALUES');
out.push(cats.map(c => `(${c.id}, ${esc(c.name)})`).join(',') + ';');
out.push('');

const prods = src.prepare('SELECT * FROM products ORDER BY id').all();
if (prods.length) {
  out.push('INSERT INTO products (id, name, category, specs, price, oldPrice, img, description, created_at) VALUES');
  out.push(prods.map(p =>
    `(${p.id}, ${esc(p.name)}, ${esc(p.category)}, ${esc(p.specs)}, ${Number(p.price).toFixed(2)}, ${p.oldPrice ? Number(p.oldPrice).toFixed(2) : 'NULL'}, ${esc(p.img)}, ${esc(p.description)}, ${esc(p.created_at)})`
  ).join(',') + ';');
  out.push('');
}

const orders = src.prepare('SELECT * FROM orders ORDER BY id').all();
if (orders.length) {
  out.push('INSERT INTO orders (id, uuid, customer_name, customer_phone, customer_address, customer_city, total, status, created_at) VALUES');
  out.push(orders.map(o =>
    `(${o.id}, ${esc(o.uuid)}, ${esc(o.customer_name)}, ${esc(o.customer_phone)}, ${esc(o.customer_address)}, ${esc(o.customer_city)}, ${Number(o.total).toFixed(2)}, ${esc(o.status)}, ${esc(o.created_at)})`
  ).join(',') + ';');
  out.push('');
}

const items = src.prepare('SELECT * FROM order_items ORDER BY id').all();
if (items.length) {
  out.push('INSERT INTO order_items (id, order_id, product_id, quantity, price) VALUES');
  out.push(items.map(i =>
    `(${i.id}, ${i.order_id}, ${i.product_id}, ${i.quantity}, ${Number(i.price).toFixed(2)})`
  ).join(',') + ';');
  out.push('');
}

const fs = require('fs');
fs.writeFileSync(path.join(__dirname, 'mysql-export.sql'), out.join('\n'), 'utf8');
console.log('Exported to data/mysql-export.sql');
console.log('categories:', cats.length, '| products:', prods.length, '| orders:', orders.length, '| items:', items.length);

src.close();