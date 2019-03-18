let AV = require('leanengine');
let api = require('../getData.js');

// 归档历史周报
AV.Cloud.define('archiveReport', function (request) {
  console.log('执行批量归档历史周报任务:');
  // 查询得到最早的时间 然后最终时间取当前 逐周调用归档即可
  const reportQuery = new AV.Query('Logs');
  reportQuery.addAscending('createdAt');
  return reportQuery.first().then((r) => {
    const dateStart = r.createdAt;
    console.log(`最早一条周报的时间为： ${dateStart}`);
    const dateEnd = new Date();
    if (+dateEnd <= +dateStart) {
      console.warn('没有需要归档的数据~！');
      return;
    }

    // 逐周调用 。。。
    console.log(`开始归档 ${dateStart} 到 ${dateEnd} 之间的周报`);
    // promise.all 直接全部发起会 导致 429 Too many requests.
    // 暂时逐个发出
    function run() {
      return AV.Cloud.run('saveAsReport', {
        date: new Date(dateStart.getTime())
      }).finally(() => {
        dateStart.setDate(dateStart.getDate() + 7);
        if (+dateStart <= +dateEnd) {
          return run();
        }
      });
    }

    return run();
  }).catch(error => {
    console.error(error);
    return error;
  })
});