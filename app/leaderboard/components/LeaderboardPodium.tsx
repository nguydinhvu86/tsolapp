'use client';

import React from 'react';
import { Crown, Medal, Award, Sparkles, Star, Users, Flame, DollarSign, Target, TrendingUp } from 'lucide-react';
import { CriteriaKey, LeaderboardMode } from '../actions';

interface Props {
    mode: LeaderboardMode;
    topThree: any[];
    criteria: CriteriaKey;
    onCheerUser?: (userName: string, userId: string) => void;
    onCheerTeam?: (groupName: string, groupId: string) => void;
    onViewProfile?: (userId: string) => void;
}

export function LeaderboardPodium({ mode, topThree, criteria, onCheerUser, onCheerTeam, onViewProfile }: Props) {
    if (!topThree || topThree.length === 0) {
        return (
            <div 
                className="p-8 text-center text-slate-400 rounded-3xl border shadow-sm"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
            >
                <Award className="w-12 h-12 mx-auto text-amber-400 mb-2 opacity-60" />
                <p className="font-medium text-sm">Chưa có dữ liệu thi đua trong khoảng thời gian này.</p>
            </div>
        );
    }

    const first = topThree[0];
    const second = topThree[1];
    const third = topThree[2];

    const formatVND = (num: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num || 0);
    };

    const formatScore = (item: any) => {
        if (!item) return '';
        switch (criteria) {
            case 'REVENUE':
                return formatVND(item.score || 0);
            case 'CUSTOMERS':
                return `${item.score} Khách Hàng`;
            case 'LEADS':
                return `${item.score} Cơ Hội (${formatVND(item.stats?.pipelineValue || 0)})`;
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
            {/* Background glowing decorations */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

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
                            {mode === 'INDIVIDUAL' ? 'BỤC VINH DANH CÁ NHÂN TOP 3' : 'BỤC VINH DANH ĐỘI NHÓM VÔ ĐỊCH'}
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
                    <span>{mode === 'INDIVIDUAL' ? 'Vinh danh Quán quân' : 'Tập thể xuất sắc'}</span>
                </div>
            </div>

            {/* Podium Columns Container */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-8 pb-4 relative z-10 max-w-3xl mx-auto">
                {/* 🥈 TOP 2 (Left) */}
                {second ? (
                    <div className="flex flex-col items-center group transition-transform duration-300 hover:-translate-y-1">
                        {/* Avatar / Icon & Badge */}
                        <div className="relative mb-3 flex flex-col items-center">
                            {mode === 'INDIVIDUAL' ? (
                                <div 
                                    onClick={() => onViewProfile && onViewProfile(second.user.id)}
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-0.5 shadow-lg relative border-2 border-slate-400 cursor-pointer overflow-hidden group-hover:scale-105 transition-all"
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
                            ) : (
                                <div 
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg relative border-2 border-slate-400"
                                    style={{ background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)' }}
                                >
                                    {second.group.avatar || '🛡️'}
                                    <div 
                                        className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-slate-900 font-black text-[11px] shadow border border-slate-300"
                                        style={{ background: '#e2e8f0' }}
                                    >
                                        #2
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Name & Subtitle */}
                        <div className="text-center w-full px-1 mb-2">
                            <div 
                                onClick={() => mode === 'INDIVIDUAL' && onViewProfile && onViewProfile(second.user.id)}
                                className={`font-bold text-xs sm:text-sm text-slate-100 truncate max-w-full ${mode === 'INDIVIDUAL' ? 'hover:text-emerald-400 cursor-pointer' : ''}`}
                            >
                                {mode === 'INDIVIDUAL' ? second.user.name : second.group.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                                {mode === 'INDIVIDUAL' 
                                    ? (second.user.employeeProfile?.department || second.user.role) 
                                    : `${second.stats.memberCount} thành viên`}
                            </div>
                        </div>

                        {/* Score Chip */}
                        <div 
                            className="px-2.5 py-1 rounded-xl text-center mb-2 shadow-sm border border-slate-700/60"
                            style={{ background: 'rgba(30, 41, 59, 0.9)' }}
                        >
                            <div className="text-xs sm:text-sm font-black text-slate-200">
                                {formatScore(second)}
                            </div>
                            {mode === 'TEAM' && second.stats.targetRevenue > 0 && (
                                <div className="text-[10px] text-emerald-400 font-bold">
                                    {second.stats.targetProgress}% KPI
                                </div>
                            )}
                        </div>

                        {/* Cheer button */}
                        <button
                            onClick={() => {
                                if (mode === 'INDIVIDUAL' && onCheerUser) {
                                    onCheerUser(second.user.name, second.user.id);
                                } else if (mode === 'TEAM' && onCheerTeam) {
                                    onCheerTeam(second.group.name, second.group.id);
                                }
                            }}
                            className="text-[11px] font-bold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1 mb-3 cursor-pointer"
                        >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Cổ vũ</span>
                        </button>

                        {/* Pillar 2 (Silver) */}
                        <div 
                            className="w-full rounded-t-2xl flex flex-col items-center justify-start pt-3 px-1 border-t-2 border-slate-300 shadow-lg"
                            style={{ 
                                height: '110px', 
                                background: 'linear-gradient(180deg, #475569 0%, #1e293b 100%)' 
                            }}
                        >
                            <Medal className="w-6 h-6 text-slate-300 mb-1" />
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Á Quân 1</span>
                        </div>
                    </div>
                ) : <div />}

                {/* 👑 TOP 1 (Center - Quán Quân) */}
                {first ? (
                    <div className="flex flex-col items-center group transition-transform duration-300 hover:-translate-y-1">
                        {/* Crown icon on top */}
                        <Crown className="w-8 h-8 text-amber-400 animate-bounce mb-1 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />

                        {/* Avatar / Icon & Badge */}
                        <div className="relative mb-3 flex flex-col items-center">
                            {mode === 'INDIVIDUAL' ? (
                                <div 
                                    onClick={() => onViewProfile && onViewProfile(first.user.id)}
                                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 shadow-2xl relative border-2 border-amber-400 ring-4 ring-amber-500/30 cursor-pointer overflow-hidden group-hover:scale-105 transition-all"
                                    style={{ background: '#78350f' }}
                                >
                                    <img
                                        src={first.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(first.user.name || 'U')}&background=f59e0b&color=000&size=160`}
                                        alt={first.user.name}
                                        className="w-full h-full object-cover rounded-xl"
                                    />
                                    <div 
                                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-amber-950 font-black text-xs shadow-lg border border-amber-300"
                                        style={{ background: '#fbbf24' }}
                                    >
                                        #1
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl shadow-2xl relative border-2 border-amber-400 ring-4 ring-amber-500/30"
                                    style={{ background: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)' }}
                                >
                                    {first.group.avatar || '👑'}
                                    <div 
                                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-amber-950 font-black text-xs shadow-lg border border-amber-300"
                                        style={{ background: '#fbbf24' }}
                                    >
                                        #1
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Name & Subtitle */}
                        <div className="text-center w-full px-1 mb-2">
                            <div 
                                onClick={() => mode === 'INDIVIDUAL' && onViewProfile && onViewProfile(first.user.id)}
                                className={`font-black text-sm sm:text-base text-amber-300 truncate max-w-full ${mode === 'INDIVIDUAL' ? 'hover:underline cursor-pointer' : ''}`}
                            >
                                {mode === 'INDIVIDUAL' ? first.user.name : first.group.name}
                            </div>
                            <div className="text-[10px] text-amber-200/80 font-medium truncate">
                                {mode === 'INDIVIDUAL' 
                                    ? (first.user.employeeProfile?.department || first.user.role) 
                                    : (first.group.slogan || `${first.stats.memberCount} thành viên`)}
                            </div>
                        </div>

                        {/* Score Chip */}
                        <div 
                            className="px-3 py-1 rounded-xl text-center mb-2 shadow-lg border border-amber-400/40"
                            style={{ background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)' }}
                        >
                            <div className="text-xs sm:text-sm font-black text-amber-300">
                                {formatScore(first)}
                            </div>
                            {mode === 'TEAM' && first.stats.targetRevenue > 0 && (
                                <div className="text-[10px] text-amber-300 font-bold">
                                    {first.stats.targetProgress}% KPI Kỳ
                                </div>
                            )}
                        </div>

                        {/* Cheer button */}
                        <button
                            onClick={() => {
                                if (mode === 'INDIVIDUAL' && onCheerUser) {
                                    onCheerUser(first.user.name, first.user.id);
                                } else if (mode === 'TEAM' && onCheerTeam) {
                                    onCheerTeam(first.group.name, first.group.id);
                                }
                            }}
                            className="text-[11px] font-bold text-amber-950 px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 transition-colors flex items-center gap-1 shadow-md mb-3 cursor-pointer"
                        >
                            <Sparkles className="w-3 h-3 text-amber-950 fill-amber-950" />
                            <span>Vinh danh ngay</span>
                        </button>

                        {/* Pillar 1 (Gold) */}
                        <div 
                            className="w-full rounded-t-2xl flex flex-col items-center justify-start pt-3 px-1 border-t-2 border-amber-400 shadow-2xl relative"
                            style={{ 
                                height: '145px', 
                                background: 'linear-gradient(180deg, #d97706 0%, #78350f 100%)' 
                            }}
                        >
                            <Award className="w-7 h-7 text-amber-300 mb-1" />
                            <span className="text-xs font-black uppercase tracking-wider text-amber-200">Quán Quân</span>
                        </div>
                    </div>
                ) : <div />}

                {/* 🥉 TOP 3 (Right) */}
                {third ? (
                    <div className="flex flex-col items-center group transition-transform duration-300 hover:-translate-y-1">
                        {/* Avatar / Icon & Badge */}
                        <div className="relative mb-3 flex flex-col items-center">
                            {mode === 'INDIVIDUAL' ? (
                                <div 
                                    onClick={() => onViewProfile && onViewProfile(third.user.id)}
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-0.5 shadow-lg relative border-2 border-amber-700 cursor-pointer overflow-hidden group-hover:scale-105 transition-all"
                                    style={{ background: '#451a03' }}
                                >
                                    <img
                                        src={third.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(third.user.name || 'U')}&background=92400e&color=fff&size=128`}
                                        alt={third.user.name}
                                        className="w-full h-full object-cover rounded-xl"
                                    />
                                    <div 
                                        className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-amber-950 font-black text-[11px] shadow border border-amber-700"
                                        style={{ background: '#d97706' }}
                                    >
                                        #3
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg relative border-2 border-amber-700"
                                    style={{ background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)' }}
                                >
                                    {third.group.avatar || '⚡'}
                                    <div 
                                        className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-amber-950 font-black text-[11px] shadow border border-amber-700"
                                        style={{ background: '#d97706' }}
                                    >
                                        #3
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Name & Subtitle */}
                        <div className="text-center w-full px-1 mb-2">
                            <div 
                                onClick={() => mode === 'INDIVIDUAL' && onViewProfile && onViewProfile(third.user.id)}
                                className={`font-bold text-xs sm:text-sm text-slate-100 truncate max-w-full ${mode === 'INDIVIDUAL' ? 'hover:text-amber-400 cursor-pointer' : ''}`}
                            >
                                {mode === 'INDIVIDUAL' ? third.user.name : third.group.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                                {mode === 'INDIVIDUAL' 
                                    ? (third.user.employeeProfile?.department || third.user.role) 
                                    : `${third.stats.memberCount} thành viên`}
                            </div>
                        </div>

                        {/* Score Chip */}
                        <div 
                            className="px-2.5 py-1 rounded-xl text-center mb-2 shadow-sm border border-slate-700/60"
                            style={{ background: 'rgba(30, 41, 59, 0.9)' }}
                        >
                            <div className="text-xs sm:text-sm font-black text-amber-400">
                                {formatScore(third)}
                            </div>
                            {mode === 'TEAM' && third.stats.targetRevenue > 0 && (
                                <div className="text-[10px] text-emerald-400 font-bold">
                                    {third.stats.targetProgress}% KPI
                                </div>
                            )}
                        </div>

                        {/* Cheer button */}
                        <button
                            onClick={() => {
                                if (mode === 'INDIVIDUAL' && onCheerUser) {
                                    onCheerUser(third.user.name, third.user.id);
                                } else if (mode === 'TEAM' && onCheerTeam) {
                                    onCheerTeam(third.group.name, third.group.id);
                                }
                            }}
                            className="text-[11px] font-bold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1 mb-3 cursor-pointer"
                        >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Cổ vũ</span>
                        </button>

                        {/* Pillar 3 (Bronze) */}
                        <div 
                            className="w-full rounded-t-2xl flex flex-col items-center justify-start pt-3 px-1 border-t-2 border-amber-700 shadow-lg"
                            style={{ 
                                height: '85px', 
                                background: 'linear-gradient(180deg, #92400e 0%, #451a03 100%)' 
                            }}
                        >
                            <Medal className="w-5 h-5 text-amber-500 mb-1" />
                            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">Á Quân 2</span>
                        </div>
                    </div>
                ) : <div />}
            </div>
        </div>
    );
}
