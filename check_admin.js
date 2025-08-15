const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 连接到数据库
const dbPath = path.join(__dirname, 'server', 'business.db');
const db = new sqlite3.Database(dbPath);

console.log('正在查询admin用户...');

db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
  if (err) {
    console.error('查询错误:', err);
  } else if (row) {
    console.log('Admin用户信息:');
    console.log('ID:', row.id);
    console.log('用户名:', row.username);
    console.log('邮箱:', row.email);
    console.log('角色:', row.role);
    console.log('状态:', row.status);
    console.log('创建时间:', row.created_at);
    console.log('最后登录:', row.last_login);
  } else {
    console.log('未找到admin用户');
  }
  
  db.close();
});