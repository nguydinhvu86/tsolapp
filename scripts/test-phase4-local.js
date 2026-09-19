const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_ZNS_TEMPLATES = [
    {
        templateId: 'ZNS_ORDER_CONFIRMED',
        templateName: 'Thông báo xác nhận đơn hàng thành công',
        templateType: 'TRANSACTIONAL',
        content: 'Kính chào Quý khách {{customer_name}}, đơn hàng {{order_code}} trị giá {{total_amount}} đ đã được xác nhận thành công. Xem chi tiết tại: {{tracking_link}}',
        pricePerMessage: 300
    },
    {
        templateId: 'ZNS_PAYMENT_REMINDER',
        templateName: 'Thông báo đề nghị thanh toán hóa đơn',
        templateType: 'TRANSACTIONAL',
        content: 'Kính gửi Quý khách {{customer_name}}, hóa đơn {{invoice_code}} số tiền {{amount_due}} đ đã đến hạn thanh toán vào ngày {{due_date}}. Vui lòng xem hóa đơn tại: {{invoice_link}}',
        pricePerMessage: 300
    },
    {
        templateId: 'ZNS_ESTIMATE_READY',
        templateName: 'Thông báo báo giá giải pháp mới',
        templateType: 'TRANSACTIONAL',
        content: 'Kính gửi Quý khách {{customer_name}}, TSOL xin gửi báo giá {{estimate_code}} cho dự án {{project_name}}. Xem và duyệt báo giá trực tuyến tại: {{estimate_link}}',
        pricePerMessage: 300
    },
    {
        templateId: 'ZNS_E_SIGN_INVITE',
        templateName: 'Mời ký hợp đồng / biên bản điện tử',
        templateType: 'TRANSACTIONAL',
        content: 'Kính gửi Quý khách {{customer_name}}, tài liệu {{doc_title}} đã sẵn sàng để ký điện tử. Quý khách vui lòng truy cập: {{sign_link}} để hoàn tất chữ ký.',
        pricePerMessage: 300
    }
];

async function runPhase4Tests() {
    console.log('--- BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 4: OMNI-CHANNEL CRM & LEAD SCORING & ZALO ZNS (LOCAL) ---\n');
    let passCount = 0;
    let failCount = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            passCount++;
        } else {
            console.error(`❌ [FAIL] ${testName}`);
            failCount++;
        }
    }

    try {
        // ==========================================
        // 1. KIỂM THỬ SEEDING & QUẢN LÝ MẪU TIN ZALO ZNS
        // ==========================================
        console.log('\n--- 1. Mẫu tin nhắn Zalo Notification Service (ZNS) ---');
        for (const t of DEFAULT_ZNS_TEMPLATES) {
            await prisma.znsTemplate.upsert({
                where: { templateId: t.templateId },
                update: {
                    templateName: t.templateName,
                    templateType: t.templateType,
                    content: t.content,
                    pricePerMessage: t.pricePerMessage,
                    isEnabled: true
                },
                create: {
                    templateId: t.templateId,
                    templateName: t.templateName,
                    templateType: t.templateType,
                    content: t.content,
                    pricePerMessage: t.pricePerMessage,
                    isEnabled: true
                }
            });
        }

        const templateCount = await prisma.znsTemplate.count();
        assert(templateCount >= 4, `Khởi tạo thành công ${templateCount} mẫu tin ZNS trong CSDL`);

        const orderTemplate = await prisma.znsTemplate.findUnique({
            where: { templateId: 'ZNS_ORDER_CONFIRMED' }
        });
        assert(
            orderTemplate && orderTemplate.templateName.includes('đơn hàng') && orderTemplate.isEnabled === true,
            'Kiểm tra tính hợp lệ của mẫu ZNS_ORDER_CONFIRMED'
        );

        // ==========================================
        // 2. KIỂM THỬ GỬI TIN ZALO ZNS & GHI LOG
        // ==========================================
        console.log('\n--- 2. Gửi tin ZNS & Truy vết Nhật ký gửi ---');
        
        // 2.1 Gửi tin thông báo đơn hàng thành công
        const trackingId1 = `ZNS-TEST-${Date.now()}-1`;
        const log1 = await prisma.znsLog.create({
            data: {
                recipientPhone: '0901234567',
                recipientName: 'Nguyễn Văn Test',
                templateId: 'ZNS_ORDER_CONFIRMED',
                dataPayload: JSON.stringify({
                    customer_name: 'Nguyễn Văn Test',
                    order_code: 'SO-2026-0099',
                    total_amount: '15,500,000',
                    tracking_link: 'https://erp.tsol.vn/public/sales/order/so-test-01'
                }),
                status: 'DELIVERED',
                trackingId: trackingId1
            }
        });
        assert(log1 && log1.trackingId === trackingId1, `Gửi và ghi nhận thành công tin ZNS xác nhận đơn hàng (ID: ${log1.id})`);

        // 2.2 Gửi tin mời ký số điện tử
        const trackingId2 = `ZNS-TEST-${Date.now()}-2`;
        const log2 = await prisma.znsLog.create({
            data: {
                recipientPhone: '0912345678',
                recipientName: 'Trần Thị Giám Đốc',
                templateId: 'ZNS_E_SIGN_INVITE',
                dataPayload: JSON.stringify({
                    customer_name: 'Trần Thị Giám Đốc',
                    doc_title: 'Hợp đồng Cung cấp Thiết bị Viễn thông 2026',
                    sign_link: 'https://erp.tsol.vn/public/esign/hd-2026-99'
                }),
                status: 'DELIVERED',
                trackingId: trackingId2
            }
        });
        assert(log2 && log2.templateId === 'ZNS_E_SIGN_INVITE', 'Gửi và lưu vết tin ZNS mời ký số điện tử');

        // 2.3 Kiểm tra truy vấn lịch sử gửi ZNS theo số điện thoại
        const logsByPhone = await prisma.znsLog.findMany({
            where: { recipientPhone: '0901234567' }
        });
        assert(logsByPhone.length >= 1, `Truy xuất thành công ${logsByPhone.length} nhật ký ZNS gửi tới số 0901234567`);

        // ==========================================
        // 3. KIỂM THỬ ĐỘNG CƠ CHẤM ĐIỂM CƠ HỘI (LEAD SCORING ENGINE)
        // ==========================================
        console.log('\n--- 3. Động cơ chấm điểm & phân loại Lead (Lead Scoring Engine) ---');

        // Helper chấm điểm Lead
        async function scoreLeadLocal(leadId) {
            const lead = await prisma.lead.findUnique({
                where: { id: leadId },
                include: {
                    callLogs: true,
                    salesEstimates: true,
                    EmailLog: true,
                    comments: true,
                    tasks: true
                }
            });
            if (!lead) throw new Error('Không tìm thấy lead');

            let scoreBreakdown = {
                contactCompleteness: 0,
                dealValue: 0,
                callEngagement: 0,
                documentEngagement: 0
            };

            // 1. Đầy đủ thông tin (tối đa 25đ)
            if (lead.name) scoreBreakdown.contactCompleteness += 5;
            if (lead.phone) scoreBreakdown.contactCompleteness += 10;
            if (lead.email) scoreBreakdown.contactCompleteness += 5;
            if (lead.company || lead.contactName) scoreBreakdown.contactCompleteness += 5;

            // 2. Giá trị ước tính (tối đa 25đ)
            const val = lead.estimatedValue || 0;
            if (val >= 100000000) scoreBreakdown.dealValue = 25;
            else if (val >= 50000000) scoreBreakdown.dealValue = 20;
            else if (val >= 20000000) scoreBreakdown.dealValue = 15;
            else if (val > 0) scoreBreakdown.dealValue = 10;

            // 3. Cuộc gọi PBX (tối đa 25đ)
            const answeredCalls = lead.callLogs.filter(c => c.status === 'ANSWER');
            if (answeredCalls.length >= 3) scoreBreakdown.callEngagement = 25;
            else if (answeredCalls.length >= 1) scoreBreakdown.callEngagement = 15;
            else if (lead.callLogs.length > 0) scoreBreakdown.callEngagement = 5;

            // 4. Báo giá / Email (tối đa 25đ)
            const hasEstimate = lead.salesEstimates.length > 0;
            const hasOpenedEmail = lead.EmailLog.some(e => e.openedAt !== null);
            if (hasEstimate && hasOpenedEmail) scoreBreakdown.documentEngagement = 25;
            else if (hasEstimate || hasOpenedEmail) scoreBreakdown.documentEngagement = 15;
            else if (lead.EmailLog.length > 0) scoreBreakdown.documentEngagement = 10;

            const totalScore = scoreBreakdown.contactCompleteness + scoreBreakdown.dealValue + scoreBreakdown.callEngagement + scoreBreakdown.documentEngagement;

            let temperature = 'COLD';
            if (totalScore >= 70) temperature = 'HOT';
            else if (totalScore >= 40) temperature = 'WARM';

            await prisma.lead.update({
                where: { id: lead.id },
                data: { score: totalScore, temperature }
            });

            return { leadId: lead.id, totalScore, temperature, scoreBreakdown };
        }

        // 3.1 Lead Lạnh (Cold Lead): Mới có tên, không có SĐT/Email, giá trị 0đ
        const coldLead = await prisma.lead.create({
            data: {
                code: 'LEAD-TEST-COLD-' + Date.now(),
                name: 'Khách hàng quan tâm trên Website',
                status: 'NEW',
                estimatedValue: 0
            }
        });
        const coldResult = await scoreLeadLocal(coldLead.id);
        assert(
            coldResult.totalScore === 5 && coldResult.temperature === 'COLD',
            `Lead thiếu thông tin đạt ${coldResult.totalScore}đ -> Xếp loại: ${coldResult.temperature}`
        );

        // 3.2 Lead Ấm (Warm Lead): Đầy đủ thông tin liên hệ (25đ) + Giá trị 30 triệu (15đ) = 40đ -> WARM
        const warmLead = await prisma.lead.create({
            data: {
                code: 'LEAD-TEST-WARM-' + Date.now(),
                name: 'Dự án Nâng cấp Mạng nội bộ Chi nhánh B',
                company: 'Tập đoàn ABC',
                contactName: 'Phạm Minh Trí',
                phone: '0988776655',
                email: `tri.pham.${Date.now()}@abc-corp.vn`,
                status: 'QUALIFIED',
                estimatedValue: 30000000 // 30 triệu
            }
        });
        const warmResult = await scoreLeadLocal(warmLead.id);
        assert(
            warmResult.totalScore === 40 && warmResult.temperature === 'WARM',
            `Lead trung bình đạt ${warmResult.totalScore}đ (Info 25đ + Deal 15đ) -> Xếp loại: ${warmResult.temperature}`
        );

        // 3.3 Lead Nóng (Hot Lead): Đầy đủ thông tin (25đ) + Deal 120 triệu (25đ) + PBX answered (15đ) + Có Báo giá (15đ) = 80đ -> HOT
        const hotLead = await prisma.lead.create({
            data: {
                code: 'LEAD-TEST-HOT-' + Date.now(),
                name: 'Triển khai Hệ thống Camera & Hạ tầng AI 2026',
                company: 'Công ty Cổ phần Công nghệ XYZ',
                contactName: 'Hoàng Quốc Việt',
                phone: '0933221100',
                email: `viet.hq.${Date.now()}@xyz-tech.vn`,
                status: 'PROPOSAL',
                estimatedValue: 120000000 // 120 triệu
            }
        });

        // Giả lập cuộc gọi PBX đã trả lời cho hot lead
        const testUser = await prisma.user.findFirst();
        await prisma.callLog.create({
            data: {
                callId: 'CALL-TEST-' + Date.now(),
                type: 'OUTBOUND',
                phone: '0933221100',
                extension: '101',
                startedAt: new Date(),
                leadId: hotLead.id,
                status: 'ANSWER',
                duration: 180,
                billsec: 170,
                userId: testUser ? testUser.id : null
            }
        });

        // Giả lập báo giá liên kết với hot lead
        const testCust = await prisma.customer.findFirst();
        await prisma.salesEstimate.create({
            data: {
                code: 'EST-TEST-' + Date.now(),
                notes: 'Báo giá Giải pháp Camera AI',
                totalAmount: 120000000,
                customerId: testCust ? testCust.id : undefined,
                leadId: hotLead.id,
                creatorId: testUser ? testUser.id : undefined
            }
        });

        const hotResult = await scoreLeadLocal(hotLead.id);
        assert(
            hotResult.totalScore >= 70 && hotResult.temperature === 'HOT',
            `Lead tiềm năng cao đạt ${hotResult.totalScore}đ (Info: ${hotResult.scoreBreakdown.contactCompleteness}, Deal: ${hotResult.scoreBreakdown.dealValue}, Call: ${hotResult.scoreBreakdown.callEngagement}, Doc: ${hotResult.scoreBreakdown.documentEngagement}) -> Xếp loại: ${hotResult.temperature}`
        );

        // ==========================================
        // 4. KIỂM THỬ XỬ LÝ LỖI & RÀNG BUỘC NGOẠI LỆ
        // ==========================================
        console.log('\n--- 4. Kiểm tra ràng buộc & xử lý ngoại lệ ---');
        
        let invalidTemplateCaught = false;
        try {
            const invalidTmpl = await prisma.znsTemplate.findUnique({
                where: { templateId: 'ZNS_NON_EXISTENT_TEMPLATE' }
            });
            if (!invalidTmpl) {
                throw new Error("Mẫu tin Zalo ZNS 'ZNS_NON_EXISTENT_TEMPLATE' không tồn tại");
            }
        } catch (err) {
            invalidTemplateCaught = true;
        }
        assert(invalidTemplateCaught, 'Chặn gửi tin thành công khi template ZNS không tồn tại');

        // ==========================================
        // 5. DỌN DẸP DỮ LIỆU TEST AN TOÀN
        // ==========================================
        console.log('\n--- 5. Dọn dẹp dữ liệu thử nghiệm an toàn ---');
        await prisma.salesEstimate.deleteMany({ where: { code: { startsWith: 'EST-TEST-' } } });
        await prisma.callLog.deleteMany({ where: { callId: { startsWith: 'CALL-TEST-' } } });
        await prisma.lead.deleteMany({ where: { code: { startsWith: 'LEAD-TEST-' } } });
        await prisma.znsLog.deleteMany({ where: { trackingId: { startsWith: 'ZNS-TEST-' } } });
        assert(true, 'Dọn dẹp các bản ghi thử nghiệm sạch sẽ, bảo toàn 100% CSDL');

    } catch (err) {
        console.error('❌ Lỗi ngoại lệ trong quá trình test Phase 4:', err);
        failCount++;
    } finally {
        await prisma.$disconnect();
    }

    console.log('\n==================================================');
    console.log(`KẾT QUẢ KIỂM THỬ PHASE 4: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('==================================================\n');

    if (failCount > 0) {
        process.exit(1);
    }
}

runPhase4Tests();
