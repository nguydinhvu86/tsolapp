import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FinancialChartWrapper } from "./FinancialChartWrapper";
import { formatCurrency } from "@/lib/utils";
import { FileText, ShoppingCart, Receipt, Wallet, TrendingUp, CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";
import Link from "next/link";

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

    // Fetch aggregates concurrently for 100% accurate financial calculations
    const [
        invoiceAgg,
        paymentAgg,
        ordersCount,
        ordersSum,
        invoicesCount,
        estimatesCount,
        estimatesSum,
        recentOrders,
        recentInvoices
    ] = await Promise.all([
        prisma.salesInvoice.aggregate({
            where: { customerId, status: { notIn: ['DRAFT', 'CANCELLED'] } },
            _sum: { totalAmount: true, paidAmount: true }
        }),
        prisma.salesPayment.aggregate({
            where: { customerId, status: { notIn: ['CANCELLED', 'FAILED'] } },
            _sum: { amount: true }
        }),
        prisma.salesOrder.count({ where: { customerId } }),
        prisma.salesOrder.aggregate({
            where: { customerId, status: { notIn: ['DRAFT', 'CANCELLED'] } },
            _sum: { totalAmount: true }
        }),
        prisma.salesInvoice.count({ where: { customerId } }),
        prisma.salesEstimate.count({ where: { customerId } }),
        prisma.salesEstimate.aggregate({
            where: { customerId, status: { notIn: ['DRAFT', 'REJECTED', 'CANCELLED'] } },
            _sum: { totalAmount: true }
        }),
        prisma.salesOrder.findMany({
            where: { customerId },
            orderBy: { date: 'desc' },
            take: 5,
            select: { id: true, code: true, date: true, totalAmount: true, status: true }
        }),
        prisma.salesInvoice.findMany({
            where: { customerId },
            orderBy: { date: 'desc' },
            take: 5,
            select: { id: true, code: true, date: true, totalAmount: true, paidAmount: true, status: true }
        })
    ]);

    // Chuẩn hóa và tính toán công nợ thực tế
    const totalPurchased = invoiceAgg._sum.totalAmount || 0;
    const totalPaidOnInvoices = invoiceAgg._sum.paidAmount || 0;
    const totalPaidDirect = paymentAgg._sum.amount || 0;
    const totalPaid = Math.max(totalPaidOnInvoices, totalPaidDirect);
    const currentDebt = totalPurchased - totalPaid;

    // Tự động đồng bộ trường totalDebt trong DB nếu phát hiện có sai lệch
    if (customer.totalDebt !== currentDebt) {
        try {
            await prisma.customer.update({
                where: { id: customerId },
                data: { totalDebt: currentDebt }
            });
        } catch (e) {
            console.error("Lỗi đồng bộ totalDebt trên Dashboard:", e);
        }
    }

    // Construct chart data (12 months trailing)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const invoicesData = await prisma.salesInvoice.findMany({
        where: {
            customerId,
            date: { gte: twelveMonthsAgo },
            status: { notIn: ['CANCELLED', 'DRAFT'] }
        },
        select: { date: true, totalAmount: true, paidAmount: true }
    });

    const paymentsData = await prisma.salesPayment.findMany({
        where: {
            customerId,
            date: { gte: twelveMonthsAgo },
            status: { notIn: ['CANCELLED', 'FAILED'] }
        },
        select: { date: true, amount: true }
    });

    // Group by month
    const monthlyDataMap = new Map<string, { amount: number, payment: number }>();

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
            current.amount += (inv.totalAmount || 0);
            current.payment += (inv.paidAmount || 0);
            monthlyDataMap.set(key, current);
        }
    });

    paymentsData.forEach(pay => {
        const d = new Date(pay.date);
        const key = `Th ${d.getMonth() + 1}/${d.getFullYear()}`;
        if (monthlyDataMap.has(key)) {
            const current = monthlyDataMap.get(key)!;
            // Nếu khoản thanh toán lớn hơn số paidAmount đã cộng từ hóa đơn
            if (pay.amount > current.payment) {
                current.payment = pay.amount;
            }
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
        'PARTIAL_SHIPPED': { label: 'Giao 1 phần', color: 'bg-yellow-100 text-yellow-700' },
        'PARTIAL_PAID': { label: 'Thanh toán 1 phần', color: 'bg-yellow-100 text-yellow-700' },
        'PAID': { label: 'Đã thanh toán', color: 'bg-emerald-100 text-emerald-700' },
        'PENDING_PAYMENT': { label: 'Chờ thanh toán', color: 'bg-orange-100 text-orange-700' },
        'CONFIRMED': { label: 'Đã chốt', color: 'bg-emerald-100 text-emerald-700' },
        'COMPLETED': { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700' },
        'CANCELLED': { label: 'Đã hủy', color: 'bg-red-100 text-red-700' }
    };

    return (
        <div className="space-y-8 pb-10 w-full overflow-x-hidden font-sans">
            {/* Header Area */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 p-8 sm:p-10 shadow-xl border border-emerald-500/30">
                <div className="relative z-10 text-white">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider mb-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                        Cổng Khách Hàng Trực Tuyến
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 drop-shadow-sm">
                        Xin chào, {customer.name}!
                    </h1>
                    <p className="text-emerald-50 text-sm sm:text-base max-w-2xl font-medium tracking-wide">
                        Theo dõi tình hình công nợ, tiến độ đơn hàng và tra cứu chứng từ của bạn tại đây.
                    </p>
                </div>
                {/* Decorative background shapes */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-32 w-56 h-56 rounded-full bg-teal-300/20 blur-2xl pointer-events-none"></div>
            </div>

            {/* Account Details Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <div className="w-2 h-5 bg-emerald-500 rounded-full"></div>
                    Thông Tin Khách Hàng
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Email / Tài khoản</p>
                        <p className="font-semibold text-slate-800 text-sm break-all">{customer.email || '—'}</p>
                    </div>
                    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Điện thoại</p>
                        <p className="font-semibold text-slate-800 text-sm">{customer.phone || (customer.contacts && customer.contacts.length > 0 ? customer.contacts[0].phone : '—') || '—'}</p>
                    </div>
                    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Mã số thuế</p>
                        <p className="font-semibold text-slate-800 text-sm">{customer.taxCode || '—'}</p>
                    </div>
                    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Địa chỉ</p>
                        <p className="font-medium text-slate-800 text-sm line-clamp-2">{customer.address || '—'}</p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Công Nợ Hiện Tại (Tính toán chính xác) */}
                <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 hover:border-emerald-400 p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125 duration-500 z-0 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors duration-300 ${
                                currentDebt > 0 
                                    ? 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-500 group-hover:text-white' 
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white'
                            }`}>
                                <Wallet size={24} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                                currentDebt > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                                {currentDebt > 0 ? 'Còn phải trả' : 'Đã tất toán'}
                            </span>
                        </div>

                        <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                            Công nợ hiện tại
                        </span>

                        <span className={`text-2xl sm:text-3xl font-black tracking-tight block ${currentDebt > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {formatCurrency(currentDebt > 0 ? currentDebt : 0)}
                        </span>

                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>Tổng mua: <strong className="text-slate-700">{formatCurrency(totalPurchased)}</strong></span>
                            <Link href="/portal/statement" className="text-emerald-600 hover:underline font-semibold flex items-center gap-0.5">
                                Sao kê &rarr;
                            </Link>
                        </div>
                    </div>
                </div>

                {/* 2. Tổng Đơn Hàng */}
                <Link href="/portal/sales-orders" className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 hover:border-indigo-400 p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125 duration-500 z-0 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                                <ShoppingCart size={24} />
                            </div>
                            <ArrowUpRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                            Tổng đơn hàng
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black tracking-tight text-slate-800">{ordersCount}</span>
                            <span className="text-xs text-slate-400 font-semibold">đơn</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                            Giá trị: <strong className="text-slate-700">{formatCurrency(ordersSum._sum.totalAmount || 0)}</strong>
                        </div>
                    </div>
                </Link>

                {/* 3. Tổng Hóa Đơn */}
                <Link href="/portal/invoices" className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 hover:border-emerald-400 p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125 duration-500 z-0 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                                <Receipt size={24} />
                            </div>
                            <ArrowUpRight size={18} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
                        </div>
                        <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                            Tổng hóa đơn
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black tracking-tight text-slate-800">{invoicesCount}</span>
                            <span className="text-xs text-slate-400 font-semibold">hóa đơn</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                            Đã thanh toán: <strong className="text-emerald-600">{formatCurrency(totalPaid)}</strong>
                        </div>
                    </div>
                </Link>

                {/* 4. Tổng Báo Giá */}
                <Link href="/portal/quotes" className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 hover:border-sky-400 p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-125 duration-500 z-0 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300">
                                <FileText size={24} />
                            </div>
                            <ArrowUpRight size={18} className="text-slate-300 group-hover:text-sky-600 transition-colors" />
                        </div>
                        <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                            Tổng báo giá
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black tracking-tight text-slate-800">{estimatesCount}</span>
                            <span className="text-xs text-slate-400 font-semibold">báo giá</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                            Giá trị khả dụng: <strong className="text-slate-700">{formatCurrency(estimatesSum._sum.totalAmount || 0)}</strong>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Financial Insights (Chart) */}
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                                <TrendingUp size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Doanh số 12 Tháng</h2>
                                <p className="text-xs text-slate-500 font-medium">Thống kê mua sắm và thanh toán của bạn theo thời gian</p>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 text-xs font-semibold">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                <span className="text-slate-600">Mua hàng</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                                <span className="text-slate-600">Thanh toán</span>
                            </div>
                        </div>
                    </div>
                    <FinancialChartWrapper data={chartData} />
                </div>

                {/* Recent Activities */}
                <div className="space-y-8">
                    {/* Recent Orders */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <div className="w-2 h-5 bg-indigo-500 rounded-full"></div>
                                Đơn Hàng Mới Nhất
                            </h2>
                            <Link href="/portal/sales-orders" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                                Xem tất cả &rarr;
                            </Link>
                        </div>

                        {recentOrders.length === 0 ? (
                            <div className="text-center py-8">
                                <ShoppingCart className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                                <p className="text-xs text-slate-500 font-medium">Chưa có đơn hàng nào.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentOrders.map(order => (
                                    <div key={order.id} className="group flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-3 px-3 rounded-xl transition-colors">
                                        <div>
                                            <a href={`/public/sales/order/${order.id}`} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 group-hover:text-indigo-700 text-sm flex items-center gap-1">
                                                {order.code}
                                            </a>
                                            <p className="text-xs text-slate-400 font-medium">{new Date(order.date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-800 text-sm mb-1">{formatCurrency(order.totalAmount)}</p>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${statusMap[order.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                                {statusMap[order.status]?.label || order.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Invoices */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <div className="w-2 h-5 bg-emerald-500 rounded-full"></div>
                                Hóa Đơn Gần Đây
                            </h2>
                            <Link href="/portal/invoices" className="text-xs font-semibold text-emerald-600 hover:text-emerald-800">
                                Xem tất cả &rarr;
                            </Link>
                        </div>

                        {recentInvoices.length === 0 ? (
                            <div className="text-center py-8">
                                <Receipt className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                                <p className="text-xs text-slate-500 font-medium">Chưa có hóa đơn nào.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentInvoices.map(invoice => (
                                    <div key={invoice.id} className="group flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-3 px-3 rounded-xl transition-colors">
                                        <div>
                                            <a href={`/public/sales/invoice/${invoice.id}`} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-600 group-hover:text-emerald-700 text-sm flex items-center gap-1">
                                                {invoice.code}
                                            </a>
                                            <p className="text-xs text-slate-400 font-medium">{new Date(invoice.date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-800 text-sm mb-1">{formatCurrency(invoice.totalAmount)}</p>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${statusMap[invoice.status]?.color || 'bg-slate-100 text-slate-600'}`}>
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
