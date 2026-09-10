const BASE = 'http://localhost/api';
let cookie = '';

async function req(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (cookie) headers['Cookie'] = cookie;
  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.json);
    delete options.json;
  }
  const res = await fetch(BASE + path, { ...options, headers });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function check(label, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} | ${label}${extra ? ' | ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}

(async () => {
  // 1. products all
  let r = await req('/products');
  check('GET /products count=19', r.status === 200 && r.data.length === 19, `count=${r.data.length}`);
  check('GET /products price is number', typeof r.data[0].price === 'number');
  check('GET /products has img', typeof r.data[0].img === 'string' && r.data[0].img.length > 0);

  // 2. products/new
  r = await req('/products/new');
  check('GET /products/new newest-first', r.data[0].id >= r.data[1].id);

  // 3. category filter
  const cat = (await req('/categories'));
  check('GET /categories count=9', cat.status === 200 && cat.data.length === 9, `count=${cat.data.length}`);
  const catName = cat.data[0].name;
  const filtered = await req('/products?category=' + encodeURIComponent(catName));
  const full = (await req('/products')).data;
  const expectedCount = full.filter(p => p.category === catName).length;
  check('GET /products?category filter works', filtered.data.length === expectedCount && filtered.data.every(p => p.category === catName), `matching=${filtered.data.length}/${expectedCount}`);

  // 4. products by id
  r = await req('/products/1');
  check('GET /products/1', r.status === 200 && r.data.id === 1);
  r = await req('/products/999999');
  check('GET /products/999999 -> 404', r.status === 404);

  // 5. admin status (logged out)
  r = await req('/admin/status');
  check('admin/status false when logged out', r.data.isAdmin === false);

  // 6. login wrong password -> 401
  r = await req('/admin/login', { method: 'POST', json: { password: 'wrong' } });
  check('admin login wrong -> 401', r.status === 401, `status=${r.status}`);

  // 7. login correct
  r = await req('/admin/login', { method: 'POST', json: { password: 'admin123' } });
  check('admin login admin123 -> isAdmin true', r.status === 200 && r.data.isAdmin === true);

  // 8. admin/status after login
  r = await req('/admin/status');
  check('admin/status true after login', r.data.isAdmin === true);

  // 9. create product
  const f = new FormData();
  f.append('name', 'منتج اختبار E2E');
  f.append('category', catName);
  f.append('specs', 'اختبار');
  f.append('price', '99.99');
  f.append('oldPrice', '129.99');
  f.append('description', 'منتج مؤقت للاختبار');
  const res = await fetch(BASE + '/products', { method: 'POST', headers: { Cookie: cookie }, body: f });
  const created = await res.json().catch(() => ({}));
  check('POST /products create (no image) -> 400', res.status === 400, `status=${res.status}`);
  const createdId = created.id;
  console.log(`   created id if any: ${createdId}`);
  if (createdId) { await fetch(BASE + '/products/' + createdId, { method: 'DELETE', headers: { Cookie: cookie } }); }

  // 10. create product without image returns 400 (already covered), test with image:
  const sharp = await import('sharp').catch(() => null); // not available; skip
  // fallback: replicate a tiny PNG via buffer
  const fs = await import('fs');
  const { PNG } = await import('pngjs').catch(() => ({}));
  // Use a minimal 1x1 PNG bytes
  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const f2 = new FormData();
  f2.append('name', 'منتج اختبار E2E');
  f2.append('category', catName);
  f2.append('specs', 'اختبار');
  f2.append('price', '99.99');
  f2.append('description', 'منتج مؤقت للاختبار');
  f2.append('image', new Blob([tinyPng], { type: 'image/png' }), 'test.png');
  const res2 = await fetch(BASE + '/products', { method: 'POST', headers: { Cookie: cookie }, body: f2 });
  const created2 = await res2.json().catch(() => ({}));
  check('POST /products with image -> 201', res2.status === 201 && created2.id, `status=${res2.status}, id=${created2.id}`);
  if (created2.id) {
    check('POST /products returns img', typeof created2.img === 'string' && created2.img.startsWith('/uploads/'));
    // 11. update product
    const f3 = new FormData();
    f3.append('name', 'منتج محدث');
    f3.append('category', catName);
    f3.append('specs', 'محدث');
    f3.append('price', '77');
    f3.append('description', 'تحديث');
    const up = await fetch(BASE + '/products/' + created2.id, { method: 'PUT', headers: { Cookie: cookie }, body: f3 });
    const updated = await up.json().catch(() => ({}));
    check('PUT /products/:id -> 200 updated', up.status === 200 && updated.name === 'منتج محدث', `status=${up.status}, name=${updated.name}`);
    // 12. delete product
    const del = await fetch(BASE + '/products/' + created2.id, { method: 'DELETE', headers: { Cookie: cookie } });
    const delData = await del.json().catch(() => ({}));
    check('DELETE /products/:id -> success', del.status === 200 && delData.success === true);
    const gone = await req('/products/' + created2.id);
    check('Product actually deleted -> 404', gone.status === 404);
  }

  // 13. cart flow
  await req('/cart/add', { method: 'POST', json: { productId: 1, quantity: 2 } });
  r = await req('/cart');
  check('Cart add -> total = 2*price1', r.status === 200 && r.data.items.length === 1 && r.data.total === 2 * (await req('/products/1')).data.price, `items=${r.data.items.length}, total=${r.data.total}`);
  await req('/cart/update', { method: 'PUT', json: { productId: 1, quantity: 5 } });
  r = await req('/cart');
  check('Cart update quantity=5', r.data.items[0].quantity === 5);
  await req('/cart/1', { method: 'DELETE' });
  r = await req('/cart');
  check('Cart remove -> empty', r.data.items.length === 0);

  // 14. order flow
  r = await req('/orders', { method: 'POST', json: { customer_name: '', customer_phone: '01000000000', customer_city: 'بنها', customer_address: 'شارع', order_items: [{ productId: 1, quantity: 1, price: (await req('/products/1')).data.price }] } });
  check('Order invalid (no name) -> 400', r.status === 400, `status=${r.status}`);
  r = await req('/orders', { method: 'POST', json: { customer_name: 'أحمد', customer_phone: '01000000000', customer_city: 'بنها', customer_address: 'شارع الاختبار', order_items: [] } });
  check('Order empty cart -> 400', r.status === 400, `status=${r.status}`);
  const p1 = (await req('/products/1')).data.price;
  r = await req('/orders', { method: 'POST', json: { customer_name: 'أحمد', customer_phone: '01000000000', customer_city: 'بنها', customer_address: 'شارع الاختبار', order_items: [{ productId: 1, quantity: 2, price: p1 }] } });
  check('Order created -> 201', r.status === 201 && r.data.id, `status=${r.status}, id=${r.data.id}`);
  if (r.data.id) {
    check('Order total correct', r.data.total === p1 * 2, `total=${r.data.total}`);
    const g = await req('/orders/' + r.data.uuid);
    check('GET /orders/:uuid -> items', g.status === 200 && g.data.items.length === 1, `items=${g.data.items?.length}`);
    // cart cleared after order
    const cart = await req('/cart');
    check('Cart cleared after order', cart.data.items.length === 0);
  }

  // 15. logout
  await req('/admin/logout', { method: 'POST' });
  r = await req('/admin/status');
  check('admin/status false after logout', r.data.isAdmin === false);

  console.log('--- E2E complete ---');
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(1); });