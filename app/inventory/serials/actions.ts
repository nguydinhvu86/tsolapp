'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { lookupSerialWarranty } from '@/lib/inventory-serial';

export async function fetchSerials(params?: { search?: string; status?: string; productId?: string; warehouseId?: string }) {
    try {
        const where: any = {};
        if (params?.status && params.status !== 'ALL') {
            where.status = params.status;
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
                { customer: { name: { contains: searchKeyword } } },
                { customer: { phone: { contains: searchKeyword } } },
            ];
        }

        const [serials, products, customers, warehouses, totalCount, inStockCount, soldCount] = await Promise.all([
            prisma.productSerial.findMany({
                where,
                include: {
                    product: { select: { id: true, name: true, sku: true, unit: true, warrantyMonths: true } },
                    customer: { select: { id: true, name: true, phone: true, email: true } },
                    salesInvoice: { select: { id: true, code: true } },
                    purchaseBill: { select: { id: true, code: true } },
                    warehouse: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 500,
            }),
            prisma.product.findMany({
                where: { isActive: true },
                select: { id: true, name: true, sku: true, unit: true },
                orderBy: { name: 'asc' }
            }),
            prisma.customer.findMany({
                select: { id: true, name: true, phone: true, email: true },
                orderBy: { name: 'asc' },
                take: 300,
            }),
            prisma.warehouse.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            }),
            prisma.productSerial.count(),
            prisma.productSerial.count({ where: { status: 'IN_STOCK' } }),
            prisma.productSerial.count({ where: { status: 'SOLD' } })
        ]);

        return { 
            success: true, 
            serials, 
            products, 
            customers, 
            warehouses,
            stats: {
                total: totalCount,
                inStock: inStockCount,
                sold: soldCount,
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
                serialNumber: info.serialNumber,
                productName: info.product?.name,
                sku: info.product?.sku,
                unit: info.product?.unit,
                status: info.status,
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
                customerName: info.customer?.name,
                customerPhone: info.customer?.phone,
                customerEmail: info.customer?.email,
                salesInvoiceCode: info.salesInvoice?.code,
                salesInvoiceDate: info.salesInvoice?.date,
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
