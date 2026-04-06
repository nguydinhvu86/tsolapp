const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.callLog.deleteMany({}).then(() => { console.log('Deleted all call logs'); process.exit(0); });"`;
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
