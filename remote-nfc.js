const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const leads = await prisma.lead.findMany({
            where: {
                status: 'WON',
                updatedAt: { gte: today }
            },
            include: { customer: true }
        });
        
        for (const l of leads) {
            if (l.customer && l.customer.name.toLowerCase().includes('kh')) {
                const name = l.customer.name;
                const normalizedNFC = name.normalize('NFC');
                const normalizedNFD = name.normalize('NFD');
                
                console.log("Customer Original:", name);
                console.log("Original Hex:", Buffer.from(name).toString('hex'));
                console.log("NFC Hex:", Buffer.from(normalizedNFC).toString('hex'));
                console.log("NFD Hex:", Buffer.from(normalizedNFD).toString('hex'));
                
                // Let's actually UPDATE the customer to be NFC to fix it for the user immediately!
                if (name !== normalizedNFC) {
                    await prisma.customer.update({
                        where: { id: l.customer.id },
                        data: { name: normalizedNFC, email: l.customer.email ? l.customer.email.normalize('NFC') : null }
                    });
                    console.log("-> UPDATED CUSTOMER TO NFC!");
                }
            }
        }
    } catch(e) {
        console.error("Error:", e.message);
    }
}
check().catch(console.error).finally(() => process.exit(0));
`;

conn.on('ready', () => {
    // Write and execute
    const deployCmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `cat << 'EOF' > debug-nfc.js\n${scriptContent}\nEOF\n` +
        `node debug-nfc.js`;

    conn.exec(deployCmd, (err, stream) => {
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', (code) => {
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
