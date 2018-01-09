let AV = require('leanengine');
let api = require('./getData.js');

const http = require('http');
const querystring = require('querystring');

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request) {
  return 'Hello world!';
});

// 发起一个post请求
function post(data) {
  const options = {
    hostname: 'fe.epoint.com.cn',
    port: 8080,
    path: '/fedemo/pages/weeklyreport/mail/sendmail.php',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', chunk => {
      console.log(`BODY: ${chunk}`);
    });
  });

  req.on('error', e => {
    console.error(`problem with request: ${e.message}`);
  });

  // write data to request body
  req.write(data);
  req.end();
}

// 给所有需要填写日志的人发邮件
AV.Cloud.define('sendEmail', function(request) {
  api.getAllUsers().then(result => {
    let users = [];
    result.forEach(item => {
      // 排除不用填写日志的人
      if (!item.attributes.noReport && item.attributes.email) {
        users.push({
          name: item.attributes.username,
          email: item.attributes.email
        });
      }
    });
    console.log('=======================');
    console.log('准备给所有用户发送邮件：');
    console.log(JSON.stringify(users, 0, 4));

    // 组织数据发请求
    const data = querystring.stringify({
      user: JSON.stringify(users),
      type: 'all'
    });
    post(data);
  });
});

AV.Cloud.define('sendEmailAgain', function(request) {
  api.getUnSubmitUsers().then(users => {
    console.log('=======================');
    console.log('准备给未提交用户发送邮件：');
    console.log('未提交用户为:');
    console.log(JSON.stringify(users, 0, 4));

    post(
      querystring.stringify({
        type: 'unsubmit',
        user: JSON.stringify(users)
      })
    );
  });
});
