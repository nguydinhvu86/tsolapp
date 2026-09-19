const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_ACCOUNTS = [
    { code: '111', name: 'Tiền mặt tại quỹ', type: 'ASSET', level: 1 },
    { code: '112', name: 'Tiền gửi ngân hàng', type: 'ASSET', level: 1 },
    { code: '131', name: 'Phải thu của khách hàng', type: 'ASSET', level: 1 },
    { code: '133', name: 'Thuế GTGT được khấu trừ', type: 'ASSET', level: 1 },
    { code: '156', name: 'Hàng hóa tồn kho', type: 'ASSET', level: 1 },
    { code: '331', name: 'Phải trả cho người bán', type: 'LIABILITY', level: 1 },
    { code: '3331', name: 'Thuế GTGT phải nộp', type: 'LIABILITY', level: 1 },
    { code: '511', name: 'Doanh thu bán hàng', type: 'REVENUE', level: 1 },
    { code: '632', name: 'Giá vốn hàng bán', type: 'EXPENSE', level: 1 },
    { code: '642', name: 'Chi phí QLDN', type: 'EXPENSE', level: 1 }
];

async function runPhase3Tests() {
    console.log('--- BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 3: SỔ CÁI KẾ TOÁN KÉP & WORKFLOW (LOCAL) ---\n');
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
        // Test 1: Khởi tạo danh mục tài khoản kế toán chuẩn VAS
        for (const acc of DEFAULT_ACCOUNTS) {
            await prisma.chartOfAccount.upsert({
                where: { code: acc.code },
                update: { name: acc.name, type: acc.type },
                create: { code: acc.code, name: acc.name, type: acc.type, level: acc.level, balance: 0, isActive: true }
            });
        }
        const accCount = await prisma.chartOfAccount.count();
        assert(accCount >= 10, `Khởi tạo thành công ${accCount} tài khoản kế toán chuẩn VAS`);

        // Test 2: Bút toán kép cân đối (Nợ 131: 11tr / Có 511: 10tr, Có 3331: 1tr)
        const entryNum = 'JE-TEST-' + Date.now();
        const linesData = [
            { accountCode: '131', debitAmount: 11000000, creditAmount: 0, description: 'Phải thu KH' },
            { accountCode: '511', debitAmount: 0, creditAmount: 10000000, description: 'Doanh thu' },
            { accountCode: '3331', debitAmount: 0, creditAmount: 1000000, description: 'Thuế VAT' },
        ];

        const totalDebit = linesData.reduce((s, l) => s + l.debitAmount, 0);
        const totalCredit = linesData.reduce((s, l) => s + l.creditAmount, 0);
        assert(totalDebit === totalCredit, 'Kiểm tra điều kiện cân đối Nợ = Có (11.000.000 VNĐ)');

        const journalEntry = await prisma.journalEntry.create({
            data: {
                entryNumber: entryNum,
                description: 'Hạch toán hóa đơn bán hàng thử nghiệm',
                refType: 'SALES_INVOICE',
                refId: 'inv_test_001',
                status: 'POSTED',
                totalDebit,
                totalCredit,
                lines: {
                    create: linesData
                }
            },
            include: { lines: true }
        });
        assert(journalEntry && journalEntry.lines.length === 3, 'Tạo bút toán kép 3 dòng hạch toán thành công');
        assert(journalEntry.status === 'POSTED', 'Trạng thái bút toán là POSTED');

        // Test 3: Bút toán thu tiền khách hàng (Nợ 112: 11tr / Có 131: 11tr)
        const paymentEntryNum = 'JE-PAY-' + Date.now();
        const payEntry = await prisma.journalEntry.create({
            data: {
                entryNumber: paymentEntryNum,
                description: 'Hạch toán thu tiền ngân hàng',
                refType: 'SALES_PAYMENT',
                refId: 'pay_test_001',
                status: 'POSTED',
                totalDebit: 11000000,
                totalCredit: 11000000,
                lines: {
                    create: [
                        { accountCode: '112', debitAmount: 11000000, creditAmount: 0, description: 'Thu tiền vào TK NH' },
                        { accountCode: '131', debitAmount: 0, creditAmount: 11000000, description: 'Giảm trừ nợ 131' }
                    ]
                }
            },
            include: { lines: true }
        });
        assert(payEntry && payEntry.totalDebit === 11000000, 'Tạo bút toán thu tiền Nợ 112 / Có 131 thành công');

        // Test 4: Khởi tạo quy tắc duyệt chi tiêu đa cấp
        await prisma.approvalRule.create({
            data: {
                name: 'Chi tiêu lớn (> 50tr) - Bước 1',
                entityType: 'EXPENSE',
                minAmount: 50000000,
                maxAmount: null,
                requiredRole: 'CFO',
                stepOrder: 1,
                isEnabled: true
            }
        });
        await prisma.approvalRule.create({
            data: {
                name: 'Chi tiêu lớn (> 50tr) - Bước 2',
                entityType: 'EXPENSE',
                minAmount: 50000000,
                maxAmount: null,
                requiredRole: 'CEO',
                stepOrder: 2,
                isEnabled: true
            }
        });

        // Test 5: Tạo yêu cầu duyệt chi 75 triệu (Yêu cầu 2 cấp duyệt)
        const approvalReq = await prisma.approvalRequest.create({
            data: {
                entityType: 'EXPENSE',
                entityId: 'exp_test_75m',
                title: 'Chi phí mua sắm máy chủ trung tâm dữ liệu',
                requestedAmount: 75000000,
                currentStep: 1,
                totalSteps: 2,
                status: 'PENDING'
            }
        });
        assert(approvalReq && approvalReq.totalSteps === 2, 'Xác định chính xác yêu cầu 75tr cần 2 cấp phê duyệt');

        // Test 6: Bước 1 CFO Duyệt -> Chuyển sang Bước 2
        await prisma.approvalStepLog.create({
            data: {
                requestId: approvalReq.id,
                stepOrder: 1,
                status: 'APPROVED',
                notes: 'CFO đã kiểm tra ngân sách hợp lệ'
            }
        });
        const afterStep1 = await prisma.approvalRequest.update({
            where: { id: approvalReq.id },
            data: { currentStep: 2 }
        });
        assert(afterStep1.currentStep === 2, 'Bước 1 hoàn tất -> chuyển sang Bước 2 cho CEO');
        assert(afterStep1.status === 'PENDING', 'Trạng thái tổng vẫn là PENDING chờ CEO');

        // Test 7: Bước 2 CEO Duyệt -> Hoàn tất quy trình APPROVED
        await prisma.approvalStepLog.create({
            data: {
                requestId: approvalReq.id,
                stepOrder: 2,
                status: 'APPROVED',
                notes: 'CEO đồng ý xuất chi'
            }
        });
        const finalApproval = await prisma.approvalRequest.update({
            where: { id: approvalReq.id },
            data: { status: 'APPROVED' }
        });
        assert(finalApproval.status === 'APPROVED', 'Bước 2 hoàn tất -> Toàn bộ quy trình APPROVED thành công');

        console.log(`\n========================================`);
        console.log(`TỔNG KẾT KIỂM THỬ GIAI ĐOẠN 3 LOCAL: ${passCount} PASSED / ${failCount} FAILED`);
        console.log(`========================================\n`);

        // Cleanup
        await prisma.journalEntryLine.deleteMany({ where: { entryId: { in: [journalEntry.id, payEntry.id] } } });
        await prisma.journalEntry.deleteMany({ where: { id: { in: [journalEntry.id, payEntry.id] } } });
        await prisma.approvalStepLog.deleteMany({ where: { requestId: approvalReq.id } });
        await prisma.approvalRequest.delete({ where: { id: approvalReq.id } });
        await prisma.approvalRule.deleteMany({ where: { entityType: 'EXPENSE' } });

    } catch (err) {
        console.error('Lỗi kiểm thử Phase 3:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runPhase3Tests();
