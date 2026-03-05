'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';
import { sendEmailWithTracking } from '@/lib/mailer';

async function getUser() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        throw new Error('Unauthorized');
    }
    return session.user;
}

// ---------------------------------------------------------------------------
// SUPPLIERS
// ---------------------------------------------------------------------------

export async function getSuppliers() {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    return prisma.supplier.findMany({
        orderBy: { updatedAt: 'desc' }
    });
}

export async function getSupplier(id: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    return prisma.supplier.findUnique({
        where: { id },
        include: {
            products: {
                include: { product: true }
            },
            orders: {
                include: { creator: true },
                orderBy: { date: 'desc' },
                take: 10
            },
            bills: {
                include: { creator: true },
                orderBy: { date: 'desc' },
                take: 10
            },
            payments: {
                include: { creator: true },
                orderBy: { date: 'desc' },
                take: 10
            }
        }
    });
}

export async function createSupplier(data: any) {
    await getUser();

    // Auto-generate code if empty
    let code = data.code;
    if (!code) {
        const count = await prisma.supplier.count();
        code = `NCC-${(count + 1).toString().padStart(4, '0')}`;
    }

    const supplier = await prisma.supplier.create({
        data: {
            name: data.name,
            code,
            contactName: data.contactName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            taxCode: data.taxCode,
            website: data.website,
            businessType: data.businessType,
            bankAccount: data.bankAccount,
            bankName: data.bankName,
            notes: data.notes
        }
    });

    revalidatePath('/suppliers');
    return supplier;
}

export async function updateSupplier(id: string, data: any) {
    await getUser();

    const supplier = await prisma.supplier.update({
        where: { id },
        data: {
            name: data.name,
            code: data.code,
            contactName: data.contactName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            taxCode: data.taxCode,
            website: data.website,
            businessType: data.businessType,
            bankAccount: data.bankAccount,
            bankName: data.bankName,
            notes: data.notes
        }
    });

    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${id}`);
    return supplier;
}

export async function deleteSupplier(id: string) {
    await getUser();
    await prisma.supplier.delete({ where: { id } });
    revalidatePath('/suppliers');
}

// ---------------------------------------------------------------------------
// PURCHASE ORDERS (Đơn Đặt Hàng)
// ---------------------------------------------------------------------------

export async function getPurchaseOrders() {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    return prisma.purchaseOrder.findMany({
        include: {
            supplier: true,
            creator: true,
            items: {
                include: { product: true }
            },
            _count: { select: { items: true } }
        },
        orderBy: { date: 'desc' }
    });
}

export async function getPurchaseOrder(id: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    return prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
            supplier: true,
            creator: true,
            items: {
                include: { product: true }
            },
            bills: true
        }
    });
}

export async function createPurchaseOrder(data: any) {
    const user = await getUser();

    let code = data.code;
    if (!code) {
        const count = await prisma.purchaseOrder.count();
        code = `PO-${(count + 1).toString().padStart(6, '0')}`;
    }

    const order = await prisma.purchaseOrder.create({
        data: {
            code,
            supplierId: data.supplierId,
            date: data.date ? new Date(data.date) : new Date(),
            status: data.status || 'DRAFT',
            notes: data.notes,
            totalAmount: data.totalAmount,
            subTotal: data.subTotal || 0,
            taxAmount: data.taxAmount || 0,
            creatorId: user.id,
            items: {
                create: data.items.map((item: any) => {
                    const lineSubTotal = item.quantity * item.unitPrice;
                    const lineTaxAmount = lineSubTotal * (item.taxRate || 0) / 100;
                    return {
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0,
                        taxAmount: lineTaxAmount,
                        totalPrice: lineSubTotal + lineTaxAmount
                    };
                })
            }
        }
    });

    revalidatePath('/purchasing/orders');
    return order;
}

export async function updatePurchaseOrder(id: string, data: any) {
    await getUser();

    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) throw new Error("Đơn đặt hàng không tồn tại");

    const order = await prisma.purchaseOrder.update({
        where: { id },
        data: {
            supplierId: data.supplierId,
            date: data.date ? new Date(data.date) : new Date(),
            status: data.status || 'DRAFT',
            notes: data.notes,
            totalAmount: data.totalAmount,
            subTotal: data.subTotal || 0,
            taxAmount: data.taxAmount || 0,
            items: {
                deleteMany: {},
                create: data.items.map((item: any) => {
                    const lineSubTotal = item.quantity * item.unitPrice;
                    const lineTaxAmount = lineSubTotal * (item.taxRate || 0) / 100;
                    return {
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0,
                        taxAmount: lineTaxAmount,
                        totalPrice: lineSubTotal + lineTaxAmount
                    };
                })
            }
        }
    });

    revalidatePath('/purchasing/orders');
    revalidatePath(`/purchasing/orders/${id}`);
    return order;
}

export async function deletePurchaseOrder(id: string) {
    await getUser();

    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (existing?.status !== 'DRAFT') throw new Error("Chỉ có thể xóa đơn hàng Nháp");

    await prisma.purchaseOrderItem.deleteMany({ where: { orderId: id } });
    await prisma.purchaseOrder.delete({ where: { id } });

    revalidatePath('/purchasing/orders');
    return true;
}

// ---------------------------------------------------------------------------
// PURCHASE BILLS (Hóa Đơn Mua Hàng)
// ---------------------------------------------------------------------------

export async function getPurchaseBills() {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    return prisma.purchaseBill.findMany({
        include: {
            supplier: true,
            creator: true,
            order: true,
            _count: { select: { items: true } }
        },
        orderBy: { date: 'desc' }
    });
}

export async function getPurchaseBill(id: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    return prisma.purchaseBill.findUnique({
        where: { id },
        include: {
            supplier: true,
            creator: true,
            order: true,
            items: {
                include: { product: true }
            },
            allocations: {
                include: { payment: true }
            }
        }
    });
}

export async function createPurchaseBill(data: any) {
    const user = await getUser();

    let code = data.code;
    if (!code) {
        const count = await prisma.purchaseBill.count();
        code = `PB-${(count + 1).toString().padStart(6, '0')}`;
    }

    const bill = await prisma.purchaseBill.create({
        data: {
            code,
            supplierInvoice: data.supplierInvoice,
            supplierId: data.supplierId,
            orderId: data.orderId || null,
            date: data.date ? new Date(data.date) : new Date(),
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            status: 'DRAFT',
            notes: data.notes,
            tags: data.tags || null,
            attachment: data.attachment || null,
            totalAmount: data.totalAmount,
            subTotal: data.subTotal || 0,
            taxAmount: data.taxAmount || 0,
            creatorId: user.id,
            items: {
                create: data.items.map((item: any) => {
                    const lineSubTotal = item.quantity * item.unitPrice;
                    const lineTaxAmount = lineSubTotal * (item.taxRate || 0) / 100;
                    return {
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0,
                        taxAmount: lineTaxAmount,
                        totalPrice: lineSubTotal + lineTaxAmount
                    };
                })
            }
        }
    });

    revalidatePath('/purchasing/bills');
    return bill;
}

export async function approvePurchaseBill(billId: string, toWarehouseId: string) {
    const user = await getUser();

    return prisma.$transaction(async (tx: any) => {
        // 1. Get the bill
        const bill = await tx.purchaseBill.findUnique({
            where: { id: billId },
            include: { items: true, supplier: true }
        });

        if (!bill) throw new Error("Không tìm thấy hóa đơn này");
        if (bill.status !== 'DRAFT') throw new Error("Hóa đơn đã được duyệt hoặc đang ở trạng thái khác DRAFT");
        if (!toWarehouseId) throw new Error("Vui lòng chọn Kho nhập hàng");

        // 2. Create Inventory Transaction IN
        const invTxCode = `IN-${bill.code}`; // Link codes visually
        await tx.inventoryTransaction.create({
            data: {
                code: invTxCode,
                type: 'IN',
                status: 'COMPLETED',
                date: new Date(),
                notes: `Nhập kho tự động từ Hóa đơn mua hàng ${bill.code}`,
                toWarehouseId: toWarehouseId,
                supplierId: bill.supplierId,
                creatorId: user.id,
                items: {
                    create: bill.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.unitPrice
                    }))
                }
            }
        });

        // 3. Update Inventory Quantities
        for (const item of bill.items) {
            const inventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: toWarehouseId
                    }
                }
            });

            if (inventory) {
                await tx.inventory.update({
                    where: { id: inventory.id },
                    data: { quantity: inventory.quantity + item.quantity }
                });
            } else {
                await tx.inventory.create({
                    data: {
                        productId: item.productId,
                        warehouseId: toWarehouseId,
                        quantity: item.quantity
                    }
                });
            }
        }

        // 4. Update Supplier Debt
        await tx.supplier.update({
            where: { id: bill.supplierId },
            data: { totalDebt: bill.supplier.totalDebt + bill.totalAmount }
        });

        // 5. Update Bill Status
        const updatedBill = await tx.purchaseBill.update({
            where: { id: billId },
            data: { status: 'APPROVED' }
        });

        return updatedBill;
    });
}

export async function updatePurchaseBill(id: string, data: any) {
    await getUser();

    const existing = await prisma.purchaseBill.findUnique({ where: { id } });
    if (existing?.status !== 'DRAFT') throw new Error("Chỉ có thể sửa hóa đơn Nháp");

    const bill = await prisma.purchaseBill.update({
        where: { id },
        data: {
            code: data.code,
            supplierInvoice: data.supplierInvoice,
            supplierId: data.supplierId,
            orderId: data.orderId || null,
            date: data.date ? new Date(data.date) : new Date(),
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            notes: data.notes,
            tags: data.tags || null,
            attachment: data.attachment !== undefined ? data.attachment : existing.attachment,
            totalAmount: data.totalAmount,
            subTotal: data.subTotal || 0,
            taxAmount: data.taxAmount || 0,
            items: {
                deleteMany: {},
                create: data.items.map((item: any) => {
                    const lineSubTotal = item.quantity * item.unitPrice;
                    const lineTaxAmount = lineSubTotal * (item.taxRate || 0) / 100;
                    return {
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0,
                        taxAmount: lineTaxAmount,
                        totalPrice: lineSubTotal + lineTaxAmount
                    };
                })
            }
        }
    });

    revalidatePath('/purchasing/bills');
    revalidatePath(`/purchasing/bills/${id}`);
    return bill;
}

export async function deletePurchaseBill(id: string) {
    await getUser();

    const existing = await prisma.purchaseBill.findUnique({ where: { id } });
    if (existing?.status !== 'DRAFT') throw new Error("Chỉ có thể xóa hóa đơn Nháp");

    await prisma.purchaseBillItem.deleteMany({ where: { billId: id } });
    await prisma.purchaseBill.delete({ where: { id } });

    revalidatePath('/purchasing/bills');
    return true;
}

// ---------------------------------------------------------------------------
// PURCHASE PAYMENTS (Quản lý Thanh Toán Công Nợ)
// ---------------------------------------------------------------------------

export async function getPurchasePayments() {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    return prisma.purchasePayment.findMany({
        include: {
            supplier: true,
            creator: true,
            allocations: {
                include: { bill: true }
            }
        },
        orderBy: { date: 'desc' }
    });
}

export async function createPurchasePayment(data: any) {
    const user = await getUser();

    return prisma.$transaction(async (tx: any) => {
        let code = data.code;
        if (!code) {
            const count = await tx.purchasePayment.count();
            code = `PAY-${(count + 1).toString().padStart(6, '0')}`;
        }

        const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
        if (!supplier) throw new Error("Nhà cung cấp không tồn tại");

        let allocationsData = [];
        let totalAllocated = 0;

        // Ensure allocations array exists
        const providedAllocations = data.allocations || [];

        for (const alloc of providedAllocations) {
            if (alloc.amount > 0) {
                // Verify bill
                const bill = await tx.purchaseBill.findUnique({ where: { id: alloc.billId } });
                if (!bill) throw new Error(`Hóa đơn ${alloc.billId} không tồn tại`);

                const remainingOnBill = bill.totalAmount - bill.paidAmount;
                if (alloc.amount > remainingOnBill + 0.01) { // Add small tolerance for float issues
                    throw new Error(`Số tiền phân bổ cho hóa đơn ${bill.code} vượt quá số tiền còn lại phải trả`);
                }

                allocationsData.push({
                    billId: alloc.billId,
                    amount: alloc.amount
                });
                totalAllocated += alloc.amount;

                // Update bill paid amount and status
                const newPaidAmount = bill.paidAmount + alloc.amount;
                const newStatus = (newPaidAmount >= bill.totalAmount - 0.01) ? 'PAID' : 'PARTIAL_PAID'; // Tolerance again

                await tx.purchaseBill.update({
                    where: { id: bill.id },
                    data: {
                        paidAmount: newPaidAmount,
                        status: newStatus
                    }
                });
            }
        }

        // Validate total payment amount against allocations if allocations are provided explicitly
        if (providedAllocations.length > 0 && Math.abs(data.amount - totalAllocated) > 0.01) {
            // Note: in a real system, unallocated amounts could be saved as supplier credit. We're keeping it simple here.
            // Or we just allow the total amount to be higher and only allocate what's specified.
        }

        // 1. Create Payment
        const payment = await tx.purchasePayment.create({
            data: {
                code,
                date: data.date ? new Date(data.date) : new Date(),
                amount: data.amount,
                paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
                reference: data.reference,
                notes: data.notes,
                attachment: data.attachment,
                supplierId: data.supplierId,
                creatorId: user.id,
                allocations: {
                    create: allocationsData
                }
            }
        });

        // 2. Reduce Supplier Debt
        await tx.supplier.update({
            where: { id: data.supplierId },
            data: { totalDebt: supplier.totalDebt - data.amount }
        });

        return payment;
    });
}

export async function updatePurchasePayment(id: string, data: any) {
    await getUser();

    // Simplification: only allow updating notes and reference
    const payment = await prisma.purchasePayment.update({
        where: { id },
        data: {
            reference: data.reference,
            notes: data.notes,
            paymentMethod: data.paymentMethod,
        }
    });

    revalidatePath('/purchasing/payments');
    revalidatePath(`/purchasing/payments/${id}`);
    return payment;
}

export async function deletePurchasePayment(id: string) {
    await getUser();

    return prisma.$transaction(async (tx: any) => {
        const payment = await tx.purchasePayment.findUnique({
            where: { id },
            include: { allocations: true }
        });

        if (!payment) throw new Error("Phiếu chi không tồn tại");

        // Reverse debt
        const supplier = await tx.supplier.findUnique({ where: { id: payment.supplierId } });
        await tx.supplier.update({
            where: { id: payment.supplierId },
            data: { totalDebt: supplier.totalDebt + payment.amount }
        });

        // Reverse bill status and paid amount
        for (const alloc of payment.allocations) {
            const bill = await tx.purchaseBill.findUnique({ where: { id: alloc.billId } });
            if (bill) {
                const newPaidAmount = Math.max(0, bill.paidAmount - alloc.amount);
                const newStatus = (newPaidAmount >= bill.totalAmount - 0.01) ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL_PAID' : 'APPROVED');
                await tx.purchaseBill.update({
                    where: { id: bill.id },
                    data: { paidAmount: newPaidAmount, status: newStatus }
                });
            }
        }

        // Delete allocations then payment
        await tx.purchasePaymentAllocation.deleteMany({ where: { paymentId: id } });
        await tx.purchasePayment.delete({ where: { id } });

        revalidatePath('/purchasing/payments');
        return true;
    });
}

export async function uploadPurchasePaymentDocument(paymentId: string, url: string, name: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    return prisma.$transaction(async (tx: any) => {
        const payment = await tx.purchasePayment.findUnique({
            where: { id: paymentId }
        });

        if (!payment) throw new Error("Không tìm thấy Phiếu Chi này");

        let existingDocs: any[] = [];
        if (payment.attachment) {
            try {
                existingDocs = JSON.parse(payment.attachment);
            } catch (e) {
                existingDocs = [{
                    url: payment.attachment,
                    name: "Chứng từ gốc",
                    uploadedAt: payment.createdAt
                }];
            }
        }

        existingDocs.push({
            url,
            name,
            uploadedAt: new Date().toISOString()
        });

        const updatedPayment = await tx.purchasePayment.update({
            where: { id: paymentId },
            data: {
                attachment: JSON.stringify(existingDocs)
            },
            include: {
                supplier: true,
                creator: true,
                allocations: {
                    include: { bill: true }
                }
            }
        });

        revalidatePath(`/purchasing/payments/${paymentId}`);
        return updatedPayment;
    });
}

// ---------------------------------------------------------------------------
// UPLOAD DOCUMENTS FOR BILLS
// ---------------------------------------------------------------------------

export async function uploadPurchaseBillDocument(billId: string, url: string, name: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    return prisma.$transaction(async (tx: any) => {
        const bill = await tx.purchaseBill.findUnique({
            where: { id: billId }
        });

        if (!bill) throw new Error("Không tìm thấy Hóa đơn này");

        let existingDocs: any[] = [];
        if (bill.attachment) {
            try {
                existingDocs = JSON.parse(bill.attachment);
            } catch (e) {
                existingDocs = [{
                    url: bill.attachment,
                    name: "Tài liệu",
                    uploadedAt: bill.createdAt
                }];
            }
        }

        existingDocs.push({
            url,
            name,
            uploadedAt: new Date().toISOString()
        });

        const updatedBill = await tx.purchaseBill.update({
            where: { id: billId },
            data: {
                attachment: JSON.stringify(existingDocs)
            },
            include: {
                supplier: true,
                creator: true,
                items: { include: { product: true } },
                allocations: { include: { payment: true } }
            }
        });

        revalidatePath(`/purchasing/bills/${billId}`);
        return updatedBill;
    });
}

export async function sendPurchaseOrderEmail(orderId: string, to: string, subject: string, htmlBody: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const order = await prisma.purchaseOrder.findUnique({
            where: { id: orderId },
            include: { supplier: true }
        });

        if (!order) {
            return { success: false, error: "Không tìm thấy đơn hàng." };
        }

        const res = await sendEmailWithTracking({
            to,
            subject,
            htmlBody,
            senderId: session.user.id,
            // Supplier IDs are not supported by the email tracking currently, so we don't pass customerId unless we add supplierId to the model. 
        });

        return res;
    } catch (error: any) {
        console.error("Lỗi khi gửi email Đơn Mua Hàng:", error);
        return { success: false, error: error.message };
    }
}
