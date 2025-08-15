const XLSX = require('xlsx');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

class DataImportExport {
  constructor(db) {
    this.db = db;
  }

  // 数据导出功能
  async exportData(type, format = 'excel', filters = {}) {
    try {
      let data = [];
      let filename = '';
      
      switch (type) {
        case 'products':
          data = await this.exportProducts(filters);
          filename = `products_${Date.now()}`;
          break;
        case 'customers':
          data = await this.exportCustomers(filters);
          filename = `customers_${Date.now()}`;
          break;
        case 'sales':
          data = await this.exportSales(filters);
          filename = `sales_${Date.now()}`;
          break;
        case 'inventory':
          data = await this.exportInventoryReport(filters);
          filename = `inventory_${Date.now()}`;
          break;
        case 'financial':
          data = await this.exportFinancialReport(filters);
          filename = `financial_${Date.now()}`;
          break;
        default:
          throw new Error('不支持的导出类型');
      }

      if (format === 'excel') {
        return this.createExcelFile(data, filename);
      } else if (format === 'csv') {
        return this.createCSVFile(data, filename);
      } else {
        throw new Error('不支持的文件格式');
      }
    } catch (error) {
      throw new Error(`导出失败: ${error.message}`);
    }
  }

  // 导出商品数据
  async exportProducts(filters) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          p.product_code as '商品编码',
          p.barcode as '条形码',
          p.name as '商品名称',
          c.name as '分类',
          p.brand as '品牌',
          p.unit as '单位',
          p.cost_price as '成本价',
          p.selling_price as '销售价',
          p.wholesale_price as '批发价',
          p.current_stock as '当前库存',
          p.min_stock as '最低库存',
          p.max_stock as '最高库存',
          s.name as '供应商',
          CASE WHEN p.is_active = 1 THEN '启用' ELSE '停用' END as '状态',
          p.created_at as '创建时间'
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.id
      `;
      
      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // 导出客户数据
  async exportCustomers(filters) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          customer_code as '客户编号',
          name as '客户名称',
          phone as '电话',
          email as '邮箱',
          address as '地址',
          customer_type as '客户类型',
          member_level as '会员等级',
          total_purchases as '累计消费',
          current_balance as '当前余额',
          points as '积分',
          CASE WHEN is_active = 1 THEN '启用' ELSE '停用' END as '状态',
          created_at as '创建时间'
        FROM customers
        ORDER BY id
      `;
      
      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // 导出销售数据
  async exportSales(filters) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          so.order_no as '订单号',
          so.order_date as '销售日期',
          c.name as '客户名称',
          p.name as '商品名称',
          soi.quantity as '数量',
          soi.unit_price as '单价',
          soi.line_total as '小计',
          so.payment_method as '支付方式',
          so.order_status as '订单状态'
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN sales_order_items soi ON so.id = soi.order_id
        LEFT JOIN products p ON soi.product_id = p.id
      `;
      
      const params = [];
      if (filters.startDate && filters.endDate) {
        sql += ' WHERE so.order_date BETWEEN ? AND ?';
        params.push(filters.startDate, filters.endDate);
      }
      
      sql += ' ORDER BY so.order_date DESC';
      
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // 导出库存报表
  async exportInventoryReport(filters) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          p.name as '商品名称',
          c.name as '分类',
          p.current_stock as '当前库存',
          p.min_stock as '最低库存',
          p.cost_price as '成本价',
          (p.current_stock * p.cost_price) as '库存价值',
          CASE 
            WHEN p.current_stock <= p.min_stock THEN '库存不足'
            WHEN p.current_stock >= p.max_stock THEN '库存过多'
            ELSE '正常'
          END as '库存状态',
          p.updated_at as '最后更新'
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1
        ORDER BY p.current_stock ASC
      `;
      
      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // 导出财务报表
  async exportFinancialReport(filters) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          transaction_date as '交易日期',
          transaction_type as '交易类型',
          category as '分类',
          amount as '金额',
          payment_method as '支付方式',
          description as '描述',
          created_at as '创建时间'
        FROM financial_transactions
      `;
      
      const params = [];
      if (filters.startDate && filters.endDate) {
        sql += ' WHERE transaction_date BETWEEN ? AND ?';
        params.push(filters.startDate, filters.endDate);
      }
      
      sql += ' ORDER BY transaction_date DESC';
      
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // 创建Excel文件
  createExcelFile(data, filename) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // 设置列宽
    const colWidths = [];
    if (data.length > 0) {
      Object.keys(data[0]).forEach(key => {
        const maxLength = Math.max(
          key.length,
          ...data.map(row => String(row[key] || '').length)
        );
        colWidths.push({ wch: Math.min(maxLength + 2, 30) });
      });
      worksheet['!cols'] = colWidths;
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    const filePath = path.join(__dirname, '../exports', `${filename}.xlsx`);
    
    // 确保导出目录存在
    const exportDir = path.dirname(filePath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    XLSX.writeFile(workbook, filePath);
    return filePath;
  }

  // 创建CSV文件
  createCSVFile(data, filename) {
    const filePath = path.join(__dirname, '../exports', `${filename}.csv`);
    
    // 确保导出目录存在
    const exportDir = path.dirname(filePath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    if (data.length === 0) {
      fs.writeFileSync(filePath, '');
      return filePath;
    }
    
    // 创建CSV内容
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // 处理包含逗号的值
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');
    
    // 添加BOM以支持中文
    fs.writeFileSync(filePath, '\uFEFF' + csvContent);
    return filePath;
  }

  // 数据导入功能
  async importData(type, filePath, options = {}) {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      let data = [];
      
      if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        data = this.readExcelFile(filePath);
      } else if (fileExtension === '.csv') {
        data = await this.readCSVFile(filePath);
      } else {
        throw new Error('不支持的文件格式，请使用Excel或CSV文件');
      }

      return await this.processImportData(type, data, options);
    } catch (error) {
      throw new Error(`导入失败: ${error.message}`);
    }
  }

  // 读取Excel文件
  readExcelFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  }

  // 读取CSV文件
  async readCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const data = [];
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => data.push(row))
        .on('end', () => resolve(data))
        .on('error', (error) => reject(error));
    });
  }

  // 处理导入数据
  async processImportData(type, data, options = {}) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        
        switch (type) {
          case 'products':
            await this.importProduct(row);
            break;
          case 'customers':
            await this.importCustomer(row);
            break;
          case 'inventory':
            await this.importInventoryUpdate(row);
            break;
          default:
            throw new Error('不支持的导入类型');
        }
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`第${i + 1}行: ${error.message}`);
      }
    }

    return results;
  }

  // 导入商品
  async importProduct(data) {
    return new Promise((resolve, reject) => {
      const requiredFields = ['商品名称'];
      for (const field of requiredFields) {
        if (!data[field]) {
          reject(new Error(`缺少必填字段: ${field}`));
          return;
        }
      }

      // 查找或创建分类
      this.findOrCreateCategory(data['分类']).then(categoryId => {
        // 查找或创建供应商
        this.findOrCreateSupplier(data['供应商']).then(supplierId => {
          const sql = `
            INSERT OR REPLACE INTO products 
            (name, category_id, brand, unit, cost_price, selling_price, wholesale_price,
             current_stock, min_stock, max_stock, supplier_id, barcode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          const params = [
            data['商品名称'],
            categoryId,
            data['品牌'] || '',
            data['单位'] || '件',
            parseFloat(data['成本价'] || 0),
            parseFloat(data['销售价'] || 0),
            parseFloat(data['批发价'] || 0),
            parseInt(data['当前库存'] || 0),
            parseInt(data['最低库存'] || 10),
            parseInt(data['最高库存'] || 1000),
            supplierId,
            data['条形码'] || ''
          ];
          
          this.db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          });
        });
      });
    });
  }

  // 导入客户
  async importCustomer(data) {
    return new Promise((resolve, reject) => {
      const requiredFields = ['客户名称'];
      for (const field of requiredFields) {
        if (!data[field]) {
          reject(new Error(`缺少必填字段: ${field}`));
          return;
        }
      }

      const sql = `
        INSERT OR REPLACE INTO customers 
        (name, phone, email, address, customer_type, member_level)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        data['客户名称'],
        data['电话'] || '',
        data['邮箱'] || '',
        data['地址'] || '',
        data['客户类型'] || 'retail',
        data['会员等级'] || 'bronze'
      ];
      
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  // 导入库存更新
  async importInventoryUpdate(data) {
    return new Promise((resolve, reject) => {
      const requiredFields = ['商品名称', '库存数量'];
      for (const field of requiredFields) {
        if (!data[field]) {
          reject(new Error(`缺少必填字段: ${field}`));
          return;
        }
      }

      // 更新库存
      const sql = `
        UPDATE products 
        SET current_stock = ?, updated_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `;
      
      const params = [
        parseInt(data['库存数量']),
        data['商品名称']
      ];
      
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error('商品不存在'));
        else resolve(this.changes);
      });
    });
  }

  // 查找或创建分类
  async findOrCreateCategory(categoryName) {
    if (!categoryName) return null;
    
    return new Promise((resolve, reject) => {
      this.db.get('SELECT id FROM categories WHERE name = ?', [categoryName], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(row.id);
        } else {
          this.db.run('INSERT INTO categories (name) VALUES (?)', [categoryName], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          });
        }
      });
    });
  }

  // 查找或创建供应商
  async findOrCreateSupplier(supplierName) {
    if (!supplierName) return null;
    
    return new Promise((resolve, reject) => {
      this.db.get('SELECT id FROM suppliers WHERE name = ?', [supplierName], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(row.id);
        } else {
          this.db.run('INSERT INTO suppliers (name) VALUES (?)', [supplierName], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          });
        }
      });
    });
  }

  // 备份数据库
  async backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, '../backups', `backup_${timestamp}.db`);
    
    // 确保备份目录存在
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    return new Promise((resolve, reject) => {
      const dbPath = path.join(__dirname, '../database/business_data.db');
      fs.copyFile(dbPath, backupPath, (err) => {
        if (err) reject(err);
        else resolve(backupPath);
      });
    });
  }
}

module.exports = DataImportExport;