const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'business_data.db');
const schemaPath = path.join(__dirname, 'schema.sql');

const db = new sqlite3.Database(dbPath);

const migrateDatabase = async () => {
  console.log('开始数据库迁移...');
  
  try {
    // 读取新的数据库结构
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // 开始事务
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 1. 创建新表结构
    console.log('创建新表结构...');
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await new Promise((resolve, reject) => {
          db.run(statement, (err) => {
            if (err && !err.message.includes('already exists')) {
              console.warn('SQL执行警告:', err.message);
            }
            resolve(); // 继续执行，即使有些表已存在
          });
        });
      }
    }

    // 2. 数据迁移 - 从旧的sales表迁移到新的订单系统
    console.log('迁移销售数据...');
    
    // 检查旧的sales表是否存在数据
    const oldSalesData = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM sales LIMIT 1', (err, rows) => {
        if (err) resolve([]); // 表不存在，跳过
        else resolve(rows);
      });
    });

    if (oldSalesData.length > 0) {
      // 迁移销售数据到新的订单系统
      await new Promise((resolve, reject) => {
        db.all('SELECT * FROM sales', async (err, salesRows) => {
          if (err) {
            resolve();
            return;
          }

          for (const sale of salesRows) {
            // 创建客户（如果不存在）
            let customerId = null;
            if (sale.customer_name) {
              await new Promise((resolve2) => {
                db.run(`
                  INSERT OR IGNORE INTO customers (name, customer_type, created_at)
                  VALUES (?, 'retail', ?)
                `, [sale.customer_name, sale.created_at], function() {
                  resolve2();
                });
              });

              // 获取客户ID
              await new Promise((resolve2) => {
                db.get('SELECT id FROM customers WHERE name = ?', [sale.customer_name], (err, row) => {
                  customerId = row ? row.id : null;
                  resolve2();
                });
              });
            }

            // 创建销售订单
            const orderNo = `SO${Date.now()}${Math.random().toString(36).substr(2, 4)}`;
            await new Promise((resolve2) => {
              db.run(`
                INSERT OR IGNORE INTO sales_orders 
                (order_no, customer_id, order_date, subtotal, total_amount, paid_amount, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [orderNo, customerId, sale.date, sale.total_amount, sale.total_amount, sale.total_amount, sale.created_at], function() {
                const orderId = this.lastID;
                
                // 查找或创建商品
                db.run(`
                  INSERT OR IGNORE INTO products 
                  (name, selling_price, current_stock, min_stock, created_at)
                  VALUES (?, ?, 100, 10, ?)
                `, [sale.product_name, sale.unit_price, sale.created_at], function() {
                  
                  // 获取商品ID
                  db.get('SELECT id FROM products WHERE name = ?', [sale.product_name], (err, productRow) => {
                    if (productRow) {
                      // 创建订单明细
                      db.run(`
                        INSERT INTO sales_order_items
                        (order_id, product_id, quantity, unit_price, line_total)
                        VALUES (?, ?, ?, ?, ?)
                      `, [orderId, productRow.id, sale.quantity, sale.unit_price, sale.total_amount]);
                    }
                    resolve2();
                  });
                });
              });
            });
          }
          resolve();
        });
      });
    }

    // 3. 迁移库存数据
    console.log('迁移库存数据...');
    const oldInventoryData = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM inventory LIMIT 1', (err, rows) => {
        if (err) resolve([]);
        else resolve(rows);
      });
    });

    if (oldInventoryData.length > 0) {
      await new Promise((resolve) => {
        db.all('SELECT * FROM inventory', (err, inventoryRows) => {
          if (err) {
            resolve();
            return;
          }

          inventoryRows.forEach((item, index) => {
            setTimeout(() => {
              // 获取分类ID
              db.get('SELECT id FROM categories WHERE name = ?', [item.category || '其他'], (err, categoryRow) => {
                const categoryId = categoryRow ? categoryRow.id : null;
                const costPrice = item.unit_cost || 0;
                const sellingPrice = costPrice > 0 ? costPrice * 1.3 : 0;
                
                db.run(`
                  INSERT OR REPLACE INTO products 
                  (name, category_id, current_stock, min_stock, max_stock, cost_price, selling_price, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  item.product_name,
                  categoryId,
                  item.current_stock,
                  item.min_stock || 10,
                  item.max_stock || 1000,
                  costPrice,
                  sellingPrice,
                  item.last_updated || new Date().toISOString()
                ]);
              });
              
              if (index === inventoryRows.length - 1) {
                resolve();
              }
            }, index * 10);
          });
        });
      });
    }

    // 4. 创建默认分类
    console.log('创建默认分类...');
    const defaultCategories = [
      '电子产品',
      '服装',
      '食品',
      '日用品',
      '其他'
    ];

    for (const category of defaultCategories) {
      await new Promise((resolve) => {
        db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [category], () => {
          resolve();
        });
      });
    }

    // 5. 创建默认供应商
    console.log('创建默认供应商...');
    const defaultSuppliers = [
      ['苹果公司', '库克', '400-123-4567'],
      ['华为公司', '任正非', '400-234-5678'],
      ['小米公司', '雷军', '400-345-6789'],
      ['联想公司', '杨元庆', '400-456-7890'],
      ['其他供应商', '联系人', '']
    ];

    for (const [name, contact, phone] of defaultSuppliers) {
      await new Promise((resolve) => {
        db.run(`
          INSERT OR IGNORE INTO suppliers (name, contact_person, phone) 
          VALUES (?, ?, ?)
        `, [name, contact, phone], () => {
          resolve();
        });
      });
    }

    // 提交事务
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('数据库迁移完成！');
    console.log('新增功能:');
    console.log('- 完整的订单管理系统');
    console.log('- 客户管理和会员系统');
    console.log('- 供应商管理');
    console.log('- 财务管理');
    console.log('- 库存变动跟踪');
    console.log('- 促销活动管理');
    console.log('- 系统配置和日志');

  } catch (error) {
    console.error('迁移失败:', error);
    // 回滚事务
    await new Promise((resolve) => {
      db.run('ROLLBACK', () => resolve());
    });
    throw error;
  }
};

// 如果直接运行此文件
if (require.main === module) {
  migrateDatabase().then(() => {
    db.close();
    process.exit(0);
  }).catch((error) => {
    console.error('迁移过程中出错:', error);
    db.close();
    process.exit(1);
  });
}

module.exports = migrateDatabase;