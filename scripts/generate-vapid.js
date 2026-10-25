const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();
console.log('');
console.log('PUBLIC KEY:');
console.log(vapidKeys.publicKey);
console.log('');
console.log('PRIVATE KEY:');
console.log(vapidKeys.privateKey);
console.log('');
