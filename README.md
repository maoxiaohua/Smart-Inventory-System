# 🚀 AI数据智能分析平台

> 针对微小企业和个体工商户的一体化智能业务管理平台

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-16%2B-green)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)

## ✨ 功能特性

### 🎯 核心业务模块
- 📊 **智能仪表板** - 实时业务数据总览，可视化图表分析
- 💰 **销售管理** - 销售记录、订单管理、趋势分析  
- 📦 **库存管理** - 商品档案、库存监控、智能预警
- 🚚 **出货管理** - 发货单、物流跟踪、配送管理
- 📥 **收货管理** - 收货验收、质量检验、异常处理
- 🛒 **采购管理** - 采购订单、供应商管理、采购计划
- 👥 **客户管理** - 客户档案、会员体系、消费分析
- 💳 **财务管理** - 收支记录、财务分析、多账户管理

### 🤖 AI智能特色
- **销售预测** - 基于机器学习的销售额预测，准确率87%
- **客户流失预警** - 智能识别高风险客户，提供挽留建议
- **智能补货建议** - 预测库存耗尽时间，推荐最佳补货时机
- **异常检测** - 自动识别销售异常和库存风险
- **决策支持** - 量化行动建议和预期收益评估

### 📈 数据分析能力
- **多维度报表** - Excel/CSV格式数据导出
- **实时统计** - 销售、库存、财务数据实时更新
- **趋势分析** - 支持7/15/30/90天数据查看
- **预警系统** - 库存不足、异常销售智能提醒

## 🛠 技术栈

| 分类 | 技术选择 |
|------|----------|
| **前端** | React 18 + TypeScript + Ant Design |
| **后端** | Node.js + Express.js |
| **数据库** | SQLite (轻量级，零配置) |
| **图表** | ECharts (专业数据可视化) |
| **AI算法** | 时间序列分析 + 机器学习预测 |
| **部署** | Docker支持 (可选) |

## 🚀 快速开始

### 环境要求
- Node.js 16.0+ 
- npm 8.0+

### 一键启动

```bash
# 1. 克隆项目
git clone https://github.com/your-username/ai-business-analytics.git
cd ai-business-analytics

# 2. 安装所有依赖
npm run install:all

# 3. 初始化数据库和示例数据
node database/init-sample-data.js

# 4. 启动开发环境 (前端 + 后端)
npm run dev
```

### 访问应用
- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:3001
- **默认账户**: admin / admin123

## 📁 项目结构

```
ai-business-analytics/
├── 📁 client/                 # React前端应用
│   ├── 📁 src/
│   │   ├── 📁 components/     # React组件
│   │   ├── 📁 contexts/       # React Context
│   │   └── 📁 utils/          # 工具函数
│   └── 📁 public/             # 静态资源
├── 📁 server/                 # Node.js后端
│   ├── 📁 routes/             # API路由
│   ├── 📁 middleware/         # 中间件
│   └── 📁 utils/              # 工具类
├── 📁 database/               # 数据库相关
│   ├── schema.sql             # 数据库结构
│   └── init-sample-data.js    # 示例数据
└── 📄 README.md
```

## 💡 核心功能详解

### 🎛 智能仪表板
- 实时业务指标卡片，支持点击跳转
- 销售趋势ECharts可视化图表  
- 库存预警和系统通知中心
- 一键进入AI智能分析模块

### 📊 销售订单管理
- **完整订单流程**: 报价→确认→付款→备货→发货→送达→完成
- **订单状态跟踪**: 可视化步骤条显示当前进度
- **客户信息管理**: 订单关联客户档案
- **退货处理**: 支持退货申请和处理流程

### 🚛 物流配送管理
- **出货单管理**: 创建发货单，关联销售订单
- **承运商管理**: 支持多家快递和物流公司
- **物流跟踪**: 实时跟踪货物运输状态
- **打包任务**: 仓库打包任务分配和进度管理

### 📦 收货质检管理
- **收货验收**: 采购订单收货确认
- **质量检验**: 完整质检流程，生成检验报告
- **异常处理**: 短缺、损坏、质量问题处理机制
- **供应商评价**: 交期、质量、服务综合评分

### 🏗 企业级数据库设计
- **27张数据表**: 完整的进销存业务数据结构
- **关系完整性**: 外键约束和事务处理
- **性能优化**: 索引优化，支持大数据量查询
- **数据安全**: 用户权限管理和操作日志

## 📱 界面预览

### 主控制台
- 业务指标概览卡片
- 销售趋势图表分析
- 实时预警通知

### 核心业务模块
- 销售管理：订单列表、统计图表
- 库存管理：商品档案、库存状态
- 出货管理：发货单、物流跟踪
- 收货管理：验收单、质检报告

## ⚙️ 高级配置

### 数据库配置
```bash
# 重新初始化数据库
node database/init-sample-data.js

# 备份数据库
npm run backup
```

### 端口配置
```bash
# Windows PowerShell
$env:PORT=3002; npm run server:dev

# Linux/Mac
PORT=3002 npm run server:dev
```

### 生产部署
```bash
# 构建前端
npm run build

# 启动生产服务器
npm start
```

## 🔧 开发指南

### 添加新功能模块
1. 在 `client/src/components/` 创建React组件
2. 在 `server/routes/` 添加API路由
3. 在 `database/schema.sql` 更新数据库结构
4. 在 `client/src/App.tsx` 集成到主应用

### API接口规范
```javascript
// GET /api/module/list - 获取列表
// POST /api/module - 创建记录  
// PUT /api/module/:id - 更新记录
// DELETE /api/module/:id - 删除记录
```

## 🚨 常见问题

### 数据库相关
**Q: 首次启动提示数据库连接失败？**  
A: 请确保已运行 `node database/init-sample-data.js` 初始化数据库

**Q: 如何重置示例数据？**  
A: 删除 `database/business_data.db` 文件，重新运行初始化脚本

### 端口占用
**Q: 3001端口被占用如何处理？**  
A: 使用PowerShell命令查找并结束进程：
```powershell
netstat -ano | Select-String ":3001" | ForEach-Object { taskkill /PID ($_ -split '\s+')[-1] /F }
```

### 权限管理
**Q: 忘记管理员密码？**  
A: 默认账户 admin/admin123，首次登录后请及时修改

## 🤝 贡献指南

我们欢迎所有形式的贡献！

1. Fork 项目仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📋 更新日志

### v1.2.0 (最新)
- ✨ 新增出货管理模块
- ✨ 新增收货管理模块
- 🔧 完善供应商评价系统
- 🐛 修复库存同步问题

### v1.1.0
- ✨ 新增AI智能洞察功能
- ✨ 新增销售订单管理
- 🔧 优化用户权限系统

### v1.0.0  
- 🎉 初始版本发布
- ✨ 基础进销存功能
- ✨ 数据可视化仪表板

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议。

## 📞 联系我们

- 📧 邮箱: mxh0510@163.com
- 🐛 问题反馈: [GitHub Issues](https://github.com/your-username/ai-business-analytics/issues)
- 📖 文档: [项目文档](https://docs.ai-business.com)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个Star支持一下！**

Made with ❤️ by AI Business Analytics Team

</div>