const { Client } = require('ssh2');
const conn = new Client();
const script = `
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.callLog.findMany({ 
   orderBy: { createdAt: 'desc' }, 
   take: 5,
   include: { customer: { select: { name: true } }, lead: { select: { name: true } } }
}).then(r => console.dir(r, {depth: null}))
  .catch(console.error)
  .finally(() => p.$disconnect().then(() => process.exit(0)));
`;

conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        const remoteScript = '/www/wwwroot/inside.tsol.vn/tsolapp/test-calls.js';
        sftp.writeFile(remoteScript, script, (err) => {
            conn.exec(`cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && node test-calls.js`, (err, stream) => {
                if (err) throw err;
                stream.on('close', () => { conn.end(); process.exit(0); })
                      .on('data', d => console.log(d.toString()))
                      .stderr.on('data', d => console.error(d.toString()));
            });
        });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
