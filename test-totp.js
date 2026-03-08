const { authenticator } = require('@otplib/preset-default');

const secret = authenticator.generateSecret();
const tokenNow = authenticator.generate(secret);
// generate token from 2 minutes ago
const tokenPast = authenticator.generateSecret();
const pastEpoch = Date.now() - 120000;

authenticator.options = { epoch: pastEpoch };
const tokenOld = authenticator.generate(secret);
authenticator.options = { epoch: Date.now() }; // reset

console.log('Now Token:', tokenNow);
console.log('Old Token:', tokenOld);

// Verify with default window (1)
authenticator.options = { window: 1 };
console.log('Verify old token (window 1):', authenticator.verify({ token: tokenOld, secret }));

// Verify with larger window
authenticator.options = { window: 4 }; // 4 * 30s = 120s
console.log('Verify old token (window 4):', authenticator.verify({ token: tokenOld, secret }));
