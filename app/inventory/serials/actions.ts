'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { lookupSerialWarranty } from '@/lib/inventory-serial';
import { sendEmailWithTracking } from '@/lib/mailer';
import { getCompanyInfo } from '@/lib/companyInfo';
import { calculateWarrantyRemaining } from '@/lib/warranty';

export async function fetchSerials(params?: { 
    search?: string; 
    status?: string; 
    productId?: string; 
    warehouseId?: string;
    warrantyFilter?: string;
    page?: number;
    pageSize?: number | string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}) {
    try {
        const now = new Date();
        const where: any = {};

        // Trạng thái Serial
        if (params?.status && params.status !== 'ALL') {
            if (params.status === 'EXPIRING_SOON') {
                const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                where.status = 'SOLD';
                where.warrantyEndDate = { gte: now, lte: in30Days };
            } else if (params.status === 'EXPIRED') {
                where.status = 'SOLD';
                where.warrantyEndDate = { lt: now };
            } else if (params.status === 'UNDER_WARRANTY') {
                where.status = { in: ['UNDER_WARRANTY', 'WARRANTY_RETURN'] };
            } else {
                where.status = params.status;
            }
        }

        // Lọc bảo hành riêng nếu có
        if (params?.warrantyFilter && params.warrantyFilter !== 'ALL') {
            if (params.warrantyFilter === 'EXPIRING_7') {
                const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                where.status = 'SOLD';
                where.warrantyEndDate = { gte: now, lte: in7Days };
            } else if (params.warrantyFilter === 'EXPIRING_15') {
                const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
                where.status = 'SOLD';
                where.warrantyEndDate = { gte: now, lte: in15Days };
            } else if (params.warrantyFilter === 'EXPIRING_30') {
                const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                where.status = 'SOLD';
                where.warrantyEndDate = { gte: now, lte: in30Days };
            } else if (params.warrantyFilter === 'EXPIRED') {
                where.status = 'SOLD';
                where.warrantyEndDate = { lt: now };
            } else if (params.warrantyFilter === 'VALID') {
                where.status = 'SOLD';
                where.warrantyEndDate = { gte: now };
            }
        }

        if (params?.productId) {
            where.productId = params.productId;
        }
        if (params?.warehouseId) {
            where.warehouseId = params.warehouseId;
        }
        if (params?.search) {
            const searchKeyword = params.search.trim();
            where.OR = [
                { serialNumber: { contains: searchKeyword } },
                { notes: { contains: searchKeyword } },
                { product: { name: { contains: searchKeyword } } },
                { product: { sku: { contains: searchKeyword } } },
                { customer: { name: { contains: searchKeyword } } },
                { customer: { phone: { contains: searchKeyword } } },
                { customer: { email: { contains: searchKeyword } } },
                { salesInvoice: { code: { contains: searchKeyword } } },
                { purchaseBill: { code: { contains: searchKeyword } } },
            ];
        }

        // Dynamic Sorting
        const sortBy = params?.sortBy || 'createdAt';
        const sortOrder = params?.sortOrder === 'asc' ? 'asc' : 'desc';
        let orderBy: any = { createdAt: 'desc' };

        if (sortBy === 'serialNumber') {
            orderBy = { serialNumber: sortOrder };
        } else if (sortBy === 'product') {
            orderBy = { product: { name: sortOrder } };
        } else if (sortBy === 'warehouse') {
            orderBy = { warehouse: { name: sortOrder } };
        } else if (sortBy === 'status') {
            orderBy = { status: sortOrder };
        } else if (sortBy === 'customer') {
            orderBy = { customer: { name: sortOrder } };
        } else if (sortBy === 'warrantyEndDate') {
            orderBy = { warrantyEndDate: sortOrder };
        } else if (sortBy === 'createdAt') {
            orderBy = { createdAt: sortOrder };
        }

        // Pagination parameters
        const requestedPageSize = params?.pageSize ?? 20;
        const isAll = requestedPageSize === 'ALL' || requestedPageSize === 'all' || requestedPageSize === -1 || requestedPageSize === '-1';
        const pageSize = isAll ? 2000 : Math.max(1, Number(requestedPageSize) || 20);
        const page = isAll ? 1 : Math.max(1, Number(params?.page) || 1);
        const skip = isAll ? 0 : (page - 1) * pageSize;

        const in30DaysGlobal = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [
            serials, 
            filteredCount, 
            products, 
            customers, 
            warehouses, 
            totalCount, 
            inStockCount, 
            soldCount,
            underWarrantyCount,
            defectiveCount,
            expiringSoonCount
        ] = await Promise.all([
            prisma.productSerial.findMany({
                where,
                include: {
                    product: { select: { id: true, name: true, sku: true, unit: true, warrantyMonths: true } },
                    customer: { select: { id: true, name: true, phone: true, email: true } },
                    salesInvoice: { select: { id: true, code: true } },
                    purchaseBill: { select: { id: true, code: true } },
                    warehouse: { select: { id: true, name: true } },
                },
                orderBy,
                skip,
                take: pageSize,
            }),
            prisma.productSerial.count({ where }),
            prisma.product.findMany({
                where: { isActive: true },
                select: { id: true, name: true, sku: true, unit: true, warrantyMonths: true },
                orderBy: { name: 'asc' }
            }),
            prisma.customer.findMany({
                select: { id: true, name: true, phone: true, email: true },
                orderBy: { name: 'asc' },
                take: 500,
            }),
            prisma.warehouse.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            }),
            prisma.productSerial.count(),
            prisma.productSerial.count({ where: { status: 'IN_STOCK' } }),
            prisma.productSerial.count({ where: { status: 'SOLD' } }),
            prisma.productSerial.count({ where: { status: { in: ['UNDER_WARRANTY', 'WARRANTY_RETURN'] } } }),
            prisma.productSerial.count({ where: { status: 'DEFECTIVE' } }),
            prisma.productSerial.count({ 
                where: { 
                    status: 'SOLD', 
                    warrantyEndDate: { gte: now, lte: in30DaysGlobal } 
                } 
            })
        ]);

        const totalPages = isAll ? 1 : Math.max(1, Math.ceil(filteredCount / pageSize));

        return { 
            success: true, 
            serials, 
            products, 
            customers, 
            warehouses,
            pagination: {
                page,
                pageSize: isAll ? 'ALL' : pageSize,
                total: filteredCount,
                totalPages,
            },
            stats: {
                total: totalCount,
                inStock: inStockCount,
                sold: soldCount,
                underWarranty: underWarrantyCount,
                defective: defectiveCount,
                expiringSoon: expiringSoonCount,
                other: totalCount - inStockCount - soldCount
            }
        };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function createSerialRecord(data: { productId: string; serialNumber: string; warehouseId?: string; notes?: string }) {
    try {
        const trimmedSerial = data.serialNumber.trim();
        if (!trimmedSerial) {
            return { success: false, error: 'Số Serial/IMEI không được để trống' };
        }

        const existing = await prisma.productSerial.findUnique({
            where: { serialNumber: trimmedSerial }
        });
        if (existing) {
            return { success: false, error: `Số Serial/IMEI "${trimmedSerial}" này đã tồn tại trong hệ thống` };
        }

        const newSerial = await prisma.productSerial.create({
            data: {
                productId: data.productId,
                serialNumber: trimmedSerial,
                warehouseId: data.warehouseId || null,
                status: 'IN_STOCK',
                notes: data.notes || null
            }
        });
        return { success: true, serial: newSerial };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function bulkCreateSerials(data: {
    productId: string;
    serialNumbers: string[];
    warehouseId?: string;
    notes?: string;
}) {
    try {
        const cleanSerials = Array.from(new Set(data.serialNumbers.map((s: string) => s.trim()).filter(Boolean)));
        if (cleanSerials.length === 0) {
            return { success: false, error: 'Danh sách số Serial/IMEI trống.' };
        }

        const existing = await prisma.productSerial.findMany({
            where: { serialNumber: { in: cleanSerials } },
            select: { serialNumber: true }
        });

        if (existing.length > 0) {
            const sample = existing.slice(0, 3).map((e: any) => e.serialNumber).join(', ');
            const more = existing.length > 3 ? ` và ${existing.length - 3} mã khác` : '';
            return {
                success: false,
                error: `Phát hiện ${existing.length} số Serial đã tồn tại trong kho: ${sample}${more}. Vui lòng lọc bỏ các mã này trước khi nhập.`
            };
        }

        const created = await prisma.productSerial.createMany({
            data: cleanSerials.map((serial: string) => ({
                productId: data.productId,
                serialNumber: serial,
                warehouseId: data.warehouseId || null,
                status: 'IN_STOCK',
                notes: data.notes || null,
            }))
        });

        return { success: true, count: created.count };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function dispatchSerialsAction(data: {
    serialNumbers: string[];
    customerId: string;
    warrantyMonths?: number;
    notes?: string;
}) {
    try {
        const cleanSerials = data.serialNumbers.map((s: string) => s.trim()).filter(Boolean);
        if (cleanSerials.length === 0) {
            return { success: false, error: 'Chưa chọn số Serial nào để xuất bán.' };
        }

        const now = new Date();
        const warrantyMonths = data.warrantyMonths !== undefined ? data.warrantyMonths : 12;
        let warrantyEndDate: Date | null = null;
        if (warrantyMonths > 0) {
            warrantyEndDate = new Date(now);
            warrantyEndDate.setMonth(warrantyEndDate.getMonth() + warrantyMonths);
        }

        await prisma.productSerial.updateMany({
            where: { serialNumber: { in: cleanSerials } },
            data: {
                status: 'SOLD',
                customerId: data.customerId,
                warrantyStartDate: now,
                warrantyEndDate,
                notes: data.notes || undefined,
            }
        });

        return { success: true, count: cleanSerials.length };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function updateSerialRecord(data: {
    id: string;
    productId: string;
    serialNumber: string;
    warehouseId?: string | null;
    status?: string;
    notes?: string | null;
}) {
    try {
        const trimmedSerial = data.serialNumber.trim();
        if (!trimmedSerial) {
            return { success: false, error: 'Số Serial/IMEI không được để trống' };
        }
        if (!data.productId) {
            return { success: false, error: 'Vui lòng chọn sản phẩm' };
        }

        // Kiểm tra xem số Serial có bị trùng với bản ghi khác không
        const existing = await prisma.productSerial.findFirst({
            where: {
                serialNumber: trimmedSerial,
                NOT: { id: data.id }
            }
        });
        if (existing) {
            return { success: false, error: `Số Serial "${trimmedSerial}" đã trùng với một bản ghi khác trong hệ thống!` };
        }

        const updated = await prisma.productSerial.update({
            where: { id: data.id },
            data: {
                productId: data.productId,
                serialNumber: trimmedSerial,
                warehouseId: data.warehouseId || null,
                status: data.status || undefined,
                notes: data.notes || null
            },
            include: {
                product: { select: { id: true, name: true, sku: true, unit: true, warrantyMonths: true } },
                warehouse: { select: { id: true, name: true } },
                customer: { select: { id: true, name: true, phone: true } }
            }
        });

        return { success: true, serial: updated };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function updateSerialStatus(id: string, status: string, notes?: string) {
    try {
        await prisma.productSerial.update({
            where: { id },
            data: {
                status,
                notes: notes !== undefined ? notes : undefined
            }
        });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function deleteSerialRecord(id: string) {
    try {
        await prisma.productSerial.delete({ where: { id } });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function lookupWarranty(serialNumber: string) {
    try {
        const info = await lookupSerialWarranty(serialNumber.trim());
        if (!info) {
            return { success: false, error: 'Không tìm thấy số Serial/IMEI này trong hệ thống kho' };
        }
        return { 
            success: true, 
            data: {
                id: info.id,
                serialNumber: info.serialNumber,
                productId: info.product?.id,
                productName: info.product?.name,
                sku: info.product?.sku,
                unit: info.product?.unit,
                status: info.status,
                warehouseId: info.warehouse?.id,
                warehouseName: info.warehouse?.name,
                warrantyMonths: info.warrantyMonths,
                isNoWarranty: info.isNoWarranty,
                warrantyStartDate: info.warrantyStartDate,
                warrantyEndDate: info.warrantyEndDate,
                remainingDays: info.daysRemaining,
                expiredDays: info.daysExpired,
                isWarrantyValid: info.isWarrantyValid,
                isExpired: info.isExpired,
                warrantyDetailText: info.warrantyDetailText,
                warrantyBreakdownText: info.warrantyBreakdownText,
                warrantyBadgeText: info.warrantyBadgeText,
                customerId: info.customer?.id,
                customerName: info.customer?.name,
                customerPhone: info.customer?.phone,
                customerEmail: info.customer?.email,
                salesInvoiceId: info.salesInvoice?.id,
                salesInvoiceCode: info.salesInvoice?.code,
                salesInvoiceDate: info.salesInvoice?.date,
                purchaseBillId: info.purchaseBill?.id,
                purchaseBillCode: info.purchaseBill?.code,
                notes: info.notes
            } 
        };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function getAvailableSerialsForProduct(productId: string, warehouseId?: string) {
    try {
        const where: any = {
            productId,
            status: 'IN_STOCK'
        };
        if (warehouseId) {
            where.warehouseId = warehouseId;
        }
        const serials = await prisma.productSerial.findMany({
            where,
            select: { 
                id: true, 
                serialNumber: true, 
                warehouse: { select: { id: true, name: true } }, 
                notes: true 
            },
            orderBy: { createdAt: 'asc' }
        });
        return { success: true, serials };
    } catch (err: any) {
        return { success: false, error: err.message, serials: [] };
    }
}


export async function getInventorySerialDiscrepancies() {
    try {
        const productsWithSerials = await prisma.product.findMany({
            where: {
                type: 'PRODUCT',
                serials: { some: {} }
            },
            include: {
                inventories: {
                    include: { warehouse: true }
                },
                serials: true
            }
        });

        const discrepancies: any[] = [];

        for (const p of productsWithSerials) {
            const inStockSerials = p.serials.filter(s => s.status === 'IN_STOCK');
            const soldSerials = p.serials.filter(s => s.status === 'SOLD');
            const totalInventoryQty = p.inventories.reduce((acc: number, i: any) => acc + i.quantity, 0);
            const serialCount = inStockSerials.length;
            const diff = totalInventoryQty - serialCount;

            if (diff !== 0) {
                const primaryWarehouse = p.inventories[0]?.warehouse || null;
                discrepancies.push({
                    productId: p.id,
                    productName: p.name,
                    sku: p.sku || 'N/A',
                    warehouseId: p.inventories[0]?.warehouseId || null,
                    warehouseName: primaryWarehouse?.name || 'Tổng kho',
                    inventoryQty: totalInventoryQty,
                    serialQty: serialCount,
                    soldSerialQty: soldSerials.length,
                    totalSerialsCount: p.serials.length,
                    diff: diff,
                    type: diff > 0 ? 'MISSING_SERIALS' : 'EXTRA_SERIALS',
                    message: diff > 0 
                        ? `Tồn kho hệ thống (${totalInventoryQty}) nhiều hơn số Serial trong kho (${serialCount}) - Thiếu ${diff} mã Serial.`
                        : `Số Serial trong kho (${serialCount}) nhiều hơn Tồn kho hệ thống (${totalInventoryQty}) - Thừa ${Math.abs(diff)} mã Serial.`
                });
            }
        }

        return { success: true, count: discrepancies.length, discrepancies };
    } catch (err: any) {
        console.error("Lỗi getInventorySerialDiscrepancies:", err);
        return { success: false, error: err.message, count: 0, discrepancies: [] };
    }
}

export async function reconcileInventoryToSerials(productId: string, warehouseId?: string, notes?: string) {
    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                serials: { where: { status: 'IN_STOCK' } },
                inventories: true
            }
        });

        if (!product) return { success: false, error: "Không tìm thấy sản phẩm" };

        let targetWarehouseId = warehouseId;
        if (!targetWarehouseId) {
            const defaultWh = await prisma.warehouse.findFirst({ where: { isDefault: true } }) || await prisma.warehouse.findFirst();
            targetWarehouseId = defaultWh?.id || product.inventories[0]?.warehouseId;
        }

        if (!targetWarehouseId) return { success: false, error: "Không tìm thấy kho hàng để điều chỉnh" };

        const actualInStockSerialCount = product.serials.length;
        const currentInventory = product.inventories.find(i => i.warehouseId === targetWarehouseId);
        const oldQty = currentInventory?.quantity || 0;
        const diff = actualInStockSerialCount - oldQty;

        if (diff === 0) {
            return { success: true, message: "Số lượng tồn kho và serial đã hoàn toàn khớp nhau." };
        }

        if (currentInventory) {
            await prisma.inventory.update({
                where: { id: currentInventory.id },
                data: { quantity: actualInStockSerialCount }
            });
        } else {
            await prisma.inventory.create({
                data: {
                    productId,
                    warehouseId: targetWarehouseId,
                    quantity: actualInStockSerialCount
                }
            });
        }

        const session = await getServerSession(authOptions);
        const currentUserId = (session?.user as any)?.id || (await prisma.user.findFirst())?.id || 'system';

        const adjCode = `TX-ADJ-SERIAL-${Date.now().toString().slice(-6)}`;
        await prisma.inventoryTransaction.create({
            data: {
                code: adjCode,
                type: 'ADJUSTMENT',
                status: 'COMPLETED',
                creatorId: currentUserId,
                date: new Date(),
                fromWarehouseId: targetWarehouseId,
                notes: `Cân bằng tự động Tồn kho WMS theo số lượng Serial thực tế (${oldQty} -> ${actualInStockSerialCount} chiếc). Ghi chú: ${notes || 'Đối soát định danh'}`,
                items: {
                    create: [{
                        productId,
                        quantity: Math.abs(diff),
                        price: product.importPrice || 0
                    }]
                }
            }
        });

        const adminUsers = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'MANAGER'] } },
            take: 5
        });

        for (const admin of adminUsers) {
            await prisma.notification.create({
                data: {
                    userId: admin.id,
                    title: `Cân Bằng Tồn Kho Thành Công: ${product.name}`,
                    message: `Quản trị viên đã điều chỉnh Tồn kho hệ thống từ ${oldQty} thành ${actualInStockSerialCount} chiếc để khớp chính xác với ${actualInStockSerialCount} mã Serial còn trong kho.`,
                    type: 'SUCCESS',
                    link: '/inventory/serials'
                }
            });
        }

        revalidatePath('/inventory');
        revalidatePath('/inventory/serials');
        revalidatePath('/dashboard');

        return { 
            success: true, 
            message: `Đã cân bằng số lượng tồn kho thành công! Tồn kho mới: ${actualInStockSerialCount} chiếc (khớp đúng ${actualInStockSerialCount} mã Serial tồn kho).` 
        };
    } catch (err: any) {
        console.error("Lỗi reconcileInventoryToSerials:", err);
        return { success: false, error: err.message };
    }
}

export async function schedulePhysicalInventoryAudit(productId: string, warehouseId?: string, notes?: string) {
    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                serials: { where: { status: 'IN_STOCK' } },
                inventories: true
            }
        });

        if (!product) return { success: false, error: "Không tìm thấy sản phẩm" };

        const totalInv = product.inventories.reduce((acc: number, i: any) => acc + i.quantity, 0);
        const inStockCount = product.serials.length;

        const session = await getServerSession(authOptions);
        const currentUserId = (session?.user as any)?.id || (await prisma.user.findFirst())?.id || 'system';

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 2);

        await prisma.task.create({
            data: {
                creatorId: currentUserId,
                title: `[Kiểm kê kho thực tế] Sản phẩm: ${product.name}`,
                description: `YÊU CẦU KIỂM KHO ĐỐI SOÁT SERIAL:
- Tên sản phẩm: ${product.name} (SKU: ${product.sku || 'N/A'})
- Tồn kho trên phần mềm WMS: ${totalInv} chiếc
- Số Serial thực tế hệ thống ghi nhận: ${inStockCount} mã
- Độ lệch cần xác minh thực tế: ${Math.abs(totalInv - inStockCount)} chiếc
- Yêu cầu: Đếm lại toàn bộ thiết bị vật lý tại kho và đối chiếu từng mã vạch Serial/IMEI.
- Ghi chú từ người quản trị: ${notes || 'Tiến hành đếm thực tế ngay'}`,
                priority: 'HIGH',
                status: 'TODO',
                dueDate: dueDate,
                isPublic: true
            }
        });

        const usersToAlert = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'MANAGER', 'WAREHOUSE'] } },
            take: 10
        });

        for (const u of usersToAlert) {
            await prisma.notification.create({
                data: {
                    userId: u.id,
                    title: `⚠️ Lệnh Kiểm Kho: ${product.name}`,
                    message: `Phát hiện lệch tồn kho (${totalInv} chiếc) so với Serial (${inStockCount} mã). Đã lập phiếu yêu cầu kiểm kê kho thực tế.`,
                    type: 'WARNING',
                    link: '/inventory/serials'
                }
            });
        }

        revalidatePath('/inventory/serials');
        return { 
            success: true, 
            message: `Đã tạo lệnh kiểm kho thực tế và gửi thông báo cảnh báo thành công tới bộ phận quản lý kho!` 
        };
    } catch (err: any) {
        console.error("Lỗi schedulePhysicalInventoryAudit:", err);
        return { success: false, error: err.message };
    }
}

// ==========================================
// 1. TIẾP NHẬN HÀNG LỖI / BẢO HÀNH (RMA)
// ==========================================
export async function receiveDefectiveSerialAction(data: {
    serialId?: string;
    serialNumber?: string;
    actionType: 'UNDER_WARRANTY' | 'DEFECTIVE';
    defectReason: string;
    appearanceCondition?: string;
    accessoriesIncluded?: string;
    receiverNotes?: string;
    warehouseId?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        const currentUserId = (session?.user as any)?.id;
        const currentUserName = (session?.user as any)?.name || 'Kỹ thuật viên';

        const serial = await prisma.productSerial.findFirst({
            where: {
                OR: [
                    ...(data.serialId ? [{ id: data.serialId }] : []),
                    ...(data.serialNumber ? [{ serialNumber: data.serialNumber.trim() }] : [])
                ]
            },
            include: { customer: true, product: true }
        });

        if (!serial) {
            return { success: false, error: 'Không tìm thấy số Serial/IMEI này trong hệ thống' };
        }

        const dateStr = new Date().toLocaleString('vi-VN');
        const actionLabel = data.actionType === 'UNDER_WARRANTY' ? 'TIẾP NHẬN BẢO HÀNH' : 'TIẾP NHẬN HÀNG LỖI';
        const newLog = `[${actionLabel} - ${dateStr}]: Lỗi: ${data.defectReason.trim()}${data.appearanceCondition ? ' | Ngoại quan: ' + data.appearanceCondition.trim() : ''}${data.accessoriesIncluded ? ' | Phụ kiện: ' + data.accessoriesIncluded.trim() : ''} | Tiếp nhận: ${currentUserName}${data.receiverNotes ? ' | Ghi chú: ' + data.receiverNotes.trim() : ''}`;
        
        const updatedNotes = serial.notes ? `${serial.notes}\n${newLog}` : newLog;

        const updated = await prisma.productSerial.update({
            where: { id: serial.id },
            data: {
                status: data.actionType,
                warehouseId: data.warehouseId || serial.warehouseId,
                notes: updatedNotes
            }
        });

        // Ghi nhật ký khách hàng nếu có khách
        if (serial.customerId && currentUserId) {
            try {
                await prisma.customerActivityLog.create({
                    data: {
                        customerId: serial.customerId,
                        userId: currentUserId,
                        action: 'TIẾP_NHẬN_BẢO_HÀNH',
                        details: `Tiếp nhận thiết bị Serial ${serial.serialNumber} (${serial.product.name}). Hiện tượng lỗi: ${data.defectReason}. Trạng thái: ${data.actionType === 'UNDER_WARRANTY' ? 'Đang bảo hành' : 'Lỗi / Hỏng'}.`
                    }
                });
            } catch (e) {
                console.error('Không thể ghi customerActivityLog:', e);
            }
        }

        // Tạo thông báo cho Admin & Quản lý kho
        try {
            const managers = await prisma.user.findMany({
                where: { role: { in: ['ADMIN', 'MANAGER', 'WAREHOUSE'] } },
                take: 5
            });
            for (const m of managers) {
                await prisma.notification.create({
                    data: {
                        userId: m.id,
                        title: `🔧 ${actionLabel}: ${serial.serialNumber}`,
                        message: `${currentUserName} đã tiếp nhận thiết bị ${serial.product.name} (SN: ${serial.serialNumber}) từ khách hàng ${serial.customer?.name || 'Vãng lai'}. Lỗi: ${data.defectReason}`,
                        type: 'WARNING',
                        link: '/inventory/serials'
                    }
                });
            }
        } catch (e) {
            console.error('Lỗi tạo notification tiếp nhận:', e);
        }

        revalidatePath('/inventory/serials');
        return { success: true, message: `Tiếp nhận thành công thiết bị ${serial.serialNumber}!`, serial: updated };
    } catch (err: any) {
        console.error('Lỗi receiveDefectiveSerialAction:', err);
        return { success: false, error: err.message };
    }
}

// ==========================================
// 2. ĐỔI MỚI THIẾT BỊ 1-1 / THAY THẾ SERIAL
// ==========================================
export async function swapAndReplaceSerialAction(data: {
    oldSerialId: string;
    newSerialId: string;
    warrantyPolicy: 'INHERIT' | 'RENEW_FULL' | 'CUSTOM';
    customWarrantyMonths?: number;
    reason: string;
    oldSerialStatus?: string;
    warehouseIdForOld?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        const currentUserId = (session?.user as any)?.id;
        const currentUserName = (session?.user as any)?.name || 'Quản trị viên';

        // Lấy thông tin serial cũ
        const oldSerial = await prisma.productSerial.findUnique({
            where: { id: data.oldSerialId },
            include: { customer: true, product: true, salesInvoice: true }
        });
        if (!oldSerial) {
            return { success: false, error: 'Không tìm thấy thiết bị cũ cần thu hồi đổi mới' };
        }

        // Lấy thông tin serial mới
        const newSerial = await prisma.productSerial.findUnique({
            where: { id: data.newSerialId },
            include: { product: true }
        });
        if (!newSerial) {
            return { success: false, error: 'Không tìm thấy thiết bị mới để thay thế' };
        }
        if (newSerial.status !== 'IN_STOCK') {
            return { success: false, error: `Số Serial mới "${newSerial.serialNumber}" không ở trạng thái tồn kho (hiện tại: ${newSerial.status})!` };
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('vi-VN');

        // Tính toán hạn bảo hành cho thiết bị mới
        let newStartDate: Date = now;
        let newEndDate: Date | null = null;

        if (data.warrantyPolicy === 'INHERIT') {
            newStartDate = oldSerial.warrantyStartDate || now;
            newEndDate = oldSerial.warrantyEndDate;
        } else if (data.warrantyPolicy === 'RENEW_FULL') {
            const months = newSerial.product.warrantyMonths ?? oldSerial.product.warrantyMonths ?? 12;
            if (months > 0) {
                newEndDate = new Date(now);
                newEndDate.setMonth(newEndDate.getMonth() + months);
            }
        } else if (data.warrantyPolicy === 'CUSTOM') {
            const months = Number(data.customWarrantyMonths) || 12;
            if (months > 0) {
                newEndDate = new Date(now);
                newEndDate.setMonth(newEndDate.getMonth() + months);
            }
        }

        const oldSerialStatus = data.oldSerialStatus || 'DEFECTIVE';
        const oldLog = `[ĐỔI MỚI 1-1 THU HỒI - ${dateStr}]: Đã thu hồi đổi sang Serial mới: [${newSerial.serialNumber}]. Lý do: ${data.reason.trim()}. Người xử lý: ${currentUserName}`;
        const newLog = `[MÁY ĐỔI MỚI THAY THẾ - ${dateStr}]: Thiết bị thay thế đổi mới 1-1 cho Serial cũ: [${oldSerial.serialNumber}]. Khách hàng: ${oldSerial.customer?.name || 'N/A'}. Lý do: ${data.reason.trim()}. Chính sách BH: ${data.warrantyPolicy === 'INHERIT' ? 'Kế thừa hạn cũ' : 'Cấp mới'}. Người xử lý: ${currentUserName}`;

        // Chạy Transaction đảm bảo cả 2 cùng thành công
        const [updatedOld, updatedNew] = await prisma.$transaction([
            // 1. Cập nhật serial cũ thành DEFECTIVE / Thu hồi
            prisma.productSerial.update({
                where: { id: oldSerial.id },
                data: {
                    status: oldSerialStatus,
                    warehouseId: data.warehouseIdForOld || oldSerial.warehouseId,
                    notes: oldSerial.notes ? `${oldSerial.notes}\n${oldLog}` : oldLog
                }
            }),
            // 2. Cập nhật serial mới thành SOLD gán cho khách
            prisma.productSerial.update({
                where: { id: newSerial.id },
                data: {
                    status: 'SOLD',
                    customerId: oldSerial.customerId,
                    salesInvoiceId: oldSerial.salesInvoiceId,
                    warrantyStartDate: newStartDate,
                    warrantyEndDate: newEndDate,
                    notes: newSerial.notes ? `${newSerial.notes}\n${newLog}` : newLog
                }
            })
        ]);

        // Ghi nhật ký khách hàng
        if (oldSerial.customerId && currentUserId) {
            try {
                await prisma.customerActivityLog.create({
                    data: {
                        customerId: oldSerial.customerId,
                        userId: currentUserId,
                        action: 'ĐỔI_MỚI_THIẾT_BỊ',
                        details: `Đổi mới thiết bị 1-1: Thu hồi SN ${oldSerial.serialNumber} -> Cấp thiết bị mới SN ${newSerial.serialNumber} (${newSerial.product.name}). Lý do: ${data.reason}. Hạn bảo hành mới: ${newEndDate ? newEndDate.toLocaleDateString('vi-VN') : 'Không'}.`
                    }
                });
            } catch (e) {
                console.error('Lỗi customerActivityLog:', e);
            }
        }

        // Tạo thông báo
        try {
            const managers = await prisma.user.findMany({
                where: { role: { in: ['ADMIN', 'MANAGER', 'WAREHOUSE'] } },
                take: 5
            });
            for (const m of managers) {
                await prisma.notification.create({
                    data: {
                        userId: m.id,
                        title: `🔄 Đổi Mới Thiết Bị 1-1: ${newSerial.serialNumber}`,
                        message: `Đã đổi mới thành công cho khách ${oldSerial.customer?.name || 'Khách hàng'}: Thu hồi SN cũ ${oldSerial.serialNumber} -> Cấp mới SN ${newSerial.serialNumber}.`,
                        type: 'SUCCESS',
                        link: '/inventory/serials'
                    }
                });
            }
        } catch (e) {
            console.error('Lỗi notification đổi mới:', e);
        }

        revalidatePath('/inventory/serials');
        return { 
            success: true, 
            message: `Đã hoàn tất đổi mới thiết bị 1-1: Thu hồi ${oldSerial.serialNumber} -> Cấp mới ${newSerial.serialNumber}!`,
            oldSerial: updatedOld,
            newSerial: updatedNew
        };
    } catch (err: any) {
        console.error('Lỗi swapAndReplaceSerialAction:', err);
        return { success: false, error: err.message };
    }
}

// ==========================================
// 3. HOÀN TẤT SỬA CHỮA BẢO HÀNH & TRẢ KHÁCH
// ==========================================
export async function completeWarrantyRepairAction(data: {
    serialId: string;
    repairResult: string;
    notes?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        const currentUserId = (session?.user as any)?.id;
        const currentUserName = (session?.user as any)?.name || 'Kỹ thuật viên';

        const serial = await prisma.productSerial.findUnique({
            where: { id: data.serialId },
            include: { customer: true, product: true }
        });
        if (!serial) return { success: false, error: 'Không tìm thấy Serial' };

        const dateStr = new Date().toLocaleString('vi-VN');
        const log = `[HOÀN TẤT BẢO HÀNH & TRẢ KHÁCH - ${dateStr}]: Kết quả xử lý: ${data.repairResult.trim()} | Kỹ thuật viên: ${currentUserName}${data.notes ? ' | Ghi chú: ' + data.notes.trim() : ''}`;
        const updatedNotes = serial.notes ? `${serial.notes}\n${log}` : log;

        const updated = await prisma.productSerial.update({
            where: { id: serial.id },
            data: {
                status: 'SOLD',
                notes: updatedNotes
            }
        });

        if (serial.customerId && currentUserId) {
            try {
                await prisma.customerActivityLog.create({
                    data: {
                        customerId: serial.customerId,
                        userId: currentUserId,
                        action: 'HOÀN_TẤT_BẢO_HÀNH',
                        details: `Hoàn tất bảo hành và trả thiết bị Serial ${serial.serialNumber} (${serial.product.name}) cho khách hàng. Kết quả: ${data.repairResult}.`
                    }
                });
            } catch (e) {
                console.error('Lỗi customerActivityLog:', e);
            }
        }

        revalidatePath('/inventory/serials');
        return { success: true, message: `Đã hoàn tất bảo hành và cập nhật trả thiết bị ${serial.serialNumber} cho khách hàng!`, serial: updated };
    } catch (err: any) {
        console.error('Lỗi completeWarrantyRepairAction:', err);
        return { success: false, error: err.message };
    }
}

// ==========================================
// 4. THÊM GHI CHÚ CHĂM SÓC KHÁCH HÀNG (CSKH)
// ==========================================
export async function addCustomerCareNoteAction(data: {
    serialId: string;
    noteContent: string;
    careType?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        const currentUserId = (session?.user as any)?.id;
        const currentUserName = (session?.user as any)?.name || 'Nhân viên CSKH';

        const serial = await prisma.productSerial.findUnique({
            where: { id: data.serialId },
            include: { customer: true, product: true }
        });
        if (!serial) return { success: false, error: 'Không tìm thấy Serial' };

        const dateStr = new Date().toLocaleString('vi-VN');
        const typeLabel = data.careType === 'CALL' ? 'GỌI ĐIỆN CSKH' :
                         data.careType === 'SUPPORT' ? 'HỖ TRỢ KỸ THUẬT' :
                         data.careType === 'FEEDBACK' ? 'PHẢN HỒI KHÁCH HÀNG' : 'CHĂM SÓC KHÁCH HÀNG';

        const log = `[${typeLabel} - ${dateStr} - ${currentUserName}]: ${data.noteContent.trim()}`;
        const updatedNotes = serial.notes ? `${serial.notes}\n${log}` : log;

        const updated = await prisma.productSerial.update({
            where: { id: serial.id },
            data: { notes: updatedNotes }
        });

        if (serial.customerId && currentUserId) {
            try {
                await prisma.customerActivityLog.create({
                    data: {
                        customerId: serial.customerId,
                        userId: currentUserId,
                        action: 'CHĂM_SÓC_KHÁCH_HÀNG',
                        details: `Ghi chú CSKH thiết bị SN ${serial.serialNumber}: ${data.noteContent}`
                    }
                });
            } catch (e) {
                console.error('Lỗi customerActivityLog:', e);
            }
        }

        revalidatePath('/inventory/serials');
        return { success: true, message: 'Đã lưu ghi chú chăm sóc khách hàng!', serial: updated };
    } catch (err: any) {
        console.error('Lỗi addCustomerCareNoteAction:', err);
        return { success: false, error: err.message };
    }
}

// ==========================================
// 5. CẤU HÌNH CẢNH BÁO BẢO HÀNH (AUTO & TEMPLATES)
// ==========================================
export async function getWarrantyAlertSettings() {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: {
                key: {
                    in: [
                        'WARRANTY_ALERT_AUTO_ENABLED',
                        'WARRANTY_ALERT_DAYS_BEFORE',
                        'WARRANTY_ALERT_DEFAULT_TEMPLATE_ID',
                        'WARRANTY_ALERT_CUSTOM_SUBJECT',
                        'WARRANTY_ALERT_CUSTOM_BODY',
                    ]
                }
            }
        });

        const map: Record<string, string> = {};
        settings.forEach(s => map[s.key] = s.value);

        const emailTemplates = await prisma.emailTemplate.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, subject: true, body: true, module: true }
        });

        return {
            success: true,
            settings: {
                autoEnabled: map['WARRANTY_ALERT_AUTO_ENABLED'] === 'true',
                daysBefore: parseInt(map['WARRANTY_ALERT_DAYS_BEFORE'] || '30', 10),
                templateId: map['WARRANTY_ALERT_DEFAULT_TEMPLATE_ID'] || '',
                customSubject: map['WARRANTY_ALERT_CUSTOM_SUBJECT'] || 'Cảnh báo sắp hết hạn bảo hành thiết bị {product_name} - Serial {serial_number}',
                customBody: map['WARRANTY_ALERT_CUSTOM_BODY'] || '',
            },
            emailTemplates
        };
    } catch (err: any) {
        console.error('Lỗi getWarrantyAlertSettings:', err);
        return { success: false, error: err.message, settings: { autoEnabled: false, daysBefore: 30, templateId: '', customSubject: '', customBody: '' }, emailTemplates: [] };
    }
}

export async function saveWarrantyAlertSettings(data: {
    autoEnabled: boolean;
    daysBefore: number;
    templateId?: string;
    customSubject?: string;
    customBody?: string;
}) {
    try {
        const entries = [
            { key: 'WARRANTY_ALERT_AUTO_ENABLED', value: data.autoEnabled ? 'true' : 'false' },
            { key: 'WARRANTY_ALERT_DAYS_BEFORE', value: String(data.daysBefore || 30) },
            { key: 'WARRANTY_ALERT_DEFAULT_TEMPLATE_ID', value: data.templateId || '' },
            { key: 'WARRANTY_ALERT_CUSTOM_SUBJECT', value: data.customSubject || '' },
            { key: 'WARRANTY_ALERT_CUSTOM_BODY', value: data.customBody || '' },
        ];

        for (const entry of entries) {
            await prisma.systemSetting.upsert({
                where: { key: entry.key },
                update: { value: entry.value },
                create: { key: entry.key, value: entry.value, description: 'Cấu hình cảnh báo hết hạn bảo hành' }
            });
        }

        revalidatePath('/inventory/serials');
        return { success: true, message: 'Đã lưu cấu hình cảnh báo bảo hành thành công!' };
    } catch (err: any) {
        console.error('Lỗi saveWarrantyAlertSettings:', err);
        return { success: false, error: err.message };
    }
}

// ==========================================
// 6. LẤY DANH SÁCH THIẾT BỊ SẮP HẾT HẠN BẢO HÀNH
// ==========================================
export async function getExpiringWarrantiesAction(filterDays?: number | 'EXPIRED' | 'ALL') {
    try {
        const now = new Date();
        const days = filterDays === 'EXPIRED' ? -1 : (typeof filterDays === 'number' ? filterDays : 30);
        
        const where: any = {
            status: 'SOLD',
            warrantyEndDate: { not: null }
        };

        if (days === -1) {
            where.warrantyEndDate = { lt: now };
        } else if (days > 0) {
            const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
            where.warrantyEndDate = { gte: now, lte: futureDate };
        }

        const serials = await prisma.productSerial.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, sku: true, unit: true, warrantyMonths: true } },
                customer: { select: { id: true, name: true, phone: true, email: true } },
                salesInvoice: { select: { id: true, code: true, date: true } },
            },
            orderBy: { warrantyEndDate: 'asc' },
            take: 300,
        });

        const formatted = serials.map(s => {
            const wStat = calculateWarrantyRemaining(s.warrantyEndDate, s.product?.warrantyMonths ?? 12);
            const notes = s.notes || '';
            const lastAlertMatch = notes.match(/\[ĐÃ GỬI EMAIL CẢNH BÁO BH - ([^\]]+)\]/g);
            const lastAlert = lastAlertMatch ? lastAlertMatch[lastAlertMatch.length - 1] : null;

            return {
                id: s.id,
                serialNumber: s.serialNumber,
                productName: s.product?.name || 'Sản phẩm',
                sku: s.product?.sku || 'N/A',
                customerName: s.customer?.name || 'Chưa có thông tin',
                customerPhone: s.customer?.phone || 'N/A',
                customerEmail: s.customer?.email || null,
                invoiceCode: s.salesInvoice?.code || null,
                warrantyStartDate: s.warrantyStartDate,
                warrantyEndDate: s.warrantyEndDate,
                daysRemaining: wStat.daysRemaining,
                isExpired: wStat.isExpired,
                badgeText: wStat.badgeText,
                lastAlert,
                hasEmail: Boolean(s.customer?.email)
            };
        });

        return { success: true, serials: formatted };
    } catch (err: any) {
        console.error('Lỗi getExpiringWarrantiesAction:', err);
        return { success: false, error: err.message, serials: [] };
    }
}

// ==========================================
// 7. GỬI EMAIL CẢNH BÁO HẾT HẠN BẢO HÀNH
// ==========================================
export async function sendWarrantyAlertEmailAction(data: {
    serialIds: string[];
    templateId?: string;
    customSubject?: string;
    customBody?: string;
}) {
    try {
        if (!data.serialIds || data.serialIds.length === 0) {
            return { success: false, error: 'Chưa chọn thiết bị nào để gửi email cảnh báo' };
        }

        const session = await getServerSession(authOptions);
        const currentUserId = (session?.user as any)?.id;
        const company = await getCompanyInfo();

        const serials = await prisma.productSerial.findMany({
            where: { id: { in: data.serialIds } },
            include: {
                product: true,
                customer: true,
                salesInvoice: true
            }
        });

        let templateBody = data.customBody || '';
        let templateSubject = data.customSubject || '';

        if (data.templateId) {
            const dbTemplate = await prisma.emailTemplate.findUnique({ where: { id: data.templateId } });
            if (dbTemplate) {
                templateBody = dbTemplate.body;
                templateSubject = dbTemplate.subject;
            }
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inside.tsol.vn';

        let sentCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (const s of serials) {
            if (!s.customer?.email) {
                failedCount++;
                errors.push(`Serial ${s.serialNumber}: Khách hàng "${s.customer?.name || 'Vãng lai'}" chưa có địa chỉ Email.`);
                continue;
            }

            const wStat = calculateWarrantyRemaining(s.warrantyEndDate, s.product?.warrantyMonths ?? 12);
            const lookupUrl = `${appUrl}/warranty?sn=${encodeURIComponent(s.serialNumber)}`;
            const dateStr = s.warrantyEndDate ? new Date(s.warrantyEndDate).toLocaleDateString('vi-VN') : 'N/A';
            const daysText = wStat.isExpired ? `Đã hết hạn ${wStat.daysExpired} ngày trước` : `Còn lại ${wStat.daysRemaining} ngày`;

            let subject = templateSubject || `[CẢNH BÁO BẢO HÀNH] Thiết bị ${s.product.name} (SN: ${s.serialNumber}) sắp hết hạn`;
            subject = subject
                .replace(/{customer_name}/g, s.customer.name || '')
                .replace(/{product_name}/g, s.product.name)
                .replace(/{serial_number}/g, s.serialNumber)
                .replace(/{warranty_end_date}/g, dateStr)
                .replace(/{days_remaining}/g, String(wStat.daysRemaining));

            let htmlContent = '';
            if (templateBody && templateBody.trim().length > 0) {
                htmlContent = templateBody
                    .replace(/{customer_name}/g, s.customer.name || '')
                    .replace(/{product_name}/g, s.product.name)
                    .replace(/{serial_number}/g, s.serialNumber)
                    .replace(/{warranty_end_date}/g, dateStr)
                    .replace(/{days_remaining}/g, String(wStat.daysRemaining))
                    .replace(/{company_name}/g, company.fullName || company.displayName)
                    .replace(/{company_phone}/g, company.phone)
                    .replace(/{company_email}/g, company.email)
                    .replace(/{company_address}/g, company.address)
                    .replace(/{lookup_url}/g, lookupUrl);
            } else {
                // Mẫu HTML mặc định chuẩn cao cấp
                htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 24px 30px;">
                        <h2 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 0.5px;">${company.fullName || 'THÔNG BÁO BẢO HÀNH CHÍNH HÃNG'}</h2>
                        <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Cảnh Báo & Nhắc Nhở Hạn Bảo Hành Thiết Bị Điện Tử</p>
                    </div>
                    <div style="padding: 30px; color: #334155; line-height: 1.6; font-size: 14px;">
                        <p>Kính gửi Quý khách hàng <strong>${s.customer.name}</strong>,</p>
                        <p>${company.displayName || 'Chúng tôi'} xin gửi lời cảm ơn chân thành đến Quý khách đã luôn tin tưởng và sử dụng sản phẩm, thiết bị do công ty cung cấp.</p>
                        
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
                            <h4 style="margin: 0 0 10px; font-size: 15px; color: #0f172a;">📋 THÔNG TIN THIẾT BỊ SẮP HẾT HẠN:</h4>
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <tr>
                                    <td style="padding: 4px 0; color: #64748b; width: 140px;">Sản phẩm:</td>
                                    <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${s.product.name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 4px 0; color: #64748b;">Số Serial / IMEI:</td>
                                    <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #2563eb;">${s.serialNumber}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 4px 0; color: #64748b;">Hạn bảo hành chót:</td>
                                    <td style="padding: 4px 0; font-weight: bold; color: #dc2626;">${dateStr} (${daysText})</td>
                                </tr>
                                ${s.salesInvoice?.code ? `
                                <tr>
                                    <td style="padding: 4px 0; color: #64748b;">Hóa đơn bán hàng:</td>
                                    <td style="padding: 4px 0; font-weight: 500;">${s.salesInvoice.code}</td>
                                </tr>` : ''}
                            </table>
                        </div>

                        <p>Để đảm bảo thiết bị hoạt động ổn định và liên tục, Quý khách vui lòng kiểm tra thiết bị hoặc liên hệ đội ngũ kỹ thuật của chúng tôi để được hỗ trợ kiểm tra định kỳ trước khi hết hạn, hoặc đăng ký <strong>Gói Gia Hạn Bảo Hành / Bảo Trì Tận Nơi</strong> với nhiều ưu đãi đặc biệt.</p>
                        
                        <div style="text-align: center; margin: 28px 0;">
                            <a href="${lookupUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; box-shadow: 0 2px 6px rgba(37,99,235,0.3);">
                                🔍 Tra Cứu Bảo Hành Trực Tuyến
                            </a>
                        </div>

                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                        <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
                            <strong>TRUNG TÂM BẢO HÀNH & CHĂM SÓC KHÁCH HÀNG:</strong><br />
                            🏢 Địa chỉ: ${company.address}<br />
                            📞 Hotline / Zalo: <strong>${company.phone}</strong><br />
                            ✉️ Email: <a href="mailto:${company.email}" style="color: #2563eb;">${company.email}</a>
                        </div>
                    </div>
                </div>
                `;
            }

            try {
                const res = await sendEmailWithTracking({
                    to: s.customer.email,
                    subject,
                    htmlBody: htmlContent,
                    senderId: currentUserId,
                    customerId: s.customerId || undefined,
                    invoiceId: s.salesInvoiceId || undefined,
                });

                if (res.success) {
                    sentCount++;
                    const alertLog = `[ĐÃ GỬI EMAIL CẢNH BÁO BH - ${new Date().toLocaleString('vi-VN')}]: Gửi tới email ${s.customer.email}`;
                    await prisma.productSerial.update({
                        where: { id: s.id },
                        data: { notes: s.notes ? `${s.notes}\n${alertLog}` : alertLog }
                    });

                    if (s.customerId && currentUserId) {
                        try {
                            await prisma.customerActivityLog.create({
                                data: {
                                    customerId: s.customerId,
                                    userId: currentUserId,
                                    action: 'GỬI_EMAIL_CẢNH_BÁO_BH',
                                    details: `Đã gửi email cảnh báo bảo hành thiết bị SN ${s.serialNumber} tới email: ${s.customer.email}`
                                }
                            });
                        } catch (e) {
                            console.error('Lỗi customerActivityLog:', e);
                        }
                    }
                } else {
                    failedCount++;
                    errors.push(`Serial ${s.serialNumber}: ${res.error || 'Lỗi gửi SMTP'}`);
                }
            } catch (err: any) {
                failedCount++;
                errors.push(`Serial ${s.serialNumber}: ${err.message}`);
            }
        }

        revalidatePath('/inventory/serials');
        return {
            success: true,
            sentCount,
            failedCount,
            errors,
            message: `Hoàn tất: Đã gửi thành công ${sentCount} email cảnh báo${failedCount > 0 ? ` (${failedCount} thất bại/không có email)` : ''}.`
        };
    } catch (err: any) {
        console.error('Lỗi sendWarrantyAlertEmailAction:', err);
        return { success: false, error: err.message };
    }
}

// ==========================================
// 8. TỰ ĐỘNG QUÉT VÀ GỬI CẢNH BÁO
// ==========================================
export async function triggerAutoWarrantyScanAction() {
    try {
        const settingsRes = await getWarrantyAlertSettings();
        if (!settingsRes.success || !settingsRes.settings.autoEnabled) {
            return { success: false, error: 'Tính năng tự động gửi cảnh báo bảo hành hiện đang TẮT trong cài đặt.' };
        }

        const daysBefore = settingsRes.settings.daysBefore || 30;
        const now = new Date();
        const futureDate = new Date(now.getTime() + daysBefore * 24 * 60 * 60 * 1000);

        // Lấy tất cả serials sắp hết hạn
        const expiringSerials = await prisma.productSerial.findMany({
            where: {
                status: 'SOLD',
                warrantyEndDate: { gte: now, lte: futureDate },
                customer: { email: { not: null } }
            },
            include: { customer: true },
            take: 100
        });

        // Lọc những serial chưa gửi email cảnh báo trong 10 ngày gần đây
        const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
        const serialsToAlert = expiringSerials.filter(s => {
            if (!s.customer?.email) return false;
            // Kiểm tra xem đã có log gửi gần đây chưa
            if (s.notes && s.notes.includes('[ĐÃ GỬI EMAIL CẢNH BÁO BH')) {
                // Để tránh spam, có thể kiểm tra thêm hoặc bỏ qua nếu vừa gửi
                const matches = s.notes.match(/\[ĐÃ GỬI EMAIL CẢNH BÁO BH - ([^\]]+)\]/g);
                if (matches && matches.length > 0) {
                    return false; // Đã gửi trong đợt này
                }
            }
            return true;
        });

        if (serialsToAlert.length === 0) {
            return { success: true, processedCount: 0, sentCount: 0, message: 'Không có thiết bị nào mới cần gửi cảnh báo trong đợt quét này.' };
        }

        const sendRes = await sendWarrantyAlertEmailAction({
            serialIds: serialsToAlert.map(s => s.id),
            templateId: settingsRes.settings.templateId || undefined,
            customSubject: settingsRes.settings.customSubject || undefined,
            customBody: settingsRes.settings.customBody || undefined,
        });

        return {
            success: true,
            processedCount: serialsToAlert.length,
            sentCount: sendRes.sentCount || 0,
            message: `Quét tự động hoàn tất: Đã gửi ${sendRes.sentCount || 0}/${serialsToAlert.length} email cảnh báo.`
        };
    } catch (err: any) {
        console.error('Lỗi triggerAutoWarrantyScanAction:', err);
        return { success: false, error: err.message };
    }
}
