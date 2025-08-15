const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const DataImportExport = require('./utils/dataImportExport');
const errorHandler = require('./errorHandler');
const authRoutes = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');
const { MIGRATION_SCRIPTS } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
// Serve static files from the React app build directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

const upload = multer({ dest: 'uploads/' });

const db = new sqlite3.Database('./database/business_data.db', (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('已连接到SQLite数据库');
    initDatabase();
  }
});

// 将数据库实例添加到app对象，供路由使用
app.set('db', db);

// 初始化数据导入导出工具
const dataImportExport = new DataImportExport(db);

function initDatabase() {
  db.serialize(() => {
    // 创建用户表
    db.run(MIGRATION_SCRIPTS.users_table.sqlite, (err) => {
      if (err) {
        console.error('创建用户表失败:', err);
      } else {
        console.log('用户表创建成功');
        // 创建默认管理员账户
        createDefaultAdmin();
      }
    });

    // 创建会话表
    db.run(MIGRATION_SCRIPTS.sessions_table.sqlite, (err) => {
      if (err) {
        console.error('创建会话表失败:', err);
      } else {
        console.log('会话表创建成功');
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      product_name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      customer_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name TEXT NOT NULL UNIQUE,
      category TEXT,
      current_stock INTEGER NOT NULL,
      min_stock INTEGER DEFAULT 10,
      max_stock INTEGER DEFAULT 1000,
      unit_cost REAL,
      supplier TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

// 创建默认管理员账户
async function createDefaultAdmin() {
  const bcrypt = require('bcryptjs');
  
  db.get('SELECT id FROM users WHERE username = ?', ['admin'], async (err, row) => {
    if (err) {
      console.error('检查管理员账户失败:', err);
      return;
    }
    
    if (!row) {
      try {
        const defaultPassword = 'admin123';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        
        db.run(`
          INSERT INTO users (username, email, password_hash, role, status)
          VALUES (?, ?, ?, ?, ?)
        `, ['admin', 'admin@company.com', passwordHash, 'super_admin', 'active'], function(err) {
          if (err) {
            console.error('创建默认管理员失败:', err);
          } else {
            console.log('默认管理员账户创建成功:');
            console.log('用户名: admin');
            console.log('密码: admin123');
            console.log('请在首次登录后修改密码！');
            
            // 创建示例数据
            createSampleData();
          }
        });
      } catch (error) {
        console.error('密码加密失败:', error);
      }
    } else {
      // 如果管理员已存在，检查是否需要创建示例数据
      db.get('SELECT COUNT(*) as count FROM sales', (err, row) => {
        if (!err && row && row.count === 0) {
          createSampleData();
        }
      });
    }
  });
}

// 创建示例数据
function createSampleData() {
  console.log('正在创建示例数据...');
  
  // 添加示例商品
  const sampleProducts = [
    ['iPhone 15', '电子产品', 50, 10, 100, 5000, '苹果公司'],
    ['MacBook Pro', '电子产品', 20, 5, 50, 12000, '苹果公司'],
    ['无线耳机', '电子产品', 100, 20, 200, 300, '通用供应商'],
    ['智能手表', '电子产品', 30, 10, 80, 1500, '通用供应商'],
    ['平板电脑', '电子产品', 25, 8, 60, 2000, '通用供应商']
  ];
  
  sampleProducts.forEach(product => {
    db.run(`
      INSERT OR IGNORE INTO inventory 
      (product_name, category, current_stock, min_stock, max_stock, unit_cost, supplier)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, product, function(err) {
      if (err) {
        console.error('插入示例商品失败:', err);
      }
    });
  });
  
  // 添加示例销售数据
  const today = new Date();
  const sampleSales = [];
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const products = ['iPhone 15', 'MacBook Pro', '无线耳机', '智能手表', '平板电脑'];
    const customers = ['张三', '李四', '王五', '赵六', '孙七'];
    
    // 每天随机1-3条销售记录
    const recordCount = Math.floor(Math.random() * 3) + 1;
    
    for (let j = 0; j < recordCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      
      let unit_price;
      switch (product) {
        case 'iPhone 15': unit_price = 6999; break;
        case 'MacBook Pro': unit_price = 15999; break;
        case '无线耳机': unit_price = 399; break;
        case '智能手表': unit_price = 1999; break;
        case '平板电脑': unit_price = 2699; break;
        default: unit_price = 999;
      }
      
      const total_amount = quantity * unit_price;
      
      sampleSales.push([dateStr, product, '电子产品', quantity, unit_price, total_amount, customer]);
    }
  }
  
  sampleSales.forEach(sale => {
    db.run(`
      INSERT INTO sales (date, product_name, category, quantity, unit_price, total_amount, customer_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, sale, function(err) {
      if (err) {
        console.error('插入示例销售数据失败:', err);
      }
    });
  });
  
  console.log('示例数据创建完成！');
}

// 认证路由
app.use('/api/auth', authRoutes);

// 公开路由（不需要认证）
app.get('/api/dashboard/overview', (req, res) => {
  const queries = {
    totalSales: "SELECT SUM(total_amount) as total FROM sales WHERE date >= date('now', '-30 days')",
    totalProducts: "SELECT COUNT(DISTINCT product_name) as count FROM inventory",
    lowStockCount: "SELECT COUNT(*) as count FROM inventory WHERE current_stock <= min_stock",
    todaySales: "SELECT SUM(total_amount) as total FROM sales WHERE date = date('now')"
  };

  Promise.all([
    new Promise((resolve, reject) => {
      db.get(queries.totalSales, (err, row) => {
        if (err) reject(err);
        else resolve(row?.total || 0);
      });
    }),
    new Promise((resolve, reject) => {
      db.get(queries.totalProducts, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    }),
    new Promise((resolve, reject) => {
      db.get(queries.lowStockCount, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    }),
    new Promise((resolve, reject) => {
      db.get(queries.todaySales, (err, row) => {
        if (err) reject(err);
        else resolve(row?.total || 0);
      });
    })
  ]).then(([totalSales, totalProducts, lowStockCount, todaySales]) => {
    res.json({
      totalSales,
      totalProducts,
      lowStockCount,
      todaySales
    });
  }).catch(err => {
    console.error(err);
    res.status(500).json({ error: '获取概览数据失败' });
  });
});

app.get('/api/sales/trend', (req, res) => {
  const days = req.query.days || 30;
  db.all(`
    SELECT date, SUM(total_amount) as daily_total 
    FROM sales 
    WHERE date >= date('now', '-${days} days')
    GROUP BY date 
    ORDER BY date
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: '获取销售趋势数据失败' });
    } else {
      res.json(rows);
    }
  });
});

app.get('/api/inventory/status', (req, res) => {
  db.all(`
    SELECT product_name, current_stock, min_stock, max_stock,
           CASE 
             WHEN current_stock <= min_stock THEN 'low'
             WHEN current_stock >= max_stock THEN 'high'
             ELSE 'normal'
           END as status
    FROM inventory
    ORDER BY current_stock ASC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: '获取库存状态失败' });
    } else {
      res.json(rows);
    }
  });
});

app.get('/api/alerts', (req, res) => {
  db.all(`
    SELECT * FROM alerts 
    ORDER BY is_read ASC, created_at DESC 
    LIMIT 50
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: '获取预警信息失败' });
    } else {
      res.json(rows);
    }
  });
});

app.put('/api/alerts/:id/read', (req, res) => {
  const alertId = req.params.id;
  db.run(`
    UPDATE alerts 
    SET is_read = 1 
    WHERE id = ?
  `, [alertId], function(err) {
    if (err) {
      res.status(500).json({ error: '更新预警状态失败' });
    } else {
      res.json({ message: '预警状态已更新' });
    }
  });
});

app.get('/api/sales', (req, res) => {
  db.all(`
    SELECT * FROM sales 
    ORDER BY date DESC, created_at DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: '获取销售数据失败' });
    } else {
      res.json(rows);
    }
  });
});

// 需要认证的销售管理路由（写入操作）
app.post('/api/sales', authenticateToken, (req, res) => {
  const { date, product_name, category, quantity, unit_price, customer_name } = req.body;
  const total_amount = quantity * unit_price;
  
  db.run(`
    INSERT INTO sales (date, product_name, category, quantity, unit_price, total_amount, customer_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [date, product_name, category, quantity, unit_price, total_amount, customer_name], function(err) {
    if (err) {
      res.status(500).json({ error: '添加销售记录失败' });
    } else {
      db.run(`
        UPDATE inventory 
        SET current_stock = current_stock - ? 
        WHERE product_name = ?
      `, [quantity, product_name]);
      
      res.json({ id: this.lastID, message: '销售记录添加成功' });
    }
  });
});

// 需要认证的库存管理路由（写入操作）
app.post('/api/inventory', authenticateToken, (req, res) => {
  const { product_name, category, current_stock, min_stock, max_stock, unit_cost, supplier } = req.body;
  
  db.run(`
    INSERT OR REPLACE INTO inventory 
    (product_name, category, current_stock, min_stock, max_stock, unit_cost, supplier, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [product_name, category, current_stock, min_stock, max_stock, unit_cost, supplier], function(err) {
    if (err) {
      res.status(500).json({ error: '更新库存失败' });
    } else {
      res.json({ id: this.lastID, message: '库存更新成功' });
    }
  });
});

// 数据导出API
app.post('/api/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'excel', filters = {} } = req.body;
    
    const filePath = await dataImportExport.exportData(type, format, filters);
    const fileName = path.basename(filePath);
    
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('文件下载失败:', err);
        res.status(500).json({ error: '文件下载失败' });
      }
    });
  } catch (error) {
    console.error('导出失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 数据导入API
app.post('/api/import/:type', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要导入的文件' });
    }
    
    const { type } = req.params;
    const filePath = req.file.path;
    const options = req.body.options ? JSON.parse(req.body.options) : {};
    
    const result = await dataImportExport.importData(type, filePath, options);
    
    // 删除临时文件
    require('fs').unlinkSync(filePath);
    
    res.json({
      message: '导入完成',
      result: result
    });
  } catch (error) {
    console.error('导入失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 数据库备份API
app.post('/api/backup', async (req, res) => {
  try {
    const backupPath = await dataImportExport.backupDatabase();
    const fileName = path.basename(backupPath);
    
    res.download(backupPath, fileName, (err) => {
      if (err) {
        console.error('备份下载失败:', err);
        res.status(500).json({ error: '备份下载失败' });
      }
    });
  } catch (error) {
    console.error('备份失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取导入模板
app.get('/api/template/:type', (req, res) => {
  const { type } = req.params;
  let template = [];
  
  switch (type) {
    case 'products':
      template = [{
        '商品名称': '示例商品',
        '条形码': '1234567890',
        '分类': '电子产品',
        '品牌': '示例品牌',
        '单位': '件',
        '成本价': 100,
        '销售价': 150,
        '批发价': 120,
        '当前库存': 50,
        '最低库存': 10,
        '最高库存': 200,
        '供应商': '示例供应商'
      }];
      break;
    case 'customers':
      template = [{
        '客户名称': '示例客户',
        '电话': '13800138000',
        '邮箱': 'example@email.com',
        '地址': '示例地址',
        '客户类型': 'retail',
        '会员等级': 'bronze'
      }];
      break;
    case 'inventory':
      template = [{
        '商品名称': '示例商品',
        '库存数量': 100
      }];
      break;
    default:
      return res.status(400).json({ error: '不支持的模板类型' });
  }
  
  try {
    const filePath = dataImportExport.createExcelFile(template, `${type}_template`);
    const fileName = path.basename(filePath);
    
    res.download(filePath, fileName);
  } catch (error) {
    res.status(500).json({ error: '模板生成失败' });
  }
});

// Serve React app for any non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

const cron = require('node-cron');

cron.schedule('0 9 * * *', () => {
  console.log('执行每日库存检查...');
  db.all(`
    SELECT product_name, current_stock, min_stock 
    FROM inventory 
    WHERE current_stock <= min_stock
  `, (err, rows) => {
    if (!err && rows.length > 0) {
      rows.forEach(row => {
        db.run(`
          INSERT INTO alerts (type, message, severity)
          VALUES (?, ?, ?)
        `, ['low_stock', `${row.product_name} 库存不足，当前: ${row.current_stock}，最低: ${row.min_stock}`, 'warning']);
      });
    }
  });
});

// 错误监控和性能监控API路由
app.post('/api/errors', errorHandler.handleErrorReports.bind(errorHandler));
app.post('/api/performance', errorHandler.handlePerformanceReports.bind(errorHandler));
app.get('/api/errors/stats', errorHandler.getErrorStats.bind(errorHandler));
app.get('/api/performance/stats', errorHandler.getPerformanceStats.bind(errorHandler));
app.get('/api/health', errorHandler.healthCheck.bind(errorHandler));

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('数据库连接已关闭');
  });
  process.exit(0);
});