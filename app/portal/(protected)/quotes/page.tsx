import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { FileSignature } from "lucide-react";

export const metadata = {
    title: "Báo giá - Customer Portal",
};

export default async function PortalQuotesPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
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

    const [salesEstimates, docsQuotes] = await Promise.all([
        prisma.salesEstimate.findMany({
            where: { customerId: session.user.id, ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
            orderBy: { date: 'desc' }
        }),
        prisma.quote.findMany({
            where: { customerId: session.user.id, ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}) },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    const unifiedQuotes = [
        ...salesEstimates.map(se => ({
            id: se.id,
            title: `Báo giá ${se.code}`,
            date: se.date,
            status: se.status,
            amount: se.totalAmount,
            type: 'GIÁ TRỊ',
            url: `/public/sales/estimate/${se.id}`
        })),
        ...docsQuotes.map(q => ({
            id: q.id,
            title: q.title,
            date: q.createdAt,
            status: q.status,
            amount: null,
            type: 'VĂN BẢN',
            url: `/public/quotes/${q.id}`
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const statusMap: Record<string, { label: string, color: string }> = {
        'DRAFT': { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700' },
        'SENT': { label: 'Đã gửi', color: 'bg-blue-100 text-blue-700' },
        'ACCEPTED': { label: 'Đã chấp nhận', color: 'bg-emerald-100 text-emerald-700' },
        'REJECTED': { label: 'Từ chối', color: 'bg-red-100 text-red-700' }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                        <FileSignature size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Báo Giá</h1>
                        <p className="text-slate-500 text-sm">Danh sách các báo giá đang và đã thực hiện.</p>
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

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                                <th className="px-6 py-4 font-semibold uppercase">Tiêu đề Báo giá</th>
                                <th className="px-6 py-4 font-semibold uppercase">Ngày tạo</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Tổng Tiền</th>
                                <th className="px-6 py-4 font-semibold uppercase text-center">Trạng Thái</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Phản hồi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {unifiedQuotes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                        Không có báo giá nào
                                    </td>
                                </tr>
                            ) : (
                                unifiedQuotes.map((quote) => {
                                    return (
                                        <tr key={quote.id + quote.type} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-800">
                                                    <a href={quote.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 group">
                                                        {quote.title}
                                                        <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    </a>
                                                </p>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">{quote.type}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-700 font-medium">{new Date(quote.date).toLocaleDateString('vi-VN')}</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-800">
                                                {quote.amount !== null ? formatCurrency(quote.amount) : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[11px] uppercase font-bold px-3 py-1 rounded-full ${statusMap[quote.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                    {statusMap[quote.status]?.label || quote.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <a href={quote.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-800 text-sm font-semibold transition-colors flex items-center justify-end gap-1">
                                                    Xem chi tiết &rarr;
                                                </a>
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
