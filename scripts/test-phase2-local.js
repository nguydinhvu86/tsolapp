const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Hàm quy đổi UOM trực tiếp
async function setProductUnitConversion(productId, unitName, conversionRate, salePrice) {
    return await prisma.productUnitConversion.upsert({
        where: { productId_unitName: { productId, unitName } },
        update: { conversionRate, salePrice },
        create: { productId, unitName, conversionRate, salePrice }
    });
}

async function convertToBaseUnit(productId, fromUnitName, quantity) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { unit: true } });
    if (!product || fromUnitName === product.unit) return quantity;
    const conversion = await prisma.productUnitConversion.findUnique({
        where: { productId_unitName: { productId, unitName: fromUnitName } }
    });
    return conversion ? quantity * conversion.conversionRate : quantity;
}

// Hàm Serial/IMEI trực tiếp
async function receiveProductSerials(productId, serialNumbers, notes) {
    const results = [];
    for (const serial of serialNumbers) {
        const r = await prisma.productSerial.upsert({
            where: { serialNumber: serial },
            update: { productId, status: 'IN_STOCK', notes },
            create: { productId, serialNumber: serial, status: 'IN_STOCK', notes }
        });
        results.push(r);
    }
    return results;
}

async function dispatchProductSerials(serialNumbers, salesInvoiceId, customerId, warrantyMonths = 12) {
    const warrantyEndDate = new Date();
    warrantyEndDate.setMonth(warrantyEndDate.getMonth() + warrantyMonths);
    const updated = [];
    for (const serial of serialNumbers) {
        const res = await prisma.productSerial.update({
            where: { serialNumber: serial },
            data: { status: 'SOLD', salesInvoiceId, customerId, warrantyEndDate }
        });
        updated.push(res);
    }
    return updated;
}

async function lookupSerialWarranty(serialNumber) {
    const record = await prisma.productSerial.findUnique({
        where: { serialNumber },
        include: {
            product: { select: { id: true, name: true, sku: true } },
            customer: { select: { id: true, name: true, phone: true } }
        }
    });
    if (!record) return null;
    const isWarrantyValid = record.warrantyEndDate ? new Date() <= new Date(record.warrantyEndDate) : false;
    const daysRemaining = record.warrantyEndDate
        ? Math.max(0, Math.ceil((new Date(record.warrantyEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;
    return { ...record, isWarrantyValid, daysRemaining };
}

// Hàm tính giá vốn bình quân gia quyền
async function getProductMovingAverageCost(productId) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { importPrice: true } });
    if (!product) return 0;
    const purchaseItems = await prisma.purchaseBillItem.findMany({
        where: { productId, bill: { status: { in: ['APPROVED', 'PARTIAL_PAID', 'PAID'] } } },
        select: { quantity: true, unitPrice: true, totalPrice: true }
    });
    if (purchaseItems.length === 0) return product.importPrice || 0;
    let totalQty = 0, totalCost = 0;
    for (const it of purchaseItems) {
        if (it.quantity > 0) {
            totalQty += it.quantity;
            totalCost += (it.totalPrice || (it.quantity * it.unitPrice));
        }
    }
    return totalQty > 0 ? Math.round((totalCost / totalQty) * 100) / 100 : product.importPrice || 0;
}

async function runPhase2Tests() {
    console.log('--- BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 2: WMS ADVANCED & GIÁ VỐN (CHỈ TRÊN LOCAL) ---\n');
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

    let testProduct = null;
    let testCustomer = null;

    try {
        testProduct = await prisma.product.create({
            data: {
                sku: 'TEST-WMS-' + Date.now(),
                name: 'Camera AI 4K Ultra Enterprise TSOL',
                unit: 'Cái',
                importPrice: 1200000,
                salePrice: 2000000
            }
        });
        assert(testProduct && testProduct.id, 'Tạo sản phẩm kiểm thử thành công');

        testCustomer = await prisma.customer.create({
            data: {
                code: 'CUST-TEST-' + Date.now(),
                name: 'Tập Đoàn Công Nghệ TSOL Test',
                phone: '0912345678'
            }
        });
        assert(testCustomer && testCustomer.id, 'Tạo khách hàng kiểm thử thành công');

        // Test 1: Quy đổi đơn vị tính (1 Thùng = 24 Cái, 1 Hộp = 6 Cái)
        await setProductUnitConversion(testProduct.id, 'Thùng', 24, 45000000);
        await setProductUnitConversion(testProduct.id, 'Hộp', 6, 11500000);

        const baseQtyFromCarton = await convertToBaseUnit(testProduct.id, 'Thùng', 10);
        assert(baseQtyFromCarton === 240, 'Quy đổi 10 Thùng chính xác thành 240 Cái');

        const baseQtyFromBox = await convertToBaseUnit(testProduct.id, 'Hộp', 5);
        assert(baseQtyFromBox === 30, 'Quy đổi 5 Hộp chính xác thành 30 Cái');

        // Test 2: Quản lý vòng đời Serial/IMEI & Nhập kho
        const serial1 = 'SN-ALPHA-001-' + Date.now();
        const serial2 = 'SN-ALPHA-002-' + Date.now();
        const serial3 = 'SN-ALPHA-003-' + Date.now();

        const received = await receiveProductSerials(testProduct.id, [serial1, serial2, serial3], 'Lô hàng nhập mới');
        assert(received.length === 3, 'Nhập kho thành công 3 số Serial');
        assert(received[0].status === 'IN_STOCK', 'Trạng thái ban đầu trong kho là IN_STOCK');

        // Test 3: Xuất kho bán hàng và cấp bảo hành 24 tháng
        const fakeInvoiceId = 'inv_fake_' + Date.now();
        const dispatched = await dispatchProductSerials([serial1, serial2], fakeInvoiceId, testCustomer.id, 24);
        assert(dispatched.length === 2, 'Xuất kho thành công 2 số Serial');
        assert(dispatched[0].status === 'SOLD', 'Trạng thái chuyển thành SOLD');

        // Test 4: Tra cứu bảo hành điện tử theo Serial
        const warrantyInfo = await lookupSerialWarranty(serial1);
        assert(warrantyInfo !== null, 'Tra cứu tìm thấy serial đã bán');
        assert(warrantyInfo.isWarrantyValid === true, 'Bảo hành 24 tháng còn hiệu lực');
        assert(warrantyInfo.customer.name === 'Tập Đoàn Công Nghệ TSOL Test', 'Thông tin khách hàng mua khớp 100%');
        assert(warrantyInfo.daysRemaining > 700, 'Số ngày bảo hành còn lại trên 700 ngày');

        // Test 5: Tính giá vốn bình quân gia quyền
        const avgCost = await getProductMovingAverageCost(testProduct.id);
        assert(avgCost === 1200000, 'Giá vốn ban đầu khớp với importPrice (1.200.000 VNĐ)');

        console.log(`\n========================================`);
        console.log(`TỔNG KẾT KIỂM THỬ GIAI ĐOẠN 2 LOCAL: ${passCount} PASSED / ${failCount} FAILED`);
        console.log(`========================================\n`);

    } catch (err) {
        console.error('Lỗi kiểm thử Phase 2:', err);
        process.exit(1);
    } finally {
        if (testProduct) {
            await prisma.productSerial.deleteMany({ where: { productId: testProduct.id } });
            await prisma.productUnitConversion.deleteMany({ where: { productId: testProduct.id } });
            await prisma.product.delete({ where: { id: testProduct.id } }).catch(() => {});
        }
        if (testCustomer) {
            await prisma.customer.delete({ where: { id: testCustomer.id } }).catch(() => {});
        }
        await prisma.$disconnect();
    }
}

runPhase2Tests();
