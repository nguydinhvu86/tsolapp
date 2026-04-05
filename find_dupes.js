const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('find /www/wwwroot/inside.tsol.vn/tsolapp/app/portal -name "page.tsx"', (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('data', data => { dataStr += data.toString('utf8'); });
        stream.on('close', () => {
            const files = dataStr.split('\n').map(l => l.trim()).filter(Boolean);
            
            // Map physical paths to Next.js route URLs
            const urlToPathMap = {};
            const duplicates = [];

            files.forEach(fullPath => {
                // Remove base path to get relative Next.js path
                let routeUrl = fullPath.replace('/www/wwwroot/inside.tsol.vn/tsolapp/app/portal', '');
                // Remove route groups like /(protected)
                routeUrl = routeUrl.replace(/\/\([^)]+\)/g, '');
                
                if (urlToPathMap[routeUrl]) {
                    duplicates.push(`COLLISION: \n - ${urlToPathMap[routeUrl]}\n - ${fullPath}`);
                } else {
                    urlToPathMap[routeUrl] = fullPath;
                }
            });

            const result = duplicates.length > 0 ? duplicates.join('\n\n') : "NO DUPES FOUND\n\nALL FILES:\n" + files.join('\n');
            fs.writeFileSync('dupes_found.txt', result, 'utf8');
            console.log("Analysis complete. Wrote to dupes_found.txt");
            conn.end();
        });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
