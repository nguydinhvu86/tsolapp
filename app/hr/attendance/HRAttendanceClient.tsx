'use client';

import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Users, Search, Calendar, ChevronLeft, ChevronRight, ChevronDown, Printer, 
    X, Clock, ShieldCheck, FileSpreadsheet, CheckCircle, Info, MapPin
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { exportToExcel } from '@/lib/utils/export';

interface AttendanceUser {
    id: string;
    name?: string | null;
    email: string;
    role?: string;
    avatar?: string | null;
    isActive?: boolean;
    shiftConfig?: any;
}

interface AttendanceRecordItem {
    id: string;
    userId: string;
    date: string | Date;
    checkInTime?: string | Date | null;
    checkOutTime?: string | Date | null;
    checkInLocation?: string | null;
    checkOutLocation?: string | null;
    checkInPhotoUrl?: string | null;
    checkOutPhotoUrl?: string | null;
    notes?: string | null;
    status: string;
    totalWorkMinutes?: number | null;
    isLeave?: boolean;
    leaveType?: string;
}

interface MatrixRow {
    user: AttendanceUser;
    records: Record<number, AttendanceRecordItem>;
    totalPresent: number;
    totalLate: number;
    totalHalfDay: number;
    totalAbsent: number;
    totalLeave: number;
    totalWorkMinutes: number;
}

interface HRAttendanceClientProps {
    initialMatrix: MatrixRow[];
    month: number;
    year: number;
    daysInMonth: number;
}

const STATUS_CONFIG: Record<string, { label: string; code: string; bg: string; text: string; border: string; desc: string }> = {
    'PRESENT': { label: 'Đúng giờ', code: 'X', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', desc: 'Có mặt đúng giờ, đủ công' },
    'LATE': { label: 'Đi muộn', code: 'M', bg: '#fef3c7', text: '#b45309', border: '#fde68a', desc: 'Có mặt nhưng trễ so với giờ ca' },
    'HALF_DAY': { label: 'Nửa buổi', code: 'H', bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', desc: 'Làm việc 0.5 ngày công' },
    'ABSENT': { label: 'Vắng mặt', code: 'V', bg: '#ffe4e6', text: '#be123c', border: '#fecdd3', desc: 'Vắng không phép / không lương' },
    'LEAVE_ANNUAL': { label: 'Phép năm', code: 'P', bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff', desc: 'Nghỉ phép năm có lương' },
    'LEAVE_SICK': { label: 'Nghỉ ốm', code: 'O', bg: '#ccfbf1', text: '#0f766e', border: '#99f6e4', desc: 'Nghỉ ốm hưởng BHXH' },
    'LEAVE_UNPAID': { label: 'Không lương', code: 'KP', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', desc: 'Nghỉ việc riêng không lương' },
    'LEAVE_SPECIAL': { label: 'Việc riêng', code: 'VR', bg: '#fae8ff', text: '#a21caf', border: '#f5d0fe', desc: 'Nghỉ kết hôn, hiếu hỉ có lương' },
    'LEAVE_MATERNITY': { label: 'Thai sản', code: 'TS', bg: '#fce7f3', text: '#be185d', border: '#fbcfe8', desc: 'Chế độ thai sản theo luật' },
};

const cleanInputStyle: React.CSSProperties = {
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    fontFamily: 'inherit',
};

const cleanSelectStyle: React.CSSProperties = {
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    backgroundColor: 'transparent',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
    fontFamily: 'inherit',
};

export default function HRAttendanceClient({
    initialMatrix,
    month,
    year,
    daysInMonth
}: HRAttendanceClientProps) {
    const router = useRouter();

    // Employee Multi-Select states
    const allUserIds = useMemo(() => initialMatrix.map(m => m.user.id), [initialMatrix]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>(allUserIds);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [quickPresetFilter, setQuickPresetFilter] = useState<'ALL' | 'LATE' | 'LEAVE' | 'PERFECT'>('ALL');

    // Detail Modal for specific day inspection
    const [selectedCell, setSelectedCell] = useState<{ user: AttendanceUser; day: number; record?: AttendanceRecordItem } | null>(null);
    // Detail Modal for single employee timeline
    const [inspectedUserRow, setInspectedUserRow] = useState<MatrixRow | null>(null);

    const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

    const today = new Date();
    const isCurrentMonthYear = today.getMonth() + 1 === month && today.getFullYear() === year;
    const currentDayNum = today.getDate();

    // Toggle single user in selection
    const handleToggleUser = (uId: string) => {
        setSelectedUserIds(prev => 
            prev.includes(uId) ? prev.filter(id => id !== uId) : [...prev, uId]
        );
    };

    // Select all / Deselect all
    const handleSelectAllUsers = () => {
        setSelectedUserIds(allUserIds);
    };

    const handleDeselectAllUsers = () => {
        setSelectedUserIds([]);
    };

    // Filter matrix rows based on selected users & search
    const filteredMatrix = useMemo(() => {
        return initialMatrix.filter(row => {
            if (!selectedUserIds.includes(row.user.id)) return false;

            if (userSearchTerm.trim()) {
                const q = userSearchTerm.toLowerCase();
                const matchName = row.user.name?.toLowerCase().includes(q);
                const matchEmail = row.user.email?.toLowerCase().includes(q);
                if (!matchName && !matchEmail) return false;
            }

            if (quickPresetFilter === 'LATE' && row.totalLate === 0) return false;
            if (quickPresetFilter === 'LEAVE' && row.totalLeave === 0) return false;
            if (quickPresetFilter === 'PERFECT' && (row.totalLate > 0 || row.totalAbsent > 0)) return false;

            return true;
        });
    }, [initialMatrix, selectedUserIds, userSearchTerm, quickPresetFilter]);

    // Statistics of currently viewed employees
    const stats = useMemo(() => {
        const totalEmployees = filteredMatrix.length;
        const totalPresent = filteredMatrix.reduce((acc, r) => acc + r.totalPresent, 0);
        const totalLate = filteredMatrix.reduce((acc, r) => acc + r.totalLate, 0);
        const totalLeave = filteredMatrix.reduce((acc, r) => acc + r.totalLeave, 0);
        const totalHalfDay = filteredMatrix.reduce((acc, r) => acc + r.totalHalfDay, 0);
        const totalAbsent = filteredMatrix.reduce((acc, r) => acc + r.totalAbsent, 0);
        
        const onTimeRate = totalPresent + totalLate > 0 
            ? ((totalPresent / (totalPresent + totalLate)) * 100).toFixed(1) 
            : '100';

        return {
            totalEmployees,
            totalPresent,
            totalLate,
            totalLeave,
            totalHalfDay,
            totalAbsent,
            onTimeRate
        };
    }, [filteredMatrix]);

    // Month Navigation Handlers
    const handleNavigateMonth = (direction: 'PREV' | 'NEXT') => {
        let newMonth = direction === 'PREV' ? month - 1 : month + 1;
        let newYear = year;

        if (newMonth < 1) {
            newMonth = 12;
            newYear -= 1;
        } else if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
        }

        router.push(`/hr/attendance?month=${newMonth}&year=${newYear}`);
    };

    const handleMonthSelect = (m: number) => {
        router.push(`/hr/attendance?month=${m}&year=${year}`);
    };

    const handleYearSelect = (y: number) => {
        router.push(`/hr/attendance?month=${month}&year=${y}`);
    };

    // Export Excel
    const handleExportExcel = () => {
        if (filteredMatrix.length === 0) {
            toast.info('Không có dữ liệu nhân sự để xuất Excel.');
            return;
        }

        const dataToExport = filteredMatrix.map((row, idx) => {
            const rowData: any = {
                'STT': idx + 1,
                'Họ và Tên': row.user.name || 'Người dùng vô danh',
                'Email': row.user.email || '',
                'Phòng Ban / Vai Trò': row.user.role || 'Nhân viên',
                'Tổng Ngày Công': row.totalPresent + row.totalLate + (row.totalHalfDay * 0.5),
                'Đúng Giờ': row.totalPresent,
                'Đi Muộn': row.totalLate,
                'Nửa Buổi': row.totalHalfDay,
                'Nghỉ Phép': row.totalLeave,
                'Vắng Mặt': row.totalAbsent,
            };

            for (let day = 1; day <= daysInMonth; day++) {
                const record = row.records[day];
                let val = '-';
                if (record) {
                    const cfg = STATUS_CONFIG[record.status];
                    val = cfg ? cfg.code : record.status;
                }
                rowData[`Ngày ${day}`] = val;
            }

            return rowData;
        });

        exportToExcel(dataToExport, `Bang_Cham_Cong_Thang_${month}_${year}`);
    };

    return (
        <div className="space-y-5 w-full font-sans text-slate-800 pb-8">
            {/* Header & Controls Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
                        <Calendar size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                                NHÂN SỰ & CHẤM CÔNG
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-200/80 px-2 py-0.5 rounded-md tabular-nums">
                                Kỳ công: Tháng {month}/{year}
                            </span>
                        </div>
                        <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                            Bảng Chấm Công Toàn Công Ty
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Theo dõi chuyên cần, số ngày công, đi muộn và nghỉ phép của <span className="font-semibold text-slate-700 tabular-nums">{initialMatrix.length}</span> nhân sự toàn hệ thống
                        </p>
                    </div>
                </div>

                {/* Right controls: Month switcher & Export */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Month Picker Box - No Double Borders */}
                    <div className="inline-flex items-center h-[38px] bg-slate-50 px-1.5 rounded-xl border border-slate-200/90">
                        <button 
                            type="button" 
                            onClick={() => handleNavigateMonth('PREV')}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                            title="Tháng trước"
                        >
                            <ChevronLeft size={15} />
                        </button>

                        <div className="relative flex items-center px-2 h-full">
                            <select 
                                value={month} 
                                onChange={e => handleMonthSelect(Number(e.target.value))}
                                style={cleanSelectStyle}
                                className="font-semibold text-slate-800 text-xs pr-4 cursor-pointer"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>Tháng {m}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="text-slate-400 pointer-events-none absolute right-0.5" />
                        </div>

                        <span className="text-slate-300 text-xs mx-0.5">/</span>

                        <div className="relative flex items-center px-2 h-full">
                            <select 
                                value={year} 
                                onChange={e => handleYearSelect(Number(e.target.value))}
                                style={cleanSelectStyle}
                                className="font-semibold text-slate-800 text-xs pr-4 cursor-pointer tabular-nums"
                            >
                                {[year - 1, year, year + 1].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="text-slate-400 pointer-events-none absolute right-0.5" />
                        </div>

                        <button 
                            type="button" 
                            onClick={() => handleNavigateMonth('NEXT')}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                            title="Tháng sau"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>

                    {/* Export Buttons */}
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="h-[38px] px-3.5 rounded-xl text-xs font-semibold bg-white border border-slate-200/90 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                        <FileSpreadsheet size={15} />
                        <span>Xuất Excel</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="h-[38px] px-3.5 rounded-xl text-xs font-semibold bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                        <Printer size={15} />
                        <span>In Bảng Công</span>
                    </button>
                </div>
            </div>

            {/* KPI Statistics Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nhân Sự Đang Xem</div>
                        <div className="flex items-baseline gap-1.5 my-1">
                            <span className="text-xl font-bold text-slate-900 tabular-nums">{stats.totalEmployees}</span>
                            <span className="text-xs text-slate-400 font-medium tabular-nums">/ {initialMatrix.length} người</span>
                        </div>
                        <div className="text-[11px] text-emerald-600 font-medium">Đang áp dụng bộ lọc</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <Users size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tổng Ngày Công</div>
                        <div className="flex items-baseline gap-1.5 my-1">
                            <span className="text-xl font-bold text-emerald-600 tabular-nums">
                                {stats.totalPresent + stats.totalLate + (stats.totalHalfDay * 0.5)}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">công</span>
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums">Đúng giờ: {stats.totalPresent} lượt</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                        <CheckCircle size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Số Lượt Đi Muộn</div>
                        <div className="flex items-baseline gap-1.5 my-1">
                            <span className="text-xl font-bold text-amber-600 tabular-nums">{stats.totalLate}</span>
                            <span className="text-xs text-slate-400 font-medium">lượt</span>
                        </div>
                        <div className="text-[11px] text-amber-600/90 font-medium">Cần theo dõi sát</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                        <Clock size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nghỉ Phép / Chế Độ</div>
                        <div className="flex items-baseline gap-1.5 my-1">
                            <span className="text-xl font-bold text-purple-600 tabular-nums">{stats.totalLeave}</span>
                            <span className="text-xs text-slate-400 font-medium">ngày</span>
                        </div>
                        <div className="text-[11px] text-purple-600/90 font-medium">Đã được HCNS duyệt</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
                        <Calendar size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between col-span-2 lg:col-span-1">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tỷ Lệ Đúng Giờ</div>
                        <div className="flex items-baseline gap-1 my-1">
                            <span className="text-xl font-bold text-teal-600 tabular-nums">{stats.onTimeRate}%</span>
                        </div>
                        <div className="text-[11px] text-teal-600/90 font-medium">Tỷ lệ chuyên cần</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shrink-0">
                        <ShieldCheck size={18} />
                    </div>
                </div>
            </div>

            {/* Employee Multi-Select & Advanced Filter Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                        {/* Quick Search Input - No Double Border */}
                        <div className="flex items-center h-[38px] bg-slate-50 border border-slate-200/90 rounded-xl px-3 flex-1 max-w-sm focus-within:bg-white focus-within:border-emerald-500 transition-all">
                            <Search size={15} className="text-slate-400 mr-2 shrink-0" />
                            <input
                                type="text"
                                placeholder="Tìm nhanh theo tên hoặc email nhân sự..."
                                value={userSearchTerm}
                                onChange={e => setUserSearchTerm(e.target.value)}
                                style={cleanInputStyle}
                                className="w-full text-xs text-slate-800 placeholder:text-slate-400"
                            />
                            {userSearchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setUserSearchTerm('')}
                                    className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Employee Selection Dropdown Trigger */}
                        <div className="relative min-w-[260px]">
                            <button
                                type="button"
                                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                className={`w-full h-[38px] px-3.5 rounded-xl border text-left flex items-center justify-between text-xs font-medium transition-all cursor-pointer ${
                                    selectedUserIds.length < allUserIds.length
                                        ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900'
                                        : 'bg-slate-50 border-slate-200/90 text-slate-700 hover:bg-white hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-2 truncate pr-2">
                                    <Users size={15} className="text-emerald-600 shrink-0" />
                                    <span className="font-semibold truncate">
                                        {selectedUserIds.length === allUserIds.length 
                                            ? `Tất cả nhân sự (${allUserIds.length} người)` 
                                            : `Đang chọn ${selectedUserIds.length}/${allUserIds.length} nhân sự`}
                                    </span>
                                </div>
                                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu Popover */}
                            {isUserDropdownOpen && (
                                <div 
                                    className="absolute left-0 top-full mt-2 w-full min-w-[340px] sm:min-w-[380px] bg-white rounded-2xl border border-slate-200 p-3.5 z-50 space-y-2.5 shadow-xl"
                                >
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                        <span className="font-semibold text-slate-900 text-xs">
                                            Chọn nhân sự hiển thị ({initialMatrix.length})
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                type="button" 
                                                onClick={handleSelectAllUsers}
                                                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                                            >
                                                Chọn tất cả
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button 
                                                type="button" 
                                                onClick={handleDeselectAllUsers}
                                                className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                                            >
                                                Bỏ chọn
                                            </button>
                                        </div>
                                    </div>

                                    {/* Inner search without double border */}
                                    <div className="flex items-center h-[34px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 focus-within:bg-white focus-within:border-emerald-500">
                                        <Search className="text-slate-400 mr-2 shrink-0" size={13} />
                                        <input 
                                            type="text" 
                                            placeholder="Lọc nhanh tên hoặc email..." 
                                            value={userSearchTerm}
                                            onChange={e => setUserSearchTerm(e.target.value)}
                                            style={cleanInputStyle}
                                            className="w-full text-xs text-slate-800 placeholder:text-slate-400"
                                        />
                                    </div>

                                    {/* Checkbox list */}
                                    <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                                        {initialMatrix.map(row => {
                                            const isChecked = selectedUserIds.includes(row.user.id);
                                            return (
                                                <label 
                                                    key={row.user.id} 
                                                    className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                                                        isChecked 
                                                            ? 'bg-emerald-50/50 border-emerald-200/80' 
                                                            : 'bg-white border-slate-100 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isChecked}
                                                            onChange={() => handleToggleUser(row.user.id)}
                                                            className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer shrink-0"
                                                        />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={`text-xs font-semibold truncate ${isChecked ? 'text-emerald-950' : 'text-slate-800'}`}>
                                                                {row.user.name || 'Người dùng vô danh'}
                                                            </span>
                                                            <span className="text-[11px] text-slate-400 truncate">
                                                                {row.user.email}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                        <span className="text-[11px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 tabular-nums">
                                                            {row.totalPresent + row.totalLate} công
                                                        </span>
                                                        {row.totalLate > 0 && (
                                                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md tabular-nums">
                                                                {row.totalLate} muộn
                                                            </span>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-[11px] text-slate-500 tabular-nums">
                                            Đang chọn <strong className="text-slate-800">{selectedUserIds.length}</strong> / {allUserIds.length} nhân sự
                                        </span>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsUserDropdownOpen(false)}
                                            className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold text-xs hover:bg-emerald-700 cursor-pointer transition-colors"
                                        >
                                            Xong
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preset Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setQuickPresetFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer tabular-nums ${
                                quickPresetFilter === 'ALL' 
                                    ? 'bg-white text-slate-900 shadow-2xs' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Tất cả ({selectedUserIds.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickPresetFilter('LATE')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                quickPresetFilter === 'LATE' 
                                    ? 'bg-amber-500 text-white shadow-2xs' 
                                    : 'text-amber-700 hover:bg-amber-50/80'
                            }`}
                        >
                            Có đi muộn
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickPresetFilter('LEAVE')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                quickPresetFilter === 'LEAVE' 
                                    ? 'bg-purple-600 text-white shadow-2xs' 
                                    : 'text-purple-700 hover:bg-purple-50/80'
                            }`}
                        >
                            Có nghỉ phép
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickPresetFilter('PERFECT')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                quickPresetFilter === 'PERFECT' 
                                    ? 'bg-emerald-600 text-white shadow-2xs' 
                                    : 'text-emerald-700 hover:bg-emerald-50/80'
                            }`}
                        >
                            Chuyên cần 100%
                        </button>
                    </div>
                </div>

                {/* Selected User Chips */}
                {selectedUserIds.length < allUserIds.length && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
                        <span className="text-[11px] text-slate-500 font-medium">Đang lọc nhân sự:</span>
                        {selectedUserIds.map(uId => {
                            const u = initialMatrix.find(m => m.user.id === uId)?.user;
                            if (!u) return null;
                            return (
                                <span 
                                    key={uId}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold"
                                >
                                    <span>{u.name || u.email}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => handleToggleUser(uId)}
                                        className="hover:text-rose-600 cursor-pointer ml-0.5"
                                        title="Bỏ chọn nhân sự này"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            );
                        })}
                        <button 
                            type="button" 
                            onClick={handleSelectAllUsers}
                            className="text-[11px] font-semibold text-slate-500 hover:text-emerald-700 underline cursor-pointer ml-1"
                        >
                            Hiển thị lại toàn bộ
                        </button>
                    </div>
                )}
            </div>

            {/* Matrix Table Card */}
            <div id="attendance-matrix-table" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Bảng Điểm Danh & Chuyên Cần Chi Tiết
                        </h2>
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full tabular-nums">
                            {filteredMatrix.length} nhân sự
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-rose-100 border border-rose-300 inline-block"></span>
                            <span>Cuối tuần (T7, CN)</span>
                        </span>
                        {isCurrentMonthYear && (
                            <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span>
                                <span>Hôm nay (Ngày {currentDayNum})</span>
                            </span>
                        )}
                    </div>
                </div>

                <div className="custom-scrollbar overflow-x-auto">
                    <table style={{ width: `${820 + daysInMonth * 38}px`, minWidth: '100%', borderCollapse: 'collapse' }} className="text-left">
                        <thead>
                            {/* Top Tier Header */}
                            <tr>
                                <th 
                                    colSpan={5} 
                                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
                                    className="px-3 py-2 border-b border-r text-slate-700 text-xs font-semibold text-center sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.03)]"
                                >
                                    Thông Tin Nhân Sự & Tổng Hợp Công
                                </th>
                                <th 
                                    colSpan={daysInMonth} 
                                    style={{ backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
                                    className="px-3 py-2 border-b text-xs font-semibold text-center tabular-nums"
                                >
                                    Chi Tiết Chấm Công Tháng {month}/{year} ({daysInMonth} ngày)
                                </th>
                            </tr>

                            {/* Second Tier Header */}
                            <tr className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                                <th 
                                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', width: '220px' }}
                                    className="px-4 py-2.5 border-b border-r sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.03)]"
                                >
                                    Họ và Tên
                                </th>
                                <th 
                                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', width: '56px' }}
                                    className="px-1 py-2.5 border-b border-r text-center font-semibold text-emerald-700" 
                                    title="Tổng Ngày Công Đạt Được"
                                >
                                    Công
                                </th>
                                <th 
                                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', width: '50px' }}
                                    className="px-1 py-2.5 border-b border-r text-center font-semibold text-amber-700" 
                                    title="Số Lượt Đi Muộn"
                                >
                                    Muộn
                                </th>
                                <th 
                                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', width: '50px' }}
                                    className="px-1 py-2.5 border-b border-r text-center font-semibold text-purple-700" 
                                    title="Số Ngày Nghỉ Phép / Chế Độ"
                                >
                                    Phép
                                </th>
                                <th 
                                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', width: '50px' }}
                                    className="px-1 py-2.5 border-b border-r text-center font-semibold text-rose-700" 
                                    title="Số Buổi Vắng Không Phép"
                                >
                                    Vắng
                                </th>

                                {/* Day Columns */}
                                {daysArray.map(day => {
                                    const date = new Date(year, month - 1, day);
                                    const dayOfWeek = date.getDay();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    const isToday = isCurrentMonthYear && day === currentDayNum;

                                    return (
                                        <th 
                                            key={day} 
                                            style={isToday ? {
                                                backgroundColor: '#059669',
                                                color: '#ffffff',
                                                borderColor: '#047857'
                                            } : isWeekend ? {
                                                backgroundColor: '#fff1f2',
                                                color: '#e11d48',
                                                borderColor: '#fecdd3'
                                            } : {
                                                borderColor: '#e2e8f0'
                                            }}
                                            className="p-1 border-b border-r text-center w-9.5 transition-colors tabular-nums"
                                        >
                                            <div className="flex flex-col items-center">
                                                <span className={`font-bold text-xs ${isToday ? 'text-white' : ''}`}>{day}</span>
                                                <span className={`text-[9px] font-semibold uppercase ${isToday ? 'text-emerald-100' : 'opacity-75'}`}>
                                                    {dayOfWeek === 0 ? 'CN' : `T${dayOfWeek + 1}`}
                                                </span>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        <tbody className="text-xs divide-y divide-slate-100">
                            {filteredMatrix.map((row) => (
                                <tr key={row.user.id} className="group hover:bg-slate-50/70 transition-colors">
                                    {/* Sticky Left: Employee Column */}
                                    <td 
                                        style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
                                        className="px-3.5 py-2 border-b border-r sticky left-0 z-20 group-hover:bg-slate-50 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.03)]"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-[11px] shrink-0 border border-emerald-200/80">
                                                {row.user.name ? row.user.name.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <button 
                                                    type="button"
                                                    onClick={() => setInspectedUserRow(row)}
                                                    className="font-semibold text-slate-900 hover:text-emerald-700 text-left truncate text-xs cursor-pointer transition-colors"
                                                    title="Bấm để xem lịch sử chi tiết nhân viên này"
                                                >
                                                    {row.user.name || 'Người dùng vô danh'}
                                                </button>
                                                <span className="text-[11px] text-slate-400 font-normal truncate">
                                                    {row.user.email}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Summary columns */}
                                    <td 
                                        style={{ backgroundColor: '#f0fdf4', borderColor: '#e2e8f0', color: '#047857' }}
                                        className="px-1 py-2 border-b border-r text-center font-bold tabular-nums text-xs"
                                    >
                                        {row.totalPresent + row.totalLate + (row.totalHalfDay * 0.5)}
                                    </td>

                                    <td 
                                        style={{ backgroundColor: row.totalLate > 0 ? '#fffbeb' : '#ffffff', borderColor: '#e2e8f0', color: row.totalLate > 0 ? '#b45309' : '#94a3b8' }}
                                        className="px-1 py-2 border-b border-r text-center font-semibold tabular-nums text-xs"
                                    >
                                        {row.totalLate}
                                    </td>

                                    <td 
                                        style={{ backgroundColor: row.totalLeave > 0 ? '#faf5ff' : '#ffffff', borderColor: '#e2e8f0', color: row.totalLeave > 0 ? '#7e22ce' : '#94a3b8' }}
                                        className="px-1 py-2 border-b border-r text-center font-semibold tabular-nums text-xs"
                                    >
                                        {row.totalLeave}
                                    </td>

                                    <td 
                                        style={{ backgroundColor: row.totalAbsent > 0 ? '#fff1f2' : '#ffffff', borderColor: '#e2e8f0', color: row.totalAbsent > 0 ? '#be123c' : '#94a3b8' }}
                                        className="px-1 py-2 border-b border-r text-center font-semibold tabular-nums text-xs"
                                    >
                                        {row.totalAbsent}
                                    </td>

                                    {/* Daily Cells */}
                                    {daysArray.map(day => {
                                        const record = row.records[day];
                                        const date = new Date(year, month - 1, day);
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                        const isToday = isCurrentMonthYear && day === currentDayNum;

                                        let content = '-';
                                        let cellBg = isWeekend ? '#fff1f266' : 'transparent';
                                        let cellText = '#cbd5e1';
                                        let cellBorder = '#e2e8f0';

                                        if (record) {
                                            const cfg = STATUS_CONFIG[record.status];
                                            if (cfg) {
                                                content = cfg.code;
                                                cellBg = cfg.bg;
                                                cellText = cfg.text;
                                                cellBorder = cfg.border;
                                            }
                                        }

                                        return (
                                            <td 
                                                key={day}
                                                onClick={() => setSelectedCell({ user: row.user, day, record })}
                                                style={{ 
                                                    backgroundColor: cellBg, 
                                                    color: cellText, 
                                                    borderColor: cellBorder 
                                                }}
                                                className={`p-1 border-b border-r text-center font-bold text-[11px] cursor-pointer hover:brightness-95 transition-all ${isToday ? 'ring-1 ring-inset ring-emerald-500' : ''}`}
                                                title={record 
                                                    ? `${row.user.name}: Ngày ${day}/${month} - ${STATUS_CONFIG[record.status]?.label || record.status}${record.checkInTime ? ` (Vào: ${new Date(record.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})` : ''}` 
                                                    : `Ngày ${day}/${month}: Không có dữ liệu`}
                                            >
                                                {content}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}

                            {filteredMatrix.length === 0 && (
                                <tr>
                                    <td colSpan={5 + daysInMonth} className="p-16 text-center text-slate-500 bg-slate-50/40">
                                        <div className="flex flex-col items-center justify-center">
                                            <Users className="w-10 h-10 text-slate-300 mb-2" strokeWidth={1.5} />
                                            <h3 className="text-sm font-semibold text-slate-700">Không tìm thấy nhân sự nào</h3>
                                            <p className="text-xs text-slate-400 mt-0.5">Vui lòng điều chỉnh lại bộ lọc nhân sự hoặc từ khóa tìm kiếm.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend & Summary Guide */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                        <Info size={14} className="text-emerald-600" />
                        Chú Thích Ký Hiệu & Mã Trạng Thái Chấm Công
                    </span>
                    <span className="text-[11px] text-slate-400">
                        Bấm vào bất kỳ ô ngày công hoặc tên nhân sự nào trên bảng để xem chi tiết giờ Check-in/Check-out & vị trí GPS
                    </span>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <div 
                            key={key}
                            style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.text }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-medium"
                        >
                            <span className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] bg-white border border-current/20">
                                {cfg.code}
                            </span>
                            <span>{cfg.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal 1: Cell Inspection Details (Day Breakdown) */}
            <Modal
                isOpen={!!selectedCell}
                onClose={() => setSelectedCell(null)}
                title={`Chi Tiết Điểm Danh: Ngày ${selectedCell?.day}/${month}/${year}`}
                maxWidth="540px"
            >
                {selectedCell && (
                    <div className="space-y-4 text-xs font-sans">
                        {/* User Header */}
                        <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                                {selectedCell.user.name ? selectedCell.user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-sm truncate">{selectedCell.user.name || 'Người dùng vô danh'}</h4>
                                <p className="text-slate-500 text-xs truncate">{selectedCell.user.email} • {selectedCell.user.role || 'Nhân sự'}</p>
                            </div>
                        </div>

                        {/* Status Card */}
                        {selectedCell.record ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                                        <span className="text-[11px] text-slate-500 font-semibold uppercase">Trạng Thái</span>
                                        <div>
                                            {(() => {
                                                const cfg = STATUS_CONFIG[selectedCell.record.status];
                                                return cfg ? (
                                                    <span 
                                                        style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold text-xs"
                                                    >
                                                        {cfg.code} - {cfg.label}
                                                    </span>
                                                ) : <span className="font-semibold">{selectedCell.record.status}</span>;
                                            })()}
                                        </div>
                                    </div>

                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                                        <span className="text-[11px] text-slate-500 font-semibold uppercase">Thời Gian Làm Việc</span>
                                        <p className="font-bold text-slate-900 text-sm tabular-nums">
                                            {selectedCell.record.totalWorkMinutes 
                                                ? `${Math.floor(selectedCell.record.totalWorkMinutes / 60)} giờ ${selectedCell.record.totalWorkMinutes % 60} phút` 
                                                : '-'}
                                        </p>
                                    </div>
                                </div>

                                {/* Check-In & Check-Out Times */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                                        <span className="text-[11px] font-semibold uppercase text-emerald-800 flex items-center gap-1">
                                            <Clock size={12} /> Giờ Check-In
                                        </span>
                                        <p className="font-bold text-emerald-900 text-sm tabular-nums">
                                            {selectedCell.record.checkInTime 
                                                ? new Date(selectedCell.record.checkInTime).toLocaleTimeString('vi-VN') 
                                                : 'Chưa Check-In'}
                                        </p>
                                        {selectedCell.record.checkInLocation && (
                                            <p className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1 truncate" title={selectedCell.record.checkInLocation}>
                                                <MapPin size={11} className="shrink-0" /> {selectedCell.record.checkInLocation}
                                            </p>
                                        )}
                                    </div>

                                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1">
                                        <span className="text-[11px] font-semibold uppercase text-indigo-800 flex items-center gap-1">
                                            <Clock size={12} /> Giờ Check-Out
                                        </span>
                                        <p className="font-bold text-indigo-900 text-sm tabular-nums">
                                            {selectedCell.record.checkOutTime 
                                                ? new Date(selectedCell.record.checkOutTime).toLocaleTimeString('vi-VN') 
                                                : 'Chưa Check-Out'}
                                        </p>
                                        {selectedCell.record.checkOutLocation && (
                                            <p className="text-[11px] text-indigo-700 flex items-center gap-1 mt-1 truncate" title={selectedCell.record.checkOutLocation}>
                                                <MapPin size={11} className="shrink-0" /> {selectedCell.record.checkOutLocation}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Notes if any */}
                                {selectedCell.record.notes && (
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                                        <span className="font-semibold text-slate-700 block mb-0.5">Ghi chú:</span>
                                        <p className="text-slate-600 leading-relaxed">{selectedCell.record.notes}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200/80">
                                Không có bản ghi chấm công hoặc đăng ký nghỉ phép nào vào ngày này.
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button type="button" variant="secondary" onClick={() => setSelectedCell(null)}>
                                Đóng
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal 2: Full Individual Employee Timeline Drill-down */}
            <Modal
                isOpen={!!inspectedUserRow}
                onClose={() => setInspectedUserRow(null)}
                title={`Hồ Sơ Chấm Công Tháng ${month}/${year}: ${inspectedUserRow?.user.name || 'Nhân sự'}`}
                maxWidth="680px"
            >
                {inspectedUserRow && (
                    <div className="space-y-4 text-xs font-sans">
                        {/* Summary Bar */}
                        <div className="grid grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-center">
                            <div>
                                <span className="text-[11px] text-slate-500 font-semibold uppercase">Tổng công</span>
                                <p className="text-base font-bold text-emerald-600 tabular-nums mt-0.5">{inspectedUserRow.totalPresent + inspectedUserRow.totalLate}</p>
                            </div>
                            <div>
                                <span className="text-[11px] text-slate-500 font-semibold uppercase">Đi muộn</span>
                                <p className="text-base font-bold text-amber-600 tabular-nums mt-0.5">{inspectedUserRow.totalLate}</p>
                            </div>
                            <div>
                                <span className="text-[11px] text-slate-500 font-semibold uppercase">Nghỉ phép</span>
                                <p className="text-base font-bold text-purple-600 tabular-nums mt-0.5">{inspectedUserRow.totalLeave}</p>
                            </div>
                            <div>
                                <span className="text-[11px] text-slate-500 font-semibold uppercase">Vắng mặt</span>
                                <p className="text-base font-bold text-rose-600 tabular-nums mt-0.5">{inspectedUserRow.totalAbsent}</p>
                            </div>
                        </div>

                        {/* Day list table */}
                        <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200/80 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-[11px] uppercase font-semibold text-slate-500 border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="px-3.5 py-2.5">Ngày</th>
                                        <th className="px-3.5 py-2.5 text-center">Trạng thái</th>
                                        <th className="px-3.5 py-2.5">Giờ Vào - Giờ Ra</th>
                                        <th className="px-3.5 py-2.5">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {daysArray.map(day => {
                                        const rec = inspectedUserRow.records[day];
                                        const date = new Date(year, month - 1, day);
                                        const dayName = date.toLocaleDateString('vi-VN', { weekday: 'short' });
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                                        return (
                                            <tr key={day} className={`hover:bg-slate-50 ${isWeekend ? 'bg-slate-50/40' : ''}`}>
                                                <td className="px-3.5 py-2 font-semibold text-slate-800 tabular-nums">
                                                    Ngày {day} ({dayName})
                                                </td>
                                                <td className="px-3.5 py-2 text-center">
                                                    {rec ? (
                                                        (() => {
                                                            const cfg = STATUS_CONFIG[rec.status];
                                                            return cfg ? (
                                                                <span 
                                                                    style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
                                                                    className="px-2 py-0.5 rounded-md border font-semibold text-[11px]"
                                                                >
                                                                    {cfg.label}
                                                                </span>
                                                            ) : <span className="font-semibold">{rec.status}</span>;
                                                        })()
                                                    ) : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="px-3.5 py-2 text-slate-600 tabular-nums">
                                                    {rec?.checkInTime ? (
                                                        <span>
                                                            {new Date(rec.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                            {rec.checkOutTime ? ` → ${new Date(rec.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ' (Chưa checkout)'}
                                                        </span>
                                                    ) : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="px-3.5 py-2 text-slate-500 max-w-[180px] truncate" title={rec?.notes || ''}>
                                                    {rec?.notes || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button type="button" variant="secondary" onClick={() => setInspectedUserRow(null)}>
                                Đóng
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
