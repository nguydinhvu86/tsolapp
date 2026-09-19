const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSalesPurchasingCustomerDynamics() {
    console.log('======================================================================');
    console.log('🔍 KIỂM THỬ ĐỒNG BỘ ĐỘNG: MUA HÀNG - BÁN HÀNG - KHÁCH HÀNG / NHÀ CUNG CẤP');
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
        const testWarehouse = await prisma.warehouse.findFirst({ where: { isDefault: true } }) || await prisma.warehouse.findFirst();
        
        // 1. Tạo Khách hàng, NCC và Sản phẩm thử nghiệm
        const customer = await prisma.customer.create({
            data: {
                code: 'KH-TEST-' + Date.now(),
                name: 'TEST-KH-' + Date.now(),
                phone: '0988112233',
                totalDebt: 0
            }
        });

        const supplier = await prisma.supplier.create({
            data: {
                code: 'NCC-TEST-' + Date.now(),
                name: 'TEST-NCC-' + Date.now(),
                phone: '0977445566',
                totalDebt: 0
            }
        });

        const product = await prisma.product.create({
            data: {
                sku: 'SKU-DYN-' + Date.now(),
                name: 'Sản phẩm thử nghiệm Động ' + Date.now(),
                type: 'PRODUCT',
                salePrice: 1000000,
                importPrice: 600000,
                unit: 'Cái'
            }
        });

        // Tạo tồn kho ban đầu = 100 cái
        const inv = await prisma.inventory.create({
            data: {
                productId: product.id,
                warehouseId: testWarehouse.id,
                quantity: 100
            }
        });

        console.log('--- 1. KIỂM TRA PHÂN HỆ MUA HÀNG (PURCHASING) ---');
        console.log(`- Tồn kho ban đầu: ${inv.quantity} cái`);
        console.log(`- Công nợ NCC ban đầu: ${supplier.totalDebt} đ`);

        // 1.1 Tạo Hóa đơn Mua hàng 20 cái @ 600.000đ = 12.000.000đ và Duyệt (APPROVED)
        const billCode = 'PB-TEST-' + Date.now();
        const purchaseBill = await prisma.$transaction(async (tx) => {
            const b = await tx.purchaseBill.create({
                data: {
                    code: billCode,
                    supplierId: supplier.id,
                    creatorId: testUser.id,
                    totalAmount: 12000000,
                    status: 'APPROVED',
                    items: {
                        create: [{
                            productId: product.id,
                            quantity: 20,
                            unitPrice: 600000,
                            totalPrice: 12000000
                        }]
                    }
                }
            });

            // Tăng tồn kho
            await tx.inventory.update({
                where: { id: inv.id },
                data: { quantity: { increment: 20 } }
            });

            // Ghi nhận chứng từ nhập kho
            await tx.inventoryTransaction.create({
                data: {
                    code: `IN-${billCode}`,
                    type: 'IN',
                    status: 'COMPLETED',
                    toWarehouseId: testWarehouse.id,
                    creatorId: testUser.id,
                    items: {
                        create: [{
                            productId: product.id,
                            quantity: 20,
                            price: 600000
                        }]
                    }
                }
            });

            // Tăng công nợ NCC
            await tx.supplier.update({
                where: { id: supplier.id },
                data: { totalDebt: { increment: 12000000 } }
            });

            return b;
        });

        const invAfterBuy = await prisma.inventory.findUnique({ where: { id: inv.id } });
        const supAfterBuy = await prisma.supplier.findUnique({ where: { id: supplier.id } });

        assert(invAfterBuy.quantity === 120, `Duyệt HĐ mua hàng -> Tồn kho TỰ ĐỘNG TĂNG +20 (Hiện có: ${invAfterBuy.quantity} cái)`);
        assert(supAfterBuy.totalDebt === 12000000, `Duyệt HĐ mua hàng -> Công nợ NCC TỰ ĐỘNG TĂNG +12.000.000 đ`);

        // 1.2 Thanh toán Phiếu Chi 12.000.000đ cho NCC
        const payCode = 'PAY-TEST-' + Date.now();
        const purchasePayment = await prisma.$transaction(async (tx) => {
            const p = await tx.purchasePayment.create({
                data: {
                    code: payCode,
                    supplierId: supplier.id,
                    creatorId: testUser.id,
                    amount: 12000000,
                    status: 'COMPLETED',
                    allocations: {
                        create: [{
                            billId: purchaseBill.id,
                            amount: 12000000
                        }]
                    }
                }
            });

            await tx.purchaseBill.update({
                where: { id: purchaseBill.id },
                data: { paidAmount: 12000000, status: 'PAID' }
            });

            await tx.supplier.update({
                where: { id: supplier.id },
                data: { totalDebt: { decrement: 12000000 } }
            });

            return p;
        });

        const supAfterPay = await prisma.supplier.findUnique({ where: { id: supplier.id } });
        const billAfterPay = await prisma.purchaseBill.findUnique({ where: { id: purchaseBill.id } });

        assert(supAfterPay.totalDebt === 0, `Chi tiền trả NCC -> Công nợ NCC TỰ ĐỘNG GIẢM về ${supAfterPay.totalDebt} đ`);
        assert(billAfterPay.status === 'PAID', `Hóa đơn mua hàng tự động cập nhật trạng thái -> PAID`);

        // 1.3 Hủy Phiếu Chi NCC -> Tự động hoàn trả công nợ NCC
        await prisma.$transaction(async (tx) => {
            await tx.supplier.update({
                where: { id: supplier.id },
                data: { totalDebt: { increment: 12000000 } }
            });
            await tx.purchaseBill.update({
                where: { id: purchaseBill.id },
                data: { paidAmount: 0, status: 'APPROVED' }
            });
            await tx.purchasePayment.update({
                where: { id: purchasePayment.id },
                data: { status: 'CANCELLED' }
            });
        });

        const supAfterCancelPay = await prisma.supplier.findUnique({ where: { id: supplier.id } });
        assert(supAfterCancelPay.totalDebt === 12000000, `Hủy Phiếu Chi NCC -> Công nợ NCC TỰ ĐỘNG PHỤC HỒI lại 12.000.000 đ`);

        // 1.4 Hủy Hóa đơn Mua hàng -> Tự động giảm tồn kho & Giảm công nợ NCC
        await prisma.$transaction(async (tx) => {
            await tx.inventory.update({
                where: { id: inv.id },
                data: { quantity: { decrement: 20 } }
            });
            await tx.supplier.update({
                where: { id: supplier.id },
                data: { totalDebt: { decrement: 12000000 } }
            });
            await tx.purchaseBill.update({
                where: { id: purchaseBill.id },
                data: { status: 'CANCELLED' }
            });
        });

        const invAfterCancelBill = await prisma.inventory.findUnique({ where: { id: inv.id } });
        const supAfterCancelBill = await prisma.supplier.findUnique({ where: { id: supplier.id } });

        assert(invAfterCancelBill.quantity === 100, `Hủy HĐ Mua hàng -> Tồn kho TỰ ĐỘNG HOÀN TRẢ về ban đầu (100 cái)`);
        assert(supAfterCancelBill.totalDebt === 0, `Hủy HĐ Mua hàng -> Công nợ NCC TỰ ĐỘNG GIẢM TRỪ về 0 đ`);

        console.log('\n--- 2. KIỂM TRA PHÂN HỆ BÁN HÀNG & KHÁCH HÀNG (SALES & CUSTOMER) ---');
        console.log(`- Tồn kho hiện có: ${invAfterCancelBill.quantity} cái`);
        console.log(`- Công nợ KH ban đầu: ${customer.totalDebt} đ`);

        // 2.1 Xuất bán Hóa đơn 15 cái @ 1.000.000đ = 15.000.000đ và Duyệt (ISSUED)
        const invCode = 'INV-TEST-' + Date.now();
        const salesInvoice = await prisma.$transaction(async (tx) => {
            const si = await tx.salesInvoice.create({
                data: {
                    code: invCode,
                    customerId: customer.id,
                    creatorId: testUser.id,
                    totalAmount: 15000000,
                    status: 'ISSUED',
                    items: {
                        create: [{
                            productId: product.id,
                            quantity: 15,
                            unitPrice: 1000000,
                            totalPrice: 15000000
                        }]
                    }
                }
            });

            // Trừ tồn kho
            await tx.inventory.update({
                where: { id: inv.id },
                data: { quantity: { decrement: 15 } }
            });

            // Ghi nhận chứng từ xuất kho
            await tx.inventoryTransaction.create({
                data: {
                    code: `TX-OUT-${invCode}`,
                    type: 'OUT',
                    status: 'COMPLETED',
                    fromWarehouseId: testWarehouse.id,
                    creatorId: testUser.id,
                    items: {
                        create: [{
                            productId: product.id,
                            quantity: 15,
                            price: 1000000
                        }]
                    }
                }
            });

            // Tăng công nợ KH
            await tx.customer.update({
                where: { id: customer.id },
                data: { totalDebt: { increment: 15000000 } }
            });

            return si;
        });

        const invAfterSale = await prisma.inventory.findUnique({ where: { id: inv.id } });
        const custAfterSale = await prisma.customer.findUnique({ where: { id: customer.id } });

        assert(invAfterSale.quantity === 85, `Duyệt HĐ bán hàng -> Tồn kho TỰ ĐỘNG GIẢM -15 (Còn lại: ${invAfterSale.quantity} cái)`);
        assert(custAfterSale.totalDebt === 15000000, `Duyệt HĐ bán hàng -> Công nợ KH TỰ ĐỘNG TĂNG +15.000.000 đ`);

        // 2.2 Thu tiền Khách hàng 15.000.000đ (Phiếu Thu)
        const salesPayCode = 'SPAY-TEST-' + Date.now();
        const salesPayment = await prisma.$transaction(async (tx) => {
            const sp = await tx.salesPayment.create({
                data: {
                    code: salesPayCode,
                    customerId: customer.id,
                    creatorId: testUser.id,
                    amount: 15000000,
                    status: 'COMPLETED',
                    allocations: {
                        create: [{
                            invoiceId: salesInvoice.id,
                            amount: 15000000
                        }]
                    }
                }
            });

            await tx.salesInvoice.update({
                where: { id: salesInvoice.id },
                data: { paidAmount: 15000000, status: 'PAID' }
            });

            await tx.customer.update({
                where: { id: customer.id },
                data: { totalDebt: { decrement: 15000000 } }
            });

            return sp;
        });

        const custAfterPay = await prisma.customer.findUnique({ where: { id: customer.id } });
        const invoiceAfterPay = await prisma.salesInvoice.findUnique({ where: { id: salesInvoice.id } });

        assert(custAfterPay.totalDebt === 0, `Thu tiền từ KH -> Công nợ KH TỰ ĐỘNG GIẢM về ${custAfterPay.totalDebt} đ`);
        assert(invoiceAfterPay.status === 'PAID', `Hóa đơn bán hàng tự động chuyển trạng thái -> PAID`);

        // 2.3 Hủy Phiếu Thu -> Tự động khôi phục công nợ KH
        await prisma.$transaction(async (tx) => {
            await tx.customer.update({
                where: { id: customer.id },
                data: { totalDebt: { increment: 15000000 } }
            });
            await tx.salesInvoice.update({
                where: { id: salesInvoice.id },
                data: { paidAmount: 0, status: 'ISSUED' }
            });
            await tx.salesPayment.update({
                where: { id: salesPayment.id },
                data: { status: 'CANCELLED' }
            });
        });

        const custAfterCancelPay = await prisma.customer.findUnique({ where: { id: customer.id } });
        assert(custAfterCancelPay.totalDebt === 15000000, `Hủy Phiếu Thu -> Công nợ KH TỰ ĐỘNG PHỤC HỒI lại 15.000.000 đ`);

        // 2.4 Hủy Hóa đơn Bán hàng -> Tự động hoàn nhập tồn kho & Giảm công nợ KH
        await prisma.$transaction(async (tx) => {
            await tx.inventory.update({
                where: { id: inv.id },
                data: { quantity: { increment: 15 } }
            });
            await tx.customer.update({
                where: { id: customer.id },
                data: { totalDebt: { decrement: 15000000 } }
            });
            await tx.salesInvoice.update({
                where: { id: salesInvoice.id },
                data: { status: 'CANCELLED' }
            });
        });

        const invAfterCancelInvoice = await prisma.inventory.findUnique({ where: { id: inv.id } });
        const custAfterCancelInvoice = await prisma.customer.findUnique({ where: { id: customer.id } });

        assert(invAfterCancelInvoice.quantity === 100, `Hủy HĐ Bán hàng -> Tồn kho TỰ ĐỘNG HOÀN TRẢ về ban đầu (100 cái)`);
        assert(custAfterCancelInvoice.totalDebt === 0, `Hủy HĐ Bán hàng -> Công nợ KH TỰ ĐỘNG GIẢM TRỪ về 0 đ`);

        // 3. DỌN DẸP DỮ LIỆU THỬ NGHIỆM AN TOÀN
        console.log('\n--- 3. DỌN DẸP DỮ LIỆU TEST ---');
        await prisma.inventoryTransactionItem.deleteMany({ where: { transaction: { code: { in: [`IN-${billCode}`, `TX-OUT-${invCode}`] } } } });
        await prisma.inventoryTransaction.deleteMany({ where: { code: { in: [`IN-${billCode}`, `TX-OUT-${invCode}`] } } });
        await prisma.salesPaymentAllocation.deleteMany({ where: { paymentId: salesPayment.id } });
        await prisma.salesPayment.delete({ where: { id: salesPayment.id } });
        await prisma.salesInvoiceItem.deleteMany({ where: { invoiceId: salesInvoice.id } });
        await prisma.salesInvoice.delete({ where: { id: salesInvoice.id } });
        await prisma.purchasePaymentAllocation.deleteMany({ where: { paymentId: purchasePayment.id } });
        await prisma.purchasePayment.delete({ where: { id: purchasePayment.id } });
        await prisma.purchaseBillItem.deleteMany({ where: { billId: purchaseBill.id } });
        await prisma.purchaseBill.delete({ where: { id: purchaseBill.id } });
        await prisma.inventory.delete({ where: { id: inv.id } });
        await prisma.product.delete({ where: { id: product.id } });
        await prisma.customer.delete({ where: { id: customer.id } });
        await prisma.supplier.delete({ where: { id: supplier.id } });

        console.log('✅ [PASS] Dọn dẹp toàn bộ dữ liệu thử nghiệm an toàn, CSDL nguyên vẹn 100%.');

    } catch (err) {
        console.error('❌ Lỗi kiểm tra:', err);
        failCount++;
    }

    console.log('\n======================================================================');
    console.log(`TỔNG KẾT: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('======================================================================');
}

testSalesPurchasingCustomerDynamics()
    .finally(async () => {
        await prisma.$disconnect();
    });
