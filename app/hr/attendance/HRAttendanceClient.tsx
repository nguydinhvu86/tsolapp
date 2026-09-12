'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    Users, Search, Calendar, ChevronLeft, ChevronRight, Download, Printer, 
    CheckSquare, Square, X, Filter, Clock, AlertTriangle, ShieldCheck, 
    FileSpreadsheet, Sparkles, CheckCircle, Ban, Eye, UserCheck, 
    ArrowUpDown, Info, MapPin, Camera, RefreshCw
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

export default function HRAttendanceClient({
    initialMatrix,
    month,
    year,
    daysInMonth
}: HRAttendanceClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

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
            // Must be selected in multi-select
            if (!selectedUserIds.includes(row.user.id)) return false;

            // Search by name or email
            if (userSearchTerm.trim()) {
                const q = userSearchTerm.toLowerCase();
                const matchName = row.user.name?.toLowerCase().includes(q);
                const matchEmail = row.user.email?.toLowerCase().includes(q);
                if (!matchName && !matchEmail) return false;
            }

            // Quick preset filter
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
            alert('Không có dữ liệu nhân sự để xuất Excel.');
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
        <div className="space-y-5 w-full text-xs">
            {/* Header & Controls Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div 
                        style={{ 
                            background: 'linear-gradient(135deg, #047857 0%, #0d9488 100%)', 
                            color: '#ffffff' 
                        }}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                    >
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            Bảng Chấm Công Toàn Công Ty
                            <span 
                                style={{ backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs"
                            >
                                Tháng {month}/{year}
                            </span>
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            Theo dõi chuyên cần, số công, đi muộn và ngày nghỉ của nhân viên ({initialMatrix.length} nhân sự toàn công ty)
                        </p>
                    </div>
                </div>

                {/* Right controls: Month switcher & Export */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Month Picker Box */}
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <button 
                            type="button" 
                            onClick={() => handleNavigateMonth('PREV')}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                            title="Tháng trước"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <select 
                            value={month} 
                            onChange={e => handleMonthSelect(Number(e.target.value))}
                            className="bg-transparent font-bold text-slate-800 outline-none px-1.5 py-1 text-xs cursor-pointer"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>Tháng {m}</option>
                            ))}
                        </select>

                        <span className="text-slate-300">/</span>

                        <select 
                            value={year} 
                            onChange={e => handleYearSelect(Number(e.target.value))}
                            className="bg-transparent font-bold text-slate-800 outline-none px-1.5 py-1 text-xs cursor-pointer"
                        >
                            {[year - 1, year, year + 1].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>

                        <button 
                            type="button" 
                            onClick={() => handleNavigateMonth('NEXT')}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                            title="Tháng sau"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Export Buttons */}
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#047857' }}
                        className="px-3.5 py-2 rounded-xl font-bold border hover:bg-emerald-50 hover:border-emerald-500 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                        <FileSpreadsheet size={15} />
                        <span>Xuất Excel</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#334155' }}
                        className="px-3.5 py-2 rounded-xl font-bold border hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                        <Printer size={15} />
                        <span>In Bảng Công</span>
                    </button>
                </div>
            </div>

            {/* Employee Multi-Select & Advanced Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Employee Selection Dropdown trigger */}
                    <div className="relative min-w-[280px] max-w-md flex-1">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                style={{ 
                                    backgroundColor: selectedUserIds.length < allUserIds.length ? '#f0fdf4' : '#ffffff',
                                    borderColor: selectedUserIds.length < allUserIds.length ? '#059669' : '#cbd5e1'
                                }}
                                className="w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between font-medium text-slate-800 shadow-2xs cursor-pointer hover:border-emerald-500 transition-all"
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Users size={16} className="text-emerald-600 shrink-0" />
                                    <span className="font-bold text-slate-800">
                                        {selectedUserIds.length === allUserIds.length 
                                            ? `Tất cả nhân viên (${allUserIds.length} người)` 
                                            : `Đang chọn ${selectedUserIds.length} / ${allUserIds.length} nhân sự`}
                                    </span>
                                </div>
                                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-100">
                                    {isUserDropdownOpen ? 'Đóng ▲' : 'Chọn nhân sự ▼'}
                                </span>
                            </button>
                        </div>

                        {/* Dropdown Menu Modal / Popover */}
                        {isUserDropdownOpen && (
                            <div 
                                style={{ 
                                    backgroundColor: '#ffffff',
                                    borderColor: '#cbd5e1',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' 
                                }}
                                className="absolute left-0 top-full mt-2 w-full min-w-[340px] max-w-lg rounded-2xl border p-3 z-50 space-y-2.5"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <span className="font-bold text-slate-900 text-xs">Chọn nhân sự xem bảng công ({initialMatrix.length})</span>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            type="button" 
                                            onClick={handleSelectAllUsers}
                                            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                                        >
                                            Chọn tất cả
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button 
                                            type="button" 
                                            onClick={handleDeselectAllUsers}
                                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                                        >
                                            Bỏ chọn
                                        </button>
                                    </div>
                                </div>

                                {/* Inner search */}
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input 
                                        type="text" 
                                        placeholder="Tìm theo tên hoặc email nhân sự..." 
                                        value={userSearchTerm}
                                        onChange={e => setUserSearchTerm(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                                                        ? 'bg-emerald-50/60 border-emerald-200' 
                                                        : 'bg-white border-slate-100 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked}
                                                        onChange={() => handleToggleUser(row.user.id)}
                                                        className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className={`font-bold ${isChecked ? 'text-emerald-900' : 'text-slate-800'}`}>
                                                            {row.user.name || 'Người dùng vô danh'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-normal">
                                                            {row.user.email}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                        {row.totalPresent + row.totalLate} công
                                                    </span>
                                                    {row.totalLate > 0 && (
                                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                                            {row.totalLate} muộn
                                                        </span>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-[11px] text-slate-500">
                                        Đang xem <strong>{selectedUserIds.length}</strong> / {allUserIds.length} người
                                    </span>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsUserDropdownOpen(false)}
                                        className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 cursor-pointer"
                                    >
                                        Xác nhận
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Preset Filter Tabs */}
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setQuickPresetFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                quickPresetFilter === 'ALL' 
                                    ? 'bg-white text-slate-900 shadow-2xs' 
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Tất cả ({selectedUserIds.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickPresetFilter('LATE')}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                quickPresetFilter === 'LATE' 
                                    ? 'bg-amber-500 text-white shadow-2xs' 
                                    : 'text-amber-700 hover:bg-amber-50'
                            }`}
                        >
                            Có đi muộn
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickPresetFilter('LEAVE')}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                quickPresetFilter === 'LEAVE' 
                                    ? 'bg-purple-600 text-white shadow-2xs' 
                                    : 'text-purple-700 hover:bg-purple-50'
                            }`}
                        >
                            Có nghỉ phép
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickPresetFilter('PERFECT')}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                quickPresetFilter === 'PERFECT' 
                                    ? 'bg-emerald-600 text-white shadow-2xs' 
                                    : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                        >
                            Chuyên cần 100%
                        </button>
                    </div>
                </div>

                {/* Selected User Chips */}
                {selectedUserIds.length < allUserIds.length && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[11px] text-slate-500 font-semibold">Đang lọc theo nhân sự:</span>
                        {selectedUserIds.map(uId => {
                            const u = initialMatrix.find(m => m.user.id === uId)?.user;
                            if (!u) return null;
                            return (
                                <span 
                                    key={uId}
                                    style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold shadow-2xs"
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
                            className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 underline cursor-pointer ml-1"
                        >
                            Hiển thị lại toàn bộ
                        </button>
                    </div>
                )}
            </div>

            {/* KPI Statistics Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Nhân Sự Đang Xem</div>
                        <div className="flex items-baseline gap-1 my-0.5">
                            <span className="text-xl font-black font-mono text-slate-800">{stats.totalEmployees}</span>
                            <span className="text-[11px] text-slate-400 font-semibold">/ {initialMatrix.length} người</span>
                        </div>
                        <div className="text-[10px] text-emerald-600 font-medium">Đang áp dụng bộ lọc</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <Users size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Tổng Ngày Công</div>
                        <div className="flex items-baseline gap-1 my-0.5">
                            <span className="text-xl font-black font-mono text-emerald-600">
                                {stats.totalPresent + stats.totalLate + (stats.totalHalfDay * 0.5)}
                            </span>
                            <span className="text-[11px] text-slate-400 font-semibold">công</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Đúng giờ: {stats.totalPresent}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <CheckCircle size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Số Lượt Đi Muộn</div>
                        <div className="flex items-baseline gap-1 my-0.5">
                            <span className="text-xl font-black font-mono text-amber-600">{stats.totalLate}</span>
                            <span className="text-[11px] text-slate-400 font-semibold">lượt</span>
                        </div>
                        <div className="text-[10px] text-amber-600/80">Cần theo dõi sát</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                        <Clock size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Nghỉ Phép / Chế Độ</div>
                        <div className="flex items-baseline gap-1 my-0.5">
                            <span className="text-xl font-black font-mono text-purple-600">{stats.totalLeave}</span>
                            <span className="text-[11px] text-slate-400 font-semibold">ngày</span>
                        </div>
                        <div className="text-[10px] text-purple-600/80">Đã được HCNS duyệt</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                        <Calendar size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Tỷ Lệ Đúng Giờ</div>
                        <div className="flex items-baseline gap-1 my-0.5">
                            <span className="text-xl font-black font-mono text-teal-600">{stats.onTimeRate}%</span>
                        </div>
                        <div className="text-[10px] text-teal-600/80">Tỷ lệ chuyên cần</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                        <ShieldCheck size={18} />
                    </div>
                </div>
            </div>

            {/* Matrix Table Card */}
            <div id="attendance-matrix-table" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Bảng Điểm Danh & Chuyên Cần Chi Tiết
                        </h2>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-200/80 px-2.5 py-0.5 rounded-full">
                            {filteredMatrix.length} nhân sự
                        </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-300 inline-block"></span> Cuối tuần (T7, CN)
                        </span>
                        {isCurrentMonthYear && (
                            <span className="flex items-center gap-1 font-bold text-emerald-700">
                                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span> Ngày hôm nay ({currentDayNum})
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
                                    className="px-3 py-2 border-b border-r text-slate-700 text-xs font-bold text-center sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.04)]"
                                >
                                    Thông tin Nhân sự & Tổng Hợp Công
                                </th>
                                <th 
                                    colSpan={daysInMonth} 
                                    style={{ backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
                                    className="px-3 py-2 border-b text-xs font-bold text-center"
                                >
                                    Chi tiết chấm công ngày trong tháng {month}/{year} ({daysInMonth} ngày)
                                </th>
                            </tr>

                            {/* Second Tier Header */}
                            <tr className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                                <th 
                                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', width: '220px' }}
                                    className="px-4 py-2.5 border-b border-r sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.04)]"
                                >
                                    Họ và Tên
                                </th>
                                <th 
                                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', width: '56px' }}
                                    className="px-1 py-2.5 border-b border-r text-center font-bold" 
                                    title="Tổng Ngày Công Đạt Được"
                                >
                                    Công
                                </th>
                                <th 
                                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', width: '50px' }}
                                    className="px-1 py-2.5 border-b border-r text-center font-bold text-amber-700" 
                                    title="Số Lượt Đi Muộn"
                                >
                                    Muộn
                                </th>
                                <th 
                                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', width: '50px' }}
                                    className="px-1 py-2.5 border-b border-r text-center font-bold text-purple-700" 
                                    title="Số Ngày Nghỉ Phép / Chế Độ"
                                >
                                    Phép
                                </th>
                                <th 
                                    style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', width: '50px' }}
                                    className="px-1 py-2.5 border-b border-r text-center font-bold text-rose-700" 
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
                                            className="p-1 border-b border-r text-center w-9.5 transition-colors"
                                        >
                                            <div className="flex flex-col items-center">
                                                <span className={`font-black text-xs ${isToday ? 'text-white' : ''}`}>{day}</span>
                                                <span className={`text-[9px] font-bold uppercase ${isToday ? 'text-emerald-100' : 'opacity-70'}`}>
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
                                        className="px-4 py-2 border-b border-r sticky left-0 z-20 group-hover:bg-slate-50 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.04)]"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-[11px] shrink-0 border border-emerald-200">
                                                {row.user.name ? row.user.name.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <button 
                                                    type="button"
                                                    onClick={() => setInspectedUserRow(row)}
                                                    className="font-bold text-slate-900 hover:text-emerald-700 text-left truncate text-xs cursor-pointer transition-colors"
                                                    title="Bấm để xem lịch sử chi tiết nhân viên này"
                                                >
                                                    {row.user.name || 'Người dùng vô danh'}
                                                </button>
                                                <span className="text-[10px] text-slate-400 font-normal truncate">
                                                    {row.user.email}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Summary columns */}
                                    <td 
                                        style={{ backgroundColor: '#f0fdf4', borderColor: '#e2e8f0', color: '#047857' }}
                                        className="px-1 py-2 border-b border-r text-center font-black font-mono text-xs"
                                    >
                                        {row.totalPresent + row.totalLate + (row.totalHalfDay * 0.5)}
                                    </td>

                                    <td 
                                        style={{ backgroundColor: row.totalLate > 0 ? '#fffbeb' : '#ffffff', borderColor: '#e2e8f0', color: row.totalLate > 0 ? '#b45309' : '#94a3b8' }}
                                        className="px-1 py-2 border-b border-r text-center font-bold font-mono text-xs"
                                    >
                                        {row.totalLate}
                                    </td>

                                    <td 
                                        style={{ backgroundColor: row.totalLeave > 0 ? '#faf5ff' : '#ffffff', borderColor: '#e2e8f0', color: row.totalLeave > 0 ? '#7e22ce' : '#94a3b8' }}
                                        className="px-1 py-2 border-b border-r text-center font-bold font-mono text-xs"
                                    >
                                        {row.totalLeave}
                                    </td>

                                    <td 
                                        style={{ backgroundColor: row.totalAbsent > 0 ? '#fff1f2' : '#ffffff', borderColor: '#e2e8f0', color: row.totalAbsent > 0 ? '#be123c' : '#94a3b8' }}
                                        className="px-1 py-2 border-b border-r text-center font-bold font-mono text-xs"
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
                                        let cellBg = isWeekend ? '#fff1f280' : 'transparent';
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
                                                className={`p-1 border-b border-r text-center font-black text-[11px] cursor-pointer hover:scale-110 hover:shadow-xs transition-all ${isToday ? 'ring-1 ring-emerald-500' : ''}`}
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
                                    <td colSpan={5 + daysInMonth} className="p-16 text-center text-slate-500 bg-slate-50/50">
                                        <div className="flex flex-col items-center justify-center">
                                            <Users className="w-10 h-10 text-slate-300 mb-2" strokeWidth={1.5} />
                                            <h3 className="text-sm font-bold text-slate-700">Không tìm thấy nhân sự nào</h3>
                                            <p className="text-xs text-slate-400 mt-0.5">Vui lòng điều chỉnh lại bộ lọc nhân sự hoặc tìm kiếm.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend & Summary Guide */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Info size={14} className="text-slate-400" />
                        Chú Thích Ký Hiệu & Mã Trạng Thái Chấm Công
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Bấm vào bất kỳ ô nào trên bảng để xem chi tiết giờ và GPS</span>
                </div>

                <div className="flex flex-wrap gap-2.5 items-center">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <div 
                            key={key}
                            style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.text }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold shadow-2xs"
                        >
                            <span className="w-5 h-5 rounded-md flex items-center justify-center font-black text-[11px] bg-white border border-current">
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
                maxWidth="560px"
            >
                {selectedCell && (
                    <div className="space-y-4 text-xs">
                        {/* User Header */}
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                                {selectedCell.user.name ? selectedCell.user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm">{selectedCell.user.name || 'Người dùng vô danh'}</h4>
                                <p className="text-slate-500 text-[11px]">{selectedCell.user.email} • {selectedCell.user.role || 'Nhân sự'}</p>
                            </div>
                        </div>

                        {/* Status Card */}
                        {selectedCell.record ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                        <span className="text-[10.5px] text-slate-400 font-bold uppercase">Trạng Thái</span>
                                        <div>
                                            {(() => {
                                                const cfg = STATUS_CONFIG[selectedCell.record.status];
                                                return cfg ? (
                                                    <span 
                                                        style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-bold text-xs"
                                                    >
                                                        {cfg.code} - {cfg.label}
                                                    </span>
                                                ) : <span className="font-bold">{selectedCell.record.status}</span>;
                                            })()}
                                        </div>
                                    </div>

                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                        <span className="text-[10.5px] text-slate-400 font-bold uppercase">Thời Gian Làm</span>
                                        <p className="font-black text-slate-900 text-sm">
                                            {selectedCell.record.totalWorkMinutes 
                                                ? `${Math.floor(selectedCell.record.totalWorkMinutes / 60)}h ${selectedCell.record.totalWorkMinutes % 60}m` 
                                                : '-'}
                                        </p>
                                    </div>
                                </div>

                                {/* Check-In & Check-Out Times */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                                        <span className="text-[10.5px] font-bold uppercase text-emerald-800 flex items-center gap-1">
                                            <Clock size={12} /> Giờ Check-In:
                                        </span>
                                        <p className="font-bold text-emerald-900 text-sm">
                                            {selectedCell.record.checkInTime 
                                                ? new Date(selectedCell.record.checkInTime).toLocaleTimeString('vi-VN') 
                                                : 'Chưa Check-In'}
                                        </p>
                                        {selectedCell.record.checkInLocation && (
                                            <p className="text-[10.5px] text-emerald-700 flex items-center gap-1 mt-1 truncate" title={selectedCell.record.checkInLocation}>
                                                <MapPin size={11} className="shrink-0" /> {selectedCell.record.checkInLocation}
                                            </p>
                                        )}
                                    </div>

                                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1">
                                        <span className="text-[10.5px] font-bold uppercase text-indigo-800 flex items-center gap-1">
                                            <Clock size={12} /> Giờ Check-Out:
                                        </span>
                                        <p className="font-bold text-indigo-900 text-sm">
                                            {selectedCell.record.checkOutTime 
                                                ? new Date(selectedCell.record.checkOutTime).toLocaleTimeString('vi-VN') 
                                                : 'Chưa Check-Out'}
                                        </p>
                                        {selectedCell.record.checkOutLocation && (
                                            <p className="text-[10.5px] text-indigo-700 flex items-center gap-1 mt-1 truncate" title={selectedCell.record.checkOutLocation}>
                                                <MapPin size={11} className="shrink-0" /> {selectedCell.record.checkOutLocation}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Notes if any */}
                                {selectedCell.record.notes && (
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <span className="font-bold text-slate-700 block mb-0.5">Ghi chú:</span>
                                        <p className="text-slate-600 italic leading-relaxed">{selectedCell.record.notes}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                                Không có bản ghi chấm công hoặc xin nghỉ nào vào ngày này.
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
                title={`Hồ Sơ Chấm Công: ${inspectedUserRow?.user.name || 'Nhân sự'}`}
                maxWidth="680px"
            >
                {inspectedUserRow && (
                    <div className="space-y-4 text-xs">
                        {/* Summary Bar */}
                        <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                            <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Tổng công</span>
                                <p className="text-base font-black text-emerald-600">{inspectedUserRow.totalPresent + inspectedUserRow.totalLate}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Đi muộn</span>
                                <p className="text-base font-black text-amber-600">{inspectedUserRow.totalLate}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Nghỉ phép</span>
                                <p className="text-base font-black text-purple-600">{inspectedUserRow.totalLeave}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Vắng mặt</span>
                                <p className="text-base font-black text-rose-600">{inspectedUserRow.totalAbsent}</p>
                            </div>
                        </div>

                        {/* Day list table */}
                        <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10.5px] uppercase font-bold text-slate-500 border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2">Ngày</th>
                                        <th className="px-3 py-2 text-center">Trạng thái</th>
                                        <th className="px-3 py-2">Giờ Vào - Giờ Ra</th>
                                        <th className="px-3 py-2">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {daysArray.map(day => {
                                        const rec = inspectedUserRow.records[day];
                                        const date = new Date(year, month - 1, day);
                                        const dayName = date.toLocaleDateString('vi-VN', { weekday: 'short' });
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                                        return (
                                            <tr key={day} className={`hover:bg-slate-50 ${isWeekend ? 'bg-slate-50/50' : ''}`}>
                                                <td className="px-3 py-2 font-bold text-slate-800">
                                                    Ngày {day} ({dayName})
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {rec ? (
                                                        (() => {
                                                            const cfg = STATUS_CONFIG[rec.status];
                                                            return cfg ? (
                                                                <span 
                                                                    style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
                                                                    className="px-2 py-0.5 rounded-md border font-bold text-[10.5px]"
                                                                >
                                                                    {cfg.label}
                                                                </span>
                                                            ) : <span className="font-semibold">{rec.status}</span>;
                                                        })()
                                                    ) : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="px-3 py-2 text-slate-600">
                                                    {rec?.checkInTime ? (
                                                        <span>
                                                            {new Date(rec.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                            {rec.checkOutTime ? ` → ${new Date(rec.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ' (Chưa checkout)'}
                                                        </span>
                                                    ) : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="px-3 py-2 text-slate-500 italic max-w-[180px] truncate" title={rec?.notes || ''}>
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
