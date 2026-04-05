import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart } from "lucide-react";

export const metadata = {
    title: "Lịch sử mua hàng - Customer Portal",
};

export default async function PortalOrdersPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
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

    const whereClause = {
        customerId: session.user.id,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
    };

    const [orders, invoices, payments, customer] = await Promise.all([
        prisma.salesOrder.findMany({ where: whereClause, orderBy: { date: 'desc' } }),
        prisma.salesInvoice.findMany({ where: whereClause, orderBy: { date: 'desc' } }),
        prisma.salesPayment.findMany({ where: whereClause, orderBy: { date: 'desc' } }),
        prisma.customer.findUnique({ where: { id: session.user.id } })
    ]);

    const transactions = [
        ...orders.map(o => ({
            id: o.id, type: 'ORDER', typeLabel: 'Đơn hàng', code: o.code, date: o.date,
            amount: o.totalAmount, status: o.status, url: `/public/sales/order/${o.id}`,
            color: 'text-indigo-600', iconBg: 'bg-indigo-100', bgHover: 'hover:bg-indigo-50/50'
        })),
        ...invoices.map(i => ({
            id: i.id, type: 'INVOICE', typeLabel: 'Hóa đơn', code: i.code, date: i.date,
            amount: i.totalAmount, status: i.status, url: `/public/sales/invoice/${i.id}`,
            color: 'text-rose-600', iconBg: 'bg-rose-100', bgHover: 'hover:bg-rose-50/50'
        })),
        ...payments.map(p => ({
            id: p.id, type: 'PAYMENT', typeLabel: 'Thanh toán', code: p.code, date: p.date,
            amount: p.amount, status: p.status, url: `/public/sales/payments/${p.id}`,
            color: 'text-emerald-600', iconBg: 'bg-emerald-100', bgHover: 'hover:bg-emerald-50/50'
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const statusMap: Record<string, { label: string, color: string }> = {
        'DRAFT': { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700' },
        'SENT': { label: 'Đã gửi', color: 'bg-blue-100 text-blue-700' },
        'ISSUED': { label: 'Đã phát hành', color: 'bg-blue-100 text-blue-700' },
        'PARTIAL_SHIPPED': { label: 'Giao 1 phần', color: 'bg-yellow-100 text-yellow-700' },
        'PARTIAL_PAID': { label: 'Thanh toán 1 phần', color: 'bg-yellow-100 text-yellow-700' },
        'PAID': { label: 'Đã thanh toán', color: 'bg-emerald-100 text-emerald-700' },
        'CONFIRMED': { label: 'Đã chốt', color: 'bg-emerald-100 text-emerald-700' },
        'COMPLETED': { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700' },
        'CANCELLED': { label: 'Đã hủy', color: 'bg-red-100 text-red-700' }
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <ShoppingCart size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Lịch Sử Giao Dịch</h1>
                        <p className="text-slate-500 text-sm">Quản lý tổng hợp đơn hàng, hóa đơn và lịch sử thanh toán.</p>
                    </div>
                </div>
                
                {/* Lọc thời gian */}
                <form className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <input 
                        type="date" 
                        name="from" 
                        defaultValue={from || ''} 
                        className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <span className="text-slate-400">-</span>
                    <input 
                        type="date" 
                        name="to" 
                        defaultValue={to || ''} 
                        className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors">
                        Lọc
                    </button>
                </form>
            </div>

            {/* Quick Summary under Filter */}
            {customer && (
                <div style={{ background: 'linear-gradient(to right, #059669, #14b8a6)' }} className="rounded-2xl p-6 text-white shadow-lg flex items-center justify-between mb-8 overflow-hidden relative">
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
                    <div>
                        <p className="text-emerald-100 font-medium text-sm mb-1">Dư nợ hiện tải (Tổng quan hệ thống)</p>
                        <p className="text-3xl font-extrabold tracking-tight">{formatCurrency(customer.totalDebt)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-emerald-100 font-medium text-sm mb-1">{from || to ? "Ghi nhận trong kỳ" : "Ghi nhận hệ thống"}</p>
                        <p className="font-semibold">{transactions.length} Giao dịch</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                                <th className="px-6 py-4 font-semibold uppercase">Mã Giao Dịch</th>
                                <th className="px-6 py-4 font-semibold uppercase">Phân loại</th>
                                <th className="px-6 py-4 font-semibold uppercase">Ngày tạo</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Giá Trị</th>
                                <th className="px-6 py-4 font-semibold uppercase text-center">Trạng Thái</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Link</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                        Không có giao dịch nào trong khoảng thời gian này
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr key={tx.id + tx.type} className={`transition-colors ${tx.bgHover}`}>
                                        <td className="px-6 py-4 font-bold">
                                            <a href={tx.url} target="_blank" rel="noopener noreferrer" className={`${tx.color} hover:opacity-80 flex items-center gap-1 group transition-opacity`}>
                                                {tx.code}
                                                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                            </a>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${tx.iconBg} ${tx.color}`}>
                                                {tx.typeLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 font-medium">{new Date(tx.date).toLocaleDateString('vi-VN')}</td>
                                        <td className={`px-6 py-4 font-black tracking-tight text-right ${tx.color}`}>
                                            {tx.type === 'PAYMENT' ? '-' : (tx.type === 'INVOICE' ? '+' : '')} {formatCurrency(tx.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[11px] uppercase font-bold px-3 py-1 rounded-full ${statusMap[tx.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                {statusMap[tx.status]?.label || tx.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <a href={tx.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-800 text-sm font-semibold transition-colors">
                                                Xem &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
