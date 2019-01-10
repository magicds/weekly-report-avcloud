let AV = require('leanengine');
let api = require('../getData.js');

AV.Cloud.define('assignUserAndGroup', function (request) {
  return Promise.all([api.getAllUsers(), api.getData('Group')]).then((res) => {
    const users = res[0];
    const groups = res[1];
    if (!users.length) {
      return;
    }
    if (users[0].attributes.group) {
      return new Promise((resolve, reject) => {
        reject('已经更新过了，请勿重复更新！');
      });
    }
    const groupMap = {};
    groups.forEach(group => {
      groupMap[group.attributes.index] = group;
    });

    users.forEach(u => {
      const group = groupMap[u.attributes.groupIndex];
      group && u.set('group', group);
    });

    return AV.Object.saveAll(users).then(() => {
      return new Promise((resolve) => {
        resolve('用户数据更新成功');
      });
    });
  });
});