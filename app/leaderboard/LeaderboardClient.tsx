'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Target, Users, DollarSign, FileText, TrendingUp, Sparkles, MessageSquare, Calendar, RefreshCw, Star, Award, ShieldCheck, Heart, PlusCircle, Shield, UserCheck, Layers } from 'lucide-react';
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
    const [mode, setMode] = useState<LeaderboardMode>('INDIVIDUAL');
    const [criteria, setCriteria] = useState<CriteriaKey>(initialLeaderboard.criteria || 'REVENUE');
    const [timeRange, setTimeRange] = useState<TimeRangeKey>(initialLeaderboard.timeRange || 'THIS_MONTH');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const [leaderboardData, setLeaderboardData] = useState<any>(initialLeaderboard);
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
                setLeaderboardData(data);
            } else {
                const data = await getGroupLeaderboardData({
                    criteria,
                    timeRange,
                    customStart: customStart || undefined,
                    customEnd: customEnd || undefined
                });
                setLeaderboardData(data);
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
            const data = await getSocialFeed({ page: 1, limit: 20 });
            setFeedData(data);
        } catch (err) {
            console.error('Error refreshing feed:', err);
        } finally {
            setIsRefreshingFeed(false);
        }
    };

    const handleCheerUser = (userName: string, userId: string) => {
        setActiveMention({ name: userName, id: userId, type: 'USER' });
        const postBox = document.getElementById('social-wall-section');
        if (postBox) {
            postBox.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleCheerTeam = (groupName: string, groupId: string) => {
        setActiveMention({ name: groupName, id: groupId, type: 'TEAM' });
        const postBox = document.getElementById('social-wall-section');
        if (postBox) {
            postBox.scrollIntoView({ behavior: 'smooth' });
        }
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

    return (
        <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 md:p-6 lg:p-8 font-sans space-y-6 max-w-[1600px] mx-auto">
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
                                {formatVND(leaderboardData.summary?.totalRevenue || 0)}
                            </div>
                        </div>

                        <div 
                            className="p-3.5 rounded-2xl border text-center shadow-md"
                            style={{ background: '#1e293b', borderColor: '#334155' }}
                        >
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Khách Hàng Mới</div>
                            <div className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">
                                {leaderboardData.summary?.totalCustomers || 0}
                            </div>
                        </div>

                        <div 
                            className="p-3.5 rounded-2xl border text-center shadow-md"
                            style={{ background: '#1e293b', borderColor: '#334155' }}
                        >
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cơ Hội Bán</div>
                            <div className="text-sm sm:text-base font-black text-blue-400 mt-0.5">
                                {leaderboardData.summary?.totalLeads || 0}
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
                                {mode === 'INDIVIDUAL' ? (leaderboardData.summary?.activeMembers || 0) : (leaderboardData.summary?.activeGroups || 0)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Criteria Selection Bar */}
            <div 
                className="rounded-3xl p-4 sm:p-5 shadow-sm border space-y-4"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
            >
                {/* 1. Mode Switcher (Cá Nhân vs Đội Nhóm) & Create Group button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                            Chế độ vinh danh:
                        </span>
                        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                            <button
                                type="button"
                                onClick={() => setMode('INDIVIDUAL')}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === 'INDIVIDUAL' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}`}
                            >
                                <Users className="w-3.5 h-3.5" />
                                <span>🏆 Vinh Danh Cá Nhân</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode('TEAM')}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === 'TEAM' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}`}
                            >
                                <Shield className="w-3.5 h-3.5" />
                                <span>🛡️ Tập Thể / Nhóm Thi Đua</span>
                            </button>
                        </div>
                    </div>

                    {/* Admin / Manager Group Management Action */}
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => handleOpenGroupModal()}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                            <PlusCircle className="w-4 h-4 text-amber-600" />
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

            {/* Main Content: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Podium & Full Ranking List (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Top 3 Podium */}
                    <LeaderboardPodium
                        mode={mode}
                        topThree={leaderboardData.topThree || []}
                        criteria={criteria}
                        onCheerUser={handleCheerUser}
                        onCheerTeam={handleCheerTeam}
                        onViewProfile={id => setSelectedUserIdForProfile(id)}
                    />

                    {/* Full Ranking List Table */}
                    <RankListTable
                        mode={mode}
                        leaderboard={leaderboardData.fullList || []}
                        criteria={criteria}
                        currentUserId={currentUser?.id}
                        currentUserRole={currentUser?.role}
                        onCheerUser={handleCheerUser}
                        onCheerTeam={handleCheerTeam}
                        onViewProfile={id => setSelectedUserIdForProfile(id)}
                        onEditGroup={handleOpenGroupModal}
                    />
                </div>

                {/* RIGHT COLUMN: Social Wall / Live Feed (Mini Facebook, 5 Cols) */}
                <div id="social-wall-section" className="lg:col-span-5 space-y-4">
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

                    {/* Feed Posts List */}
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
