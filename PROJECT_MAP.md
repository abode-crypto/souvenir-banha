# PROJECT MAP - سوفينير بنها

> آخر تحديث: 10 سبتمبر 2026 (نسخة PHP للنشر)

## [TECH_STACK]

| المكوّن | التقنية | الإصدار | السبب |
|--------|---------|---------|-------|
| Backend | PHP (بديل Node) | 8.2 | متوافق مع استضافة InfinityFree المجانية (بلا بطاقة) |
| Database | MySQL / MariaDB | 10.4.x | عبر XAMPP محلياً، وMySQL مجاناً على InfinityFree |
| Runtime محلي | XAMPP | 8.2.12 | Apache + PHP + MariaDB معاً (`C:\xampp`) |
| الواجهة | HTML + CSS + JS | Vanilla SPA (Hash routing) | Frontend مُنسوخ كما هو من نسخة Node |
| Password | `password_hash/verify` (bcrypt $2y$) | - | تشفير كلمة سر الأدمن |
| Sessions | `$_SESSION` | - | جلسات الأدمن والسلة |
| Upload | حركة ملفات PHP (multipart parser يدوي للـ PUT) | - | رفع صور المنتجات إلى `uploads/` |
| API Client | JS Fetch (relative `api`) | - | يعمل تحت الجذر أو مجلد فرعي |

### ملاحظات:
- **نسخة Node السابقة** (Express + SQLite + Gmail SMTP) ما زالت كمرجع في `src/` وتعمل على `localhost:3000`، مع نسخة احتياطية كاملة في `C:\Users\abode\Documents\Backups\souvenir-banha-backup-2026-09-10_1950.zip`.
- كلمة سر الأدمن: `admin123` → hash `$2y$10$I.lWMRTM/2C4VK77SqwfN.JKXTRYlN1tD8oRaHZxRMiqpC9/2a1Vm` (تغيَّر عبر متغير `ADMIN_PASSWORD_HASH`).
- **إشعارات الطلبات**: على InfinityFree يُمنع SMTP الخارجي ← ستحتاج قراراً لاحقاً (HTTP API مثل Resend أو لوحة طلبات داخل الموقع). حالياً الطلبات تُحفظ فقط في قاعدة البيانات.
- إعدادات DB قابلة للتعديل عبر متغيرات بيئة: `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS`.

---

## [SYSTEM_FLOW]

### رحلة المستخدم (SPA - Hash Routing):

```
[الرئيسية]  ←→  [الجديد]  ←→  [التفاصيل]  ←→  [السلة]  ←→  [النجاح]
   │                                              │
   │  شريط الفئات الجانبي (9 فئات)                │ إتمام الطلب (اسم/هاتف/مدينة/عنوان)
   │  بطاقات المنتجات (صورة/سعر/مواصفات)         │
   ▼                                              ▼
[أدمن: دخول بكلمة سر] → [إضافة/تعديل/حذف منتج]   [طلب محفوظ في DB]
```

### الفئات (9):
فن الريزن · تجفيف الورود · كتب الكتاب · صواني الشبكة · طارات الخطوبة · سبوع البيبي · مجات طباعة و ديجيتال حراري · التخرج · بوكيهات

---

## [ARCHITECTURE]

### نسخة PHP (النشر):

```
php/                                  # الشيفرة المصدرية لنشر PHP
├── index.html                        # الصفحة الوحيدة (SPA - منسوخة من نسخة Node)
├── css/style.css
├── js/
│   ├── api.js                        # base: 'api' (نسبي)
│   └── app.js
├── uploads/                          # صور المنتجات المرفوعة (+ .htaccess يمنع تنفيذ PHP)
├── .htaccess                         # RewriteRule: ^api/(.*)$ → api/index.php?route=$1
├── e2e-php.mjs                       # اختبارات E2E (تشغيل: node e2e-php.mjs) 29/29 ✅
└── api/
    ├── index.php                     # الراوتر: session_start + dispatcher
    └── inc/
        ├── .htaccess                 # منع الوصول المباشر
        ├── config.php                # DB + ADMIN_PASSWORD_HASH + المسارات
        ├── db.php                    # PDO MySQL
        ├── helpers.php               # json_out / require_admin / multipart parser / upload
        ├── products.php              # قائمة + CRUD + رفع صور
        ├── categories.php            # GET قائمة الفئات مع product_count
        ├── admin.php                 # login/logout/status (bcrypt)
        ├── cart.php                  # سلة $_SESSION
        └── orders.php                # إنشاء/استعراض الطلبات (uuid)
```

### نسخة Node (مرجع قديم): انظر `src/` — Express + SQLite + Gmail SMTP.

### قاعدة البيانات (MySQL - DB: `souvenir_banha`):

| الجدول | الحقول |
|--------|--------|
| `categories` | id, name (UNIQUE) |
| `products` | id, name, category, specs, price, oldPrice, img, description, created_at |
| `orders` | id, uuid (UNIQUE), customer_name/phone/address/city, total, status, created_at |
| `order_items` | id, order_id (FK CASCADE), product_id (FK SET NULL), quantity, price |

ملاحظة شفرة: `price`/`oldPrice` تُحوَّل إلى float عند إخراج JSON (حقول DECIMAL في MySQL تكون نصوصاً).

---

## [API_ENDPOINTS] - ✅ 29/29 مختبرة على نسخة PHP

### المنتجات:
| Method | Endpoint | الحالة |
|--------|----------|--------|
| GET | `/api/products` (+`?category=`) | ✅ |
| GET | `/api/products/new` | ✅ |
| POST | `/api/products` (أدمن، multipart + صورة إلزامية) | ✅ 201 |
| PUT | `/api/products/:id` (أدمن، multipart) | ✅ |
| DELETE | `/api/products/:id` (أدمن) | ✅ (يحذف order_items المرتبطة) |

### الفئات / الأدمن:
| Method | Endpoint | الحالة |
|--------|----------|--------|
| GET | `/api/categories` | ✅ |
| POST | `/api/admin/login` | ✅ |
| POST | `/api/admin/logout` | ✅ |
| GET | `/api/admin/status` | ✅ |

### السلة / الطلبات:
| Method | Endpoint | الحالة |
|--------|----------|--------|
| GET | `/api/cart` | ✅ |
| POST | `/api/cart/add` | ✅ |
| PUT | `/api/cart/update` | ✅ |
| DELETE | `/api/cart/:productId` | ✅ |
| POST | `/api/orders` | ✅ 201 + يفرّغ السلة |
| GET | `/api/orders/:uuid` | ✅ |

- السلة ترجع `image` من حقل `img` للمنتج (إصلاح خطأ نسخة Node الذي كان يرجع `undefined`).
- الأخطاء: `{error: "..."}` بأكواد 400/401/404/405.

---

## [LOCAL TESTING]

1. شغّل Apache + MySQL من XAMPP: `C:\xampp\apache\bin\httpd.exe` و `C:\xampp\mysql\bin\mysqld.exe`.
2. انسخ محتويات `php/` إلى جذر `C:\xampp\htdocs\` (الموقع = `http://localhost/`).
3. أنشئ قاعدة البيانات واستوردها من `data/mysql-export.sql`:
   `mysql --default-character-set=utf8mb4 -u root -e "source data/mysql-export.sql"` (بعد إنشاء الـ DB).
4. `http://localhost/` للموقع، و`http://localhost/api/products` للـ API.
5. اختبارات E2E: `node e2e-php.mjs` → 29/29.

> لاحظ: استخدم `--default-character-set=utf8mb4` عند الاستيراد وإلا تتعرض البيانات العربية للتحويل المزدوج (mojibake).

---

## [ORPHANS & PENDING]

| # | البند | الحالة | ملاحظات |
|---|-------|--------|---------|
| 1 | الصور في DB | ⚠️ | `picsum.photos` مؤقتة - استبدلها برفع حقيقي عبر الأدمن |
| 2 | `ADMIN_PASSWORD_HASH` | ⚠️ | غيّر كلمة السر الافتراضية في الإنتاج |
| 3 | إشعار الطلبات | ⏳ | SMTP ممنوع على InfinityFree - قرار: Resend HTTP API أو لوحة طلبات في الموقع |
| 4 | تقييد حجم/نوع الصور | ✅ | 5MB + png/jpg/webp/gif/svg + فحص `getimagesize` |
| 5 | النشر أونلاين | ⏳ | InfinityFree (PHP 8.2 + MySQL) - لم يُرفع بعد |
| 6 | `C:\xampp\htdocs\index-xampp.php` | - | نسخة مؤقتة من index.php الأصلية لـ XAMPP |

---

## [COMMANDS]

```powershell
# تشغيل XAMPP
C:\xampp\apache\bin\httpd.exe          # Apache (ميناء 80)
C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini   # MySQL

# استيراد البيانات إلى MySQL (بعد إنشاء الـ DB)
& "C:\xampp\mysql\bin\mysql.exe" --default-character-set=utf8mb4 -u root -D souvenir_banha -e "source C:/Users/abode/Documents/Default Project/data/mysql-export.sql"

# سكربت التصدير الجديد (SQLite → MySQL SQL)
node data/export-mysql.js

# اختبارات E2E للنسخة PHP
node php/e2e-php.mjs
```

---

## [CHECKLIST]

- [x] PHP 8.2 + MariaDB على XAMPP محلياً
- [x] نقل 9 فئات + 19 منتج SQLite → MySQL (utf8mb4)
- [x] Backend PHP كامل (router + products + categories + admin + cart + orders + uploads)
- [x] إصلاح: `image` في السلة (`img` بدل `image`), وPUT multipart (parser يدوي)
- [x] الواجهة الأمامية تعمل بدون تعديل (base نسبي)
- [x] الاختبار الشامل E2E 29/29 ✅
- [ ] النشر على InfinityFree + اختبار أونلاين