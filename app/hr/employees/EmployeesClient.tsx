'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { toast } from '@/app/components/providers/ToastProvider';
import { AvatarImage } from '@/app/components/ui/AvatarImage';
import EmployeeDetailModal from './EmployeeDetailModal';
import { formatVND } from '@/lib/vietnameseCurrency';
import { formatDate } from '@/lib/utils/formatters';
import * as XLSX from 'xlsx';
import {
    Search,
    Users,
    UserCheck,
    UserX,
    UserPlus,
    Phone,
    Mail,
    Building2,
    Calendar,
    FileSpreadsheet,
    LayoutGrid,
    List,
    Eye,
    X,
    Plus,
    Briefcase,
    FileText
} from 'lucide-react';

interface EmployeeItem {
    id: string;
    name: string | null;
    email: string;
    role: string;
    avatar?: string | null;
    extension?: string | null;
    createdAt?: string | Date;
    permissionGroup?: { name: string } | null;
    employeeProfile: any;
    laborContracts: any[];
}

export default function EmployeesClient({ initialData }: { initialData: EmployeeItem[] }) {
    const [employees, setEmployees] = useState<EmployeeItem[]>(initialData);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

    // Lọc danh sách nhân viên
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const profile = emp.employeeProfile || {};
            const code = profile.employeeCode || `NV-${emp.id.slice(-4).toUpperCase()}`;
            const phone = profile.phoneNumber || '';
            const dept = profile.department || (emp as any).department || '';
            const position = profile.position || '';
            const status = profile.employmentStatus || 'OFFICIAL';

            const q = searchTerm.toLowerCase().trim();
            const matchesSearch =
                !q ||
                (emp.name || '').toLowerCase().includes(q) ||
                emp.email.toLowerCase().includes(q) ||
                code.toLowerCase().includes(q) ||
                dept.toLowerCase().includes(q) ||
                position.toLowerCase().includes(q) ||
                phone.includes(q);

            const matchesDept = departmentFilter === 'ALL' || dept === departmentFilter;
            const matchesStatus = statusFilter === 'ALL' || status === statusFilter;

            return matchesSearch && matchesDept && matchesStatus;
        });
    }, [employees, searchTerm, departmentFilter, statusFilter]);

    // Danh sách phòng ban duy nhất
    const departments = useMemo(() => {
        const set = new Set<string>();
        employees.forEach(e => {
            const d = e.employeeProfile?.department || (e as any).department;
            if (d) set.add(d);
        });
        return Array.from(set);
    }, [employees]);

    // Thống kê KPI nhân sự
    const kpi = useMemo(() => {
        const total = employees.length;
        let official = 0;
        let probation = 0;
        let resigned = 0;
        let totalBasePayroll = 0;

        employees.forEach(e => {
            const status = e.employeeProfile?.employmentStatus || 'OFFICIAL';
            if (status === 'OFFICIAL') official++;
            else if (status === 'PROBATION' || status === 'INTERN') probation++;
            else if (status === 'RESIGNED') resigned++;
            else official++;

            totalBasePayroll += (e.employeeProfile?.baseSalary || 0);
        });

        return { total, official, probation, resigned, totalBasePayroll };
    }, [employees]);

    // Xuất file Excel danh sách nhân sự
    const handleExportExcel = () => {
        if (filteredEmployees.length === 0) {
            toast.info('Không có dữ liệu nhân sự để xuất file.');
            return;
        }

        const rows = filteredEmployees.map((emp, index) => {
            const p = emp.employeeProfile || {};
            return {
                'STT': index + 1,
                'Mã NV': p.employeeCode || `NV-${emp.id.slice(-4).toUpperCase()}`,
                'Họ và Tên': emp.name || '',
                'Email Công Ty': emp.email,
                'Phòng Ban': p.department || 'Chưa phân ban',
                'Chức Vụ': p.position || 'Nhân viên',
                'Trạng Thái': p.employmentStatus === 'PROBATION' ? 'Thử việc' : p.employmentStatus === 'RESIGNED' ? 'Đã thôi việc' : 'Chính thức',
                'Lương Cơ Bản': p.baseSalary || 0,
                'Lương Đóng BHXH': p.insuranceSalary || 0,
                'Phụ Cấp': p.allowances || 0,
                'Số CCCD': p.identityNumber || '',
                'Ngày Sinh': p.dob ? new Date(p.dob).toLocaleDateString('vi-VN') : '',
                'Giới Tính': p.gender === 'MALE' ? 'Nam' : p.gender === 'FEMALE' ? 'Nữ' : 'Khác',
                'Điện Thoại': p.phoneNumber || '',
                'Email Cá Nhân': p.personalEmail || '',
                'Địa Chỉ Thường Trú': p.permanentAddress || '',
                'Nơi Ở Hiện Tại': p.currentAddress || '',
                'Số Tài Khoản': p.bankAccount || '',
                'Ngân Hàng': p.bankName || '',
                'Chi Nhánh': p.bankBranch || '',
                'Mã Số Thuế': p.taxCode || '',
                'Số Sổ BHXH': p.socialInsuranceNumber || '',
                'Mã Thẻ BHYT': p.healthInsuranceCardNumber || '',
                'Trình Độ': p.educationLevel || '',
                'Chuyên Ngành': p.major || '',
                'Trường Đào Tạo': p.schoolName || '',
                'Ngày Nhận Việc': p.startDate ? new Date(p.startDate).toLocaleDateString('vi-VN') : '',
                'Số Lượng HĐ': emp.laborContracts?.length || 0
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Ho_So_Nhan_Su');
        XLSX.writeFile(workbook, `Danh_Sach_Ho_So_Nhan_Su_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const getStatusBadgeStyle = (status: string) => {
        if (status === 'OFFICIAL') {
            return {
                bg: '#ecfdf5',
                text: '#047857',
                border: '#a7f3d0',
                dot: '#10b981',
                label: 'Chính thức'
            };
        }
        if (status === 'PROBATION' || status === 'INTERN') {
            return {
                bg: '#fffbeb',
                text: '#b45309',
                border: '#fde68a',
                dot: '#f59e0b',
                label: status === 'INTERN' ? 'Thực tập' : 'Thử việc'
            };
        }
        return {
            bg: '#fff1f2',
            text: '#be123c',
            border: '#fecdd3',
            dot: '#f43f5e',
            label: 'Đã thôi việc'
        };
    };

    return (
        <div className="space-y-4">
            {/* 1. Page Header (Đồng bộ chuẩn ERP) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            QUẢN TRỊ NHÂN SỰ (HRM)
                        </span>
                        <span className="text-slate-300 text-xs">|</span>
                        <span className="text-xs font-semibold text-slate-500">Sơ yếu lý lịch, Lương, BHXH &amp; Hợp đồng lao động</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 m-0">
                            Quản Lý Hồ Sơ Nhân Sự
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 tabular-nums shadow-2xs">
                            {employees.length}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Xuất Excel */}
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-1.5 h-[36px] px-3.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                    >
                        <FileSpreadsheet size={15} className="text-emerald-600" />
                        <span>Xuất Excel Hồ Sơ</span>
                    </button>

                    {/* Chuyển View Mode */}
                    <div className="inline-flex items-center bg-white p-1 rounded-lg border border-slate-300 h-[36px] shadow-2xs">
                        <button
                            type="button"
                            onClick={() => setViewMode('GRID')}
                            className={`px-2.5 h-full rounded-md inline-flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                                viewMode === 'GRID'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="Xem dạng Lưới Thẻ"
                        >
                            <LayoutGrid size={14} />
                            <span className="hidden sm:inline">Thẻ</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('TABLE')}
                            className={`px-2.5 h-full rounded-md inline-flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                                viewMode === 'TABLE'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="Xem dạng Bảng Danh Sách"
                        >
                            <List size={14} />
                            <span className="hidden sm:inline">Bảng</span>
                        </button>
                    </div>

                    <Link
                        href="/users"
                        style={{ backgroundColor: '#05A613' }}
                        className="inline-flex items-center gap-1.5 h-[36px] px-4 text-xs font-bold text-white rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all"
                    >
                        <Plus size={15} className="stroke-[3]" />
                        <span>Thêm Nhân Sự</span>
                    </Link>
                </div>
            </div>

            {/* 2. KPI Filter Cards (Đồng bộ chuẩn ERP, nhấp để lọc nhanh) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Card 1: Tổng Nhân Sự */}
                <div
                    onClick={() => setStatusFilter('ALL')}
                    style={statusFilter === 'ALL' ? { borderColor: '#7c3aed', backgroundColor: '#faf5ff', boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.15)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: '#7c3aed' }}
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <Users size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight m-0">Tổng nhân sự</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Quỹ lương CB: <strong className="text-slate-700">{formatVND(kpi.totalBasePayroll)}</strong>
                                </p>
                            </div>
                        </div>
                        <span
                            style={statusFilter === 'ALL' ? { color: '#7c3aed' } : {}}
                            className="text-lg font-extrabold tabular-nums text-slate-800"
                        >
                            {kpi.total}
                        </span>
                    </div>
                </div>

                {/* Card 2: Chính Thức */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'OFFICIAL' ? 'ALL' : 'OFFICIAL')}
                    style={statusFilter === 'OFFICIAL' ? { borderColor: '#05A613', backgroundColor: '#ecfdf5', boxShadow: '0 0 0 2px rgba(5, 166, 19, 0.2)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: '#05A613' }}
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <UserCheck size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight m-0">Nhân sự chính thức</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Tỷ lệ chính thức: <strong className="text-emerald-700">{kpi.total ? Math.round((kpi.official / kpi.total) * 100) : 0}%</strong>
                                </p>
                            </div>
                        </div>
                        <span
                            style={statusFilter === 'OFFICIAL' ? { color: '#05A613' } : {}}
                            className="text-lg font-extrabold tabular-nums text-slate-800"
                        >
                            {kpi.official}
                        </span>
                    </div>
                </div>

                {/* Card 3: Thử Việc / Học Việc */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'PROBATION' ? 'ALL' : 'PROBATION')}
                    style={statusFilter === 'PROBATION' ? { borderColor: '#d97706', backgroundColor: '#fffbeb', boxShadow: '0 0 0 2px rgba(217, 119, 6, 0.15)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: '#d97706' }}
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <UserPlus size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight m-0">Thử việc / Học việc</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Đang trong thời gian thử việc</p>
                            </div>
                        </div>
                        <span
                            style={statusFilter === 'PROBATION' ? { color: '#d97706' } : {}}
                            className="text-lg font-extrabold tabular-nums text-slate-800"
                        >
                            {kpi.probation}
                        </span>
                    </div>
                </div>

                {/* Card 4: Đã Thôi Việc */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'RESIGNED' ? 'ALL' : 'RESIGNED')}
                    style={statusFilter === 'RESIGNED' ? { borderColor: '#e11d48', backgroundColor: '#fff1f2', boxShadow: '0 0 0 2px rgba(225, 29, 72, 0.15)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: '#e11d48' }}
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <UserX size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight m-0">Đã thôi việc</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Hồ sơ nhân sự lưu trữ</p>
                            </div>
                        </div>
                        <span
                            style={statusFilter === 'RESIGNED' ? { color: '#e11d48' } : {}}
                            className="text-lg font-extrabold tabular-nums text-slate-800"
                        >
                            {kpi.resigned}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Search & Filter Toolbar (Không dư viền, không đè icon) */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex items-center gap-2.5 flex-wrap flex-1">
                    {/* Search Input */}
                    <div className="flex items-center w-full sm:w-[360px] h-[36px] bg-white border border-slate-300 rounded-lg px-3 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600/20 transition-all shadow-2xs">
                        <Search size={14} className="text-slate-400 shrink-0 mr-2" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên, email, mã NV, phòng ban, SĐT..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            className="w-full h-full text-xs bg-transparent border-none outline-none text-slate-800 placeholder-slate-400"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer shrink-0 ml-1"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Filter Phòng Ban (Standalone select - 1 viền chuẩn) */}
                    <select
                        value={departmentFilter}
                        onChange={e => setDepartmentFilter(e.target.value)}
                        className="h-[36px] px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-600 transition-all cursor-pointer shadow-2xs"
                    >
                        <option value="ALL">Tất cả phòng ban ({departments.length})</option>
                        {departments.map((d: any) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>

                    {/* Filter Trạng Thái (Standalone select - 1 viền chuẩn) */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="h-[36px] px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-600 transition-all cursor-pointer shadow-2xs"
                    >
                        <option value="ALL">Tất cả trạng thái làm việc</option>
                        <option value="OFFICIAL">Chính thức ({kpi.official})</option>
                        <option value="PROBATION">Thử việc ({kpi.probation})</option>
                        <option value="RESIGNED">Đã thôi việc ({kpi.resigned})</option>
                    </select>

                    {(searchTerm || departmentFilter !== 'ALL' || statusFilter !== 'ALL') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setDepartmentFilter('ALL');
                                setStatusFilter('ALL');
                            }}
                            className="h-[36px] px-3 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                        >
                            Xóa lọc
                        </button>
                    )}
                </div>

                <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
                    Hiển thị <span className="text-slate-900 font-bold tabular-nums">{filteredEmployees.length}</span> / {employees.length} nhân sự
                </span>
            </div>

            {/* ======================================================== */}
            {/* VIEW 1: GRID CARDS (LƯỚI THẺ NHÂN SỰ CHUYÊN NGHIỆP) */}
            {/* ======================================================== */}
            {viewMode === 'GRID' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredEmployees.map((emp) => {
                        const p = emp.employeeProfile || {};
                        const status = p.employmentStatus || 'OFFICIAL';
                        const code = p.employeeCode || `NV-${emp.id.slice(-4).toUpperCase()}`;
                        const badge = getStatusBadgeStyle(status);
                        const deptName = p.department || (emp as any).department || 'Chưa phân ban';
                        const posName = p.position || (emp.role === 'ADMIN' ? 'Quản trị hệ thống' : 'Nhân viên');

                        return (
                            <div
                                key={emp.id}
                                onClick={() => setSelectedEmployee(emp)}
                                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-emerald-500/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between overflow-hidden"
                            >
                                <div className="p-4">
                                    {/* Top Row: Code & Status Badge */}
                                    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 tabular-nums">
                                            {code}
                                        </span>
                                        <span
                                            style={{
                                                backgroundColor: badge.bg,
                                                color: badge.text,
                                                borderColor: badge.border
                                            }}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                                        >
                                            <span
                                                style={{ backgroundColor: badge.dot }}
                                                className="w-1.5 h-1.5 rounded-full"
                                            />
                                            <span>{badge.label}</span>
                                        </span>
                                    </div>

                                    {/* Avatar & Name */}
                                    <div className="flex items-center gap-3 mb-3.5">
                                        <AvatarImage
                                            src={emp.avatar?.startsWith('http') ? emp.avatar : emp.avatar ? `/${emp.avatar.replace(/^\//, '')}` : null}
                                            name={emp.name || emp.email}
                                            size={44}
                                            className="border border-slate-200 shrink-0 shadow-2xs"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight truncate group-hover:text-emerald-700 transition-colors m-0">
                                                {emp.name || 'Chưa cập nhật'}
                                            </h3>
                                            <p className="text-[11px] text-emerald-700 font-semibold truncate mt-0.5 m-0">
                                                {posName}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Details List */}
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Building2 size={13} className="text-slate-400 shrink-0" />
                                            <span className="truncate font-medium">{deptName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Phone size={13} className="text-slate-400 shrink-0" />
                                            <span className="truncate tabular-nums">
                                                {p.phoneNumber || <span className="text-slate-400 italic">Chưa cập nhật SĐT</span>}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Mail size={13} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{emp.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                                            <Calendar size={13} className="text-slate-400 shrink-0" />
                                            <span>
                                                Ngày vào: <strong className="text-slate-700 font-semibold">{p.startDate ? formatDate(p.startDate) : (emp.createdAt ? formatDate(emp.createdAt) : '--')}</strong>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Summary Bar */}
                                <div className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Lương cơ bản</span>
                                        <span className="font-bold text-emerald-700 tabular-nums text-xs mt-0.5 block truncate">
                                            {p.baseSalary ? formatVND(p.baseSalary) : '0 ₫'}
                                        </span>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex flex-col justify-between">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Hợp đồng LĐ</span>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className="font-bold text-slate-800 tabular-nums text-xs">
                                                {emp.laborContracts?.length || 0} HĐ
                                            </span>
                                            <span className="text-[11px] font-semibold text-emerald-600 group-hover:underline">
                                                Chi tiết →
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredEmployees.length === 0 && (
                        <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-xl">
                            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2.5" strokeWidth={1.5} />
                            <h3 className="text-xs font-bold text-slate-700 m-0">Không tìm thấy hồ sơ nhân sự phù hợp</h3>
                            <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc phòng ban / trạng thái.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 2: TABLE VIEW (BẢNG DANH SÁCH CHUẨN ERP) */}
            {/* ======================================================== */}
            {viewMode === 'TABLE' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-slate-50/90 border-b border-slate-200">
                                    <th className="py-3 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center w-12">STT</th>
                                    <th className="py-3 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nhân sự &amp; Mã NV</th>
                                    <th className="py-3 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Phòng ban &amp; Chức vụ</th>
                                    <th className="py-3 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Liên hệ (SĐT / Email)</th>
                                    <th className="py-3 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">Ngày nhận việc</th>
                                    <th className="py-3 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">Lương cơ bản</th>
                                    <th className="py-3 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">Hợp đồng</th>
                                    <th className="py-3 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">Trạng thái</th>
                                    <th className="py-3 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right w-24">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/70 text-xs">
                                {filteredEmployees.map((emp, index) => {
                                    const p = emp.employeeProfile || {};
                                    const status = p.employmentStatus || 'OFFICIAL';
                                    const code = p.employeeCode || `NV-${emp.id.slice(-4).toUpperCase()}`;
                                    const badge = getStatusBadgeStyle(status);

                                    return (
                                        <tr
                                            key={emp.id}
                                            onClick={() => setSelectedEmployee(emp)}
                                            className="hover:bg-emerald-50/35 transition-colors cursor-pointer group"
                                        >
                                            <td className="py-2.5 px-3.5 text-center text-slate-400 font-semibold tabular-nums">
                                                {index + 1}
                                            </td>
                                            <td className="py-2.5 px-3.5">
                                                <div className="flex items-center gap-3">
                                                    <AvatarImage
                                                        src={emp.avatar?.startsWith('http') ? emp.avatar : emp.avatar ? `/${emp.avatar.replace(/^\//, '')}` : null}
                                                        name={emp.name || emp.email}
                                                        size={34}
                                                        className="border border-slate-200 shrink-0 shadow-2xs"
                                                    />
                                                    <div>
                                                        <div className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                                                            {emp.name || '---'}
                                                        </div>
                                                        <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/80 mt-0.5 tabular-nums">
                                                            {code}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3.5">
                                                <div className="font-semibold text-slate-800">
                                                    {p.department || (emp as any).department || 'Chưa phân ban'}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-0.5">
                                                    {p.position || (emp.role === 'ADMIN' ? 'Quản trị hệ thống' : 'Nhân viên')}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3.5">
                                                <div className="font-semibold text-slate-700 tabular-nums">
                                                    {p.phoneNumber || <span className="text-slate-400 font-normal italic">Chưa có SĐT</span>}
                                                </div>
                                                <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                                    {emp.email}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3.5 text-center text-slate-600 tabular-nums">
                                                {p.startDate ? formatDate(p.startDate) : (emp.createdAt ? formatDate(emp.createdAt) : '--')}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-right font-bold text-emerald-700 tabular-nums">
                                                {p.baseSalary ? formatVND(p.baseSalary) : '0 ₫'}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-center">
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 tabular-nums">
                                                    {emp.laborContracts?.length || 0} HĐ
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3.5 text-center">
                                                <span
                                                    style={{
                                                        backgroundColor: badge.bg,
                                                        color: badge.text,
                                                        borderColor: badge.border
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                                                >
                                                    <span style={{ backgroundColor: badge.dot }} className="w-1.5 h-1.5 rounded-full" />
                                                    <span>{badge.label}</span>
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEmployee(emp);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                                                    title="Mở xem & cập nhật hồ sơ chi tiết"
                                                >
                                                    <Eye size={13} />
                                                    <span>Hồ sơ</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredEmployees.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="py-16 text-center text-xs font-semibold text-slate-400">
                                            Không có dữ liệu nhân sự phù hợp.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL CHI TIẾT HỒ SƠ */}
            {selectedEmployee && (
                <EmployeeDetailModal
                    employee={selectedEmployee}
                    isOpen={!!selectedEmployee}
                    onClose={() => setSelectedEmployee(null)}
                    onUpdated={(updatedEmp) => {
                        setEmployees(employees.map(e => e.id === updatedEmp.id ? updatedEmp : e));
                        setSelectedEmployee(updatedEmp);
                    }}
                />
            )}
        </div>
    );
}
