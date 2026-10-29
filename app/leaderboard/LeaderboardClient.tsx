'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Trophy, Flame, Target, Users, DollarSign, FileText, TrendingUp, Sparkles, MessageSquare, Calendar, RefreshCw, Star, Award, ShieldCheck, Heart, PlusCircle, Shield, UserCheck, Columns2, LayoutGrid, Newspaper, Loader2, Zap, ChevronRight, Hash, ArrowUpRight } from 'lucide-react';
import { CriteriaKey, TimeRangeKey, LeaderboardMode, getLeaderboardData, getGroupLeaderboardData, getSocialFeed, getCompetitionGroups } from './actions';
import { LeaderboardPodium } from './components/LeaderboardPodium';
import { RankListTable } from './components/RankListTable';
import { CreatePostBox } from './components/CreatePostBox';
import { SocialFeedCard } from './components/SocialFeedCard';
import { UserProfileModal } from './components/UserProfileModal';
import { CompetitionGroupModal } from './components/CompetitionGroupModal';

interface Props {
    initialLeaderboard: any;
    initialFeed: any;
    initialGroups?: any[];
    currentUser: any;
}

type LayoutView = 'SPLIT' | 'LEADERBOARD' | 'FEED';

const CRITERIA_TABS: { key: CriteriaKey; label: string; icon: any }[] = [
    { key: 'REVENUE', label: 'Doanh Thu Khủng', icon: DollarSign },
    { key: 'CUSTOMERS', label: 'Nhiều Khách Hàng', icon: Users },
    { key: 'LEADS', label: 'Nhiều Cơ Hội', icon: Target },
    { key: 'ESTIMATES', label: 'Nhiều Báo Giá', icon: FileText },
    { key: 'CONVERSION_RATE', label: 'Tỷ Lệ Chốt Cao', icon: TrendingUp },
];

const TIME_TABS: { key: TimeRangeKey; label: string }[] = [
    { key: 'TODAY', label: 'Hôm nay' },
    { key: 'THIS_WEEK', label: 'Tuần này' },
    { key: 'THIS_MONTH', label: 'Tháng này' },
    { key: 'THIS_QUARTER', label: 'Quý này' },
    { key: 'THIS_YEAR', label: 'Năm nay' },
    { key: 'CUSTOM', label: 'Tùy chỉnh' },
];

export default function LeaderboardClient({ initialLeaderboard, initialFeed, initialGroups = [], currentUser }: Props) {
    const searchParams = useSearchParams();
    const [mode, setMode] = useState<LeaderboardMode>('INDIVIDUAL');
    const [layoutView, setLayoutView] = useState<LayoutView>('SPLIT');
    const [criteria, setCriteria] = useState<CriteriaKey>(initialLeaderboard.criteria || 'REVENUE');
    const [timeRange, setTimeRange] = useState<TimeRangeKey>(initialLeaderboard.timeRange || 'THIS_MONTH');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Separate datasets to prevent state desync
    const [individualData, setIndividualData] = useState<any>(initialLeaderboard);
    const [teamData, setTeamData] = useState<any>(null);
    const [feedData, setFeedData] = useState<any>(initialFeed);
    const [competitionGroups, setCompetitionGroups] = useState<any[]>(initialGroups);

    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);

    // Initial mention trigger for Social Wall
    const [activeMention, setActiveMention] = useState<{ name: string; id: string; type?: 'USER' | 'TEAM' } | null>(null);

    // Modals state
    const [selectedUserIdForProfile, setSelectedUserIdForProfile] = useState<string | null>(null);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<any | null>(null);

    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

    // Active dataset based on mode
    const activeData = mode === 'INDIVIDUAL' 
        ? individualData 
        : (teamData || { criteria, timeRange, topThree: [], fullList: [], summary: {} });

    // Fetch Leaderboard when filters or mode changes
    const fetchLeaderboard = async () => {
        setIsLoading(true);
        try {
            if (mode === 'INDIVIDUAL') {
                const data = await getLeaderboardData({
                    criteria,
                    timeRange,
                    customStart: customStart || undefined,
                    customEnd: customEnd || undefined
                });
                setIndividualData(data);
            } else {
                const data = await getGroupLeaderboardData({
                    criteria,
                    timeRange,
                    customStart: customStart || undefined,
                    customEnd: customEnd || undefined
                });
                setTeamData(data);
            }
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, [mode, criteria, timeRange, customStart, customEnd]);

    // Fetch competition groups on initial mount
    useEffect(() => {
        getCompetitionGroups()
            .then(groups => setCompetitionGroups(groups))
            .catch(err => console.error(err));
    }, []);

    // Refresh feed
    const refreshFeed = async () => {
        setIsRefreshingFeed(true);
        try {
            const data = await getSocialFeed({ page: 1, limit: 30 });
            setFeedData(data);
        } catch (err) {
            console.error('Error refreshing feed:', err);
        } finally {
            setIsRefreshingFeed(false);
        }
    };

    const handleCheerUser = (userName: string, userId: string) => {
        setActiveMention({ name: userName, id: userId, type: 'USER' });
        if (layoutView === 'LEADERBOARD') setLayoutView('SPLIT');
        setTimeout(() => {
            const postBox = document.getElementById('social-wall-section');
            if (postBox) {
                postBox.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    const handleCheerTeam = (groupName: string, groupId: string) => {
        setActiveMention({ name: groupName, id: groupId, type: 'TEAM' });
        if (layoutView === 'LEADERBOARD') setLayoutView('SPLIT');
        setTimeout(() => {
            const postBox = document.getElementById('social-wall-section');
            if (postBox) {
                postBox.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    const handleOpenGroupModal = (groupToEdit?: any) => {
        setSelectedGroupForEdit(groupToEdit || null);
        setIsGroupModalOpen(true);
    };

    const handleGroupSaved = async () => {
        const groups = await getCompetitionGroups();
        setCompetitionGroups(groups);
        fetchLeaderboard();
        refreshFeed();
    };

    const formatVND = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);
    };

    const formatScoreValue = (score: number) => {
        if (criteria === 'REVENUE') return formatVND(score || 0);
        if (criteria === 'CUSTOMERS') return `${score || 0} Khách hàng`;
        if (criteria === 'LEADS') return `${score || 0} Cơ hội`;
        if (criteria === 'ESTIMATES') return `${score || 0} Báo giá`;
        if (criteria === 'CONVERSION_RATE') return `${score || 0}%`;
        return `${score || 0}`;
    };

    // Derived competition analytics for full-page balance
    const competitionStats = useMemo(() => {
        const list = activeData.fullList || [];
        if (list.length === 0) return null;

        let totalVolume = 0;
        let highestDeltaItem: any = null;
        let maxDelta = 0;
        let highestRateItem: any = null;
        let maxRate = -1;

        list.forEach((item: any) => {
            const val = item.score || 0;
            totalVolume += (typeof val === 'number' ? val : 0);

            if ((item.delta || 0) > maxDelta) {
                maxDelta = item.delta;
                highestDeltaItem = item;
            }

            const rate = mode === 'TEAM' 
                ? (item.stats?.targetProgress || 0)
                : (item.stats?.conversionRate || 0);
            if (rate > maxRate) {
                maxRate = rate;
                highestRateItem = item;
            }
        });

        const top1 = activeData.topThree?.[0];
        const top2 = activeData.topThree?.[1];
        const leadMargin = (top1 && top2 && (top1.score || 0) > (top2.score || 0))
            ? ((top1.score || 0) - (top2.score || 0))
            : 0;

        return {
            totalParticipants: list.length,
            totalVolume,
            highestDeltaItem,
            maxDelta,
            highestRateItem,
            maxRate,
            leadMargin
        };
    }, [activeData, mode, criteria]);

    return (
        <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 md:p-6 lg:p-8 font-sans space-y-6 max-w-[1650px] mx-auto">
            {/* Hero Header Banner */}
            <div 
                className="relative rounded-3xl overflow-hidden p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40"
                style={{ background: 'linear-gradient(135deg, #064e3b 0%, #0f172a 50%, #022c22 100%)', backgroundColor: '#0f172a' }}
            >
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div 
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-emerald-300 text-xs font-bold border border-emerald-500/40"
                            style={{ background: 'rgba(5, 150, 105, 0.25)' }}
                        >
                            <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                            <span>Vinh Danh & Thi Đua Nội Bộ TSOL</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                            <span className="text-white drop-shadow-md">
                                {mode === 'INDIVIDUAL' ? 'BẢNG VINH DANH CHIẾN BINH' : 'BẢNG THI ĐUA ĐỘI NHÓM'}
                            </span>
                            <Trophy className="w-8 h-8 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                            {mode === 'INDIVIDUAL' 
                                ? 'Tôn vinh những cá nhân xuất sắc, cùng thi đua bứt phá doanh thu và giao lưu chia sẻ cảm xúc cùng đồng đội.' 
                                : 'Đấu trường thi đua giữa các đội nhóm, thúc đẩy tinh thần gắn kết tập thể, vươn tầm chinh phục các mục tiêu lớn.'}
                        </p>
                    </div>

                    {/* Summary Metric Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div 
                            className="p-3.5 rounded-2xl border text-center shadow-md"
                            style={{ background: '#1e293b', borderColor: '#334155' }}
                        >
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Doanh Thu Kỳ</div>
                            <div className="text-sm sm:text-base font-black text-amber-400 mt-0.5 truncate">
                                {formatVND(activeData.summary?.totalRevenue || 0)}
                            </div>
                        </div>

                        <div 
                            className="p-3.5 rounded-2xl border text-center shadow-md"
                            style={{ background: '#1e293b', borderColor: '#334155' }}
                        >
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Khách Hàng Mới</div>
                            <div className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">
                                {activeData.summary?.totalCustomers || 0}
                            </div>
                        </div>

                        <div 
                            className="p-3.5 rounded-2xl border text-center shadow-md"
                            style={{ background: '#1e293b', borderColor: '#334155' }}
                        >
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cơ Hội Bán</div>
                            <div className="text-sm sm:text-base font-black text-blue-400 mt-0.5">
                                {activeData.summary?.totalLeads || 0}
                            </div>
                        </div>

                        <div 
                            className="p-3.5 rounded-2xl border text-center shadow-md"
                            style={{ background: '#1e293b', borderColor: '#334155' }}
                        >
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                {mode === 'INDIVIDUAL' ? 'Chiến Binh' : 'Đội Thi Đua'}
                            </div>
                            <div className="text-sm sm:text-base font-black text-purple-400 mt-0.5">
                                {mode === 'INDIVIDUAL' ? (activeData.summary?.activeMembers || 0) : (activeData.summary?.activeGroups || 0)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Criteria Selection Bar */}
            <div 
                className="rounded-3xl p-4 sm:p-5 shadow-xs border space-y-3.5"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
            >
                {/* 1. Mode Switcher & View Layout Switcher & Create Group button */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {/* Mode Switcher: Cá Nhân vs Tập Thể */}
                        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                            <button
                                type="button"
                                onClick={() => setMode('INDIVIDUAL')}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    mode === 'INDIVIDUAL' 
                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Users className="w-3.5 h-3.5" />
                                <span>🏆 Vinh Danh Cá Nhân</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode('TEAM')}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    mode === 'TEAM' 
                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Shield className="w-3.5 h-3.5" />
                                <span>🛡️ Tập Thể / Nhóm Thi Đua</span>
                            </button>
                        </div>

                        {/* Layout View Switcher (Song song / Bảng vinh danh / Bảng tin) */}
                        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setLayoutView('SPLIT')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                    layoutView === 'SPLIT' 
                                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200/80 dark:border-slate-600' 
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                title="Xem 2 cột cân đối: Bục vinh danh & Mạng xã hội"
                            >
                                <Columns2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="hidden sm:inline">2 Cột Song Song</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setLayoutView('LEADERBOARD')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                    layoutView === 'LEADERBOARD' 
                                        ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs border border-slate-200/80 dark:border-slate-600' 
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                title="Toàn màn hình Bảng xếp hạng thi đua"
                            >
                                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                <span className="hidden sm:inline">Chỉ Bảng Vinh Danh</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setLayoutView('FEED')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                    layoutView === 'FEED' 
                                        ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs border border-slate-200/80 dark:border-slate-600' 
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                title="Toàn màn hình Bảng tin giao lưu nội bộ"
                            >
                                <Newspaper className="w-3.5 h-3.5 text-purple-500" />
                                <span className="hidden sm:inline">Chỉ Bảng Tin</span>
                            </button>
                        </div>
                    </div>

                    {/* Admin / Manager Group Management Action */}
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => handleOpenGroupModal()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer self-start md:self-auto"
                        >
                            <PlusCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>Tạo Nhóm Thi Đua Mới</span>
                        </button>
                    )}
                </div>

                {/* 2. Criteria Selector */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 mr-1 shrink-0 uppercase tracking-wider">
                        Tiêu chí:
                    </span>
                    {CRITERIA_TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = criteria === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setCriteria(tab.key)}
                                style={isActive ? { background: '#059669', color: '#ffffff', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)' } : { background: '#f1f5f9', color: '#334155' }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all transform active:scale-95 cursor-pointer"
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 3. Time Range Selector */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: '#f1f5f9' }}>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500 mr-1 shrink-0 uppercase tracking-wider">
                            Thời gian:
                        </span>
                        {TIME_TABS.map(tab => {
                            const isActive = timeRange === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setTimeRange(tab.key)}
                                    style={isActive ? { background: '#0f172a', color: '#ffffff' } : { background: 'transparent', color: '#64748b' }}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Custom date range inputs */}
                    {timeRange === 'CUSTOM' && (
                        <div className="flex items-center gap-2 text-xs">
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                            />
                            <span>→</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                            />
                        </div>
                    )}

                    <button
                        onClick={fetchLeaderboard}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Cập nhật</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area based on LayoutView */}
            {layoutView === 'SPLIT' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* LEFT COLUMN: Podium & Rankings (5 Cols) - Compact, balanced, sticky for easy tracking */}
                    <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">
                        {isLoading && mode === 'TEAM' && !teamData ? (
                            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
                                <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Đang tải dữ liệu thi đua đội nhóm...</p>
                            </div>
                        ) : (
                            <>
                                <LeaderboardPodium
                                    mode={mode}
                                    topThree={activeData.topThree || []}
                                    criteria={criteria}
                                    onCheerUser={handleCheerUser}
                                    onCheerTeam={handleCheerTeam}
                                    onViewProfile={id => setSelectedUserIdForProfile(id)}
                                    onCreateGroup={() => handleOpenGroupModal()}
                                    isAdmin={isAdmin}
                                />

                                <RankListTable
                                    mode={mode}
                                    leaderboard={activeData.fullList || []}
                                    criteria={criteria}
                                    currentUserId={currentUser?.id}
                                    currentUserRole={currentUser?.role}
                                    onCheerUser={handleCheerUser}
                                    onCheerTeam={handleCheerTeam}
                                    onViewProfile={id => setSelectedUserIdForProfile(id)}
                                    onEditGroup={handleOpenGroupModal}
                                    onCreateGroup={() => handleOpenGroupModal()}
                                />
                            </>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Social Timeline (7 Cols) - Generous space for posts, images & discussions */}
                    <div id="social-wall-section" className="lg:col-span-7 space-y-4">
                        {/* Section Title */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                                    <MessageSquare className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                                        Mạng Xã Hội Thi Đua & Vinh Danh
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Chia sẻ cảm xúc, vinh danh cá nhân và tập thể
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={refreshFeed}
                                disabled={isRefreshingFeed}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Làm mới bảng tin"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingFeed ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Create Post Box */}
                        <CreatePostBox
                            currentUser={currentUser}
                            competitionGroups={competitionGroups}
                            onPostCreated={refreshFeed}
                            initialMention={activeMention}
                            onClearInitialMention={() => setActiveMention(null)}
                        />

                        {/* Feed Posts List with bounded scrollbar */}
                        <div className="space-y-4 max-h-[800px] overflow-y-auto pr-1">
                            {feedData.posts && feedData.posts.length > 0 ? (
                                feedData.posts.map((post: any) => (
                                    <SocialFeedCard
                                        key={post.id}
                                        post={post}
                                        currentUserId={currentUser?.id}
                                        currentUserRole={currentUser?.role}
                                        onPostUpdated={refreshFeed}
                                        onViewProfile={id => setSelectedUserIdForProfile(id)}
                                    />
                                ))
                            ) : (
                                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-slate-400">
                                    <Sparkles className="w-8 h-8 mx-auto text-amber-400 mb-2 opacity-60" />
                                    <p className="font-medium text-xs">Chưa có bài viết nào trên bảng tin.</p>
                                    <p className="text-[11px] text-slate-500 mt-1">Hãy là người đầu tiên đăng bài chúc mừng đồng đội!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* LEADERBOARD ONLY VIEW (Full Page Balanced Layout) */}
            {layoutView === 'LEADERBOARD' && (
                <div className="w-full space-y-6">
                    {/* Top Row: Podium (8 Cols) + Highlights & Insights (4 Cols) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                        <div className="lg:col-span-8 flex flex-col justify-center">
                            <LeaderboardPodium
                                mode={mode}
                                topThree={activeData.topThree || []}
                                criteria={criteria}
                                onCheerUser={handleCheerUser}
                                onCheerTeam={handleCheerTeam}
                                onViewProfile={id => setSelectedUserIdForProfile(id)}
                                onCreateGroup={() => handleOpenGroupModal()}
                                isAdmin={isAdmin}
                            />
                        </div>

                        {/* Competition Insights & Breakthrough Card (4 Cols) */}
                        <div className="lg:col-span-4 rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                        <Flame className="w-4 h-4 fill-amber-500 animate-pulse" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                                            Tiêu Điểm & Bứt Phá Kỳ Này
                                        </h4>
                                        <p className="text-[10px] text-slate-400">
                                            {mode === 'INDIVIDUAL' ? 'Diễn biến thi đua cá nhân' : 'Khí thế thi đua đội nhóm'}
                                        </p>
                                    </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    Live
                                </span>
                            </div>

                            {/* Dynamic Metric 1: Fastest Riser / Top Mover */}
                            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-slate-500 flex items-center gap-1">
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                        Bứt Phá Mạnh Nhất
                                    </span>
                                    {competitionStats?.maxDelta && competitionStats.maxDelta > 0 ? (
                                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-black text-[9px]">
                                            +{competitionStats.maxDelta} Hạng
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-slate-400">Đang cập nhật</span>
                                    )}
                                </div>

                                {competitionStats?.highestDeltaItem ? (
                                    <div className="flex items-center gap-2 pt-1">
                                        {mode === 'INDIVIDUAL' ? (
                                            <>
                                                <img
                                                    src={competitionStats.highestDeltaItem.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(competitionStats.highestDeltaItem.user?.name || 'U')}&background=059669&color=fff&size=60`}
                                                    alt="User"
                                                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-emerald-500"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                                                        {competitionStats.highestDeltaItem.user?.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 truncate">
                                                        {competitionStats.highestDeltaItem.user?.employeeProfile?.department || 'Thành viên'}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{competitionStats.highestDeltaItem.group?.avatar || '🛡️'}</span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                                                        {competitionStats.highestDeltaItem.group?.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 truncate">
                                                        {competitionStats.highestDeltaItem.group?.slogan || 'Đội bứt phá'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-slate-400 italic">Chưa có biến động thứ hạng trong kỳ</p>
                                )}
                            </div>

                            {/* Dynamic Metric 2: Performance Benchmark (Conversion or KPI) */}
                            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-slate-500 flex items-center gap-1">
                                        <Target className="w-3.5 h-3.5 text-blue-500" />
                                        {mode === 'TEAM' ? 'Tiến Độ KPI Cao Nhất' : 'Tỷ Lệ Chốt Hợp Đồng'}
                                    </span>
                                    <span className="font-black text-xs text-blue-600 dark:text-blue-400">
                                        {competitionStats?.maxRate && competitionStats.maxRate > 0 ? `${competitionStats.maxRate}%` : 'N/A'}
                                    </span>
                                </div>
                                {competitionStats?.highestRateItem && (
                                    <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold truncate">
                                        {mode === 'INDIVIDUAL' 
                                            ? (competitionStats.highestRateItem.user?.name || 'Chiến binh') 
                                            : (competitionStats.highestRateItem.group?.name || 'Đội nhóm')}
                                    </div>
                                )}
                            </div>

                            {/* Dynamic Metric 3: Lead Margin */}
                            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/60 space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                        Khoảng Cách Ngôi Đầu
                                    </span>
                                    <span className="font-black text-xs text-amber-700 dark:text-amber-300">
                                        {competitionStats?.leadMargin && competitionStats.leadMargin > 0
                                            ? `+${formatScoreValue(competitionStats.leadMargin)}`
                                            : 'Bám đuổi sít sao'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 leading-snug">
                                    {competitionStats?.leadMargin && competitionStats.leadMargin > 0
                                        ? `Quán quân đang tạo khoảng cách +${formatScoreValue(competitionStats.leadMargin)} so với Á quân 1.`
                                        : 'Cuộc đua đang vô cùng căng thẳng với điểm số cạnh tranh từng chút!'}
                                </p>
                            </div>

                            {/* Quick Action Button: Jump to Social Feed */}
                            <button
                                onClick={() => setLayoutView('FEED')}
                                className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Sang Bảng Tin Chúc Mừng Top 3</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row: Full Width Rank List Table (12 Cols) */}
                    <RankListTable
                        mode={mode}
                        leaderboard={activeData.fullList || []}
                        criteria={criteria}
                        currentUserId={currentUser?.id}
                        currentUserRole={currentUser?.role}
                        onCheerUser={handleCheerUser}
                        onCheerTeam={handleCheerTeam}
                        onViewProfile={id => setSelectedUserIdForProfile(id)}
                        onEditGroup={handleOpenGroupModal}
                        onCreateGroup={() => handleOpenGroupModal()}
                    />
                </div>
            )}

            {/* FEED ONLY VIEW (Full Page Balanced Layout) */}
            {layoutView === 'FEED' && (
                <div id="social-wall-section" className="w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* LEFT SIDEBAR (4 Cols): Top 3 Fast Spotlight + Quick Prompts */}
                        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4 self-start">
                            {/* 1. Mini Podium Spotlight Card */}
                            <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                            <Trophy className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                                                Top 3 Dẫn Đầu Thi Đua
                                            </h4>
                                            <p className="text-[10px] text-slate-400">Bấm để gửi lời chúc mừng nhanh</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setLayoutView('LEADERBOARD')}
                                        className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                    >
                                        <span>Xem tất cả</span>
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* Top 3 Quick Items */}
                                <div className="space-y-2">
                                    {(activeData.topThree || []).map((champ: any, idx: number) => {
                                        const isFirst = idx === 0;
                                        const isSecond = idx === 1;
                                        const medal = isFirst ? '🥇' : isSecond ? '🥈' : '🥉';
                                        const title = mode === 'INDIVIDUAL' ? (champ.user?.name || 'Chiến binh') : (champ.group?.name || 'Đội thi đua');
                                        const subtitle = mode === 'INDIVIDUAL' 
                                            ? (champ.user?.employeeProfile?.department || champ.user?.role || 'Thành viên')
                                            : `${champ.group?.members?.length || 0} thành viên`;

                                        return (
                                            <div 
                                                key={idx}
                                                className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                                                    isFirst 
                                                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/80' 
                                                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-base shrink-0">{medal}</span>
                                                    {mode === 'INDIVIDUAL' ? (
                                                        <img
                                                            src={champ.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(champ.user?.name || 'U')}&background=059669&color=fff&size=60`}
                                                            alt="Avatar"
                                                            className="w-8 h-8 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                                                        />
                                                    ) : (
                                                        <div 
                                                            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-xs shrink-0 border border-slate-300 dark:border-slate-700"
                                                            style={{ background: `${champ.group?.color || '#059669'}30` }}
                                                        >
                                                            {champ.group?.avatar || '🛡️'}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                                            {title}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 truncate">
                                                            {formatScoreValue(champ.score || 0)}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        if (mode === 'TEAM' && champ.group) {
                                                            handleCheerTeam(champ.group.name, champ.group.id);
                                                        } else if (mode === 'INDIVIDUAL' && champ.user) {
                                                            handleCheerUser(champ.user.name, champ.user.id);
                                                        }
                                                    }}
                                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1 ${
                                                        isFirst 
                                                            ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 font-black shadow-xs' 
                                                            : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
                                                    }`}
                                                >
                                                    <Sparkles className="w-2.5 h-2.5" />
                                                    <span>Cổ vũ</span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. Quick Cheer Prompts & Inspiration */}
                            <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 pb-1">
                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                                        Gợi Ý Lời Chúc Nhanh
                                    </h4>
                                </div>
                                <div className="space-y-1.5">
                                    {[
                                        '🎉 Chúc mừng Quán Quân tiếp tục dẫn đầu!',
                                        '🔥 Đội nhóm quyết tâm bứt phá 100% KPI!',
                                        '💪 Tinh thần chiến binh không ngại thử thách!',
                                        '🚀 Cùng nhau tăng tốc cán đích tháng này!'
                                    ].map((promptText, pIdx) => (
                                        <button
                                            key={pIdx}
                                            onClick={() => {
                                                const top1 = activeData.topThree?.[0];
                                                if (top1) {
                                                    if (mode === 'TEAM' && top1.group) {
                                                        handleCheerTeam(top1.group.name, top1.group.id);
                                                    } else if (mode === 'INDIVIDUAL' && top1.user) {
                                                        handleCheerUser(top1.user.name, top1.user.id);
                                                    }
                                                }
                                            }}
                                            className="w-full text-left p-2.5 rounded-xl text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors flex items-center justify-between group cursor-pointer"
                                        >
                                            <span className="truncate">{promptText}</span>
                                            <PlusCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 3. Trending Tags */}
                            <div className="rounded-3xl p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-emerald-400" />
                                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-300">Chủ Đề Nóng</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {['#VinhDanhTSOL', '#ChotDealKhung', '#VuotChiTieu', '#ChienBinhTSOL', '#TinhThanDongDoi'].map((tag, tIdx) => (
                                        <span 
                                            key={tIdx}
                                            className="px-2 py-0.5 rounded-lg bg-slate-800/80 text-[10px] font-bold text-slate-300 border border-slate-700/60"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT MAIN STREAM (8 Cols): Create Post + Social Cards */}
                        <div className="lg:col-span-8 space-y-4">
                            <div className="flex items-center justify-between pb-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                                        <MessageSquare className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                                            Bảng Tin Mạng Xã Hội Nội Bộ TSOL
                                        </h3>
                                        <p className="text-[11px] text-slate-400">
                                            Không gian giao lưu, chúc mừng và lan tỏa năng lượng tích cực
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={refreshFeed}
                                    disabled={isRefreshingFeed}
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Làm mới bảng tin"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingFeed ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            <CreatePostBox
                                currentUser={currentUser}
                                competitionGroups={competitionGroups}
                                onPostCreated={refreshFeed}
                                initialMention={activeMention}
                                onClearInitialMention={() => setActiveMention(null)}
                            />

                            <div className="space-y-4">
                                {feedData.posts && feedData.posts.length > 0 ? (
                                    feedData.posts.map((post: any) => (
                                        <SocialFeedCard
                                            key={post.id}
                                            post={post}
                                            currentUserId={currentUser?.id}
                                            currentUserRole={currentUser?.role}
                                            onPostUpdated={refreshFeed}
                                            onViewProfile={id => setSelectedUserIdForProfile(id)}
                                        />
                                    ))
                                ) : (
                                    <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-slate-400">
                                        <Sparkles className="w-8 h-8 mx-auto text-amber-400 mb-2 opacity-60" />
                                        <p className="font-medium text-xs">Chưa có bài viết nào trên bảng tin.</p>
                                        <p className="text-[11px] text-slate-500 mt-1">Hãy là người đầu tiên đăng bài chúc mừng đồng đội!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* User Mini Profile Modal (Facebook-style profile preview) */}
            <UserProfileModal
                userId={selectedUserIdForProfile}
                onClose={() => setSelectedUserIdForProfile(null)}
                onCheerUser={handleCheerUser}
            />

            {/* Competition Group Management Modal */}
            <CompetitionGroupModal
                group={selectedGroupForEdit}
                isOpen={isGroupModalOpen}
                onClose={() => {
                    setIsGroupModalOpen(false);
                    setSelectedGroupForEdit(null);
                }}
                onSuccess={handleGroupSaved}
            />
        </div>
    );
}
