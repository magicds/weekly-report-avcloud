const nodemailer = require('nodemailer');

if (process.env.SMTP_HOST === undefined) {
    console.error('SMTP_HOST 未配置，获取到值为' + process.env.SMTP_HOST);
}
if (process.env.SMTP_PORT === undefined) {
    console.error('SMTP_PORT 未配置，获取到值为' + process.env.SMTP_PORT);
}
if (process.env.SMTP_SECURE === undefined) {
    console.error('SMTP_SECURE 未配置，获取到值为' + process.env.SMTP_SECURE);
}
if (process.env.SMTP_USER === undefined) {
    console.error('SMTP_USER 未配置，获取到值为' + process.env.SMTP_USER);
}
if (process.env.SMTP_PWD === undefined) {
    console.error('SMTP_PWD 未配置，获取到值为' + process.env.SMTP_PWD);
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PWD
    }
}, {
    from: {
        name: '网站研发部周报',
        address: process.env.SMTP_USER
    }
});

transporter.verify(function (error, success) {
    if (error) {
        console.log(error);
    } else {
        console.log('SMTP Server is ready to take our messages');
    }
});

const MAIL_TITLE = {
    fri: '[网站研发部]周报填写提醒',
    sat: '[网站研发部]周报填写提醒',
    sun: '[网站研发部]周报填写提醒',
    verify: '[网站研发部]新成员注册验证提醒'
};
const getMailContent = (type, injectedData) => {
    let content = ''
    switch (type) {
        case 'fri':
            content = `
                <p>${injectedData.name}:</p>
                <p>您好，今天又是周五啦，请记得填写本周周报：</p>
                <p><a href="http://192.168.201.156:81/weeklyreport/" target="_black">http://192.168.201.156:81/weeklyreport/</a></p>
                <p>——来自新点前端周报，预祝您周末愉快！</p>
            `
            break;
        case 'sat':
            content = `
                <p>${injectedData.name}:</p>
                <p>您好，<span style="color:#f1a325;">今天已经是周六了，您还没填写本周周报</span>，请及时点击下方链接进行填写：</p>
                <p><a href="http://192.168.201.156:81/weeklyreport/" target="_black">http://192.168.201.156:81/weeklyreport/</a></p>
                <p>——来自新点前端周报，祝您周末愉快！</p>
            `
            break;
        case 'sun':
            content = `
                <p>${injectedData.name}:</p>
                <p>您好，<span style="color:#ea644a;">今天已经是周日了，您还没填写本周周报</span>，请点击下方链接进入填写，务必在今天完成填写</p>
                <p><a href="http://192.168.201.156:81/weeklyreport/" target="_black">http://192.168.201.156:81/weeklyreport/</a></p>
                <p>再忙也不要忘记填写周报哦！</p>
            `
            break;
        case 'verify':
            content = `
                <p>${injectedData.name}:</p>
                <p>您好，<span style="color:#ea644a;">${injectedData.verifyUsername}</span>，已经注册进入周报系统。</p> <p><span style="color:#ea644a;">如果您确认 TA 是团队成员</span>，请及时点击下方链接通过其验证请求（验证通过的用户才能正常使用周报系统）。</p><p><a href="http://192.168.201.156:81/weeklyreport/#/main/verify" target="_black">http://192.168.201.156:81/weeklyreport/#/main/verify</a></p>
            `
            break;
        default:
            break;
    }
    return content;
};

const sendEmails = (data) => {
    console.log('nodemailer 发送邮件:');
    let {
        users,
        type,
        verifyUsername
    } = data;
    if (!users || !users.length) {
        console.error('未获取到收件人');
        return;
    }

    sendOneMail(users);

    function sendOneMail(users) {
        const user = users.splice(0, 1)[0];
        const needNext = users.length;
        console.log(user);
        transporter.sendMail({
            to: user.email,
            subject: MAIL_TITLE[type],
            html: getMailContent(type, {
                name: user.name,
                verifyUsername: verifyUsername
            })
        }).then(res => {
            console.log(`【mial】【${type}】to ${user.name}(${res.accepted}) already send`);
            needNext && sendOneMail(users);
        }).catch(err => {
            console.error(`【mial】【${type}】 send to ${user.name}(${user.emial}) failed`);
            console.error(err);
            needNext && sendOneMail(users);
        });
    }

};


module.exports = sendEmails;
