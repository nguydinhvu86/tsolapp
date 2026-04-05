const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && /www/server/nodejs/v14.17.6/bin/node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); Promise.all([prisma.user.findFirst({where: {name: {contains: 'Phượng'}}}), prisma.customer.findFirst({where: {name: {contains: 'Phượng'}}})]).then(([u, c]) => { console.log('USER:', u ? u.role : null); console.log('CUSTOMER:', c ? c.email : null); }).catch(e => console.error(e)).finally(() => process.exit())"`;
    
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
