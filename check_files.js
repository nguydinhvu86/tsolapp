const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    const files = [
        "cmmeqs3nh000b11o7ys9ro7c7-1775122584275.png",
        "cmmeqs3nh000b11o7ys9ro7c7-1775082416697.png",
        "cmmeqs3nh000b11o7ys9ro7c7-1775082107474.png"
    ];
    
    conn.exec(`ls -l /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/documents/ | grep -E "${files.join('|')}"`, (err, stream) => {
        stream.on('data', (d) => console.log(d.toString())).on('close', () => conn.end());
    });
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
