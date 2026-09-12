'use client';

import React, { useState, useMemo } from 'react';
import { resolveLeaveRequest } from '@/app/hr/attendance/actions';
import { LEAVE_TYPE_MAP } from '@/app/hr/attendance/constants';
import { 
    Check, X, FileDown, FileText, Search, Filter, Clock, CheckCircle, 
    Ban, Calendar, UserCheck, Phone, Eye, ArrowUpDown, User, Building,
    Sparkles, AlertCircle, Printer, Download, RefreshCw
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { AvatarImage } from '@/app/components/ui/AvatarImage';
import * as XLSX from 'xlsx';

interface LeaveRequestHR {
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
    user?: {
        id: string;
        name?: string | null;
        email: string;
        role?: string;
        avatar?: string | null;
        employeeProfile?: {
            department?: string | null;
            position?: string | null;
        } | null;
    } | null;
}

export default function HrApprovalClient({ 
    initialData, 
    currentUser 
}: { 
    initialData: LeaveRequestHR[];
    currentUser?: any;
}) {
    const [requests, setRequests] = useState<LeaveRequestHR[]>(initialData);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('PENDING'); // Default to pending
    const [filterType, setFilterType] = useState('ALL');
    const [filterDepartment, setFilterDepartment] = useState('ALL');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    // Reject Modal
    const [rejectingItem, setRejectingItem] = useState<LeaveRequestHR | null>(null);
    const [rejectNote, setRejectNote] = useState('');

    // Quick Approve Modal
    const [approvingItem, setApprovingItem] = useState<LeaveRequestHR | null>(null);
    const [approveNote, setApproveNote] = useState('');

    // Detail Modal
    const [detailItem, setDetailItem] = useState<LeaveRequestHR | null>(null);

    // Image Modal
    const [viewImage, setViewImage] = useState<string | null>(null);

    // Get list of departments
    const departments = useMemo(() => {
        const depts = new Set<string>();
        requests.forEach(r => {
            if (r.user?.employeeProfile?.department) {
                depts.add(r.user.employeeProfile.department);
            }
        });
        return Array.from(depts);
    }, [requests]);

    const handleResolve = async (id: string, action: 'APPROVE' | 'REJECT', note?: string) => {
        setLoadingId(id);
        const res = await resolveLeaveRequest(id, action, note);
        if (res.success) {
            setRequests(requests.map(r => r.id === id ? {
                ...r,
                status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                approverId: currentUser?.id,
                approver: { id: currentUser?.id, name: currentUser?.name || 'HCNS' },
                approverNote: note || null,
                updatedAt: new Date().toISOString()
            } : r));

            if (detailItem?.id === id) {
                setDetailItem(prev => prev ? {
                    ...prev,
                    status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                    approverId: currentUser?.id,
                    approver: { id: currentUser?.id, name: currentUser?.name || 'HCNS' },
                    approverNote: note || null,
                    updatedAt: new Date().toISOString()
                } : null);
            }

            setRejectingItem(null);
            setRejectNote('');
            setApprovingItem(null);
            setApproveNote('');
        } else {
            alert('Lỗi khi duyệt đơn: ' + res.error);
        }
        setLoadingId(null);
    };

    const confirmReject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectingItem) return;
        if (!rejectNote.trim()) {
            alert("Vui lòng nhập lý do từ chối để nhân viên nắm được thông tin");
            return;
        }
        handleResolve(rejectingItem.id, 'REJECT', rejectNote.trim());
    };

    const confirmApprove = (e: React.FormEvent) => {
        e.preventDefault();
        if (!approvingItem) return;
        handleResolve(approvingItem.id, 'APPROVE', approveNote.trim() || undefined);
    };

    // Statistics
    const stats = useMemo(() => {
        const total = requests.length;
        const pending = requests.filter(r => r.status === 'PENDING').length;
        const approved = requests.filter(r => r.status === 'APPROVED').length;
        const rejected = requests.filter(r => r.status === 'REJECTED').length;
        const cancelled = requests.filter(r => r.status === 'CANCELLED').length;
        const totalDaysPending = requests
            .filter(r => r.status === 'PENDING')
            .reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
        return { total, pending, approved, rejected, cancelled, totalDaysPending };
    }, [requests]);

    // Filtered requests
    const filteredRequests = useMemo(() => {
        return requests.filter(r => {
            if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
            if (filterType !== 'ALL' && r.type !== filterType) return false;
            
            if (filterDepartment !== 'ALL') {
                if (r.user?.employeeProfile?.department !== filterDepartment) return false;
            }

            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const matchName = r.user?.name?.toLowerCase().includes(q);
                const matchEmail = r.user?.email?.toLowerCase().includes(q);
                const matchReason = r.reason?.toLowerCase().includes(q);
                const matchHandover = r.handoverTo?.toLowerCase().includes(q);
                const matchType = (LEAVE_TYPE_MAP[r.type] || r.type).toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchReason && !matchHandover && !matchType) return false;
            }

            if (filterDateFrom) {
                if (new Date(r.startDate) < new Date(filterDateFrom)) return false;
            }

            if (filterDateTo) {
                const toDate = new Date(filterDateTo);
                toDate.setHours(23, 59, 59, 999);
                if (new Date(r.endDate) > toDate) return false;
            }

            return true;
        });
    }, [requests, filterStatus, filterType, filterDepartment, searchTerm, filterDateFrom, filterDateTo]);

    const exportExcel = () => {
        const data = filteredRequests.map((r, idx) => ({
            'STT': idx + 1,
            'Ngày Tạo Đơn': new Date(r.createdAt).toLocaleDateString('vi-VN'),
            'Họ Tên Nhân Viên': r.user?.name || '',
            'Email': r.user?.email || '',
            'Phòng Ban': r.user?.employeeProfile?.department || 'Chưa phân ban',
            'Loại Đơn': LEAVE_TYPE_MAP[r.type] || r.type,
            'Từ Ngày': new Date(r.startDate).toLocaleDateString('vi-VN'),
            'Đến Ngày': new Date(r.endDate).toLocaleDateString('vi-VN'),
            'Ca Nghỉ': r.duration === 'MORNING' ? 'Buổi Sáng' : r.duration === 'AFTERNOON' ? 'Buổi Chiều' : 'Cả Ngày',
            'Số Ngày Nghỉ': r.totalDays || 1,
            'Người Bàn Giao': r.handoverTo || '',
            'SĐT Liên Hệ': r.contactPhone || '',
            'Lý Do': r.reason,
            'Trạng Thái': r.status === 'APPROVED' ? 'Đã duyệt' : r.status === 'REJECTED' ? 'Từ chối' : r.status === 'CANCELLED' ? 'Đã hủy' : 'Đang chờ',
            'Người Duyệt': r.approver?.name || '',
            'Ý Kiến / Phản Hồi': r.approverNote || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DanhSachDonNghi");
        XLSX.writeFile(wb, `BaoCao_DonTuNghiPhep_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const getTypeBadge = (typeKey: string) => {
        const label = LEAVE_TYPE_MAP[typeKey] || typeKey;
        switch (typeKey) {
            case 'ANNUAL_LEAVE':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{label}</span>;
            case 'SICK_LEAVE':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">{label}</span>;
            case 'UNPAID_LEAVE':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{label}</span>;
            case 'SPECIAL_LEAVE':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">{label}</span>;
            case 'MATERNITY_LEAVE':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">{label}</span>;
            case 'LATE_EARLY':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">{label}</span>;
            case 'ATTENDANCE_EXPLANATION':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">{label}</span>;
            case 'OVERTIME':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">{label}</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{label}</span>;
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50"></span>
                        Phê Duyệt & Giám Sát Đơn Từ (HR)
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Quản lý toàn diện hồ sơ xin nghỉ phép, duyệt đơn tự động, bàn giao công việc và xuất báo cáo nhân sự ({requests.length} đơn)
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button 
                        onClick={exportExcel}
                        className="px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                    >
                        <FileDown size={15} /> Xuất Báo Cáo Excel
                    </Button>
                </div>
            </div>

            {/* KPI Cards for HR */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Cần Xử Lý Khẩn</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold font-mono text-amber-600">{stats.pending}</span>
                            <span className="text-xs font-medium text-slate-400">đơn</span>
                        </div>
                        <div className="text-[11px] text-amber-600/90 mt-0.5 font-medium">Tổng {stats.totalDaysPending} ngày công chờ duyệt</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                        <Clock size={20} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Đã Phê Duyệt</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold font-mono text-emerald-600">{stats.approved}</span>
                            <span className="text-xs font-medium text-slate-400">đơn</span>
                        </div>
                        <div className="text-[11px] text-emerald-600/90 mt-0.5 font-medium">Hợp lệ & đã cập nhật bảng công</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle size={20} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Từ Chối Phê Duyệt</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold font-mono text-rose-600">{stats.rejected}</span>
                            <span className="text-xs font-medium text-slate-400">đơn</span>
                        </div>
                        <div className="text-[11px] text-rose-600/90 mt-0.5 font-medium">Đã gửi lý do phản hồi</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                        <Ban size={20} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tổng Số Hồ Sơ</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold font-mono text-slate-800">{stats.total}</span>
                            <span className="text-xs font-medium text-slate-400">hồ sơ</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Toàn bộ nhân sự</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                        <FileText size={20} />
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 bg-slate-50/80 p-1 rounded-xl border border-slate-200 text-xs flex-wrap">
                        <button 
                            type="button" 
                            onClick={() => setFilterStatus('ALL')}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Tất cả ({requests.length})
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setFilterStatus('PENDING')}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${filterStatus === 'PENDING' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-700 hover:bg-amber-50'}`}
                        >
                            Chờ duyệt ({stats.pending})
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setFilterStatus('APPROVED')}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${filterStatus === 'APPROVED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:bg-emerald-50'}`}
                        >
                            Đã duyệt ({stats.approved})
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setFilterStatus('REJECTED')}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${filterStatus === 'REJECTED' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-rose-50'}`}
                        >
                            Từ chối ({stats.rejected})
                        </button>
                    </div>

                    <div className="relative flex-1 min-w-[240px] max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input 
                            type="text" 
                            placeholder="Tìm nhân viên, email, lý do, người nhận việc..." 
                            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Loại đơn:</span>
                        <select 
                            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium outline-none"
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                        >
                            <option value="ALL">Tất cả loại đơn</option>
                            {Object.entries(LEAVE_TYPE_MAP).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>

                    {departments.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">Phòng ban:</span>
                            <select 
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium outline-none"
                                value={filterDepartment}
                                onChange={e => setFilterDepartment(e.target.value)}
                            >
                                <option value="ALL">Tất cả phòng ban</option>
                                {departments.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Từ ngày:</span>
                        <input 
                            type="date" 
                            value={filterDateFrom} 
                            onChange={e => setFilterDateFrom(e.target.value)}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs" 
                        />
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Đến ngày:</span>
                        <input 
                            type="date" 
                            value={filterDateTo} 
                            onChange={e => setFilterDateTo(e.target.value)}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs" 
                        />
                    </div>

                    {(filterType !== 'ALL' || filterDepartment !== 'ALL' || filterDateFrom || filterDateTo || searchTerm) && (
                        <button 
                            type="button" 
                            onClick={() => {
                                setFilterType('ALL');
                                setFilterDepartment('ALL');
                                setFilterDateFrom('');
                                setFilterDateTo('');
                                setSearchTerm('');
                            }}
                            className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer underline ml-auto"
                        >
                            Xóa bộ lọc
                        </button>
                    )}
                </div>
            </div>

            {/* Requests HR Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Hồ Sơ Đơn Từ Cần Quản Lý & Giám Sát</h2>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                        {filteredRequests.length} đơn
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Nhân Viên</th>
                                <th className="px-4 py-3 text-left">Loại Đơn</th>
                                <th className="px-4 py-3 text-left">Thời Gian & Ca Nghỉ</th>
                                <th className="px-4 py-3 text-left">Lý Do Nghỉ</th>
                                <th className="px-4 py-3 text-left">Bàn Giao / Liên Hệ</th>
                                <th className="px-4 py-3 text-center">Minh Chứng</th>
                                <th className="px-4 py-3 text-left">Trạng Thái</th>
                                <th className="px-4 py-3 text-right">Phê Duyệt / Xử Lý</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-xs font-medium text-slate-400">
                                        Không tìm thấy hồ sơ đơn từ nào phù hợp với bộ lọc hiện tại.
                                    </td>
                                </tr>
                            ) : filteredRequests.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                                                {r.user?.avatar ? (
                                                    <img src={r.user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    (r.user?.name || r.user?.email || 'U')[0].toUpperCase()
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 tracking-tight">{r.user?.name || 'Chưa đặt tên'}</span>
                                                <span className="text-[11px] text-slate-500">{r.user?.email}</span>
                                                {r.user?.employeeProfile?.department && (
                                                    <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                                        {r.user.employeeProfile.department}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {getTypeBadge(r.type)}
                                        <div className="text-[10px] text-slate-400 mt-1">
                                            Gửi: {new Date(r.createdAt).toLocaleDateString('vi-VN')} {new Date(r.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-900 flex items-center gap-1">
                                            <span>{new Date(r.startDate).toLocaleDateString('vi-VN')}</span>
                                            <span className="text-slate-400">→</span>
                                            <span>{new Date(r.endDate).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                            <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                {r.totalDays || 1} ngày
                                            </span>
                                            <span className="text-slate-400">•</span>
                                            <span>
                                                {r.duration === 'MORNING' ? 'Buổi Sáng' : r.duration === 'AFTERNOON' ? 'Buổi Chiều' : r.duration === 'CUSTOM_HOURS' ? 'Theo Giờ' : 'Cả Ngày'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 max-w-[220px]">
                                        <p className="line-clamp-2 text-slate-700 font-normal leading-relaxed" title={r.reason}>
                                            {r.reason}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-0.5 text-[11px]">
                                            {r.handoverTo ? (
                                                <div className="flex items-center gap-1 text-slate-700 font-medium">
                                                    <UserCheck size={12} className="text-emerald-600 shrink-0" />
                                                    <span className="truncate max-w-[140px]">{r.handoverTo}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Không có</span>
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
                                                <FileText size={13} /> Xem Ảnh
                                            </button>
                                        ) : <span className="text-slate-300 text-xs">-</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            {getStatusBadge(r.status)}
                                            {r.approver && r.status !== 'PENDING' && (
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    <span>Duyệt bởi: <strong className="text-slate-700">{r.approver.name}</strong></span>
                                                    <div className="text-[9px] text-slate-400">{new Date(r.updatedAt).toLocaleString('vi-VN')}</div>
                                                </div>
                                            )}
                                            {r.status === 'REJECTED' && r.approverNote && (
                                                <div className="text-[10px] text-rose-600 italic bg-rose-50/70 p-1.5 rounded border border-rose-100 max-w-[180px]">
                                                    Lý do: {r.approverNote}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button 
                                                onClick={() => setDetailItem(r)} 
                                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" 
                                                title="Xem hồ sơ & in biểu mẫu"
                                            >
                                                <Eye size={15} />
                                            </button>

                                            {r.status === 'PENDING' && (
                                                <>
                                                    <button 
                                                        disabled={loadingId === r.id}
                                                        onClick={() => {
                                                            setApprovingItem(r);
                                                            setApproveNote('');
                                                        }}
                                                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs cursor-pointer transition-all disabled:opacity-50"
                                                        title="Phê duyệt đơn này"
                                                    >
                                                        <Check size={13} strokeWidth={2.5} /> Duyệt
                                                    </button>
                                                    <button 
                                                        disabled={loadingId === r.id}
                                                        onClick={() => {
                                                            setRejectingItem(r);
                                                            setRejectNote('');
                                                        }}
                                                        className="px-2 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                                                        title="Từ chối đơn"
                                                    >
                                                        <X size={13} strokeWidth={2.5} /> Từ chối
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

            {/* Modal Approve Confirmation with Note */}
            <Modal 
                isOpen={!!approvingItem} 
                onClose={() => !loadingId && setApprovingItem(null)} 
                title="Xác Nhận Phê Duyệt Đơn Nghỉ Phép"
            >
                {approvingItem && (
                    <form onSubmit={confirmApprove} className="space-y-4 text-xs">
                        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                            <p className="font-bold text-sm">Phê duyệt đơn của nhân viên: {approvingItem.user?.name || approvingItem.user?.email}</p>
                            <p>Loại đơn: <strong>{LEAVE_TYPE_MAP[approvingItem.type] || approvingItem.type}</strong> ({approvingItem.totalDays} ngày)</p>
                            <p>Thời gian: Từ <strong>{new Date(approvingItem.startDate).toLocaleDateString('vi-VN')}</strong> đến <strong>{new Date(approvingItem.endDate).toLocaleDateString('vi-VN')}</strong></p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="font-semibold text-slate-800">Lời nhắn / Ghi chú phê duyệt (Tùy chọn):</label>
                            <textarea 
                                value={approveNote} 
                                onChange={e => setApproveNote(e.target.value)} 
                                rows={2} 
                                className="p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs" 
                                placeholder="Nhập ghi chú cho nhân sự (nếu có)..."
                            />
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                            <Button type="button" variant="secondary" onClick={() => setApprovingItem(null)}>
                                Hủy bỏ
                            </Button>
                            <Button type="submit" disabled={loadingId === approvingItem.id} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                {loadingId === approvingItem.id ? 'Đang duyệt...' : 'Xác Nhận Phê Duyệt'}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal Reject Confirmation with Note */}
            <Modal 
                isOpen={!!rejectingItem} 
                onClose={() => !loadingId && setRejectingItem(null)} 
                title="Từ Chối Phê Duyệt Đơn Nghỉ Phép"
            >
                {rejectingItem && (
                    <form onSubmit={confirmReject} className="space-y-4 text-xs">
                        <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 space-y-1">
                            <p className="font-bold text-sm">Từ chối đơn của nhân viên: {rejectingItem.user?.name || rejectingItem.user?.email}</p>
                            <p>Loại đơn: <strong>{LEAVE_TYPE_MAP[rejectingItem.type] || rejectingItem.type}</strong> ({rejectingItem.totalDays} ngày)</p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="font-semibold text-slate-800">
                                Lý do từ chối <span className="text-rose-500">*</span>
                            </label>
                            <textarea 
                                required
                                value={rejectNote} 
                                onChange={e => setRejectNote(e.target.value)} 
                                rows={3} 
                                className="p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20 text-xs" 
                                placeholder="Nêu rõ lý do từ chối để gửi thông báo và email lại cho nhân sự..."
                            />
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                            <Button type="button" variant="secondary" onClick={() => setRejectingItem(null)}>
                                Hủy bỏ
                            </Button>
                            <Button type="submit" disabled={loadingId === rejectingItem.id} variant="danger" className="font-bold">
                                {loadingId === rejectingItem.id ? 'Đang từ chối...' : 'Xác Nhận Từ Chối'}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal Full Detail & Printable Slip */}
            <Modal 
                isOpen={!!detailItem} 
                onClose={() => setDetailItem(null)} 
                title="Hồ Sơ Đơn Từ & Phiếu Phê Duyệt Chi Tiết"
                maxWidth="max-w-2xl"
            >
                {detailItem && (
                    <div className="space-y-5 text-xs text-slate-800">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                            <div className="text-center border-b border-slate-200 pb-3">
                                <h3 className="text-base font-bold uppercase tracking-wider text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
                                <p className="text-[11px] font-medium text-slate-500">Độc lập - Tự do - Hạnh phúc</p>
                                <div className="w-16 h-0.5 bg-slate-300 mx-auto my-2"></div>
                                <h2 className="text-lg font-bold uppercase text-indigo-900 mt-2">PHIẾU PHÊ DUYỆT ĐƠN NGHỈ PHÉP</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                                <div>
                                    <span className="text-slate-500">Nhân viên gửi đơn:</span>
                                    <p className="font-bold text-slate-900 text-sm">{detailItem.user?.name || detailItem.user?.email}</p>
                                    <p className="text-[11px] text-slate-500">{detailItem.user?.email}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Phòng ban & Vị trí:</span>
                                    <p className="font-bold text-slate-800">{detailItem.user?.employeeProfile?.department || 'Chưa phân ban'} {detailItem.user?.employeeProfile?.position ? `(${detailItem.user.employeeProfile.position})` : ''}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Loại đơn:</span>
                                    <p className="font-bold text-indigo-700">{LEAVE_TYPE_MAP[detailItem.type] || detailItem.type}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Thời gian nghỉ:</span>
                                    <p className="font-semibold text-slate-900">
                                        Từ {new Date(detailItem.startDate).toLocaleDateString('vi-VN')} đến {new Date(detailItem.endDate).toLocaleDateString('vi-VN')}
                                    </p>
                                    <p className="text-[11px] text-indigo-700 font-semibold">{detailItem.totalDays || 1} ngày ({detailItem.duration === 'MORNING' ? 'Buổi sáng' : detailItem.duration === 'AFTERNOON' ? 'Buổi chiều' : 'Cả ngày'})</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Bàn giao công việc cho:</span>
                                    <p className="font-medium text-slate-800">{detailItem.handoverTo || 'Không chỉ định'}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">SĐT liên hệ khẩn:</span>
                                    <p className="font-medium text-slate-800">{detailItem.contactPhone || 'Không có'}</p>
                                </div>
                            </div>

                            <div>
                                <span className="font-bold text-slate-700">Lý do xin nghỉ chi tiết:</span>
                                <p className="mt-1 p-3 bg-slate-50/70 rounded-xl border border-slate-200 leading-relaxed text-slate-800">
                                    {detailItem.reason}
                                </p>
                            </div>

                            {detailItem.imageUrl && (
                                <div>
                                    <span className="font-bold text-slate-700">Minh chứng đính kèm:</span>
                                    <div className="mt-1">
                                        <img src={detailItem.imageUrl} alt="Chứng từ" className="max-h-48 rounded-xl border border-slate-200 object-contain" />
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                                <div>
                                    <span className="text-slate-500 text-[11px]">Trạng thái hiện tại:</span>
                                    <div className="mt-1">{getStatusBadge(detailItem.status)}</div>
                                </div>
                                {detailItem.approver && (
                                    <div className="text-right">
                                        <span className="text-slate-500 text-[11px]">Người duyệt:</span>
                                        <p className="font-bold text-slate-800">{detailItem.approver.name}</p>
                                        <span className="text-[10px] text-slate-400">{new Date(detailItem.updatedAt).toLocaleString('vi-VN')}</span>
                                    </div>
                                )}
                            </div>

                            {detailItem.approverNote && (
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px]">
                                    <strong>Ý kiến phê duyệt:</strong> <em>{detailItem.approverNote}</em>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Printer size={15} /> In Phiếu Phê Duyệt
                            </button>

                            <div className="flex gap-2">
                                {detailItem.status === 'PENDING' && (
                                    <>
                                        <Button 
                                            type="button" 
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                            onClick={() => {
                                                const item = detailItem;
                                                setDetailItem(null);
                                                setApprovingItem(item);
                                            }}
                                        >
                                            <Check size={14} /> Duyệt Đơn
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant="danger" 
                                            onClick={() => {
                                                const item = detailItem;
                                                setDetailItem(null);
                                                setRejectingItem(item);
                                            }}
                                        >
                                            <X size={14} /> Từ Chối
                                        </Button>
                                    </>
                                )}
                                <Button type="button" variant="secondary" onClick={() => setDetailItem(null)}>
                                    Đóng
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal View Image */}
            <Modal isOpen={!!viewImage} onClose={() => setViewImage(null)} title="Ảnh Minh Chứng / Chứng Từ Y Tế">
                <div className="flex justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    {viewImage && (
                        <img
                            src={viewImage}
                            alt="Minh Chứng y tế"
                            className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-xs"
                        />
                    )}
                </div>
            </Modal>
        </div>
    );
}
