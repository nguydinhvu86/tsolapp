const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('SSH connection established. Requesting SFTP session...');
    
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('SFTP error:', err);
            conn.end();
            return;
        }
        
        console.log('SFTP session opened. Transmitting migrate.utf8.sql...');
        sftp.fastPut('migrate.utf8.sql', '/www/wwwroot/inside.tsol.vn/tsolapp/migrate.utf8.sql', (err) => {
            if (err) {
                console.error('SFTP fastPut error:', err);
                conn.end();
                return;
            }
            
            console.log('SQL patch uploaded successfully! Executing database updates and building...');
            
            const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ` +
                `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
                `npx prisma db execute --file migrate.utf8.sql --schema prisma/schema.prisma && ` +
                `npx prisma generate && ` +
                `npm run build && ` +
                `pm2 restart all`;
                
            conn.exec(cmd, (err, stream) => {
                if (err) {
                    console.error('Exec error:', err);
                    conn.end();
                    return;
                }
                
                stream.on('close', (code, signal) => {
                    console.log('Deployment stream closed with code ' + code);
                    conn.end();
                }).on('data', (data) => {
                    process.stdout.write(data.toString());
                }).stderr.on('data', (data) => {
                    process.stderr.write(data.toString());
                });
            });
        });
    });
}).on('error', (err) => {
    console.error('SSH Connection error:', err);
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
