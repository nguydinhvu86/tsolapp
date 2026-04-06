const https = require('https');
const http = require('http');

async function testWebhook(ext) {
    const url = `http://inside.tsol.vn/api/callcenter/call_in?callid=sim-${Date.now()}&phone=0999888777&extension=${ext}&event=RING`;
    console.log('Hitting:', url);
    
    return new Promise((resolve) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data+=chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => resolve('Error: ' + err.message));
    });
}

async function main() {
    // Try multiple extensions just in case
    console.log(await testWebhook('102'));
    console.log(await testWebhook('201'));
}

main();
