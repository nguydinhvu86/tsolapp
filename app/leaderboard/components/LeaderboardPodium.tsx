'use client';

import React from 'react';
import { Crown, Medal, Award, Sparkles, Star, Users, Flame, DollarSign, Target, TrendingUp, Shield } from 'lucide-react';
import { CriteriaKey, LeaderboardMode } from '../actions';

interface Props {
    mode: LeaderboardMode;
    topThree: any[];
    criteria: CriteriaKey;
    onCheerUser?: (userName: string, userId: string) => void;
    onCheerTeam?: (groupName: string, groupId: string) => void;
    onViewProfile?: (userId: string) => void;
    onCreateGroup?: () => void;
    isAdmin?: boolean;
}

export function LeaderboardPodium({
    mode,
    topThree = [],
    criteria,
    onCheerUser,
    onCheerTeam,
    onViewProfile,
    onCreateGroup,
    isAdmin
}: Props) {
    if (!topThree || topThree.length === 0) {
        return (
            <div 
                className="p-6 text-center text-slate-400 rounded-3xl border shadow-xs"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
            >
                {mode === 'TEAM' ? (
                    <div className="space-y-2.5">
                        <Shield className="w-10 h-10 mx-auto text-emerald-500 mb-1 opacity-80" />
                        <div>
                            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                                Chưa có nhóm thi đua nào trên bục vinh danh.
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Tạo nhóm thi đua để vinh danh tập thể và theo dõi tiến độ mục tiêu chung!
                            </p>
                        </div>
                        {isAdmin && onCreateGroup && (
                            <button
                                onClick={onCreateGroup}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                <span>Thành lập nhóm thi đua</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div>
                        <Award className="w-10 h-10 mx-auto text-amber-400 mb-1.5 opacity-60" />
                        <p className="font-medium text-xs">Chưa có dữ liệu thi đua trong khoảng thời gian này.</p>
                    </div>
                )}
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
                return `${item.score || 0} Khách`;
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

    const getCriteriaLabel = () => {
        switch (criteria) {
            case 'REVENUE': return 'Doanh Thu';
            case 'CUSTOMERS': return 'Khách Hàng Mới';
            case 'LEADS': return 'Cơ Hội Bán Hàng';
            case 'ESTIMATES': return 'Báo Giá Lập';
            case 'CONVERSION_RATE': return 'Tỷ Lệ Chốt Thắng';
        }
    };

    const isTeamMode = mode === 'TEAM' && Boolean(first?.group || second?.group || third?.group);

    return (
        <div 
            className="relative p-4 sm:p-5 rounded-3xl text-white shadow-lg border border-slate-800/80 overflow-hidden"
            style={{ 
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #064e3b 100%)', 
                backgroundColor: '#0f172a' 
            }}
        >
            {/* Ambient Lighting Accents */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/12 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Compact Header Bar */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div 
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-amber-300 border border-amber-500/40 shadow-inner"
                        style={{ background: 'rgba(245, 158, 11, 0.2)' }}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-black text-xs sm:text-sm text-amber-300 tracking-wide flex items-center gap-1.5 drop-shadow-xs">
                            {isTeamMode ? 'BỤC VINH DANH ĐỘI NHÓM VÔ ĐỊCH' : 'BỤC VINH DANH TOP 3 XUẤT SẮC'}
                        </h3>
                        <p className="text-[10px] text-slate-300 font-medium">
                            Tiêu chí: <span className="text-amber-300 font-bold">{getCriteriaLabel()}</span>
                        </p>
                    </div>
                </div>

                <div 
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold text-amber-200"
                    style={{ background: '#1e293b', borderColor: '#334155' }}
                >
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{isTeamMode ? 'Tập thể' : 'Cá nhân'}</span>
                </div>
            </div>

            {/* Compact Stepped Podium Columns Container */}
            <div className="grid grid-cols-3 gap-2 sm:gap-6 lg:gap-8 items-end pt-2 pb-1 relative z-10 w-full max-w-4xl mx-auto px-1 sm:px-4">
                
                {/* 🥈 TOP 2 (Left - Á Quân 1) */}
                {second ? (
                    <div className="flex flex-col items-center group transition-transform duration-200 hover:-translate-y-0.5 min-w-0 w-full max-w-[240px] mx-auto">
                        {/* Avatar / Team Icon */}
                        <div className="relative mb-2 flex flex-col items-center">
                            {isTeamMode ? (
                                <div 
                                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-md relative border-2 border-slate-300"
                                    style={{ background: `${second.group?.color || '#475569'}30` }}
                                >
                                    {second.group?.avatar || '🛡️'}
                                    <div 
                                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-slate-900 font-black text-[9px] shadow border border-slate-300"
                                        style={{ background: '#e2e8f0' }}
                                    >
                                        #2
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => second.user?.id && onViewProfile && onViewProfile(second.user.id)}
                                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl p-0.5 shadow-md relative border-2 border-slate-300 cursor-pointer overflow-hidden group-hover:scale-105 transition-all"
                                    style={{ background: '#475569' }}
                                >
                                    <img
                                        src={second.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(second.user?.name || 'U')}&background=475569&color=fff&size=120`}
                                        alt={second.user?.name || 'User'}
                                        className="w-full h-full object-cover rounded-xl"
                                        onError={(e: any) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(second.user?.name || 'U')}&background=475569&color=fff&size=120`; }}
                                    />
                                    <div 
                                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-slate-900 font-black text-[9px] shadow border border-slate-300"
                                        style={{ background: '#e2e8f0' }}
                                    >
                                        #2
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Name & Subtitle */}
                        <div className="text-center w-full px-0.5 mb-1.5 min-w-0">
                            <div 
                                onClick={() => !isTeamMode && second.user?.id && onViewProfile && onViewProfile(second.user.id)}
                                className={`font-bold text-[11px] sm:text-xs text-slate-100 truncate ${!isTeamMode ? 'hover:text-emerald-400 cursor-pointer' : ''}`}
                                title={isTeamMode ? second.group?.name : second.user?.name}
                            >
                                {isTeamMode ? (second.group?.name || 'Đội thi đua') : (second.user?.name || 'Chiến binh')}
                            </div>

                            {/* Department or Team Member Stack */}
                            {isTeamMode ? (
                                <div className="flex items-center justify-center -space-x-1 my-0.5">
                                    {(second.group?.members || []).slice(0, 3).map((m: any, idx: number) => {
                                        const u = m.user || m;
                                        return (
                                            <img
                                                key={idx}
                                                src={u?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name || 'U')}&background=475569&color=fff&size=40`}
                                                alt={u?.name || 'Member'}
                                                title={u?.name}
                                                className="w-4 h-4 rounded-full ring-1 ring-slate-900 object-cover"
                                            />
                                        );
                                    })}
                                    {(second.group?.members || []).length > 3 && (
                                        <span className="text-[8px] font-bold text-slate-400 ml-1">
                                            +{(second.group.members.length - 3)}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="text-[9px] text-slate-400 truncate">
                                    {second.user?.employeeProfile?.department || second.user?.role || ''}
                                </div>
                            )}
                        </div>

                        {/* Score Chip */}
                        <div 
                            className="px-2 py-0.5 rounded-lg text-center mb-1.5 shadow-2xs border border-slate-700/60 max-w-full truncate"
                            style={{ background: 'rgba(30, 41, 59, 0.9)' }}
                        >
                            <div className="text-[10px] sm:text-[11px] font-black text-slate-200 truncate">
                                {formatScore(second)}
                            </div>
                            {isTeamMode && (second.stats?.targetRevenue || 0) > 0 && (
                                <div className="text-[8px] text-emerald-400 font-bold">
                                    {second.stats?.targetProgress || 0}% KPI
                                </div>
                            )}
                        </div>

                        {/* Cheer Micro-button */}
                        <button
                            onClick={() => {
                                if (isTeamMode && onCheerTeam && second.group) {
                                    onCheerTeam(second.group.name, second.group.id);
                                } else if (!isTeamMode && onCheerUser && second.user) {
                                    onCheerUser(second.user.name, second.user.id);
                                }
                            }}
                            className="text-[9px] font-bold text-slate-300 hover:text-white px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-0.5 mb-2 cursor-pointer active:scale-95"
                        >
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            <span>Cổ vũ</span>
                        </button>

                        {/* Stepped Pillar 2 (Silver) */}
                        <div 
                            className="w-full rounded-t-xl flex flex-col items-center justify-start pt-2 px-1 border-t-2 border-slate-300 shadow-md"
                            style={{ 
                                height: '52px', 
                                background: 'linear-gradient(180deg, #64748b 0%, #334155 100%)' 
                            }}
                        >
                            <Medal className="w-4 h-4 text-slate-200 mb-0.5" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-200">Á Quân 1</span>
                        </div>
                    </div>
                ) : <div />}

                {/* 👑 TOP 1 (Center - Quán Quân) */}
                {first ? (
                    <div className="flex flex-col items-center group transition-transform duration-200 hover:-translate-y-0.5 min-w-0 w-full max-w-[260px] mx-auto">
                        {/* Crown icon on top */}
                        <Crown className="w-5 h-5 text-amber-400 animate-bounce mb-0.5 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />

                        {/* Avatar / Icon & Badge */}
                        <div className="relative mb-2 flex flex-col items-center">
                            {isTeamMode ? (
                                <div 
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-xl relative border-2 border-amber-400 ring-2 ring-amber-500/40"
                                    style={{ background: `${first.group?.color || '#b45309'}40` }}
                                >
                                    {first.group?.avatar || '👑'}
                                    <div 
                                        className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full text-amber-950 font-black text-[10px] shadow-md border border-amber-300"
                                        style={{ background: '#fbbf24' }}
                                    >
                                        #1
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => first.user?.id && onViewProfile && onViewProfile(first.user.id)}
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 shadow-xl relative border-2 border-amber-400 ring-2 ring-amber-500/40 cursor-pointer overflow-hidden group-hover:scale-105 transition-all"
                                    style={{ background: '#78350f' }}
                                >
                                    <img
                                        src={first.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(first.user?.name || 'U')}&background=f59e0b&color=000&size=140`}
                                        alt={first.user?.name || 'User'}
                                        className="w-full h-full object-cover rounded-xl"
                                        onError={(e: any) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(first.user?.name || 'U')}&background=f59e0b&color=000&size=140`; }}
                                    />
                                    <div 
                                        className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full text-amber-950 font-black text-[10px] shadow-md border border-amber-300"
                                        style={{ background: '#fbbf24' }}
                                    >
                                        #1
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Name & Subtitle */}
                        <div className="text-center w-full px-0.5 mb-1.5 min-w-0">
                            <div 
                                onClick={() => !isTeamMode && first.user?.id && onViewProfile && onViewProfile(first.user.id)}
                                className={`font-black text-xs sm:text-sm text-amber-300 truncate ${!isTeamMode ? 'hover:underline cursor-pointer' : ''}`}
                                title={isTeamMode ? first.group?.name : first.user?.name}
                            >
                                {isTeamMode ? (first.group?.name || 'Đội thi đua') : (first.user?.name || 'Chiến binh')}
                            </div>

                            {/* Department or Team Member Stack */}
                            {isTeamMode ? (
                                <div className="flex items-center justify-center -space-x-1 my-0.5">
                                    {(first.group?.members || []).slice(0, 4).map((m: any, idx: number) => {
                                        const u = m.user || m;
                                        return (
                                            <img
                                                key={idx}
                                                src={u?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name || 'U')}&background=d97706&color=000&size=40`}
                                                alt={u?.name || 'Member'}
                                                title={u?.name}
                                                className="w-4 h-4 rounded-full ring-1 ring-slate-900 object-cover"
                                            />
                                        );
                                    })}
                                    {(first.group?.members || []).length > 4 && (
                                        <span className="text-[8px] font-bold text-amber-300 ml-1">
                                            +{(first.group.members.length - 4)}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="text-[9px] text-amber-200/80 font-medium truncate">
                                    {first.user?.employeeProfile?.department || first.user?.role || ''}
                                </div>
                            )}
                        </div>

                        {/* Score Chip */}
                        <div 
                            className="px-2.5 py-0.5 rounded-lg text-center mb-1.5 shadow-md border border-amber-400/50 max-w-full truncate"
                            style={{ background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)' }}
                        >
                            <div className="text-[11px] sm:text-xs font-black text-amber-300 truncate">
                                {formatScore(first)}
                            </div>
                            {isTeamMode && (first.stats?.targetRevenue || 0) > 0 && (
                                <div className="text-[8px] text-amber-300 font-bold">
                                    {first.stats?.targetProgress || 0}% KPI
                                </div>
                            )}
                        </div>

                        {/* Cheer Micro-button */}
                        <button
                            onClick={() => {
                                if (isTeamMode && onCheerTeam && first.group) {
                                    onCheerTeam(first.group.name, first.group.id);
                                } else if (!isTeamMode && onCheerUser && first.user) {
                                    onCheerUser(first.user.name, first.user.id);
                                }
                            }}
                            className="text-[9px] font-bold text-amber-950 px-2.5 py-0.5 rounded-md bg-amber-400 hover:bg-amber-300 transition-colors flex items-center gap-0.5 shadow-xs mb-2 cursor-pointer active:scale-95"
                        >
                            <Sparkles className="w-2.5 h-2.5 text-amber-950 fill-amber-950" />
                            <span>Vinh danh</span>
                        </button>

                        {/* Stepped Pillar 1 (Gold) */}
                        <div 
                            className="w-full rounded-t-xl flex flex-col items-center justify-start pt-2 px-1 border-t-2 border-amber-300 shadow-xl relative"
                            style={{ 
                                height: '75px', 
                                background: 'linear-gradient(180deg, #d97706 0%, #78350f 100%)' 
                            }}
                        >
                            <Award className="w-5 h-5 text-amber-200 mb-0.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-100">Quán Quân</span>
                        </div>
                    </div>
                ) : <div />}

                {/* 🥉 TOP 3 (Right - Á Quân 2) */}
                {third ? (
                    <div className="flex flex-col items-center group transition-transform duration-200 hover:-translate-y-0.5 min-w-0 w-full max-w-[240px] mx-auto">
                        {/* Avatar / Icon & Badge */}
                        <div className="relative mb-2 flex flex-col items-center">
                            {isTeamMode ? (
                                <div 
                                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-md relative border-2 border-amber-700"
                                    style={{ background: `${third.group?.color || '#78350f'}30` }}
                                >
                                    {third.group?.avatar || '⚡'}
                                    <div 
                                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-amber-950 font-black text-[9px] shadow border border-amber-700"
                                        style={{ background: '#d97706' }}
                                    >
                                        #3
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => third.user?.id && onViewProfile && onViewProfile(third.user.id)}
                                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl p-0.5 shadow-md relative border-2 border-amber-700 cursor-pointer overflow-hidden group-hover:scale-105 transition-all"
                                    style={{ background: '#451a03' }}
                                >
                                    <img
                                        src={third.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(third.user?.name || 'U')}&background=92400e&color=fff&size=120`}
                                        alt={third.user?.name || 'User'}
                                        className="w-full h-full object-cover rounded-xl"
                                        onError={(e: any) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(third.user?.name || 'U')}&background=7c2d12&color=fff&size=120`; }}
                                    />
                                    <div 
                                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-amber-950 font-black text-[9px] shadow border border-amber-700"
                                        style={{ background: '#d97706' }}
                                    >
                                        #3
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Name & Subtitle */}
                        <div className="text-center w-full px-0.5 mb-1.5 min-w-0">
                            <div 
                                onClick={() => !isTeamMode && third.user?.id && onViewProfile && onViewProfile(third.user.id)}
                                className={`font-bold text-[11px] sm:text-xs text-slate-100 truncate ${!isTeamMode ? 'hover:text-amber-400 cursor-pointer' : ''}`}
                                title={isTeamMode ? third.group?.name : third.user?.name}
                            >
                                {isTeamMode ? (third.group?.name || 'Đội thi đua') : (third.user?.name || 'Chiến binh')}
                            </div>

                            {/* Department or Team Member Stack */}
                            {isTeamMode ? (
                                <div className="flex items-center justify-center -space-x-1 my-0.5">
                                    {(third.group?.members || []).slice(0, 3).map((m: any, idx: number) => {
                                        const u = m.user || m;
                                        return (
                                            <img
                                                key={idx}
                                                src={u?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name || 'U')}&background=78350f&color=fff&size=40`}
                                                alt={u?.name || 'Member'}
                                                title={u?.name}
                                                className="w-4 h-4 rounded-full ring-1 ring-slate-900 object-cover"
                                            />
                                        );
                                    })}
                                    {(third.group?.members || []).length > 3 && (
                                        <span className="text-[8px] font-bold text-amber-400 ml-1">
                                            +{(third.group.members.length - 3)}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="text-[9px] text-slate-400 truncate">
                                    {third.user?.employeeProfile?.department || third.user?.role || ''}
                                </div>
                            )}
                        </div>

                        {/* Score Chip */}
                        <div 
                            className="px-2 py-0.5 rounded-lg text-center mb-1.5 shadow-2xs border border-slate-700/60 max-w-full truncate"
                            style={{ background: 'rgba(30, 41, 59, 0.9)' }}
                        >
                            <div className="text-[10px] sm:text-[11px] font-black text-amber-400 truncate">
                                {formatScore(third)}
                            </div>
                            {isTeamMode && (third.stats?.targetRevenue || 0) > 0 && (
                                <div className="text-[8px] text-emerald-400 font-bold">
                                    {third.stats?.targetProgress || 0}% KPI
                                </div>
                            )}
                        </div>

                        {/* Cheer Micro-button */}
                        <button
                            onClick={() => {
                                if (isTeamMode && onCheerTeam && third.group) {
                                    onCheerTeam(third.group.name, third.group.id);
                                } else if (!isTeamMode && onCheerUser && third.user) {
                                    onCheerUser(third.user.name, third.user.id);
                                }
                            }}
                            className="text-[9px] font-bold text-slate-300 hover:text-white px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-0.5 mb-2 cursor-pointer active:scale-95"
                        >
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            <span>Cổ vũ</span>
                        </button>

                        {/* Stepped Pillar 3 (Bronze) */}
                        <div 
                            className="w-full rounded-t-xl flex flex-col items-center justify-start pt-2 px-1 border-t-2 border-amber-700 shadow-md"
                            style={{ 
                                height: '38px', 
                                background: 'linear-gradient(180deg, #92400e 0%, #451a03 100%)' 
                            }}
                        >
                            <Medal className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Á Quân 2</span>
                        </div>
                    </div>
                ) : <div />}
            </div>
        </div>
    );
}
