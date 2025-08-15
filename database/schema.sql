-- AI数据智能分析工具 - 完整数据库结构设计
-- 支持完整的进销存、财务、客户管理功能

-- 1. 商品分类表
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- 2. 供应商表
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  payment_terms TEXT,
  credit_rating INTEGER DEFAULT 5, -- 1-10评分
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 客户表（增强版）
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_code TEXT UNIQUE, -- 客户编号
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  customer_type TEXT DEFAULT 'retail', -- retail, wholesale, member
  credit_limit REAL DEFAULT 0,
  current_balance REAL DEFAULT 0, -- 当前欠款
  total_purchases REAL DEFAULT 0, -- 累计消费
  last_purchase_date DATE,
  member_level TEXT DEFAULT 'bronze', -- bronze, silver, gold, vip
  points INTEGER DEFAULT 0, -- 积分
  discount_rate REAL DEFAULT 0, -- 专属折扣率
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 商品表（增强版）
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_code TEXT UNIQUE, -- 商品编码
  barcode TEXT, -- 条形码
  name TEXT NOT NULL,
  category_id INTEGER,
  brand TEXT,
  model TEXT,
  unit TEXT DEFAULT '件', -- 单位
  cost_price REAL NOT NULL DEFAULT 0, -- 成本价
  selling_price REAL NOT NULL DEFAULT 0, -- 销售价
  wholesale_price REAL DEFAULT 0, -- 批发价
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 10,
  max_stock INTEGER DEFAULT 1000,
  reserved_stock INTEGER DEFAULT 0, -- 预留库存
  location TEXT, -- 仓库位置
  shelf_life_days INTEGER, -- 保质期天数
  weight REAL, -- 重量
  dimensions TEXT, -- 尺寸
  supplier_id INTEGER,
  tax_rate REAL DEFAULT 0.13, -- 税率
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- 5. 销售订单表
CREATE TABLE IF NOT EXISTS sales_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE, -- 订单号
  customer_id INTEGER,
  order_date DATE NOT NULL,
  delivery_date DATE,
  payment_method TEXT DEFAULT 'cash', -- cash, card, transfer, credit
  payment_status TEXT DEFAULT 'paid', -- paid, pending, partial, overdue
  order_status TEXT DEFAULT 'completed', -- draft, confirmed, completed, cancelled
  subtotal REAL NOT NULL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  notes TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 6. 销售订单明细表
CREATE TABLE IF NOT EXISTS sales_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  discount_rate REAL DEFAULT 0,
  line_total REAL NOT NULL,
  cost_price REAL, -- 记录销售时的成本价
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 7. 采购订单表
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE,
  supplier_id INTEGER NOT NULL,
  order_date DATE NOT NULL,
  expected_date DATE,
  received_date DATE,
  order_status TEXT DEFAULT 'pending', -- pending, received, partial, cancelled
  payment_status TEXT DEFAULT 'unpaid',
  subtotal REAL NOT NULL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  notes TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- 8. 采购订单明细表
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  line_total REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 9. 库存变动记录表
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- in, out, transfer, adjust
  reference_type TEXT, -- sales_order, purchase_order, adjustment, transfer
  reference_id INTEGER,
  quantity_change INTEGER NOT NULL, -- 正数入库，负数出库
  cost_price REAL,
  unit_price REAL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  notes TEXT,
  operator TEXT,
  transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 10. 收支记录表（财务管理）
CREATE TABLE IF NOT EXISTS financial_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_no TEXT UNIQUE,
  transaction_type TEXT NOT NULL, -- income, expense, transfer
  category TEXT NOT NULL, -- sales, purchase, salary, rent, utilities, etc.
  amount REAL NOT NULL,
  payment_method TEXT, -- cash, bank, card, etc.
  account_from TEXT, -- 出账账户
  account_to TEXT, -- 入账账户
  reference_type TEXT, -- sales_order, purchase_order, etc.
  reference_id INTEGER,
  description TEXT,
  transaction_date DATE NOT NULL,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. 账户表（银行账户、现金等）
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_code TEXT UNIQUE,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL, -- cash, bank, card, etc.
  balance REAL DEFAULT 0,
  currency TEXT DEFAULT 'CNY',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. 系统配置表
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. 用户操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  operation_type TEXT NOT NULL,
  table_name TEXT,
  record_id INTEGER,
  old_data TEXT, -- JSON格式
  new_data TEXT, -- JSON格式
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. 促销活动表
CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- discount, buy_get, member_only
  discount_type TEXT, -- percentage, amount
  discount_value REAL,
  start_date DATE,
  end_date DATE,
  min_amount REAL DEFAULT 0, -- 最低消费金额
  applicable_products TEXT, -- JSON格式存储适用商品
  applicable_customers TEXT, -- JSON格式存储适用客户
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 15. 业务报表缓存表（提高查询性能）
CREATE TABLE IF NOT EXISTS report_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_type TEXT NOT NULL,
  date_range TEXT,
  parameters TEXT, -- JSON格式
  result_data TEXT, -- JSON格式
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON sales_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_product ON sales_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 插入默认系统配置
INSERT OR IGNORE INTO system_settings (key, value, description) VALUES
('company_name', 'AI数据智能分析', '公司名称'),
('default_tax_rate', '0.13', '默认税率'),
('low_stock_threshold', '10', '低库存预警阈值'),
('currency', 'CNY', '默认货币'),
('date_format', 'YYYY-MM-DD', '日期格式'),
('backup_frequency', 'daily', '备份频率'),
('auto_order_no', '1', '是否自动生成订单号');

-- 插入默认账户
INSERT OR IGNORE INTO accounts (account_code, account_name, account_type, balance) VALUES
('CASH001', '现金账户', 'cash', 0),
('BANK001', '银行基本户', 'bank', 0),
('CARD001', '微信支付', 'card', 0),
('CARD002', '支付宝', 'card', 0);