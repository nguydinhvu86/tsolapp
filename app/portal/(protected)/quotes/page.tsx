import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import QuotesClient, { QuoteItem } from "./QuotesClient";

export const metadata = {
    title: "Báo giá - Customer Portal",
};

export default async function PortalQuotesPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") redirect("/portal/login");

    const customerId = session.user.id;

    const [salesEstimates, docsQuotes, customer] = await Promise.all([
        prisma.salesEstimate.findMany({
            where: { customerId },
            orderBy: { date: 'desc' }
        }),
        prisma.quote.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, name: true, email: true }
        })
    ]);

    const statusMap: Record<string, { label: string, color: string }> = {
        'DRAFT': { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700' },
        'SENT': { label: 'Đã gửi', color: 'bg-blue-100 text-blue-700' },
        'ACCEPTED': { label: 'Đã chấp nhận', color: 'bg-emerald-100 text-emerald-700' },
        'REJECTED': { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
        'CANCELLED': { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
        'CONFIRMED': { label: 'Đã duyệt', color: 'bg-emerald-100 text-emerald-700' },
    };

    const unifiedQuotes: QuoteItem[] = [
        ...salesEstimates.map(se => ({
            id: se.id,
            code: se.code,
            title: `Báo giá ${se.code}`,
            date: se.date.toISOString(),
            validUntil: se.validUntil ? se.validUntil.toISOString() : null,
            status: se.status,
            statusLabel: statusMap[se.status]?.label || se.status,
            statusColor: statusMap[se.status]?.color || 'bg-slate-100 text-slate-600',
            amount: se.totalAmount,
            type: 'Báo Giá Sản Phẩm (ERP)',
            url: `/public/sales/estimate/${se.id}`
        })),
        ...docsQuotes.map(q => ({
            id: q.id,
            code: `BG-DOC-${q.id.slice(-4)}`,
            title: q.title,
            date: q.createdAt.toISOString(),
            validUntil: null,
            status: q.status,
            statusLabel: statusMap[q.status]?.label || q.status,
            statusColor: statusMap[q.status]?.color || 'bg-slate-100 text-slate-600',
            amount: null,
            type: 'Văn Bản Báo Giá',
            url: `/public/quotes/${q.id}`
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <QuotesClient
            initialQuotes={unifiedQuotes}
            customerName={customer?.name || session.user.name || 'Khách hàng'}
        />
    );
}
