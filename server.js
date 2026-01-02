const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'ERP Warehouse System API',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// Test DB Connection
app.get('/test-db', (req, res) => {
  db.query('SELECT NOW() as time, DATABASE() as database_name', (err, rows) => {
    if (err) {
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: err.message 
      });
    }
    res.json({ success: true, data: rows });
  });
});

// ==================== المستخدمين (Users) ====================

// جلب كل المستخدمين
app.get('/api/users', (req, res) => {
  db.query('SELECT id, name, email, role, created_at FROM users', (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, count: results.length, data: results });
  });
});

// جلب مستخدم معين
app.get('/api/users/:id', (req, res) => {
  db.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', 
    [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, data: results[0] });
  });
});

// إضافة مستخدم جديد
app.post('/api/users', (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  
  db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, password, role || 'user'], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: result.insertId, name, email, role: role || 'user' }
    });
  });
});

// تحديث مستخدم
app.put('/api/users/:id', (req, res) => {
  const { name, email, role } = req.body;
  
  db.query('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
    [name, email, role, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, message: 'User updated successfully' });
  });
});

// حذف مستخدم
app.delete('/api/users/:id', (req, res) => {
  db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, message: 'User deleted successfully' });
  });
});

// ==================== المخازن (Warehouses) ====================

// جلب كل المخازن
app.get('/api/warehouses', (req, res) => {
  db.query('SELECT * FROM warehouses', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, count: results.length, data: results });
  });
});

// جلب مخزن معين
app.get('/api/warehouses/:id', (req, res) => {
  db.query('SELECT * FROM warehouses WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Warehouse not found' });
    res.json({ success: true, data: results[0] });
  });
});

// إضافة مخزن جديد
app.post('/api/warehouses', (req, res) => {
  const { name, location, manager_id, capacity } = req.body;
  
  if (!name || !location) {
    return res.status(400).json({ error: 'Name and location are required' });
  }
  
  db.query('INSERT INTO warehouses (name, location, manager_id, capacity) VALUES (?, ?, ?, ?)',
    [name, location, manager_id, capacity], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: { id: result.insertId, name, location }
    });
  });
});

// تحديث مخزن
app.put('/api/warehouses/:id', (req, res) => {
  const { name, location, manager_id, capacity } = req.body;
  
  db.query('UPDATE warehouses SET name = ?, location = ?, manager_id = ?, capacity = ? WHERE id = ?',
    [name, location, manager_id, capacity, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Warehouse not found' });
    res.json({ success: true, message: 'Warehouse updated successfully' });
  });
});

// حذف مخزن
app.delete('/api/warehouses/:id', (req, res) => {
  db.query('DELETE FROM warehouses WHERE id = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Warehouse not found' });
    res.json({ success: true, message: 'Warehouse deleted successfully' });
  });
});

// ==================== المنتجات (Products) ====================

// جلب كل المنتجات
app.get('/api/products', (req, res) => {
  const query = `
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
  `;
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, count: results.length, data: results });
  });
});

// جلب منتج معين
app.get('/api/products/:id', (req, res) => {
  const query = `
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `;
  
  db.query(query, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, data: results[0] });
  });
});

// إضافة منتج جديد
app.post('/api/products', (req, res) => {
  const { name, description, sku, category_id, unit_price, reorder_level } = req.body;
  
  if (!name || !sku) {
    return res.status(400).json({ error: 'Name and SKU are required' });
  }
  
  const query = 'INSERT INTO products (name, description, sku, category_id, unit_price, reorder_level) VALUES (?, ?, ?, ?, ?, ?)';
  
  db.query(query, [name, description, sku, category_id, unit_price, reorder_level], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { id: result.insertId, name, sku }
    });
  });
});

// تحديث منتج
app.put('/api/products/:id', (req, res) => {
  const { name, description, sku, category_id, unit_price, reorder_level } = req.body;
  
  const query = 'UPDATE products SET name = ?, description = ?, sku = ?, category_id = ?, unit_price = ?, reorder_level = ? WHERE id = ?';
  
  db.query(query, [name, description, sku, category_id, unit_price, reorder_level, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, message: 'Product updated successfully' });
  });
});

// حذف منتج
app.delete('/api/products/:id', (req, res) => {
  db.query('DELETE FROM products WHERE id = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, message: 'Product deleted successfully' });
  });
});

// ==================== المخزون (Inventory) ====================

// جلب كل المخزون
app.get('/api/inventory', (req, res) => {
  const query = `
    SELECT i.*, p.name as product_name, p.sku, w.name as warehouse_name
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    JOIN warehouses w ON i.warehouse_id = w.id
  `;
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, count: results.length, data: results });
  });
});

// جلب مخزون منتج في مخزن معين
app.get('/api/inventory/:warehouse_id/:product_id', (req, res) => {
  const query = `
    SELECT i.*, p.name as product_name, p.sku, w.name as warehouse_name
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    JOIN warehouses w ON i.warehouse_id = w.id
    WHERE i.warehouse_id = ? AND i.product_id = ?
  `;
  
  db.query(query, [req.params.warehouse_id, req.params.product_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Inventory not found' });
    res.json({ success: true, data: results[0] });
  });
});

// جلب مخزون مخزن معين
app.get('/api/inventory/warehouse/:warehouse_id', (req, res) => {
  const query = `
    SELECT i.*, p.name as product_name, p.sku, p.unit_price
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    WHERE i.warehouse_id = ?
  `;
  
  db.query(query, [req.params.warehouse_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, count: results.length, data: results });
  });
});

// تحديث كمية المخزون
app.put('/api/inventory/:warehouse_id/:product_id', (req, res) => {
  const { quantity } = req.body;
  
  if (quantity === undefined) {
    return res.status(400).json({ error: 'Quantity is required' });
  }
  
  const query = 'UPDATE inventory SET quantity = ?, last_updated = CURRENT_TIMESTAMP WHERE warehouse_id = ? AND product_id = ?';
  
  db.query(query, [quantity, req.params.warehouse_id, req.params.product_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Inventory not found' });
    res.json({ success: true, message: 'Inventory updated successfully' });
  });
});

// إضافة مخزون جديد
app.post('/api/inventory', (req, res) => {
  const { warehouse_id, product_id, quantity } = req.body;
  
  if (!warehouse_id || !product_id || quantity === undefined) {
    return res.status(400).json({ error: 'Warehouse ID, Product ID, and Quantity are required' });
  }
  
  const query = 'INSERT INTO inventory (warehouse_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?';
  
  db.query(query, [warehouse_id, product_id, quantity, quantity], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      success: true,
      message: 'Inventory updated successfully',
      data: { warehouse_id, product_id, quantity }
    });
  });
});

// ==================== حركات المخزون (Stock Movements) ====================

// جلب كل الحركات
app.get('/api/stock-movements', (req, res) => {
  const query = `
    SELECT sm.*, p.name as product_name, p.sku, 
           w.name as warehouse_name, u.name as user_name
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    JOIN warehouses w ON sm.warehouse_id = w.id
    JOIN users u ON sm.user_id = u.id
    ORDER BY sm.movement_date DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, count: results.length, data: results });
  });
});

// إضافة حركة مخزون جديدة
app.post('/api/stock-movements', (req, res) => {
  const { warehouse_id, product_id, movement_type, quantity, user_id, reference_number, notes } = req.body;
  
  if (!warehouse_id || !product_id || !movement_type || !quantity || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // بدء transaction
  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: err.message });
    
    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: err.message });
      }
      
      // إضافة الحركة
      const movementQuery = 'INSERT INTO stock_movements (warehouse_id, product_id, movement_type, quantity, user_id, reference_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?)';
      
      connection.query(movementQuery, [warehouse_id, product_id, movement_type, quantity, user_id, reference_number, notes], (err, result) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            res.status(500).json({ error: err.message });
          });
        }
        
        // تحديث المخزون
        const quantityChange = movement_type === 'in' ? quantity : -quantity;
        const inventoryQuery = 'INSERT INTO inventory (warehouse_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?';
        
        connection.query(inventoryQuery, [warehouse_id, product_id, quantityChange, quantityChange], (err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ error: err.message });
            });
          }
          
          connection.commit((err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ error: err.message });
              });
            }
            
            connection.release();
            res.status(201).json({
              success: true,
              message: 'Stock movement recorded successfully',
              data: { id: result.insertId, movement_type, quantity }
            });
          });
        });
      });
    });
  });
});

// ==================== الفئات (Categories) ====================

// جلب كل الفئات
app.get('/api/categories', (req, res) => {
  db.query('SELECT * FROM categories', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, count: results.length, data: results });
  });
});

// إضافة فئة جديدة
app.post('/api/categories', (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  db.query('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { id: result.insertId, name }
    });
  });
});

// ==================== التقارير (Reports) ====================

// تقرير المخزون المنخفض
app.get('/api/reports/low-stock', (req, res) => {
  const query = `
    SELECT p.id, p.name, p.sku, p.reorder_level,
           SUM(i.quantity) as total_quantity,
           GROUP_CONCAT(CONCAT(w.name, ': ', i.quantity) SEPARATOR ', ') as warehouse_stock
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    LEFT JOIN warehouses w ON i.warehouse_id = w.id
    GROUP BY p.id, p.name, p.sku, p.reorder_level
    HAVING total_quantity <= p.reorder_level OR total_quantity IS NULL
  `;
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, count: results.length, data: results });
  });
});

// تقرير قيمة المخزون
app.get('/api/reports/inventory-value', (req, res) => {
  const query = `
    SELECT w.id, w.name as warehouse_name,
           SUM(i.quantity * p.unit_price) as total_value,
           COUNT(DISTINCT i.product_id) as product_count,
           SUM(i.quantity) as total_quantity
    FROM warehouses w
    LEFT JOIN inventory i ON w.id = i.warehouse_id
    LEFT JOIN products p ON i.product_id = p.id
    GROUP BY w.id, w.name
  `;
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, data: results });
  });
});

// تقرير الحركات حسب الفترة
app.get('/api/reports/movements', (req, res) => {
  const { start_date, end_date, warehouse_id } = req.query;
  
  let query = `
    SELECT sm.movement_type,
           COUNT(*) as movement_count,
           SUM(sm.quantity) as total_quantity,
           SUM(sm.quantity * p.unit_price) as total_value
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (start_date) {
    query += ' AND sm.movement_date >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    query += ' AND sm.movement_date <= ?';
    params.push(end_date);
  }
  
  if (warehouse_id) {
    query += ' AND sm.warehouse_id = ?';
    params.push(warehouse_id);
  }
  
  query += ' GROUP BY sm.movement_type';
  
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, data: results });
  });
});

// ==================== Dashboard Statistics ====================
app.get('/api/dashboard/stats', (req, res) => {
  const queries = {
    totalProducts: 'SELECT COUNT(*) as count FROM products',
    totalWarehouses: 'SELECT COUNT(*) as count FROM warehouses',
    lowStockProducts: 'SELECT COUNT(DISTINCT p.id) as count FROM products p LEFT JOIN inventory i ON p.id = i.product_id GROUP BY p.id HAVING SUM(IFNULL(i.quantity, 0)) <= p.reorder_level',
    totalInventoryValue: 'SELECT SUM(i.quantity * p.unit_price) as value FROM inventory i JOIN products p ON i.product_id = p.id'
  };
  
  const results = {};
  let completed = 0;
  
  Object.keys(queries).forEach(key => {
    db.query(queries[key], (err, rows) => {
      if (!err) {
        results[key] = rows[0].count || rows[0].value || 0;
      }
      completed++;
      
      if (completed === Object.keys(queries).length) {
        res.json({ success: true, data: results });
      }
    });
  });
});

// ==================== Error Handler ====================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message 
  });
});

// ==================== 404 Handler ====================
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path 
  });
});

// ==================== Start Server ====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   ERP Warehouse Management System      ║
║   Backend Server Running               ║
╠════════════════════════════════════════╣
║   Port: ${PORT}                        ║
║   URL: http://localhost:${PORT}        ║
║   Database: ${process.env.MYSQLDATABASE}           ║
╚════════════════════════════════════════╝
  `);
});