import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DocumentsClient, { DocumentItem } from "./DocumentsClient";

export const metadata = {
    title: "Tài liệu - Customer Portal",
};

export default async function PortalDocumentsPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") redirect("/portal/login");

    const customerId = session.user.id;

    const [contracts, handovers, customer] = await Promise.all([
        prisma.contract.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.handover.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, name: true }
        })
    ]);

    const statusMap: Record<string, { label: string, color: string }> = {
        'DRAFT': { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700' },
        'SIGNED': { label: 'Đã ký', color: 'bg-emerald-100 text-emerald-700' },
        'CANCELLED': { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
        'COMPLETED': { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700' }
    };

    const formattedDocs: DocumentItem[] = [
        ...contracts.map(c => ({
            id: c.id,
            title: c.title,
            date: c.createdAt.toISOString(),
            type: 'CONTRACT' as const,
            typeLabel: 'Hợp đồng',
            status: c.status,
            statusLabel: statusMap[c.status]?.label || c.status,
            statusColor: statusMap[c.status]?.color || 'bg-slate-100 text-slate-600',
            url: `/public/contracts/${c.id}`
        })),
        ...handovers.map(h => ({
            id: h.id,
            title: h.title,
            date: h.createdAt.toISOString(),
            type: 'HANDOVER' as const,
            typeLabel: 'Biên bản bàn giao',
            status: h.status,
            statusLabel: statusMap[h.status]?.label || h.status,
            statusColor: statusMap[h.status]?.color || 'bg-slate-100 text-slate-600',
            url: `/public/handovers/${h.id}`
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <DocumentsClient
            initialDocuments={formattedDocs}
            customerName={customer?.name || session.user.name || 'Khách hàng'}
        />
    );
}
