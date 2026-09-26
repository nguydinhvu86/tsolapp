const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `
cd /www/wwwroot/inside.tsol.vn/tsolapp
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH
node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function cleanAllTemplates() {
    // 1. Clean up obsolete test / duplicate templates
    await prisma.emailTemplate.deleteMany({
        where: {
            OR: [
                { name: "Email Hóa Đơn" },
                { name: "[ERP - TSOL] -  XÁC NHẬN CÔNG NỢ" },
                { name: "[THÔNG BÁO CHUNG] Thông Báo Lịch Nghỉ Lễ / Tết & Kênh Hỗ Trợ 24/7" }
            ]
        }
    });

    // 2. Fetch all templates
    const list = await prisma.emailTemplate.findMany();
    for (const t of list) {
        let newSubject = t.subject
            .replace(/\\[TSOL[^\\]]*\\]/g, "[TRỊNH GIA]")
            .replace(/TSOL/g, "TRỊNH GIA")
            .replace(/tsol\\.vn/g, "trinhgiatelecom.vn")
            .replace(/contact@tsol\\.vn/g, "vutg@trinhgiatelecom.vn")
            .replace(/projects@tsol\\.vn/g, "vutg@trinhgiatelecom.vn")
            .replace(/delivery@tsol\\.vn/g, "vutg@trinhgiatelecom.vn")
            .replace(/accounting@tsol\\.vn/g, "vutg@trinhgiatelecom.vn")
            .replace(/purchasing@tsol\\.vn/g, "vutg@trinhgiatelecom.vn")
            .replace(/support@tsol\\.vn/g, "vutg@trinhgiatelecom.vn")
            .replace(/care@tsol\\.vn/g, "vutg@trinhgiatelecom.vn");

        let newBody = t.body
            .replace(/TSOL SOLUTIONS & TECHNOLOGIES/g, "CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA")
            .replace(/TSOL ERP & WORKFLOW/g, "CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA")
            .replace(/TSOL SOLUTIONS/g, "TRỊNH GIA SOLUTIONS")
            .replace(/TSOL ERP/g, "TRỊNH GIA ERP")
            .replace(/TSOL/g, "Trịnh Gia")
            .replace(/Công ty Cổ phần Trịnh Gia/g, "CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA")
            .replace(/Công ty Cổ phần TSOL/g, "CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA")
            .replace(/CÔNG TY CỔ PHẦN TSOL/g, "CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA")
            .replace(/0988 888 888/g, "Tel: (0274) 999 2222 - HP: 090 1232255")
            .replace(/care@tsol\\.vn/g, "vutg@trinhgiatelecom.vn")
            .replace(/contact@tsol\\.vn/g, "vutg@trinhgiatelecom.vn")
            .replace(/projects@tsol\\.vn/g, "vutg@trinhgiatelecom.vn")
            .replace(/delivery@tsol\\.vn/g, "vutg@trinhgiatelecom.vn")
            .replace(/accounting@tsol\\.vn/g, "vutg@trinhgiatelecom.vn")
            .replace(/purchasing@tsol\\.vn/g, "vutg@trinhgiatelecom.vn")
            .replace(/support@tsol\\.vn/g, "vutg@trinhgiatelecom.vn")
            .replace(/tsol\\.vn/g, "trinhgiatelecom.vn");

        let newName = t.name.replace(/TSOL/g, "TRỊNH GIA");

        await prisma.emailTemplate.update({
            where: { id: t.id },
            data: {
                name: newName,
                subject: newSubject,
                body: newBody,
                updatedAt: new Date()
            }
        });
    }

    const updatedList = await prisma.emailTemplate.findMany({ select: { name: true, subject: true, module: true } });
    console.log("=== DANH SÁCH MẪU EMAIL ĐÃ CHUẨN HÓA 100% TRÊN CSDL SERVER ===");
    updatedList.forEach(t => console.log("[" + t.module + "] " + t.name + " => " + t.subject));
}
cleanAllTemplates().then(() => prisma.$disconnect()).catch(console.error);
'
`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.pipe(process.stdout);
        stream.stderr.pipe(process.stderr);
        stream.on('close', () => conn.end());
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
