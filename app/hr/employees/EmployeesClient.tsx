'use client';

import React, { useState, useMemo } from 'react';
import { 
    Search, UserCircle, Briefcase, DollarSign, Wallet, 
    Users, UserCheck, UserX, UserPlus, Phone, Mail, 
    Building2, MapPin, Calendar, FileText, FileSpreadsheet, 
    LayoutGrid, List, ChevronRight, Eye, ShieldCheck, 
    Sparkles, Filter, ChevronDown
} from 'lucide-react';
import EmployeeDetailModal from './EmployeeDetailModal';
import { formatVND } from '@/lib/vietnameseCurrency';
import * as XLSX from 'xlsx';

interface EmployeeItem {
    id: string;
    name: string | null;
    email: string;
    role: string;
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
            const code = profile.employeeCode || '';
            const phone = profile.phoneNumber || '';
            const dept = profile.department || (emp as any).department || '';
            const status = profile.employmentStatus || 'OFFICIAL';

            const matchesSearch = 
                emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                phone.includes(searchTerm);

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
        let total = employees.length;
        let official = 0;
        let probation = 0;
        let resigned = 0;
        let totalBasePayroll = 0;

        employees.forEach(e => {
            const status = e.employeeProfile?.employmentStatus || 'OFFICIAL';
            if (status === 'OFFICIAL') official++;
            else if (status === 'PROBATION') probation++;
            else if (status === 'RESIGNED') resigned++;
            else official++;

            totalBasePayroll += (e.employeeProfile?.baseSalary || 0);
        });

        return { total, official, probation, resigned, totalBasePayroll };
    }, [employees]);

    // Helper tạo avatar chữ cái
    const getInitials = (name?: string | null) => {
        if (!name) return 'NV';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Xuất file Excel danh sách nhân sự
    const handleExportExcel = () => {
        if (filteredEmployees.length === 0) {
            alert('Không có dữ liệu nhân sự để xuất file.');
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

    return (
        <div className="space-y-6">
            {/* TOP HEADER */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                        <Users size={24} className="stroke-[2.5]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                                Quản Lý Hồ Sơ Nhân Sự (HR Profiles)
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Enterprise HRM
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2">
                            <span>Tổng số: <strong className="text-indigo-700 font-bold">{employees.length}</strong> nhân sự</span>
                            <span className="text-slate-300">•</span>
                            <span>Đầy đủ Sơ yếu lý lịch, CCCD, Lương, BHXH và Hợp đồng</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Xuất Excel */}
                    <button 
                        onClick={handleExportExcel}
                        className="px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 transition-all shadow-xs"
                    >
                        <FileSpreadsheet size={16} className="text-emerald-600" />
                        <span>Xuất Excel Hồ Sơ</span>
                    </button>

                    {/* Chuyển View Mode */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button 
                            onClick={() => setViewMode('GRID')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                            title="Xem dạng Lưới Thẻ"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button 
                            onClick={() => setViewMode('TABLE')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                            title="Xem dạng Bảng Danh Sách"
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 4 CARD KPI DASHBOARD NHÂN SỰ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Nhân Sự</span>
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                            <Users size={18} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                            {kpi.total}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1.5 border-t border-slate-100 pt-2 flex items-center justify-between">
                            <span>Quỹ lương cơ bản:</span>
                            <strong className="text-slate-800 font-mono">{formatVND(kpi.totalBasePayroll)}</strong>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Chính Thức</span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center font-bold">
                            <UserCheck size={18} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                            {kpi.official}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1.5 border-t border-slate-100 pt-2 flex items-center justify-between">
                            <span>Tỷ lệ chính thức:</span>
                            <strong className="text-emerald-700 font-mono">{kpi.total ? Math.round((kpi.official / kpi.total) * 100) : 0}%</strong>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Thử Việc / Học Việc</span>
                        <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center font-bold">
                            <UserPlus size={18} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-amber-600 font-mono tracking-tight">
                            {kpi.probation}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1.5 border-t border-slate-100 pt-2 flex items-center justify-between">
                            <span>Nhân sự đang thử việc:</span>
                            <strong className="text-amber-700 font-mono">{kpi.probation} người</strong>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã Thôi Việc</span>
                        <div className="w-9 h-9 rounded-xl bg-rose-100/80 text-rose-700 flex items-center justify-center font-bold">
                            <UserX size={18} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-slate-600 font-mono tracking-tight">
                            {kpi.resigned}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1.5 border-t border-slate-100 pt-2 flex items-center justify-between">
                            <span>Hồ sơ lưu trữ:</span>
                            <strong className="text-slate-700 font-mono">{kpi.resigned} người</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* TOOLBAR FILTER */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3.5">
                <div className="flex items-center gap-3 flex-wrap flex-1">
                    {/* Search Bar */}
                    <div className="relative min-w-[280px] max-w-md flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Tìm theo tên, email, mã NV, số điện thoại..." 
                            className="w-full h-10 pl-10 pr-4 text-xs bg-slate-50/70 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filter Phòng Ban */}
                    <div className="relative h-10 flex items-center bg-white px-3 rounded-xl border border-slate-300 shadow-2xs hover:border-slate-400 transition-colors">
                        <Building2 size={15} className="text-slate-400 mr-2 shrink-0" />
                        <select 
                            value={departmentFilter}
                            onChange={e => setDepartmentFilter(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-4 appearance-none"
                        >
                            <option value="ALL">Tất cả phòng ban ({departments.length})</option>
                            {departments.map((d: any) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown size={14} className="text-slate-400 pointer-events-none absolute right-2.5" />
                    </div>

                    {/* Filter Trạng Thái */}
                    <div className="relative h-10 flex items-center bg-white px-3 rounded-xl border border-slate-300 shadow-2xs hover:border-slate-400 transition-colors">
                        <Filter size={15} className="text-slate-400 mr-2 shrink-0" />
                        <select 
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-4 appearance-none"
                        >
                            <option value="ALL">Tất cả trạng thái làm việc</option>
                            <option value="OFFICIAL">Chính thức ({kpi.official})</option>
                            <option value="PROBATION">Thử việc ({kpi.probation})</option>
                            <option value="RESIGNED">Đã thôi việc ({kpi.resigned})</option>
                        </select>
                        <ChevronDown size={14} className="text-slate-400 pointer-events-none absolute right-2.5" />
                    </div>
                </div>

                <div className="text-xs font-bold text-slate-500">
                    Hiển thị <strong>{filteredEmployees.length}</strong> / {employees.length} nhân sự
                </div>
            </div>

            {/* ======================================================== */}
            {/* VIEW 1: GRID CARDS (LƯỚI THẺ CAO CẤP) */}
            {/* ======================================================== */}
            {viewMode === 'GRID' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
                    {filteredEmployees.map((emp) => {
                        const p = emp.employeeProfile || {};
                        const status = p.employmentStatus || 'OFFICIAL';
                        const code = p.employeeCode || `NV-${emp.id.slice(-4).toUpperCase()}`;

                        return (
                            <div 
                                key={emp.id} 
                                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between overflow-hidden"
                                onClick={() => setSelectedEmployee(emp)}
                            >
                                <div className="p-5">
                                    {/* Top Card: Code & Status */}
                                    <div className="flex items-center justify-between mb-3.5">
                                        <span className="text-[11px] font-black font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                            {code}
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${status === 'OFFICIAL' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : status === 'PROBATION' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                            {status === 'OFFICIAL' ? 'Chính thức' : status === 'PROBATION' ? 'Thử việc' : 'Thôi việc'}
                                        </span>
                                    </div>

                                    {/* Avatar & Name */}
                                    <div className="flex items-center gap-3.5 mb-3">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                            {getInitials(emp.name)}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                                                {emp.name || 'Chưa cập nhật'}
                                            </h3>
                                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                                {p.position || 'Nhân viên'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Dept & Info */}
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                                            <Building2 size={13} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{p.department || (emp as any).department || 'Chưa phân ban'}</span>
                                        </div>
                                        {p.phoneNumber && (
                                            <div className="flex items-center gap-1.5 text-slate-600 font-medium font-mono text-[11px]">
                                                <Phone size={13} className="text-slate-400 shrink-0" />
                                                <span>{p.phoneNumber}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                                            <Mail size={13} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{emp.email}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Info Bar */}
                                <div className="bg-slate-50/80 p-3.5 grid grid-cols-2 gap-2 text-xs border-t border-slate-100">
                                    <div className="p-2 rounded-xl bg-white border border-slate-200/80 text-center">
                                        <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Lương Cơ Bản</span>
                                        <span className="font-black text-emerald-700 font-mono text-xs mt-0.5 block truncate">
                                            {p.baseSalary ? formatVND(p.baseSalary) : '0 ₫'}
                                        </span>
                                    </div>
                                    <div className="p-2 rounded-xl bg-white border border-slate-200/80 text-center">
                                        <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Hợp Đồng</span>
                                        <span className="font-bold text-slate-800 font-mono text-xs mt-0.5 block">
                                            {emp.laborContracts?.length || 0} HĐ
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredEmployees.length === 0 && (
                        <div className="col-span-full py-20 text-center text-xs font-semibold text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            Không tìm thấy nhân sự nào phù hợp với bộ lọc tìm kiếm.
                        </div>
                    )}
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 2: TABLE VIEW (BẢNG DANH SÁCH CHUẨN ERP) */}
            {/* ======================================================== */}
            {viewMode === 'TABLE' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1100px]">
                            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[11px] uppercase font-extrabold tracking-wider">
                                <tr>
                                    <th className="px-4 py-3.5 text-center w-12">STT</th>
                                    <th className="px-4 py-3.5 text-left">Mã & Họ Tên Nhân Sự</th>
                                    <th className="px-4 py-3.5 text-left">Phòng Ban & Vị Trí</th>
                                    <th className="px-4 py-3.5 text-center">Trạng Thái</th>
                                    <th className="px-4 py-3.5 text-right">Lương Cơ Bản</th>
                                    <th className="px-4 py-3.5 text-left">Liên Hệ (SĐT / Email)</th>
                                    <th className="px-4 py-3.5 text-center">Hợp Đồng</th>
                                    <th className="px-4 py-3.5 text-center w-20">Chi Tiết</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-xs font-medium">
                                {filteredEmployees.map((emp, index) => {
                                    const p = emp.employeeProfile || {};
                                    const status = p.employmentStatus || 'OFFICIAL';
                                    const code = p.employeeCode || `NV-${emp.id.slice(-4).toUpperCase()}`;

                                    return (
                                        <tr 
                                            key={emp.id} 
                                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                                            onClick={() => setSelectedEmployee(emp)}
                                        >
                                            <td className="px-4 py-3.5 text-center text-slate-400 font-mono">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                                                        {getInitials(emp.name)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-[13px] hover:text-indigo-600 transition-colors">
                                                            {emp.name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 font-mono font-bold mt-0.5">
                                                            {code}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="font-bold text-slate-800">
                                                    {p.department || (emp as any).department || 'Chưa phân ban'}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-0.5">
                                                    {p.position || 'Nhân viên'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${status === 'OFFICIAL' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : status === 'PROBATION' ? 'bg-amber-50 text-amber-800 border border-amber-300' : 'bg-rose-50 text-rose-800 border border-rose-300'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status === 'OFFICIAL' ? 'bg-emerald-500' : status === 'PROBATION' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                                                    {status === 'OFFICIAL' ? 'Chính thức' : status === 'PROBATION' ? 'Thử việc' : 'Thôi việc'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-800 text-[13px]">
                                                {p.baseSalary ? formatVND(p.baseSalary) : '0 ₫'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="font-mono font-bold text-slate-800">
                                                    {p.phoneNumber || '---'}
                                                </div>
                                                <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                                                    {emp.email}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-xs border border-slate-200">
                                                    {emp.laborContracts?.length || 0} HĐ
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <button 
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Mở xem hồ sơ chi tiết"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredEmployees.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-xs font-semibold text-slate-400">
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
