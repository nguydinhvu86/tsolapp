const { Client } = require('ssh2'); 
const conn = new Client(); 
const script = `
const fs = require('fs');
try {
    const err = fs.readFileSync('/home/incall/.pm2/logs/inside.tsol.vn-error.log', 'utf8');
    const out = fs.readFileSync('/home/incall/.pm2/logs/inside.tsol.vn-out.log', 'utf8');
    
    // get tail
    const errLines = err.split('\\n').slice(-150).join('\\n');
    const outLines = out.split('\\n').slice(-150).join('\\n');
    console.log("=== ERR ===");
    console.log(errLines);
    console.log("=== OUT ===");
    console.log(outLines);
} catch(e) {
    console.error(e);
}
`;
conn.on('ready', () => { 
    conn.exec(`cd /www/wwwroot/inside.tsol.vn/tsolapp && cat << 'EOF' > pm2-ext.js\n${script}\nEOF\nexport PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && node pm2-ext.js`, (err, stream) => { 
        let out = ''; 
        stream.on('data', d => out += d); 
        stream.on('close', () => { require('fs').writeFileSync('pm2-err.txt', out); conn.end(); process.exit(0); }); 
    }); 
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
