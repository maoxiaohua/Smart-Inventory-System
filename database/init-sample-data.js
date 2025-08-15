const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const moment = require('moment');

const dbPath = path.join(__dirname, 'business_data.db');
const db = new sqlite3.Database(dbPath);

const initSampleData = () => {
  console.log('初始化示例数据...');
  
  db.serialize(() => {
    // 清空现有数据
    db.run('DELETE FROM sales');
    db.run('DELETE FROM inventory');
    db.run('DELETE FROM alerts');
    
    // 插入示例库存数据
    const sampleInventory = [
      ['苹果手机', '电子产品', 50, 10, 200, 3999.00, '苹果公司'],
      ['华为手机', '电子产品', 8, 10, 150, 2999.00, '华为公司'],
      ['小米手机', '电子产品', 25, 15, 100, 1999.00, '小米公司'],
      ['笔记本电脑', '电子产品', 15, 5, 50, 5999.00, '联想公司'],
      ['蓝牙耳机', '电子产品', 80, 20, 200, 299.00, '索尼公司'],
      ['运动鞋', '服装', 120, 30, 300, 299.00, '耐克公司'],
      ['T恤', '服装', 200, 50, 500, 99.00, '优衣库'],
      ['牛仔裤', '服装', 5, 20, 150, 199.00, '李维斯'],
      ['咖啡豆', '食品', 30, 10, 100, 89.00, '星巴克'],
      ['茶叶', '食品', 45, 15, 80, 128.00, '立顿']
    ];
    
    sampleInventory.forEach(item => {
      db.run(`
        INSERT INTO inventory (product_name, category, current_stock, min_stock, max_stock, unit_cost, supplier)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, item);
    });
    
    // 插入示例销售数据（最近30天）
    const sampleSales = [];
    for (let i = 0; i < 30; i++) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const salesCount = Math.floor(Math.random() * 5) + 1; // 每天1-5笔销售
      
      for (let j = 0; j < salesCount; j++) {
        const product = sampleInventory[Math.floor(Math.random() * sampleInventory.length)];
        const quantity = Math.floor(Math.random() * 5) + 1;
        const unitPrice = product[5] * (0.8 + Math.random() * 0.4); // 价格波动±20%
        const totalAmount = quantity * unitPrice;
        
        sampleSales.push([
          date,
          product[0], // product_name
          product[1], // category
          quantity,
          unitPrice,
          totalAmount,
          `客户${Math.floor(Math.random() * 100) + 1}`
        ]);
      }
    }
    
    sampleSales.forEach(sale => {
      db.run(`
        INSERT INTO sales (date, product_name, category, quantity, unit_price, total_amount, customer_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, sale);
    });
    
    // 插入示例预警数据
    const sampleAlerts = [
      ['low_stock', '华为手机库存不足，当前: 8，最低: 10', 'warning', 0],
      ['low_stock', '牛仔裤库存不足，当前: 5，最低: 20', 'warning', 0],
      ['system', '系统已成功备份数据', 'info', 1],
      ['sales', '今日销售额已达目标的80%', 'success', 1]
    ];
    
    sampleAlerts.forEach(alert => {
      db.run(`
        INSERT INTO alerts (type, message, severity, is_read)
        VALUES (?, ?, ?, ?)
      `, alert);
    });
    
    console.log('示例数据初始化完成！');
  });
};

// 如果直接运行此文件
if (require.main === module) {
  initSampleData();
  setTimeout(() => {
    db.close();
    process.exit(0);
  }, 2000);
}

module.exports = initSampleData;