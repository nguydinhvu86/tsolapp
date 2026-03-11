const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('mysql -u erpuser -pYmdGAsT5YyE32kYd -h 127.0.0.1 -e "use tsol_erp_prod; show tables;"', (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => process.stdout.write(d.toString()));
        stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
        stream.on('close', () => conn.end());
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
