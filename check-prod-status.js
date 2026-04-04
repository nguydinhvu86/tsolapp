const https = require('http');

https.get('http://inside.tsol.vn', (res) => {
    console.log('Server status:', res.statusCode);
}).on('error', (e) => {
    console.error('Error:', e);
});
