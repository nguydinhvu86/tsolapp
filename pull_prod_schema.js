const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('export PATH=/www/server/nodejs/v14.17.6/bin:/www/server/nvm/versions/node/v24.14.0/bin:$PATH && cd /www/wwwroot/inside.tsol.vn/tsolapp && npx prisma db pull --print', (err, stream) => {
        if (err) throw err;
        let data = '';
        stream.on('data', (d) => data += d.toString());
        stream.stderr.on('data', (d) => console.error(d.toString()));
        stream.on('close', () => {
            fs.writeFileSync('prod_schema.prisma', data);
            console.log('Schema pulled successfully.');
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
