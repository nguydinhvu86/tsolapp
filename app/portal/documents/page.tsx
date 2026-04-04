import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Folder } from "lucide-react";

export const metadata = {
    title: "Tài liệu - Customer Portal",
};

export default async function PortalDocumentsPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") redirect("/portal/login");

    // Lấy các Handovers (Bàn giao) như là "Tài liệu" cho khách hàng, hoặc danh sách Contract.
    const [contracts, handovers] = await Promise.all([
        prisma.contract.findMany({ where: { customerId: session.user.id }, orderBy: { createdAt: 'desc' }}),
        prisma.handover.findMany({ where: { customerId: session.user.id }, orderBy: { createdAt: 'desc' }})
    ]);

    const statusMap: Record<string, { label: string, color: string }> = {
        'DRAFT': { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700' },
        'SIGNED': { label: 'Đã ký', color: 'bg-emerald-100 text-emerald-700' },
        'CANCELLED': { label: 'Đã hủy', color: 'bg-red-100 text-red-700' }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                    <Folder size={20} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Tài Liệu Của Tôi</h1>
                    <p className="text-slate-500 text-sm">Tra cứu hợp đồng và các biên bản bàn giao lưu trữ.</p>
                </div>
            </div>

            {/* Hợp Đồng */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-8">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-bold text-slate-800">Hợp đồng pháp lý</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-sm">
                                <th className="px-6 py-4 font-semibold uppercase">Tên Hợp đồng</th>
                                <th className="px-6 py-4 font-semibold uppercase">Ngày tạo</th>
                                <th className="px-6 py-4 font-semibold uppercase text-center">Trạng Thái</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {contracts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">Không có hợp đồng nào</td>
                                </tr>
                            ) : contracts.map(contract => (
                                <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-800">{contract.title}</td>
                                    <td className="px-6 py-4 text-slate-700">{new Date(contract.createdAt).toLocaleDateString('vi-VN')}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${statusMap[contract.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                            {statusMap[contract.status]?.label || contract.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <a href={`/public/contracts/${contract.id}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors">
                                            Xem PDF &rarr;
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bàn Giao */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-bold text-slate-800">Biên bản bàn giao</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-sm">
                                <th className="px-6 py-4 font-semibold uppercase">Tên Biên bản</th>
                                <th className="px-6 py-4 font-semibold uppercase">Ngày tạo</th>
                                <th className="px-6 py-4 font-semibold uppercase text-center">Trạng Thái</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {handovers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">Không có biên bản bàn giao nào</td>
                                </tr>
                            ) : handovers.map(handover => (
                                <tr key={handover.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-800">{handover.title}</td>
                                    <td className="px-6 py-4 text-slate-700">{new Date(handover.createdAt).toLocaleDateString('vi-VN')}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${statusMap[handover.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                            {statusMap[handover.status]?.label || handover.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <a href={`/public/handovers/${handover.id}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors">
                                            Xem PDF &rarr;
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
