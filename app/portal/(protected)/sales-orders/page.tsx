import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SalesOrdersClient, { OrderItem } from "./SalesOrdersClient";

export const metadata = {
    title: "Đơn hàng - Customer Portal",
};

export default async function PortalSalesOrdersPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") redirect("/portal/login");

    const customerId = session.user.id;

    const [orders, customer] = await Promise.all([
        prisma.salesOrder.findMany({
            where: { customerId },
            orderBy: { date: 'desc' },
        }),
        prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, name: true, email: true }
        })
    ]);

    const statusMap: Record<string, { label: string, color: string }> = {
        'DRAFT': { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700' },
        'SENT': { label: 'Đã gửi', color: 'bg-blue-100 text-blue-700' },
        'PARTIAL_SHIPPED': { label: 'Giao 1 phần', color: 'bg-yellow-100 text-yellow-700' },
        'CONFIRMED': { label: 'Đã chốt', color: 'bg-blue-100 text-blue-700' },
        'COMPLETED': { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700' },
        'CANCELLED': { label: 'Đã hủy', color: 'bg-red-100 text-red-700' }
    };

    const formattedOrders: OrderItem[] = orders.map(order => ({
        id: order.id,
        code: order.code,
        date: order.date.toISOString(),
        totalAmount: order.totalAmount,
        status: order.status,
        statusLabel: statusMap[order.status]?.label || order.status,
        statusColor: statusMap[order.status]?.color || 'bg-slate-100 text-slate-600',
        url: `/public/sales/order/${order.id}`
    }));

    return (
        <SalesOrdersClient
            initialOrders={formattedOrders}
            customerName={customer?.name || session.user.name || 'Khách hàng'}
        />
    );
}
