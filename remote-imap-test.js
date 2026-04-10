const imaps = require('imap-simple');
const { PrismaClient } = require('@prisma/client');
const { simpleParser } = require('mailparser');

const prisma = new PrismaClient();

async function run() {
    console.log("Fetching settings from DB...");
    const settings = await prisma.systemSetting.findMany({
        where: { key: { startsWith: 'INVOICE_SYNC_' } }
    });
    const configMap = {};
    settings.forEach(s => configMap[s.key] = s.value);

    const user = configMap['INVOICE_SYNC_EMAIL'];
    const password = configMap['INVOICE_SYNC_PASSWORD'];
    const host = configMap['INVOICE_SYNC_HOST'] || 'imap.gmail.com';
    const port = parseInt(configMap['INVOICE_SYNC_PORT'] || '993');

    console.log("IMAP USER:", user);

    const IMAP_CONFIG = {
        imap: { user, password, host, port, tls: true, authTimeout: 5000, tlsOptions: { rejectUnauthorized: false, servername: host } }
    };

    try {
        const connection = await imaps.connect(IMAP_CONFIG);
        console.log("IMAP Connected. Opening INBOX...");
        await connection.openBox('INBOX');

        console.log("Searching UNSEEN...");
        const messages = await connection.search(['UNSEEN'], { bodies: ['HEADER', 'TEXT', ''] });
        console.log(`Found ${messages.length} UNSEEN messages.`);

        for (const msg of messages) {
            const allBody = msg.parts.find(part => part.which === '');
            console.log("Has allBody?", !!allBody);
            if (!allBody || !allBody.body) continue;

            const parsedMail = await simpleParser(allBody.body);
            console.log("\n=====================");
            console.log("Subject:", parsedMail.subject);
            const textContent = parsedMail.text || parsedMail.html || '';
            const plainText = textContent.replace(/<[^>]+>/g, ' ').replace(/\&nbsp;/g, ' ');
            console.log("======= RAW TEXT =======");
            console.log(textContent.substring(0, 4000));
            console.log("======= PLAIN TEXT =======");
            console.log(plainText.substring(0, 4000));

            let linkMatch = textContent.match(/href=["'](https?:\/\/[^"']+)["'][^>]*>[\s\S]*?(?:Tra cứu|Xem|Tại đây)/i);
            if (!linkMatch) linkMatch = plainText.match(/(?:Link tra cứu|Trang tra cứu|địa chỉ tra cứu|URL|Tra cứu hóa đơn tại|Link tải hóa đơn|Tra cứu tại)[\s:;]+(https?:\/\/[^\s]+)/i);
            
            const codeMatch = plainText.match(/(?:Mã tra cứu|Mã bảo mật|Mã nhận hóa đơn|Mã kiểm tra|Mã tra cứu hóa đơn|Mã số bí mật|Mã tra cứu HĐĐT)[\s:;]*([A-Za-z0-9]+)/i);

            console.log('Link found:', linkMatch ? linkMatch[1] : 'NONE');
            console.log('Code found:', codeMatch ? codeMatch[1] : 'NONE');
        }

        connection.end();
    } catch(err) {
        console.error(err);
    }
}
run();
