const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runStorageVaultTests() {
    console.log('--- BẮT ĐẦU KIỂM THỬ KHO LƯU TRỮ VÀ AUDIT LOG TẬP TRUNG (LOCAL) ---\n');
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
        // Test 1: Tạo tệp đính kèm tập trung trong SystemAttachment
        const testAttachment = await prisma.systemAttachment.create({
            data: {
                fileName: 'Hoa_don_ban_hang_INV-2024-001.pdf',
                fileUrl: '/uploads/invoices/INV-2024-001.pdf',
                fileType: 'PDF',
                fileSize: 204850,
                entityType: 'SALES_INVOICE',
                entityId: 'test_invoice_id_001',
                notes: 'Bản scan hóa đơn có chữ ký giám đốc'
            }
        });
        assert(testAttachment && testAttachment.id, 'Tạo bản ghi SystemAttachment thành công');
        assert(testAttachment.entityType === 'SALES_INVOICE', 'Lưu đúng loại thực thể (SALES_INVOICE)');

        // Test 2: Truy vấn tệp đính kèm theo entityType & entityId
        const fetchedAttachments = await prisma.systemAttachment.findMany({
            where: {
                entityType: 'SALES_INVOICE',
                entityId: 'test_invoice_id_001'
            }
        });
        assert(fetchedAttachments.length > 0, 'Truy vấn tệp đính kèm theo entityId thành công');
        assert(fetchedAttachments[0].fileName === 'Hoa_don_ban_hang_INV-2024-001.pdf', 'Tên tệp khớp chính xác 100%');

        // Test 3: Ghi vết hoạt động UnifiedActivityLog kèm diff trước & sau
        const oldState = { status: 'DRAFT', totalAmount: 15000000 };
        const newState = { status: 'APPROVED', totalAmount: 15000000, approvedAt: new Date().toISOString() };

        const testLog = await prisma.unifiedActivityLog.create({
            data: {
                entityType: 'SALES_INVOICE',
                entityId: 'test_invoice_id_001',
                action: 'STATUS_CHANGE',
                details: 'Kế toán trưởng phê duyệt hóa đơn',
                oldData: JSON.stringify(oldState),
                newData: JSON.stringify(newState),
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        assert(testLog && testLog.id, 'Tạo bản ghi UnifiedActivityLog thành công');
        assert(testLog.action === 'STATUS_CHANGE', 'Lưu đúng loại hành động (STATUS_CHANGE)');

        // Test 4: Trích xuất và đối soát diff JSON
        const fetchedLog = await prisma.unifiedActivityLog.findUnique({
            where: { id: testLog.id }
        });
        assert(fetchedLog !== null, 'Tìm thấy bản ghi log');
        const parsedOld = JSON.parse(fetchedLog.oldData || '{}');
        const parsedNew = JSON.parse(fetchedLog.newData || '{}');
        assert(parsedOld.status === 'DRAFT', 'Diff dữ liệu cũ chuẩn xác');
        assert(parsedNew.status === 'APPROVED', 'Diff dữ liệu mới chuẩn xác');

        // Test 5: Dọn dẹp bản ghi thử nghiệm (Cleanup)
        await prisma.systemAttachment.delete({ where: { id: testAttachment.id } });
        await prisma.unifiedActivityLog.delete({ where: { id: testLog.id } });
        assert(true, 'Dọn dẹp bản ghi kiểm thử thành công, giữ CSDL sạch sẽ');

        console.log(`\n========================================`);
        console.log(`TỔNG KẾT KIỂM THỬ KHO LƯU TRỮ LOCAL: ${passCount} PASSED / ${failCount} FAILED`);
        console.log(`========================================\n`);

    } catch (err) {
        console.error('Lỗi khi chạy kiểm thử:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runStorageVaultTests();
