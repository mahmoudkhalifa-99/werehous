# نظام ERP لإدارة المخازن

نظام متكامل لإدارة المخازن والمخزون باستخدام Node.js و MySQL.

## المتطلبات

- Node.js (الإصدار 14 أو أحدث)
- MySQL (الإصدار 5.7 أو أحدث)
- npm أو yarn

## التثبيت

1. **استنساخ المشروع:**
```bash
git clone <repository-url>
cd backend
```

2. **تثبيت الحزم:**
```bash
npm install
```

3. **إعداد قاعدة البيانات:**
```bash
# الدخول إلى MySQL
mysql -u root -p

# تنفيذ ملف schema.sql
source schema.sql
```

أو:
```bash
mysql -u root -p < schema.sql
```

4. **إعداد ملف `.env`:**
أنشئ ملف `.env` في المجلد الرئيسي وأضف:
```env
MYSQLHOST=localhost
MYSQLUSER=root
MYSQLPASSWORD=your_password
MYSQLDATABASE=erp_system
MYSQLPORT=3306
PORT=3000
```

5. **تشغيل السيرفر:**
```bash
# للتشغيل العادي
npm start

# للتطوير مع إعادة التشغيل التلقائي
npm run dev
```

## APIs المتاحة

### المستخدمين
- `GET /api/users` - جلب كل المستخدمين
- `GET /api/users/:id` - جلب مستخدم محدد
- `POST /api/users` - إضافة مستخدم
- `PUT /api/users/:id` - تحديث مستخدم
- `DELETE /api/users/:id` - حذف مستخدم

### المخازن
- `GET /api/warehouses` - جلب كل المخازن
- `GET /api/warehouses/:id` - جلب مخزن محدد
- `POST /api/warehouses` - إضافة مخزن
- `PUT /api/warehouses/:id` - تحديث مخزن
- `DELETE /api/warehouses/:id` - حذف مخزن

### المنتجات
- `GET /api/products` - جلب كل المنتجات
- `GET /api/products/:id` - جلب منتج محدد
- `POST /api/products` - إضافة منتج
- `PUT /api/products/:id` - تحديث منتج
- `DELETE /api/products/:id` - حذف منتج

### المخزون
- `GET /api/inventory` - جلب كل المخزون
- `GET /api/inventory/warehouse/:warehouse_id` - مخزون مخزن معين
- `GET /api/inventory/:warehouse_id/:product_id` - مخزون منتج في مخزن
- `POST /api/inventory` - إضافة/تحديث مخزون
- `PUT /api/inventory/:warehouse_id/:product_id` - تحديث كمية

### حركات المخزون
- `GET /api/stock-movements` - جلب كل الحركات
- `POST /api/stock-movements` - تسجيل حركة جديدة

### الفئات
- `GET /api/categories` - جلب كل الفئات
- `POST /api/categories` - إضافة فئة

### التقارير
- `GET /api/reports/low-stock` - تقرير المخزون المنخفض
- `GET /api/reports/inventory-value` - تقرير قيمة المخزون
- `GET /api/reports/movements` - تقرير الحركات
- `GET /api/dashboard/stats` - إحصائيات Dashboard

## أمثلة الاستخدام

### مثال 1: جلب كل المنتجات
```javascript
fetch('http://localhost:3000/api/products')
  .then(res => res.json())
  .then(data => console.log(data));
```

### مثال 2: إضافة منتج جديد
```javascript
fetch('http://localhost:3000/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'منتج جديد',
    sku: 'PRD-001',
    category_id: 1,
    unit_price: 100,
    reorder_level: 10
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

### مثال 3: تسجيل حركة مخزون
```javascript
fetch('http://localhost:3000/api/stock-movements', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    warehouse_id: 1,
    product_id: 1,
    movement_type: 'in',
    quantity: 50,
    user_id: 1,
    reference_number: 'PO-2025-100',
    notes: 'شراء من المورد'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

## الميزات

✅ إدارة المستخدمين والصلاحيات
✅ إدارة المخازن المتعددة
✅ إدارة المنتجات والفئات
✅ تتبع المخزون في الوقت الفعلي
✅ تسجيل حركات المخزون (وارد/صادر/نقل/تعديل)
✅ تقارير شاملة
✅ تنبيهات المخزون المنخفض
✅ حساب قيمة المخزون

## المساهمة

نرحب بمساهماتكم! يرجى فتح issue أو pull request.

## الترخيص

ISC