'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/authOptions";
import { verifyActionPermission, verifyActionOwnership } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

export async function getExpenses() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    try {
        const expenses = await prisma.expense.findMany({
            include: {
                category: true,
                supplier: { select: { id: true, name: true } },
                customer: { select: { id: true, name: true } },
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });
        return expenses;
    } catch (error) {
        console.error('Lỗi khi lấy danh sách Chi Phí:', error);
        throw new Error('Không thể tải dữ liệu Chi Phí');
    }
}

export async function getExpenseCategories() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    try {
        const categories = await prisma.expenseCategory.findMany({
            orderBy: {
                name: 'asc'
            }
        });
        return categories;
    } catch (error) {
        console.error('Lỗi khi lấy danh mục Chi Phí:', error);
        throw new Error('Không thể tải danh mục Chi Phí');
    }
}

export async function createExpenseCategory(data: { name: string; description?: string }) {
    await verifyActionPermission('SALES_EXPENSES_CREATE');

    try {
        const newCategory = await prisma.expenseCategory.create({
            data: {
                name: data.name,
                description: data.description,
            }
        });
        return newCategory;
    } catch (error) {
        console.error('Lỗi khi tạo danh mục Chi Phí:', error);
        throw new Error('Không thể tạo danh mục Chi Phí');
    }
}

export async function createExpense(data: {
    amount: number;
    payee?: string;
    description: string;
    categoryId: string;
    paymentMethod?: string;
    date?: Date;
    reference?: string;
    attachment?: string;
    supplierId?: string | null;
    customerId?: string | null;
    projectId?: string | null;
    marketingCampaignId?: string | null;
}) {
    const user = await verifyActionPermission('SALES_EXPENSES_CREATE');
    const uId = (user as any).id;

    try {
        // Generate a code EXP-YYYYMM-001
        const prefix = `EXP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-`;
        const lastExpense = await prisma.expense.findFirst({
            where: {
                code: {
                    startsWith: prefix
                }
            },
            orderBy: {
                code: 'desc'
            }
        });

        let seq = 1;
        if (lastExpense) {
            const parts = lastExpense.code.split('-');
            if (parts.length === 3) {
                seq = parseInt(parts[2], 10) + 1;
            }
        }
        const nextCode = `${prefix}${String(seq).padStart(4, '0')}`;

        const expense = await prisma.expense.create({
            data: {
                code: nextCode,
                amount: data.amount,
                payee: data.payee,
                description: data.description,
                categoryId: data.categoryId,
                paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
                date: data.date || new Date(),
                reference: data.reference,
                attachment: data.attachment,
                supplierId: data.supplierId || null,
                customerId: data.customerId || null,
                projectId: data.projectId || null,
                marketingCampaignId: data.marketingCampaignId || null,
                creatorId: uId,
                status: 'COMPLETED'
            }
        });

        if (data.attachment) {
            try {
                const { saveAttachment, parseAttachmentString } = await import('@/lib/storage-vault');
                const files = parseAttachmentString(data.attachment);
                for (const f of files) {
                    await saveAttachment({
                        fileName: f.name,
                        fileUrl: f.url,
                        entityType: 'EXPENSE',
                        entityId: expense.id,
                        uploadedById: uId
                    });
                }
            } catch (vaultErr) {
                console.error('Lỗi khi đồng bộ SystemAttachment cho Expense:', vaultErr);
            }
        }

        // Auto-create CashTransaction in Cash Book (Phiếu Chi Kế Toán)
        try {
            const { createAutoPaymentFromExpense } = await import('@/app/accounting/actions');
            await createAutoPaymentFromExpense(prisma, {
                expenseCode: nextCode,
                payee: data.payee,
                description: data.description,
                amount: data.amount,
                date: data.date ? new Date(data.date) : new Date(),
                paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
                reference: data.reference,
                notes: `Chi phí: ${data.description}`,
                userId: uId,
                customerId: data.customerId,
                supplierId: data.supplierId,
                projectId: data.projectId
            });
        } catch (accErr) {
            console.error('Lỗi khi tự động tạo phiếu chi sổ quỹ cho Chi Phí:', accErr);
        }

        revalidatePath('/sales/expenses');
        revalidatePath('/accounting/cash-book');

        return expense;
    } catch (error: any) {
        console.error('Lỗi khi tạo khoản Chi Phí:', error);
        throw new Error(error.message || 'Không thể tạo khoản Chi Phí');
    }
}

export async function updateExpense(id: string, data: {
    amount?: number;
    payee?: string;
    description?: string;
    categoryId?: string;
    paymentMethod?: string;
    date?: Date;
    status?: string;
    reference?: string;
    attachment?: string;
    supplierId?: string | null;
    customerId?: string | null;
    projectId?: string | null;
    marketingCampaignId?: string | null;
}) {
    const oldExpense = await prisma.expense.findUnique({ where: { id } });
    if (!oldExpense) throw new Error("Khoản chi phí không tồn tại");
    await verifyActionOwnership('SALES_EXPENSES', 'EDIT', oldExpense.creatorId);

    try {
        const expense = await prisma.expense.update({
            where: { id },
            data: {
                ...data,
            }
        });

        if (data.attachment && data.attachment !== oldExpense.attachment) {
            try {
                const { saveAttachment, parseAttachmentString } = await import('@/lib/storage-vault');
                const files = parseAttachmentString(data.attachment);
                for (const f of files) {
                    await saveAttachment({
                        fileName: f.name,
                        fileUrl: f.url,
                        entityType: 'EXPENSE',
                        entityId: expense.id,
                        uploadedById: oldExpense.creatorId
                    });
                }
            } catch (vaultErr) {
                console.error('Lỗi khi đồng bộ SystemAttachment cho Expense:', vaultErr);
            }
        }

        // Also update reason/amount in CashTransaction if exists
        try {
            const linkedCashTx = await prisma.cashTransaction.findFirst({
                where: {
                    OR: [
                        { reason: { contains: oldExpense.code } },
                        { notes: { contains: oldExpense.code } }
                    ]
                }
            });
            if (linkedCashTx) {
                const updateData: any = {};
                if (data.amount !== undefined && data.amount !== linkedCashTx.amount) {
                    const diff = data.amount - linkedCashTx.amount;
                    updateData.amount = data.amount;
                    if (linkedCashTx.financeAccountId) {
                        await prisma.financeAccount.update({
                            where: { id: linkedCashTx.financeAccountId },
                            data: { currentBalance: { decrement: diff } }
                        });
                    }
                }
                if (data.description !== undefined) {
                    updateData.reason = `Chi phí: ${data.description} (Mã: ${oldExpense.code})`;
                }
                if (data.payee !== undefined) {
                    updateData.payerReceiver = data.payee || 'Người nhận';
                }
                if (Object.keys(updateData).length > 0) {
                    await prisma.cashTransaction.update({
                        where: { id: linkedCashTx.id },
                        data: updateData
                    });
                }
            }
        } catch (accErr) {
            console.error('Lỗi khi cập nhật phiếu chi sổ quỹ:', accErr);
        }

        // Log activity for update
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
            try {
                await prisma.expenseActivityLog.create({
                    data: {
                        expenseId: id,
                        userId: session.user.id,
                        action: 'CẬP_NHẬT_PHIẾU',
                        details: `Đã cập nhật thông tin phiếu chi ${oldExpense.code}`
                    }
                });
            } catch (_) {}
        }

        revalidatePath(`/sales/expenses/${id}`);
        revalidatePath('/sales/expenses');
        revalidatePath('/accounting/cash-book');

        return expense;
    } catch (error) {
        console.error('Lỗi khi cập nhật khoản Chi Phí:', error);
        throw new Error('Không thể cập nhật khoản Chi Phí');
    }
}

export async function getExpenseById(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    const perms = (session.user.permissions as string[]) || [];
    const isViewAll = perms.includes('SALES_EXPENSES_VIEW_ALL');
    const isViewOwn = perms.includes('SALES_EXPENSES_VIEW_OWN');

    if (!isViewAll && !isViewOwn) throw new Error('Unauthorized');

    const authFilter = (!isViewAll && isViewOwn) ? { creatorId: session.user.id } : {};

    try {
        const expense = await prisma.expense.findFirst({
            where: { id, ...authFilter },
            include: {
                category: true,
                supplier: { select: { id: true, name: true, phone: true, email: true, address: true } },
                customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
                project: { select: { id: true, name: true, code: true } },
                marketingCampaign: { select: { id: true, name: true } },
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    }
                },
                notes: {
                    include: {
                        user: { select: { id: true, name: true, avatar: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                activityLogs: {
                    include: {
                        user: { select: { id: true, name: true, avatar: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                tasks: true
            }
        });

        if (!expense) return null;

        let linkedCashTransaction: any = null;
        try {
            linkedCashTransaction = await prisma.cashTransaction.findFirst({
                where: {
                    OR: [
                        { reason: { contains: expense.code } },
                        { notes: { contains: expense.code } }
                    ]
                },
                include: {
                    financeAccount: true
                }
            });
        } catch (_) {}

        return {
            ...expense,
            linkedCashTransaction
        };
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết Chi Phí:', error);
        throw new Error('Không thể tải dữ liệu Chi Phí');
    }
}

export async function uploadExpenseAttachment(expenseId: string, url: string, name: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new Error("Không tìm thấy Phiếu Chi này");
    await verifyActionOwnership('SALES_EXPENSES', 'EDIT', expense.creatorId);

    const { parseAttachmentString, saveAttachment } = await import('@/lib/storage-vault');
    const existingDocs = parseAttachmentString(expense.attachment);

    existingDocs.push({
        url,
        name,
        uploadedAt: new Date().toISOString()
    });

    const updatedExpense = await prisma.expense.update({
        where: { id: expenseId },
        data: {
            attachment: JSON.stringify(existingDocs)
        }
    });

    // Sync to SystemAttachment
    try {
        await saveAttachment({
            fileName: name,
            fileUrl: url,
            entityType: 'EXPENSE',
            entityId: expenseId,
            uploadedById: session.user.id
        });
    } catch (e) {
        console.error('Lỗi khi lưu vào SystemAttachment:', e);
    }

    // Add activity log
    try {
        await prisma.expenseActivityLog.create({
            data: {
                expenseId,
                userId: session.user.id,
                action: 'THÊM_TÀI_LIỆU',
                details: `Đã tải lên tệp chứng từ: ${name}`
            }
        });
    } catch (_) {}

    revalidatePath(`/sales/expenses/${expenseId}`);
    return updatedExpense;
}

export async function removeExpenseAttachment(expenseId: string, fileUrl: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new Error("Không tìm thấy Phiếu Chi này");
    await verifyActionOwnership('SALES_EXPENSES', 'EDIT', expense.creatorId);

    const { parseAttachmentString, deleteAttachmentByUrl } = await import('@/lib/storage-vault');
    const existingDocs = parseAttachmentString(expense.attachment);
    const newDocs = existingDocs.filter(d => d.url !== fileUrl);

    const updatedExpense = await prisma.expense.update({
        where: { id: expenseId },
        data: {
            attachment: newDocs.length > 0 ? JSON.stringify(newDocs) : null
        }
    });

    // Remove from SystemAttachment
    try {
        await deleteAttachmentByUrl('EXPENSE', expenseId, fileUrl);
    } catch (e) {
        console.error('Lỗi khi xóa khỏi SystemAttachment:', e);
    }

    // Add activity log
    try {
        await prisma.expenseActivityLog.create({
            data: {
                expenseId,
                userId: session.user.id,
                action: 'XÓA_TÀI_LIỆU',
                details: `Đã xóa tệp chứng từ: ${fileUrl.split('/').pop()}`
            }
        });
    } catch (_) {}

    revalidatePath(`/sales/expenses/${expenseId}`);
    return updatedExpense;
}

export async function cancelExpense(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new Error("Khoản chi phí không tồn tại");
    await verifyActionOwnership('SALES_EXPENSES', 'EDIT', expense.creatorId);

    const updated = await prisma.expense.update({
        where: { id },
        data: { status: 'CANCELLED' }
    });

    try {
        await prisma.expenseActivityLog.create({
            data: {
                expenseId: id,
                userId: session.user.id,
                action: 'HỦY_PHIẾU',
                details: `Đã hủy phiếu chi ${expense.code}`
            }
        });
    } catch (_) {}

    revalidatePath(`/sales/expenses/${id}`);
    revalidatePath('/sales/expenses');
    return updated;
}

export async function restoreExpense(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new Error("Khoản chi phí không tồn tại");
    await verifyActionOwnership('SALES_EXPENSES', 'EDIT', expense.creatorId);

    const updated = await prisma.expense.update({
        where: { id },
        data: { status: 'COMPLETED' }
    });

    try {
        await prisma.expenseActivityLog.create({
            data: {
                expenseId: id,
                userId: session.user.id,
                action: 'KHÔI_PHỤC_PHIẾU',
                details: `Đã khôi phục trạng thái hoàn thành cho phiếu chi ${expense.code}`
            }
        });
    } catch (_) {}

    revalidatePath(`/sales/expenses/${id}`);
    revalidatePath('/sales/expenses');
    return updated;
}

export async function getExpenseRelatedOptions() {
    const [categories, customers, suppliers, projects] = await Promise.all([
        prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } }),
        prisma.customer.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: 'asc' }, take: 200 }),
        prisma.supplier.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: 'asc' }, take: 200 }),
        prisma.project.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: 'asc' }, take: 100 }),
    ]);
    return { categories, customers, suppliers, projects };
}

export async function addExpenseNote(expenseId: string, content: string, attachment?: string) {
    const user = await verifyActionPermission('SALES_EXPENSES_EDIT');
    const uId = (user as any).id;
    
    const oldExpense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!oldExpense) throw new Error("Khoản chi phí không tồn tại");
    await verifyActionOwnership('SALES_EXPENSES', 'EDIT', oldExpense.creatorId);

    try {
        const note = await prisma.expenseNote.create({
            data: {
                expenseId,
                userId: uId,
                content,
                attachment,
            }
        });

        // Add activity log
        await prisma.expenseActivityLog.create({
            data: {
                expenseId,
                userId: uId,
                action: 'THÊM_GHI_CHÚ',
                details: 'Đã thêm ghi chú mới'
            }
        });

        return { success: true, data: note };
    } catch (error) {
        console.error('Lỗi khi thêm ghi chú phiếu chi:', error);
        return { success: false, error: 'Không thể thêm ghi chú' };
    }
}

export async function deleteExpense(id: string) {
    const oldExpense = await prisma.expense.findUnique({ where: { id } });
    if (!oldExpense) throw new Error("Khoản chi phí không tồn tại");
    await verifyActionOwnership('SALES_EXPENSES', 'DELETE', oldExpense.creatorId);

    try {
        // Delete linked CashTransaction if exists
        try {
            const linkedCashTx = await prisma.cashTransaction.findFirst({
                where: {
                    OR: [
                        { reason: { contains: oldExpense.code } },
                        { notes: { contains: oldExpense.code } }
                    ]
                }
            });
            if (linkedCashTx) {
                if (linkedCashTx.financeAccountId) {
                    await prisma.financeAccount.update({
                        where: { id: linkedCashTx.financeAccountId },
                        data: { currentBalance: { increment: linkedCashTx.amount } }
                    });
                }
                await prisma.cashTransaction.delete({
                    where: { id: linkedCashTx.id }
                });
            }
        } catch (accErr) {
            console.error('Lỗi khi xóa phiếu chi sổ quỹ liên kết:', accErr);
        }

        await prisma.expense.delete({
            where: { id }
        });

        revalidatePath('/sales/expenses');
        revalidatePath('/accounting/cash-book');

        return { success: true };
    } catch (error) {
        console.error('Lỗi khi xóa khoản Chi Phí:', error);
        throw new Error('Không thể xóa khoản Chi Phí');
    }
}
