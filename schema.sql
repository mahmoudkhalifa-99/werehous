-- إنشاء قاعدة البيانات
CREATE DATABASE IF NOT EXISTS erp_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE erp_system;

-- ==================== جدول المستخدمين ====================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user', 'manager', 'warehouse_keeper') DEFAULT 'user',
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== جدول المخازن ====================
CREATE TABLE IF NOT EXISTS warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(255) NOT NULL,
  manager_id INT,
  capacity DECIMAL(10, 2),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== جدول الفئات ====================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== جدول المنتجات ====================
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  sku VARCHAR(100) UNIQUE NOT NULL,
  category_id INT,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  reorder_level INT DEFAULT 10,
  barcode VARCHAR(100),
  image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_name (name),
  INDEX idx_sku (sku),
  INDEX idx_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== جدول المخزون ====================
CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_warehouse_product (warehouse_id, product_id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_warehouse (warehouse_id),
  INDEX idx_product (product_id),
  INDEX idx_quantity (quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== جدول حركات المخزون ====================
CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  product_id INT NOT NULL,
  movement_type ENUM('in', 'out', 'transfer', 'adjustment') NOT NULL,
  quantity INT NOT NULL,
  user_id INT NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_warehouse (warehouse_id),
  INDEX idx_product (product_id),
  INDEX idx_date (movement_date),
  INDEX idx_type (movement_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== جدول الموردين ====================
CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== إدراج بيانات تجريبية ====================

-- مستخدمين
INSERT INTO users (name, email, password, role, phone) VALUES
('أحمد محمد', 'admin@erp.com', 'admin123', 'admin', '01012345678'),
('سارة علي', 'sara@erp.com', 'user123', 'warehouse_keeper', '01023456789'),
('محمد حسن', 'mohamed@erp.com', 'user123', 'manager', '01034567890'),
('فاطمة خالد', 'fatma@erp.com', 'user123', 'user', '01045678901');

-- مخازن
INSERT INTO warehouses (name, location, manager_id, capacity, phone, address) VALUES
('المخزن الرئيسي', 'القاهرة', 3, 10000.00, '0223456789', 'شارع الهرم، الجيزة'),
('مخزن الإسكندرية', 'الإسكندرية', 2, 5000.00, '0334567890', 'طريق الكورنيش، الإسكندرية'),
('مخزن المنصورة', 'المنصورة', NULL, 3000.00, '0501234567', 'شارع الجيش، المنصورة');

-- فئات
INSERT INTO categories (name, description) VALUES
('الإلكترونيات', 'أجهزة إلكترونية ومعدات تقنية'),
('الأثاث', 'أثاث مكتبي ومنزلي'),
('القرطاسية', 'أدوات مكتبية وقرطاسية'),
('المواد الغذائية', 'مواد غذائية ومشروبات'),
('قطع الغيار', 'قطع غيار وصيانة');

-- منتجات
INSERT INTO products (name, description, sku, category_id, unit_price, reorder_level, barcode) VALUES
('لاب توب ديل', 'لاب توب ديل إنسبيرون 15، معالج i5، رام 8 جيجا', 'LAP-DELL-001', 1, 15000.00, 5, '1234567890123'),
('طابعة HP', 'طابعة HP LaserJet، طباعة ملونة', 'PRN-HP-001', 1, 3500.00, 3, '1234567890124'),
('مكتب خشبي', 'مكتب خشبي، مقاس 120x60 سم', 'DESK-WD-001', 2, 2500.00, 10, '1234567890125'),
('كرسي دوار', 'كرسي دوار مريح، قابل للتعديل', 'CHAIR-001', 2, 800.00, 15, '1234567890126'),
('دفتر 100 ورقة', 'دفتر سلك، 100 ورقة، A4', 'NOTE-A4-001', 3, 25.00, 100, '1234567890127'),
('قلم جاف أزرق', 'قلم جاف، حبر أزرق', 'PEN-BLUE-001', 3, 3.00, 200, '1234567890128'),
('شاشة سامسونج 24 بوصة', 'شاشة LED، 24 بوصة، Full HD', 'MON-SAM-24', 1, 2200.00, 8, '1234567890129'),
('ماوس لاسلكي', 'ماوس لاسلكي، USB', 'MOU-WL-001', 1, 150.00, 30, '1234567890130');

-- مخزون
INSERT INTO inventory (warehouse_id, product_id, quantity) VALUES
-- المخزن الرئيسي
(1, 1, 12),
(1, 2, 8),
(1, 3, 25),
(1, 4, 30),
(1, 5, 150),
(1, 6, 300),
(1, 7, 15),
(1, 8, 45),
-- مخزن الإسكندرية
(2, 1, 5),
(2, 2, 4),
(2, 3, 10),
(2, 4, 15),
(2, 5, 80),
(2, 6, 150),
-- مخزن المنصورة
(3, 5, 50),
(3, 6, 100),
(3, 7, 6),
(3, 8, 20);

-- حركات مخزون
INSERT INTO stock_movements (warehouse_id, product_id, movement_type, quantity, user_id, reference_number, notes) VALUES
(1, 1, 'in', 10, 1, 'PO-2025-001', 'شراء من المورد'),
(1, 2, 'in', 5, 1, 'PO-2025-002', 'شراء من المورد'),
(1, 1, 'out', 3, 2, 'SO-2025-001', 'بيع للعميل'),
(2, 3, 'in', 8, 2, 'PO-2025-003', 'نقل من المخزن الرئيسي'),
(1, 5, 'in', 200, 1, 'PO-2025-004', 'شراء قرطاسية'),
(1, 6, 'in', 500, 1, 'PO-2025-005', 'شراء أقلام'),
(2, 1, 'out', 2, 2, 'SO-2025-002', 'بيع لعميل الإسكندرية');

-- موردين
INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES
('شركة التقنية الحديثة', 'أحمد السيد', 'info@tech.com', '0223334444', 'مدينة نصر، القاهرة'),
('مؤسسة الأثاث المتميز', 'محمود علي', 'sales@furniture.com', '0233334444', 'شبرا، القاهرة'),
('شركة القرطاسية الذهبية', 'سمير حسن', 'contact@stationery.com', '0243334444', 'المنصورة');

-- ==================== Views مفيدة ====================

-- عرض المخزون الحالي مع تفاصيل المنتج والمخزن
CREATE OR REPLACE VIEW v_inventory_details AS
SELECT 
  i.id,
  w.name as warehouse_name,
  p.name as product_name,
  p.sku,
  c.name as category_name,
  i.quantity,
  p.unit_price,
  (i.quantity * p.unit_price) as total_value,
  p.reorder_level,
  CASE 
    WHEN i.quantity <= p.reorder_level THEN 'منخفض'
    WHEN i.quantity <= (p.reorder_level * 2) THEN 'متوسط'
    ELSE 'جيد'
  END as stock_status,
  i.last_updated
FROM inventory i
JOIN warehouses w ON i.warehouse_id = w.id
JOIN products p ON i.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

-- عرض حركات المخزون مع التفاصيل
CREATE OR REPLACE VIEW v_stock_movements_details AS
SELECT 
  sm.id,
  sm.movement_date,
  sm.movement_type,
  CASE sm.movement_type
    WHEN 'in' THEN 'وارد'
    WHEN 'out' THEN 'صادر'
    WHEN 'transfer' THEN 'نقل'
    WHEN 'adjustment' THEN 'تعديل'
  END as movement_type_ar,
  w.name as warehouse_name,
  p.name as product_name,
  p.sku,
  sm.quantity,
  p.unit_price,
  (sm.quantity * p.unit_price) as total_value,
  u.name as user_name,
  sm.reference_number,
  sm.notes
FROM stock_movements sm
JOIN warehouses w ON sm.warehouse_id = w.id
JOIN products p ON sm.product_id = p.id
JOIN users u ON sm.user_id = u.id;

-- عرض ملخص المخزون لكل مخزن
CREATE OR REPLACE VIEW v_warehouse_summary AS
SELECT 
  w.id,
  w.name as warehouse_name,
  w.location,
  COUNT(DISTINCT i.product_id) as total_products,
  SUM(i.quantity) as total_items,
  SUM(i.quantity * p.unit_price) as total_value,
  u.name as manager_name
FROM warehouses w
LEFT JOIN inventory i ON w.id = i.warehouse_id
LEFT JOIN products p ON i.product_id = p.id
LEFT JOIN users u ON w.manager_id = u.id
GROUP BY w.id, w.name, w.location, u.name;

-- ==================== Stored Procedures ====================

-- إجراء لنقل المخزون بين مخزنين
DELIMITER //

CREATE PROCEDURE sp_transfer_stock(
  IN p_from_warehouse_id INT,
  IN p_to_warehouse_id INT,
  IN p_product_id INT,
  IN p_quantity INT,
  IN p_user_id INT,
  IN p_reference_number VARCHAR(100),
  IN p_notes TEXT
)
BEGIN
  DECLARE v_current_quantity INT;
  
  -- التحقق من الكمية المتاحة
  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;
  
  IF v_current_quantity IS NULL OR v_current_quantity < p_quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'الكمية غير كافية في المخزن المصدر';
  END IF;
  
  -- بدء المعاملة
  START TRANSACTION;
  
  -- تسجيل حركة صادر من المخزن المصدر
  INSERT INTO stock_movements (warehouse_id, product_id, movement_type, quantity, user_id, reference_number, notes)
  VALUES (p_from_warehouse_id, p_product_id, 'transfer', p_quantity, p_user_id, p_reference_number, CONCAT('نقل إلى مخزن آخر - ', p_notes));
  
  -- تسجيل حركة وارد للمخزن المستهدف
  INSERT INTO stock_movements (warehouse_id, product_id, movement_type, quantity, user_id, reference_number, notes)
  VALUES (p_to_warehouse_id, p_product_id, 'transfer', p_quantity, p_user_id, p_reference_number, CONCAT('نقل من مخزن آخر - ', p_notes));
  
  -- تحديث المخزون في المخزن المصدر
  UPDATE inventory 
  SET quantity = quantity - p_quantity
  WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id;
  
  -- تحديث أو إضافة المخزون في المخزن المستهدف
  INSERT INTO inventory (warehouse_id, product_id, quantity)
  VALUES (p_to_warehouse_id, p_product_id, p_quantity)
  ON DUPLICATE KEY UPDATE quantity = quantity + p_quantity;
  
  COMMIT;
END //

DELIMITER ;

-- ==================== Triggers ====================

-- Trigger لمنع الكميات السالبة
DELIMITER //

CREATE TRIGGER trg_prevent_negative_inventory
BEFORE UPDATE ON inventory
FOR EACH ROW
BEGIN
  IF NEW.quantity < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'لا يمكن أن تكون الكمية سالبة';
  END IF;
END //

DELIMITER ;

-- ==================== تم إنشاء قاعدة البيانات بنجاح ====================