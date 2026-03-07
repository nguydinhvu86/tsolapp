const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Executing git commands...');

    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ` +
        `git checkout fix/chat-sidebar-ui && ` +
        `git config user.email "admin@tsol.vn" && ` +
        `git config user.name "System Admin" && ` +
        `git commit -a -m "fix(ui): restore online monitoring and resize chat widget" && ` +
        `git push origin fix/chat-sidebar-ui`;

    console.log('Executing:', cmd);
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        stream.on('close', (code, signal) => {
            console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
            conn.end();
        }).on('data', (data) => {
            console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
