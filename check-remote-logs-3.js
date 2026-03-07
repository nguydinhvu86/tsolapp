const { Client } = require('ssh2');
const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    // Check Nginx Access logs for POST requests today
    const cmd1 = `echo '${password}' | sudo -S grep "POST " /www/wwwlogs/inside.tsol.vn.log | tail -n 20`;

    // Check Nginx Error logs
    const cmd2 = `echo '${password}' | sudo -S tail -n 20 /www/wwwlogs/inside.tsol.vn.error.log`;

    conn.exec(`${cmd1}; echo "---ERROR LOG---"; ${cmd2}`, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('close', () => {
            console.log(output);
            conn.end();
        }).on('data', (data) => {
            output += data.toString();
        }).stderr.on('data', (data) => {
            console.error(data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
