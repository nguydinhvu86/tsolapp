const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

// Retrieve local config from `.env`
require('dotenv').config();

conn.on('ready', () => {
    // We create the inner script first using echo
    // This script will UPDATE or CREATE the Pusher config settings in Production DB
    const innerScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
      const keys = {
          'PUSHER_APP_ID': '${process.env.PUSHER_APP_ID}',
          'PUSHER_KEY': '${process.env.PUSHER_KEY}',
          'PUSHER_SECRET': '${process.env.PUSHER_SECRET}',
          'PUSHER_CLUSTER': '${process.env.PUSHER_CLUSTER}'
      };
      
      for (const [key, value] of Object.entries(keys)) {
         if (!value) continue;
         await prisma.systemSetting.upsert({
            where: { key: key },
            update: { value: value },
            create: { key: key, value: value }
         });
         console.log('Upserted ' + key);
      }
      console.log('Pusher configuration successfully injected.');
  } catch(e) { console.error(e); }
}
run().finally(() => {
    prisma.$disconnect();
    process.exit(0);
});
`;

    // Write the inner script on the remote server
    const createScriptCmd = `echo '${password}' | sudo -S bash -c "cat << 'INNER_EOF' > /www/wwwroot/inside.tsol.vn/tsolapp/tmp-pusher.js
${innerScript}
INNER_EOF"`;

    // Run the script on the remote server using the exact absolute path to the node executable in AAPanel
    const runScriptCmd = `echo '${password}' | sudo -S bash -c "cd /www/wwwroot/inside.tsol.vn/tsolapp && /www/server/nodejs/v20.18.3/bin/node tmp-pusher.js"`;

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
