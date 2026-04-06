const { Client } = require('ssh2');
const conn = new Client();
const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
    try {
        const pbxConfig = await prisma.pbxConfig.findFirst();
        if(!pbxConfig) throw new Error("No PBX config");
        
        let baseUrl = pbxConfig.pbxEndpoint;
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
        
        const url = baseUrl + '/api/Agent/status/format/json';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: pbxConfig.apiKey,
                list: [ {ext: '101'}, {ext: '109'}, {ext: '107'} ]
            })
        });
        const text = await res.text();
        console.log("STATUS =", res.status, text);
    } catch(e) {
        console.log("ERR", e.message);
    }
}
check().finally(() => process.exit(0));
`;

conn.on('ready', () => {
    const deployCmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && cat << 'EOF' > get-pbx-status.js\n${scriptContent}\nEOF\nnode get-pbx-status.js`;
    conn.exec(deployCmd, (err, stream) => {
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => conn.end());
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
