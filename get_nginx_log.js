const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `tail -n 1500 /www/wwwlogs/inside.tsol.vn.log | grep "/api/callcenter"`;
    let out = '';
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log(out);
            conn.end();
            process.exit(0);
        }).on('data', (d) => out += d.toString())
          .stderr.on('data', (d) => out += d.toString());
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
