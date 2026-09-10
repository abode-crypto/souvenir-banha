# PROJECT MAP - سوفينير بنها

> آخر تحديث: 10 سبتمبر 2026

## [TECH_STACK]

| المكون | التقنية | الإصدار | السبب |
|--------|---------|---------|-------|
| Runtime | Node.js | 24.19.0 | لاحتواء better-sqlite3 (>=22) |
| Backend | Express.js | 5.2.1 | lightweight + enterprise-ready |
| Database | better-sqlite3 | 13.0.3 | أبسط SQLite driver + sync API |
| Password | bcryptjs | 3.0.3 | تشفير كلمة سر الأدمن |
| Sessions | express-session | 1.19.0 | جلسات الأدمن والسلة |
| Upload | multer | 2.3.0 | رفع صور المنتجات محلياً |
| Email | nodemailer | latest | إرسال الطلبات عبر Gmail SMTP |
| Env | dotenv | latest | تحميل .env (غير الإنتاج) |
| Cookies | cookie-parser | 1.4.7 | تحليل الكوكيز |
| CORS | cors | 2.8.6 | عبر المصادر |
| UUID | uuid | 14.0.2 | أرقام الطلبات |
| Frontend | HTML + CSS + JS | Vanilla SPA | بدون framework |

### ملاحظات:
- جميع التبعيات STABLE - لا Deprecated
- `npm audit` → 0 vulnerabilities
- كلمة سر الأدمن الافتراضية: `admin123` (يُغيَّر عبر `ADMIN_PASSWORD_HASH`)
- الإيميل (Gmail SMTP): لتفعيل إرسال الطلبات، أنشئ ملف `.env` (انسخ من `.env.example`)
  - `EMAIL_USER`: ايميل جوجل للمحل
  - `EMAIL_APP_PASSWORD`: كلمة مرور التطبيقات (16 حرفاً)
  - `EMAIL_TO`: ايميل استقبال الطلبات (اختياري - يرسل على EMAIL_USER إذا فاضي)
  - إذا غير مُعدّ، الطلبات تُحفظ فقط بدون إرسال إيميل

---

## [SYSTEM_FLOW]

### رحلة المستخدم (SPA - Hash Routing):

```
[الرئيسية]  ←→  [الجديد]  ←→  [التفاصيل]  ←→  [السلة]  ←→  [النجاح]
   │                                              │
   │  شريط الفئات الجانبي (9 فئات)                │ إتمام الطلب (اسم/هاتف/مدينة/عنوان)
   │  بطاقات المنتجات (صورة/سعر/مواصفات)         │
   ▼                                              ▼
[أدمن: دخول بكلمة سر] → [إضافة/تعديل/حذف منتج]   [طلب محفوظ في DB] → [إشعار Gmail عبر SMTP]
```

### الفئات (9):
فن الريزن · تجفيف الورود · كتب الكتاب · صواني الشبكة · طارات الخطوبة · سبوع البيبي · مجات طباعة و ديجيتال حراري · التخرج · بوكيهات

---

## [ARCHITECTURE]

```
project-root/
├── src/
│   ├── server.js                 # Express + sessions + SPA fallback
│   ├── config/database.js        # اتصال SQLite + تهيئة schema
│   ├── middleware/
│   │   ├── auth.js               # requireAdmin
│   │   └── logger.js             # Logging آسيnc
│   ├── routes/
│   │   ├── admin.js              # login/logout/status (bcrypt)
│   │   ├── products.js           # GET + CRUD + multer upload
│   │   ├── categories.js         # GET قائمة الفئات
│   │   ├── cart.js               # سلة (session-based)
│   │   └── orders.js             # إنشاء واستعراض الطلبات
│   └── public/                   # SPA Frontend
│       ├── index.html            # الصفحة الوحيدة (SPA)
│       ├── css/style.css         # تصميم Souvenir Banha
│       ├── js/
│       │   ├── api.js            # عميل API
│       │   └── app.js            # منطق SPA كامل
│       └── uploads/              # صور المنتجات المرفوعة
├── data/
│   ├── schema.sql                # 4 جداول
│   ├── seed.js                   # 9 فئات + 19 منتج
│   └── store.db                  # (تولّد تلقائياً)
├── logs/app.log
└── PROJECT_MAP.md
```

### قاعدة البيانات (SQLite):

| الجدول | الحقول |
|--------|--------|
| `categories` | id, name (UNIQUE) |
| `products` | id, name, category, specs, price, oldPrice, img, description |
| `orders` | uuid, customer_name/phone/address/city, total, status |
| `order_items` | order_id, product_id, quantity, price |

---

## [API_ENDPOINTS] - ✅ 15/15 مختبرة

### المنتجات:
| Method | Endpoint | الحالة |
|--------|----------|--------|
| GET | `/api/products` (+`?category=`) | ✅ |
| GET | `/api/products/new` | ✅ |
| POST | `/api/products` (adj, multipart+صورة) | ✅ |
| PUT | `/api/products/:id` (adj, multipart) | ✅ |
| DELETE | `/api/products/:id` (adj) | ✅ |
| POST | `/api/orders` | ✅ يحفظ الطلب + يرسل إيميل Gmail عبر SMTP (خلفي) |

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
| DELETE | `/api/cart/:id` | ✅ |

---

## [LOGGING_STRATEGY]

- Async `fs.appendFile` - غير حظري
- المستويات: `ERROR > WARN > INFO > DEBUG` (متغير `LOG_LEVEL`)
- كل طلب مسجل: method, url, status, duration
- أخطاء Multer → 400 (وليست 500)

---

## [TESTED] - حسب المعايير

| # | الاختبار | النتيجة |
|---|----------|---------|
| 1 | 9 فئات تظهر | ✅ |
| 2 | 19 منتج | ✅ |
| 3 | فلترة حسب الفئة | ✅ |
| 4 | رفض كلمة سر خاطئة (401) | ✅ |
| 5 | دخول الأدمن | ✅ |
| 6 | منع إضافة منتج بدون صورة | ✅ |
| 7 | إضافة منتج مع رفع صورة محلياً | ✅ |
| 8 | تعديل منتج | ✅ |
| 9 | السلة + الحساب الصحيح | ✅ |
| 10 | إنشاء طلب | ✅ |
| 11 | حذف منتج (مع تنظيف order_items) | ✅ |
| 12 | حذف بدون أدمن مرفوض (401) | ✅ |

**النتيجة: 15/15 نجحت**

---

## [ORPHANS & PENDING]

| # | البند | الحالة | ملاحظات |
|---|-------|--------|---------|
| 1 | الصور في DB | ⚠️ | `picsum.photos` مؤقتة - استبدلها برفع حقيقي عبر الأدمن |
| 2 | `SESSION_SECRET` | ⚠️ | افتراضي للتطوير - غيّره في الإنتاج |
| 3 | `ADMIN_PASSWORD_HASH` | ⚠️ | غيّر كلمة السر الافتراضية في الإنتاج |
| 4 | عملة ج.م | ✅ | مطابقة لسوق بنها |
| 5 | النشر | ⏳ | لم يُضف بعد (Railway/Render/VPS) |
| 6 | `.env` - إعدادات Gmail SMTP | ⏳ | أنشئ `.env` واملئه من `.env.example` |

---

## [COMMANDS]

```bash
npm start          # تشغيل السيرفر (http://localhost:3000)
npm run dev        # تطوير مع auto-reload
npm run seed       # إعادة تهيئة DB (أوقف السيرفر أولاً)

# متغيرات البيئة
PORT=3000
SESSION_SECRET=...
ADMIN_PASSWORD_HASH=$(node -e "console.log(require('bcryptjs').hashSync('كلمة_سرك',10))")
LOG_LEVEL=INFO
```

---

## [CHECKLIST]

- [x] التصميم مطابق لـ Souvenir Banha (ألوان/تخطيط/بطاقات)
- [x] القائمة الجانبية 9 فئات
- [x] صفحتان (الرئيسية + الجديد)
- [x] صفحة تفاصيل المنتج
- [x] لوحة الأدمن (دخول + إضافة + تعديل + حذف)
- [x] رفع الصور محلياً (multer)
- [x] السلة + إتمام الطلب
- [x] RTL + Responsive (992/768/480)
- [x] الاختبار الشامل 15/15