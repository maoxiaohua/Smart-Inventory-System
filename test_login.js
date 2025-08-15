const http = require('http');

function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(body);
                    resolve({
                        status: res.statusCode,
                        data: jsonData
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: body
                    });
                }
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function testAdminLogin() {
    try {
        console.log('测试admin登录...');
        
        const loginOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const loginData = {
            username: 'admin',
            password: 'admin123'
        };
        
        const response = await makeRequest(loginOptions, loginData);
        
        console.log('登录响应状态:', response.status);
        console.log('登录响应数据:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success && response.data.token) {
            console.log('\n✅ 登录成功！');
            console.log('Token:', response.data.token.substring(0, 50) + '...');
            console.log('用户信息:', response.data.user);
            
            // 测试token验证
            console.log('\n测试token验证...');
            const verifyOptions = {
                hostname: 'localhost',
                port: 3001,
                path: '/api/auth/verify',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${response.data.token}`
                }
            };
            
            const verifyResponse = await makeRequest(verifyOptions);
            console.log('验证响应:', JSON.stringify(verifyResponse.data, null, 2));
        }
        
    } catch (error) {
        console.error('❌ 登录失败:', error.message);
    }
}

testAdminLogin();