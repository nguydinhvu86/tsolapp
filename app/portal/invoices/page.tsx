import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Receipt } from "lucide-react";

export const metadata = {
    title: "Hóa đơn - Customer Portal",
};

export default async function PortalInvoicesPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") redirect("/portal/login");

    const invoices = await prisma.salesInvoice.findMany({
        where: { customerId: session.user.id },
        orderBy: { date: 'desc' },
    });

    const statusMap: Record<string, { label: string, color: string }> = {
        'DRAFT': { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700' },
        'SENT': { label: 'Đã gửi', color: 'bg-blue-100 text-blue-700' },
        'PARTIAL_PAID': { label: 'Thanh toán 1 phần', color: 'bg-yellow-100 text-yellow-700' },
        'PAID': { label: 'Đã thanh toán', color: 'bg-emerald-100 text-emerald-700' },
        'PENDING_PAYMENT': { label: 'Chờ TT', color: 'bg-orange-100 text-orange-700' },
        'CANCELLED': { label: 'Đã hủy', color: 'bg-red-100 text-red-700' }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                    <Receipt size={20} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Hóa Đơn Của Tôi</h1>
                    <p className="text-slate-500 text-sm">Quản lý và tra cứu các hóa đơn xuất bán.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                                <th className="px-6 py-4 font-semibold uppercase">Mã HĐ</th>
                                <th className="px-6 py-4 font-semibold uppercase">Ngày Xuất</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Tổng Tiền</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Đã Thanh Toán</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Còn Nợ</th>
                                <th className="px-6 py-4 font-semibold uppercase text-center">Trạng Thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                        Không có hóa đơn nào
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((invoice) => {
                                    const debt = invoice.totalAmount - invoice.paidAmount;
                                    return (
                                        <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-indigo-600">{invoice.code}</td>
                                            <td className="px-6 py-4 text-slate-700">{new Date(invoice.date).toLocaleDateString('vi-VN')}</td>
                                            <td className="px-6 py-4 text-slate-800 font-bold text-right">{formatCurrency(invoice.totalAmount)}</td>
                                            <td className="px-6 py-4 text-emerald-600 font-medium text-right">{formatCurrency(invoice.paidAmount)}</td>
                                            <td className="px-6 py-4 text-rose-600 font-bold text-right">{formatCurrency(debt > 0 ? debt : 0)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[11px] uppercase font-bold px-3 py-1 rounded-full ${statusMap[invoice.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                    {statusMap[invoice.status]?.label || invoice.status}
                                                </span>
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
