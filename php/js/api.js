// ============================================
// API Client
// ============================================

const API = {
  base: 'api',

  async request(path, options = {}) {
    const res = await fetch(this.base + path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `خطأ: ${res.status}`);
    }
    return data;
  },

  // ---------- المنتجات ----------
  getProducts(category) {
    const q = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    return this.request('/products' + q);
  },

  getNewProducts(category) {
    const q = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    return this.request('/products/new' + q);
  },

  createProduct(formData) {
    return this.request('/products', { method: 'POST', body: formData });
  },

  updateProduct(id, formData) {
    return this.request(`/products/${id}`, { method: 'PUT', body: formData });
  },

  deleteProduct(id) {
    return this.request(`/products/${id}`, { method: 'DELETE' });
  },

  // ---------- الفئات ----------
  getCategories() {
    return this.request('/categories');
  },

  // ---------- الأدمن ----------
  adminLogin(password) {
    return this.request('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
  },

  adminLogout() {
    return this.request('/admin/logout', { method: 'POST' });
  },

  adminStatus() {
    return this.request('/admin/status');
  },

  // ---------- السلة ----------
  getCart() {
    return this.request('/cart');
  },

  addToCart(productId, quantity = 1) {
    return this.request('/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity })
    });
  },

  updateCartItem(productId, quantity) {
    return this.request('/cart/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity })
    });
  },

  removeFromCart(productId) {
    return this.request(`/cart/${productId}`, { method: 'DELETE' });
  },

  // ---------- الطلبات ----------
  createOrder(data) {
    return this.request('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
};