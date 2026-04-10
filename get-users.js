const { Client } = require('ssh2'); 
const conn = new Client(); 
const script = `
const { PrismaClient } = require('@prisma/client'); 
const p = new PrismaClient(); 
async function main() { 
    const users = await p.user.findMany({ select: { id: true, name: true, email: true, extension: true }}); 
    console.log(JSON.stringify(users, null, 2)); 
} 
main().finally(() => p.$disconnect());
`;
conn.on('ready', () => { 
    conn.exec(`cd /www/wwwroot/inside.tsol.vn/tsolapp && cat << 'EOF' > test-ext.js\n${script}\nEOF\nexport PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && node test-ext.js`, (err, stream) => { 
        let out = ''; 
        stream.on('data', d => out += d); 
        stream.on('close', () => { require('fs').writeFileSync('ext-trace.txt', out); conn.end(); process.exit(0); }); 
    }); 
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
