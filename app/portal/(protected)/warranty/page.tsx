import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PortalWarrantyClient from "./PortalWarrantyClient";

export const metadata = {
    title: "Tra Cứu & Quản Lý Bảo Hành Serial - Customer Portal",
    description: "Quản lý danh sách thiết bị và thời hạn bảo hành điện tử chính hãng dành cho đại lý và khách hàng.",
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
                }
            },
            orderBy: { updatedAt: 'desc' }
        }),
        prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, name: true }
        })
    ]);

    const formattedSerials = serials.map(s => ({
        id: s.id,
        serialNumber: s.serialNumber,
        status: s.status,
        warrantyStartDate: s.warrantyStartDate ? s.warrantyStartDate.toISOString() : null,
        warrantyEndDate: s.warrantyEndDate ? s.warrantyEndDate.toISOString() : null,
        notes: s.notes,
        createdAt: s.createdAt.toISOString(),
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
    }));

    return (
        <PortalWarrantyClient 
            initialSerials={formattedSerials}
            customerName={customer?.name || session.user.name || "Đại Lý"}
        />
    );
}
