const { PrismaClient } = require('@prisma/client');
const { templates, COMPANY } = require('./seed-business-email-templates');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'mysql://root:@localhost:3306/erp_tsoldev'
        }
    }
});

async function main() {
    console.log('--- Đang đồng bộ cơ sở dữ liệu LOCAL (port 3306) cho CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA ---');

    // 1. Update SystemSettings in local DB
    const settings = [
        { key: "COMPANY_NAME", value: "CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA" },
        { key: "COMPANY_FULL_NAME", value: "CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA" },
        { key: "COMPANY_DISPLAY_NAME", value: "TRỊNH GIA" },
        { key: "COMPANY_TAX", value: "3703185173" },
        { key: "COMPANY_TAX_CODE", value: "3703185173" },
        { key: "COMPANY_ADDRESS", value: "Số 147/80, Đường NTMK, Phường Phú Lợi, Tp. Hồ Chí Minh" },
        { key: "COMPANY_PHONE", value: "Tel: (0274) 999 2222 - HP: 090 1232255" },
        { key: "COMPANY_EMAIL", value: "vutg@trinhgiatelecom.vn" },
        { key: "COMPANY_WEBSITE", value: "trinhgiatelecom.vn" },
        { key: "SMTP_FROM_NAME", value: "TRỊNH GIA ERP" }
    ];
    for (const s of settings) {
        await prisma.systemSetting.upsert({
            where: { key: s.key },
            update: { value: s.value },
            create: { key: s.key, value: s.value }
        });
    }
    console.log("✅ Đã cập nhật xong SystemSettings trên Local.");

    // 2. Clean obsolete templates
    await prisma.emailTemplate.deleteMany({
        where: {
            OR: [
                { name: "Email Hóa Đơn" },
                { name: "[ERP - TSOL] -  XÁC NHẬN CÔNG NỢ" },
                { name: "[THÔNG BÁO CHUNG] Thông Báo Lịch Nghỉ Lễ / Tết & Kênh Hỗ Trợ 24/7" }
            ]
        }
    });

    // 3. Find creator
    let creator = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'MANAGER'] } },
        select: { id: true }
    });
    if (!creator) {
        creator = await prisma.user.findFirst({ select: { id: true } });
    }
    const creatorId = creator ? creator.id : null;

    let createdCount = 0;
    let updatedCount = 0;

    for (const t of templates) {
        const existing = await prisma.emailTemplate.findFirst({
            where: {
                OR: [
                    { name: t.name },
                    { subject: t.subject },
                    { name: t.name.replace(/TRỊNH GIA/g, 'TSOL') }
                ]
            }
        });

        if (existing) {
            await prisma.emailTemplate.update({
                where: { id: existing.id },
                data: {
                    name: t.name,
                    subject: t.subject,
                    body: t.body,
                    module: t.module,
                    updatedAt: new Date()
                }
            });
            updatedCount++;
        } else {
            await prisma.emailTemplate.create({
                data: {
                    name: t.name,
                    subject: t.subject,
                    body: t.body,
                    module: t.module,
                    creatorId: creatorId || undefined
                }
            });
            createdCount++;
        }
    }

    // 4. Double check all remaining templates on local DB to ensure 0 TSOL leftovers
    const all = await prisma.emailTemplate.findMany();
    for (const t of all) {
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

    const finalList = await prisma.emailTemplate.findMany({ select: { module: true, name: true, subject: true } });
    console.log("=== DANH SÁCH MẪU EMAIL LOCAL ĐÃ ĐỒNG BỘ XONG (" + finalList.length + " MẪU) ===");
    finalList.forEach(t => console.log("[" + t.module + "] " + t.name + " => " + t.subject));
}

main().then(() => prisma.$disconnect()).catch(console.error);
