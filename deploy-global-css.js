const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Uploading Global CSS configs...');
    conn.sftp((err, sftp) => {
        if (err) throw err;

        const filesToUpload = [
            { local: 'C:/Users/admin/Documents/CONTRACT/app/globals.css', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/globals.css' },
            { local: 'C:/Users/admin/Documents/CONTRACT/tailwind.config.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/tailwind.config.ts' },
            { local: 'C:/Users/admin/Documents/CONTRACT/postcss.config.js', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/postcss.config.js' }
        ];

        let uploadedCount = 0;

        filesToUpload.forEach(file => {
            sftp.fastPut(file.local, file.remote, (err) => {
                if (err) throw err;
                console.log(`Uploaded ${file.local}`);
                uploadedCount++;

                if (uploadedCount === filesToUpload.length) {
                    console.log('Files uploaded. Running build...');

                    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ` +
                        `rm -f tailwind.config.js && ` + // Remove old js config to prevent conflicts
                        `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
                        `npm run build && ` +
                        `/www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

                    console.log('Executing:', cmd);
                    conn.exec(cmd, (err, execStream) => {
                        if (err) throw err;

                        execStream.on('data', (data) => process.stdout.write(data.toString()));
                        execStream.stderr.on('data', (data) => process.stderr.write(data.toString()));

                        execStream.on('close', (code) => {
                            console.log(`\nDeployment finished with code ${code}`);
                            conn.end();
                        });
                    });
                }
            });
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
