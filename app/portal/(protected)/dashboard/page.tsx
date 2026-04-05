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
        include: { contacts: true }
    });

    if (!customer) {
        return <div className="p-4 text-red-500">Người dùng không hợp lệ</div>;
    }

    // Fetch aggregates concurrently
    const [ordersCount, invoicesCount, estimatesCount, recentOrders, recentInvoices] = await Promise.all([
        prisma.salesOrder.count({ where: { customerId } }),
        prisma.salesInvoice.count({ where: { customerId } }),
        prisma.salesEstimate.count({ where: { customerId } }),
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
            status: { notIn: ['CANCELLED', 'DRAFT'] }
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
        <div className="space-y-8 pb-10 w-full overflow-x-hidden font-sans">
            {/* Header Area */}
            <div className="relative overflow-hidden rounded-2xl bg-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-500 p-8 sm:p-10 shadow-lg border border-emerald-500/30">
                <div className="relative z-10 text-white">
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 drop-shadow-sm">Xin chào, {customer.name}!</h1>
                    <p className="text-emerald-50 text-sm sm:text-base max-w-2xl font-medium tracking-wide">
                        Chào mừng bạn trở lại hệ thống chăm sóc khách hàng. Theo dõi công nợ, đơn hàng và hóa đơn của bạn tại đây.
                    </p>
                </div>
                {/* Decorative background shapes for the header */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white opacity-10 blur-2xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-20 w-40 h-40 rounded-full bg-teal-300 opacity-20 blur-2xl pointer-events-none"></div>
            </div>

            {/* Account Details Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                    Thông Tin Khách Hàng
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                    <div>
                        <p className="text-[13px] font-bold uppercase tracking-widest text-slate-500 mb-1">Email / Tài khoản</p>
                        <p className="font-semibold text-slate-800">{customer.email || '—'}</p>
                    </div>
                    <div>
                        <p className="text-[13px] font-bold uppercase tracking-widest text-slate-500 mb-1">Điện thoại</p>
                        <p className="font-semibold text-slate-800">{customer.phone || (customer.contacts && customer.contacts.length > 0 ? customer.contacts[0].phone : '—') || '—'}</p>
                    </div>
                    <div>
                        <p className="text-[13px] font-bold uppercase tracking-widest text-slate-500 mb-1">Mã số thuế</p>
                        <p className="font-semibold text-slate-800">{customer.taxCode || '—'}</p>
                    </div>
                    <div>
                        <p className="text-[13px] font-bold uppercase tracking-widest text-slate-500 mb-1">Địa chỉ</p>
                        <p className="font-medium text-slate-800">{customer.address || '—'}</p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 hover:border-emerald-400 p-6 flex flex-col transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125 duration-500 z-0 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
                            <Wallet size={24} />
                        </div>
                        <span className="text-[13px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Công nợ hiện tại</span>
                        <span className={`text-4xl font-black tracking-tighter ${customer.totalDebt > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {formatCurrency(customer.totalDebt)}
                        </span>
                    </div>
                </div>

                <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 hover:border-emerald-400 p-6 flex flex-col transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125 duration-500 z-0 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                            <ShoppingCart size={24} />
                        </div>
                        <span className="text-[13px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Tổng đơn hàng</span>
                        <span className="text-4xl font-black tracking-tighter text-slate-800">{ordersCount}</span>
                    </div>
                </div>

                <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 hover:border-emerald-400 p-6 flex flex-col transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125 duration-500 z-0 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                            <Receipt size={24} />
                        </div>
                        <span className="text-[13px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Tổng hóa đơn</span>
                        <span className="text-4xl font-black tracking-tighter text-slate-800">{invoicesCount}</span>
                    </div>
                </div>

                <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 hover:border-emerald-400 p-6 flex flex-col transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125 duration-500 z-0 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300">
                            <FileText size={24} />
                        </div>
                        <span className="text-[13px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Tổng Báo Giá</span>
                        <span className="text-4xl font-black tracking-tighter text-slate-800">{estimatesCount}</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Financial Insights */}
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 transition-colors duration-300 p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Doanh số 12 Tháng</h2>
                            <p className="text-sm font-medium text-slate-500">Thống kê mua sắm và thanh toán của bạn</p>
                        </div>
                    </div>
                    <FinancialChartWrapper data={chartData} />
                </div>

                {/* Recent Activities */}
                <div className="space-y-8">
                    {/* Recent Orders */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 transition-colors duration-300 p-6 sm:p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-b from-indigo-50/50 to-transparent rounded-bl-full pointer-events-none"></div>
                        <h2 className="text-lg font-bold text-slate-800 mb-6 relative z-10 flex items-center gap-2">
                            <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                            Đơn Hàng Mới Nhất
                        </h2>
                        {recentOrders.length === 0 ? (
                            <div className="text-center py-6">
                                <ShoppingCart className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                                <p className="text-sm text-slate-500">Chưa có đơn hàng nào.</p>
                            </div>
                        ) : (
                            <div className="space-y-5 relative z-10">
                                {recentOrders.map(order => (
                                    <div key={order.id} className="group flex justify-between items-center py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors -mx-4 px-4 rounded-xl">
                                        <div>
                                            <p className="font-bold text-indigo-600 group-hover:text-indigo-700 text-sm mb-0.5">{order.code}</p>
                                            <p className="text-xs text-slate-500 font-medium">{new Date(order.date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-800 text-sm mb-1">{formatCurrency(order.totalAmount)}</p>
                                            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md ${statusMap[order.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                {statusMap[order.status]?.label || order.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Invoices */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 transition-colors duration-300 p-6 sm:p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-b from-emerald-50/50 to-transparent rounded-bl-full pointer-events-none"></div>
                        <h2 className="text-lg font-bold text-slate-800 mb-6 relative z-10 flex items-center gap-2">
                            <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                            Hóa Đơn Cần Lưu Ý
                        </h2>
                        {recentInvoices.length === 0 ? (
                            <div className="text-center py-6">
                                <Receipt className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                                <p className="text-sm text-slate-500">Chưa có hóa đơn nào.</p>
                            </div>
                        ) : (
                            <div className="space-y-5 relative z-10">
                                {recentInvoices.map(invoice => (
                                    <div key={invoice.id} className="group flex justify-between items-center py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors -mx-4 px-4 rounded-xl">
                                        <div>
                                            <p className="font-bold text-emerald-600 group-hover:text-emerald-700 text-sm mb-0.5">{invoice.code}</p>
                                            <p className="text-xs text-slate-500 font-medium">{new Date(invoice.date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-800 text-sm mb-1">{formatCurrency(invoice.totalAmount)}</p>
                                            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md ${statusMap[invoice.status]?.color || 'bg-slate-100 text-slate-600'}`}>
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
