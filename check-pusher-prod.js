const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    // We create the inner script first using echo
    const innerScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
      const s = await prisma.systemSetting.findMany({ where: { key: { startsWith: 'PUSHER_' } } });
      console.log(JSON.stringify(s, null, 2));
  } catch(e) { console.error(e); }
}
run().finally(() => prisma.$disconnect());
`;

    // Write the inner script on the remote server
    const createScriptCmd = `echo '${password}' | sudo -S bash -c "cat << 'INNER_EOF' > /www/wwwroot/inside.tsol.vn/tsolapp/tmp-pusher.js
${innerScript}
INNER_EOF"`;

    // Run the script on the remote server
    const runScriptCmd = `echo '${password}' | sudo -S bash -c "cd /www/wwwroot/inside.tsol.vn/tsolapp && /www/server/nvm/versions/node/v20*/bin/node tmp-pusher.js"`;

    conn.exec(`${createScriptCmd} && ${runScriptCmd}`, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('close', () => {
            console.log("Result:\n", out);
            conn.end();
        }).on('data', (data) => {
            out += data.toString();
        }).stderr.on('data', (data) => {
            console.error("stderr:", data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
