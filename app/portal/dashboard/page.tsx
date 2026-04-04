import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FinancialChartWrapper } from "./FinancialChartWrapper";
import { formatCurrency } from "@/lib/utils";
import { FileText, ShoppingCart, Receipt, Wallet, TrendingUp } from "lucide-react";

export const metadata = {
    title: "Tổng quan - Customer Portal",
};

export default async function CustomerDashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") {
        redirect("/portal/login");
    }

    const customerId = session.user.id;

    // Fetch customer profile
    const customer = await prisma.customer.findUnique({
        where: { id: customerId },
    });

    if (!customer) {
        return <div className="p-4 text-red-500">Người dùng không hợp lệ</div>;
    }

    // Fetch aggregates concurrently
    const [ordersCount, invoicesCount, recentOrders, recentInvoices] = await Promise.all([
        prisma.salesOrder.count({ where: { customerId } }),
        prisma.salesInvoice.count({ where: { customerId } }),
        prisma.salesOrder.findMany({
            where: { customerId },
            orderBy: { date: 'desc' },
            take: 3,
            select: { id: true, code: true, date: true, totalAmount: true, status: true }
        }),
        prisma.salesInvoice.findMany({
            where: { customerId },
            orderBy: { date: 'desc' },
            take: 3,
            select: { id: true, code: true, date: true, totalAmount: true, status: true }
        })
    ]);

    // Construct chart data (12 months trailing)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0,0,0,0);

    const invoicesData = await prisma.salesInvoice.groupBy({
        by: ['date'],
        where: {
            customerId,
            date: { gte: twelveMonthsAgo },
            status: { not: 'CANCELLED' }
        },
        _sum: { totalAmount: true, paidAmount: true }
    });

    // Group by month
    const monthlyDataMap = new Map<string, { amount: number, payment: number }>();
    
    // Initialize exactly the last 12 months in order
    for (let i = 0; i < 12; i++) {
        const d = new Date(twelveMonthsAgo);
        d.setMonth(d.getMonth() + i);
        const key = `Th ${d.getMonth() + 1}/${d.getFullYear()}`;
        monthlyDataMap.set(key, { amount: 0, payment: 0 });
    }

    invoicesData.forEach(inv => {
        const d = new Date(inv.date);
        const key = `Th ${d.getMonth() + 1}/${d.getFullYear()}`;
        if (monthlyDataMap.has(key)) {
            const current = monthlyDataMap.get(key)!;
            current.amount += (inv._sum?.totalAmount || 0);
            current.payment += (inv._sum?.paidAmount || 0);
            monthlyDataMap.set(key, current);
        }
    });

    const chartData = Array.from(monthlyDataMap.entries()).map(([name, data]) => ({
        name,
        amount: data.amount,
        payment: data.payment
    }));

    // Status map formatter
    const statusMap: Record<string, { label: string, color: string }> = {
        'DRAFT': { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700' },
        'SENT': { label: 'Đã gửi', color: 'bg-blue-100 text-blue-700' },
        'PARTIAL_PAID': { label: 'Thanh toán 1 phần', color: 'bg-yellow-100 text-yellow-700' },
        'PAID': { label: 'Đã thanh toán', color: 'bg-emerald-100 text-emerald-700' },
        'PENDING_PAYMENT': { label: 'Chờ thanh toán', color: 'bg-orange-100 text-orange-700' },
        'COMPLETED': { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700' },
        'CANCELLED': { label: 'Đã hủy', color: 'bg-red-100 text-red-700' }
    };

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Xin chào, {customer.name}</h1>
                <p className="text-slate-500 mt-1">Chào mừng bạn trở lại hệ thống chăm sóc khách hàng.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center sm:items-start text-center sm:text-left transition-shadow hover:shadow-md">
                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center mb-4">
                        <Wallet size={24} />
                    </div>
                    <span className="text-sm font-medium text-slate-500 mb-1">Công nợ hiện tại</span>
                    <span className={`text-2xl font-bold ${customer.totalDebt > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {formatCurrency(customer.totalDebt)}
                    </span>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center sm:items-start text-center sm:text-left transition-shadow hover:shadow-md">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
                        <ShoppingCart size={24} />
                    </div>
                    <span className="text-sm font-medium text-slate-500 mb-1">Tổng đơn hàng</span>
                    <span className="text-2xl font-bold text-slate-800">{ordersCount}</span>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center sm:items-start text-center sm:text-left transition-shadow hover:shadow-md">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                        <Receipt size={24} />
                    </div>
                    <span className="text-sm font-medium text-slate-500 mb-1">Tổng hóa đơn</span>
                    <span className="text-2xl font-bold text-slate-800">{invoicesCount}</span>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col items-center sm:items-start text-center sm:text-left transition-shadow hover:shadow-md">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                        <FileText size={24} />
                    </div>
                    <span className="text-sm font-medium text-slate-500 mb-1">Tài liệu khả dụng</span>
                    <span className="text-2xl font-bold text-slate-800">Mở</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Financial Insights */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="text-indigo-600" size={20} />
                        <h2 className="text-lg font-bold text-slate-800">Biểu Đồ Mua Hàng 12 Tháng</h2>
                    </div>
                    <FinancialChartWrapper data={chartData} />
                </div>

                {/* Recent Activities */}
                <div className="space-y-6">
                    {/* Recent Orders */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Đơn Hàng Gần Đây</h2>
                        {recentOrders.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">Chưa có đơn hàng nào.</p>
                        ) : (
                            <div className="space-y-4">
                                {recentOrders.map(order => (
                                    <div key={order.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{order.code}</p>
                                            <p className="text-xs text-slate-500">{new Date(order.date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-slate-800 text-sm">{formatCurrency(order.totalAmount)}</p>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${statusMap[order.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                {statusMap[order.status]?.label || order.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Invoices */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Hóa Đơn Mới Nhất</h2>
                        {recentInvoices.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">Chưa có hóa đơn nào.</p>
                        ) : (
                            <div className="space-y-4">
                                {recentInvoices.map(invoice => (
                                    <div key={invoice.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{invoice.code}</p>
                                            <p className="text-xs text-slate-500">{new Date(invoice.date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-slate-800 text-sm">{formatCurrency(invoice.totalAmount)}</p>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${statusMap[invoice.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                {statusMap[invoice.status]?.label || invoice.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
