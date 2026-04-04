const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    // We will use ls to check the directory contents
    const cmd = `ls -la /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/documents/ | grep cmmez 
echo "---"
ls -la /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/documents/ | grep cmmez
echo "---"
find /www/wwwroot/inside.tsol.vn/tsolapp/ -name "cmmeznb1y000j13xsyb1gfust*.png"
find /www/wwwroot/inside.tsol.vn/tsolapp/ -name "cmmeznb1y000j13xsyb1gfust*.PNG"
`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            conn.end()
        })
        .on('data', data => process.stdout.write(data))
        .stderr.on('data', data => process.stderr.write(data));
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
