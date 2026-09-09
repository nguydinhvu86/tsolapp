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
    Activity
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

    // Lấy số liệu thống kê
    const [totalCampaigns, activeCampaigns, totalForms, totalParticipants, checkinParticipants] = await Promise.all([
        prisma.marketingCampaign.count({ where: filter }),
        prisma.marketingCampaign.count({ where: { ...filter, status: 'ACTIVE' } }),
        prisma.marketingForm.count({ where: { campaign: filter } }),
        prisma.marketingParticipant.count({ where: { campaign: filter } }),
        prisma.marketingParticipant.count({ where: { campaign: filter, status: 'ATTENDED' } })
    ]);

    const checkinRate = totalParticipants > 0 ? Math.round((checkinParticipants / totalParticipants) * 100) : 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
                        <Megaphone className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">Tổng Quan Marketing</h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                                <Activity className="w-3.5 h-3.5" /> Live Dashboard
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Theo dõi hiệu quả các chiến dịch tiếp thị, biểu mẫu thu lead và tỷ lệ check-in sự kiện</p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Link
                        href="/marketing/campaigns"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-colors shadow-xs"
                    >
                        <Megaphone className="w-4 h-4" /> Quản Lý Chiến Dịch
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng chiến dịch</div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Megaphone className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-mono font-bold text-slate-900">{totalCampaigns}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                                {activeCampaigns} đang diễn ra
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Form đăng ký</div>
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-mono font-bold text-purple-600">{totalForms}</div>
                        <p className="text-xs text-slate-500 mt-2">Biểu mẫu thu thập dữ liệu Lead</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng người đăng ký</div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-mono font-bold text-emerald-600">{totalParticipants}</div>
                        <p className="text-xs text-slate-500 mt-2">Dữ liệu khách tham dự sự kiện</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đã Check-in</div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <CheckSquare className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-mono font-bold text-amber-600">{checkinParticipants}</span>
                            <span className="text-xs font-mono font-semibold text-slate-500">({checkinRate}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(checkinRate, 100)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                    href="/marketing/campaigns"
                    className="group bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:border-purple-200 hover:shadow-md transition-all flex flex-col justify-between"
                >
                    <div className="space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                            <Megaphone className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                                Chiến Dịch & Sự Kiện
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Quản lý ngân sách, lịch trình triển lãm, hội thảo và các chiến dịch quảng bá.
                            </p>
                        </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
                        <span>Truy cập chiến dịch</span>
                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </Link>

                <Link
                    href="/marketing/forms"
                    className="group bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:border-purple-200 hover:shadow-md transition-all flex flex-col justify-between"
                >
                    <div className="space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                                Thiết Kế Biểu Mẫu (Forms)
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Tạo landing page đăng ký, lấy mã nhúng HTML/Iframe thu thập data khách hàng.
                            </p>
                        </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
                        <span>Thiết kế form ngay</span>
                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </Link>

                <Link
                    href="/marketing/participants"
                    className="group bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:border-purple-200 hover:shadow-md transition-all flex flex-col justify-between"
                >
                    <div className="space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                                Danh Sách Người Tham Gia
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Điểm danh check-in bằng mã QR, lọc khách theo chiến dịch và xuất file Excel.
                            </p>
                        </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
                        <span>Quản lý dữ liệu</span>
                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </Link>
            </div>
        </div>
    );
}
