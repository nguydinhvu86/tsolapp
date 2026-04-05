import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Receipt } from "lucide-react";

export const metadata = {
    title: "Hóa đơn - Customer Portal",
};

export default async function PortalInvoicesPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
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

    const invoices = await prisma.salesInvoice.findMany({
        where: { customerId: session.user.id, ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                        <Receipt size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Hóa Đơn Của Tôi</h1>
                        <p className="text-slate-500 text-sm">Quản lý và tra cứu các hóa đơn xuất bán.</p>
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
                                            <td className="px-6 py-4 font-medium">
                                                <a href={`/public/sales/invoice/${invoice.id}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group">
                                                    {invoice.code}
                                                    <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                </a>
                                            </td>
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
