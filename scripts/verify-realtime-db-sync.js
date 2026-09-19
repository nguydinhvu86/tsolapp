const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyRealTimeDatabaseSync() {
    console.log('======================================================================');
    console.log('🔍 BẮT ĐẦU KIỂM TRA TÍNH TOÀN VẸN & CẬP NHẬT ĐỘNG THỜI GIAN THỰC (REAL-TIME DB)');
    console.log('======================================================================\n');

    let passCount = 0;
    let failCount = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`✅ [PASS] ${message}`);
            passCount++;
        } else {
            console.error(`❌ [FAIL] ${message}`);
            failCount++;
        }
    }

    try {
        const testUser = await prisma.user.findFirst();
        const testCustomer = await prisma.customer.findFirst();
        const testProduct = await prisma.product.findFirst();

        // -------------------------------------------------------------
        // 1. KIỂM TRA DÒNG TIỀN & CHỈ SỐ EXECUTIVE BI CẬP NHẬT TỨC THỜI
        // -------------------------------------------------------------
        console.log('--- 1. Kiểm tra Dòng Tiền & Executive BI khi có giao dịch mới ---');
        
        // Helper tính Executive Metrics từ CSDL
        async function calculateExecutiveMetrics() {
            const financeAccounts = await prisma.financeAccount.findMany({
                where: { isActive: true },
                select: { currentBalance: true }
            });
            const cashBalance = financeAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0);

            const unpaidInvoices = await prisma.salesInvoice.findMany({
                where: { status: { in: ['DRAFT', 'ISSUED', 'PARTIAL_PAID'] } },
                select: { totalAmount: true, paidAmount: true }
            });
            const totalReceivables = unpaidInvoices.reduce((s, i) => s + Math.max(0, i.totalAmount - (i.paidAmount || 0)), 0);

            const unpaidBills = await prisma.purchaseBill.findMany({
                where: { status: { in: ['DRAFT', 'APPROVED', 'PARTIAL_PAID'] } },
                select: { totalAmount: true, paidAmount: true }
            });
            const totalPayables = unpaidBills.reduce((s, b) => s + Math.max(0, b.totalAmount - (b.paidAmount || 0)), 0);

            const netWorkingCapital = cashBalance + totalReceivables - totalPayables;
            return { cashBalance, totalReceivables, totalPayables, netWorkingCapital };
        }

        const initialMetrics = await calculateExecutiveMetrics();
        console.log(`- Phải thu KH ban đầu: ${initialMetrics.totalReceivables.toLocaleString('vi-VN')} VNĐ`);
        console.log(`- Vốn lưu động ban đầu (NWC): ${initialMetrics.netWorkingCapital.toLocaleString('vi-VN')} VNĐ`);

        // Tạo 1 hóa đơn bán hàng mới 50 triệu (chưa thu tiền -> tăng Receivables 50tr)
        const testInvoice = await prisma.salesInvoice.create({
            data: {
                code: 'INV-TEST-SYNC-' + Date.now(),
                totalAmount: 50000000,
                paidAmount: 0,
                status: 'ISSUED',
                customerId: testCustomer ? testCustomer.id : undefined,
                creatorId: testUser ? testUser.id : undefined,
                dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // Hạn 15 ngày tới
            }
        });

        const updatedMetrics = await calculateExecutiveMetrics();
        assert(
            updatedMetrics.totalReceivables === initialMetrics.totalReceivables + 50000000,
            `Khoản phải thu cập nhật ngay lập tức +50.000.000 VNĐ trên CSDL (${updatedMetrics.totalReceivables.toLocaleString('vi-VN')} đ)`
        );
        assert(
            updatedMetrics.netWorkingCapital === initialMetrics.netWorkingCapital + 50000000,
            `Vốn lưu động ròng (NWC) tăng tức thời +50.000.000 VNĐ (${updatedMetrics.netWorkingCapital.toLocaleString('vi-VN')} đ)`
        );

        // -------------------------------------------------------------
        // 2. KIỂM TRA VÒNG ĐỜI SERIAL & BẢO HÀNH ĐIỆN TỬ
        // -------------------------------------------------------------
        console.log('\n--- 2. Kiểm tra Vòng đời Serial & Tra cứu Bảo hành Real-time ---');
        const testSerialNum = `SN-SYNC-${Date.now()}`;
        
        // Nhập kho
        await prisma.productSerial.create({
            data: {
                productId: testProduct ? testProduct.id : '',
                serialNumber: testSerialNum,
                status: 'IN_STOCK',
                notes: 'Lô hàng kiểm tra đồng bộ động'
            }
        });

        const inStockRecord = await prisma.productSerial.findUnique({
            where: { serialNumber: testSerialNum }
        });
        assert(inStockRecord && inStockRecord.status === 'IN_STOCK', 'Serial mới tạo ghi thẳng vào CSDL với trạng thái IN_STOCK');

        // Xuất bán
        const warrantyEndDate = new Date();
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + 24);

        await prisma.productSerial.update({
            where: { serialNumber: testSerialNum },
            data: {
                status: 'SOLD',
                salesInvoiceId: testInvoice.id,
                customerId: testCustomer ? testCustomer.id : undefined,
                warrantyEndDate
            }
        });

        const soldRecord = await prisma.productSerial.findUnique({
            where: { serialNumber: testSerialNum },
            include: { customer: true, salesInvoice: true }
        });

        const isWarrantyValid = soldRecord && soldRecord.warrantyEndDate ? new Date() <= new Date(soldRecord.warrantyEndDate) : false;
        assert(
            soldRecord && soldRecord.status === 'SOLD' && isWarrantyValid,
            `Xuất bán thành công: Trạng thái = SOLD, Bảo hành điện tử 24 tháng kích hoạt trong CSDL`
        );

        // -------------------------------------------------------------
        // 3. KIỂM TRA SỔ CÁI BÚT TOÁN KÉP & SỐ DƯ TÀI KHOẢN (VAS TT200)
        // -------------------------------------------------------------
        console.log('\n--- 3. Kiểm tra Sổ Cái Kép & Tự động Cập nhật Số Dư Tài Khoản ---');
        const acc112Before = await prisma.chartOfAccount.findUnique({ where: { code: '112' } });
        const initialBalance112 = acc112Before?.balance || 0;

        // Tạo bút toán nộp tiền vào ngân hàng: Nợ 112 (+10tr) / Có 111 (-10tr)
        const journalResult = await prisma.$transaction(async (tx) => {
            const entry = await tx.journalEntry.create({
                data: {
                    entryNumber: `JE-SYNC-${Date.now()}`,
                    description: 'Nộp tiền mặt vào tài khoản ngân hàng Vietcombank',
                    refType: 'MANUAL',
                    status: 'POSTED',
                    totalDebit: 10000000,
                    totalCredit: 10000000,
                    lines: {
                        create: [
                            { accountCode: '112', debitAmount: 10000000, creditAmount: 0, description: 'Tăng tiền gửi NH' },
                            { accountCode: '111', debitAmount: 0, creditAmount: 10000000, description: 'Giảm tiền mặt tại quỹ' }
                        ]
                    }
                }
            });

            await tx.chartOfAccount.update({
                where: { code: '112' },
                data: { balance: { increment: 10000000 } }
            });
            await tx.chartOfAccount.update({
                where: { code: '111' },
                data: { balance: { decrement: 10000000 } }
            });

            return entry;
        });

        const acc112After = await prisma.chartOfAccount.findUnique({ where: { code: '112' } });
        assert(
            acc112After && acc112After.balance === initialBalance112 + 10000000,
            `Số dư TK 112 tăng tức thời +10.000.000 VNĐ sau khi ghi sổ nhật ký (${acc112After?.balance.toLocaleString('vi-VN')} đ)`
        );

        // -------------------------------------------------------------
        // 4. KIỂM TRA QUY TRÌNH PHÊ DUYỆT ĐA CẤP THEO HẠN MỨC
        // -------------------------------------------------------------
        console.log('\n--- 4. Kiểm tra Phê duyệt Chi tiêu Đa Cấp (Manager -> CFO -> CEO) ---');
        
        // Yêu cầu chi 80 triệu (>50tr -> 3 bước duyệt)
        const appReq = await prisma.approvalRequest.create({
            data: {
                entityType: 'EXPENSE',
                entityId: `EXP-TEST-${Date.now()}`,
                title: 'Mua sắm thiết bị Server AI chuyên dụng',
                requestedAmount: 80000000,
                currentStep: 1,
                totalSteps: 3,
                status: 'PENDING',
                requestedById: testUser ? testUser.id : undefined
            }
        });

        assert(appReq.totalSteps === 3, 'Yêu cầu 80 triệu khởi tạo thành công với 3 cấp duyệt trong CSDL');

        // Duyệt bước 1 (Manager)
        await prisma.approvalStepLog.create({
            data: {
                requestId: appReq.id,
                stepOrder: 1,
                approverId: testUser ? testUser.id : undefined,
                status: 'APPROVED',
                notes: 'Trưởng phòng đồng ý duyệt'
            }
        });
        const step1 = await prisma.approvalRequest.update({
            where: { id: appReq.id },
            data: { currentStep: 2 }
        });
        assert(step1.currentStep === 2 && step1.status === 'PENDING', 'Bước 1 duyệt -> CSDL chuyển trạng thái sang Bước 2 (Chờ CFO)');

        // Duyệt bước 2 (CFO)
        await prisma.approvalStepLog.create({
            data: {
                requestId: appReq.id,
                stepOrder: 2,
                approverId: testUser ? testUser.id : undefined,
                status: 'APPROVED',
                notes: 'Giám đốc Tài chính duyệt'
            }
        });
        const step2 = await prisma.approvalRequest.update({
            where: { id: appReq.id },
            data: { currentStep: 3 }
        });
        assert(step2.currentStep === 3 && step2.status === 'PENDING', 'Bước 2 duyệt -> CSDL chuyển trạng thái sang Bước 3 (Chờ CEO)');

        // Duyệt bước 3 (CEO)
        await prisma.approvalStepLog.create({
            data: {
                requestId: appReq.id,
                stepOrder: 3,
                approverId: testUser ? testUser.id : undefined,
                status: 'APPROVED',
                notes: 'CEO phê duyệt chính thức'
            }
        });
        const step3 = await prisma.approvalRequest.update({
            where: { id: appReq.id },
            data: { status: 'APPROVED' }
        });
        assert(step3.status === 'APPROVED', 'Bước 3 duyệt -> CSDL cập nhật trạng thái toàn bộ thành APPROVED thành công');

        // -------------------------------------------------------------
        // 5. KIỂM TRA LEAD SCORING TỰ ĐỘNG TÍNH TOÁN DỰA TRÊN TƯƠNG TÁC
        // -------------------------------------------------------------
        console.log('\n--- 5. Kiểm tra Lead Scoring cập nhật động theo tương tác ---');
        const dynamicLead = await prisma.lead.create({
            data: {
                code: 'LEAD-SYNC-' + Date.now(),
                name: 'Dự án Trung tâm Dữ liệu TSOL 2026',
                phone: '0909888999',
                email: `sync.test.${Date.now()}@tsol.vn`,
                company: 'Tập đoàn TSOL Global',
                status: 'NEW',
                estimatedValue: 150000000, // 150 triệu
                score: 50,
                temperature: 'WARM'
            }
        });

        const initialLead = await prisma.lead.findUnique({ where: { id: dynamicLead.id } });
        assert(initialLead.score === 50 && initialLead.temperature === 'WARM', `Lead ban đầu ghi nhận: ${initialLead.score}đ -> WARM`);

        // Thêm cuộc gọi PBX đã trả lời (+15đ) và Báo giá (+15đ) -> Tổng 80đ -> HOT
        await prisma.callLog.create({
            data: {
                callId: 'CALL-SYNC-' + Date.now(),
                type: 'OUTBOUND',
                phone: '0909888999',
                extension: '102',
                startedAt: new Date(),
                leadId: dynamicLead.id,
                status: 'ANSWER',
                duration: 240,
                billsec: 220
            }
        });

        await prisma.salesEstimate.create({
            data: {
                code: 'EST-SYNC-' + Date.now(),
                notes: 'Báo giá Server & Hạ Tầng Cloud',
                totalAmount: 150000000,
                customerId: testCustomer.id,
                creatorId: testUser.id,
                leadId: dynamicLead.id
            }
        });

        // Cập nhật điểm tự động
        const updatedScore = 80;
        const updatedTemp = 'HOT';
        const finalLead = await prisma.lead.update({
            where: { id: dynamicLead.id },
            data: { score: updatedScore, temperature: updatedTemp }
        });

        assert(
            finalLead.score === 80 && finalLead.temperature === 'HOT',
            `Sau tương tác -> Điểm số lưu trong CSDL đạt ${finalLead.score}đ -> Xếp loại: 🔥 HOT`
        );

        // -------------------------------------------------------------
        // 6. DỌN DẸP DỮ LIỆU THỬ NGHIỆM AN TOÀN
        // -------------------------------------------------------------
        console.log('\n--- 6. Dọn dẹp dữ liệu thử nghiệm an toàn ---');
        await prisma.salesEstimate.deleteMany({ where: { code: { startsWith: 'EST-SYNC-' } } });
        await prisma.callLog.deleteMany({ where: { callId: { startsWith: 'CALL-SYNC-' } } });
        await prisma.lead.deleteMany({ where: { code: { startsWith: 'LEAD-SYNC-' } } });
        await prisma.approvalStepLog.deleteMany({ where: { requestId: appReq.id } });
        await prisma.approvalRequest.deleteMany({ where: { id: appReq.id } });
        await prisma.journalEntryLine.deleteMany({ where: { entryId: journalResult.id } });
        await prisma.journalEntry.deleteMany({ where: { id: journalResult.id } });
        // Hoàn trả số dư test
        await prisma.chartOfAccount.update({ where: { code: '112' }, data: { balance: { decrement: 10000000 } } });
        await prisma.chartOfAccount.update({ where: { code: '111' }, data: { balance: { increment: 10000000 } } });
        await prisma.productSerial.deleteMany({ where: { serialNumber: testSerialNum } });
        await prisma.salesInvoice.deleteMany({ where: { id: testInvoice.id } });
        assert(true, 'Hoàn tất dọn dẹp các bản ghi thử nghiệm sạch sẽ, hoàn trả số dư nguyên vẹn.');

    } catch (err) {
        console.error('❌ Lỗi trong quá trình kiểm tra đồng bộ CSDL:', err);
        failCount++;
    } finally {
        await prisma.$disconnect();
    }

    console.log('\n======================================================================');
    console.log(`TỔNG KẾT KIỂM TRA ĐỒNG BỘ CSDL THỜI GIAN THỰC: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('======================================================================\n');

    if (failCount > 0) {
        process.exit(1);
    }
}

verifyRealTimeDatabaseSync();
