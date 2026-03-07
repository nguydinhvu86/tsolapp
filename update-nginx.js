const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const password = 'P@ssw0rdVu';

let configContent = fs.readFileSync('nginx_backup.conf', 'utf8');

// Inject the location block before the Next.js Reverse proxy
const uploadsLocationBlock = `
    # Serve uploads directly from the public directory
    location ^~ /uploads/ {
        alias /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Next.js Reverse Proxy`;

if (!configContent.includes('location ^~ /uploads/')) {
    configContent = configContent.replace('# Next.js Reverse Proxy', uploadsLocationBlock);
}

fs.writeFileSync('nginx_new.conf', configContent);

conn.on('ready', () => {
    console.log('Uploading new Nginx config...');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        const readStream = fs.createReadStream('nginx_new.conf');
        const writeStream = sftp.createWriteStream('/tmp/inside.tsol.vn.conf');

        writeStream.on('close', () => {
            console.log('File uploaded to /tmp. Moving to production location and reloading Nginx...');
            const cmd = `echo '${password}' | sudo -S mv /tmp/inside.tsol.vn.conf /www/server/panel/vhost/nginx/inside.tsol.vn.conf && echo '${password}' | sudo -S nginx -t && echo '${password}' | sudo -S nginx -s reload`;
            conn.exec(cmd, (err, stream) => {
                if (err) throw err;
                stream.on('close', () => {
                    console.log('Nginx reloaded successfully.');
                    conn.end();
                }).on('data', (data) => {
                    process.stdout.write(data.toString());
                }).stderr.on('data', (data) => {
                    process.stderr.write(data.toString());
                });
            });
        });
        readStream.pipe(writeStream);
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
