/**
 * 用户认证相关路由
 * 包含登录、注册、密码重置等功能
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken, authenticateToken } = require('../middleware/auth');
const router = express.Router();

// 用户登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  // 从数据库获取用户信息
  const db = req.app.get('db');
  db.get(`
    SELECT id, username, email, password_hash, role, status, last_login, created_at
    FROM users 
    WHERE username = ? OR email = ?
  `, [username, username], async (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '数据库查询失败' });
    }

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: '账户已被禁用，请联系管理员' });
    }

    try {
      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      // 更新最后登录时间
      db.run(`
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [user.id]);

      // 生成JWT token
      const token = generateToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });

      // 返回用户信息（不包含密码）
      const userInfo = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.last_login,
        createdAt: user.created_at
      };

      res.json({
        success: true,
        message: '登录成功',
        token,
        user: userInfo
      });

    } catch (error) {
      console.error('Password verification error:', error);
      res.status(500).json({ error: '密码验证失败' });
    }
  });
});

// 用户注册
router.post('/register', async (req, res) => {
  const { username, email, password, role = 'user' } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: '用户名、邮箱和密码不能为空' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度不能少于6位' });
  }

  const db = req.app.get('db');

  try {
    // 检查用户名是否已存在
    db.get(`
      SELECT id FROM users 
      WHERE username = ? OR email = ?
    `, [username, email], async (err, existingUser) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: '数据库查询失败' });
      }

      if (existingUser) {
        return res.status(400).json({ error: '用户名或邮箱已存在' });
      }

      try {
        // 加密密码
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 插入新用户
        db.run(`
          INSERT INTO users (username, email, password_hash, role, status, created_at)
          VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
        `, [username, email, passwordHash, role], function(err) {
          if (err) {
            console.error('User creation error:', err);
            return res.status(500).json({ error: '用户创建失败' });
          }

          // 生成JWT token
          const token = generateToken({
            id: this.lastID,
            username,
            email,
            role
          });

          const userInfo = {
            id: this.lastID,
            username,
            email,
            role,
            status: 'active',
            createdAt: new Date().toISOString()
          };

          res.status(201).json({
            success: true,
            message: '注册成功',
            token,
            user: userInfo
          });
        });

      } catch (hashError) {
        console.error('Password hashing error:', hashError);
        res.status(500).json({ error: '密码加密失败' });
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: '注册过程发生错误' });
  }
});

// 验证token有效性
router.get('/verify', authenticateToken, (req, res) => {
  // 如果中间件通过，说明token有效
  res.json({
    success: true,
    user: req.user
  });
});

// 获取当前用户信息
router.get('/me', authenticateToken, (req, res) => {
  const db = req.app.get('db');
  
  db.get(`
    SELECT id, username, email, role, status, last_login, created_at
    FROM users 
    WHERE id = ?
  `, [req.user.id], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '获取用户信息失败' });
    }

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }
    });
  });
});

// 修改密码
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: '当前密码和新密码不能为空' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码长度不能少于6位' });
  }

  const db = req.app.get('db');

  // 获取当前用户密码
  db.get(`
    SELECT password_hash FROM users WHERE id = ?
  `, [req.user.id], async (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: '数据库查询失败' });
    }

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    try {
      // 验证当前密码
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(400).json({ error: '当前密码错误' });
      }

      // 加密新密码
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // 更新密码
      db.run(`
        UPDATE users 
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [newPasswordHash, req.user.id], function(err) {
        if (err) {
          console.error('Password update error:', err);
          return res.status(500).json({ error: '密码更新失败' });
        }

        res.json({
          success: true,
          message: '密码修改成功'
        });
      });

    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ error: '密码修改过程发生错误' });
    }
  });
});

// 用户登出（前端处理，后端记录日志）
router.post('/logout', authenticateToken, (req, res) => {
  // 这里可以添加登出日志记录
  res.json({
    success: true,
    message: '登出成功'
  });
});

module.exports = router;