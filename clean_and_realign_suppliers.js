const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeTaxCode(taxCode) {
    if (!taxCode) return '';
    let clean = taxCode.toString().replace(/[^0-9A-Za-z-]/g, '').trim();
    if (clean.toLowerCase().includes('khongthetrichxuat') || clean.toLowerCase().includes('pending') || clean.length < 8) {
        return '';
    }
    if (/^\d{9}$/.test(clean)) {
        clean = '0' + clean;
    }
    return clean;
}

function cleanCompanyName(name) {
    if (!name) return '';
    let clean = name.trim().toLowerCase();
    const prefixes = [
        /^công\s+ty\s+tnhh\s+(?:mtv\s+|một\s+thành\s+viên\s+|tm\s+dv\s+|tmdv\s+|tm\s+và\s+dv\s+|thương\s+mại\s+dịch\s+vụ\s+)?/i,
        /^công\s+ty\s+cổ\s+phần\s+(?:tm\s+dv\s+|tmdv\s+|tm\s+và\s+dv\s+|thương\s+mại\s+dịch\s+vụ\s+)?/i,
        /^công\s+ty\s+cp\s+(?:tm\s+dv\s+|tmdv\s+|thương\s+mại\s+dịch\s+vụ\s+)?/i,
        /^cty\s+tnhh\s+(?:mtv\s+|tmdv\s+)?/i,
        /^cty\s+cp\s+/i,
        /^cty\s+/i,
        /^công\s+ty\s+/i,
        /^doanh\s+nghiệp\s+tư\s+nhân\s+/i,
        /^dntn\s+/i,
        /^chi\s+nhánh\s+/i,
        /^trung\s+tâm\s+/i,
    ];
    for (const p of prefixes) {
        clean = clean.replace(p, '');
    }
    return clean.replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/gi, '').replace(/\s+/g, ' ').trim();
}

async function main() {
    console.log("=== BẮT ĐẦU CHUẨN HÓA VÀ ĐỒNG BỘ PHÂN BỔ NHÀ CUNG CẤP ===");

    // 1. Chuẩn hóa MST cho tất cả Supplier
    const suppliers = await prisma.supplier.findMany();
    console.log(`Đang kiểm tra ${suppliers.length} nhà cung cấp...`);

    for (const s of suppliers) {
        const norm = normalizeTaxCode(s.taxCode);
        if (norm && norm !== s.taxCode) {
            console.log(`[Cập nhật MST NCC] [${s.code}] "${s.name}": "${s.taxCode}" -> "${norm}"`);
            await prisma.supplier.update({
                where: { id: s.id },
                data: { taxCode: norm }
            });
        }
    }

    // 2. Định nghĩa các cặp Duplicate cần gộp (giữ NCC chính có mã TSOL-... hoặc mã gốc)
    const mergePairs = [
        { duplicateCode: 'NCC-000034', targetCode: 'TSOL-NGUYENKIM', realTax: '0303753468' },
        { duplicateCode: 'TSOL-VITINHNGUYENKIM ( khác)', targetCode: 'TSOL-NGUYENKIM', realTax: '0303753468' },
        { duplicateCode: 'NCC-000015', targetCode: 'TSOL-SONIC', realTax: '0109214546' },
        { duplicateCode: 'NCC-000016', targetCode: 'TSOL- MINHDAOPHAT', realTax: '4600260039' },
        { duplicateCode: 'NCC-000035', targetCode: 'TSOL - ANCHIEU ', realTax: '3702563697' },
        { duplicateCode: 'NCC-000022', targetCode: 'TSOL-NCC-HOANPHAT', realTax: '0314640561' },
    ];

    for (const pair of mergePairs) {
        const dupSup = await prisma.supplier.findFirst({ where: { code: pair.duplicateCode } });
        const targetSup = await prisma.supplier.findFirst({ where: { code: pair.targetCode } });

        if (dupSup && targetSup) {
            console.log(`\n[GỘP NCC] Chuyển dữ liệu từ [${dupSup.code}] sang [${targetSup.code}]...`);
            
            // Cập nhật MST chuẩn cho target nếu cần
            if (pair.realTax) {
                await prisma.supplier.update({
                    where: { id: targetSup.id },
                    data: { taxCode: pair.realTax }
                });
            }

            // Chuyển toàn bộ Invoice
            const invCount = await prisma.supplierInvoice.updateMany({
                where: { supplierId: dupSup.id },
                data: { supplierId: targetSup.id }
            });
            console.log(`  - Đã chuyển ${invCount.count} hóa đơn đầu vào.`);

            // Chuyển toàn bộ PurchaseOrder
            const poCount = await prisma.purchaseOrder.updateMany({
                where: { supplierId: dupSup.id },
                data: { supplierId: targetSup.id }
            });
            console.log(`  - Đã chuyển ${poCount.count} đơn mua hàng (PO).`);

            // Chuyển toàn bộ PurchaseBill
            const billCount = await prisma.purchaseBill.updateMany({
                where: { supplierId: dupSup.id },
                data: { supplierId: targetSup.id }
            });
            console.log(`  - Đã chuyển ${billCount.count} hóa đơn mua hàng.`);

            // Chuyển toàn bộ InventoryTransaction
            const invTxCount = await prisma.inventoryTransaction.updateMany({
                where: { supplierId: dupSup.id },
                data: { supplierId: targetSup.id }
            });
            console.log(`  - Đã chuyển ${invTxCount.count} phiếu xuất/nhập kho.`);

            // Chuyển SupplierPayment
            const spCount = await prisma.supplierPayment.updateMany({
                where: { supplierId: dupSup.id },
                data: { supplierId: targetSup.id }
            });
            console.log(`  - Đã chuyển ${spCount.count} phiếu chi NCC.`);

            // Sau khi chuyển an toàn, xóa NCC trùng lặp
            try {
                await prisma.supplier.delete({ where: { id: dupSup.id } });
                console.log(`  - Đã xóa bản ghi NCC trùng lặp [${dupSup.code}].`);
            } catch (delErr) {
                console.log(`  - Không thể xóa NCC ${dupSup.code} (có thể do ràng buộc khác), đổi tên thành INACTIVE.`);
                await prisma.supplier.update({
                    where: { id: dupSup.id },
                    data: { name: `[ĐÃ GỘP VÀO ${targetSup.code}] ${dupSup.name}`, taxCode: '' }
                });
            }
        }
    }

    // 3. Phân bổ lại toàn bộ hóa đơn đầu vào
    const allSuppliersLatest = await prisma.supplier.findMany();
    const invoices = await prisma.supplierInvoice.findMany();
    console.log(`\nĐang phân bổ lại ${invoices.length} hóa đơn đầu vào...`);

    let updatedCount = 0;
    for (const inv of invoices) {
        const normInvTax = normalizeTaxCode(inv.supplierTaxCode);
        const isDraft = !inv.xmlUrl || (inv.supplierName && inv.supplierName.includes('Bản Nháp')) || (inv.supplierTaxCode && inv.supplierTaxCode.includes('KhongTheTrichXuat'));

        if (isDraft) {
            // Nếu là bản nháp email không có thông tin thật, ngắt liên kết sai
            if (inv.supplierId) {
                console.log(`[Gỡ bỏ gán sai] HĐ #${inv.invoiceNumber} (Bản nháp) -> gỡ NCC hiện tại.`);
                await prisma.supplierInvoice.update({
                    where: { id: inv.id },
                    data: { supplierId: null }
                });
                updatedCount++;
            }
            continue;
        }

        // Tìm NCC phù hợp nhất
        let matchedSupplier = null;

        // Ưu tiên 1: So khớp MST
        if (normInvTax) {
            const rawInvDigits = normInvTax.replace(/[^0-9]/g, '');
            for (const s of allSuppliersLatest) {
                const sNorm = normalizeTaxCode(s.taxCode);
                if (sNorm && sNorm === normInvTax) {
                    matchedSupplier = s;
                    break;
                }
                const sDigits = (s.taxCode || '').replace(/[^0-9]/g, '');
                if (rawInvDigits.length >= 10 && sDigits.length >= 10 && rawInvDigits.slice(0, 10) === sDigits.slice(0, 10)) {
                    matchedSupplier = s;
                    break;
                }
            }
        }

        // Ưu tiên 2: So khớp Tên
        if (!matchedSupplier && inv.supplierName) {
            const cleanInvName = cleanCompanyName(inv.supplierName);
            if (cleanInvName.length >= 3) {
                for (const s of allSuppliersLatest) {
                    const cleanSupName = cleanCompanyName(s.name);
                    if (cleanSupName && (cleanSupName === cleanInvName || (cleanSupName.length > 5 && cleanInvName.includes(cleanSupName)) || (cleanInvName.length > 5 && cleanSupName.includes(cleanInvName)))) {
                        matchedSupplier = s;
                        break;
                    }
                }
            }
        }

        if (matchedSupplier && matchedSupplier.id !== inv.supplierId) {
            console.log(`[Khớp lại NCC] HĐ #${inv.invoiceNumber} ("${inv.supplierName}") -> [${matchedSupplier.code}] "${matchedSupplier.name}"`);
            await prisma.supplierInvoice.update({
                where: { id: inv.id },
                data: { supplierId: matchedSupplier.id }
            });
            updatedCount++;
        }
    }

    console.log(`\n=== HOÀN TẤT: Đã cập nhật phân bổ chuẩn xác cho ${updatedCount} hóa đơn ===`);
}

main()
    .catch(e => console.error("Lỗi:", e))
    .finally(() => prisma.$disconnect());
