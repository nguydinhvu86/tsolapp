'use client';

import React, { useState } from 'react';
import { Search, TrendingUp, TrendingDown, Minus, Sparkles, Trophy, Users, Shield, Edit3, Target, DollarSign, Award, PlusCircle } from 'lucide-react';
import { CriteriaKey, LeaderboardMode } from '../actions';

interface Props {
    mode: LeaderboardMode;
    leaderboard: any[];
    criteria: CriteriaKey;
    currentUserId?: string;
    currentUserRole?: string;
    onCheerUser?: (userName: string, userId: string) => void;
    onCheerTeam?: (groupName: string, groupId: string) => void;
    onViewProfile?: (userId: string) => void;
    onEditGroup?: (group: any) => void;
    onCreateGroup?: () => void;
}

export function RankListTable({
    mode,
    leaderboard = [],
    criteria,
    currentUserId,
    currentUserRole,
    onCheerUser,
    onCheerTeam,
    onViewProfile,
    onEditGroup,
    onCreateGroup
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'MANAGER';

    const formatVND = (num: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num || 0);
    };

    const formatScore = (item: any) => {
        if (!item) return '0';
        switch (criteria) {
            case 'REVENUE':
                return formatVND(item.score || 0);
            case 'CUSTOMERS':
                return `${item.score || 0} Khách hàng`;
            case 'LEADS':
                return `${item.score || 0} Cơ hội`;
            case 'ESTIMATES':
                return `${item.score || 0} Báo giá`;
            case 'CONVERSION_RATE':
                return `${item.score || 0}% Chốt`;
            default:
                return `${item.score || 0}`;
        }
    };

    const filteredList = (leaderboard || []).filter(item => {
        if (!item) return false;
        const q = (searchQuery || '').toLowerCase().trim();
        if (!q) return true;

        if (mode === 'INDIVIDUAL') {
            const name = (item.user?.name || '').toLowerCase();
            const email = (item.user?.email || '').toLowerCase();
            const dept = (item.user?.employeeProfile?.department || item.user?.role || '').toLowerCase();
            return name.includes(q) || email.includes(q) || dept.includes(q);
        } else {
            const name = (item.group?.name || '').toLowerCase();
            const slogan = (item.group?.slogan || '').toLowerCase();
            const leader = (item.group?.leader?.name || '').toLowerCase();
            return name.includes(q) || slogan.includes(q) || leader.includes(q);
        }
    });

    return (
        <div 
            className="rounded-3xl p-5 shadow-sm border space-y-4"
            style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
        >
            {/* Header & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                        <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                            {mode === 'INDIVIDUAL' ? 'Bảng Xếp Hạng Cá Nhân Toàn Công Ty' : 'Bảng Xếp Hạng Các Đội Nhóm Thi Đua'}
                        </h3>
                        <p className="text-xs text-slate-400">
                            {filteredList.length} {mode === 'INDIVIDUAL' ? 'chiến binh đang tranh tài' : 'đội nhóm tham gia'}
                        </p>
                    </div>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={mode === 'INDIVIDUAL' ? "Tìm theo tên, email, phòng ban..." : "Tìm tên đội, slogan, trưởng nhóm..."}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                            <th className="py-2.5 px-2 w-12 text-center">Hạng</th>
                            <th className="py-2.5 px-2.5">{mode === 'INDIVIDUAL' ? 'Chiến Binh' : 'Đội Nhóm Thi Đua'}</th>
                            {mode === 'TEAM' && <th className="py-2.5 px-2 hidden lg:table-cell">Thành Viên</th>}
                            <th className="py-2.5 px-2 text-right">Thành Tích</th>
                            <th className="py-2.5 px-2 text-center hidden sm:table-cell">Tiến Độ</th>
                            <th className="py-2.5 px-2 text-right">Cổ Vũ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredList.length > 0 ? (
                            filteredList.map((item: any, idx: number) => {
                                const isCurrentUser = mode === 'INDIVIDUAL' && item.user?.id === currentUserId;

                                return (
                                    <tr 
                                        key={mode === 'INDIVIDUAL' ? (item.user?.id || idx) : (item.group?.id || idx)}
                                        className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${isCurrentUser ? 'bg-emerald-50/60 dark:bg-emerald-950/20 font-semibold' : ''}`}
                                    >
                                        {/* Rank Column */}
                                        <td className="py-2.5 px-2 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                {item.rank === 1 ? (
                                                    <span className="w-6 h-6 rounded-lg bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center shadow-xs">
                                                        🥇
                                                    </span>
                                                ) : item.rank === 2 ? (
                                                    <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center shadow-2xs">
                                                        🥈
                                                    </span>
                                                ) : item.rank === 3 ? (
                                                    <span className="w-6 h-6 rounded-lg bg-amber-700 text-amber-100 font-black text-xs flex items-center justify-center shadow-2xs">
                                                        🥉
                                                    </span>
                                                ) : (
                                                    <span className="font-bold text-slate-500 text-[11px]">
                                                        #{item.rank || (idx + 1)}
                                                    </span>
                                                )}

                                                {/* Delta indicator */}
                                                <div className="text-[9px] mt-0.5">
                                                    {(item.delta || 0) > 0 ? (
                                                        <span className="text-emerald-500 font-bold flex items-center">
                                                            <TrendingUp className="w-2.5 h-2.5 inline" />+{item.delta}
                                                        </span>
                                                    ) : (item.delta || 0) < 0 ? (
                                                        <span className="text-rose-500 font-bold flex items-center">
                                                            <TrendingDown className="w-2.5 h-2.5 inline" />{item.delta}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">
                                                            <Minus className="w-2 h-2 inline" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Target Info Column */}
                                        <td className="py-2.5 px-2.5">
                                            {mode === 'INDIVIDUAL' ? (
                                                <div className="flex items-center gap-2.5">
                                                    <img
                                                        src={item.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user?.name || 'U')}&background=059669&color=fff&size=72`}
                                                        alt={item.user?.name || 'User'}
                                                        onError={(e: any) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user?.name || 'U')}&background=059669&color=fff&size=72`; }}
                                                        onClick={() => item.user?.id && onViewProfile && onViewProfile(item.user.id)}
                                                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                                                    />
                                                    <div className="min-w-0">
                                                        <div 
                                                            onClick={() => item.user?.id && onViewProfile && onViewProfile(item.user.id)}
                                                            className="font-bold text-slate-900 dark:text-slate-100 truncate hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer flex items-center gap-1.5 text-xs"
                                                        >
                                                            <span>{item.user?.name || 'Chiến binh'}</span>
                                                            {isCurrentUser && (
                                                                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[8px] font-black">
                                                                    Bạn
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 truncate">
                                                            {item.user?.employeeProfile?.department || item.user?.role || ''}
                                                        </div>
                                                        {item.badge && (
                                                            <span className="inline-block px-1.5 py-0.2 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold mt-0.5 border border-amber-200/60 dark:border-amber-800/60">
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2.5">
                                                    <div 
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-2xs border border-slate-200 dark:border-slate-700"
                                                        style={{ backgroundColor: `${item.group?.color || '#059669'}20` }}
                                                    >
                                                        {item.group?.avatar || '🛡️'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5 text-xs">
                                                            <span>{item.group?.name || 'Đội thi đua'}</span>
                                                            {isAdmin && onEditGroup && item.group && (
                                                                <button
                                                                    onClick={() => onEditGroup(item.group)}
                                                                    className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                                                    title="Chỉnh sửa nhóm"
                                                                >
                                                                    <Edit3 className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        {item.group?.slogan && (
                                                            <div className="text-[10px] text-slate-500 italic truncate">
                                                                "{item.group.slogan}"
                                                            </div>
                                                        )}
                                                        {item.group?.leader && (
                                                            <div className="text-[9px] text-slate-400 mt-0.5">
                                                                👑 Leader: <span className="font-bold text-slate-600 dark:text-slate-300">{item.group.leader.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>

                                        {/* Members Column (Team mode only) */}
                                        {mode === 'TEAM' && (
                                            <td className="py-2.5 px-2 hidden lg:table-cell">
                                                <div className="flex items-center">
                                                    <div className="flex -space-x-1.5 overflow-hidden py-0.5">
                                                        {(item.group?.members || []).slice(0, 4).map((m: any, mIdx: number) => {
                                                            const u = m.user || m;
                                                            return (
                                                                <img
                                                                    key={mIdx}
                                                                    src={u?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name || 'U')}&background=059669&color=fff&size=40`}
                                                                    alt={u?.name || 'Member'}
                                                                    title={u?.name || 'Member'}
                                                                    onClick={() => u?.id && onViewProfile && onViewProfile(u.id)}
                                                                    className="inline-block h-5 w-5 rounded-full ring-1 ring-white dark:ring-slate-900 object-cover cursor-pointer hover:scale-110 transition-transform"
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                    {(item.group?.members || []).length > 4 && (
                                                        <span className="text-[10px] text-slate-400 font-bold ml-1">
                                                            +{(item.group.members.length - 4)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        )}

                                        {/* Score Column */}
                                        <td className="py-2.5 px-2 text-right">
                                            <div className="font-black text-slate-900 dark:text-slate-100 text-xs truncate">
                                                {formatScore(item)}
                                            </div>
                                            {mode === 'TEAM' && item.stats?.targetRevenue > 0 && (
                                                <div className="text-[9px] text-slate-400">
                                                    Mục tiêu: {formatVND(item.stats.targetRevenue)}
                                                </div>
                                            )}
                                        </td>

                                        {/* Progress Bar Column */}
                                        <td className="py-2.5 px-2 text-center hidden sm:table-cell">
                                            <div className="w-20 mx-auto space-y-0.5">
                                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{ 
                                                            width: `${mode === 'TEAM' && item.stats?.targetRevenue > 0 ? Math.min(100, item.stats.targetProgress || 0) : (item.percentageOfTop || 0)}%`,
                                                            background: mode === 'TEAM' && (item.stats?.targetProgress || 0) >= 100 
                                                                ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' 
                                                                : 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)'
                                                        }}
                                                    />
                                                </div>
                                                <div className="text-[9px] text-slate-400 font-semibold">
                                                    {mode === 'TEAM' && item.stats?.targetRevenue > 0 
                                                        ? `${item.stats?.targetProgress || 0}% KPI` 
                                                        : `${item.percentageOfTop || 0}% Top 1`}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Cheer Action Column */}
                                        <td className="py-2.5 px-2 text-right">
                                            <button
                                                onClick={() => {
                                                    if (mode === 'INDIVIDUAL' && onCheerUser && item.user) {
                                                        onCheerUser(item.user.name, item.user.id);
                                                    } else if (mode === 'TEAM' && onCheerTeam && item.group) {
                                                        onCheerTeam(item.group.name, item.group.id);
                                                    }
                                                }}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400 font-bold text-[10px] text-slate-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer"
                                                title="Cổ vũ & Vinh danh trên bảng tin"
                                            >
                                                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                                <span className="hidden sm:inline">Cổ vũ</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={mode === 'TEAM' ? 6 : 5} className="py-12 text-center text-slate-400">
                                    {mode === 'TEAM' ? (
                                        <div className="space-y-3">
                                            <Shield className="w-10 h-10 mx-auto text-emerald-400 opacity-60" />
                                            <div>
                                                <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                                                    Chưa có nhóm thi đua nào được thành lập.
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Hãy tạo nhóm thi đua mới để cùng đồng đội tranh tài và bứt phá!
                                                </p>
                                            </div>
                                            {isAdmin && onCreateGroup && (
                                                <button
                                                    onClick={onCreateGroup}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                                                >
                                                    <PlusCircle className="w-4 h-4" />
                                                    <span>Tạo nhóm thi đua ngay</span>
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs">Không có dữ liệu phù hợp với tìm kiếm.</p>
                                    )}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
