const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

const cleanDbScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function clean() {
    try {
        await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS \`Payroll\`;');
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS \`LaborContract\`;');
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS \`EmployeeProfile\`;');
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS \`InterviewEvaluation\`;');
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS \`InterviewInterviewer\`;');
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS \`Interview\`;');
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS \`JobApplication\`;');
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS \`AtsCandidate\`;');
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS \`JobPosting\`;');
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS \`JobRequisition\`;');
        await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
        console.log("DB cleaned perfectly.");
    } catch(e) {
        console.error("DB clean error:", e);
        process.exit(1);
    }
}
clean().then(() => process.exit(0));
`;

conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if (err) throw err;
        
        sftp.fastPut('migrate.utf8.sql', '/www/wwwroot/inside.tsol.vn/tsolapp/migrate.tmp.sql', (err) => {
            if (err) throw err;
            console.log('SQL uploaded. Cleaning and executing...');
            
            const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ` +
                `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
                `echo "${cleanDbScript.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')}" > clean-db.js && ` +
                `node clean-db.js && ` +
                `npx prisma db execute --file migrate.tmp.sql --schema prisma/schema.prisma && ` +
                `npx prisma generate && ` +
                `npm run build && ` +
                `pm2 restart all`;
                
            conn.exec(cmd, (err, stream) => {
                if (err) throw err;
                stream.on('close', (code) => {
                    console.log('Close code: ' + code);
                    conn.end();
                }).on('data', (data) => {
                    process.stdout.write(data.toString());
                }).stderr.on('data', (data) => {
                    process.stderr.write(data.toString());
                });
            });
        });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: password });
