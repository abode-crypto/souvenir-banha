const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'store.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Remove existing database
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('Old database removed');
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Init schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);
console.log('Schema created');

// Seed categories
const insertCategory = db.prepare('INSERT INTO categories (name) VALUES (?)');

const categories = [
  'فن الريزن',
  'تجفيف الورود',
  'كتب الكتاب',
  'صواني الشبكة',
  'طارات الخطوبة',
  'سبوع البيبي',
  'مجات طباعة و ديجيتال حراري',
  'التخرج',
  'بوكيهات'
];

const insertCategories = db.transaction(() => {
  for (const cat of categories) {
    insertCategory.run(cat);
  }
});
insertCategories();
console.log(`${categories.length} categories inserted`);

// Seed products
const insertProduct = db.prepare(`
  INSERT INTO products (name, category, specs, price, oldPrice, img, description)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const products = [
  // فن الريزن (Resin art)
  ['طقم فن الريزن كامل مع قوالب', 'فن الريزن', 'ريزن شفاف · قوالب متنوعة · ألوان', 450, 550, 'https://picsum.photos/seed/resin1/600/700', 'طقم احترافي كامل لصناعة قطع الريزن الفنية في المنزل، يشمل ريزن شفاف وألوان وقوالب متنوعة.'],
  ['ديكور ريزن مطلي بالذهب', 'فن الريزن', 'مطلي بالذهب · مقاس 20 سم', 300, null, 'https://picsum.photos/seed/resin2/600/700', 'قطعة ديكور فنية من الريزن المصبوب يدوياً مع لمسات ذهبية أنيقة.'],

  // تجفيف الورود (Dried flowers)
  ['بوكيه ورد مجفف جيبسي', 'تجفيف الورود', 'ورد مجفف طبيعي · لون بيج · ارتفاع 30 سم', 180, 220, 'https://picsum.photos/seed/dried1/600/700', 'بوكيه ورد مجفف طبيعي بألوان هادئة يصلح لتزيين المنزل والمكتب.'],
  ['فرز ورد مجفف ملون', 'تجفيف الورود', 'توليفة ملونة · 12 زهرة', 150, null, 'https://picsum.photos/seed/dried2/600/700', 'فرز ورد مجفف ملون جاهز للتنسيق في المزهريات يدوم لسنوات.'],

  // كتب الكتاب (Wedding books)
  ['كتاب قهوة ملكي للكتابة', 'كتب الكتاب', 'غلاف جلد فاخر · ذهبي', 500, 650, 'https://picsum.photos/seed/wed1/600/700', 'كتاب كتاب (إكسسوارات الزفاف) بغلاف جلد فاخر ونقوش ذهبية ملكية لتدوين أسماء المدعوين.'],
  ['كتاب كتاب وردي فاتح', 'كتب الكتاب', 'وردي فاتح · نقوش ناعمة', 380, null, 'https://picsum.photos/seed/wed2/600/700', 'كتاب أنيق لتسجيل حضور العرس بتصميم وردي فاتح يليق بالأفراح.'],

  // صواني الشبكة (Mesh trays)
  ['صينية شبكة مزخرفة', 'صواني الشبكة', 'معدن · لون ذهبي · مقاس 30 سم', 120, 150, 'https://picsum.photos/seed/tray1/600/700', 'صينية شبكة أنيقة بتصميم مزخرف ذهبي تصلح لعرض الحلويات والهدايا.'],
  ['صينية شبكة دائرية', 'صواني الشبكة', 'دائرية · قطر 25 سم', 95, null, 'https://picsum.photos/seed/tray2/600/700', 'صينية شبكة دائرية بسعر اقتصادي مثالية للتقديم والعرض.'],

  // طارات الخطوبة (Engagement rings setup)
  ['تربيزة طارة خطوبة كاملة', 'طارات الخطوبة', 'طارة + برواز + ورود صناعية', 900, 1200, 'https://picsum.photos/seed/eng1/600/700', 'تربيزة كاملة لطارة الخطوبة تشمل الإعداد الجاهز للتصوير بأجواء رومانسية.'],
  ['طارة خطوبة ورد صناعي', 'طارات الخطوبة', 'ورود صناعية بيضاء وذهبية', 250, null, 'https://picsum.photos/seed/eng2/600/700', 'طارة خطوبة مزينة بورود صناعية فاخرة جاهزة لليلة الخطوبة.'],

  // سبوع البيبي (Baby shower)
  ['تربيزة سبوع بيبي كاملة', 'سبوع البيبي', 'تشمل المنضدة والديكورات', 850, 1100, 'https://picsum.photos/seed/baby1/600/700', 'تجهيزات سبوع البيبي كاملة بألوان لطيفة تناسب استقبال المولود الجديد.'],
  ['بوكيه سبوع بيبي ورد', 'سبوع البيبي', 'ورد طبيعي + بالونات صغيرة', 240, null, 'https://picsum.photos/seed/baby2/600/700', 'بوكيه سبوع جاهز بألوان هادئة يضفي بهجة على حفل استقبال البيبي.'],

  // مجات طباعة (Custom mugs)
  ['مج حراري قابل للطباعة', 'مجات طباعة و ديجيتال حراري', 'سيراميك · أبيض · 350 مل', 60, null, 'https://picsum.photos/seed/mug1/600/700', 'مج أبيض جاهز للطباعة الحرارية بأي صورة أو تصميم تختاره.'],
  ['مج ديجيتال حراري مع ملعقة', 'مجات طباعة و ديجيتال حراري', 'مع ملعقة وغطاء · أسود', 120, 160, 'https://picsum.photos/seed/mug2/600/700', 'هدية مثالية كاملة مع ملعقة وغطاء، يمكن طباعة الصور عليه حرارياً.'],

  // التخرج (Graduation)
  ['بوكيه تخرج ورد + دبدوب', 'التخرج', 'ورد + دبدوب صغير · كريمي', 320, null, 'https://picsum.photos/seed/grad1/600/700', 'بوكيه تخرج مميز يجمع بين الورد والدبدوب لتهنئة الخريجين.'],
  ['بوكيه تخرج بالجواييش', 'التخرج', 'جواييش + ورود صناعية', 350, 420, 'https://picsum.photos/seed/grad2/600/700', 'بوكيه تخرج احتفالي مزين بالجواييش لعرضها في يوم التخرج.'],

  // بوكيهات (Bouquets)
  ['بوكيه ورد طبيعي مشكل', 'بوكيهات', 'ورد طبيعي · توليفة مشكلة', 280, null, 'https://picsum.photos/seed/bq1/600/700', 'بوكيه ورد طبيعي مشكل بألوان مبهجة يناسب الهدايا والمناسبات السعيدة.'],
  ['بوكيه ورد أحمر كلاسيك', 'بوكيهات', 'ورد أحمر طبيعي · ورود 12', 350, 400, 'https://picsum.photos/seed/bq2/600/700', 'بوكيه ورد أحمر كلاسيكي مثالي للتعبير عن الحب في المناسبات.'],
  ['بوكيه ورد أبيض مع أنثروريوم', 'بوكيهات', 'أبيض فاخر · أنثروريوم أحمر', 450, null, 'https://picsum.photos/seed/bq3/600/700', 'لوكيه أنيق من الورد الأبيض مع لمسات أنثروريوم حمراء جريئة.']
];

const insertProducts = db.transaction(() => {
  for (const prod of products) {
    insertProduct.run(...prod);
  }
});
insertProducts();
console.log(`${products.length} products inserted`);

db.close();
console.log('✅ Database seeded successfully!');