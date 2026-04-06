const fs = require('fs');
const lines = fs.readFileSync('prisma/schema.prisma', 'utf-8').split('\n');
const cl = lines.findIndex(l => l.includes('model CallLog'));
const sl = lines.findIndex(l => l.includes('model Supplier'));
console.log('CallLog at', cl, 'Supplier at', sl);
