import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/app/components/ui/Card";
import { Megaphone, Users, CheckSquare, FileText } from "lucide-react";

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Tổng quan Marketing | ContractMgr',
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
    const totalCampaigns = await prisma.marketingCampaign.count({ where: filter });
    const activeCampaigns = await prisma.marketingCampaign.count({ where: { ...filter, status: 'ONGOING' } });
    const totalForms = await prisma.marketingForm.count({ where: { campaign: filter } });
    const totalParticipants = await prisma.marketingParticipant.count({ where: { campaign: filter } });
    const checkinParticipants = await prisma.marketingParticipant.count({ where: { campaign: filter, status: 'ATTENDED' } });

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2 mb-6">
                <h2 className="text-3xl font-bold tracking-tight text-slate-800">Tổng quan Marketing</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-white border-0 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <Megaphone size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Chiến dịch</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-slate-800">{totalCampaigns}</h3>
                            <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                {activeCampaigns} đang chạy
                            </span>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-white border-0 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
                        <FileText size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Form đăng ký</p>
                        <h3 className="text-3xl font-bold text-slate-800">{totalForms}</h3>
                    </div>
                </Card>

                <Card className="p-6 bg-white border-0 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <Users size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Tổng người đăng ký</p>
                        <h3 className="text-3xl font-bold text-slate-800">{totalParticipants}</h3>
                    </div>
                </Card>

                <Card className="p-6 bg-white border-0 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <CheckSquare size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Đã Check-in</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-slate-800">{checkinParticipants}</h3>
                            {totalParticipants > 0 && (
                                <span className="text-sm font-medium text-slate-500">
                                    ({Math.round((checkinParticipants/totalParticipants)*100)}%)
                                </span>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
            
            <Card className="p-8 mt-8 border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Bảng tin nhanh</h3>
                <p className="text-slate-600 mb-4">Mời bạn chọn chức năng tiếp theo từ thanh điều hướng để làm việc với các Module thuộc phòng Marketing.</p>
                <div className="flex gap-4">
                    <a href="/marketing/campaigns" className="px-6 py-2 bg-white text-indigo-600 font-medium rounded-lg shadow hover:shadow-md transition text-sm">
                        Quản lý Chiến dịch
                    </a>
                    <a href="/marketing/participants" className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow hover:bg-indigo-700 transition text-sm">
                        Quản lý Data Khách
                    </a>
                </div>
            </Card>
        </div>
    );
}
