const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected! Checking remote file...');
    conn.exec('cat /www/wwwroot/inside.tsol.vn/tsolapp/app/tasks/\\[id\\]/TaskDetailClient.tsx | grep "Nhật ký Gửi Email"', (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('close', (code, signal) => {
            console.log('Close code:', code);
            if (dataStr.trim() === '') {
                console.log('THE STRING WAS NOT FOUND ON THE REMOTESERVER!');
            } else {
                console.log('Found string:', dataStr);
            }
            conn.end();
        }).on('data', (data) => {
            dataStr += data.toString();
        }).stderr.on('data', (data) => {
            console.error('STDERR:', data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
