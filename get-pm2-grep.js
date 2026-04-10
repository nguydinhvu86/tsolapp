const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    conn.exec(`grep -i "Failed to write temporary clickToCall log" /home/incall/.pm2/logs/inside.tsol.vn-out.log /home/incall/.pm2/logs/inside.tsol.vn-error.log`, (err, stream) => { 
        let out = ''; 
        stream.on('data', d => out += d); 
        stream.on('close', () => { console.log(out || "No match found."); conn.end(); process.exit(0); }); 
    }); 
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
