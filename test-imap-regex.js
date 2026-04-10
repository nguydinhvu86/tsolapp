const fs = require('fs');
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');

// Parse .env manually
const envFile = fs.readFileSync('.env', 'utf8');
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        process.env[match[1]] = match[2].trim();
    }
});

async function testFetch() {
    const config = {
        imap: {
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASSWORD,
            host: process.env.EMAIL_HOST || 'imap.gmail.com',
            port: parseInt(process.env.EMAIL_PORT?.toString() || '993', 10),
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 10000
        }
    };

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = ['ALL'];
        const fetchOptions = { bodies: ['HEADER', ''], markSeen: false };

        const messages = await connection.search(searchCriteria, fetchOptions);
        const lastMessages = messages.slice(-5); 

        console.log(`Found ${lastMessages.length} recent messages.`);

        for (const msg of lastMessages) {
            const allBody = msg.parts.find(part => part.which === '');
            if (!allBody || !allBody.body) continue;

            const parsedMail = await simpleParser(allBody.body);
            const xmlAttachment = parsedMail.attachments.find(a => a.contentType === 'text/xml' || a.filename?.toLowerCase().endsWith('.xml'));
            
            console.log('==========================');
            console.log('Subject:', parsedMail.subject);
            console.log('Has XML:', !!xmlAttachment);
            
            if (!xmlAttachment) {
                console.log('--- text Content Snippet ---');
                const textContent = parsedMail.text || parsedMail.html || '';
                console.log(textContent.substring(0, 1500));

                const linkMatch = textContent.match(/(?:Link tra cứu|Trang tra cứu|địa chỉ tra cứu|URL|Tra cứu hóa đơn tại|Link tải hóa đơn)[:\s]*(https?:\/\/[^\s<"'\n\r]+)/i) || 
                                  textContent.match(/href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?(?:Tra cứu|Link|Tại đây)/i) ||
                                  textContent.match(/Trang tra cứu[\s\S]*?(https?:\/\/[^\s<"'\n\r]+)/i);

                const codeMatch = textContent.match(/(?:Mã tra cứu|Mã bảo mật|Mã nhận hóa đơn|Mã kiểm tra|Mã tra cứu hóa đơn|Mã số bí mật)[:\s]*([A-Za-z0-9]+)/i);
                const taxCodeMatch = textContent.match(/(?:Mã số thuế|MST)[^\d]*([\d\-]+)/i);
                const invNumberMatch = textContent.match(/(?:Số hóa đơn|Số HĐ|Ký hiệu)[:\s]*([A-Za-z0-9\-\/]+)/i);
                
                console.log('--- matches ---');
                console.log('Link Match:', linkMatch ? linkMatch[1] : 'NONE');
                console.log('Code Match:', codeMatch ? codeMatch[1] : 'NONE');
                console.log('MST Match:', taxCodeMatch ? taxCodeMatch[1] : 'NONE');
                console.log('So HD Match:', invNumberMatch ? invNumberMatch[1] : 'NONE');
            }
        }

        connection.end();
    } catch(err) {
        console.error(err);
    }
}

testFetch();
