import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
    Megaphone,
    Users,
    CheckSquare,
    FileText,
    Layers,
    ArrowUpRight,
    Calendar,
    Target,
    Activity,
    Plus,
    UserCheck,
    Clock,
    DollarSign,
    Sparkles
} from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Tổng quan Marketing | T-Solutions',
};

export default async function MarketingDashboard() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    const { user } = session;
    const permissions = user.permissions as string[] || [];
    const isAdmin = user.role === 'ADMIN';

    if (!isAdmin && !permissions.includes('MARKETING_VIEW') && !permissions.includes('MARKETING_VIEW_ALL') && !permissions.includes('MARKETING_VIEW_OWN')) {
        redirect("/dashboard");
    }

    let filter = {};
    if (!isAdmin && !permissions.includes('MARKETING_VIEW_ALL')) {
        if (permissions.includes('MARKETING_VIEW_OWN')) {
            filter = { creatorId: user.id };
        }
    }

    const [
        totalCampaigns,
        activeCampaigns,
        totalForms,
        activeForms,
        totalCategories,
        totalParticipants,
        checkinParticipants,
        recentCampaigns,
        recentParticipants
    ] = await Promise.all([
        prisma.marketingCampaign.count({ where: filter }),
        prisma.marketingCampaign.count({ where: { ...filter, status: 'ACTIVE' } }),
        prisma.marketingForm.count({ where: { campaign: filter } }),
        prisma.marketingForm.count({ where: { campaign: filter, isActive: true } }),
        prisma.marketingCategory.count(),
        prisma.marketingParticipant.count({ where: { campaign: filter } }),
        prisma.marketingParticipant.count({ where: { campaign: filter, status: 'ATTENDED' } }),
        prisma.marketingCampaign.findMany({
            where: filter,
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                category: true,
                _count: { select: { participants: true, forms: true } }
            }
        }),
        prisma.marketingParticipant.findMany({
            where: { campaign: filter },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                campaign: { select: { id: true, name: true, code: true } },
                form: { select: { id: true, title: true } }
            }
        })
    ]);

    const checkinRate = totalParticipants > 0 ? Math.round((checkinParticipants / totalParticipants) * 100) : 0;

    const formatMoney = (val?: number | null) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    return (
        <div className="w-full space-y-5 font-sans text-slate-800 pb-8">
            {/* 1. Standard ERP Header */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                            <Megaphone size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                    Tiếp Thị & Sự Kiện
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Live Dashboard
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5 mt-1">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight m-0">
                                    Tổng Quan Marketing & Sự Kiện
                                </h1>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 m-0">
                                Theo dõi hiệu quả chiến dịch quảng bá, biểu mẫu thu thập khách hàng tiềm năng (Lead) và tỷ lệ điểm danh check-in sự kiện
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href="/marketing/categories"
                            className="inline-flex items-center gap-1.5 h-[36px] bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-3 rounded-lg text-xs font-semibold transition-all no-underline"
                        >
                            <Target size={14} className="text-slate-500" />
                            <span>Phân Loại ({totalCategories})</span>
                        </Link>
                        <Link
                            href="/marketing/forms"
                            className="inline-flex items-center gap-1.5 h-[36px] bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-3 rounded-lg text-xs font-semibold transition-all no-underline"
                        >
                            <FileText size={14} className="text-indigo-600" />
                            <span>Biểu Mẫu ({totalForms})</span>
                        </Link>
                        <Link
                            href="/marketing/campaigns"
                            className="inline-flex items-center gap-1.5 h-[36px] bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 rounded-lg text-xs font-semibold shadow-sm transition-all no-underline"
                        >
                            <Megaphone size={14} />
                            <span>Quản Lý Chiến Dịch</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* 2. KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <Link
                    href="/marketing/campaigns"
                    className="bg-white p-4 rounded-xl border border-slate-200/80 hover:border-indigo-300 shadow-sm flex items-center justify-between transition-all no-underline group"
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Tổng Chiến Dịch
                        </p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h3 className="text-2xl font-bold text-slate-900 tabular-nums m-0">
                                {totalCampaigns}
                            </h3>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                                {activeCampaigns} đang diễn ra
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 m-0 group-hover:text-indigo-600 transition-colors">
                            Chiến dịch truyền thông & sự kiện
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                        <Megaphone size={19} />
                    </div>
                </Link>

                <Link
                    href="/marketing/forms"
                    className="bg-white p-4 rounded-xl border border-slate-200/80 hover:border-purple-300 shadow-sm flex items-center justify-between transition-all no-underline group"
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Biểu Mẫu Đăng Ký
                        </p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h3 className="text-2xl font-bold text-purple-600 tabular-nums m-0">
                                {totalForms}
                            </h3>
                            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200/60 px-1.5 py-0.5 rounded">
                                {activeForms} đang mở
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 m-0 group-hover:text-purple-600 transition-colors">
                            Landing page thu thập dữ liệu Lead
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
                        <FileText size={19} />
                    </div>
                </Link>

                <Link
                    href="/marketing/participants"
                    className="bg-white p-4 rounded-xl border border-slate-200/80 hover:border-emerald-300 shadow-sm flex items-center justify-between transition-all no-underline group"
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Tổng Người Đăng Ký
                        </p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h3 className="text-2xl font-bold text-emerald-600 tabular-nums m-0">
                                {totalParticipants}
                            </h3>
                            <span className="text-[11px] font-medium text-slate-500">
                                khách hàng
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 m-0 group-hover:text-emerald-600 transition-colors">
                            Dữ liệu khách đăng ký tham dự sự kiện
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 shrink-0">
                        <Users size={19} />
                    </div>
                </Link>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                                Đã Điểm Danh Check-in
                            </p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <h3 className="text-2xl font-bold text-amber-600 tabular-nums m-0">
                                    {checkinParticipants}
                                </h3>
                                <span className="text-xs font-bold text-slate-600 tabular-nums">
                                    ({checkinRate}%)
                                </span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shrink-0">
                            <CheckSquare size={19} />
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                        <div
                            className="bg-amber-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(checkinRate, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* 3. Functional Modules Navigation Grid (4 Cards Full-Width) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <Link
                    href="/marketing/campaigns"
                    className="group bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between no-underline"
                >
                    <div className="space-y-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                            <Megaphone size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors m-0">
                                Chiến Dịch & Sự Kiện
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed m-0">
                                Quản lý ngân sách, lịch trình triển lãm, hội thảo và các chiến dịch quảng bá.
                            </p>
                        </div>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                        <span>Truy cập chiến dịch</span>
                        <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </Link>

                <Link
                    href="/marketing/categories"
                    className="group bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between no-underline"
                >
                    <div className="space-y-2.5">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                            <Target size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors m-0">
                                Phân Loại Sự Kiện
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed m-0">
                                Thiết lập danh mục loại hình sự kiện, hội thảo, triển lãm và kênh quảng cáo.
                            </p>
                        </div>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                        <span>Quản lý danh mục</span>
                        <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </Link>

                <Link
                    href="/marketing/forms"
                    className="group bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between no-underline"
                >
                    <div className="space-y-2.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors m-0">
                                Thiết Kế Biểu Mẫu (Forms)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed m-0">
                                Tạo landing page đăng ký, cấu hình trường thông tin thu thập dữ liệu khách hàng.
                            </p>
                        </div>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                        <span>Thiết kế biểu mẫu</span>
                        <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </Link>

                <Link
                    href="/marketing/participants"
                    className="group bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between no-underline"
                >
                    <div className="space-y-2.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                            <Users size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors m-0">
                                Danh Sách Người Tham Gia
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed m-0">
                                Điểm danh check-in khách tham dự, gửi nhắc hẹn và xuất báo cáo CSV/Excel.
                            </p>
                        </div>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                        <span>Quản lý người tham gia</span>
                        <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </Link>
            </div>

            {/* 4. Recent Campaigns & Recent Participants (Full-Width 2-Column Activity Tables) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Recent Campaigns (7 cols) */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Megaphone size={15} className="text-indigo-600" />
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider m-0">
                                Chiến Dịch Gần Đây
                            </h3>
                        </div>
                        <Link
                            href="/marketing/campaigns"
                            className="text-xs font-semibold text-indigo-600 hover:underline no-underline"
                        >
                            Xem tất cả →
                        </Link>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500">
                                    <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px]">Chiến Dịch</th>
                                    <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px]">Phân Loại</th>
                                    <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-right">Ngân Sách</th>
                                    <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-center">Khách ĐK</th>
                                    <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-center">Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentCampaigns.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-slate-400">
                                            Chưa có chiến dịch nào được khởi tạo.
                                        </td>
                                    </tr>
                                ) : (
                                    recentCampaigns.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-3.5 py-2.5">
                                                <Link
                                                    href={`/marketing/campaigns/${c.id}`}
                                                    className="font-bold text-slate-900 hover:text-indigo-600 no-underline block"
                                                >
                                                    {c.name}
                                                </Link>
                                                <span className="text-[11px] text-slate-400 tabular-nums">{c.code}</span>
                                            </td>
                                            <td className="px-3.5 py-2.5">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                                                    {c.category?.name || '---'}
                                                </span>
                                            </td>
                                            <td className="px-3.5 py-2.5 text-right font-semibold text-slate-800 tabular-nums">
                                                {formatMoney(c.budget)}
                                            </td>
                                            <td className="px-3.5 py-2.5 text-center font-bold text-indigo-600 tabular-nums">
                                                {c._count?.participants || 0}
                                            </td>
                                            <td className="px-3.5 py-2.5 text-center">
                                                {c.status === 'ACTIVE' ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                                        Đang diễn ra
                                                    </span>
                                                ) : c.status === 'COMPLETED' ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                                                        Đã kết thúc
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                        Bản nháp
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Participants (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users size={15} className="text-emerald-600" />
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider m-0">
                                Người Đăng Ký Mới Nhất
                            </h3>
                        </div>
                        <Link
                            href="/marketing/participants"
                            className="text-xs font-semibold text-indigo-600 hover:underline no-underline"
                        >
                            Xem tất cả →
                        </Link>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500">
                                    <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px]">Khách Hàng</th>
                                    <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px]">Chiến Dịch</th>
                                    <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px] text-center">Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentParticipants.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="py-10 text-center text-slate-400">
                                            Chưa có khách đăng ký nào.
                                        </td>
                                    </tr>
                                ) : (
                                    recentParticipants.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-3.5 py-2.5">
                                                <div className="font-bold text-slate-900">{p.name || '---'}</div>
                                                <div className="text-[11px] text-slate-500 tabular-nums">{p.phone || p.email || '---'}</div>
                                            </td>
                                            <td className="px-3.5 py-2.5">
                                                <div className="font-medium text-slate-700 truncate max-w-[160px]" title={p.campaign?.name}>
                                                    {p.campaign?.name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 tabular-nums">
                                                    {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                                                </div>
                                            </td>
                                            <td className="px-3.5 py-2.5 text-center">
                                                {p.status === 'ATTENDED' ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                                        Đã Check-in
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                                                        Đã đăng ký
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
