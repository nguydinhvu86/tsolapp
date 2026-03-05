import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ExpenseClient from "./ExpenseClient";

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Quản lý Chi Phí | ContractMgr',
};

export default async function ExpensesPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    // Check permissions (assuming 'SALES_EXPENSES_VIEW' is needed or ADMIN)
    const permissions = session.user.permissions || [];
    const isAdmin = session.user.role === 'ADMIN';

    if (!isAdmin && !permissions.includes('SALES_EXPENSES_VIEW')) {
        redirect("/dashboard");
    }

    const { expenses, categories, customers, suppliers } = await getInitialData();

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

async function getInitialData() {
    try {
        const expenses = await prisma.expense.findMany({
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
