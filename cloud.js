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

function writeLog(info) {
  let date = new Date();
  let Log = AV.Object.extend('EmailLogs');
  let log = new Log();
  log.set('date', date);
  log.set('info', info);
  log.save().then(res => {
    console.log('邮件发送日志已记录！');
  });
}
// 发起一个post请求
function post(data) {
  const options = {
    hostname: 'fe.epoint.com.cn',
    port: 8080,
    path: '/weeklyreport/mail/sendmail.php',
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
    let info = '';
    res.on('data', chunk => {
      info += chunk;
      // console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
      writeLog(info);
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
  console.log('准备处理发送邮件');
  let d = new Date();
  console.log(d);
  return api.getAllUsers().then(result => {
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

    console.log('发送处理完成, 耗时' + (+new Date() - d) + 'ms');
    return users;
  });
});

// 周六未填再次提醒
AV.Cloud.define('sendEmailAgain', function(request) {
  console.log('准备处理发送邮件');
  let d = new Date();
  console.log(d);
  return api.getUnSubmitUsers().then(users => {
    console.log('=======================');
    console.log('周六：准备给未提交用户发送邮件：');
    console.log('未提交用户为:');
    console.log(JSON.stringify(users, 0, 4));

    post(
      querystring.stringify({
        type: 'unsubmit',
        user: JSON.stringify(users)
      })
    );

    console.log('发送处理完成, 耗时' + (+new Date() - d) + 'ms');
  });
});
// 周日警告提醒
AV.Cloud.define('sendEmailwarning', function(request) {
  console.log('准备处理发送邮件');
  let d = new Date();
  console.log(d);
  return api.getUnSubmitUsers().then(users => {
    console.log('=======================');
    console.log('周日：准备给未提交用户发送邮件：');
    console.log('未提交用户为:');
    console.log(JSON.stringify(users, 0, 4));

    post(
      querystring.stringify({
        type: 'warning',
        user: JSON.stringify(users)
      })
    );

    console.log('发送处理完成, 耗时' + (+new Date() - d) + 'ms');
  });
});

// 接受客户端保存用户信息的请求
AV.Cloud.define('savePersonData', function(request) {
  let id = request.params.id;
  let data = request.params.data;
  let keys = Object.keys(data);
  let person = AV.Object.createWithoutData('_User', id);
  keys.forEach(k => {
    person.set(k, data[k]);
  });
  return person.save();
});
