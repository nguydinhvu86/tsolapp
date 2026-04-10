const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if (err) throw err;
        
        const remoteAppDir = '/www/wwwroot/inside.tsol.vn/app/api/callcenter/debug-db';
        conn.exec(`mkdir -p ${remoteAppDir}`, (err, stream) => {
             stream.on('close', () => {
                 sftp.fastPut(
                     'c:\\Users\\admin\\Documents\\CONTRACT\\app\\api\\callcenter\\debug-db\\route.ts',
                     `${remoteAppDir}/route.ts`,
                     (err) => {
                         if (err) throw err;
                         console.log('Uploaded successfully!');
                         
                         // Restart PM2 to pick up the new dynamic route (NextJS dev/prod might need a quick build or pm2 restart? Wait, NextJS app router needs a build if we add a new route... actually, we could just replace an existing route like `webrtc_logging` temporarily to avoid a full rebuild!)
                         conn.end();
                     }
                 );
             });
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'root',
    password: process.env.SSH_PASSWORD
});
