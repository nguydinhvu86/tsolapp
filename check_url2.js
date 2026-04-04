const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/documents | head -n 1', (err, stream) => {
        stream.on('data', (d) => {
            const file = d.toString().trim();
            if(file) {
                console.log("Testing file:", file);
                conn.exec(`curl -I -H "Host: inside.tsol.vn" http://127.0.0.1/uploads/documents/${file}`, (e, s) => { // Test Nginx properly
                    s.on('data', out => console.log("Nginx Response:\n" + out.toString())).on('close', () => conn.end());
                });
            } else {
                console.log("No files found");
                conn.end();
            }
        });
    });
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
