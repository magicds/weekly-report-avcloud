let AV = require('leanengine');
let Promise = require('bluebird');

module.exports = {
  getAllUsers() {
    return new AV.Query('_User').find();
  },
  getAdminUser() {
    const query = new AV.Query('_user');
    query.equalTo('isAdmin', true);
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
          if (
            !submitUser[user.id] &&
            !user.attributes.noReport &&
            user.attributes.email
          ) {
            unsubmitUsers.push({
              name: user.attributes.username,
              email: user.attributes.email
            });
          }
        });

        return unsubmitUsers;
      }
    );
  }
};
