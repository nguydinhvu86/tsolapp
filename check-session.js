const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/session',
  method: 'GET',
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Session response:', data));
});
req.on('error', e => console.error(e));
req.end();
