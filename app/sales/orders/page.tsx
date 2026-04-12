import { getSalesOrders, getNextOrderCode } from './actions';
import { getCustomers } from '@/app/customers/actions';
import { getProducts } from '@/app/inventory/actions';
import SalesOrderClient from './SalesOrderClient';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/authOptions";

export const dynamic = 'force-dynamic';

export default async function SalesOrdersPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const session = await getServerSession(authOptions);
    const isAdminOrManager = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';

    const employeeId = typeof searchParams?.employeeId === 'string' ? searchParams.employeeId : undefined;

    // Pass employeeId to the action to apply RBAC filtering
    const { prisma } = await import('@/lib/prisma');
    const [orders, customers, products, nextCode, projects] = await Promise.all([
        getSalesOrders(employeeId),
        getCustomers(),
        getProducts(),
        getNextOrderCode(),
        prisma.project.findMany({ select: { id: true, name: true } })
    ]);

    const users = await prisma.user.findMany({ select: { id: true, name: true, avatar: true } });

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">
                Quản Lý Đơn Đặt Hàng
            </h1>
            <SalesOrderClient
                initialOrders={orders}
                customers={customers}
                products={products.filter((p: any) => p.isActive)}
                nextCode={nextCode}
                initialAction={typeof searchParams?.action === 'string' ? searchParams.action : undefined}
                initialCustomerId={typeof searchParams?.customerId === 'string' ? searchParams.customerId : undefined}
                users={users}
                currentUserId={session?.user?.id}
                isAdminOrManager={isAdminOrManager}
                projects={projects}
            />
        </div>
    );
}
