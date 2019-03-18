let AV = require('leanengine');
let api = require('../getData.js');

// 归档历史周报
AV.Cloud.define('archiveReport', function (request) {
    // 查询得到最早的时间 然后最终时间取当前 逐周调用归档即可
    const reportQuery = new AV.Query('Logs');
    reportQuery.addAscending('createdAt');
    return reportQuery.first().then((r) => {
        const dateStart = r.createdAt;
        const dateEnd = new Date();
        if (+dateEnd <= +dateStart) {
            console.warn('没有需要归档的数据~！');
            return;
        }

        // 逐周调用 。。。
        const archiveArr = [];
        while (+dateStart <= +dateEnd) {
            archiveArr.push(
                AV.Cloud.run('saveAsReport', {
                    date: new Date(dateStart.getTime())
                })
            );

            // 下一周
            dateStart.setDate(date.getDate() + 7);
        }

        return Promise.all(archiveArr);
    }).catch(error => {
        console.error(error);
        return error;
    })
});