const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库连接
const dbPath = path.join(__dirname, '../database/business_data.db');

// 获取所有出货订单
router.get('/orders', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT 
      so.*,
      COUNT(si.id) as item_count,
      SUM(si.quantity) as total_quantity
    FROM shipping_orders so
    LEFT JOIN shipping_items si ON so.id = si.shipping_order_id
    GROUP BY so.id
    ORDER BY so.created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('获取出货订单失败:', err);
      return res.status(500).json({ error: '获取出货订单失败' });
    }
    
    res.json(rows);
  });
  
  db.close();
});

// 获取单个出货订单详情
router.get('/orders/:id', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const orderId = req.params.id;
  
  // 获取订单基本信息
  const orderQuery = `
    SELECT * FROM shipping_orders WHERE id = ?
  `;
  
  db.get(orderQuery, [orderId], (err, order) => {
    if (err) {
      console.error('获取出货订单详情失败:', err);
      return res.status(500).json({ error: '获取订单详情失败' });
    }
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    // 获取订单商品明细
    const itemsQuery = `
      SELECT * FROM shipping_items WHERE shipping_order_id = ?
    `;
    
    db.all(itemsQuery, [orderId], (err, items) => {
      if (err) {
        console.error('获取订单商品明细失败:', err);
        return res.status(500).json({ error: '获取商品明细失败' });
      }
      
      // 获取物流跟踪信息
      const trackingQuery = `
        SELECT * FROM tracking_records 
        WHERE shipping_order_id = ?
        ORDER BY timestamp DESC
      `;
      
      db.all(trackingQuery, [orderId], (err, tracking) => {
        if (err) {
          console.error('获取物流跟踪失败:', err);
          return res.status(500).json({ error: '获取物流跟踪失败' });
        }
        
        order.items = items;
        order.tracking_info = tracking;
        
        res.json(order);
      });
    });
  });
  
  db.close();
});

// 创建出货订单
router.post('/orders', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const {
    shipping_no,
    sales_order_id,
    sales_order_no,
    customer_name,
    customer_phone,
    shipping_address,
    shipping_method,
    carrier_name,
    carrier_code,
    tracking_no,
    shipping_date,
    expected_delivery,
    shipping_cost,
    weight,
    dimensions,
    notes,
    created_by,
    items
  } = req.body;
  
  const insertQuery = `
    INSERT INTO shipping_orders (
      shipping_no, sales_order_id, sales_order_no, customer_name, customer_phone,
      shipping_address, shipping_method, carrier_name, carrier_code, tracking_no,
      shipping_date, expected_delivery, shipping_cost, weight, dimensions, 
      notes, created_by, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'preparing')
  `;
  
  db.run(insertQuery, [
    shipping_no, sales_order_id, sales_order_no, customer_name, customer_phone,
    shipping_address, shipping_method, carrier_name, carrier_code, tracking_no,
    shipping_date, expected_delivery, shipping_cost, weight, dimensions,
    notes, created_by
  ], function(err) {
    if (err) {
      console.error('创建出货订单失败:', err);
      return res.status(500).json({ error: '创建出货订单失败' });
    }
    
    const shippingOrderId = this.lastID;
    
    // 如果有商品明细，插入商品数据
    if (items && items.length > 0) {
      const itemInsertQuery = `
        INSERT INTO shipping_items (
          shipping_order_id, product_id, product_name, quantity, 
          unit_price, batch_no, serial_no, location
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const stmt = db.prepare(itemInsertQuery);
      
      items.forEach(item => {
        stmt.run([
          shippingOrderId, item.product_id, item.product_name, item.quantity,
          item.unit_price, item.batch_no, item.serial_no, item.location
        ]);
      });
      
      stmt.finalize();
    }
    
    res.json({
      success: true,
      id: shippingOrderId,
      message: '出货订单创建成功'
    });
  });
  
  db.close();
});

// 更新出货订单状态
router.put('/orders/:id/status', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const orderId = req.params.id;
  const { status, actual_delivery } = req.body;
  
  let updateQuery = 'UPDATE shipping_orders SET status = ?, updated_at = CURRENT_TIMESTAMP';
  let params = [status];
  
  if (actual_delivery && status === 'delivered') {
    updateQuery += ', actual_delivery = ?';
    params.push(actual_delivery);
  }
  
  updateQuery += ' WHERE id = ?';
  params.push(orderId);
  
  db.run(updateQuery, params, function(err) {
    if (err) {
      console.error('更新出货订单状态失败:', err);
      return res.status(500).json({ error: '更新订单状态失败' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    res.json({ success: true, message: '订单状态更新成功' });
  });
  
  db.close();
});

// 获取物流承运商列表
router.get('/carriers', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT * FROM carriers 
    WHERE is_active = 1
    ORDER BY rating DESC, name ASC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('获取承运商列表失败:', err);
      return res.status(500).json({ error: '获取承运商列表失败' });
    }
    
    res.json(rows);
  });
  
  db.close();
});

// 添加物流跟踪记录
router.post('/orders/:id/tracking', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const orderId = req.params.id;
  const { tracking_no, timestamp, location, status, description, operator } = req.body;
  
  const insertQuery = `
    INSERT INTO tracking_records (
      shipping_order_id, tracking_no, timestamp, location, 
      status, description, operator
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(insertQuery, [
    orderId, tracking_no, timestamp, location, status, description, operator
  ], function(err) {
    if (err) {
      console.error('添加物流跟踪记录失败:', err);
      return res.status(500).json({ error: '添加跟踪记录失败' });
    }
    
    res.json({
      success: true,
      id: this.lastID,
      message: '物流跟踪记录添加成功'
    });
  });
  
  db.close();
});

// 获取打包任务列表
router.get('/packing-tasks', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT 
      pt.*,
      so.customer_name,
      so.shipping_address,
      COUNT(pi.id) as item_count
    FROM packing_tasks pt
    LEFT JOIN shipping_orders so ON pt.shipping_order_id = so.id
    LEFT JOIN packing_items pi ON pt.id = pi.packing_task_id
    GROUP BY pt.id
    ORDER BY 
      CASE pt.priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
      END,
      pt.created_at ASC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('获取打包任务失败:', err);
      return res.status(500).json({ error: '获取打包任务失败' });
    }
    
    res.json(rows);
  });
  
  db.close();
});

// 更新打包任务状态
router.put('/packing-tasks/:id/status', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const taskId = req.params.id;
  const { status, actual_time } = req.body;
  
  let updateQuery = 'UPDATE packing_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP';
  let params = [status];
  
  if (actual_time && status === 'completed') {
    updateQuery += ', actual_time = ?, completed_at = CURRENT_TIMESTAMP';
    params.push(actual_time);
  }
  
  updateQuery += ' WHERE id = ?';
  params.push(taskId);
  
  db.run(updateQuery, params, function(err) {
    if (err) {
      console.error('更新打包任务状态失败:', err);
      return res.status(500).json({ error: '更新任务状态失败' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '任务不存在' });
    }
    
    res.json({ success: true, message: '任务状态更新成功' });
  });
  
  db.close();
});

// 获取出货统计数据
router.get('/stats', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const queries = {
    totalOrders: 'SELECT COUNT(*) as count FROM shipping_orders',
    shippedOrders: "SELECT COUNT(*) as count FROM shipping_orders WHERE status IN ('shipped', 'in_transit', 'delivered')",
    deliveredOrders: "SELECT COUNT(*) as count FROM shipping_orders WHERE status = 'delivered'",
    totalShippingCost: 'SELECT SUM(shipping_cost) as total FROM shipping_orders',
    pendingTasks: "SELECT COUNT(*) as count FROM packing_tasks WHERE status != 'completed'",
    monthlyStats: `
      SELECT 
        DATE(shipping_date) as date,
        COUNT(*) as orders,
        SUM(shipping_cost) as cost
      FROM shipping_orders 
      WHERE shipping_date >= DATE('now', '-30 days')
      GROUP BY DATE(shipping_date)
      ORDER BY date
    `
  };
  
  const stats = {};
  const promises = [];
  
  Object.keys(queries).forEach(key => {
    promises.push(
      new Promise((resolve, reject) => {
        db.all(queries[key], [], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            stats[key] = key === 'monthlyStats' ? rows : (rows[0] || {});
            resolve();
          }
        });
      })
    );
  });
  
  Promise.all(promises)
    .then(() => {
      res.json(stats);
    })
    .catch(err => {
      console.error('获取出货统计数据失败:', err);
      res.status(500).json({ error: '获取统计数据失败' });
    })
    .finally(() => {
      db.close();
    });
});

module.exports = router;