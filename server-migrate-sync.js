const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected! Starting migration and deployment...');
    const cmd = `
        cd /www/wwwroot/inside.tsol.vn/tsolapp && \\
        export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && \\
        git fetch origin && \\
        git reset --hard origin/main && \\
        if [ -d "public/uploads" ]; then mv public/uploads uploads_data; else echo "public/uploads not found or already moved"; fi && \\
        npm run build && \\
        pm2 restart tsolapp
    `;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', data => process.stdout.write(data.toString()))
              .stderr.on('data', data => process.stderr.write(data.toString()))
              .on('close', (code) => {
                  console.log('Deploy complete, exit code:', code);
                  conn.end();
              });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
