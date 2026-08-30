import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import InvoicesClient, { InvoiceItem } from "./InvoicesClient";

export const metadata = {
    title: "Hóa đơn - Customer Portal",
};

export default async function PortalInvoicesPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") redirect("/portal/login");

    const customerId = session.user.id;

    const [invoices, customer] = await Promise.all([
        prisma.salesInvoice.findMany({
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
        'PARTIAL_PAID': { label: 'Thanh toán 1 phần', color: 'bg-yellow-100 text-yellow-700' },
        'PAID': { label: 'Đã thanh toán', color: 'bg-emerald-100 text-emerald-700' },
        'PENDING_PAYMENT': { label: 'Chờ thanh toán', color: 'bg-orange-100 text-orange-700' },
        'CANCELLED': { label: 'Đã hủy', color: 'bg-red-100 text-red-700' }
    };

    const formattedInvoices: InvoiceItem[] = invoices.map(invoice => {
        const remainingDebt = Math.max(0, invoice.totalAmount - (invoice.paidAmount || 0));
        return {
            id: invoice.id,
            code: invoice.code,
            date: invoice.date.toISOString(),
            dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
            totalAmount: invoice.totalAmount,
            paidAmount: invoice.paidAmount || 0,
            remainingDebt,
            status: invoice.status,
            statusLabel: statusMap[invoice.status]?.label || invoice.status,
            statusColor: statusMap[invoice.status]?.color || 'bg-slate-100 text-slate-600',
            url: `/public/sales/invoice/${invoice.id}`
        };
    });

    return (
        <InvoicesClient
            initialInvoices={formattedInvoices}
            customerName={customer?.name || session.user.name || 'Khách hàng'}
        />
    );
}
