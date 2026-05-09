const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();
const APP_PATH = '/www/wwwroot/inside.tsol.vn/tsolapp';
conn.on('ready', () => {
    const script = `
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        async function run() {
            const form = await prisma.marketingForm.findFirst({
                orderBy: { updatedAt: 'desc' }
            });
            console.log('Most recently updated form:', form.title);
            console.log('Description length:', form.description ? form.description.length : 0);
        }
        run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
    `;
    const cmd = `cd ${APP_PATH} && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` + 
                `cat << 'EOF' > test-db-length.js\n${script}\nEOF\n` + 
                `node test-db-length.js`;
                
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('close', (code) => {
            fs.writeFileSync('temp/db_len_out.txt', out);
            conn.end();
            process.exit(code);
        });
        stream.on('data', data => { out += data.toString() });
        stream.stderr.on('data', data => { out += data.toString() });
    });
}).connect({ host: '124.158.9.5', username: 'incall', password: 'P@ssw0rdVu' });
