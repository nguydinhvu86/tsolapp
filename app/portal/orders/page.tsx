import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart } from "lucide-react";

export const metadata = {
    title: "Lịch sử mua hàng - Customer Portal",
};

export default async function PortalOrdersPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") redirect("/portal/login");

    const orders = await prisma.salesOrder.findMany({
        where: { customerId: session.user.id },
        orderBy: { date: 'desc' },
    });

    const statusMap: Record<string, { label: string, color: string }> = {
        'DRAFT': { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700' },
        'SENT': { label: 'Đã gửi', color: 'bg-blue-100 text-blue-700' },
        'PARTIAL_SHIPPED': { label: 'Giao 1 phần', color: 'bg-yellow-100 text-yellow-700' },
        'COMPLETED': { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700' },
        'CANCELLED': { label: 'Đã hủy', color: 'bg-red-100 text-red-700' }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                    <ShoppingCart size={20} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Lịch Sử Mua Hàng</h1>
                    <p className="text-slate-500 text-sm">Danh sách các đơn hàng của bạn.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                                <th className="px-6 py-4 font-semibold uppercase">Mã Đơn</th>
                                <th className="px-6 py-4 font-semibold uppercase">Ngày tạo</th>
                                <th className="px-6 py-4 font-semibold uppercase text-right">Tổng Tiền</th>
                                <th className="px-6 py-4 font-semibold uppercase text-center">Trạng Thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                                        Không có đơn hàng nào
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-indigo-600">{order.code}</td>
                                        <td className="px-6 py-4 text-slate-700">{new Date(order.date).toLocaleDateString('vi-VN')}</td>
                                        <td className="px-6 py-4 text-slate-800 font-bold text-right">{formatCurrency(order.totalAmount)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[11px] uppercase font-bold px-3 py-1 rounded-full ${statusMap[order.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                {statusMap[order.status]?.label || order.status}
                                            </span>
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
