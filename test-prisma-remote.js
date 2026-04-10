const { Client } = require('ssh2');

const conn = new Client();
const config = {
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
};

conn.on('ready', () => {
    const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log("Testing CallLog query...");
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 3);

        const cleanPhone = "989425246";
        const lastCall = await prisma.callLog.findFirst({
            where: {
                phone: { endsWith: cleanPhone },
                status: {
                    in: ['ANSWER', 'ANSWERED']
                },
                extension: { notIn: ['', 'QUEUE'] },
                startedAt: { gte: dateLimit }
            }
        });
        console.log("Success:", lastCall ? lastCall.extension : "No call");
    } catch(e) {
        console.error("PRISMA ERROR MESSAGE:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
run();
`;
    // Escape string for echo
    const escaped = scriptContent.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    const cmd = `echo "${escaped}" > /www/wwwroot/inside.tsol.vn/tsolapp/test-prisma.js && cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && node test-prisma.js`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', d => { output += d; process.stdout.write(d); });
        stream.stderr.on('data', d => { process.stderr.write(d); });
        stream.on('close', () => {
            conn.end();
            require('fs').writeFileSync('prisma-out.txt', output);
        });
    });
}).connect(config);
