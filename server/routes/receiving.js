const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库连接
const dbPath = path.join(__dirname, '../database/business_data.db');

// 获取所有收货订单
router.get('/orders', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT 
      ro.*,
      COUNT(ri.id) as item_count,
      SUM(ri.ordered_quantity) as total_ordered,
      SUM(ri.received_quantity) as total_received
    FROM receiving_orders ro
    LEFT JOIN receiving_items ri ON ro.id = ri.receiving_order_id
    GROUP BY ro.id
    ORDER BY ro.created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('获取收货订单失败:', err);
      return res.status(500).json({ error: '获取收货订单失败' });
    }
    
    res.json(rows);
  });
  
  db.close();
});

// 获取单个收货订单详情
router.get('/orders/:id', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const orderId = req.params.id;
  
  // 获取订单基本信息
  const orderQuery = `
    SELECT * FROM receiving_orders WHERE id = ?
  `;
  
  db.get(orderQuery, [orderId], (err, order) => {
    if (err) {
      console.error('获取收货订单详情失败:', err);
      return res.status(500).json({ error: '获取订单详情失败' });
    }
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    // 获取订单商品明细
    const itemsQuery = `
      SELECT * FROM receiving_items WHERE receiving_order_id = ?
    `;
    
    db.all(itemsQuery, [orderId], (err, items) => {
      if (err) {
        console.error('获取订单商品明细失败:', err);
        return res.status(500).json({ error: '获取商品明细失败' });
      }
      
      // 获取质检报告
      const reportQuery = `
        SELECT 
          ir.*,
          GROUP_CONCAT(
            json_object(
              'id', qc.id,
              'check_item', qc.check_item,
              'standard', qc.standard,
              'result', qc.result,
              'actual_value', qc.actual_value,
              'notes', qc.notes
            )
          ) as quality_checks_json
        FROM inspection_reports ir
        LEFT JOIN quality_checks qc ON ir.id = qc.inspection_report_id
        WHERE ir.receiving_order_id = ?
        GROUP BY ir.id
      `;
      
      db.get(reportQuery, [orderId], (err, report) => {
        if (err) {
          console.error('获取质检报告失败:', err);
          return res.status(500).json({ error: '获取质检报告失败' });
        }
        
        order.items = items;
        
        if (report) {
          // 解析质检项目JSON
          if (report.quality_checks_json) {
            try {
              const checks = report.quality_checks_json.split(',').map(check => JSON.parse(check));
              report.quality_checks = checks;
            } catch (e) {
              report.quality_checks = [];
            }
          }
          delete report.quality_checks_json;
          order.inspection_report = report;
        }
        
        res.json(order);
      });
    });
  });
  
  db.close();
});

// 创建收货订单
router.post('/orders', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const {
    receiving_no,
    purchase_order_id,
    purchase_order_no,
    supplier_id,
    supplier_name,
    supplier_contact,
    planned_date,
    receiving_date,
    total_amount,
    inspector,
    warehouse_location,
    delivery_note,
    notes,
    created_by,
    items
  } = req.body;
  
  const insertQuery = `
    INSERT INTO receiving_orders (
      receiving_no, purchase_order_id, purchase_order_no, supplier_id, supplier_name,
      supplier_contact, planned_date, receiving_date, total_amount, inspector,
      warehouse_location, delivery_note, notes, created_by, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `;
  
  db.run(insertQuery, [
    receiving_no, purchase_order_id, purchase_order_no, supplier_id, supplier_name,
    supplier_contact, planned_date, receiving_date, total_amount, inspector,
    warehouse_location, delivery_note, notes, created_by
  ], function(err) {
    if (err) {
      console.error('创建收货订单失败:', err);
      return res.status(500).json({ error: '创建收货订单失败' });
    }
    
    const receivingOrderId = this.lastID;
    
    // 如果有商品明细，插入商品数据
    if (items && items.length > 0) {
      const itemInsertQuery = `
        INSERT INTO receiving_items (
          receiving_order_id, product_id, product_name, product_code,
          ordered_quantity, unit_price, batch_no, location
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const stmt = db.prepare(itemInsertQuery);
      
      items.forEach(item => {
        stmt.run([
          receivingOrderId, item.product_id, item.product_name, item.product_code,
          item.ordered_quantity, item.unit_price, item.batch_no, item.location
        ]);
      });
      
      stmt.finalize();
    }
    
    res.json({
      success: true,
      id: receivingOrderId,
      message: '收货订单创建成功'
    });
  });
  
  db.close();
});

// 更新收货订单状态
router.put('/orders/:id/status', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const orderId = req.params.id;
  const { status, received_amount, quality_score } = req.body;
  
  let updateQuery = 'UPDATE receiving_orders SET status = ?, updated_at = CURRENT_TIMESTAMP';
  let params = [status];
  
  if (received_amount !== undefined) {
    updateQuery += ', received_amount = ?';
    params.push(received_amount);
  }
  
  if (quality_score !== undefined) {
    updateQuery += ', quality_score = ?';
    params.push(quality_score);
  }
  
  updateQuery += ' WHERE id = ?';
  params.push(orderId);
  
  db.run(updateQuery, params, function(err) {
    if (err) {
      console.error('更新收货订单状态失败:', err);
      return res.status(500).json({ error: '更新订单状态失败' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    res.json({ success: true, message: '订单状态更新成功' });
  });
  
  db.close();
});

// 更新收货商品明细
router.put('/orders/:id/items', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const orderId = req.params.id;
  const { items } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: '商品明细不能为空' });
  }
  
  // 使用事务处理批量更新
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    const updateStmt = db.prepare(`
      UPDATE receiving_items 
      SET received_quantity = ?, accepted_quantity = ?, rejected_quantity = ?,
          quality_status = ?, inspection_notes = ?
      WHERE id = ? AND receiving_order_id = ?
    `);
    
    items.forEach(item => {
      updateStmt.run([
        item.received_quantity,
        item.accepted_quantity,
        item.rejected_quantity,
        item.quality_status,
        item.inspection_notes,
        item.id,
        orderId
      ]);
    });
    
    updateStmt.finalize((err) => {
      if (err) {
        db.run('ROLLBACK');
        console.error('更新收货商品明细失败:', err);
        return res.status(500).json({ error: '更新商品明细失败' });
      }
      
      db.run('COMMIT', (err) => {
        if (err) {
          console.error('提交事务失败:', err);
          return res.status(500).json({ error: '更新失败' });
        }
        
        res.json({ success: true, message: '收货明细更新成功' });
      });
    });
  });
  
  db.close();
});

// 创建质检报告
router.post('/orders/:id/inspection', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const orderId = req.params.id;
  const {
    inspector,
    inspection_date,
    overall_rating,
    defect_summary,
    recommendation,
    photos,
    certificates,
    quality_checks
  } = req.body;
  
  const insertReportQuery = `
    INSERT INTO inspection_reports (
      receiving_order_id, inspector, inspection_date, overall_rating,
      defect_summary, recommendation, photos, certificates
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(insertReportQuery, [
    orderId, inspector, inspection_date, overall_rating,
    defect_summary, recommendation, 
    photos ? JSON.stringify(photos) : null,
    certificates ? JSON.stringify(certificates) : null
  ], function(err) {
    if (err) {
      console.error('创建质检报告失败:', err);
      return res.status(500).json({ error: '创建质检报告失败' });
    }
    
    const reportId = this.lastID;
    
    // 如果有质检项目，插入质检数据
    if (quality_checks && quality_checks.length > 0) {
      const checkInsertQuery = `
        INSERT INTO quality_checks (
          inspection_report_id, check_item, standard, result, actual_value, notes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const stmt = db.prepare(checkInsertQuery);
      
      quality_checks.forEach(check => {
        stmt.run([
          reportId, check.check_item, check.standard, check.result,
          check.actual_value, check.notes
        ]);
      });
      
      stmt.finalize();
    }
    
    // 同时更新收货订单的质量评分
    const updateOrderQuery = `
      UPDATE receiving_orders 
      SET quality_score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(updateOrderQuery, [overall_rating, orderId], (err) => {
      if (err) {
        console.error('更新订单质量评分失败:', err);
      }
    });
    
    res.json({
      success: true,
      id: reportId,
      message: '质检报告创建成功'
    });
  });
  
  db.close();
});

// 获取异常记录列表
router.get('/exceptions', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT 
      er.*,
      ro.supplier_name as supplier_name_from_order
    FROM exception_records er
    LEFT JOIN receiving_orders ro ON er.receiving_order_id = ro.id
    WHERE er.receiving_order_id IS NOT NULL
    ORDER BY er.created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('获取异常记录失败:', err);
      return res.status(500).json({ error: '获取异常记录失败' });
    }
    
    res.json(rows);
  });
  
  db.close();
});

// 创建异常记录
router.post('/exceptions', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const {
    receiving_order_id,
    reference_no,
    supplier_name,
    exception_type,
    description,
    quantity_affected,
    financial_impact,
    handler,
    evidence_files
  } = req.body;
  
  const insertQuery = `
    INSERT INTO exception_records (
      receiving_order_id, reference_no, supplier_name, exception_type,
      description, quantity_affected, financial_impact, handler,
      evidence_files, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'reported')
  `;
  
  db.run(insertQuery, [
    receiving_order_id, reference_no, supplier_name, exception_type,
    description, quantity_affected, financial_impact, handler,
    evidence_files ? JSON.stringify(evidence_files) : null
  ], function(err) {
    if (err) {
      console.error('创建异常记录失败:', err);
      return res.status(500).json({ error: '创建异常记录失败' });
    }
    
    res.json({
      success: true,
      id: this.lastID,
      message: '异常记录创建成功'
    });
  });
  
  db.close();
});

// 更新异常记录状态
router.put('/exceptions/:id/status', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const exceptionId = req.params.id;
  const { status, resolution, responsible_party, resolved_date } = req.body;
  
  let updateQuery = 'UPDATE exception_records SET status = ?, updated_at = CURRENT_TIMESTAMP';
  let params = [status];
  
  if (resolution) {
    updateQuery += ', resolution = ?';
    params.push(resolution);
  }
  
  if (responsible_party) {
    updateQuery += ', responsible_party = ?';
    params.push(responsible_party);
  }
  
  if (resolved_date && status === 'resolved') {
    updateQuery += ', resolved_date = ?';
    params.push(resolved_date);
  }
  
  updateQuery += ' WHERE id = ?';
  params.push(exceptionId);
  
  db.run(updateQuery, params, function(err) {
    if (err) {
      console.error('更新异常记录状态失败:', err);
      return res.status(500).json({ error: '更新异常状态失败' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '异常记录不存在' });
    }
    
    res.json({ success: true, message: '异常状态更新成功' });
  });
  
  db.close();
});

// 获取供应商评价列表
router.get('/supplier-evaluations', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const query = `
    SELECT * FROM supplier_evaluations
    ORDER BY evaluation_period DESC, overall_rating DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('获取供应商评价失败:', err);
      return res.status(500).json({ error: '获取供应商评价失败' });
    }
    
    res.json(rows);
  });
  
  db.close();
});

// 创建供应商评价
router.post('/supplier-evaluations', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const {
    supplier_id,
    supplier_name,
    evaluation_period,
    delivery_rating,
    quality_rating,
    service_rating,
    improvement_suggestions,
    created_by
  } = req.body;
  
  // 计算综合评分
  const overall_rating = (delivery_rating + quality_rating + service_rating) / 3;
  
  const insertQuery = `
    INSERT INTO supplier_evaluations (
      supplier_id, supplier_name, evaluation_period, delivery_rating,
      quality_rating, service_rating, overall_rating, improvement_suggestions,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(insertQuery, [
    supplier_id, supplier_name, evaluation_period, delivery_rating,
    quality_rating, service_rating, overall_rating, improvement_suggestions,
    created_by
  ], function(err) {
    if (err) {
      console.error('创建供应商评价失败:', err);
      return res.status(500).json({ error: '创建供应商评价失败' });
    }
    
    res.json({
      success: true,
      id: this.lastID,
      message: '供应商评价创建成功'
    });
  });
  
  db.close();
});

// 获取收货统计数据
router.get('/stats', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  const queries = {
    totalOrders: 'SELECT COUNT(*) as count FROM receiving_orders',
    completedOrders: "SELECT COUNT(*) as count FROM receiving_orders WHERE status = 'completed'",
    pendingOrders: "SELECT COUNT(*) as count FROM receiving_orders WHERE status IN ('pending', 'inspecting')",
    totalAmount: 'SELECT SUM(total_amount) as total FROM receiving_orders',
    receivedAmount: 'SELECT SUM(received_amount) as total FROM receiving_orders',
    openExceptions: "SELECT COUNT(*) as count FROM exception_records WHERE status IN ('reported', 'investigating')",
    avgQualityScore: 'SELECT AVG(quality_score) as avg FROM receiving_orders WHERE quality_score IS NOT NULL',
    monthlyStats: `
      SELECT 
        DATE(receiving_date) as date,
        COUNT(*) as orders,
        SUM(total_amount) as total_amount,
        SUM(received_amount) as received_amount,
        AVG(quality_score) as avg_quality
      FROM receiving_orders 
      WHERE receiving_date >= DATE('now', '-30 days')
      GROUP BY DATE(receiving_date)
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
      console.error('获取收货统计数据失败:', err);
      res.status(500).json({ error: '获取统计数据失败' });
    })
    .finally(() => {
      db.close();
    });
});

module.exports = router;