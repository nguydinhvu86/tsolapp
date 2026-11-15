'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Megaphone,
    Activity,
    Bell,
    BellRing,
    AlertTriangle,
    FileText,
    Image as ImageIcon,
    FileSpreadsheet,
    CheckCircle2,
    Calendar,
    Pin,
    Eye,
    Plus,
    Trash2,
    ArrowRight,
    ExternalLink,
    Lock,
    Search,
    Filter,
    X,
    Sparkles,
    User,
    Clock,
    Flame,
    ShieldAlert,
    ChevronRight,
    MessageSquare,
    Target,
    Copy,
    Check,
    Bold,
    List
} from 'lucide-react';
import { SystemActivityItem, CompanyAnnouncementItem } from '@/lib/bulletin-service';
import { createCompanyAnnouncement, deleteCompanyAnnouncement } from '@/app/dashboard/actions';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { toast } from '@/app/components/providers/ToastProvider';

interface BulletinBoardWidgetProps {
    activities?: SystemActivityItem[];
    announcements?: CompanyAnnouncementItem[];
    isAdminOrManager?: boolean;
    userPermissions?: string[];
    userRole?: string;
    currentUserId?: string;
    userName?: string;
    onClose?: () => void;
}

// Helper to render formatted rich announcement content with symbols, bold text, bullet points and line breaks
function renderFormattedContent(text: string) {
    if (!text) return null;

    // Helper to parse **bold** inside a single line
    const parseBold = (line: string, lineKey: string | number) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, idx) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                const boldContent = part.slice(2, -2);
                return (
                    <strong key={`${lineKey}-${idx}`} className="font-extrabold text-slate-900 bg-amber-100/60 text-amber-950 px-1 py-0.2 rounded">
                        {boldContent}
                    </strong>
                );
            }
            return <React.Fragment key={`${lineKey}-${idx}`}>{part}</React.Fragment>;
        });
    };

    const lines = text.split('\n');

    return (
        <div className="space-y-2 text-slate-800 text-xs sm:text-sm leading-relaxed font-sans select-text">
            {lines.map((line, idx) => {
                const trimmed = line.trim();

                // Empty line becomes a vertical spacer
                if (!trimmed) {
                    return <div key={idx} className="h-2.5" />;
                }

                // Sub-bullet point (indented) starting with 2+ spaces or tabs and • or -
                const isSubBullet = /^(\s{2,}|\t)[•\-*]\s+/.test(line);
                if (isSubBullet) {
                    const cleanText = line.trim().replace(/^[•\-*]\s+/, '');
                    return (
                        <div key={idx} className="flex items-start gap-2.5 pl-6 sm:pl-8 py-0.5 text-slate-700">
                            <span className="text-slate-400 font-bold text-xs shrink-0 select-none leading-none pt-1">◦</span>
                            <span className="flex-1 leading-relaxed">{parseBold(cleanText, idx)}</span>
                        </div>
                    );
                }

                // Bullet point starting with • or - or *
                const isBullet = /^[•\-*]\s+/.test(trimmed);
                if (isBullet) {
                    const cleanText = trimmed.replace(/^[•\-*]\s+/, '');
                    return (
                        <div key={idx} className="flex items-start gap-2.5 pl-2 sm:pl-3 py-0.5">
                            <span className="text-indigo-600 font-black text-sm shrink-0 select-none leading-none pt-0.5">•</span>
                            <span className="flex-1 leading-relaxed text-slate-800">{parseBold(cleanText, idx)}</span>
                        </div>
                    );
                }

                // Numbered list item like 1. or 2.
                const isNumbered = /^\d+\.\s+/.test(trimmed);
                if (isNumbered) {
                    const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
                    if (match) {
                        return (
                            <div key={idx} className="flex items-start gap-2.5 pl-2 sm:pl-3 py-0.5">
                                <span className="font-extrabold text-indigo-700 text-xs sm:text-sm shrink-0 select-none pt-0.5">{match[1]}</span>
                                <span className="flex-1 leading-relaxed font-medium text-slate-800">{parseBold(match[2], idx)}</span>
                            </div>
                        );
                    }
                }

                // Normal paragraph line
                return (
                    <p key={idx} className="min-h-[1.3rem] leading-relaxed">
                        {parseBold(line, idx)}
                    </p>
                );
            })}
        </div>
    );
}

export function BulletinBoardWidget({
    activities = [],
    announcements: initialAnnouncements = [],
    isAdminOrManager = false,
    userPermissions = [],
    userRole = '',
    currentUserId = '',
    userName = '',
    onClose
}: BulletinBoardWidgetProps) {
    const router = useRouter();

    const [announcements, setAnnouncements] = useState<CompanyAnnouncementItem[]>(initialAnnouncements);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isFullActivityModalOpen, setIsFullActivityModalOpen] = useState(false);
    const [isFullAnnouncementModalOpen, setIsFullAnnouncementModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<CompanyAnnouncementItem | null>(null);

    // Filter states for Full View Modals
    const [activitySearch, setActivitySearch] = useState('');
    const [activityTypeFilter, setActivityTypeFilter] = useState<string>('ALL');
    const [announcementSearch, setAnnouncementSearch] = useState('');

    // Form state for creating announcement
    const [formTitle, setFormTitle] = useState('');
    const [formContent, setFormContent] = useState('');
    const [formType, setFormType] = useState<'GENERAL' | 'POLICY' | 'URGENT' | 'MISSION' | 'EVENT'>('GENERAL');
    const [formIsUrgent, setFormIsUrgent] = useState(false);
    const [formIsPinned, setFormIsPinned] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createTab, setCreateTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
    const contentTextareaRef = React.useRef<HTMLTextAreaElement>(null);

    const insertIntoContent = (snippet: string) => {
        const textarea = contentTextareaRef.current;
        if (!textarea) {
            setFormContent(prev => prev + snippet);
            return;
        }
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const current = textarea.value;

        let newText = '';
        let newCursor = start + snippet.length;

        if (snippet === '**in đậm**') {
            const selected = current.substring(start, end);
            if (selected) {
                newText = current.substring(0, start) + `**${selected}**` + current.substring(end);
                newCursor = end + 4;
            } else {
                newText = current.substring(0, start) + '**in đậm**' + current.substring(end);
                newCursor = start + 2;
            }
        } else {
            newText = current.substring(0, start) + snippet + current.substring(end);
        }

        setFormContent(newText);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursor, newCursor);
        }, 10);
    };

    // Find any urgent announcement to show flashing banner / priority alert
    const activeUrgentAnnouncement = useMemo(() => {
        return announcements.find(a => a.isUrgent);
    }, [announcements]);

    // Check permission helper
    const checkCanViewLink = (perm?: string) => {
        if (!perm) return true;
        if (isAdminOrManager || userRole === 'ADMIN') return true;
        return userPermissions.includes(perm);
    };

    // Handle clicking on an activity link
    const handleActivityClick = (activity: SystemActivityItem) => {
        if (!activity.targetLink || activity.targetLink === '#') return;

        const hasAccess = checkCanViewLink(activity.requiredPermission);
        if (!hasAccess) {
            toast.warning(
                'Bạn không có quyền xem thông tin này!',
                'Vui lòng liên hệ Quản trị viên để được cấp quyền xem dữ liệu liên quan.'
            );
            return;
        }

        router.push(activity.targetLink);
    };

    // Format relative time in Vietnamese
    const formatRelativeTime = (timestamp: string | Date) => {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (diffSeconds < 60) return 'Vừa xong';
            const diffMinutes = Math.floor(diffSeconds / 60);
            if (diffMinutes < 60) return `${diffMinutes} phút trước`;
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24) return `${diffHours} giờ trước`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays === 1) return 'Hôm qua';
            if (diffDays < 7) return `${diffDays} ngày trước`;

            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return '';
        }
    };

    // Activity icon and color styling
    const getActivityMeta = (type: SystemActivityItem['type']) => {
        switch (type) {
            case 'PHOTO':
                return {
                    icon: ImageIcon,
                    badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
                    dotColor: 'bg-pink-500'
                };
            case 'DOCUMENT':
                return {
                    icon: FileText,
                    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    dotColor: 'bg-indigo-500'
                };
            case 'QUOTE':
                return {
                    icon: FileSpreadsheet,
                    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
                    dotColor: 'bg-amber-500'
                };
            case 'INVOICE':
                return {
                    icon: FileSpreadsheet,
                    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    dotColor: 'bg-emerald-500'
                };
            case 'TASK_DONE':
                return {
                    icon: CheckCircle2,
                    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
                    dotColor: 'bg-teal-500'
                };
            case 'LEAD':
                return {
                    icon: Target,
                    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
                    dotColor: 'bg-blue-500'
                };
            default:
                return {
                    icon: Activity,
                    badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
                    dotColor: 'bg-slate-500'
                };
        }
    };

    // Announcement badge styling
    const getAnnouncementBadge = (type: string, isUrgent?: boolean) => {
        if (isUrgent) {
            return {
                label: 'Khẩn Cấp',
                className: 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold shadow-2xs',
                icon: AlertTriangle
            };
        }
        switch (type) {
            case 'POLICY':
                return {
                    label: 'Nội Quy',
                    className: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
                    icon: ShieldAlert
                };
            case 'MISSION':
                return {
                    label: 'Bảng Nhiệm Vụ',
                    className: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold',
                    icon: Target
                };
            case 'EVENT':
                return {
                    label: 'Lịch & Sự Kiện',
                    className: 'bg-purple-50 text-purple-800 border-purple-200 font-bold',
                    icon: Calendar
                };
            default:
                return {
                    label: 'Thông Báo',
                    className: 'bg-blue-50 text-blue-800 border-blue-200 font-bold',
                    icon: Bell
                };
        }
    };

    // Handle creating announcement
    const handleCreateAnnouncement = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!formTitle.trim() || !formContent.trim()) {
            toast.warning('Vui lòng nhập đầy đủ Tiêu đề và Nội dung thông báo!');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await createCompanyAnnouncement({
                title: formTitle.trim(),
                content: formContent.trim(),
                type: formIsUrgent ? 'URGENT' : formType,
                isUrgent: formIsUrgent,
                isPinned: formIsPinned || formIsUrgent
            });

            if (res.success && res.data) {
                toast.success('Đã đăng thông báo mới lên Bulletin thành công!');
                setAnnouncements(prev => [res.data, ...prev]);
                setIsCreateModalOpen(false);
                setFormTitle('');
                setFormContent('');
                setFormType('GENERAL');
                setFormIsUrgent(false);
                setFormIsPinned(false);
            } else {
                toast.error(res.error || 'Không thể đăng thông báo');
            }
        } catch (err: any) {
            toast.error(err.message || 'Lỗi khi gửi thông báo');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle deleting announcement
    const handleDeleteAnnouncement = async (id: string, title: string) => {
        if (!confirm(`Bạn có chắc muốn xóa thông báo "${title}"?`)) return;

        try {
            const res = await deleteCompanyAnnouncement(id);
            if (res.success) {
                toast.success('Đã xóa thông báo');
                setAnnouncements(prev => prev.filter(a => a.id !== id));
                if (selectedAnnouncement?.id === id) setSelectedAnnouncement(null);
            } else {
                toast.error(res.error || 'Lỗi khi xóa');
            }
        } catch (err: any) {
            toast.error(err.message || 'Lỗi hệ thống');
        }
    };

    // Top 5 items for default compact preview
    const topActivities = useMemo(() => activities.slice(0, 5), [activities]);
    const topAnnouncements = useMemo(() => announcements.slice(0, 5), [announcements]);

    // Filtered activities for Full Modal
    const filteredFullActivities = useMemo(() => {
        return activities.filter(a => {
            const matchSearch = activitySearch.trim() === '' || 
                a.userName.toLowerCase().includes(activitySearch.toLowerCase()) ||
                a.targetTitle.toLowerCase().includes(activitySearch.toLowerCase()) ||
                a.actionText.toLowerCase().includes(activitySearch.toLowerCase()) ||
                (a.extraDetails && a.extraDetails.toLowerCase().includes(activitySearch.toLowerCase()));

            const matchType = activityTypeFilter === 'ALL' || a.type === activityTypeFilter;
            return matchSearch && matchType;
        });
    }, [activities, activitySearch, activityTypeFilter]);

    // Filtered announcements for Full Modal
    const filteredFullAnnouncements = useMemo(() => {
        return announcements.filter(a => {
            return announcementSearch.trim() === '' ||
                a.title.toLowerCase().includes(announcementSearch.toLowerCase()) ||
                a.content.toLowerCase().includes(announcementSearch.toLowerCase()) ||
                (a.authorName && a.authorName.toLowerCase().includes(announcementSearch.toLowerCase()));
        });
    }, [announcements, announcementSearch]);

    return (
        <div className="w-full space-y-3">
            {/* Urgent Priority Marquee / Flashing Banner if there is an urgent announcement */}
            {activeUrgentAnnouncement && (
                <div 
                    onClick={() => setSelectedAnnouncement(activeUrgentAnnouncement)}
                    className="cursor-pointer group relative overflow-hidden rounded-2xl p-3 sm:p-3.5 border-2 border-rose-500 bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 shadow-md shadow-rose-500/10 transition-all hover:shadow-lg bulletin-urgent-active"
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {/* Flashing Emergency Beacon */}
                            <span className="relative flex h-3.5 w-3.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600"></span>
                            </span>

                            <div className="flex items-center gap-2 min-w-0">
                                <span className="px-2 py-0.5 rounded-md text-[10.5px] font-black uppercase tracking-wider bg-rose-600 text-white shrink-0 shadow-2xs flex items-center gap-1">
                                    <BellRing size={12} className="animate-bounce" />
                                    <span>THÔNG BÁO KHẨN CẤP</span>
                                </span>
                                <h4 className="text-xs sm:text-sm font-extrabold text-rose-950 truncate group-hover:text-rose-700 transition-colors">
                                    {activeUrgentAnnouncement.title}
                                </h4>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-rose-700 text-xs font-bold">
                            <span className="hidden sm:inline">Nhấn để xem chi tiết</span>
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Bulletin Card: 2-Column Split */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Master Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/60 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                            <Megaphone size={20} className="stroke-[2.3]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                                    Bảng Tin Bulletin
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Trực Tuyến
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Cập nhật toàn bộ hoạt động của hệ thống & Bảng nhiệm vụ, thông báo chính thức từ Công ty
                            </p>
                        </div>
                    </div>

                    {/* Admin Actions & Close Button */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        {isAdminOrManager && (
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-600/20 active:scale-98 transition-all cursor-pointer"
                            >
                                <Plus size={15} strokeWidth={2.5} />
                                <span>Đăng Thông Báo Công Ty</span>
                            </button>
                        )}
                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                                title="Đóng bảng tin Bulletin"
                            >
                                <X size={15} strokeWidth={2.2} />
                                <span className="hidden sm:inline">Đóng bảng tin</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* 2-Columns Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                    {/* ================= LEFT COLUMN: SYSTEM ACTIVITY STREAM (60% on desktop) ================= */}
                    <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between">
                        <div>
                            {/* Column Subheader */}
                            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                                        <Activity size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                            Hoạt Động Toàn Hệ Thống
                                        </h3>
                                        <span className="text-[11px] text-slate-400">
                                            Sắp xếp theo thứ tự mới nhất (Top 5 gần đây)
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsFullActivityModalOpen(true)}
                                    className="text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Xem toàn bộ hoạt động"
                                >
                                    <span>Xem đầy đủ bảng tin ({activities.length})</span>
                                    <ChevronRight size={14} />
                                </button>
                            </div>

                            {/* 5 Compact Rows List */}
                            <div className="space-y-2.5">
                                {topActivities.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                        Chưa có hoạt động nào được ghi nhận gần đây.
                                    </div>
                                ) : (
                                    topActivities.map((item) => {
                                        const meta = getActivityMeta(item.type);
                                        const Icon = meta.icon;
                                        const hasAccess = checkCanViewLink(item.requiredPermission);

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => handleActivityClick(item)}
                                                className={`group p-3 rounded-xl border border-slate-200/70 bg-white hover:bg-slate-50/80 hover:border-slate-300 transition-all cursor-pointer shadow-2xs relative flex items-start gap-3 ${
                                                    !hasAccess ? 'opacity-85' : ''
                                                }`}
                                            >
                                                {/* User Avatar / Initials */}
                                                <div className="relative shrink-0 mt-0.5">
                                                    {item.userAvatar ? (
                                                        <img
                                                            src={item.userAvatar}
                                                            alt={item.userName}
                                                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                                                            {item.userName ? item.userName.charAt(0).toUpperCase() : 'U'}
                                                        </div>
                                                    )}
                                                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${meta.dotColor}`} />
                                                </div>

                                                {/* Content Details */}
                                                <div className="flex-1 min-w-0 text-xs">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="font-bold text-slate-900 truncate">
                                                            <span>{item.userName}</span>{' '}
                                                            <span className="font-normal text-slate-500">{item.actionText}</span>
                                                        </div>
                                                        <span className="text-[11px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
                                                            <Clock size={11} />
                                                            {formatRelativeTime(item.timestamp)}
                                                        </span>
                                                    </div>

                                                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-semibold text-emerald-800 group-hover:text-emerald-600 truncate max-w-full inline-flex items-center gap-1 transition-colors">
                                                            <Icon size={12} className="shrink-0 text-slate-400 group-hover:text-emerald-600" />
                                                            <span className="truncate">{item.targetTitle}</span>
                                                        </span>

                                                        {item.extraDetails && (
                                                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                                                {item.extraDetails}
                                                            </span>
                                                        )}

                                                        {!hasAccess && (
                                                            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold ml-auto" title="Bạn không có quyền xem thông tin chi tiết này">
                                                                <Lock size={10} /> Không có quyền
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Bottom Link for Left Column */}
                        <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsFullActivityModalOpen(true)}
                                className="text-xs font-semibold text-slate-600 hover:text-teal-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                                <span>Xem toàn bộ dòng hoạt động</span>
                                <ArrowRight size={13} />
                            </button>
                        </div>
                    </div>

                    {/* ================= RIGHT COLUMN: COMPANY NOTICES & MISSION BOARD (40% on desktop) ================= */}
                    <div className="lg:col-span-5 p-4 sm:p-5 bg-slate-50/40 flex flex-col justify-between">
                        <div>
                            {/* Column Subheader */}
                            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                                        <Bell size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                            Bảng Thông Báo & Nhiệm Vụ
                                        </h3>
                                        <span className="text-[11px] text-slate-400">
                                            Chỉ đạo chính thức từ Ban Quản Trị
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsFullAnnouncementModalOpen(true)}
                                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Xem toàn bộ thông báo"
                                >
                                    <span>Xem tất cả ({announcements.length})</span>
                                    <ChevronRight size={14} />
                                </button>
                            </div>

                            {/* 5 Compact Rows List */}
                            <div className="space-y-2.5">
                                {topAnnouncements.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 text-xs italic bg-white rounded-xl border border-dashed border-slate-200">
                                        Chưa có thông báo nào từ Ban Quản Trị.
                                    </div>
                                ) : (
                                    topAnnouncements.map((ann) => {
                                        const badge = getAnnouncementBadge(ann.type, ann.isUrgent);
                                        const BadgeIcon = badge.icon;

                                        return (
                                            <div
                                                key={ann.id}
                                                onClick={() => setSelectedAnnouncement(ann)}
                                                className={`group p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer shadow-2xs relative flex flex-col justify-between ${
                                                    ann.isUrgent
                                                        ? 'bg-rose-50/90 border-rose-400 hover:bg-rose-100/90 bulletin-urgent-active ring-1 ring-rose-400/50'
                                                        : ann.isPinned
                                                        ? 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50/80 hover:border-indigo-300'
                                                        : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                                                }`}
                                                title="Nhấn để xem chi tiết toàn văn thông báo"
                                            >
                                                {/* Header: Category Badge + Pinned + Time */}
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border ${badge.className}`}>
                                                            <BadgeIcon size={11} className={ann.isUrgent ? 'animate-bounce text-rose-600' : ''} />
                                                            <span>{badge.label}</span>
                                                        </span>

                                                        {ann.isPinned && !ann.isUrgent && (
                                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.2 rounded border border-indigo-200">
                                                                <Pin size={10} /> Đã ghim
                                                            </span>
                                                        )}
                                                    </div>

                                                    <span className="text-[10.5px] font-mono text-slate-400 shrink-0">
                                                        {formatRelativeTime(ann.createdAt)}
                                                    </span>
                                                </div>

                                                {/* Title Only - Clean, Compact, Bold */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className={`text-xs font-bold leading-snug line-clamp-2 transition-colors ${
                                                        ann.isUrgent ? 'text-rose-950 group-hover:text-rose-700' : 'text-slate-900 group-hover:text-indigo-700'
                                                    }`}>
                                                        {ann.title}
                                                    </h4>
                                                    <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Bottom Link for Right Column */}
                        <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                            <span className="text-slate-400 text-[11px]">
                                {activeUrgentAnnouncement ? '🚨 Có thông báo khẩn cấp đang ưu tiên' : 'Cập nhật từ Ban Giám Đốc'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsFullAnnouncementModalOpen(true)}
                                className="font-semibold text-slate-600 hover:text-indigo-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                                <span>Xem đầy đủ bảng tin</span>
                                <ArrowRight size={13} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= MODAL: CREATE COMPANY ANNOUNCEMENT ================= */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Đăng Thông Báo Công Ty Mới (Bulletin)"
                maxWidth="650px"
            >
                <form onSubmit={handleCreateAnnouncement} className="space-y-4 py-1 text-slate-800">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Tiêu đề thông báo <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder="VD: [NỘI QUY] Quy định về giờ làm việc và bảo mật dữ liệu..."
                            className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-semibold"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Phân loại thông báo
                            </label>
                            <select
                                value={formType}
                                onChange={(e) => setFormType(e.target.value as any)}
                                className="w-full h-9 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                            >
                                <option value="GENERAL">Thông Báo Chung</option>
                                <option value="POLICY">Nội Quy & Quy Chế Công Ty</option>
                                <option value="MISSION">Bảng Nhiệm Vụ & Chỉ Tiêu Trọng Tâm</option>
                                <option value="EVENT">Lịch Nghỉ Lễ & Sự Kiện Doanh Nghiệp</option>
                                <option value="URGENT">Thông Báo Khẩn Cấp</option>
                            </select>
                        </div>

                        <div className="space-y-1.5 flex flex-col justify-end">
                            <label className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 border border-rose-200 cursor-pointer hover:bg-rose-100/70 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formIsUrgent}
                                    onChange={(e) => {
                                        setFormIsUrgent(e.target.checked);
                                        if (e.target.checked) setFormIsPinned(true);
                                    }}
                                    className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                                    <Flame size={14} className="text-rose-600" />
                                    <span>Đánh dấu là KHẨN CẤP (Nhấp nháy & Ghim đầu)</span>
                                </span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-700">
                                Nội dung chi tiết thông báo <span className="text-rose-500">*</span>
                            </label>
                            
                            {/* Editor vs Preview tabs */}
                            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setCreateTab('EDIT')}
                                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                        createTab === 'EDIT' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Soạn thảo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCreateTab('PREVIEW')}
                                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                        createTab === 'PREVIEW' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Xem trước
                                </button>
                            </div>
                        </div>

                        {createTab === 'EDIT' ? (
                            <>
                                {/* Quick Toolbar: Bold, Bullets & Quick Symbols */}
                                <div className="mb-2 p-2 bg-slate-100/90 rounded-lg border border-slate-200 flex items-center gap-1.5 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => insertIntoContent('**in đậm**')}
                                        className="h-6 px-2 rounded bg-white hover:bg-slate-200/80 border border-slate-300 text-slate-800 text-[11px] font-black inline-flex items-center gap-1 cursor-pointer transition-colors"
                                        title="Chèn chữ in đậm"
                                    >
                                        <Bold size={11} strokeWidth={3} />
                                        <span>In đậm</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => insertIntoContent('\n• ')}
                                        className="h-6 px-2 rounded bg-white hover:bg-slate-200/80 border border-slate-300 text-slate-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                                        title="Chèn gạch đầu dòng"
                                    >
                                        <List size={11} strokeWidth={2.5} />
                                        <span>Gạch đầu dòng</span>
                                    </button>

                                    <div className="h-4 w-px bg-slate-300 mx-0.5" />

                                    <span className="text-[10.5px] font-semibold text-slate-500 mr-0.5">Biểu tượng:</span>
                                    {[
                                        { s: '⚠️', label: 'Cảnh báo' },
                                        { s: '📢', label: 'Thông báo' },
                                        { s: '📌', label: 'Ghim' },
                                        { s: '🎯', label: 'Mục tiêu' },
                                        { s: '🚀', label: 'Tiến độ' },
                                        { s: '💡', label: 'Lưu ý' },
                                        { s: '🏢', label: 'Công ty' },
                                        { s: '✔️', label: 'Đạt' },
                                        { s: '❌', label: 'Không đạt' },
                                        { s: '🔥', label: 'Gấp' },
                                        { s: '👉', label: 'Chỉ đạo' },
                                        { s: '⭐', label: 'Quan trọng' },
                                        { s: '🕒', label: 'Thời gian' }
                                    ].map(item => (
                                        <button
                                            key={item.s}
                                            type="button"
                                            onClick={() => insertIntoContent(item.s + ' ')}
                                            className="h-6 px-1.5 rounded bg-white hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-xs cursor-pointer transition-transform hover:scale-110 active:scale-95"
                                            title={`Chèn biểu tượng ${item.label}`}
                                        >
                                            {item.s}
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    ref={contentTextareaRef}
                                    required
                                    rows={8}
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    placeholder="Nhập nội dung thông báo đầy đủ...&#10;&#10;Mẹo định dạng:&#10;• Dùng **chữ in đậm** để nhấn mạnh từ ngữ.&#10;• Bấm nút 'Gạch đầu dòng' để tạo danh sách ý.&#10;• Xuống dòng để ngắt các đoạn văn rõ ràng.&#10;• Chèn các biểu tượng symbol trên thanh công cụ để văn bản sinh động, chuyên nghiệp."
                                    className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-medium leading-relaxed resize-y font-mono"
                                />
                            </>
                        ) : (
                            <div className="p-4 bg-white rounded-lg border border-slate-300 min-h-[220px] max-h-[350px] overflow-y-auto custom-scrollbar">
                                {formContent.trim() ? (
                                    renderFormattedContent(formContent)
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Chưa có nội dung để xem trước. Vui lòng chuyển sang tab &quot;Soạn thảo&quot; để nhập nội dung.</span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsCreateModalOpen(false)}
                            disabled={isSubmitting}
                            className="px-4 h-9 text-xs font-semibold"
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 h-9 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-2xs"
                        >
                            {isSubmitting ? 'Đang đăng thông báo...' : 'Đăng Thông Báo Ngay'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ================= MODAL: READ SINGLE ANNOUNCEMENT DETAIL ================= */}
            <Modal
                isOpen={!!selectedAnnouncement}
                onClose={() => setSelectedAnnouncement(null)}
                title="Văn Bản Thông Báo Nội Bộ"
                maxWidth="750px"
            >
                {selectedAnnouncement && (() => {
                    const badge = getAnnouncementBadge(selectedAnnouncement.type, selectedAnnouncement.isUrgent);
                    const BadgeIcon = badge.icon;

                    return (
                        <div className="space-y-4 py-1 text-slate-800">
                            {/* Meta header */}
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${badge.className}`}>
                                        <BadgeIcon size={12} className={selectedAnnouncement.isUrgent ? 'animate-bounce text-rose-600' : ''} />
                                        <span>{badge.label}</span>
                                    </span>
                                    {selectedAnnouncement.isUrgent && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse shadow-2xs">
                                            <BellRing size={12} className="animate-bounce" />
                                            <span>ƯU TIÊN KHẨN CẤP</span>
                                        </span>
                                    )}
                                    {selectedAnnouncement.isPinned && !selectedAnnouncement.isUrgent && (
                                        <span className="text-xs font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                                            <Pin size={12} /> Đã ghim
                                        </span>
                                    )}
                                </div>

                                <div className="text-xs text-slate-500 flex items-center gap-2 sm:gap-3 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <User size={13} className="text-slate-400" />
                                        <span>Người đăng: <strong className="text-slate-700">{selectedAnnouncement.authorName || 'Ban Quản Trị'}</strong></span>
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={13} className="text-slate-400" />
                                        <span>{new Date(selectedAnnouncement.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Large Title Display */}
                            <div className="pt-1">
                                <h3 className={`text-base sm:text-lg font-black leading-snug tracking-tight ${
                                    selectedAnnouncement.isUrgent ? 'text-rose-950' : 'text-slate-900'
                                }`}>
                                    {selectedAnnouncement.title}
                                </h3>
                            </div>

                            {/* Rich Document Box */}
                            <div className="p-4 sm:p-6 bg-slate-50/60 rounded-2xl border border-slate-200/90 shadow-2xs max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {renderFormattedContent(selectedAnnouncement.content)}
                            </div>

                            {/* Footer buttons */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-200">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${selectedAnnouncement.title}\n\n${selectedAnnouncement.content}`);
                                            toast.success('Đã sao chép nội dung thông báo vào bộ nhớ đệm!');
                                        }}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                                        title="Sao chép toàn bộ tiêu đề & nội dung"
                                    >
                                        <Copy size={13} />
                                        <span>Sao chép nội dung</span>
                                    </button>

                                    {isAdminOrManager && (
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteAnnouncement(selectedAnnouncement.id, selectedAnnouncement.title)}
                                            className="px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                                        >
                                            <Trash2 size={13} />
                                            <span>Xóa thông báo</span>
                                        </button>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setSelectedAnnouncement(null)}
                                    className="px-5 h-8 text-xs font-semibold"
                                >
                                    Đóng
                                </Button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* ================= MODAL: FULL ACTIVITY STREAM (BẢNG TIN HOẠT ĐỘNG TOÀN BỘ) ================= */}
            <Modal
                isOpen={isFullActivityModalOpen}
                onClose={() => setIsFullActivityModalOpen(false)}
                title={`Dòng Hoạt Động Toàn Hệ Thống (${activities.length} sự kiện)`}
                maxWidth="850px"
            >
                <div className="space-y-3.5 py-1 text-slate-800">
                    {/* Filter Ribbon */}
                    <div className="flex flex-col sm:flex-row gap-2 justify-between sm:items-center">
                        <div className="relative flex-1 max-w-sm">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={activitySearch}
                                onChange={(e) => setActivitySearch(e.target.value)}
                                placeholder="Tìm theo tên nhân viên, sự kiện..."
                                className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-500 font-medium"
                            />
                        </div>

                        {/* Type Filter Pills */}
                        <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
                            {[
                                { id: 'ALL', label: 'Tất cả' },
                                { id: 'PHOTO', label: 'Ảnh' },
                                { id: 'DOCUMENT', label: 'Tài liệu' },
                                { id: 'QUOTE', label: 'Báo giá' },
                                { id: 'INVOICE', label: 'Hóa đơn' },
                                { id: 'TASK_DONE', label: 'Việc hoàn thành' },
                                { id: 'LEAD', label: 'Leads' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setActivityTypeFilter(t.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                                        activityTypeFilter === t.id
                                            ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable list */}
                    <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {filteredFullActivities.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs italic">
                                Không tìm thấy hoạt động nào phù hợp với bộ lọc.
                            </div>
                        ) : (
                            filteredFullActivities.map((item) => {
                                const meta = getActivityMeta(item.type);
                                const Icon = meta.icon;
                                const hasAccess = checkCanViewLink(item.requiredPermission);

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleActivityClick(item)}
                                        className="p-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-3 group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {item.userAvatar ? (
                                                <img
                                                    src={item.userAvatar}
                                                    alt={item.userName}
                                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                                    {item.userName ? item.userName.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                            )}

                                            <div className="text-xs min-w-0">
                                                <div className="text-slate-900 truncate">
                                                    <strong>{item.userName}</strong>{' '}
                                                    <span className="text-slate-500">{item.actionText}</span>
                                                </div>
                                                <div className="font-semibold text-emerald-800 group-hover:text-emerald-600 truncate flex items-center gap-1 mt-0.5">
                                                    <Icon size={12} className="shrink-0" />
                                                    <span className="truncate">{item.targetTitle}</span>
                                                    {item.extraDetails && (
                                                        <span className="text-[11px] font-mono text-slate-400 ml-1">
                                                            ({item.extraDetails})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {!hasAccess ? (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">
                                                    <Lock size={10} /> Không có quyền
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-mono text-slate-400">
                                                    {formatRelativeTime(item.timestamp)}
                                                </span>
                                            )}
                                            <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-600" />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-200">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsFullActivityModalOpen(false)}
                            className="px-4 h-8 text-xs font-semibold"
                        >
                            Đóng
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ================= MODAL: FULL ANNOUNCEMENTS LIST (TOÀN BỘ THÔNG BÁO) ================= */}
            <Modal
                isOpen={isFullAnnouncementModalOpen}
                onClose={() => setIsFullAnnouncementModalOpen(false)}
                title={`Toàn Bộ Bảng Thông Báo & Nhiệm Vụ (${announcements.length})`}
                maxWidth="850px"
            >
                <div className="space-y-3.5 py-1 text-slate-800">
                    <div className="flex items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={announcementSearch}
                                onChange={(e) => setAnnouncementSearch(e.target.value)}
                                placeholder="Tìm kiếm nội dung thông báo..."
                                className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 font-medium"
                            />
                        </div>

                        {isAdminOrManager && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFullAnnouncementModalOpen(false);
                                    setIsCreateModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                                <Plus size={14} />
                                <span>Thêm thông báo</span>
                            </button>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                        {filteredFullAnnouncements.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs italic">
                                Không có thông báo nào.
                            </div>
                        ) : (
                            filteredFullAnnouncements.map((ann) => {
                                const badge = getAnnouncementBadge(ann.type, ann.isUrgent);
                                const BadgeIcon = badge.icon;

                                return (
                                    <div
                                        key={ann.id}
                                        onClick={() => {
                                            setIsFullAnnouncementModalOpen(false);
                                            setSelectedAnnouncement(ann);
                                        }}
                                        className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
                                            ann.isUrgent
                                                ? 'bg-rose-50/90 border-rose-300 hover:bg-rose-100/80 ring-1 ring-rose-400/40'
                                                : ann.isPinned
                                                ? 'bg-indigo-50/50 border-indigo-200 hover:bg-indigo-50/80'
                                                : 'bg-white border-slate-200/90 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border ${badge.className}`}>
                                                    <BadgeIcon size={11} className={ann.isUrgent ? 'animate-bounce text-rose-600' : ''} />
                                                    <span>{badge.label}</span>
                                                </span>
                                                {ann.isPinned && !ann.isUrgent && (
                                                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded border border-indigo-200 flex items-center gap-0.5">
                                                        <Pin size={10} /> Đã ghim
                                                    </span>
                                                )}
                                            </div>

                                            <span className="text-[11px] font-mono text-slate-400">
                                                {new Date(ann.createdAt).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className={`text-xs sm:text-sm font-bold ${ann.isUrgent ? 'text-rose-950' : 'text-slate-900'}`}>
                                                {ann.title}
                                            </h4>
                                            <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 shrink-0">
                                                <span className="hidden sm:inline">Xem toàn văn</span>
                                                <ChevronRight size={14} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-200">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsFullAnnouncementModalOpen(false)}
                            className="px-4 h-8 text-xs font-semibold"
                        >
                            Đóng
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
