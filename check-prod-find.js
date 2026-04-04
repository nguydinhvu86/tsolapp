const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `find /www/wwwroot/inside.tsol.vn/tsolapp/ -name "cmmeznb1y000j13xsyb1gfust*" > /tmp/find_res.txt && cat /tmp/find_res.txt`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            conn.end()
        })
        .on('data', data => console.log(data.toString().trim()))
        .stderr.on('data', data => console.error(data.toString().trim()));
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
