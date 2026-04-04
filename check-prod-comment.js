const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected! Checking generic comments remotely...');
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function main() { const comments = await prisma.comment.findMany({ where: { content: { contains: '<img' } }, orderBy: { createdAt: 'desc' }, take: 5, select: { content: true, user: { select: { name: true } } } }); console.log(JSON.stringify(comments, null, 2)); } main().finally(() => prisma.$disconnect());"`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        
        let out = '';
        stream.on('data', data => out += data.toString())
              .stderr.on('data', data => process.stderr.write(data.toString()))
              .on('close', (code) => {
                  console.log(out);
                  conn.end();
              });
    });
}).on('error', err => console.error(err))
  .connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
