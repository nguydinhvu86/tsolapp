import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getProfile, getEnhancedProfileStats } from './actions';
import { ProfileClient } from './ProfileClient';

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        redirect('/login');
    }

    const [profile, stats] = await Promise.all([
        getProfile(),
        getEnhancedProfileStats()
    ]);

    return (
        <div className="space-y-6 w-full">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50"></span>
                        Hồ Sơ Cá Nhân
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Quản lý thông tin tài khoản, bảo mật 2 lớp (2FA) và tổng quan hiệu suất làm việc
                    </p>
                </div>
            </div>
            <ProfileClient initialProfile={profile} initialStats={stats} />
        </div>
    );
}

