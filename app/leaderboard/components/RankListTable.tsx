'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Trophy, Star, Sparkles, MessageCircle, Heart, Search, Award, CheckCircle2 } from 'lucide-react';
import { CriteriaKey } from '../actions';

interface Props {
    leaderboard: any[];
    criteria: CriteriaKey;
    currentUserId?: string;
    onCheerUser?: (userName: string, userId: string) => void;
}

export function RankListTable({ leaderboard, criteria, currentUserId, onCheerUser }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredList = leaderboard.filter(item => {
        const name = (item.user.name || '').toLowerCase();
        const email = (item.user.email || '').toLowerCase();
        const dept = (item.user.employeeProfile?.department || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return name.includes(term) || email.includes(term) || dept.includes(term);
    });

    const formatCriteriaDetail = (item: any) => {
        switch (criteria) {
            case 'REVENUE':
                return (
                    <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(item.score)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {item.stats.invoicesCount} đơn hoàn tất
                        </div>
                    </div>
                );
            case 'CUSTOMERS':
                return (
                    <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {item.score} Khách hàng
                        </div>
                        <div className="text-[11px] text-slate-500">
                            Phụ trách & tạo mới
                        </div>
                    </div>
                );
            case 'LEADS':
                return (
                    <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {item.score} Cơ hội
                        </div>
                        <div className="text-[11px] text-emerald-600 font-medium">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(item.stats.pipelineValue)}
                        </div>
                    </div>
                );
            case 'ESTIMATES':
                return (
                    <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {item.score} Báo giá
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {item.stats.estimatesAcceptedCount} đã duyệt
                        </div>
                    </div>
                );
            case 'CONVERSION_RATE':
                return (
                    <div>
                        <div className="font-bold text-emerald-600 text-sm">
                            {item.score}% Thắng
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {item.stats.leadsWonCount}/{item.stats.leadsCount} chốt thành công
                        </div>
                    </div>
                );
            default:
                return <span className="font-bold">{item.score}</span>;
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Table Header & Search */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                        Bảng Xếp Hạng Đầy Đủ ({leaderboard.length} Thành viên)
                    </h4>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm theo tên, phòng ban..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </div>

            {/* Ranking List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredList.map((item) => {
                    const isSelf = currentUserId === item.user.id;
                    const isTopThree = item.rank <= 3;

                    return (
                        <div
                            key={item.user.id}
                            className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                                isSelf
                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-500'
                                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            {/* Left: Rank & Delta & User Avatar/Name */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Rank Number / Badge */}
                                <div className="flex flex-col items-center justify-center w-8 shrink-0">
                                    <div
                                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                                            item.rank === 1
                                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-xs'
                                                : item.rank === 2
                                                ? 'bg-slate-200 text-slate-800'
                                                : item.rank === 3
                                                ? 'bg-amber-700 text-white'
                                                : 'text-slate-500 font-bold'
                                        }`}
                                    >
                                        {item.rank}
                                    </div>
                                    {/* Delta */}
                                    <div className="text-[10px] font-bold flex items-center mt-0.5">
                                        {item.delta > 0 ? (
                                            <span className="text-emerald-600 flex items-center">
                                                <TrendingUp className="w-2.5 h-2.5" /> +{item.delta}
                                            </span>
                                        ) : item.delta < 0 ? (
                                            <span className="text-rose-500 flex items-center">
                                                <TrendingDown className="w-2.5 h-2.5" /> {item.delta}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 flex items-center">
                                                <Minus className="w-2.5 h-2.5" />
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    <img
                                        src={item.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user.name || 'U')}&background=059669&color=fff&size=80`}
                                        alt={item.user.name}
                                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                                    />
                                    {isTopThree && (
                                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[9px] font-black">
                                            ★
                                        </div>
                                    )}
                                </div>

                                {/* User Info & Badges */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate">
                                            {item.user.name}
                                        </span>
                                        {isSelf && (
                                            <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                                Bạn
                                            </span>
                                        )}
                                        {item.badge && (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-semibold border border-amber-200 dark:border-amber-800/60">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                        {item.user.employeeProfile?.department || item.user.role} {item.user.employeeProfile?.position ? `• ${item.user.employeeProfile.position}` : ''}
                                    </div>

                                    {/* Mini relative progress bar */}
                                    <div className="w-full max-w-xs h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.max(4, item.percentageOfTop)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right: Score breakdown & Cheer action */}
                            <div className="flex items-center gap-3 shrink-0 text-right">
                                <div className="min-w-[100px]">
                                    {formatCriteriaDetail(item)}
                                </div>

                                {onCheerUser && (
                                    <button
                                        onClick={() => onCheerUser(item.user.name, item.user.id)}
                                        className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-emerald-600 transition-colors cursor-pointer"
                                        title={`Cổ vũ ${item.user.name}`}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {filteredList.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-400">
                        Không tìm thấy thành viên phù hợp với từ khóa tìm kiếm.
                    </div>
                )}
            </div>
        </div>
    );
}
