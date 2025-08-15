/**
 * JWT认证中间件
 * 保护需要登录的API路由
 */

const jwt = require('jsonwebtoken');

// JWT密钥 - 在生产环境中应该使用环境变量
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 生成JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// 验证JWT token中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '访问被拒绝，需要登录令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification error:', err);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: '登录令牌已过期，请重新登录' });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: '无效的登录令牌' });
      } else {
        return res.status(403).json({ error: '令牌验证失败' });
      }
    }

    req.user = user;
    next();
  });
};

// 角色权限检查中间件
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证用户' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足，无法访问此资源' });
    }

    next();
  };
};

// 管理员权限检查
const requireAdmin = requireRole(['admin', 'super_admin']);

// 经理权限检查（包括管理员）
const requireManager = requireRole(['manager', 'admin', 'super_admin']);

module.exports = {
  generateToken,
  authenticateToken,
  requireRole,
  requireAdmin,
  requireManager,
  JWT_SECRET
};