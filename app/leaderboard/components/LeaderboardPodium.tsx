'use client';

import React from 'react';
import { Crown, Medal, Award, TrendingUp, TrendingDown, Minus, Flame, Sparkles, Star, Target, DollarSign, Users, FileText, CheckCircle2 } from 'lucide-react';
import { CriteriaKey } from '../actions';

interface Props {
    topThree: any[];
    criteria: CriteriaKey;
    onCheerUser?: (userName: string, userId: string) => void;
}

export function LeaderboardPodium({ topThree, criteria, onCheerUser }: Props) {
    if (!topThree || topThree.length === 0) {
        return (
            <div className="p-8 text-center text-slate-400 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <TrophyIcon className="w-12 h-12 mx-auto text-amber-400 mb-2 opacity-60" />
                <p className="font-medium text-sm">Chưa có dữ liệu thi đua trong khoảng thời gian này.</p>
            </div>
        );
    }

    const first = topThree[0];
    const second = topThree[1];
    const third = topThree[2];

    const formatScore = (item: any) => {
        if (!item) return '';
        switch (criteria) {
            case 'REVENUE':
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(item.score || 0);
            case 'CUSTOMERS':
                return `${item.score} Khách Hàng`;
            case 'LEADS':
                return `${item.score} Cơ Hội (${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(item.stats?.pipelineValue || 0)})`;
            case 'ESTIMATES':
                return `${item.score} Báo Giá`;
            case 'CONVERSION_RATE':
                return `${item.score}% Thắng (${item.stats?.leadsWonCount || 0}/${item.stats?.leadsCount || 0})`;
            default:
                return `${item.score}`;
        }
    };

    const getCriteriaLabel = () => {
        switch (criteria) {
            case 'REVENUE': return 'Doanh Thu';
            case 'CUSTOMERS': return 'Khách Hàng Mới';
            case 'LEADS': return 'Cơ Hội Bán Hàng';
            case 'ESTIMATES': return 'Báo Giá Lập';
            case 'CONVERSION_RATE': return 'Tỷ Lệ Chốt Thắng';
        }
    };

    return (
        <div 
            className="relative p-6 sm:p-8 rounded-3xl text-white shadow-2xl border border-slate-800 overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)', backgroundColor: '#0f172a' }}
        >
            {/* Header Badge */}
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-2.5">
                    <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-amber-300 border border-amber-500/50 shadow-inner"
                        style={{ background: 'rgba(245, 158, 11, 0.2)' }}
                    >
                        <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
                    </div>
                    <div>
                        <h3 className="font-black text-lg sm:text-xl text-amber-300 tracking-wide flex items-center gap-2 drop-shadow-sm">
                            BỤC VINH DANH TOP 3
                        </h3>
                        <p className="text-xs text-slate-300 font-medium">
                            Xếp hạng theo tiêu chí: <span className="text-amber-400 font-bold">{getCriteriaLabel()}</span>
                        </p>
                    </div>
                </div>

                <div 
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold text-amber-200"
                    style={{ background: '#1e293b', borderColor: '#334155' }}
                >
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>Vinh danh Quán quân</span>
                </div>
            </div>

            {/* Podium Columns Container */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-8 pb-4 relative z-10 max-w-2xl mx-auto">
                {/* 🥈 TOP 2 (Left) */}
                {second ? (
                    <div className="flex flex-col items-center group transition-transform duration-300 hover:-translate-y-1">
                        {/* Avatar & Badge */}
                        <div className="relative mb-3 flex flex-col items-center">
                            <div 
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-0.5 shadow-lg relative border-2 border-slate-400"
                                style={{ background: '#475569' }}
                            >
                                <img
                                    src={second.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(second.user.name || 'U')}&background=475569&color=fff&size=128`}
                                    alt={second.user.name}
                                    className="w-full h-full object-cover rounded-xl"
                                />
                                <div 
                                    className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-slate-900 font-black text-[11px] shadow border border-slate-300"
                                    style={{ background: '#e2e8f0' }}
                                >
                                    #2
                                </div>
                            </div>
                        </div>

                        {/* Name & Department */}
                        <div className="text-center w-full px-1">
                            <div className="font-bold text-xs sm:text-sm text-slate-100 truncate max-w-full">
                                {second.user.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                                {second.user.employeeProfile?.department || second.user.role}
                            </div>
                        </div>

                        {/* Score Tag */}
                        <div 
                            className="mt-2 mb-3 px-2.5 py-1 rounded-xl border text-center w-full max-w-[130px] shadow-sm"
                            style={{ background: '#1e293b', borderColor: '#475569' }}
                        >
                            <div className="font-extrabold text-[11px] sm:text-xs text-slate-200 truncate">
                                {formatScore(second)}
                            </div>
                        </div>

                        {/* Pedestal Base */}
                        <div 
                            className="w-full h-28 sm:h-36 rounded-t-2xl p-3 flex flex-col items-center justify-between shadow-xl"
                            style={{ background: 'linear-gradient(180deg, #64748b 0%, #475569 40%, #1e293b 100%)', backgroundColor: '#475569', borderTop: '3px solid #cbd5e1' }}
                        >
                            <div className="flex items-center gap-1 text-slate-100 font-black text-sm sm:text-base drop-shadow-sm">
                                <Medal className="w-4 h-4 text-slate-200" />
                                <span>Á Quân 1</span>
                            </div>
                            {onCheerUser && (
                                <button
                                    onClick={() => onCheerUser(second.user.name, second.user.id)}
                                    style={{ background: '#1e293b', color: '#ffffff', borderColor: '#475569' }}
                                    className="px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-transform active:scale-95 cursor-pointer w-full flex items-center justify-center gap-1 shadow-md"
                                >
                                    <span>👏 Chúc mừng</span>
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-40 flex items-center justify-center text-xs text-slate-400">Đang chờ ứng viên</div>
                )}

                {/* 👑 TOP 1 (Center - Tallest) */}
                {first && (
                    <div className="flex flex-col items-center group transition-transform duration-300 hover:-translate-y-1 z-20">
                        {/* Crown & Avatar */}
                        <div className="relative mb-3 flex flex-col items-center">
                            <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-bounce mb-0.5" />
                            <div 
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 shadow-2xl relative border-2 border-amber-300 ring-4 ring-amber-400/40"
                                style={{ background: '#d97706' }}
                            >
                                <img
                                    src={first.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(first.user.name || 'U')}&background=d97706&color=fff&size=128`}
                                    alt={first.user.name}
                                    className="w-full h-full object-cover rounded-xl"
                                />
                                <div 
                                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-slate-950 font-black text-xs shadow-lg flex items-center gap-1 border border-yellow-200"
                                    style={{ background: 'linear-gradient(90deg, #fde047 0%, #f59e0b 100%)', backgroundColor: '#f59e0b' }}
                                >
                                    <Crown className="w-3 h-3 text-slate-950 fill-slate-950" />
                                    <span>#1</span>
                                </div>
                            </div>
                        </div>

                        {/* Name & Department */}
                        <div className="text-center w-full px-1">
                            <div className="font-black text-sm sm:text-base text-amber-300 truncate max-w-full drop-shadow-md">
                                {first.user.name}
                            </div>
                            <div className="text-[11px] text-amber-200/90 font-semibold truncate">
                                {first.user.employeeProfile?.department || first.user.role}
                            </div>
                        </div>

                        {/* Score Tag */}
                        <div 
                            className="mt-2 mb-3 px-3 py-1.5 rounded-xl border text-center w-full max-w-[150px] shadow-md"
                            style={{ background: 'rgba(251, 191, 36, 0.25)', borderColor: '#f59e0b' }}
                        >
                            <div className="font-black text-xs sm:text-sm text-yellow-300 truncate drop-shadow-sm">
                                {formatScore(first)}
                            </div>
                        </div>

                        {/* Pedestal Base */}
                        <div 
                            className="w-full h-36 sm:h-48 rounded-t-2xl p-3 sm:p-4 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden"
                            style={{ background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 40%, #78350f 100%)', backgroundColor: '#d97706', borderTop: '3px solid #fde047' }}
                        >
                            <div className="flex flex-col items-center gap-0.5 text-slate-950 font-black text-sm sm:text-base relative z-10 drop-shadow-xs">
                                <span className="uppercase tracking-widest text-[11px] sm:text-xs">QUÁN QUÂN</span>
                                <span className="text-xs text-amber-950 font-black">{getCriteriaLabel()}</span>
                            </div>
                            {onCheerUser && (
                                <button
                                    onClick={() => onCheerUser(first.user.name, first.user.id)}
                                    style={{ background: '#020617', color: '#fbbf24', borderColor: '#f59e0b' }}
                                    className="px-3 py-1.5 rounded-xl border text-xs font-black transition-all transform active:scale-95 cursor-pointer w-full flex items-center justify-center gap-1.5 shadow-xl relative z-10"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Tôn vinh Top 1</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* 🥉 TOP 3 (Right) */}
                {third ? (
                    <div className="flex flex-col items-center group transition-transform duration-300 hover:-translate-y-1">
                        {/* Avatar & Badge */}
                        <div className="relative mb-3 flex flex-col items-center">
                            <div 
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-0.5 shadow-lg relative border-2 border-amber-600"
                                style={{ background: '#78350f' }}
                            >
                                <img
                                    src={third.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(third.user.name || 'U')}&background=92400e&color=fff&size=128`}
                                    alt={third.user.name}
                                    className="w-full h-full object-cover rounded-xl"
                                />
                                <div 
                                    className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-amber-100 font-black text-[11px] shadow border border-amber-500"
                                    style={{ background: '#78350f' }}
                                >
                                    #3
                                </div>
                            </div>
                        </div>

                        {/* Name & Department */}
                        <div className="text-center w-full px-1">
                            <div className="font-bold text-xs sm:text-sm text-slate-100 truncate max-w-full">
                                {third.user.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                                {third.user.employeeProfile?.department || third.user.role}
                            </div>
                        </div>

                        {/* Score Tag */}
                        <div 
                            className="mt-2 mb-3 px-2.5 py-1 rounded-xl border text-center w-full max-w-[130px] shadow-sm"
                            style={{ background: '#1e293b', borderColor: '#78350f' }}
                        >
                            <div className="font-extrabold text-[11px] sm:text-xs text-amber-300 truncate">
                                {formatScore(third)}
                            </div>
                        </div>

                        {/* Pedestal Base */}
                        <div 
                            className="w-full h-24 sm:h-32 rounded-t-2xl p-3 flex flex-col items-center justify-between shadow-xl"
                            style={{ background: 'linear-gradient(180deg, #b45309 0%, #78350f 40%, #451a03 100%)', backgroundColor: '#78350f', borderTop: '3px solid #f59e0b' }}
                        >
                            <div className="flex items-center gap-1 text-amber-200 font-black text-sm sm:text-base drop-shadow-sm">
                                <Medal className="w-4 h-4 text-amber-400" />
                                <span>Á Quân 2</span>
                            </div>
                            {onCheerUser && (
                                <button
                                    onClick={() => onCheerUser(third.user.name, third.user.id)}
                                    style={{ background: '#1e293b', color: '#fde047', borderColor: '#78350f' }}
                                    className="px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-transform active:scale-95 cursor-pointer w-full flex items-center justify-center gap-1 shadow-md"
                                >
                                    <span>🎉 Cổ vũ</span>
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-40 flex items-center justify-center text-xs text-slate-400">Đang chờ ứng viên</div>
                )}
            </div>
        </div>
    );
}

function TrophyIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
            <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    );
}
