const { Client } = require('ssh2'); 
const conn = new Client(); 
const script = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const res = await prisma.callLog.create({
            data: {
                callId: 'tmp-out-' + Date.now(),
                type: 'OUTBOUND',
                phone: '0901232255',
                extension: '109',
                userId: 'cmmdj4db6000bss5ttmyexton',
                startedAt: new Date(),
                duration: 0,
                billsec: 0,
                status: 'RINGING',
                recordingUrl: ''
            }
        });
        console.log("SUCCESS:", res);
    } catch(e) {
        console.log("ERROR:");
        console.error(e);
    }
}
main().finally(() => prisma.$disconnect());
`;
conn.on('ready', () => { 
    conn.exec(`cd /www/wwwroot/inside.tsol.vn/tsolapp && cat << 'EOF' > test-tmp.js\n${script}\nEOF\nexport PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && node test-tmp.js`, (err, stream) => { 
        stream.pipe(process.stdout);
        stream.stderr.pipe(process.stderr);
        stream.on('close', () => { conn.end(); }); 
    }); 
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
