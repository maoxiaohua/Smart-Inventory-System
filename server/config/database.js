/**
 * 数据库配置和扩容方案
 * 支持SQLite到MySQL/PostgreSQL的迁移
 */

const path = require('path');

const DATABASE_CONFIG = {
  // 开发环境配置（当前SQLite）
  development: {
    type: 'sqlite',
    database: path.join(__dirname, '../database/business_data.db'),
    pool: {
      min: 1,
      max: 5
    }
  },
  
  // 生产环境配置（MySQL）
  production_mysql: {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'business_intelligence',
    pool: {
      min: 5,
      max: 20,
      acquireTimeoutMillis: 60000,
      timeout: 60000,
      idleTimeoutMillis: 600000
    },
    charset: 'utf8mb4'
  },
  
  // 生产环境配置（PostgreSQL）
  production_postgresql: {
    type: 'postgresql',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'business_intelligence',
    pool: {
      min: 5,
      max: 20,
      acquireTimeoutMillis: 60000,
      timeout: 60000,
      idleTimeoutMillis: 600000
    }
  },
  
  // 云数据库配置示例
  cloud: {
    type: 'mysql', // 或 'postgresql'
    host: process.env.CLOUD_DB_HOST,
    port: process.env.CLOUD_DB_PORT,
    user: process.env.CLOUD_DB_USER,
    password: process.env.CLOUD_DB_PASSWORD,
    database: process.env.CLOUD_DB_NAME,
    ssl: {
      rejectUnauthorized: false
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};

// 数据库迁移脚本
const MIGRATION_SCRIPTS = {
  // 用户表迁移脚本
  users_table: {
    sqlite: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin', 'super_admin')),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    mysql: `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'manager', 'admin', 'super_admin') DEFAULT 'user',
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    postgresql: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin', 'super_admin')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    `
  },
  
  // 会话表（用于token管理）
  sessions_table: {
    sqlite: `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `,
    mysql: `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        INDEX idx_user_id (user_id),
        INDEX idx_token_hash (token_hash),
        INDEX idx_expires_at (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
    postgresql: `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON user_sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);
    `
  }
};

// 数据库连接工厂
class DatabaseFactory {
  static createConnection(config) {
    switch (config.type) {
      case 'sqlite':
        const sqlite3 = require('sqlite3').verbose();
        return new sqlite3.Database(config.database);
        
      case 'mysql':
        const mysql = require('mysql2');
        return mysql.createPool(config);
        
      case 'postgresql':
        const { Pool } = require('pg');
        return new Pool(config);
        
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }
  
  static async runMigration(connection, dbType, tableName) {
    const script = MIGRATION_SCRIPTS[tableName][dbType];
    
    if (!script) {
      throw new Error(`No migration script found for ${tableName} on ${dbType}`);
    }
    
    return new Promise((resolve, reject) => {
      if (dbType === 'sqlite') {
        connection.exec(script, (err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        connection.query(script, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }
    });
  }
}

// 扩容检查器
class ScalabilityChecker {
  static async checkDatabaseLoad(connection, dbType) {
    const checks = {
      connections: 0,
      tableSize: 0,
      queryPerformance: 0,
      diskUsage: 0
    };
    
    try {
      if (dbType === 'sqlite') {
        // SQLite 特定检查
        const stats = await this.getSQLiteStats(connection);
        checks.tableSize = stats.pageCount * stats.pageSize;
        checks.diskUsage = stats.fileSize;
      } else if (dbType === 'mysql') {
        // MySQL 特定检查
        const stats = await this.getMySQLStats(connection);
        checks.connections = stats.threadsConnected;
        checks.tableSize = stats.dataLength;
      } else if (dbType === 'postgresql') {
        // PostgreSQL 特定检查
        const stats = await this.getPostgreSQLStats(connection);
        checks.connections = stats.numbackends;
        checks.tableSize = stats.tableSize;
      }
      
      return checks;
    } catch (error) {
      console.error('Database load check failed:', error);
      return checks;
    }
  }
  
  static shouldScale(checks, thresholds = {}) {
    const defaultThresholds = {
      maxConnections: 80, // 最大连接数百分比
      maxTableSize: 1024 * 1024 * 1024, // 1GB
      maxQueryTime: 1000, // 1秒
      maxDiskUsage: 0.8 // 80%
    };
    
    const limits = { ...defaultThresholds, ...thresholds };
    
    return (
      checks.connections > limits.maxConnections ||
      checks.tableSize > limits.maxTableSize ||
      checks.queryPerformance > limits.maxQueryTime ||
      checks.diskUsage > limits.maxDiskUsage
    );
  }
  
  static async getSQLiteStats(connection) {
    return new Promise((resolve, reject) => {
      connection.get("PRAGMA page_count", (err, row) => {
        if (err) return reject(err);
        const pageCount = row.page_count;
        
        connection.get("PRAGMA page_size", (err, row) => {
          if (err) return reject(err);
          resolve({
            pageCount,
            pageSize: row.page_size,
            fileSize: pageCount * row.page_size
          });
        });
      });
    });
  }
}

module.exports = {
  DATABASE_CONFIG,
  MIGRATION_SCRIPTS,
  DatabaseFactory,
  ScalabilityChecker
};