import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OrdersClient, { UnifiedTransaction } from "./OrdersClient";

export const metadata = {
    title: "Lịch sử giao dịch - Customer Portal",
};

export default async function PortalOrdersPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") redirect("/portal/login");

    const customerId = session.user.id;

    const [orders, invoices, payments, estimates, customer] = await Promise.all([
        prisma.salesOrder.findMany({
            where: { customerId },
            orderBy: { date: 'desc' },
        }),
        prisma.salesInvoice.findMany({
            where: { customerId },
            orderBy: { date: 'desc' },
        }),
        prisma.salesPayment.findMany({
            where: { customerId },
            orderBy: { date: 'desc' },
        }),
        prisma.salesEstimate.findMany({
            where: { customerId },
            orderBy: { date: 'desc' },
        }),
        prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, name: true, email: true, phone: true }
        })
    ]);

    const statusMap: Record<string, { label: string, color: string }> = {
        'DRAFT': { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700' },
        'SENT': { label: 'Đã gửi', color: 'bg-blue-100 text-blue-700' },
        'ISSUED': { label: 'Đã phát hành', color: 'bg-blue-100 text-blue-700' },
        'PARTIAL_SHIPPED': { label: 'Giao 1 phần', color: 'bg-yellow-100 text-yellow-700' },
        'PARTIAL_PAID': { label: 'Thanh toán 1 phần', color: 'bg-yellow-100 text-yellow-700' },
        'PAID': { label: 'Đã thanh toán', color: 'bg-emerald-100 text-emerald-700' },
        'CONFIRMED': { label: 'Đã chốt', color: 'bg-emerald-100 text-emerald-700' },
        'COMPLETED': { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700' },
        'ACCEPTED': { label: 'Đã chấp nhận', color: 'bg-emerald-100 text-emerald-700' },
        'REJECTED': { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
        'CANCELLED': { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
        'PENDING_PAYMENT': { label: 'Chờ thanh toán', color: 'bg-orange-100 text-orange-700' },
    };

    const unifiedTransactions: UnifiedTransaction[] = [
        ...orders.map(o => ({
            id: o.id,
            type: 'ORDER' as const,
            typeLabel: 'Đơn hàng',
            code: o.code,
            date: o.date.toISOString(),
            amount: o.totalAmount,
            status: o.status,
            statusLabel: statusMap[o.status]?.label || o.status,
            statusColor: statusMap[o.status]?.color || 'bg-slate-100 text-slate-600',
            description: `Đơn đặt hàng ${o.code}`,
            url: `/public/sales/order/${o.id}`,
            iconType: 'shopping-cart'
        })),
        ...invoices.map(i => ({
            id: i.id,
            type: 'INVOICE' as const,
            typeLabel: 'Hóa đơn',
            code: i.code,
            date: i.date.toISOString(),
            amount: i.totalAmount,
            paidAmount: i.paidAmount,
            status: i.status,
            statusLabel: statusMap[i.status]?.label || i.status,
            statusColor: statusMap[i.status]?.color || 'bg-slate-100 text-slate-600',
            description: `Hóa đơn bán hàng ${i.code}`,
            url: `/public/sales/invoice/${i.id}`,
            iconType: 'receipt'
        })),
        ...payments.map(p => ({
            id: p.id,
            type: 'PAYMENT' as const,
            typeLabel: 'Thanh toán',
            code: p.code || 'TT',
            date: p.date.toISOString(),
            amount: p.amount,
            status: p.status,
            statusLabel: statusMap[p.status]?.label || (p.status === 'COMPLETED' ? 'Hoàn thành' : p.status),
            statusColor: statusMap[p.status]?.color || 'bg-emerald-100 text-emerald-700',
            description: p.reference ? `Thanh toán: ${p.reference}` : `Phiếu thu ${p.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}`,
            url: `/public/sales/payments/${p.id}`,
            iconType: 'credit-card'
        })),
        ...estimates.map(e => ({
            id: e.id,
            type: 'ESTIMATE' as const,
            typeLabel: 'Báo giá',
            code: e.code,
            date: e.date.toISOString(),
            amount: e.totalAmount,
            status: e.status,
            statusLabel: statusMap[e.status]?.label || e.status,
            statusColor: statusMap[e.status]?.color || 'bg-slate-100 text-slate-600',
            description: `Báo giá bán hàng ${e.code}`,
            url: `/public/sales/estimate/${e.id}`,
            iconType: 'file-text'
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <OrdersClient
            initialTransactions={unifiedTransactions}
            customerName={customer?.name || session.user.name || 'Khách hàng'}
            customerEmail={customer?.email}
            customerPhone={customer?.phone}
        />
    );
}
