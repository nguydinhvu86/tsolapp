import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PaymentsClient, { PaymentItem } from "./PaymentsClient";

export const metadata = {
    title: "Thanh toán - Customer Portal",
};

export default async function PortalPaymentsPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") redirect("/portal/login");

    const customerId = session.user.id;

    const [payments, customer] = await Promise.all([
        prisma.salesPayment.findMany({
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
        'COMPLETED': { label: 'Đã xác nhận', color: 'bg-emerald-100 text-emerald-700' },
        'SUCCESS': { label: 'Thành công', color: 'bg-emerald-100 text-emerald-700' },
        'CANCELLED': { label: 'Đã hủy', color: 'bg-red-100 text-red-700' }
    };

    const formattedPayments: PaymentItem[] = payments.map(payment => {
        const isBank = payment.paymentMethod === 'BANK_TRANSFER';
        return {
            id: payment.id,
            code: payment.code,
            date: payment.date.toISOString(),
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            paymentMethodLabel: isBank ? 'Chuyển khoản' : (payment.paymentMethod === 'CASH' ? 'Tiền mặt' : payment.paymentMethod),
            reference: payment.reference,
            status: payment.status,
            statusLabel: statusMap[payment.status]?.label || 'Đã ghi nhận',
            statusColor: statusMap[payment.status]?.color || 'bg-emerald-100 text-emerald-700',
            url: `/public/sales/payments/${payment.id}`
        };
    });

    return (
        <PaymentsClient
            initialPayments={formattedPayments}
            customerName={customer?.name || session.user.name || 'Khách hàng'}
        />
    );
}
