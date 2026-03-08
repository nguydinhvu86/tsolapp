import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ExpenseClient from "./ExpenseClient";
import { buildViewFilter } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Quản lý Chi Phí | ContractMgr',
};

export default async function ExpensesPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    const permissions = session.user.permissions || [];
    const isAdmin = session.user.role === 'ADMIN';
    const viewAll = permissions.includes('SALES_EXPENSES_VIEW_ALL');
    const viewOwn = permissions.includes('SALES_EXPENSES_VIEW_OWN');

    if (!isAdmin && !viewAll && !viewOwn) {
        redirect("/dashboard");
    }

    const { expenses, categories, customers, suppliers } = await getInitialData(session.user.id, permissions, isAdmin);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Quản lý Chi Phí</h2>
            </div>

            <ExpenseClient
                initialData={expenses}
                categories={categories}
                customers={customers}
                suppliers={suppliers}
                isAdmin={isAdmin}
                permissions={permissions}
            />
        </div>
    );
}

async function getInitialData(userId: string, permissions: string[], isAdmin: boolean) {
    try {
        const viewFilter = isAdmin ? {} : buildViewFilter(userId, permissions, 'SALES_EXPENSES', 'creatorId');
        if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') throw new Error("Unauthorized");

        const expenses = await prisma.expense.findMany({
            where: viewFilter,
            include: {
                category: true,
                supplier: { select: { id: true, name: true } },
                customer: { select: { id: true, name: true } },
                creator: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        const categories = await prisma.expenseCategory.findMany({
            orderBy: { name: 'asc' }
        });

        const customers = await prisma.customer.findMany({
            select: { id: true, name: true, phone: true },
            orderBy: { name: 'asc' }
        });

        const suppliers = await prisma.supplier.findMany({
            select: { id: true, name: true, phone: true },
            orderBy: { name: 'asc' }
        });

        return { expenses, categories, customers, suppliers };
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu Chi phí:", error);
        return { expenses: [], categories: [], customers: [], suppliers: [] };
    }
}
