const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    conn.exec('cat /www/wwwroot/inside.tsol.vn/tsolapp/public/test-webhook.txt | tail -n 250', (err, stream) => { 
        let output = ''; 
        stream.on('data', d => { output += d; }); 
        stream.on('close', () => { 
            require('fs').writeFileSync('remote-webhook-logs-2.txt', output); 
            console.log('done'); 
            conn.end(); 
            process.exit(0); 
        }); 
    }); 
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
