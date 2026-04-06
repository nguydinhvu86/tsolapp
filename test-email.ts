import { PrismaClient } from '@prisma/client';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

const prisma = new PrismaClient();

async function run() {
    const settings = await prisma.systemSetting.findMany({
        where: { key: { startsWith: 'INVOICE_SYNC_' } }
    });
    const configMap: Record<string, string> = {};
    settings.forEach(s => configMap[s.key] = s.value);

    const user = configMap['INVOICE_SYNC_EMAIL'];
    const password = configMap['INVOICE_SYNC_PASSWORD'];
    const host = configMap['INVOICE_SYNC_HOST'] || 'imap.gmail.com';
    const port = parseInt(configMap['INVOICE_SYNC_PORT'] || '993');

    const IMAP_CONFIG = {
        imap: {
            user, password, host, port, tls: true, authTimeout: 5000,
            tlsOptions: { rejectUnauthorized: false, servername: host }
        }
    };

    const connection = await imaps.connect(IMAP_CONFIG);
    await connection.openBox('INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: false };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`Found ${messages.length} unseen messages`);

    for (const msg of messages) {
        const allBody = msg.parts.find((part: any) => part.which === '');
        if (!allBody || !allBody.body) continue;

        const parsedMail = await simpleParser(allBody.body);
        console.log(`\nEmail Subject: ${parsedMail.subject}`);
        console.log(`Attachments:`);
        if (parsedMail.attachments.length === 0) {
            console.log("No attachments found");
        } else {
            for (const act of parsedMail.attachments) {
                console.log(`- ${act.filename} (Type: ${act.contentType})`);
            }
        }
    }
    process.exit(0);
}
run().catch(console.error);
