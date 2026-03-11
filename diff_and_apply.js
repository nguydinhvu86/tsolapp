const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    // Read .env first
    conn.exec('cat /www/wwwroot/inside.tsol.vn/tsolapp/.env', (err, stream) => {
        let envData = '';
        stream.on('data', d => envData += d.toString());
        stream.on('close', () => {
            const match = envData.match(/DATABASE_URL="([^"]+)"/);
            if (!match) throw new Error("Could not find DATABASE_URL");

            const dbUrl = match[1];
            console.log("Found DB URL");

            // USE STRICTLY v24.14.0
            const dbCmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
                `npx prisma migrate diff --from-url "${dbUrl}" --to-schema-datamodel prisma/schema.prisma --script > apply.sql && ` +
                `cat apply.sql`;

            conn.exec(dbCmd, (err2, stream2) => {
                let sqlData = '';
                stream2.on('data', d => sqlData += d.toString());
                stream2.stderr.on('data', d => console.error(d.toString()));
                stream2.on('close', () => {
                    const fs = require('fs');
                    fs.writeFileSync('apply.sql', sqlData);
                    console.log("SQL diff saved to apply.sql");
                    conn.end();
                });
            });
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
