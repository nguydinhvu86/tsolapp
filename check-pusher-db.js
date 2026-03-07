const { Client } = require('ssh2');
const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    // Query database for Pusher Settings
    const sqlQuery = "SELECT `key`, `value` FROM SystemSetting WHERE `key` LIKE 'PUSHER_%';";
    const cmd = `echo '${password}' | sudo -S mysql -u tsolapp -p'P@ssw0rdVu' tsolapp -e "${sqlQuery}"`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('close', () => {
            console.log(out);
            conn.end();
        }).on('data', (data) => {
            out += data.toString();
        }).stderr.on('data', (data) => {
            console.error("stderr:", data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
