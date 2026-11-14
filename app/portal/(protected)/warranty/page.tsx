import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { parseFullSerialHistory } from "@/lib/inventory-serial";
import PortalWarrantyClient from "./PortalWarrantyClient";

export const metadata = {
    title: "Tra Cứu & Quản Lý Bảo Hành Serial - Customer Portal",
    description: "Quản lý danh sách thiết bị, lịch sử sửa chữa đổi trả và thời hạn bảo hành điện tử chính hãng dành cho đại lý và khách hàng.",
};

export default async function PortalWarrantyPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") {
        redirect("/portal/login");
    }

    const customerId = session.user.id;

    const [serials, customer] = await Promise.all([
        prisma.productSerial.findMany({
            where: { customerId },
            include: {
                product: {
                    select: { id: true, name: true, sku: true, unit: true, warrantyMonths: true }
                },
                salesInvoice: {
                    select: { id: true, code: true, date: true }
                },
                serviceHistories: {
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { updatedAt: 'desc' }
        }),
        prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, name: true }
        })
    ]);

    const formattedSerials = serials.map(s => {
        const analysis = parseFullSerialHistory(s);
        return {
            id: s.id,
            serialNumber: s.serialNumber,
            status: s.status,
            warrantyStartDate: s.warrantyStartDate ? s.warrantyStartDate.toISOString() : null,
            warrantyEndDate: s.warrantyEndDate ? s.warrantyEndDate.toISOString() : null,
            notes: s.notes,
            createdAt: s.createdAt.toISOString(),
            // Thông tin mở rộng giám sát vòng đời dành cho đại lý
            warrantyCount: analysis.warrantyCount,
            currentServiceState: analysis.currentServiceState,
            serviceStateLabel: analysis.serviceStateLabel,
            serviceBadgeClass: analysis.serviceBadgeClass,
            lastReceivedDate: analysis.lastReceivedDate,
            lastReturnDate: analysis.lastReturnDate,
            latestAccessories: analysis.latestAccessories,
            latestAppearance: analysis.latestAppearance,
            latestDefectReason: analysis.latestDefectReason,
            latestRepairResult: analysis.latestRepairResult,
            latestStaffNotes: analysis.latestStaffNotes,
            replacementInfo: analysis.replacementInfo,
            serviceHistories: analysis.historyItems,
            product: {
                id: s.product.id,
                name: s.product.name,
                sku: s.product.sku,
                unit: s.product.unit,
                warrantyMonths: s.product.warrantyMonths
            },
            salesInvoice: s.salesInvoice ? {
                id: s.salesInvoice.id,
                code: s.salesInvoice.code,
                date: s.salesInvoice.date.toISOString()
            } : null
        };
    });

    return (
        <PortalWarrantyClient 
            initialSerials={formattedSerials}
            customerName={customer?.name || session.user.name || "Đại Lý"}
        />
    );
}
