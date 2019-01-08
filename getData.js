let AV = require('leanengine');
let Promise = require('bluebird');

const api = {
  getAllUsers() {
    const query = new AV.Query('_user');
    query.notEqualTo('isDeleted', true);
    query.include('group');
    return query.find();
  },
  getAdminUser() {
    const query = new AV.Query('_user');
    query.equalTo('isAdmin', true);
    query.notEqualTo('isDeleted', true);
    query.include('group');
    return query.find();
  },
  getCurrWeekReport() {
    const today = new Date();
    const day = today.getDay();
    const date = today.getDate();
    const isoDay = day === 0 ? 7 : day;

    let startDate = new Date();
    let endDate = new Date();

    startDate.setDate(date - isoDay + 1);
    startDate.setHours(0);
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);

    endDate.setDate(date + (7 - isoDay));
    endDate.setHours(23);
    endDate.setMinutes(59);
    endDate.setSeconds(59);
    endDate.setMilliseconds(999);

    console.log('本周开始时间：' + startDate);
    console.log('本周结束时间：' + endDate);

    let q = new AV.Query('Logs');

    q.greaterThanOrEqualTo('updatedAt', startDate);
    q.lessThanOrEqualTo('updatedAt', endDate);

    return q.find();
  },
  getUnSubmitUsers() {
    return Promise.all([this.getAllUsers(), this.getCurrWeekReport()]).then(
      results => {
        let users = results[0];
        let reports = results[1];
        let submitUser = {};
        let unsubmitUsers = [];
        reports.forEach(item => {
          submitUser[item.attributes.userId] = true;
        });

        users.forEach(user => {
          if (!submitUser[user.id] && !user.attributes.noReport && user.attributes.email) {
            unsubmitUsers.push({
              name: user.attributes.username,
              email: user.attributes.email
            });
          }
        });

        return unsubmitUsers;
      }
    );
  },
  /**
   * 获取数据
   *
   * @param {String} cls 要查询的class名称
   * @param {Object/Array} conditions 查询条件
   * 每个成员格式为：
   * {
   *     action:'操作名称，可选值为equalTo、notEqualTo、greaterThan、greaterThanOrEqualTo、lessThan、lessThanOrEqualTo',
   *     field:'条件字段名称',
   *     value:'值'
   * }
   * @param {Object/Array} sorts 排序规则，如 [{"sort":"asc","field":"groupId"},{"sort":"desc","field":"memberIndex"}]
   * @returns
   */
  getData(cls, conditions, sorts) {
    let query = new AV.Query(cls);

    if (conditions) {
      if (!(conditions instanceof Array)) {
        conditions = [conditions];
      }
      conditions.forEach(function (item) {
        query[item.action](item.field, item.value);
      });
    }

    if (sorts) {
      if (!(sorts instanceof Array)) {
        sorts = [sorts];
      }

      sorts.forEach(function (item) {
        var sort = item.sort.toLowerCase();
        if (sort == 'asc') {
          item.field && query.addAscending(item.field);
        } else if (sort == 'desc') {
          item.field && query.addDescending(item.field);
        }
      });
    }

    query.limit(1000);

    return query.find();
  },
  assignUserReport(users, logs) {
    console.log('待处理数据如下：');
    console.log(JSON.stringify(logs[0].attributes));
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user.id, {
        userId: user.id,
        username: user.attributes.username,
        extInfo: user.attributes.extInfo,
        groupIndex: user.attributes.groupIndex,
        groupName: user.attributes.groupName,
        memberIndex: user.attributes.memberIndex
      });
    });

    // 形成带人员信息的周报数组
    const reports = [];
    logs.forEach(log => {
      u = userMap.get(log.attributes.userId);
      let report = JSON.parse(log.attributes.report);
      if (report.workList) {
        report.workList.forEach(item => {
          delete item.id;
        });
      }
      if (report.leaveList) {
        report.leaveList.forEach(item => {
          delete item.id;
        });
      }
      if (u) {
        reports.push(Object.assign({}, u, report, {
          reportDate: log.createdAt
        }));
      }
    });

    // 构造指定格式数据
    const weeklyReports = [];
    const weeklyReportMap = new Map();
    reports.forEach(report => {
      const currWeekText = api.getWeekText(report.reportDate);

      let currWeekReport = weeklyReportMap.get(currWeekText);
      if (!currWeekReport) {
        currWeekReport = {
          startDate: api.getWeekStart(report.reportDate),
          endDate: api.getWeekEnd(report.reportDate),
          title: currWeekText,
          reports: [report]
        };
        weeklyReportMap.set(currWeekText, currWeekReport);
      } else {
        currWeekReport.reports.push(report);
      }
    });
    weeklyReportMap.forEach(currWeekReport => {
      weeklyReports.push(currWeekReport);
    });

    return weeklyReports;
  },
  saveAsReport(report, title) {
    // 根据title查询是否已经存在
    let query = new AV.Query('Reports');
    query.equalTo('title', title);
    console.log('查找是否已经存在归档： ' + title);
    return query.find().then((r) => {
      let wk;
      if (r && r.length) {
        console.log('已经存在，进行更新');
        var id = r[0].id;
        wk = AV.Object.createWithoutData('Reports', id);
      } else {
        // 不存在
        console.log('不存在，新增');
        const WeekReport = AV.Object.extend('Reports');
        wk = new WeekReport();
      }
      Object.keys(report).forEach((k) => {
        let d = report[k];
        wk.set(k, d);
      });
      wk.set('ACL', {
        "*": {
          "read": true
        },
        "role:administrator": {
          "read": true,
          "write": true
        }
      });

      return wk.save().then(() => {
        var t = `[${title}]周报已经归档！`;
        console.log(t);
        return t;
      });
    });
  },
  getWeekText(d1) {
    let day = d1.getDay();
    day = day === 0 ? 7 : day;
    const startDate = d1.getDate() - (day - 1);
    const endDate = d1.getDate() + (7 - day);

    const s = new Date(d1.getTime());
    const e = new Date(d1.getTime());

    s.setDate(startDate);
    s.setHours(0, 0, 0, 0);
    e.setDate(endDate);
    e.setHours(23, 59, 59, 999);

    return `${s.getFullYear()}-${(s.getMonth() + 1 + '').padStart(2, 0)}-${(s.getDate() + '').padStart(2, 0)}~${e.getFullYear()}-${(e.getMonth() + 1 + '').padStart(2, 0)}-${(e.getDate() + '').padStart(2, 0)}`;
  },

  getWeekStart(d1) {
    let day = d1.getDay();
    day = day === 0 ? 7 : day;
    const startDate = d1.getDate() - (day - 1);
    const s = new Date(d1.getTime());
    s.setDate(startDate);
    s.setHours(0, 0, 0, 0);

    return s;
  },

  getWeekEnd(d1) {
    let day = d1.getDay();
    day = day === 0 ? 7 : day;
    const endDate = d1.getDate() + (7 - day);
    const e = new Date(d1.getTime());
    e.setDate(endDate);
    e.setHours(23, 59, 59, 999);
    return e;
  }
};

module.exports = api;