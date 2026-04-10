const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    conn.exec('tail -n 150 /www/wwwroot/inside.tsol.vn/tsolapp/public/route-log.txt', (err, stream) => { 
        let output = ''; 
        stream.on('data', d => output += d); 
        stream.on('close', () => { require('fs').writeFileSync('route-trace.txt', output); conn.end(); process.exit(0); }); 
    }); 
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
