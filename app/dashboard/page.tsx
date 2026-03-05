import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { DashboardClient } from './DashboardClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        redirect('/login');
    }

    const now = new Date();

    // Tháng hiện tại (Ngày 1 tháng này -> hiện tại)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Tháng trước (Ngày 1 tháng trước -> ngày cuối tháng trước)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Tính Doanh Thu Tháng (Dựa trên Hóa Đơn Bán Hàng đã PHÁT HÀNH - ISSUED)
    const [
        currentMonthInvoices,
        lastMonthInvoices,
        currentMonthInvoiceCount,
        lastMonthInvoiceCount,
        currentMonthPayments,
        lastMonthPayments,
        userTasks
    ] = await Promise.all([
        prisma.salesInvoice.aggregate({
            _sum: { totalAmount: true },
            where: {
                status: { notIn: ['DRAFT', 'CANCELLED'] },
                date: { gte: currentMonthStart }
            }
        }),
        prisma.salesInvoice.aggregate({
            _sum: { totalAmount: true },
            where: {
                status: { notIn: ['DRAFT', 'CANCELLED'] },
                date: { gte: lastMonthStart, lte: lastMonthEnd }
            }
        }),
        // Đếm số lượng Hóa Đơn Đã Phát Hành (Ghi nhận công nợ)
        prisma.salesInvoice.count({
            where: {
                date: { gte: currentMonthStart },
                status: { notIn: ['DRAFT', 'CANCELLED'] }
            }
        }),
        prisma.salesInvoice.count({
            where: {
                date: { gte: lastMonthStart, lte: lastMonthEnd },
                status: { notIn: ['DRAFT', 'CANCELLED'] }
            }
        }),
        // Tính tổng tiền Đã Thu (Thực thu)
        prisma.salesPayment.aggregate({
            _sum: { amount: true },
            where: {
                date: { gte: currentMonthStart }
            }
        }),
        prisma.salesPayment.aggregate({
            _sum: { amount: true },
            where: {
                date: { gte: lastMonthStart, lte: lastMonthEnd }
            }
        }),
        prisma.task.findMany({
            where: {
                OR: [
                    { assignees: { some: { userId: session.user.id } } },
                    { observers: { some: { userId: session.user.id } } },
                    { creatorId: session.user.id }
                ],
                status: { notIn: ['DONE', 'CANCELLED'] }
            },
            orderBy: { dueDate: 'asc' }, // Sắp xếp theo hạn chót gần nhất
            take: 30, // Lấy dư để cuộn
            include: {
                assignees: { include: { user: { select: { id: true, name: true } } } },
                observers: { include: { user: { select: { id: true, name: true } } } },
                customer: { select: { name: true } }
            }
        })
    ]);

    const revenueThisMonth = currentMonthInvoices._sum.totalAmount || 0;
    const revenueLastMonth = lastMonthInvoices._sum.totalAmount || 0;

    const paymentsThisMonth = currentMonthPayments._sum.amount || 0;
    const paymentsLastMonth = lastMonthPayments._sum.amount || 0;

    const debtThisMonth = Math.max(0, revenueThisMonth - paymentsThisMonth);
    const debtLastMonth = Math.max(0, revenueLastMonth - paymentsLastMonth);

    const { getDashboardStats } = await import('@/app/dashboard/actions');
    const stats = await getDashboardStats(session.user.id);

    return (
        <div className="p-4 md:p-8 pt-6 min-h-screen">
            <DashboardClient
                kpiData={{
                    revenueThisMonth,
                    revenueLastMonth,
                    invoicesThisMonth: currentMonthInvoiceCount,
                    invoicesLastMonth: lastMonthInvoiceCount,
                    paymentsThisMonth,
                    paymentsLastMonth,
                    debtThisMonth,
                    debtLastMonth,
                    cashFlow: stats?.financialMetrics?.cashFlow || []
                }}
                userTasks={userTasks}
                quotes={stats?.chartDataSources?.quotes || []}
                invoices={stats?.chartDataSources?.invoices || []}
            />
        </div>
    );
}
