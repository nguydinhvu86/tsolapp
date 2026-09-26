const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
cd /www/wwwroot/inside.tsol.vn/tsolapp
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH
node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
    const t = await prisma.emailTemplate.findFirst({
        where: { module: "CUSTOMER" }
    });
    console.log("=== SUBJECT ===");
    console.log(t.subject);
    console.log("=== BODY PREVIEW ===");
    console.log(t.body.substring(0, 500) + "...");
}
main().then(() => prisma.$disconnect());
'
`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.pipe(process.stdout);
        stream.stderr.pipe(process.stderr);
        stream.on('close', () => conn.end());
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
