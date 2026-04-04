import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { CreditCard } from "lucide-react";

export const metadata = {
    title: "Thanh toán - Customer Portal",
};

export default async function PortalPaymentsPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") redirect("/portal/login");

    const payments = await prisma.salesPayment.findMany({
        where: { customerId: session.user.id },
        orderBy: { date: 'desc' },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center">
                    <CreditCard size={20} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Lịch Sử Thanh Toán</h1>
                    <p className="text-slate-500 text-sm">Danh sách các khoản thanh toán bạn đã thực hiện.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                                <th className="px-6 py-4 font-semibold uppercase">Mã phiếu</th>
                                <th className="px-6 py-4 font-semibold uppercase">Ngày thanh toán</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Số tiền</th>
                                <th className="px-6 py-4 font-semibold uppercase">Phương thức</th>
                                <th className="px-6 py-4 font-semibold uppercase">Tham chiếu</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                        Không có lịch sử thanh toán
                                    </td>
                                </tr>
                            ) : (
                                payments.map((payment) => {
                                    return (
                                        <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-800">{payment.code}</td>
                                            <td className="px-6 py-4 text-slate-700">{new Date(payment.date).toLocaleDateString('vi-VN')}</td>
                                            <td className="px-6 py-4 text-emerald-600 font-bold text-right">{formatCurrency(payment.amount)}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-[11px] uppercase font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                                                    {payment.paymentMethod === 'CASH' ? 'Tiền mặt' : payment.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : payment.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {payment.reference || ''}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
