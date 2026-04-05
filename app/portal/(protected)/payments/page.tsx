import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { CreditCard } from "lucide-react";

export const metadata = {
    title: "Thanh toán - Customer Portal",
};

export default async function PortalPaymentsPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") redirect("/portal/login");

    const { from, to } = searchParams;
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
    }

    const payments = await prisma.salesPayment.findMany({
        where: { customerId: session.user.id, ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
        orderBy: { date: 'desc' },
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center">
                        <CreditCard size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Lịch Sử Thanh Toán</h1>
                        <p className="text-slate-500 text-sm">Danh sách các khoản thanh toán bạn đã thực hiện.</p>
                    </div>
                </div>

                <form className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <input type="date" name="from" defaultValue={from || ''} className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                    <span className="text-slate-400">-</span>
                    <input type="date" name="to" defaultValue={to || ''} className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                    <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors">Lọc</button>
                    {(from || to) && <a href="?" className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium">Xóa</a>}
                </form>
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
                                            <td className="px-6 py-4 font-medium">
                                                <a href={`/public/sales/payments/${payment.id}`} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-800 flex items-center gap-1 group">
                                                    {payment.code}
                                                    <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                </a>
                                            </td>
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
