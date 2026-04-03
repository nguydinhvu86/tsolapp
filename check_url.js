const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/documents | head -n 1', (err, stream) => {
        stream.on('data', (d) => {
            const file = d.toString().trim();
            if(file) {
                console.log("Testing file:", file);
                conn.exec("curl -I http://localhost:6688/uploads/documents/" + file, (e, s) => { // Test Next.js directly first
                    s.on('data', out => console.log("Next.js Response:\n" + out.toString())).on('close', () => {
                        conn.exec("curl -I http://localhost/uploads/documents/" + file, (e2, s2) => { // Test Nginx
                            s2.on('data', out2 => console.log("Nginx Response:\n" + out2.toString())).on('close', () => conn.end());
                        });
                    });
                });
            } else {
                console.log("No files found");
                conn.end();
            }
        });
    });
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
