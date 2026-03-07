const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const password = 'P@ssw0rdVu';

const filesToUpload = [
    {
        local: path.join(__dirname, 'app', 'sales', 'invoices', 'SalesInvoiceClient.tsx'),
        remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/sales/invoices/SalesInvoiceClient.tsx'
    },
    {
        local: path.join(__dirname, 'app', 'sales', 'estimates', 'SalesEstimateClient.tsx'),
        remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/sales/estimates/SalesEstimateClient.tsx'
    },
    {
        local: path.join(__dirname, 'app', 'purchasing', 'bills', 'PurchaseBillClient.tsx'),
        remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/purchasing/bills/PurchaseBillClient.tsx'
    }
];

conn.on('ready', () => {
    console.log('Connected to server. Uploading updated files...');

    conn.sftp((err, sftp) => {
        if (err) throw err;

        let uploadsCompleted = 0;

        filesToUpload.forEach(file => {
            sftp.fastPut(file.local, file.remote, (err) => {
                if (err) throw err;
                console.log(`Uploaded ${file.local} to ${file.remote}`);
                uploadsCompleted++;

                if (uploadsCompleted === filesToUpload.length) {
                    console.log('All files uploaded. Running build...');
                    conn.exec('cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npm run build && /www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn', (err, stream) => {
                        if (err) throw err;
                        stream.on('close', (code, signal) => {
                            console.log('Deployment finished with code ' + code);
                            conn.end();
                        }).on('data', (data) => {
                            process.stdout.write(data);
                        }).stderr.on('data', (data) => {
                            process.stderr.write(data);
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
