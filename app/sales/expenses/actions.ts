'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/authOptions";

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

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
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

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
                creatorId: session.user.id,
                status: 'COMPLETED'
            }
        });

        return expense;
    } catch (error) {
        console.error('Lỗi khi tạo khoản Chi Phí:', error);
        throw new Error('Không thể tạo khoản Chi Phí');
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
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    try {
        const expense = await prisma.expense.update({
            where: { id },
            data: {
                ...data,
            }
        });
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

    try {
        const expense = await prisma.expense.findUnique({
            where: { id },
            include: {
                category: true,
                supplier: { select: { id: true, name: true, phone: true } },
                customer: { select: { id: true, name: true, phone: true } },
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
                notes: {
                    include: {
                        user: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                tasks: true
            }
        });
        return expense;
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết Chi Phí:', error);
        throw new Error('Không thể tải dữ liệu Chi Phí');
    }
}

export async function addExpenseNote(expenseId: string, content: string, attachment?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    try {
        const note = await prisma.expenseNote.create({
            data: {
                expenseId,
                userId: session.user.id,
                content,
                attachment,
            }
        });

        // Add activity log
        await prisma.expenseActivityLog.create({
            data: {
                expenseId,
                userId: session.user.id,
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    try {
        await prisma.expense.delete({
            where: { id }
        });
        return { success: true };
    } catch (error) {
        console.error('Lỗi khi xóa khoản Chi Phí:', error);
        throw new Error('Không thể xóa khoản Chi Phí');
    }
}
