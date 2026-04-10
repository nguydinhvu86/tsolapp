const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    conn.exec('grep "calldata?callid=.*&calldate= " /www/wwwroot/inside.tsol.vn/tsolapp/public/test-webhook.txt > grep-trace.txt && cat grep-trace.txt | tail -n 20', (err, stream) => { 
        let output = "";
        stream.on('data', d => output += d); 
        stream.on('close', () => { require('fs').writeFileSync('grep-out.txt', output); conn.end(); process.exit(0); }); 
    }); 
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
