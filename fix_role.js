const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function main() { await prisma.user.updateMany({ where: { email: 'nguydinhvu88@gmail.com' }, data: { role: 'ADMIN' } }); console.log('Fixed role back to ADMIN'); } main().catch(console.error).finally(() => process.exit());"`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
