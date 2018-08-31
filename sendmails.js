const nodemailer = require('nodemailer');

for (var key in process.env) {
    console.log(`process.env.${key} : ${process.env[key]}`);
}

if (process.env.SMTOP_HOST === undefined) {
    throw new Error('SMTOP_HOST 未配置，获取到值为' + process.env.SMTOP_HOST);
}
if (process.env.SMTOP_PORT === undefined) {
    throw new Error('SMTOP_PORT 未配置，获取到值为' + process.env.SMTOP_PORT);
}
if (process.env.SMTOP_SECURE === undefined) {
    throw new Error('SMTOP_SECURE 未配置，获取到值为' + process.env.SMTOP_SECURE);
}
if (process.env.SMTP_USER === undefined) {
    throw new Error('SMTP_USER 未配置，获取到值为' + process.env.SMTP_USER);
}
if (process.env.SMTP_PWD === undefined) {
    throw new Error('SMTP_PWD 未配置，获取到值为' + process.env.SMTP_PWD);
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTOP_HOST,
    port: process.env.SMTOP_PORT,
    secure: process.env.SMTOP_SECURE,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PWD
    }
}, {
    from: process.env.SMTP_USER
});
const MAIL_TITLE = {
    fri: '[新点前端]周报填写提醒',
    sat: '[新点前端]周报填写提醒',
    sun: '[新点前端]周报填写提醒',
    verify: '[新点前端]新成员注册验证提醒'
};
const getMailContent = (type, injectedData) => {
    let content = ''
    switch (type) {
        case 'fri':
            content = `
                <p>${injectedData.name}:</p>
                <p>您好，今天又是周五啦，请记得填写本周周报：</p>
                <p><a href="http://fe.epoint.com.cn:8080/weeklyreport/" target="_black">http://fe.epoint.com.cn:8080/weeklyreport/</a></p>
                <p>——来自新点前端周报，预祝您周末愉快！</p>
            `
            break;
        case 'sat':
            content = `
                <p>${injectedData.name}:</p>
                <p>您好，<span style="color:#f1a325;">今天已经是周六了，您还没填写本周周报</span>，请及时点击下方链接进行填写：</p>
                <p><a href="http://fe.epoint.com.cn:8080/weeklyreport/" target="_black">http://fe.epoint.com.cn:8080/weeklyreport/</a></p>
                <p>——来自新点前端周报，祝您周末愉快！</p>
            `
            break;
        case 'sun':
            content = `
                <p>${injectedData.name}:</p>
                <p>您好，<span style="color:#ea644a;">今天已经是周日了，您还没填写本周周报</span>，请点击下方链接进入填写，务必在今天完成填写</p>
                <p><a href="http://fe.epoint.com.cn:8080/weeklyreport/" target="_black">http://fe.epoint.com.cn:8080/weeklyreport/</a></p>
                <p>再忙也不要忘记填写周报哦！</p>
            `
            break;
        case 'verify':
            content = `
                <p>${injectedData.name}:</p>
                <p>您好，<span style="color:#ea644a;">${injectedData.verifyUsername}</span>，已经注册进入周报系统。</p> <p><span style="color:#ea644a;">如果您确认 TA 是团队成员</span>，请及时点击下方链接通过其验证请求（验证通过的用户才能正常使用周报系统）。</p><p><a href="http://fe.epoint.com.cn:8080/weeklyreport/#/main/verify" target="_black">http://fe.epoint.com.cn:8080/weeklyreport/#/main/verify</a></p>
            `
            break;
        default:
            break;
    }
    return content;
};

const sendEmails = (data) => {
    const {
        users,
        type,
        verifyUsername
    } = data;
    if (!users || !users.length) {
        console.error('未获取到收件人');
        return;
    }
    users.forEach(user => {

        transporter.sendMail({
            to: user.email,
            subject: MAIL_TITLE[type],
            html: getMailContent(type, {
                name: user.name,
                verifyUsername: verifyUsername
            })
        }).then(res => {
            console.log(`【mial】【${type}】to ${res.accepted} already send`);
        }).catch(err => {
            console.error(err);
        });
    });
};

module.exports = sendEmails;