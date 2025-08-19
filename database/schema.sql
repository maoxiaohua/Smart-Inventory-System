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

-- 16. 出货订单表
CREATE TABLE IF NOT EXISTS shipping_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipping_no TEXT UNIQUE NOT NULL, -- 出货单号
  sales_order_id INTEGER,
  sales_order_no TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address TEXT NOT NULL,
  shipping_method TEXT DEFAULT 'express', -- express, logistics, self_delivery, pickup
  carrier_name TEXT,
  carrier_code TEXT,
  tracking_no TEXT,
  shipping_date DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  status TEXT DEFAULT 'preparing', -- preparing, packed, shipped, in_transit, delivered, returned, cancelled
  shipping_cost REAL DEFAULT 0,
  weight REAL DEFAULT 0,
  dimensions TEXT, -- 尺寸信息
  package_count INTEGER DEFAULT 1,
  notes TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id)
);

-- 17. 出货商品明细表
CREATE TABLE IF NOT EXISTS shipping_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipping_order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  packed_quantity INTEGER DEFAULT 0,
  unit_price REAL,
  batch_no TEXT,
  serial_no TEXT,
  location TEXT, -- 库位信息
  expiry_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipping_order_id) REFERENCES shipping_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 18. 物流承运商表
CREATE TABLE IF NOT EXISTS carriers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  contact_phone TEXT,
  contact_person TEXT,
  service_area TEXT, -- JSON格式存储服务区域
  price_per_kg REAL DEFAULT 0,
  price_per_volume REAL DEFAULT 0, -- 体积计费
  min_charge REAL DEFAULT 0, -- 最低收费
  delivery_time_avg INTEGER DEFAULT 3, -- 平均配送时间(天)
  rating REAL DEFAULT 0, -- 承运商评分
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 19. 物流跟踪记录表
CREATE TABLE IF NOT EXISTS tracking_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipping_order_id INTEGER NOT NULL,
  tracking_no TEXT,
  timestamp DATETIME NOT NULL,
  location TEXT,
  status TEXT NOT NULL,
  description TEXT,
  operator TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipping_order_id) REFERENCES shipping_orders(id) ON DELETE CASCADE
);

-- 20. 收货订单表
CREATE TABLE IF NOT EXISTS receiving_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receiving_no TEXT UNIQUE NOT NULL, -- 收货单号
  purchase_order_id INTEGER,
  purchase_order_no TEXT,
  supplier_id INTEGER,
  supplier_name TEXT NOT NULL,
  supplier_contact TEXT,
  planned_date DATE, -- 计划收货日期
  receiving_date DATE, -- 实际收货日期
  status TEXT DEFAULT 'pending', -- pending, inspecting, partial, completed, rejected, exception
  total_amount REAL DEFAULT 0, -- 订单总金额
  received_amount REAL DEFAULT 0, -- 实收金额
  inspector TEXT, -- 质检员
  warehouse_location TEXT, -- 收货区域
  delivery_note TEXT, -- 送货单号
  quality_score REAL, -- 质量评分
  notes TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- 21. 收货商品明细表
CREATE TABLE IF NOT EXISTS receiving_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receiving_order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  product_code TEXT,
  ordered_quantity INTEGER NOT NULL, -- 订购数量
  received_quantity INTEGER DEFAULT 0, -- 收货数量
  accepted_quantity INTEGER DEFAULT 0, -- 合格数量
  rejected_quantity INTEGER DEFAULT 0, -- 不合格数量
  unit_price REAL,
  batch_no TEXT,
  expiry_date DATE,
  location TEXT, -- 存放货位
  quality_status TEXT DEFAULT 'pending', -- pass, fail, pending
  inspection_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receiving_order_id) REFERENCES receiving_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 22. 质检报告表
CREATE TABLE IF NOT EXISTS inspection_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receiving_order_id INTEGER NOT NULL,
  inspector TEXT NOT NULL,
  inspection_date DATE NOT NULL,
  overall_rating REAL DEFAULT 0, -- 综合评分
  defect_summary TEXT, -- 缺陷总结
  recommendation TEXT, -- 改进建议
  photos TEXT, -- JSON格式存储照片路径
  certificates TEXT, -- JSON格式存储证书路径
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receiving_order_id) REFERENCES receiving_orders(id) ON DELETE CASCADE
);

-- 23. 质检项目表
CREATE TABLE IF NOT EXISTS quality_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_report_id INTEGER NOT NULL,
  check_item TEXT NOT NULL, -- 检查项目
  standard TEXT, -- 质量标准
  result TEXT DEFAULT 'pending', -- pass, fail, warning, pending
  actual_value TEXT, -- 实际检测值
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inspection_report_id) REFERENCES inspection_reports(id) ON DELETE CASCADE
);

-- 24. 异常处理记录表
CREATE TABLE IF NOT EXISTS exception_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receiving_order_id INTEGER,
  shipping_order_id INTEGER,
  reference_no TEXT, -- 关联单号
  supplier_name TEXT,
  exception_type TEXT NOT NULL, -- shortage, damage, quality, delay, specification
  description TEXT NOT NULL,
  quantity_affected INTEGER DEFAULT 0,
  financial_impact REAL DEFAULT 0,
  status TEXT DEFAULT 'reported', -- reported, investigating, resolved, closed
  resolution TEXT,
  responsible_party TEXT, -- supplier, carrier, warehouse, unknown
  evidence_files TEXT, -- JSON格式存储证据文件
  created_date DATE DEFAULT (DATE('now')),
  resolved_date DATE,
  handler TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receiving_order_id) REFERENCES receiving_orders(id),
  FOREIGN KEY (shipping_order_id) REFERENCES shipping_orders(id)
);

-- 25. 供应商评价表
CREATE TABLE IF NOT EXISTS supplier_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  supplier_name TEXT NOT NULL,
  evaluation_period TEXT NOT NULL, -- 评价期间
  delivery_rating REAL DEFAULT 0, -- 交期评分
  quality_rating REAL DEFAULT 0, -- 质量评分
  service_rating REAL DEFAULT 0, -- 服务评分
  overall_rating REAL DEFAULT 0, -- 综合评分
  total_orders INTEGER DEFAULT 0, -- 总订单数
  on_time_orders INTEGER DEFAULT 0, -- 准时订单数
  quality_pass_orders INTEGER DEFAULT 0, -- 质量合格订单数
  issues_count INTEGER DEFAULT 0, -- 问题次数
  improvement_suggestions TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- 26. 打包任务表
CREATE TABLE IF NOT EXISTS packing_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipping_order_id INTEGER NOT NULL,
  shipping_no TEXT NOT NULL,
  customer_name TEXT,
  priority TEXT DEFAULT 'medium', -- high, medium, low
  status TEXT DEFAULT 'pending', -- pending, packing, completed, cancelled
  assigned_to TEXT, -- 分配的打包员
  estimated_time INTEGER DEFAULT 30, -- 预计耗时(分钟)
  actual_time INTEGER, -- 实际耗时(分钟)
  packing_instructions TEXT, -- 打包要求
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipping_order_id) REFERENCES shipping_orders(id) ON DELETE CASCADE
);

-- 27. 打包商品清单表
CREATE TABLE IF NOT EXISTS packing_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  packing_task_id INTEGER NOT NULL,
  shipping_item_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  packed_quantity INTEGER DEFAULT 0,
  location TEXT, -- 拣货货位
  special_handling TEXT, -- 特殊处理要求
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (packing_task_id) REFERENCES packing_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (shipping_item_id) REFERENCES shipping_items(id)
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

-- 出货收货相关索引
CREATE INDEX IF NOT EXISTS idx_shipping_orders_date ON shipping_orders(shipping_date);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_status ON shipping_orders(status);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_customer ON shipping_orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_sales_order ON shipping_orders(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_items_order ON shipping_items(shipping_order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_items_product ON shipping_items(product_id);
CREATE INDEX IF NOT EXISTS idx_tracking_records_order ON tracking_records(shipping_order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_records_timestamp ON tracking_records(timestamp);

CREATE INDEX IF NOT EXISTS idx_receiving_orders_date ON receiving_orders(receiving_date);
CREATE INDEX IF NOT EXISTS idx_receiving_orders_status ON receiving_orders(status);
CREATE INDEX IF NOT EXISTS idx_receiving_orders_supplier ON receiving_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_receiving_orders_purchase_order ON receiving_orders(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_receiving_items_order ON receiving_items(receiving_order_id);
CREATE INDEX IF NOT EXISTS idx_receiving_items_product ON receiving_items(product_id);
CREATE INDEX IF NOT EXISTS idx_receiving_items_batch ON receiving_items(batch_no);

CREATE INDEX IF NOT EXISTS idx_inspection_reports_order ON inspection_reports(receiving_order_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_report ON quality_checks(inspection_report_id);
CREATE INDEX IF NOT EXISTS idx_exception_records_receiving ON exception_records(receiving_order_id);
CREATE INDEX IF NOT EXISTS idx_exception_records_shipping ON exception_records(shipping_order_id);
CREATE INDEX IF NOT EXISTS idx_exception_records_status ON exception_records(status);
CREATE INDEX IF NOT EXISTS idx_exception_records_date ON exception_records(created_date);

CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_supplier ON supplier_evaluations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_period ON supplier_evaluations(evaluation_period);
CREATE INDEX IF NOT EXISTS idx_packing_tasks_order ON packing_tasks(shipping_order_id);
CREATE INDEX IF NOT EXISTS idx_packing_tasks_status ON packing_tasks(status);
CREATE INDEX IF NOT EXISTS idx_packing_tasks_assigned ON packing_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_packing_items_task ON packing_items(packing_task_id);

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

-- 插入默认物流承运商
INSERT OR IGNORE INTO carriers (name, code, contact_phone, service_area, price_per_kg, delivery_time_avg, is_active) VALUES
('顺丰速运', 'SF', '95338', '["全国"]', 12.0, 1, 1),
('圆通速递', 'YTO', '95554', '["全国"]', 8.0, 2, 1),
('申通快递', 'STO', '95543', '["全国"]', 7.5, 2, 1),
('韵达快递', 'YD', '95546', '["全国"]', 8.5, 2, 1),
('中通快递', 'ZTO', '95311', '["全国"]', 8.0, 2, 1),
('德邦物流', 'DB', '95353', '["华北","华东","华南"]', 6.0, 3, 1),
('京东物流', 'JD', '950616', '["一线城市"]', 10.0, 1, 1),
('百世快递', 'BEST', '95320', '["全国"]', 7.0, 2, 1);