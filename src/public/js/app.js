// ============================================================
// Souvenir Banha - منطق التطبيق
// ============================================================

// ---------- حالة عامة ----------
let allProducts = [];
let isAdmin = false;
let currentCategory = 'all';

const CATEGORY_ICONS = {
  'فن الريزن': 'fa-paint-brush',
  'تجفيف الورود': 'fa-leaf',
  'كتب الكتاب': 'fa-ring',
  'صواني الشبكة': 'fa-box-open',
  'طارات الخطوبة': 'fa-heart',
  'سبوع البيبي': 'fa-baby',
  'مجات طباعة و ديجيتال حراري': 'fa-mug-hot',
  'التخرج': 'fa-graduation-cap',
  'بوكيهات': 'fa-seedling',
  'الكل': 'fa-th-large'
};

// ---------- أدوات ----------
function formatPrice(p) {
  return p.toFixed(2) + ' ج.م';
}

function showToast(message, type = 'info') {
  const container = document.querySelector('.toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---------- التنقل (hash routing) ----------
function navigate() {
  const hash = window.location.hash.slice(1) || 'home';

  // إخفاء كل الصفحات
  ['mainPage', 'newPage', 'detailPage', 'cartPage', 'successPage'].forEach(id => {
    document.getElementById(id).classList.remove('active-page');
  });
  ['linkHome', 'linkNew'].forEach(id => {
    document.getElementById(id).classList.remove('active-link');
  });

  if (hash === 'home') {
    document.getElementById('mainPage').classList.add('active-page');
    document.getElementById('linkHome').classList.add('active-link');
    document.title = 'Souvenir Banha - جميع المنتجات';
  } else if (hash === 'new') {
    document.getElementById('newPage').classList.add('active-page');
    document.getElementById('linkNew').classList.add('active-link');
    document.title = 'Souvenir Banha - أحدث الإضافات';
  } else if (hash.startsWith('detail-')) {
    const id = parseInt(hash.split('-')[1]);
    const product = allProducts.find(p => p.id === id);
    if (product) showDetail(product);
    else window.location.hash = 'home';
  } else if (hash === 'cart') {
    document.getElementById('cartPage').classList.add('active-page');
    document.title = 'Souvenir Banha - السلة';
    renderCart();
  } else if (hash === 'success') {
    document.getElementById('successPage').classList.add('active-page');
    document.title = 'Souvenir Banha - تم الطلب';
  } else {
    window.location.hash = 'home';
  }
}

function goHome() { window.location.hash = 'home'; }
window.addEventListener('hashchange', navigate);
document.getElementById('linkHome').addEventListener('click', () => window.location.hash = 'home');
document.getElementById('linkNew').addEventListener('click', () => window.location.hash = 'new');
document.getElementById('linkCart').addEventListener('click', () => window.location.hash = 'cart');

// ---------- شريط الفئات ----------
function buildSidebar(categories) {
  const container = document.getElementById('categoryButtons');
  container.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'category-btn-vertical active-cat';
  allBtn.dataset.category = 'all';
  allBtn.innerHTML = `<i class="fas fa-th-large"></i> الكل`;
  allBtn.addEventListener('click', () => filterByCategory('all'));
  container.appendChild(allBtn);

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-btn-vertical';
    btn.dataset.category = cat.name;
    const icon = CATEGORY_ICONS[cat.name] || 'fa-tag';
    btn.innerHTML = `<i class="fas ${icon}"></i> ${cat.name}`;
    btn.addEventListener('click', () => filterByCategory(cat.name));
    container.appendChild(btn);
  });
}

function filterByCategory(category) {
  currentCategory = category;
  document.querySelectorAll('.category-btn-vertical').forEach(btn => {
    btn.classList.toggle('active-cat', btn.dataset.category === category);
  });
  renderHome();
  renderNew();
}

// ---------- عرض المنتجات ----------
function getFiltered() {
  if (currentCategory === 'all') return allProducts;
  return allProducts.filter(p => p.category === currentCategory);
}

function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  const oldPriceHtml = product.oldPrice
    ? `<span class="old-price">${product.oldPrice.toFixed(2)} ج.م</span>`
    : '';
  const categoryTag = `<div class="product-category-tag">${product.category || ''}</div>`;
  const specsHtml = `<div class="product-specs"><i class="fas fa-tag"></i> ${product.specs || ''}</div>`;

  card.innerHTML = `
    <div class="admin-actions ${isAdmin ? 'show' : ''}">
      <button class="admin-action-btn edit-btn" title="تعديل"><i class="fas fa-pen"></i></button>
      <button class="admin-action-btn delete-btn" title="حذف"><i class="fas fa-trash"></i></button>
    </div>
    <button class="cart-action-btn" title="إضافة للسلة"><i class="fas fa-cart-plus"></i></button>
    <img class="product-img" src="${product.img}" alt="${product.name}" loading="lazy"
         onerror="this.src='https://via.placeholder.com/600x700?text=Souvenir'" />
    <div class="product-info">
      ${categoryTag}
      <div class="product-name">${product.name}</div>
      ${specsHtml}
      <div class="price-row">
        <div class="product-price">${product.price.toFixed(2)} ج.م ${oldPriceHtml}</div>
      </div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.admin-action-btn') || e.target.closest('.cart-action-btn')) return;
    window.location.hash = 'detail-' + product.id;
  });

  card.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openEditModal(product.id);
  });
  card.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteProduct(product.id);
  });
  card.querySelector('.cart-action-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await API.addToCart(product.id, 1);
      showToast('تمت الإضافة إلى السلة 🛒', 'success');
      await updateCartBadge();
    } catch (err) {
      showToast('حدث خطأ - حاول مجدداً', 'error');
    }
  });

  return card;
}

async function renderHome() {
  const container = document.getElementById('productContainer');
  container.innerHTML = '<div class="loading">جارٍ التحميل...</div>';
  const products = getFiltered();
  container.innerHTML = '';
  if (!products.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📦</div><p>لا توجد منتجات في هذه الفئة</p></div>';
    return;
  }
  const sorted = [...products].sort((a, b) => a.id - b.id);
  sorted.forEach(p => container.appendChild(createProductCard(p)));
}

async function renderNew() {
  const container = document.getElementById('newProductContainer');
  const products = getFiltered();
  container.innerHTML = '';
  if (!products.length) return;
  const sorted = [...products].sort((a, b) => b.id - a.id);
  sorted.forEach(p => container.appendChild(createProductCard(p)));
}

// ---------- صفحة التفاصيل ----------
function showDetail(product) {
  document.getElementById('detailImg').src = product.img;
  document.getElementById('detailImg').onerror = function () {
    this.src = 'https://via.placeholder.com/600x700?text=Souvenir';
  };
  document.getElementById('detailName').textContent = product.name;
  document.getElementById('detailSpecs').innerHTML = `<i class="fas fa-tag"></i> ${product.specs || ''} · ${product.category || ''}`;
  document.getElementById('detailPrice').textContent = product.price.toFixed(2) + ' ج.م';
  document.getElementById('detailDesc').textContent = product.description || '';
  const oldEl = document.getElementById('detailOldPrice');
  if (product.oldPrice) {
    oldEl.textContent = product.oldPrice.toFixed(2) + ' ج.م';
    oldEl.style.display = 'inline';
  } else {
    oldEl.style.display = 'none';
  }

  const addBtn = document.getElementById('detailAddBtn');
  addBtn.onclick = async () => {
    try {
      await API.addToCart(product.id, 1);
      showToast(`"${product.name}" أُضيف إلى السلة 🛒`, 'success');
      await updateCartBadge();
    } catch (err) {
      showToast('حدث خطأ - حاول مجدداً', 'error');
    }
  };

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- السلة ----------
async function renderCart() {
  const container = document.getElementById('cartContainer');
  container.innerHTML = '<div class="loading">جارٍ التحميل...</div>';

  let cart;
  try {
    cart = await API.getCart();
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>حدث خطأ</p></div>';
    return;
  }

  if (!cart.items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🛒</div>
        <p>السلة فارغة</p>
        <button class="btn-primary" style="width:auto; margin-top:18px; padding:12px 36px;" onclick="goHome()">ابدأ التسوق</button>
      </div>`;
    return;
  }

  let rowsHtml = cart.items.map(item => `
    <div class="cart-item-row">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/70x70?text=S'" />
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${item.price.toFixed(2)} ج.م</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" data-action="minus" data-id="${item.productId}">−</button>
        <span class="qty-num">${item.quantity}</span>
        <button class="qty-btn" data-action="plus" data-id="${item.productId}">+</button>
      </div>
      <div class="cart-item-price" style="min-width:90px; text-align:left;">${(item.price * item.quantity).toFixed(2)} ج.م</div>
      <button class="remove-item-btn" data-action="remove" data-id="${item.productId}"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');

  const summaryRows = cart.items.map(item =>
    `<div class="summary-row"><span>${item.name} × ${item.quantity}</span><span>${(item.price * item.quantity).toFixed(2)} ج.م</span></div>`
  ).join('');

  container.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items-box">${rowsHtml}</div>
      <div class="cart-summary-box">
        <h3>ملخص الطلب</h3>
        <div class="summary-rows">${summaryRows}</div>
        <div class="summary-total"><span>الإجمالي</span><span>${cart.total.toFixed(2)} ج.م</span></div>
        <button class="btn-primary" id="showCheckoutBtn"><i class="fas fa-check-circle"></i> إتمام الطلب</button>
        <a class="btn-outline" onclick="goHome()">متابعة التسوق</a>

        <div class="checkout-form" id="checkoutForm" style="display:none;">
          <h4>بيانات التوصيل</h4>
          <div class="form-group">
            <label>الاسم الكامل *</label>
            <input type="text" id="cName" placeholder="اسمك الكامل">
          </div>
          <div class="form-group">
            <label>رقم الهاتف *</label>
            <input type="tel" id="cPhone" placeholder="01xxxxxxxxx">
          </div>
          <div class="form-group">
            <label>المدينة *</label>
            <input type="text" id="cCity" placeholder="مدينتك">
          </div>
          <div class="form-group">
            <label>العنوان *</label>
            <textarea id="cAddress" rows="2" placeholder="العنوان بالتفصيل"></textarea>
          </div>
          <button class="btn-primary" id="confirmOrderBtn"><i class="fas fa-check"></i> تأكيد الطلب</button>
        </div>
      </div>
    </div>
  `;

  // أحداث السلة
  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      const list = cart.items;
      const item = list.find(i => i.productId === id);
      if (!item) return;
      const q = btn.dataset.action === 'plus' ? item.quantity + 1 : item.quantity - 1;
      if (q <= 0) return;
      await API.updateCartItem(id, q);
      await updateCartBadge();
      renderCart();
    });
  });

  container.querySelectorAll('.remove-item-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      await API.removeFromCart(id);
      await updateCartBadge();
      renderCart();
    });
  });

  document.getElementById('showCheckoutBtn').addEventListener('click', () => {
    document.getElementById('checkoutForm').style.display = 'block';
    document.getElementById('showCheckoutBtn').style.display = 'none';
  });

  document.getElementById('confirmOrderBtn').addEventListener('click', submitOrder);
}

async function submitOrder() {
  const name = document.getElementById('cName').value.trim();
  const phone = document.getElementById('cPhone').value.trim();
  const city = document.getElementById('cCity').value.trim();
  const address = document.getElementById('cAddress').value.trim();

  let valid = true;
  [['cName', name], ['cPhone', phone], ['cCity', city], ['cAddress', address]].forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (!val) { el.classList.add('error'); valid = false; }
    else el.classList.remove('error');
  });

  if (!valid) {
    showToast('يرجى تعبئة جميع الحقول', 'error');
    return;
  }

  if (name.length < 3) {
    document.getElementById('cName').classList.add('error');
    showToast('من فضلك اكتب اسمك الكامل', 'error');
    return;
  }

  const phoneRegex = /^(?:\+2|002)?(01[0125][0-9]{8})$/;
  if (!phoneRegex.test(phone)) {
    document.getElementById('cPhone').classList.add('error');
    showToast('رقم الهاتف غير صحيح - اكتب رقم مصري مثل 01012345678', 'error');
    return;
  }

  const btn = document.getElementById('confirmOrderBtn');
  btn.disabled = true;
  btn.textContent = 'جارٍ الإرسال...';

  try {
    const cart = await API.getCart();
    const order = await API.createOrder({
      customer_name: name,
      customer_phone: phone,
      customer_city: city,
      customer_address: address,
      order_items: cart.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price }))
    });

    document.getElementById('successCustomer').textContent = `شكراً لك ${order.customer_name}`;
    document.getElementById('successNumber').innerHTML = `رقم الطلب: <strong>#${order.uuid.slice(0, 8).toUpperCase()}</strong>`;
    document.getElementById('successTotal').innerHTML = `الإجمالي: <strong style="color:#ff3b6f">${order.total.toFixed(2)} ج.م</strong>`;
    await updateCartBadge();
    window.location.hash = 'success';
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'تأكيد الطلب';
    showToast((err && err.message) || 'فشل إرسال الطلب - حاول مجدداً', 'error');
  }
}

// ---------- شارة السلة ----------
async function updateCartBadge() {
  try {
    const cart = await API.getCart();
    const count = cart.items.reduce((s, i) => s + i.quantity, 0);
    const badge = document.getElementById('cartCount');
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  } catch (err) {
    console.error('cart badge failed', err);
  }
}

// ---------- الأدمن ----------
async function refreshAdminUI() {
  try {
    const res = await API.adminStatus();
    isAdmin = res.isAdmin;
  } catch (err) {
    isAdmin = false;
  }

  document.getElementById('loginBtn').style.display = isAdmin ? 'none' : 'inline-block';
  document.getElementById('logoutBtn').style.display = isAdmin ? 'inline-block' : 'none';
  document.getElementById('addProductBtn').style.display = isAdmin ? 'inline-block' : 'none';
  document.getElementById('adminStatus').innerHTML = isAdmin ? '🛡️ أدمن' : '';
  document.querySelectorAll('.admin-actions').forEach(a => a.classList.toggle('show', isAdmin));
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const pass = prompt('🔐 أدخل كلمة سر الأدمن:');
  if (pass === null) return;
  try {
    await API.adminLogin(pass);
    isAdmin = true;
    await refreshAdminUI();
    showToast('✅ مرحباً أيها الأدمن!', 'success');
  } catch (err) {
    showToast('❌ كلمة سر خاطئة!', 'error');
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await API.adminLogout();
  isAdmin = false;
  await refreshAdminUI();
  showToast('👋 تم الخروج');
});

async function deleteProduct(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;
  if (!confirm(`⚠️ هل أنت متأكد من حذف "${product.name}" نهائياً؟`)) return;
  try {
    await API.deleteProduct(id);
    allProducts = allProducts.filter(p => p.id !== id);
    renderHome();
    renderNew();
    showToast(`تم حذف "${product.name}" ✅`, 'success');
  } catch (err) {
    showToast('فشل الحذف - يجب دخول الأدمن', 'error');
  }
}

// ---------- المودال ----------
function populateCategorySelect(selected = 'فن الريزن') {
  const select = document.getElementById('fCategory');
  select.innerHTML = '';
  API.getCategories().then(cats => {
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      if (c.name === selected) opt.selected = true;
      select.appendChild(opt);
    });
  });
}

function openAddModal() {
  document.getElementById('editId').value = '';
  document.getElementById('modalTitle').textContent = '➕ إضافة منتج جديد';
  document.getElementById('fName').value = '';
  populateCategorySelect(currentCategory === 'all' ? 'فن الريزن' : currentCategory);
  document.getElementById('fSpecs').value = '';
  document.getElementById('fPrice').value = '';
  document.getElementById('fOldPrice').value = '';
  document.getElementById('fDesc').value = '';
  document.getElementById('fImg').value = '';
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('productModal').classList.add('show');
}

function openEditModal(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;
  document.getElementById('editId').value = id;
  document.getElementById('modalTitle').textContent = '✏️ تعديل المنتج';
  document.getElementById('fName').value = product.name;
  populateCategorySelect(product.category);
  document.getElementById('fSpecs').value = product.specs || '';
  document.getElementById('fPrice').value = product.price;
  document.getElementById('fOldPrice').value = product.oldPrice || '';
  document.getElementById('fDesc').value = product.description || '';
  const preview = document.getElementById('imagePreview');
  if (product.img) {
    preview.src = product.img;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
  document.getElementById('fImg').value = '';
  document.getElementById('productModal').classList.add('show');
}

function closeModal() {
  document.getElementById('productModal').classList.remove('show');
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('fImg').value = '';
}

document.getElementById('productModal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

document.getElementById('addProductBtn').addEventListener('click', openAddModal);
document.getElementById('saveProductBtn').addEventListener('click', saveProduct);

document.getElementById('fImg').addEventListener('change', function (e) {
  const preview = document.getElementById('imagePreview');
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.src = ev.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    preview.style.display = 'none';
  }
});

async function saveProduct() {
  const name = document.getElementById('fName').value.trim();
  const category = document.getElementById('fCategory').value;
  const specs = document.getElementById('fSpecs').value.trim();
  const price = parseFloat(document.getElementById('fPrice').value);
  const oldPrice = parseFloat(document.getElementById('fOldPrice').value) || null;
  const description = document.getElementById('fDesc').value.trim();
  const editId = document.getElementById('editId').value;
  const fileInput = document.getElementById('fImg');

  if (!name || !specs || isNaN(price) || !description) {
    showToast('يرجى تعبئة جميع الحقول الأساسية', 'error');
    return;
  }

  const payload = new FormData();
  payload.append('name', name);
  payload.append('category', category);
  payload.append('specs', specs);
  payload.append('price', price);
  payload.append('description', description);

  if (oldPrice) payload.append('oldPrice', oldPrice);

  const isEdit = !!editId;
  if (isEdit) {
    // نحتفظ بالصورة الحالية إن لم يتم رفع صورة جديدة
    const existing = allProducts.find(p => p.id === parseInt(editId));
    if (existing && !fileInput.files[0]) {
      payload.append('img', existing.img);
    }
  }

  if (fileInput.files[0]) {
    payload.append('image', fileInput.files[0]);
  } else if (!isEdit) {
    showToast('يرجى رفع صورة للمنتج الجديد', 'error');
    return;
  }

  const btn = document.getElementById('saveProductBtn');
  btn.disabled = true;
  btn.textContent = 'جارٍ الحفظ...';

  try {
    let saved;
    if (isEdit) saved = await API.updateProduct(parseInt(editId), payload);
    else saved = await API.createProduct(payload);

    allProducts = await API.getProducts();
    closeModal();
    renderHome();
    renderNew();
    showToast(`تم حفظ "${saved.name}" ✅`, 'success');
    if (window.location.hash.startsWith('detail-')) navigate();
  } catch (err) {
    showToast('فشل الحفظ: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'حفظ المنتج';
  }
}

// ---------- التهيئة ----------
async function init() {
  try {
    const [products, cats] = await Promise.all([
      API.getProducts(),
      API.getCategories()
    ]);
    allProducts = products;
    buildSidebar(cats);
    renderHome();
    renderNew();
  } catch (err) {
    console.error('Init failed', err);
    document.getElementById('productContainer').innerHTML =
      '<div class="empty-state"><div class="icon">⚠️</div><p>فشل تحميل البيانات</p></div>';
  }

  await refreshAdminUI();
  await updateCartBadge();

  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = 'home';
  } else {
    navigate();
  }
}

init();