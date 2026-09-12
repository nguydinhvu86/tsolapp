'use client';

import React, { useState, useMemo } from 'react';
import { createLeaveRequest, updateLeaveRequest, cancelLeaveRequest } from '@/app/hr/attendance/actions';
import { LEAVE_TYPE_MAP } from '@/app/hr/attendance/constants';
import { 
    Plus, Check, X, Clock, Edit, FileImage, Eye, Calendar, UserCheck, 
    AlertCircle, CheckCircle, Ban, Printer, Search, Filter, Phone, 
    User, Paperclip, ChevronRight, FileText, Info, Sparkles, Send,
    CalendarPlus, UploadCloud, Sun, Sunrise, Sunset, Clock3,
    HeartPulse, Baby, Zap, CheckCircle2, ShieldCheck, HelpCircle
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';

interface LeaveRequestItem {
    id: string;
    userId: string;
    type: string;
    startDate: string | Date;
    endDate: string | Date;
    duration?: string;
    totalDays?: number;
    reason: string;
    handoverTo?: string | null;
    handoverUserId?: string | null;
    contactPhone?: string | null;
    imageUrl?: string | null;
    status: string;
    approverId?: string | null;
    approver?: { id: string; name?: string | null; email?: string | null; avatar?: string | null } | null;
    approverNote?: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
}

interface Colleague {
    id: string;
    name?: string | null;
    email: string;
    avatar?: string | null;
    role?: string;
}

const LEAVE_TYPES_CONFIG = [
    { 
        value: 'ANNUAL_LEAVE', 
        label: 'Nghỉ Phép Năm', 
        badge: 'Hưởng 100% lương', 
        desc: 'Trừ vào số ngày phép năm theo quy chế',
        icon: Sparkles,
        iconBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50',
        activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40',
        reasons: [
            "Nghỉ phép thường niên",
            "Du lịch nghỉ dưỡng cùng gia đình",
            "Giải quyết việc riêng cá nhân",
            "Về quê thăm gia đình / người thân"
        ]
    },
    { 
        value: 'SICK_LEAVE', 
        label: 'Nghỉ Ốm Đau', 
        badge: 'Hưởng BHXH 75%', 
        desc: 'Khám chữa bệnh, cần giấy tờ y tế xác nhận',
        icon: HeartPulse,
        iconBg: 'bg-sky-500/10 text-sky-600 border-sky-200/50',
        activeBorder: 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/40',
        reasons: [
            "Sốt / cảm cúm cần nghỉ tĩnh dưỡng",
            "Khám bệnh tại bệnh viện / cơ sở y tế",
            "Bác sĩ chỉ định nghỉ ngơi điều trị",
            "Chăm sóc con nhỏ bị ốm đau"
        ]
    },
    { 
        value: 'SPECIAL_LEAVE', 
        label: 'Việc Riêng Có Lương', 
        badge: 'Có hưởng lương', 
        desc: 'Bản thân kết hôn (3 ngày), hiếu hỉ tứ thân phụ mẫu',
        icon: CheckCircle2,
        iconBg: 'bg-purple-500/10 text-purple-600 border-purple-200/50',
        activeBorder: 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/40',
        reasons: [
            "Bản thân kết hôn (nghỉ 03 ngày có lương)",
            "Con kết hôn (nghỉ 01 ngày có lương)",
            "Tang lễ tứ thân phụ mẫu / vợ chồng / con (03 ngày)",
            "Chế độ việc riêng theo Luật Lao động"
        ]
    },
    { 
        value: 'UNPAID_LEAVE', 
        label: 'Nghỉ Không Lương', 
        badge: 'Không lương', 
        desc: 'Giải quyết việc cá nhân khi hết quỹ phép năm',
        icon: Calendar,
        iconBg: 'bg-slate-500/10 text-slate-600 border-slate-200/50',
        activeBorder: 'border-slate-500 ring-2 ring-slate-500/20 bg-slate-50/40',
        reasons: [
            "Việc gia đình đột xuất kéo dài",
            "Xử lý thủ tục hành chính / cá nhân",
            "Xin nghỉ việc riêng không hưởng lương",
            "Có kế hoạch cá nhân sau khi hết phép năm"
        ]
    },
    { 
        value: 'MATERNITY_LEAVE', 
        label: 'Thai Sản / Chế Độ', 
        badge: 'Chế độ thai sản', 
        desc: 'Khám thai, sinh con, dưỡng sức theo Luật BHXH',
        icon: Baby,
        iconBg: 'bg-pink-500/10 text-pink-600 border-pink-200/50',
        activeBorder: 'border-pink-500 ring-2 ring-pink-500/20 bg-pink-50/40',
        reasons: [
            "Khám thai định kỳ theo chế độ BHXH",
            "Nghỉ thai sản trước & sau sinh con",
            "Nghỉ chế độ nam khi vợ sinh con",
            "Nghỉ dưỡng sức phục hồi sức khỏe sau thai sản"
        ]
    },
    { 
        value: 'LATE_EARLY', 
        label: 'Đi Muộn / Về Sớm', 
        badge: 'Xin phép duyệt', 
        desc: 'Xin phép đến muộn hoặc về sớm vì lý do đột xuất',
        icon: Clock3,
        iconBg: 'bg-amber-500/10 text-amber-600 border-amber-200/50',
        activeBorder: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40',
        reasons: [
            "Kẹt xe / thời tiết mưa ngập tuyến đường",
            "Hỏng xe đột xuất trên đường đi làm",
            "Đưa đón người thân / con đi khám bệnh gấp",
            "Có việc gia đình phát sinh xin phép về sớm"
        ]
    },
    { 
        value: 'ATTENDANCE_EXPLANATION', 
        label: 'Giải Trình Chấm Công', 
        badge: 'Quên Check-In/Out', 
        desc: 'Quên chấm công, lỗi hệ thống, hoặc đi công tác ngoài',
        icon: FileText,
        iconBg: 'bg-blue-500/10 text-blue-600 border-blue-200/50',
        activeBorder: 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40',
        reasons: [
            "Quên chấm công lúc vào ca sáng",
            "Quên chấm công lúc tan ca chiều",
            "Đi gặp đối tác / khách hàng bên ngoài công ty",
            "Máy chấm công lỗi nhận diện vân tay/khuôn mặt"
        ]
    },
    { 
        value: 'OVERTIME', 
        label: 'Làm Thêm Giờ (OT)', 
        badge: 'Hệ số tăng ca', 
        desc: 'Đăng ký tăng ca hoàn thành dự án ngoài giờ chuẩn',
        icon: Zap,
        iconBg: 'bg-orange-500/10 text-orange-600 border-orange-200/50',
        activeBorder: 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/40',
        reasons: [
            "Tăng ca xử lý deadline gấp dự án",
            "Hỗ trợ triển khai hệ thống cho khách hàng ngoài giờ",
            "Trực ca kỹ thuật / hỗ trợ sự kiện",
            "Xử lý sự cố kỹ thuật phát sinh ngoài giờ"
        ]
    },
];

const DURATION_LIST = [
    { value: 'FULL_DAY', label: 'Cả Ngày', sub: '1.0 ngày công (08:00 - 17:30)', icon: Sun },
    { value: 'MORNING', label: 'Buổi Sáng', sub: '0.5 ngày công (08:00 - 12:00)', icon: Sunrise },
    { value: 'AFTERNOON', label: 'Buổi Chiều', sub: '0.5 ngày công (13:30 - 17:30)', icon: Sunset },
    { value: 'CUSTOM_HOURS', label: 'Theo Giờ / Linh Hoạt', sub: 'Theo số giờ thực tế', icon: Clock3 },
];

export default function LeaveRequestClient({ 
    initialData, 
    colleagues = [],
    currentUser
}: { 
    initialData: LeaveRequestItem[];
    colleagues?: Colleague[];
    currentUser?: any;
}) {
    const [requests, setRequests] = useState<LeaveRequestItem[]>(initialData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [detailModalItem, setDetailModalItem] = useState<LeaveRequestItem | null>(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');

    // Form states
    const [editId, setEditId] = useState<string | null>(null);
    const [requestStatus, setRequestStatus] = useState<string>('PENDING');
    const [type, setType] = useState('ANNUAL_LEAVE');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [duration, setDuration] = useState('FULL_DAY');
    const [totalDays, setTotalDays] = useState<number>(1);
    const [customHoursVal, setCustomHoursVal] = useState<string>('2');
    const [reason, setReason] = useState('');
    const [handoverTo, setHandoverTo] = useState('');
    const [handoverUserId, setHandoverUserId] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    const [viewImage, setViewImage] = useState<string | null>(null);

    // Calculate auto days
    const calculateAutoDays = (start: string, end: string, dur: string) => {
        if (!start || !end) return 1;
        const d1 = new Date(start);
        const d2 = new Date(end);
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
        if (d2 < d1) return 1;

        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (dur === 'MORNING' || dur === 'AFTERNOON') {
            return diffDays === 1 ? 0.5 : diffDays * 0.5;
        }
        if (dur === 'CUSTOM_HOURS') {
            return 0.25;
        }
        return diffDays;
    };

    const handleStartDateChange = (val: string) => {
        setStartDate(val);
        const end = endDate && endDate >= val ? endDate : val;
        setEndDate(end);
        setTotalDays(calculateAutoDays(val, end, duration));
    };

    const handleEndDateChange = (val: string) => {
        setEndDate(val);
        setTotalDays(calculateAutoDays(startDate, val, duration));
    };

    const handleDurationChange = (val: string) => {
        setDuration(val);
        setTotalDays(calculateAutoDays(startDate, endDate, val));
    };

    const handleHandoverUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const uId = e.target.value;
        setHandoverUserId(uId);
        if (uId) {
            const found = colleagues.find(c => c.id === uId);
            if (found) {
                setHandoverTo(found.name || found.email);
            }
        }
    };

    const handleAddQuickReason = (text: string) => {
        if (!reason.trim()) {
            setReason(text);
        } else if (!reason.includes(text)) {
            setReason(reason + '; ' + text);
        }
    };

    const openNewModal = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        setEditId(null);
        setRequestStatus('PENDING');
        setType('ANNUAL_LEAVE');
        setStartDate(todayStr);
        setEndDate(todayStr);
        setDuration('FULL_DAY');
        setTotalDays(1);
        setReason('');
        setHandoverTo('');
        setHandoverUserId('');
        setContactPhone('');
        setImageUrl('');
        setIsModalOpen(true);
    };

    const openEditModal = (r: LeaveRequestItem) => {
        setEditId(r.id);
        setRequestStatus(r.status);
        setType(r.type);
        setStartDate(new Date(r.startDate).toISOString().split('T')[0]);
        setEndDate(new Date(r.endDate).toISOString().split('T')[0]);
        setDuration(r.duration || 'FULL_DAY');
        setTotalDays(r.totalDays !== undefined ? r.totalDays : 1);
        setReason(r.reason);
        setHandoverTo(r.handoverTo || '');
        setHandoverUserId(r.handoverUserId || '');
        setContactPhone(r.contactPhone || '');
        setImageUrl(r.imageUrl || '');
        setIsModalOpen(true);
    };

    const handleCancelRequest = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn hủy đơn xin phép này?')) return;
        setIsLoading(true);
        const res = await cancelLeaveRequest(id);
        if (res.success) {
            setRequests(requests.map(r => r.id === id ? { ...r, status: 'CANCELLED' } : r));
            if (detailModalItem?.id === id) {
                setDetailModalItem({ ...detailModalItem, status: 'CANCELLED' });
            }
        } else {
            alert('Lỗi: ' + res.error);
        }
        setIsLoading(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate || !reason.trim()) {
            return alert('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
        }

        setIsLoading(true);
        const payload = {
            type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            duration,
            totalDays: Number(totalDays) || 1,
            reason: reason.trim(),
            handoverTo: handoverTo.trim() || undefined,
            handoverUserId: handoverUserId || undefined,
            contactPhone: contactPhone.trim() || undefined,
            imageUrl: imageUrl || undefined
        };

        let res;
        if (editId) {
            res = await updateLeaveRequest(editId, payload);
        } else {
            res = await createLeaveRequest(payload);
        }

        if (res.success && res.data) {
            if (editId) {
                setRequests(requests.map(r => r.id === editId ? (res.data as any) : r));
            } else {
                setRequests([(res.data as any), ...requests]);
            }
            setIsModalOpen(false);
        } else {
            alert('Lỗi khi gửi đơn: ' + res.error);
        }
        setIsLoading(false);
    };

    // Statistics
    const stats = useMemo(() => {
        const total = requests.length;
        const pending = requests.filter(r => r.status === 'PENDING').length;
        const approved = requests.filter(r => r.status === 'APPROVED').length;
        const rejected = requests.filter(r => r.status === 'REJECTED').length;
        const cancelled = requests.filter(r => r.status === 'CANCELLED').length;
        const totalApprovedDays = requests
            .filter(r => r.status === 'APPROVED' && r.type === 'ANNUAL_LEAVE')
            .reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
        return { total, pending, approved, rejected, cancelled, totalApprovedDays };
    }, [requests]);

    // Filtered items
    const filteredRequests = useMemo(() => {
        return requests.filter(r => {
            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
            if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const matchReason = r.reason?.toLowerCase().includes(q);
                const matchType = (LEAVE_TYPE_MAP[r.type] || r.type).toLowerCase().includes(q);
                const matchHandover = r.handoverTo?.toLowerCase().includes(q);
                const matchApprover = r.approver?.name?.toLowerCase().includes(q);
                if (!matchReason && !matchType && !matchHandover && !matchApprover) return false;
            }
            return true;
        });
    }, [requests, statusFilter, typeFilter, searchTerm]);

    const getTypeBadge = (typeKey: string) => {
        const label = LEAVE_TYPE_MAP[typeKey] || typeKey;
        switch (typeKey) {
            case 'ANNUAL_LEAVE':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{label}</span>;
            case 'SICK_LEAVE':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">{label}</span>;
            case 'UNPAID_LEAVE':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{label}</span>;
            case 'SPECIAL_LEAVE':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">{label}</span>;
            case 'MATERNITY_LEAVE':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">{label}</span>;
            case 'LATE_EARLY':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">{label}</span>;
            case 'ATTENDANCE_EXPLANATION':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">{label}</span>;
            case 'OVERTIME':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">{label}</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{label}</span>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Đang Chờ Duyệt
                    </span>
                );
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        <CheckCircle size={13} className="text-emerald-600" />
                        Đã Phê Duyệt
                    </span>
                );
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                        <Ban size={13} className="text-rose-600" />
                        Từ Chối
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
                        <X size={13} className="text-slate-500" />
                        Đã Hủy
                    </span>
                );
            default:
                return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">{status}</span>;
        }
    };

    const currentSelectedTypeObj = LEAVE_TYPES_CONFIG.find(c => c.value === type) || LEAVE_TYPES_CONFIG[0];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-50"></span>
                        Xin Nghỉ Phép & Quản Lý Đơn Từ
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Tạo đơn xin nghỉ, theo dõi quy trình duyệt, bàn giao công việc và xuất phiếu nghỉ chuẩn doanh nghiệp ({requests.length} đơn)
                    </p>
                </div>
                <Button 
                    onClick={openNewModal} 
                    className="px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-200 transition-all cursor-pointer"
                >
                    <Plus size={16} strokeWidth={2.5} /> Tạo Đơn Xin Nghỉ Mới
                </Button>
            </div>

            {/* KPI Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Chờ Duyệt</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold font-mono text-amber-600">{stats.pending}</span>
                            <span className="text-xs font-medium text-slate-400">đơn</span>
                        </div>
                        <div className="text-[11px] text-amber-600/80 mt-0.5 font-medium">Cần quản lý phản hồi</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                        <Clock size={20} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Đã Duyệt</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold font-mono text-emerald-600">{stats.approved}</span>
                            <span className="text-xs font-medium text-slate-400">đơn</span>
                        </div>
                        <div className="text-[11px] text-emerald-600/80 mt-0.5 font-medium">Hợp lệ & hoàn tất</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle size={20} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Phép Năm Đã Dùng</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold font-mono text-indigo-600">{stats.totalApprovedDays}</span>
                            <span className="text-xs font-medium text-slate-400">ngày</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Tổng ngày phép năm</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <Calendar size={20} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Từ Chối / Đã Hủy</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold font-mono text-slate-700">{stats.rejected + stats.cancelled}</span>
                            <span className="text-xs font-medium text-slate-400">đơn</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{stats.rejected} từ chối, {stats.cancelled} hủy</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                        <Ban size={20} />
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                        type="text" 
                        placeholder="Tìm theo lý do, người nhận bàn giao, người duyệt..." 
                        className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-50/80 p-1 rounded-xl border border-slate-200 text-xs">
                        <button 
                            type="button" 
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Tất cả ({requests.length})
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setStatusFilter('PENDING')}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${statusFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-700 hover:bg-amber-50'}`}
                        >
                            Chờ duyệt ({stats.pending})
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setStatusFilter('APPROVED')}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${statusFilter === 'APPROVED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-50'}`}
                        >
                            Đã duyệt ({stats.approved})
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setStatusFilter('REJECTED')}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${statusFilter === 'REJECTED' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-rose-50'}`}
                        >
                            Từ chối ({stats.rejected})
                        </button>
                    </div>

                    <select 
                        className="px-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700 font-medium"
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                    >
                        <option value="ALL">Tất cả loại đơn</option>
                        {LEAVE_TYPES_CONFIG.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Danh Sách Đơn Từ & Lịch Sử Nghỉ</h2>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                        {filteredRequests.length} đơn
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Loại Đơn</th>
                                <th className="px-4 py-3 text-left">Thời Gian & Số Ngày</th>
                                <th className="px-4 py-3 text-left">Lý Do Nghỉ</th>
                                <th className="px-4 py-3 text-left">Bàn Giao & Liên Hệ</th>
                                <th className="px-4 py-3 text-center">Minh Chứng</th>
                                <th className="px-4 py-3 text-left">Trạng Thái Phê Duyệt</th>
                                <th className="px-4 py-3 text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-xs font-medium text-slate-400">
                                        Không tìm thấy đơn từ nào phù hợp với điều kiện tìm kiếm.
                                    </td>
                                </tr>
                            ) : filteredRequests.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-slate-900">
                                            {getTypeBadge(r.type)}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1">
                                            Tạo: {new Date(r.createdAt).toLocaleDateString('vi-VN')} {new Date(r.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-900 flex items-center gap-1">
                                            <span>{new Date(r.startDate).toLocaleDateString('vi-VN')}</span>
                                            <span className="text-slate-400">→</span>
                                            <span>{new Date(r.endDate).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                            <span className="font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                {r.totalDays || 1} ngày
                                            </span>
                                            <span className="text-slate-400">•</span>
                                            <span className="text-slate-600">
                                                {r.duration === 'MORNING' ? 'Buổi Sáng' : r.duration === 'AFTERNOON' ? 'Buổi Chiều' : r.duration === 'CUSTOM_HOURS' ? 'Theo Giờ' : 'Cả Ngày'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 max-w-[260px]">
                                        <p className="line-clamp-2 text-slate-700 font-normal leading-relaxed" title={r.reason}>
                                            {r.reason}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-0.5 text-[11px]">
                                            {r.handoverTo ? (
                                                <div className="flex items-center gap-1 text-slate-700 font-medium">
                                                    <UserCheck size={12} className="text-emerald-600 shrink-0" />
                                                    <span className="truncate max-w-[150px]">{r.handoverTo}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Chưa chỉ định</span>
                                            )}
                                            {r.contactPhone && (
                                                <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                                                    <Phone size={11} className="text-slate-400 shrink-0" />
                                                    <span>{r.contactPhone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {r.imageUrl ? (
                                            <button 
                                                type="button" 
                                                onClick={() => setViewImage(r.imageUrl || null)} 
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-indigo-100"
                                            >
                                                <FileImage size={13} /> Xem Ảnh
                                            </button>
                                        ) : <span className="text-slate-300 text-xs">-</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            {getStatusBadge(r.status)}
                                            {r.approver && r.status !== 'PENDING' && (
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    <span>Duyệt: <strong className="text-slate-700">{r.approver.name}</strong></span>
                                                </div>
                                            )}
                                            {r.status === 'REJECTED' && r.approverNote && (
                                                <div className="text-[10px] text-rose-600 italic bg-rose-50/70 p-1.5 rounded border border-rose-100 max-w-[200px]">
                                                    Lý do: {r.approverNote}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button 
                                                onClick={() => setDetailModalItem(r)} 
                                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" 
                                                title="Xem chi tiết & In đơn"
                                            >
                                                <Eye size={15} />
                                            </button>
                                            {r.status === 'PENDING' && (
                                                <>
                                                    <button 
                                                        onClick={() => openEditModal(r)} 
                                                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer" 
                                                        title="Chỉnh sửa đơn"
                                                    >
                                                        <Edit size={15} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleCancelRequest(r.id)} 
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" 
                                                        title="Hủy đơn xin nghỉ"
                                                    >
                                                        <Ban size={15} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* ULTRA-MODERN MODAL: TẠO / CHỈNH SỬA ĐƠN XIN NGHỈ PHÉP & ĐƠN TỪ            */}
            {/* ========================================================================= */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => !isLoading && setIsModalOpen(false)} 
                title={editId ? (requestStatus === 'PENDING' ? "Chỉnh Sửa Đơn Xin Nghỉ Phép" : "Chi Tiết Đơn Xin Nghỉ") : "Tạo Đơn Xin Nghỉ Phép & Đơn Từ Mới"}
                maxWidth="840px"
            >
                <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                    {/* Top Employee & Quota Summary Banner */}
                    <div 
                        style={{ 
                            background: 'linear-gradient(135deg, #047857 0%, #0d9488 50%, #065f46 100%)',
                            color: '#ffffff',
                            borderRadius: '16px',
                            padding: '1rem 1.25rem',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div 
                                style={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.18)', 
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                    borderWidth: '1px',
                                    borderStyle: 'solid'
                                }}
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                            >
                                <CalendarPlus size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 style={{ color: '#ffffff', margin: 0 }} className="font-bold text-sm tracking-tight">
                                        {currentUser?.name || currentUser?.email?.split('@')[0] || 'Nhân Viên'}
                                    </h3>
                                    <span 
                                        style={{ 
                                            backgroundColor: 'rgba(255, 255, 255, 0.22)', 
                                            color: '#ffffff',
                                            borderColor: 'rgba(255, 255, 255, 0.35)',
                                            borderWidth: '1px',
                                            borderStyle: 'solid'
                                        }}
                                        className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                                    >
                                        {currentUser?.role || 'Nhân sự'}
                                    </span>
                                </div>
                                <p style={{ color: '#d1fae5', margin: '2px 0 0 0' }} className="text-[11px]">
                                    {currentUser?.email ? `${currentUser.email} • ` : ''}Điền đầy đủ thông tin để gửi phê duyệt tự động.
                                </p>
                            </div>
                        </div>

                        {/* Quota Indicator */}
                        <div 
                            style={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                                borderColor: 'rgba(255, 255, 255, 0.28)',
                                borderWidth: '1px',
                                borderStyle: 'solid'
                            }}
                            className="backdrop-blur-xs rounded-xl px-3.5 py-2 flex items-center gap-3.5"
                        >
                            <div>
                                <span style={{ color: '#a7f3d0' }} className="text-[10px] uppercase font-bold block">Quỹ phép năm</span>
                                <div style={{ color: '#ffffff' }} className="text-xs font-bold">
                                    Đã dùng: <strong style={{ color: '#fef08a' }} className="font-mono text-sm">{stats.totalApprovedDays}</strong> / 12 ngày
                                </div>
                            </div>
                            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)', width: '1px', height: '28px' }}></div>
                            <div>
                                <span style={{ color: '#a7f3d0' }} className="text-[10px] uppercase font-bold block">Còn lại</span>
                                <span style={{ color: '#6ee7b7' }} className="text-sm font-black font-mono">
                                    {Math.max(0, 12 - stats.totalApprovedDays)} ngày
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Section 1: Chọn Loại Đơn Từ (Interactive Grid) */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                                1. Phân Loại Đơn Từ / Nghỉ Phép <span className="text-rose-500">*</span>
                            </label>
                            <span 
                                style={{ backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs"
                            >
                                ✓ Đang chọn: {currentSelectedTypeObj.label}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {LEAVE_TYPES_CONFIG.map(tItem => {
                                const isSelected = type === tItem.value;
                                const IconComp = tItem.icon;
                                return (
                                    <button
                                        key={tItem.value}
                                        type="button"
                                        disabled={requestStatus !== 'PENDING'}
                                        onClick={() => setType(tItem.value)}
                                        style={isSelected ? {
                                            borderColor: '#059669',
                                            backgroundColor: '#f0fdf4',
                                            boxShadow: '0 0 0 2px rgba(5, 150, 105, 0.25)',
                                            borderWidth: '1.5px',
                                            borderStyle: 'solid'
                                        } : {
                                            borderColor: '#e2e8f0',
                                            backgroundColor: '#ffffff',
                                            borderWidth: '1px',
                                            borderStyle: 'solid'
                                        }}
                                        className="p-3 rounded-2xl text-left transition-all relative flex flex-col justify-between group cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${tItem.iconBg} group-hover:scale-110 transition-transform`}>
                                                <IconComp size={16} />
                                            </div>
                                            {isSelected && (
                                                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                                    <Check size={12} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className={`font-bold text-xs tracking-tight ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                                {tItem.label}
                                            </h4>
                                            <span className="inline-block text-[10px] font-semibold text-slate-500 mt-1">
                                                {tItem.badge}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section 2: Thời Gian & Ca Nghỉ */}
                    <div 
                        style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: '1px', borderStyle: 'solid' }}
                        className="p-4 rounded-2xl space-y-3.5"
                    >
                        <div className="flex items-center justify-between">
                            <label className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                                2. Thời Gian & Ca Nghỉ Làm Việc <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[10.5px] text-slate-500">Hệ thống hỗ trợ tính công chuẩn theo buổi</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {/* Start Date */}
                            <div className="space-y-1">
                                <span className="text-slate-700 font-semibold text-xs flex items-center gap-1">
                                    <Calendar size={13} className="text-indigo-600" /> Từ ngày:
                                </span>
                                <input
                                    type="date"
                                    required
                                    disabled={requestStatus !== 'PENDING'}
                                    value={startDate}
                                    onChange={e => handleStartDateChange(e.target.value)}
                                    style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                                    className="w-full px-3 py-2 border rounded-xl font-bold text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-2xs"
                                />
                                {startDate && (
                                    <p className="text-[10px] text-indigo-600 font-medium pl-1">
                                        📅 {new Date(startDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' })}
                                    </p>
                                )}
                            </div>

                            {/* End Date */}
                            <div className="space-y-1">
                                <span className="text-slate-700 font-semibold text-xs flex items-center gap-1">
                                    <Calendar size={13} className="text-indigo-600" /> Đến ngày:
                                </span>
                                <input
                                    type="date"
                                    required
                                    disabled={requestStatus !== 'PENDING'}
                                    value={endDate}
                                    onChange={e => handleEndDateChange(e.target.value)}
                                    style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                                    className="w-full px-3 py-2 border rounded-xl font-bold text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-2xs"
                                />
                                {endDate && (
                                    <p className="text-[10px] text-indigo-600 font-medium pl-1">
                                        📅 {new Date(endDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' })}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Duration Segmented Pills & Calculation Card */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                            <div className="md:col-span-2 space-y-1.5">
                                <span className="text-slate-700 font-semibold text-xs">Ca / Buổi nghỉ:</span>
                                <div 
                                    style={{ backgroundColor: '#e2e8f0', borderColor: '#cbd5e1', borderWidth: '1px', borderStyle: 'solid' }}
                                    className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl"
                                >
                                    {DURATION_LIST.map(dItem => {
                                        const isDurActive = duration === dItem.value;
                                        const DIcon = dItem.icon;
                                        return (
                                            <button
                                                key={dItem.value}
                                                type="button"
                                                disabled={requestStatus !== 'PENDING'}
                                                onClick={() => handleDurationChange(dItem.value)}
                                                style={isDurActive ? {
                                                    backgroundColor: '#ffffff',
                                                    borderColor: '#059669',
                                                    color: '#065f46',
                                                    borderWidth: '1px',
                                                    borderStyle: 'solid',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                                                } : {
                                                    backgroundColor: 'transparent',
                                                    color: '#64748b'
                                                }}
                                                className="p-2 rounded-lg text-center transition-all flex flex-col items-center gap-0.5 cursor-pointer font-medium"
                                            >
                                                <DIcon size={14} className={isDurActive ? 'text-emerald-600' : 'text-slate-400'} />
                                                <span className="text-[11px] leading-tight font-bold">{dItem.label}</span>
                                                <span className="text-[9px] opacity-75">{dItem.sub}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Live Calculation Widget */}
                            <div 
                                style={{ backgroundColor: '#ffffff', borderColor: '#a7f3d0', borderWidth: '1.5px', borderStyle: 'solid' }}
                                className="p-3 rounded-xl shadow-2xs flex flex-col justify-between"
                            >
                                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Dự kiến tính công</span>
                                <div className="flex items-baseline gap-1 my-1">
                                    <span style={{ color: '#059669' }} className="text-2xl font-black font-mono">{totalDays}</span>
                                    <span className="text-xs font-bold text-slate-700">ngày công</span>
                                </div>
                                <div 
                                    style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1"
                                >
                                    <ShieldCheck size={12} className="shrink-0" />
                                    <span>Tự động tính theo ca</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Bàn Giao Công Việc & Thông Tin Khẩn Cấp */}
                    <div className="space-y-2">
                        <label className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                            3. Bàn Giao Công Việc & Liên Hệ Khẩn Cấp
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {/* Colleague handover */}
                            <div 
                                style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: '1px', borderStyle: 'solid' }}
                                className="p-3.5 rounded-2xl space-y-2"
                            >
                                <span className="text-slate-700 font-semibold text-xs flex items-center gap-1">
                                    <UserCheck size={14} className="text-teal-600" /> Người nhận bàn giao công việc:
                                </span>
                                <select 
                                    disabled={requestStatus !== 'PENDING'}
                                    value={handoverUserId}
                                    onChange={handleHandoverUserSelect}
                                    style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a' }}
                                    className="w-full p-2.5 rounded-xl border font-semibold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                                >
                                    <option value="">-- Chọn đồng nghiệp hỗ trợ thay thế --</option>
                                    {colleagues.map(c => (
                                        <option key={c.id} value={c.id}>{c.name || c.email} ({c.email})</option>
                                    ))}
                                </select>
                                <input 
                                    type="text"
                                    placeholder="Nội dung tóm tắt công việc bàn giao (hồ sơ, ca trực, khách hàng)..."
                                    disabled={requestStatus !== 'PENDING'}
                                    value={handoverTo}
                                    onChange={e => setHandoverTo(e.target.value)}
                                    style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                                    className="w-full px-3 py-2 rounded-xl border text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                />
                            </div>

                            {/* Emergency Contact */}
                            <div 
                                style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: '1px', borderStyle: 'solid' }}
                                className="p-3.5 rounded-2xl space-y-2 flex flex-col justify-between"
                            >
                                <div>
                                    <span className="text-slate-700 font-semibold text-xs flex items-center gap-1">
                                        <Phone size={14} className="text-teal-600" /> Số điện thoại liên hệ khẩn cấp:
                                    </span>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Dùng để liên lạc khi phát sinh việc gấp cần phối hợp trong thời gian nghỉ.</p>
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                    <input
                                        type="tel"
                                        placeholder="VD: 0912 345 678"
                                        disabled={requestStatus !== 'PENDING'}
                                        value={contactPhone}
                                        onChange={e => setContactPhone(e.target.value)}
                                        style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a' }}
                                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Lý Do Nghỉ & Gợi Ý Nhanh Theo Loại Đơn */}
                    <div className="space-y-2">
                        <label className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                            4. Lý Do Xin Nghỉ & Kế Hoạch Bàn Giao <span className="text-rose-500">*</span>
                        </label>

                        {/* Smart dynamic quick suggestions chips tailored to selected type */}
                        {requestStatus === 'PENDING' && currentSelectedTypeObj.reasons && (
                            <div 
                                style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: '1px', borderStyle: 'solid' }}
                                className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-xl"
                            >
                                <span className="text-[10.5px] text-slate-600 font-bold flex items-center gap-1">
                                    <Sparkles size={12} className="text-amber-500" /> Gợi ý nhanh:
                                </span>
                                {currentSelectedTypeObj.reasons.map(qr => (
                                    <button
                                        key={qr}
                                        type="button"
                                        onClick={() => handleAddQuickReason(qr)}
                                        style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#334155', borderWidth: '1px', borderStyle: 'solid' }}
                                        className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold shadow-2xs hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer"
                                    >
                                        + {qr}
                                    </button>
                                ))}
                            </div>
                        )}

                        <textarea 
                            disabled={requestStatus !== 'PENDING'} 
                            required 
                            value={reason} 
                            onChange={e => setReason(e.target.value)} 
                            rows={3} 
                            style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                            className="w-full p-3.5 rounded-2xl border font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-vertical text-xs leading-relaxed placeholder:text-slate-400" 
                            placeholder="Trình bày lý do xin nghỉ chi tiết và kế hoạch giải quyết công việc tồn đọng..."
                        />
                    </div>

                    {/* Section 5: Minh Chứng / Đính Kèm */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                                5. Minh Chứng Đính Kèm (Giấy khám bệnh, viện phí, tài liệu xác nhận)
                            </label>
                            <span className="text-[10.5px] text-slate-400">Không bắt buộc (Ưu tiên nghỉ ốm/thai sản)</span>
                        </div>

                        {requestStatus === 'PENDING' && (
                            <div 
                                style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}
                                className="border-2 border-dashed hover:border-emerald-500 rounded-2xl p-4 text-center hover:bg-emerald-50/30 transition-all relative group cursor-pointer"
                            >
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageUpload} 
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
                                />
                                <div className="flex flex-col items-center justify-center gap-1.5 text-slate-500">
                                    <div 
                                        style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: '1px', borderStyle: 'solid' }}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-110 transition-transform"
                                    >
                                        <UploadCloud size={20} />
                                    </div>
                                    <span className="font-bold text-xs text-slate-700">Kéo thả ảnh hoặc bấm vào đây để tải giấy tờ chứng từ</span>
                                    <span className="text-[10.5px] text-slate-400">Định dạng hỗ trợ PNG, JPG, JPEG (tối đa 10MB)</span>
                                </div>
                            </div>
                        )}

                        {imageUrl && (
                            <div 
                                style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: '1px', borderStyle: 'solid' }}
                                className="flex items-center gap-3 p-3 rounded-2xl shadow-2xs"
                            >
                                <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-xs text-slate-900 truncate">Ảnh chứng từ y tế / tài liệu minh chứng</p>
                                    <p style={{ color: '#059669' }} className="text-[10px] font-semibold">Đã tải lên sẵn sàng gửi duyệt</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setViewImage(imageUrl)} 
                                        style={{ backgroundColor: '#f1f5f9', color: '#334155' }}
                                        className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-slate-200 cursor-pointer transition-colors"
                                    >
                                        Xem lớn
                                    </button>
                                    {requestStatus === 'PENDING' && (
                                        <button 
                                            type="button" 
                                            onClick={() => setImageUrl('')} 
                                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                            title="Xóa ảnh"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {!imageUrl && requestStatus !== 'PENDING' && (
                            <div 
                                style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: '1px', borderStyle: 'solid' }}
                                className="p-3 rounded-xl text-slate-400 text-center italic text-xs"
                            >
                                Không có minh chứng đính kèm.
                            </div>
                        )}
                    </div>

                    {/* Section 6: Approval Workflow Notice */}
                    <div 
                        style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: '1px', borderStyle: 'solid' }}
                        className="p-3 rounded-xl flex items-center justify-between text-[11px] text-slate-600"
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">Quy trình duyệt:</span>
                            <div className="flex items-center gap-1.5">
                                <span style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: '1px', borderStyle: 'solid' }} className="px-2 py-0.5 rounded font-medium text-slate-700">1. Bạn gửi đơn</span>
                                <span className="text-slate-400">➔</span>
                                <span style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: '1px', borderStyle: 'solid' }} className="px-2 py-0.5 rounded font-medium text-slate-700">2. Quản lý trực tiếp duyệt</span>
                                <span className="text-slate-400">➔</span>
                                <span style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: '1px', borderStyle: 'solid' }} className="px-2 py-0.5 rounded font-medium text-slate-700">3. HCNS chốt công</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div 
                        style={{ borderColor: '#e2e8f0', borderTopWidth: '1px', borderTopStyle: 'solid' }}
                        className="flex items-center justify-between pt-4"
                    >
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Info size={13} className="text-slate-400" />
                            <span>Thông báo realtime & Email sẽ tự động gửi đến người duyệt.</span>
                        </div>

                        <div className="flex gap-2">
                            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                                {requestStatus === 'PENDING' ? 'Hủy Bỏ' : 'Đóng'}
                            </Button>
                            {requestStatus === 'PENDING' && (
                                <button 
                                    type="submit" 
                                    disabled={isLoading} 
                                    style={{
                                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                        color: '#ffffff',
                                        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                                    }}
                                    className="font-bold flex items-center gap-1.5 px-6 py-2.5 rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                                >
                                    {isLoading ? 'Đang gửi...' : (
                                        <>
                                            <Send size={14} />
                                            <span>{editId ? 'Cập Nhật Đơn' : 'Gửi Đơn Xin Nghỉ Phép'}</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Modal Detail & Print Slip */}
            <Modal 
                isOpen={!!detailModalItem} 
                onClose={() => setDetailModalItem(null)} 
                title="Chi Tiết Đơn Xin Nghỉ Phép & Phiếu Phê Duyệt"
                maxWidth="max-w-2xl"
            >
                {detailModalItem && (
                    <div className="space-y-5 text-xs text-slate-800">
                        {/* Printable Area */}
                        <div id="leave-request-print-sheet" className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                            <div className="text-center border-b border-slate-200 pb-3">
                                <h3 className="text-base font-bold uppercase tracking-wider text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
                                <p className="text-[11px] font-medium text-slate-500">Độc lập - Tự do - Hạnh phúc</p>
                                <div className="w-16 h-0.5 bg-slate-300 mx-auto my-2"></div>
                                <h2 className="text-lg font-bold uppercase text-emerald-800 mt-2">ĐƠN XIN NGHỈ PHÉP</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                                <div>
                                    <span className="text-slate-500">Họ và tên:</span>
                                    <p className="font-bold text-slate-900 text-sm">{currentUser?.name || 'Nhân sự'}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Loại đơn:</span>
                                    <p className="font-bold text-emerald-700">{LEAVE_TYPE_MAP[detailModalItem.type] || detailModalItem.type}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Thời gian nghỉ:</span>
                                    <p className="font-semibold text-slate-900">
                                        Từ {new Date(detailModalItem.startDate).toLocaleDateString('vi-VN')} đến {new Date(detailModalItem.endDate).toLocaleDateString('vi-VN')}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Số ngày / Ca nghỉ:</span>
                                    <p className="font-semibold text-indigo-700">{detailModalItem.totalDays || 1} ngày ({detailModalItem.duration === 'MORNING' ? 'Buổi sáng' : detailModalItem.duration === 'AFTERNOON' ? 'Buổi chiều' : 'Cả ngày'})</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Người nhận bàn giao:</span>
                                    <p className="font-medium text-slate-800">{detailModalItem.handoverTo || 'Không có'}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">SĐT liên hệ khẩn:</span>
                                    <p className="font-medium text-slate-800">{detailModalItem.contactPhone || 'Không có'}</p>
                                </div>
                            </div>

                            <div>
                                <span className="font-bold text-slate-700">Lý do xin nghỉ:</span>
                                <p className="mt-1 p-3 bg-slate-50/70 rounded-xl border border-slate-200 leading-relaxed text-slate-800">
                                    {detailModalItem.reason}
                                </p>
                            </div>

                            {detailModalItem.imageUrl && (
                                <div>
                                    <span className="font-bold text-slate-700">Minh chứng đính kèm:</span>
                                    <div className="mt-1">
                                        <img src={detailModalItem.imageUrl} alt="Chứng từ y tế" className="max-h-44 rounded-xl border border-slate-200 object-contain" />
                                    </div>
                                </div>
                            )}

                            {/* Status and Approver section */}
                            <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                                <div>
                                    <span className="text-slate-500 text-[11px]">Trạng thái:</span>
                                    <div className="mt-1">{getStatusBadge(detailModalItem.status)}</div>
                                </div>
                                {detailModalItem.approver && (
                                    <div className="text-right">
                                        <span className="text-slate-500 text-[11px]">Người duyệt:</span>
                                        <p className="font-bold text-slate-800">{detailModalItem.approver.name}</p>
                                        <span className="text-[10px] text-slate-400">{new Date(detailModalItem.updatedAt).toLocaleString('vi-VN')}</span>
                                    </div>
                                )}
                            </div>

                            {detailModalItem.approverNote && (
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px]">
                                    <strong>Ý kiến phê duyệt từ HCNS:</strong> <em>{detailModalItem.approverNote}</em>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Printer size={15} /> In Phiếu Nghỉ Phép
                            </button>

                            <div className="flex gap-2">
                                {detailModalItem.status === 'PENDING' && (
                                    <Button 
                                        type="button" 
                                        variant="danger" 
                                        onClick={() => handleCancelRequest(detailModalItem.id)}
                                    >
                                        Hủy Đơn Này
                                    </Button>
                                )}
                                <Button type="button" variant="secondary" onClick={() => setDetailModalItem(null)}>
                                    Đóng
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal View Image */}
            <Modal isOpen={!!viewImage} onClose={() => setViewImage(null)} title="Ảnh Minh Chứng / Giấy Khám Bệnh">
                <div className="flex justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    {viewImage && (
                        <img
                            src={viewImage}
                            alt="Minh Chứng y tế / đơn từ"
                            className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-xs"
                        />
                    )}
                </div>
            </Modal>
        </div>
    );
}
