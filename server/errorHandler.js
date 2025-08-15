/**
 * 后端错误处理和监控系统
 * 接收前端上报的错误和性能数据
 */

const fs = require('fs').promises;
const path = require('path');

class ErrorHandler {
  constructor() {
    this.errorLogPath = path.join(__dirname, 'logs', 'errors.json');
    this.performanceLogPath = path.join(__dirname, 'logs', 'performance.json');
    this.ensureLogDirectory();
  }

  // 确保日志目录存在
  async ensureLogDirectory() {
    try {
      await fs.mkdir(path.join(__dirname, 'logs'), { recursive: true });
      
      // 初始化日志文件
      try {
        await fs.access(this.errorLogPath);
      } catch {
        await fs.writeFile(this.errorLogPath, JSON.stringify([], null, 2));
      }

      try {
        await fs.access(this.performanceLogPath);
      } catch {
        await fs.writeFile(this.performanceLogPath, JSON.stringify([], null, 2));
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  // 处理错误报告
  async handleErrorReports(req, res) {
    try {
      const { reports } = req.body;
      
      if (!Array.isArray(reports)) {
        return res.status(400).json({ error: 'Reports must be an array' });
      }

      // 读取现有错误日志
      let existingErrors = [];
      try {
        const data = await fs.readFile(this.errorLogPath, 'utf8');
        existingErrors = JSON.parse(data);
      } catch (error) {
        console.warn('Could not read existing error logs:', error.message);
      }

      // 添加新的错误报告
      const processedReports = reports.map(report => ({
        ...report,
        serverTimestamp: new Date().toISOString(),
        processed: false
      }));

      existingErrors.push(...processedReports);

      // 保持最近1000条记录
      if (existingErrors.length > 1000) {
        existingErrors = existingErrors.slice(-1000);
      }

      // 写入文件
      await fs.writeFile(this.errorLogPath, JSON.stringify(existingErrors, null, 2));

      // 处理严重错误
      const criticalErrors = processedReports.filter(report => report.severity === 'critical');
      if (criticalErrors.length > 0) {
        this.handleCriticalErrors(criticalErrors);
      }

      console.log(`Received ${reports.length} error reports, ${criticalErrors.length} critical`);
      
      res.json({ 
        success: true, 
        processed: reports.length,
        critical: criticalErrors.length
      });
    } catch (error) {
      console.error('Error handling reports:', error);
      res.status(500).json({ error: 'Failed to process error reports' });
    }
  }

  // 处理性能数据
  async handlePerformanceReports(req, res) {
    try {
      const { metrics } = req.body;
      
      if (!Array.isArray(metrics)) {
        return res.status(400).json({ error: 'Metrics must be an array' });
      }

      // 读取现有性能日志
      let existingMetrics = [];
      try {
        const data = await fs.readFile(this.performanceLogPath, 'utf8');
        existingMetrics = JSON.parse(data);
      } catch (error) {
        console.warn('Could not read existing performance logs:', error.message);
      }

      // 添加新的性能数据
      const processedMetrics = metrics.map(metric => ({
        ...metric,
        serverTimestamp: new Date().toISOString()
      }));

      existingMetrics.push(...processedMetrics);

      // 保持最近2000条记录
      if (existingMetrics.length > 2000) {
        existingMetrics = existingMetrics.slice(-2000);
      }

      // 写入文件
      await fs.writeFile(this.performanceLogPath, JSON.stringify(existingMetrics, null, 2));

      console.log(`Received ${metrics.length} performance metrics`);
      
      res.json({ 
        success: true, 
        processed: metrics.length 
      });
    } catch (error) {
      console.error('Error handling performance reports:', error);
      res.status(500).json({ error: 'Failed to process performance reports' });
    }
  }

  // 处理严重错误
  handleCriticalErrors(criticalErrors) {
    console.error('🚨 CRITICAL ERRORS DETECTED:', criticalErrors.length);
    
    criticalErrors.forEach(error => {
      console.error(`Critical Error: ${error.message}`);
      console.error(`URL: ${error.url}`);
      console.error(`Session: ${error.sessionId}`);
      console.error(`Time: ${error.timestamp}`);
      
      // 这里可以添加告警通知逻辑
      // 例如：发送邮件、短信、webhook等
    });
  }

  // 获取错误统计
  async getErrorStats(req, res) {
    try {
      let errors = [];
      try {
        const data = await fs.readFile(this.errorLogPath, 'utf8');
        errors = JSON.parse(data);
      } catch (error) {
        console.warn('Could not read error logs:', error.message);
      }

      // 统计最近24小时的错误
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const recentErrors = errors.filter(error => error.timestamp > oneDayAgo);

      const stats = {
        total: recentErrors.length,
        byType: {},
        bySeverity: {},
        recentTrends: this.getErrorTrends(recentErrors)
      };

      recentErrors.forEach(error => {
        stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      });

      res.json(stats);
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: 'Failed to get error statistics' });
    }
  }

  // 获取性能统计
  async getPerformanceStats(req, res) {
    try {
      let metrics = [];
      try {
        const data = await fs.readFile(this.performanceLogPath, 'utf8');
        metrics = JSON.parse(data);
      } catch (error) {
        console.warn('Could not read performance logs:', error.message);
      }

      // 统计最近24小时的性能数据
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const recentMetrics = metrics.filter(metric => metric.timestamp > oneDayAgo);

      const pageLoadMetrics = recentMetrics.filter(m => m.type === 'page_load');
      const apiMetrics = recentMetrics.filter(m => m.type === 'api_call');
      
      const stats = {
        pageLoad: {
          average: pageLoadMetrics.length > 0 
            ? pageLoadMetrics.reduce((sum, m) => sum + m.duration, 0) / pageLoadMetrics.length 
            : 0,
          count: pageLoadMetrics.length
        },
        apiCalls: {
          average: apiMetrics.length > 0 
            ? apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length 
            : 0,
          total: apiMetrics.length,
          slow: apiMetrics.filter(m => m.duration > 2000).length,
          failed: apiMetrics.filter(m => m.additionalData?.status >= 400).length
        },
        trends: this.getPerformanceTrends(recentMetrics)
      };

      res.json(stats);
    } catch (error) {
      console.error('Error getting performance stats:', error);
      res.status(500).json({ error: 'Failed to get performance statistics' });
    }
  }

  // 获取错误趋势
  getErrorTrends(errors) {
    const hours = 24;
    const trends = new Array(hours).fill(0);
    const now = Date.now();

    errors.forEach(error => {
      const hourAgo = Math.floor((now - error.timestamp) / (60 * 60 * 1000));
      if (hourAgo >= 0 && hourAgo < hours) {
        trends[hours - 1 - hourAgo]++;
      }
    });

    return trends;
  }

  // 获取性能趋势
  getPerformanceTrends(metrics) {
    const hours = 24;
    const pageLoadTrends = new Array(hours).fill(0);
    const apiTrends = new Array(hours).fill(0);
    const now = Date.now();

    metrics.forEach(metric => {
      const hourAgo = Math.floor((now - metric.timestamp) / (60 * 60 * 1000));
      if (hourAgo >= 0 && hourAgo < hours) {
        const index = hours - 1 - hourAgo;
        if (metric.type === 'page_load') {
          pageLoadTrends[index] += metric.duration;
        } else if (metric.type === 'api_call') {
          apiTrends[index] += metric.duration;
        }
      }
    });

    return {
      pageLoad: pageLoadTrends,
      apiCalls: apiTrends
    };
  }

  // 健康检查
  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      };

      res.json(health);
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({ status: 'unhealthy', error: error.message });
    }
  }
}

module.exports = new ErrorHandler();