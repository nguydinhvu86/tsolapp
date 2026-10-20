'use client';

import React, { useEffect, useState } from 'react';
import { X, Trophy, Award, Flame, Target, DollarSign, Users, Sparkles, Mail, Phone, Briefcase, Building, ShieldCheck, Heart, MessageSquare, Loader2, Send } from 'lucide-react';
import { getUserSocialProfile } from '../actions';

interface Props {
    userId: string | null;
    onClose: () => void;
    onCheerUser?: (userName: string, userId: string) => void;
}

export function UserProfileModal({ userId, onClose, onCheerUser }: Props) {
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        setIsLoading(true);
        getUserSocialProfile(userId)
            .then(data => setProfile(data))
            .catch(err => console.error('Failed to load user profile:', err))
            .finally(() => setIsLoading(false));
    }, [userId]);

    if (!userId) return null;

    const formatVND = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val || 0);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all cursor-pointer"
                    title="Đóng"
                >
                    <X className="w-5 h-5" />
                </button>

                {isLoading ? (
                    <div className="p-16 flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                        <p className="text-xs text-slate-400 font-medium">Đang tải hồ sơ vinh danh...</p>
                    </div>
                ) : profile ? (
                    <div className="overflow-y-auto">
                        {/* Cover Banner */}
                        <div 
                            className="relative h-32 sm:h-36 w-full p-4 flex items-end justify-between"
                            style={{
                                background: profile.groupMembership?.group?.color 
                                    ? `linear-gradient(135deg, ${profile.groupMembership.group.color}dd 0%, #0f172a 100%)`
                                    : 'linear-gradient(135deg, #064e3b 0%, #0f172a 60%, #1e1b4b 100%)'
                            }}
                        >
                            <div className="flex items-center gap-2">
                                {profile.groupMembership?.group && (
                                    <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/30 flex items-center gap-1.5 shadow-sm">
                                        <span>{profile.groupMembership.group.avatar || '🛡️'}</span>
                                        <span>{profile.groupMembership.group.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Avatar & Main Info */}
                        <div className="px-6 pb-6 pt-0 relative">
                            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-14 mb-4 gap-4">
                                <div className="relative">
                                    <img
                                        src={profile.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.user.name || 'U')}&background=059669&color=fff&size=160`}
                                        alt={profile.user.name}
                                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white dark:border-slate-900 shadow-xl bg-slate-100 dark:bg-slate-800"
                                    />
                                    {profile.badges.length > 0 && (
                                        <div 
                                            className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-amber-400 text-slate-950 shadow-md border-2 border-white dark:border-slate-900"
                                            title="Chiến binh xuất sắc"
                                        >
                                            <Trophy className="w-4 h-4 fill-slate-950" />
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            if (onCheerUser) onCheerUser(profile.user.name, profile.user.id);
                                            onClose();
                                        }}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
                                    >
                                        <Sparkles className="w-4 h-4 text-amber-300" />
                                        <span>Vinh Danh / Cổ Vũ</span>
                                    </button>
                                </div>
                            </div>

                            {/* Name, Role & Bio */}
                            <div className="space-y-1 text-center sm:text-left">
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center justify-center sm:justify-start gap-2">
                                    <span>{profile.user.name}</span>
                                    {profile.user.role === 'ADMIN' && (
                                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-black uppercase tracking-wider">
                                            Admin
                                        </span>
                                    )}
                                </h3>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                                    {profile.user.employeeProfile?.position && (
                                        <span className="flex items-center gap-1">
                                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{profile.user.employeeProfile.position}</span>
                                        </span>
                                    )}
                                    {profile.user.employeeProfile?.department && (
                                        <span className="flex items-center gap-1">
                                            <Building className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{profile.user.employeeProfile.department}</span>
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{profile.user.email}</span>
                                    </span>
                                    {profile.user.employeeProfile?.phoneNumber && (
                                        <span className="flex items-center gap-1">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{profile.user.employeeProfile.phoneNumber}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Competition Group Banner if member */}
                            {profile.groupMembership?.group && (
                                <div 
                                    className="mt-4 p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs"
                                    style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="text-2xl">{profile.groupMembership.group.avatar || '🛡️'}</div>
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                                <span>Đội thi đua: {profile.groupMembership.group.name}</span>
                                                {profile.groupMembership.role === 'LEADER' && (
                                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                                                        👑 Đội Trưởng
                                                    </span>
                                                )}
                                            </div>
                                            {profile.groupMembership.group.slogan && (
                                                <div className="text-slate-500 italic text-[11px]">
                                                    "{profile.groupMembership.group.slogan}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Metric Stats Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                                        <DollarSign className="w-3 h-3 text-amber-500" />
                                        <span>Doanh Thu</span>
                                    </div>
                                    <div className="text-sm font-black text-slate-900 dark:text-slate-100 mt-1 truncate">
                                        {formatVND(profile.stats.revenue)}
                                    </div>
                                </div>

                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                                        <Users className="w-3 h-3 text-emerald-500" />
                                        <span>Khách Hàng</span>
                                    </div>
                                    <div className="text-sm font-black text-slate-900 dark:text-slate-100 mt-1">
                                        {profile.stats.customersCount}
                                    </div>
                                </div>

                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                                        <Target className="w-3 h-3 text-blue-500" />
                                        <span>Cơ Hội Thắng</span>
                                    </div>
                                    <div className="text-sm font-black text-slate-900 dark:text-slate-100 mt-1">
                                        {profile.stats.leadsWonCount} / {profile.stats.leadsCount}
                                    </div>
                                </div>

                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1">
                                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                                        <span>Cổ Vũ Nhận</span>
                                    </div>
                                    <div className="text-sm font-black text-rose-600 dark:text-rose-400 mt-1">
                                        {profile.totalReactionsReceived}
                                    </div>
                                </div>
                            </div>

                            {/* Badges / Wall of Fame */}
                            <div className="mt-5 space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <Award className="w-4 h-4 text-amber-500" />
                                    <span>Huy Hiệu & Danh Hiệu Đạt Được</span>
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {profile.badges.map((b: string, idx: number) => (
                                        <span 
                                            key={idx}
                                            className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold shadow-sm"
                                        >
                                            {b}
                                        </span>
                                    ))}
                                    {profile.badges.length === 0 && (
                                        <span className="text-xs text-slate-400 italic">Đang trên đường chinh phục các danh hiệu đầu tiên!</span>
                                    )}
                                </div>
                            </div>

                            {/* Recent Posts */}
                            {profile.recentPosts && profile.recentPosts.length > 0 && (
                                <div className="mt-5 space-y-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <MessageSquare className="w-4 h-4 text-purple-500" />
                                        <span>Chia Sẻ Gần Nhất Trên Bảng Tin</span>
                                    </h4>
                                    <div className="space-y-2">
                                        {profile.recentPosts.map((p: any) => (
                                            <div 
                                                key={p.id}
                                                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 line-clamp-2"
                                            >
                                                {p.content}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-400">Không tìm thấy dữ liệu.</div>
                )}
            </div>
        </div>
    );
}
