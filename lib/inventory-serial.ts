import { prisma } from '@/lib/prisma';
import { calculateWarrantyRemaining } from '@/lib/warranty';

export interface ReceiveSerialsInput {
    productId: string;
    serialNumbers: string[];
    warehouseId?: string;
    purchaseBillId?: string;
    notes?: string;
}

export interface DispatchSerialsInput {
    serialNumbers: string[];
    salesInvoiceId?: string;
    customerId: string;
    warrantyMonths?: number;
}

export interface FormattedSerialHistoryItem {
    id: string;
    actionType: string;
    title: string;
    status?: string | null;
    date: string;
    receivedDate?: string | null;
    returnDate?: string | null;
    defectReason?: string | null;
    appearanceCondition?: string | null;
    accessoriesIncluded?: string | null;
    repairResult?: string | null;
    replacementSerialNumber?: string | null;
    swapType?: string | null;
    technicianName?: string | null;
    staffNotes?: string | null;
    badgeColor?: string;
}

/**
 * Phân tích và trích xuất lịch sử tổng hợp (từ cả bảng ProductSerialHistory và chuỗi notes kế thừa)
 */
export function parseFullSerialHistory(
    serial: {
        id: string;
        serialNumber: string;
        status: string;
        notes?: string | null;
        createdAt?: Date | string;
        serviceHistories?: any[];
    }
) {
    const historyItems: FormattedSerialHistoryItem[] = [];

    // 1. Nạp từ bảng quan hệ structured ProductSerialHistory
    if (serial.serviceHistories && serial.serviceHistories.length > 0) {
        serial.serviceHistories.forEach(h => {
            let title = 'Cập nhật trạng thái';
            let badgeColor = 'bg-slate-100 text-slate-700 border-slate-300';

            switch (h.actionType) {
                case 'RECEIVE_WARRANTY':
                    title = '🔧 Tiếp Nhận Bảo Hành (RMA)';
                    badgeColor = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300';
                    break;
                case 'DEFECTIVE_RETURN':
                    title = '⚠️ Tiếp Nhận Báo Lỗi / Hỏng';
                    badgeColor = 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300';
                    break;
                case 'REPAIR_COMPLETE':
                    title = '✅ Hoàn Tất Bảo Hành & Trả Thiết Bị';
                    badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300';
                    break;
                case 'SWAP_REPLACE':
                    title = h.swapType === 'SWAP_OUT_OLD' 
                        ? '🔄 Đổi Mới 1-1 (Thu hồi thiết bị cũ)' 
                        : '✨ Cấp Thiết Bị Mới Thay Thế (1-1)';
                    badgeColor = 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300';
                    break;
                case 'CARE_NOTE':
                    title = '📝 Ghi Chú / Chăm Sóc Khách Hàng (CSKH)';
                    badgeColor = 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300';
                    break;
                default:
                    title = h.actionType;
            }

            historyItems.push({
                id: h.id,
                actionType: h.actionType,
                title,
                status: h.status,
                date: h.createdAt ? new Date(h.createdAt).toISOString() : new Date().toISOString(),
                receivedDate: h.receivedDate ? new Date(h.receivedDate).toISOString() : null,
                returnDate: h.returnDate ? new Date(h.returnDate).toISOString() : null,
                defectReason: h.defectReason,
                appearanceCondition: h.appearanceCondition,
                accessoriesIncluded: h.accessoriesIncluded,
                repairResult: h.repairResult,
                replacementSerialNumber: h.replacementSerialNumber,
                swapType: h.swapType,
                technicianName: h.technicianName,
                staffNotes: h.staffNotes,
                badgeColor
            });
        });
    }

    // 2. Phân tích bổ sung từ notes legacy nếu chưa có trong history
    if (serial.notes) {
        const rawLines = serial.notes.split('\n').filter((l: string) => l.trim().length > 0);
        rawLines.forEach((line: string, idx: number) => {
            const hasReceive = line.includes('TIẾP NHẬN BẢO HÀNH') || line.includes('TIẾP NHẬN HÀNG LỖI');
            const hasComplete = line.includes('HOÀN TẤT BẢO HÀNH');
            const hasSwap = line.includes('ĐỔI MỚI 1-1') || line.includes('MÁY ĐỔI MỚI');
            const hasCare = line.includes('CSKH') || line.includes('CHĂM SÓC KHÁCH HÀNG') || line.includes('GHI CHÚ');

            // Kiểm tra xem đã có structured record khớp chưa để tránh trùng lặp
            const alreadyExists = historyItems.some(h => 
                (hasReceive && h.actionType === 'RECEIVE_WARRANTY') ||
                (hasComplete && h.actionType === 'REPAIR_COMPLETE') ||
                (hasSwap && h.actionType === 'SWAP_REPLACE')
            );

            if (!alreadyExists && (hasReceive || hasComplete || hasSwap || hasCare)) {
                let actionType = 'CARE_NOTE';
                let title = '📝 Nhật ký ghi chú';
                let badgeColor = 'bg-slate-100 text-slate-700 border-slate-300';

                if (hasReceive) {
                    actionType = 'RECEIVE_WARRANTY';
                    title = '🔧 Tiếp Nhận Bảo Hành (Ghi chú cũ)';
                    badgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
                } else if (hasComplete) {
                    actionType = 'REPAIR_COMPLETE';
                    title = '✅ Hoàn Tất Bảo Hành (Ghi chú cũ)';
                    badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                } else if (hasSwap) {
                    actionType = 'SWAP_REPLACE';
                    title = '🔄 Đổi Mới 1-1 (Ghi chú cũ)';
                    badgeColor = 'bg-indigo-50 text-indigo-800 border-indigo-300';
                }

                // Trích xuất các trường từ chuỗi cũ nếu có dạng "Lỗi: ... | Ngoại quan: ... | Phụ kiện: ..."
                let defectReason = null;
                let appearanceCondition = null;
                let accessoriesIncluded = null;
                let technicianName = null;
                let replacementSerialNumber: string | null = null;
                let swapType: string | null = null;
                let staffNotes = line;

                const matchDefect = line.match(/(?:Lỗi|Lý do):\s*([^|]+)/i);
                if (matchDefect) defectReason = matchDefect[1].trim();

                const matchAppearance = line.match(/Ngoại quan:\s*([^|]+)/i);
                if (matchAppearance) appearanceCondition = matchAppearance[1].trim();

                const matchAccessories = line.match(/Phụ kiện:\s*([^|]+)/i);
                if (matchAccessories) accessoriesIncluded = matchAccessories[1].trim();

                const matchTech = line.match(/(?:Tiếp nhận|Người xử lý|Kỹ thuật viên):\s*([^|]+)/i);
                if (matchTech) technicianName = matchTech[1].trim();

                if (hasSwap) {
                    const matchReplacement = line.match(/(?:Serial mới|Serial cũ|sang Serial|cho Serial cũ):\s*\[?([a-zA-Z0-9_\-\.\/]+)\]?/i);
                    if (matchReplacement) replacementSerialNumber = matchReplacement[1].trim();
                    swapType = (line.includes('THU HỒI') || line.includes('sang Serial mới')) ? 'SWAP_OUT_OLD' : 'SWAP_IN_NEW';
                }

                historyItems.push({
                    id: `legacy-${serial.id}-${idx}`,
                    actionType,
                    title,
                    status: null,
                    date: new Date().toISOString(),
                    receivedDate: hasReceive ? new Date().toISOString() : null,
                    returnDate: hasComplete ? new Date().toISOString() : null,
                    defectReason,
                    appearanceCondition,
                    accessoriesIncluded,
                    repairResult: hasComplete ? line : null,
                    replacementSerialNumber,
                    swapType,
                    technicianName,
                    staffNotes,
                    badgeColor
                });
            }
        });
    }

    // Đếm số lần bảo hành: tính tất cả sự kiện RECEIVE_WARRANTY hoặc DEFECTIVE_RETURN
    const warrantyCount = historyItems.filter(h => 
        h.actionType === 'RECEIVE_WARRANTY' || h.actionType === 'DEFECTIVE_RETURN'
    ).length;

    // Đợt bảo hành / tiếp nhận gần nhất
    const latestReceive = historyItems.find(h => 
        h.actionType === 'RECEIVE_WARRANTY' || h.actionType === 'DEFECTIVE_RETURN'
    );

    // Đợt hoàn tất trả máy gần nhất
    const latestReturn = historyItems.find(h => 
        h.actionType === 'REPAIR_COMPLETE'
    );

    // Đợt đổi máy 1-1 gần nhất
    const latestSwap = historyItems.find(h => 
        h.actionType === 'SWAP_REPLACE'
    );

    // Xác định trạng thái nghiệp vụ bảo hành chi tiết
    let currentServiceState = 'NORMAL';
    let serviceStateLabel = 'Đang hoạt động bình thường';
    let serviceBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';

    const isOldSwappedOut = (
        serial.status === 'REPLACED' ||
        (serial.status === 'DEFECTIVE' && (
            latestSwap?.swapType === 'SWAP_OUT_OLD' ||
            Boolean(latestSwap?.replacementSerialNumber) ||
            (serial.notes && (serial.notes.includes('ĐỔI MỚI 1-1 THU HỒI') || serial.notes.includes('Đã thu hồi đổi sang Serial mới')))
        ))
    );

    if (isOldSwappedOut) {
        currentServiceState = 'REPLACED';
        const newSn = latestSwap?.replacementSerialNumber;
        serviceStateLabel = newSn 
            ? `Đã đổi mới (Lỗi hỏng đã thu hồi đổi sang Serial mới: ${newSn})`
            : 'Đã đổi mới (Lỗi hỏng đã được đổi mới 1-1)';
        serviceBadgeClass = 'bg-purple-100 text-purple-800 border-purple-300';
    } else if (serial.status === 'UNDER_WARRANTY') {
        currentServiceState = 'UNDER_WARRANTY';
        serviceStateLabel = 'Đang bảo hành (Đang xử lý tại phòng kỹ thuật)';
        serviceBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse';
    } else if (serial.status === 'DEFECTIVE') {
        currentServiceState = 'DEFECTIVE';
        serviceStateLabel = 'Lỗi / Hỏng (Chờ kiểm tra & xử lý)';
        serviceBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
    } else if (serial.status === 'IN_STOCK') {
        currentServiceState = 'IN_STOCK';
        serviceStateLabel = 'Tồn kho (Chưa xuất bán)';
        serviceBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300';
    } else if (serial.status === 'SOLD') {
        if (latestReturn) {
            currentServiceState = 'WARRANTY_COMPLETED';
            serviceStateLabel = `Hoàn thành bảo hành (Đã trả khách, bảo hành ${warrantyCount} lần)`;
            serviceBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
        } else if (warrantyCount > 0) {
            currentServiceState = 'WARRANTY_COMPLETED';
            serviceStateLabel = `Đã bảo hành (${warrantyCount} lần)`;
            serviceBadgeClass = 'bg-teal-100 text-teal-800 border-teal-300';
        } else {
            currentServiceState = 'NORMAL';
            serviceStateLabel = 'Đang sử dụng bình thường';
            serviceBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
        }
    }

    return {
        warrantyCount,
        currentServiceState,
        serviceStateLabel,
        serviceBadgeClass,
        lastReceivedDate: latestReceive?.receivedDate || latestReceive?.date || null,
        lastReturnDate: latestReturn?.returnDate || latestReturn?.date || null,
        latestAccessories: latestReceive?.accessoriesIncluded || null,
        latestAppearance: latestReceive?.appearanceCondition || null,
        latestDefectReason: latestReceive?.defectReason || null,
        latestRepairResult: latestReturn?.repairResult || null,
        latestStaffNotes: latestReceive?.staffNotes || latestReturn?.staffNotes || null,
        replacementInfo: latestSwap ? {
            replacementSerialNumber: latestSwap.replacementSerialNumber,
            swapType: latestSwap.swapType,
            date: latestSwap.date,
            defectReason: latestSwap.defectReason,
            notes: latestSwap.staffNotes
        } : (serial.notes && serial.notes.includes('ĐỔI MỚI')) ? (() => {
            const matchRep = serial.notes.match(/(?:Serial mới|Serial cũ|sang Serial|cho Serial cũ):\s*\[?([a-zA-Z0-9_\-\.\/]+)\]?/i);
            return {
                replacementSerialNumber: matchRep ? matchRep[1].trim() : null,
                swapType: (serial.notes.includes('THU HỒI') || serial.notes.includes('sang Serial mới')) ? 'SWAP_OUT_OLD' : 'SWAP_IN_NEW',
                date: new Date().toISOString(),
                defectReason: null,
                notes: 'Đã đổi mới thiết bị'
            };
        })() : null,
        historyItems
    };
}

/**
 * Nhập kho danh sách số Serial/IMEI từ hóa đơn mua hàng hoặc kiểm kê
 */
export async function receiveProductSerials(input: ReceiveSerialsInput) {
    const results = [];
    for (const serial of input.serialNumbers) {
        const trimmed = serial.trim();
        if (!trimmed) continue;

        const record = await prisma.productSerial.upsert({
            where: { serialNumber: trimmed },
            update: {
                productId: input.productId,
                warehouseId: input.warehouseId || null,
                purchaseBillId: input.purchaseBillId || null,
                status: 'IN_STOCK',
                notes: input.notes || null,
            },
            create: {
                productId: input.productId,
                serialNumber: trimmed,
                warehouseId: input.warehouseId || null,
                purchaseBillId: input.purchaseBillId || null,
                status: 'IN_STOCK',
                notes: input.notes || null,
            }
        });
        results.push(record);
    }
    return results;
}

/**
 * Xuất kho số Serial/IMEI khi bán hàng cho khách và tự động tính hạn bảo hành
 */
export async function dispatchProductSerials(input: DispatchSerialsInput) {
    const now = new Date();
    const updated = [];
    for (const serial of input.serialNumbers) {
        const trimmed = serial.trim();
        if (!trimmed) continue;

        const existing = await prisma.productSerial.findUnique({
            where: { serialNumber: trimmed },
            include: { product: true }
        });

        const warrantyMonths = input.warrantyMonths !== undefined 
            ? input.warrantyMonths 
            : (existing?.product?.warrantyMonths ?? 12);

        let warrantyEndDate: Date | null = null;
        if (warrantyMonths > 0) {
            warrantyEndDate = new Date(now);
            warrantyEndDate.setMonth(warrantyEndDate.getMonth() + warrantyMonths);
        }

        const res = await prisma.productSerial.update({
            where: { serialNumber: trimmed },
            data: {
                status: 'SOLD',
                salesInvoiceId: input.salesInvoiceId || null,
                customerId: input.customerId,
                warrantyStartDate: now,
                warrantyEndDate,
            }
        });
        updated.push(res);
    }
    return updated;
}

/**
 * Tra cứu toàn diện thông tin bảo hành, tình trạng nghiệp vụ và vòng đời của một số Serial/IMEI
 */
export async function lookupSerialWarranty(serialNumber: string) {
    const cleanSerial = serialNumber.trim();
    const record = await prisma.productSerial.findUnique({
        where: { serialNumber: cleanSerial },
        include: {
            product: {
                select: { id: true, name: true, sku: true, unit: true, warrantyMonths: true }
            },
            customer: {
                select: { id: true, name: true, phone: true, email: true, address: true }
            },
            salesInvoice: {
                select: { id: true, code: true, date: true }
            },
            purchaseBill: {
                select: { id: true, code: true, date: true }
            },
            warehouse: {
                select: { id: true, name: true }
            },
            serviceHistories: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!record) return null;

    const warrantyMonths = record.product?.warrantyMonths ?? 12;
    const isNoWarranty = warrantyMonths === 0;

    const startDate = record.warrantyStartDate || record.salesInvoice?.date || (record.status === 'SOLD' ? record.updatedAt : null);
    const endDate = record.warrantyEndDate;

    const stats = calculateWarrantyRemaining(endDate, warrantyMonths);

    // Phân tích lịch sử vòng đời và tình trạng bảo hành chi tiết
    const analysis = parseFullSerialHistory(record);

    return {
        ...record,
        warrantyMonths,
        isNoWarranty: stats.isNoWarranty,
        warrantyStartDate: startDate ? startDate.toISOString() : null,
        warrantyEndDate: endDate ? endDate.toISOString() : null,
        isWarrantyValid: stats.isValid,
        isExpired: stats.isExpired,
        daysRemaining: stats.daysRemaining,
        daysExpired: stats.daysExpired,
        warrantyDetailText: stats.detailText,
        warrantyBreakdownText: stats.breakdownText,
        warrantyBadgeText: stats.badgeText,
        // Dữ liệu mở rộng theo yêu cầu
        warrantyCount: analysis.warrantyCount,
        currentServiceState: analysis.currentServiceState,
        serviceStateLabel: analysis.serviceStateLabel,
        serviceBadgeClass: analysis.serviceBadgeClass,
        lastReceivedDate: analysis.lastReceivedDate,
        lastReturnDate: analysis.lastReturnDate,
        latestAccessories: analysis.latestAccessories,
        latestAppearance: analysis.latestAppearance,
        latestDefectReason: analysis.latestDefectReason,
        latestRepairResult: analysis.latestRepairResult,
        latestStaffNotes: analysis.latestStaffNotes,
        replacementInfo: analysis.replacementInfo,
        historyItems: analysis.historyItems
    };
}
