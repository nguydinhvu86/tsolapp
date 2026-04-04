import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { FileSignature } from "lucide-react";

export const metadata = {
    title: "Báo giá - Customer Portal",
};

export default async function PortalQuotesPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") redirect("/portal/login");

    const quotes = await prisma.quote.findMany({
        where: { customerId: session.user.id },
        orderBy: { createdAt: 'desc' },
    });

    const statusMap: Record<string, { label: string, color: string }> = {
        'DRAFT': { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700' },
        'SENT': { label: 'Đã gửi', color: 'bg-blue-100 text-blue-700' },
        'ACCEPTED': { label: 'Đã chấp nhận', color: 'bg-emerald-100 text-emerald-700' },
        'REJECTED': { label: 'Từ chối', color: 'bg-red-100 text-red-700' }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                    <FileSignature size={20} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Báo Giá</h1>
                    <p className="text-slate-500 text-sm">Danh sách các báo giá đang và đã thực hiện.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                                <th className="px-6 py-4 font-semibold uppercase">Tiêu đề Báo giá</th>
                                <th className="px-6 py-4 font-semibold uppercase">Ngày tạo</th>
                                <th className="px-6 py-4 font-semibold uppercase text-center">Trạng Thái</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Phản hồi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {quotes.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                                        Không có báo giá nào
                                    </td>
                                </tr>
                            ) : (
                                quotes.map((quote) => {
                                    return (
                                        <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-800">{quote.title}</td>
                                            <td className="px-6 py-4 text-slate-700">{new Date(quote.createdAt).toLocaleDateString('vi-VN')}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[11px] uppercase font-bold px-3 py-1 rounded-full ${statusMap[quote.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                    {statusMap[quote.status]?.label || quote.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <a href={`/public/quotes/${quote.id}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors">
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
