export function normalizeTaxCode(taxCode: string | null | undefined): string {
    if (!taxCode) return '';
    let clean = taxCode.toString().replace(/[^0-9A-Za-z-]/g, '').trim();
    
    // Bỏ qua các placeholder hoặc chuỗi rác
    if (
        clean.toLowerCase().includes('khongthetrichxuat') || 
        clean.toLowerCase().includes('pending') || 
        clean.toLowerCase().includes('mst') ||
        clean.length < 8
    ) {
        return '';
    }

    // Nếu MST là 9 chữ số (do bị mất số 0 đầu), thêm số 0 vào đầu để chuẩn 10 chữ số
    if (/^\d{9}$/.test(clean)) {
        clean = '0' + clean;
    }

    return clean;
}

export function cleanCompanyName(name: string | null | undefined): string {
    if (!name) return '';
    let clean = name.trim().toLowerCase();
    
    // Loại bỏ tiền tố doanh nghiệp phổ biến để so sánh tên cốt lõi
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

    return clean
        .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export async function findBestMatchingSupplier(
    tx: any, 
    { supplierTaxCode, supplierName }: { supplierTaxCode?: string | null; supplierName?: string | null }
) {
    const normTax = normalizeTaxCode(supplierTaxCode);
    const rawTaxDigits = normTax.replace(/[^0-9]/g, '');

    // 1. Tìm kiếm theo Mã Số Thuế (Ưu tiên tuyệt đối)
    if (rawTaxDigits && rawTaxDigits.length >= 8) {
        // Tìm toàn bộ NCC có MST trong DB
        const allSuppliers = await tx.supplier.findMany({
            select: { id: true, code: true, name: true, taxCode: true }
        });

        // 1.1 Khớp chính xác hoàn toàn MST chuẩn hóa
        for (const s of allSuppliers) {
            const sNorm = normalizeTaxCode(s.taxCode);
            if (sNorm && sNorm === normTax) {
                return s;
            }
        }

        // 1.2 Khớp 10 chữ số cơ bản (bỏ qua đuôi chi nhánh -001, -002 hoặc ngược lại)
        const base10Inv = rawTaxDigits.slice(0, 10);
        for (const s of allSuppliers) {
            const sDigits = (s.taxCode || '').replace(/[^0-9]/g, '');
            if (sDigits.length >= 10) {
                const base10Sup = sDigits.slice(0, 10);
                if (base10Inv === base10Sup) {
                    return s;
                }
            }
        }
    }

    // 2. Tìm kiếm theo Tên Doanh Nghiệp (Nếu không khớp MST hoặc MST bị thiếu)
    const rawName = (supplierName || '').trim();
    if (rawName && !rawName.includes('Bản Nháp') && !rawName.includes('Chưa định dạng')) {
        const cleanInvName = cleanCompanyName(rawName);

        if (cleanInvName.length >= 3) {
            const allSuppliers = await tx.supplier.findMany({
                select: { id: true, code: true, name: true, taxCode: true }
            });

            // 2.1 Khớp tên đầy đủ (case-insensitive)
            for (const s of allSuppliers) {
                if (s.name && s.name.trim().toLowerCase() === rawName.toLowerCase()) {
                    // Nếu NCC trong DB chưa có MST mà HĐ có MST hợp lệ -> cập nhật bổ sung MST cho NCC
                    if (!s.taxCode && normTax) {
                        await tx.supplier.update({
                            where: { id: s.id },
                            data: { taxCode: normTax }
                        });
                    }
                    return s;
                }
            }

            // 2.2 Khớp tên cốt lõi sau khi loại bỏ tiền tố Cty TNHH / CP
            for (const s of allSuppliers) {
                const cleanSupName = cleanCompanyName(s.name);
                if (cleanSupName && (cleanSupName === cleanInvName || (cleanSupName.length > 5 && cleanInvName.includes(cleanSupName)) || (cleanInvName.length > 5 && cleanSupName.includes(cleanInvName)))) {
                    if (!s.taxCode && normTax) {
                        await tx.supplier.update({
                            where: { id: s.id },
                            data: { taxCode: normTax }
                        });
                    }
                    return s;
                }
            }
        }
    }

    return null;
}

export async function resolveSupplierForInvoice(
    tx: any,
    { supplierTaxCode, supplierName, autoCreate = true }: { supplierTaxCode?: string | null; supplierName?: string | null; autoCreate?: boolean }
): Promise<string | null> {
    const matched = await findBestMatchingSupplier(tx, { supplierTaxCode, supplierName });
    if (matched) {
        return matched.id;
    }

    const rawName = (supplierName || '').trim();
    const normTax = normalizeTaxCode(supplierTaxCode);

    // Không tự tạo NCC nếu là bản nháp email hoặc tên rác
    if (!autoCreate || !rawName || rawName.includes('Bản Nháp') || rawName.includes('Chưa định dạng')) {
        return null;
    }

    // Tự động tạo mới Nhà Cung Cấp nếu có đủ thông tin tên và MST hợp lệ
    const count = await tx.supplier.count();
    const sCode = `NCC-${(count + 1).toString().padStart(6, '0')}`;
    
    const newSup = await tx.supplier.create({
        data: {
            code: sCode,
            name: rawName,
            taxCode: normTax || '',
            totalDebt: 0
        }
    });

    return newSup.id;
}
