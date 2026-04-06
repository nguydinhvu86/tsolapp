const tls = require('tls');

const options = {
  host: 'mail.trinhgiatelecom.vn',
  port: 993,
  rejectUnauthorized: false,
  servername: 'mail.trinhgiatelecom.vn'
};

console.log("Connecting with SNI...");
const socket = tls.connect(options, () => {
  console.log('client connected',
              socket.authorized ? 'authorized' : 'unauthorized');
  socket.write('A01 CAPABILITY\r\n');
});

socket.setEncoding('utf8');
socket.on('data', (data) => {
  console.log(data);
  socket.destroy();
});

socket.on('error', (err) => {
  console.error("TLS Error:", err);
});
