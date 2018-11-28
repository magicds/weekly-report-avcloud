let AV = require('leanengine');
let api = require('./getData.js');

const http = require('http');
const querystring = require('querystring');

const sendEmails = require('./sendmails');

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function (request) {
  return 'Hello world!';
});

function writeLog(info, type) {
  let date = new Date();
  let Log = AV.Object.extend('EmailLogs');
  let log = new Log();
  log.set('type', type || 'sendEmail');
  log.set('date', date);
  log.set('info', info);
  log.save().then(res => {
    console.log('邮件发送日志已记录！');
  });
}

// 给所有需要填写日志的人发邮件
AV.Cloud.define('sendEmail', function (request) {
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
    const data = {
      users: users,
      type: 'fri'
    };
    // post(data);
    sendEmails(data);

    console.log('发送处理完成, 耗时' + (+new Date() - d) + 'ms');
    return users;
  });
});

// 周六未填再次提醒
AV.Cloud.define('sendEmailAgain', function (request) {
  console.log('准备处理发送邮件');
  let d = new Date();
  console.log(d);
  return api.getUnSubmitUsers().then(users => {
    console.log('=======================');
    console.log('周六：准备给未提交用户发送邮件：');
    console.log('未提交用户为:');
    console.log(JSON.stringify(users, 0, 4));

    sendEmails({
      type: 'sat',
      users: users
    });

    console.log('发送处理完成, 耗时' + (+new Date() - d) + 'ms');
  });
});
// 周日警告提醒
AV.Cloud.define('sendEmailwarning', function (request) {
  console.log('准备处理发送邮件');
  let d = new Date();
  console.log(d);
  return api.getUnSubmitUsers().then(users => {
    console.log('=======================');
    console.log('周日：准备给未提交用户发送邮件：');
    console.log('未提交用户为:');
    console.log(JSON.stringify(users, 0, 4));

    sendEmails({
      type: 'sun',
      users: users
    });

    console.log('发送处理完成, 耗时' + (+new Date() - d) + 'ms');
  });
});

// 接受客户端保存用户信息的请求
AV.Cloud.define('savePersonData', function (request) {
  let id = request.params.id;
  let data = request.params.data;
  let keys = Object.keys(data);
  // let person = AV.Object.createWithoutData('_User', id);
  let query = new AV.Query('_User');
  return query.get(id).then((person) => {
    keys.forEach(k => {
      person.set(k, data[k]);
      return person.save();
    });
  });
});

// 用户注册
AV.Cloud.define('userSignUp', function (request) {
  const data = request.params;
  const user = request.currentUser;

  const UserVerifyLogs = AV.Object.extend('UserVerifyLogs');
  const log = new UserVerifyLogs();
  log.set('type', 'signup');
  log.set('user', user);
  log.set('targetUser', user);
  log.set('info', `${user.attributes.username} 新注册进入系统，请求验证。`);
  return Promise.all(
    [
      log.save(),
      api.getAdminUser()
    ]
  ).then(result => {
    const r2 = result[1];
    const users = [];
    r2.forEach(item => {
      users.push({
        name: item.attributes.username,
        email: item.attributes.email
      });
    });

    sendEmails({
      type: 'verify',
      users: users,
      verifyUsername: user.attributes.username
    });

    return {
      success: true
    };

  });
});

// 通过用户验证
AV.Cloud.define('verifyUser', function (request) {
  const data = request.params;
  const user = request.currentUser;
  const UserVerifyLogs = AV.Object.extend('UserVerifyLogs');
  const log = new UserVerifyLogs();
  const query = new AV.Query('_User');

  if (!user.attributes.isAdmin) {
    return new Promise((resolve, reject) => {
      reject('你无权限进行此操作');
    });
  }

  return query.get(data.targetUser).then(function (tu) {
    if (!tu) {
      throw new Error('目标用户不存在');
    }
    if (tu.attributes.verify === true) {
      throw new Error('目标用户已经通过验证');
    }
    // 验证日志
    log.set('type', 'verify');
    log.set('user', user);
    log.set('targetUser', tu);
    log.set('info', `${user.attributes.username} 通过了 ${tu.attributes.username} 的验证请求。`);
    // 更新用户验证状态
    tu.set('verify', true);
    // 同时提交用户状态和日志
    return Promise.all([tu.save(), log.save()]).then((r) => {
      return {
        success: true
      };
    }).catch(err => {
      console.log(err);
      throw err;
    })
  }).catch(err => {
    console.log(err);
    throw err;
  });
});

// 删除用户
AV.Cloud.define('deleteUser', function (request) {
  const data = request.params;
  const user = request.currentUser;
  const UserVerifyLogs = AV.Object.extend('UserVerifyLogs');
  const log = new UserVerifyLogs();
  const query = new AV.Query('_User');

  if (!user.attributes.isAdmin) {
    return new Promise((resolve, reject) => {
      reject('你无权限进行此操作');
    });
  }

  return query.get(data.targetUser).then(function (tu) {
    if (!tu) {
      throw new Error('目标用户不存在');
    }
    // if (tu.attributes.verify === true) {
    //   throw new Error('目标用户已经通过验证，无法删除！');
    // }
    // 验证日志
    log.set('type', 'delete');
    log.set('user', user);
    log.set('info', `${user.attributes.username} 删除了用户 ${tu.attributes.username}`);
    // 同时提交用户状态和日志
    return Promise.all([tu.destroy(), log.save()]).then((r) => {
      return {
        success: true
      };
    }).catch(err => {
      console.log(err);
      throw err;
    })
  }).catch(err => {
    console.log(err);
    throw err;
  });
});

// 周报归档
AV.Cloud.define('saveAsReport', function (request) {
  console.log('\n\n执行归档任务');
  let date;
  if (request.params && request.params.date) {
    date = request.params.date;
    date = new Date(date.iso);
  } else {
    // 取当前时间 定时在周一凌晨 则向前一天
    date = new Date();
    date.setDate(date.getDate() - 2);
  }
  const t1 = api.getWeekStart(date);
  const t2 = api.getWeekEnd(date);
  const title = api.getWeekText(date);

  console.log(t1, t2, title);

  return Promise.all([api.getAllUsers(), api.getData(
    "Reports",
    [{
        action: "greaterThanOrEqualTo",
        field: "startDate",
        value: t1
      },
      {
        action: "lessThanOrEqualTo",
        field: "endDate",
        value: t2
      }
    ], {
      sort: "asc",
      field: "startDate"
    }
  )]).then((r) => {
    console.log('查询成功');
    if (!r[1].length) {
      console.log('指定时间段内无数据');
      return {
        msg: '指定时间段内无数据'
      };
    }
    const reports = api.assignUserReport(r[0], r[1]);
    console.log('日志归档数据获取成功');
    console.log(reports);    
    // 保存
    return api.saveAsReport(reports[0], title);
  }).catch(err => {
    console.error(err);
  });

});