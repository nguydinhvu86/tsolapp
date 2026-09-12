'use client';

import React, { useState, useMemo, useRef } from 'react';
import { 
    Search, Play, CheckCircle, FileEdit, Printer, Download, 
    Trash2, RefreshCw, DollarSign, Users, Award, ShieldAlert,
    CreditCard, ArrowUpRight, ArrowDownRight, Eye, CheckCheck,
    Calendar, Building2, Briefcase, FileSpreadsheet, X, HelpCircle,
    ChevronDown, UserCheck, AlertCircle, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
    generatePayroll, 
    updatePayrollRecord, 
    batchUpdatePayrollStatus, 
    deletePayrollRecord,
    deleteBatchPayroll,
    UpdatePayrollPayload 
} from './actions';
import { Modal } from '@/app/components/ui/Modal';
import { numberToVietnameseWords, formatVND } from '@/lib/vietnameseCurrency';
import * as XLSX from 'xlsx';

interface EmployeeProfile {
    id: string;
    department: string | null;
    position: string | null;
    bankAccount: string | null;
    bankName: string | null;
    taxCode: string | null;
    identityNumber: string | null;
    phoneNumber: string | null;
    baseSalary: number;
    hourlyRate: number;
    startDate: Date | string | null;
}

interface UserInfo {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    employeeProfile: EmployeeProfile | null;
}

interface PayrollRecord {
    id: string;
    userId: string;
    month: number;
    year: number;
    baseSalary: number;
    workDays: number;
    allowances: number;
    commissionBonus: number;
    bonus: number;
    otSalary: number;
    latePenalties: number;
    advancePayment: number;
    insuranceDeduction: number;
    taxDeduction: number;
    deductions: number;
    netSalary: number;
    notes: string | null;
    status: 'DRAFT' | 'APPROVED' | 'PAID' | string;
    paymentDate: Date | string | null;
    paidByUserId: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    user: UserInfo;
}

interface Props {
    initialData: PayrollRecord[];
    currentMonth: number;
    currentYear: number;
    departments: string[];
}

export default function PayrollClient({ initialData, currentMonth, currentYear, departments }: Props) {
    const router = useRouter();
    const printRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Modal state
    const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
    const [viewingSlipRecord, setViewingSlipRecord] = useState<PayrollRecord | null>(null);

    // Form edit state
    const [editForm, setEditForm] = useState<UpdatePayrollPayload>({
        baseSalary: 0,
        workDays: 26,
        allowances: 0,
        commissionBonus: 0,
        bonus: 0,
        otSalary: 0,
        latePenalties: 0,
        advancePayment: 0,
        insuranceDeduction: 0,
        taxDeduction: 0,
        deductions: 0,
        notes: '',
        status: 'DRAFT',
        paymentDate: null
    });

    // Mở modal điều chỉnh
    const handleOpenEdit = (record: PayrollRecord) => {
        setEditingRecord(record);
        setEditForm({
            baseSalary: record.baseSalary || 0,
            workDays: record.workDays || 0,
            allowances: record.allowances || 0,
            commissionBonus: record.commissionBonus || 0,
            bonus: record.bonus || 0,
            otSalary: record.otSalary || 0,
            latePenalties: record.latePenalties || 0,
            advancePayment: record.advancePayment || 0,
            insuranceDeduction: record.insuranceDeduction || 0,
            taxDeduction: record.taxDeduction || 0,
            deductions: record.deductions || 0,
            notes: record.notes || '',
            status: record.status || 'DRAFT',
            paymentDate: record.paymentDate ? new Date(record.paymentDate).toISOString().split('T')[0] : null
        });
    };

    // Tính toán tức thì trong form edit
    const previewCalc = useMemo(() => {
        const base = Number(editForm.baseSalary) || 0;
        const days = Number(editForm.workDays) || 0;
        const allow = Number(editForm.allowances) || 0;
        const comm = Number(editForm.commissionBonus) || 0;
        const bon = Number(editForm.bonus) || 0;
        const ot = Number(editForm.otSalary) || 0;

        const late = Number(editForm.latePenalties) || 0;
        const adv = Number(editForm.advancePayment) || 0;
        const ins = Number(editForm.insuranceDeduction) || 0;
        const tax = Number(editForm.taxDeduction) || 0;
        const ded = Number(editForm.deductions) || 0;

        const actualSalary = Math.round((base / 26) * days);
        const gross = actualSalary + allow + comm + bon + ot;
        const totalDed = late + adv + ins + tax + ded;
        const net = Math.max(0, gross - totalDed);

        return { actualSalary, gross, totalDed, net };
    }, [editForm]);

    // Tạo / Tính toán lại bảng lương
    const handleGenerate = async () => {
        const confirmMsg = `Bạn có chắc muốn tự động tính toán lại dữ liệu lương tháng ${currentMonth}/${currentYear}?\n- Hệ thống sẽ lấy ngày công và phạt muộn từ Chấm công.\n- Các khoản điều chỉnh thủ công (thưởng doanh số, phụ cấp, tạm ứng...) đã nhập sẽ được BẢO TOÀN.`;
        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const res = await generatePayroll(currentMonth, currentYear);
            if (res.success) {
                alert('Đã đồng bộ và tính toán bảng lương thành công!');
                router.refresh();
            } else {
                alert('Lỗi tính bảng lương: ' + res.error);
            }
        } catch (err: any) {
            alert('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Lưu điều chỉnh phiếu lương
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRecord) return;
        setLoading(true);
        try {
            const res = await updatePayrollRecord(editingRecord.id, editForm);
            if (res.success) {
                setEditingRecord(null);
                router.refresh();
            } else {
                alert('Lỗi cập nhật: ' + res.error);
            }
        } catch (err: any) {
            alert('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Cập nhật trạng thái nhanh 1 dòng
    const handleQuickStatus = async (id: string, status: 'APPROVED' | 'PAID' | 'DRAFT') => {
        const actionLabel = status === 'APPROVED' ? 'Duyệt bảng lương' : status === 'PAID' ? 'Xác nhận Đã chi trả lương' : 'Chuyển về Bản nháp';
        if (!confirm(`${actionLabel} cho nhân viên này?`)) return;
        setLoading(true);
        try {
            await batchUpdatePayrollStatus([id], status);
            router.refresh();
        } catch (e: any) {
            alert('Lỗi: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Duyệt / Chi trả hàng loạt
    const handleBatchStatus = async (status: 'APPROVED' | 'PAID') => {
        if (selectedIds.length === 0) {
            alert('Vui lòng tích chọn ít nhất 1 nhân viên.');
            return;
        }
        const actionLabel = status === 'APPROVED' ? 'DUYỆT' : 'XÁC NHẬN CHI TRẢ';
        if (!confirm(`Bạn có chắc chắn muốn ${actionLabel} cho ${selectedIds.length} phiếu lương đã chọn?`)) return;

        setLoading(true);
        try {
            const res = await batchUpdatePayrollStatus(selectedIds, status);
            if (res.success) {
                alert(`Đã cập nhật ${selectedIds.length} phiếu lương thành công!`);
                setSelectedIds([]);
                router.refresh();
            } else {
                alert('Lỗi: ' + res.error);
            }
        } catch (e: any) {
            alert('Lỗi: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Xóa phiếu lương
    const handleDeleteRecord = async (id: string, name: string) => {
        if (!confirm(`Bạn có chắc muốn xóa phiếu lương của "${name}" kỳ này?`)) return;
        setLoading(true);
        try {
            const res = await deletePayrollRecord(id);
            if (res.success) {
                router.refresh();
            } else {
                alert('Lỗi: ' + res.error);
            }
        } catch (e: any) {
            alert('Lỗi: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Xóa hàng loạt
    const handleBatchDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`CẢNH BÁO: Bạn có chắc muốn xóa ${selectedIds.length} phiếu lương đã chọn?`)) return;
        setLoading(true);
        try {
            const res = await deleteBatchPayroll(selectedIds);
            if (res.success) {
                setSelectedIds([]);
                router.refresh();
            } else {
                alert('Lỗi: ' + res.error);
            }
        } catch (e: any) {
            alert('Lỗi: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Lọc dữ liệu hiển thị
    const filteredRecords = useMemo(() => {
        return initialData.filter(record => {
            const matchSearch = 
                record.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.user.employeeProfile?.department?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchDept = selectedDept === 'ALL' || record.user.employeeProfile?.department === selectedDept;
            const matchStatus = selectedStatus === 'ALL' || record.status === selectedStatus;

            return matchSearch && matchDept && matchStatus;
        });
    }, [initialData, searchTerm, selectedDept, selectedStatus]);

    // Thống kê KPI tổng
    const summaryKPI = useMemo(() => {
        let totalBaseSalary = 0;
        let totalGross = 0;
        let totalNet = 0;
        let totalAdvance = 0;
        let totalBonus = 0;
        let totalCommission = 0;
        let totalAllowances = 0;
        let totalOT = 0;
        let totalLate = 0;
        let totalInsurance = 0;
        let totalTax = 0;
        let totalOtherDeduction = 0;
        let totalDeduction = 0;
        let countPaid = 0;
        let countApproved = 0;
        let countDraft = 0;

        filteredRecords.forEach(r => {
            const actualSal = (r.baseSalary / 26) * r.workDays;
            const gross = actualSal + r.allowances + r.commissionBonus + r.bonus + r.otSalary;
            const ded = r.latePenalties + r.advancePayment + r.insuranceDeduction + r.taxDeduction + r.deductions;

            totalBaseSalary += r.baseSalary;
            totalGross += gross;
            totalNet += r.netSalary;
            totalAdvance += r.advancePayment;
            totalBonus += r.bonus;
            totalCommission += r.commissionBonus;
            totalAllowances += r.allowances;
            totalOT += r.otSalary;
            totalLate += r.latePenalties;
            totalInsurance += r.insuranceDeduction;
            totalTax += r.taxDeduction;
            totalOtherDeduction += r.deductions;
            totalDeduction += ded;

            if (r.status === 'PAID') countPaid++;
            else if (r.status === 'APPROVED') countApproved++;
            else countDraft++;
        });

        return {
            totalBaseSalary,
            totalGross,
            totalNet,
            totalAdvance,
            totalBonus: totalBonus + totalCommission + totalOT,
            totalCommission,
            totalAllowances,
            totalOT,
            totalLate,
            totalInsurance,
            totalTax,
            totalOtherDeduction,
            totalDeduction,
            totalEmployees: filteredRecords.length,
            countPaid,
            countApproved,
            countDraft
        };
    }, [filteredRecords]);

    // Xử lý chọn tất cả
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(filteredRecords.map(r => r.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };

    // Xuất file Excel bảng lương chi tiết
    const handleExportExcel = () => {
        if (filteredRecords.length === 0) {
            alert('Không có dữ liệu để xuất file Excel.');
            return;
        }

        const excelRows = filteredRecords.map((r, index) => {
            const actualSal = Math.round((r.baseSalary / 26) * r.workDays);
            const gross = actualSal + r.allowances + r.commissionBonus + r.bonus + r.otSalary;
            const totalDed = r.latePenalties + r.advancePayment + r.insuranceDeduction + r.taxDeduction + r.deductions;

            return {
                'STT': index + 1,
                'Mã NV': r.user.id.slice(-6).toUpperCase(),
                'Họ và Tên': r.user.name || '',
                'Phòng Ban': r.user.employeeProfile?.department || 'Chưa phân ban',
                'Chức Vụ': r.user.employeeProfile?.position || '',
                'Lương Cơ Bản': r.baseSalary,
                'Ngày Công': r.workDays,
                'Lương Theo Công': actualSal,
                'Phụ Cấp': r.allowances,
                'Thưởng Doanh Số': r.commissionBonus,
                'Thưởng Khác/KPI': r.bonus,
                'Lương Tăng Ca OT': r.otSalary,
                'TỔNG THU NHẬP (GROSS)': gross,
                'Tạm Ứng': r.advancePayment,
                'Phạt Đi Muộn': r.latePenalties,
                'Trừ BHXH/BHYT': r.insuranceDeduction,
                'Thuế TNCN': r.taxDeduction,
                'Giảm Trừ Khác': r.deductions,
                'TỔNG GIẢM TRỪ': totalDed,
                'THỰC LĨNH (NET)': r.netSalary,
                'Trạng Thái': r.status === 'PAID' ? 'Đã thanh toán' : r.status === 'APPROVED' ? 'Đã duyệt' : 'Bản nháp',
                'Số Tài Khoản': r.user.employeeProfile?.bankAccount || '',
                'Ngân Hàng': r.user.employeeProfile?.bankName || '',
                'Ghi Chú': r.notes || ''
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Bang_Luong_T${currentMonth}_${currentYear}`);
        
        const colWidths = [
            { wch: 6 },  { wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 16 },
            { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
            { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 18 },
            { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 25 },
        ];
        worksheet['!cols'] = colWidths;

        XLSX.writeFile(workbook, `Bang_Luong_Cong_Ty_Thang_${currentMonth}_${currentYear}.xlsx`);
    };

    // In Phiếu Lương
    const handleTriggerPrint = () => {
        window.print();
    };

    // Helper tạo avatar chữ cái
    const getInitials = (name?: string | null) => {
        if (!name) return 'NV';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <div className="space-y-6">
            {/* CSS In Ấn Định Dạng Chuẩn Doanh Nghiệp */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-payslip-area, #printable-payslip-area * {
                        visibility: visible !important;
                    }
                    #printable-payslip-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        padding: 30px !important;
                        box-sizing: border-box !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            {/* TOP HEADER & ACTION CONTROLS */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                        <DollarSign size={24} className="stroke-[2.5]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                                Quản Lý Bảng Lương & Chi Trả
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Payroll System
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2">
                            <span>Kỳ tính lương: <strong className="text-slate-800 font-bold">Tháng {currentMonth} / {currentYear}</strong></span>
                            <span className="text-slate-300">•</span>
                            <span>Đã lập <strong className="text-emerald-700 font-bold">{initialData.length}</strong> phiếu lương</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Form chọn Tháng / Năm */}
                    <form className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-xs">
                        <div className="flex items-center px-2 py-1 text-slate-500">
                            <Calendar size={15} />
                        </div>
                        <select 
                            name="month" 
                            defaultValue={currentMonth} 
                            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer px-2 py-1.5 hover:text-emerald-600 transition-colors"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>Tháng {m}</option>
                            ))}
                        </select>
                        <div className="w-px h-5 bg-slate-300 mx-1"></div>
                        <select 
                            name="year" 
                            defaultValue={currentYear} 
                            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer px-2 py-1.5 hover:text-emerald-600 transition-colors"
                        >
                            {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                                <option key={y} value={y}>Năm {y}</option>
                            ))}
                        </select>
                        <button 
                            type="submit" 
                            className="ml-1 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs"
                        >
                            Xem
                        </button>
                    </form>

                    {/* Xuất Excel */}
                    <button 
                        onClick={handleExportExcel}
                        className="px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 transition-all shadow-xs"
                    >
                        <FileSpreadsheet size={16} className="text-emerald-600" />
                        <span>Xuất Excel</span>
                    </button>

                    {/* Tính Lại Bảng Lương */}
                    <button 
                        onClick={handleGenerate} 
                        disabled={loading} 
                        className="px-4.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        <span>{loading ? 'Đang Tính Toán...' : 'Tính Lại Bảng Lương'}</span>
                    </button>
                </div>
            </div>

            {/* 4 CARD KPI DASHBOARD ĐẲNG CẤP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
                {/* KPI 1: TỔNG THỰC LĨNH */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Tổng Thực Lĩnh (Net)</span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center font-bold">
                            <DollarSign size={18} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                            {formatVND(summaryKPI.totalNet)}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1.5 flex items-center justify-between border-t border-slate-100 pt-2">
                            <span>Quỹ tổng (Gross):</span>
                            <strong className="text-slate-800 font-mono">{formatVND(summaryKPI.totalGross)}</strong>
                        </div>
                    </div>
                </div>

                {/* KPI 2: TỔNG THƯỞNG & HOA HỒNG */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Thưởng & Hoa Hồng</span>
                        <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center font-bold">
                            <Award size={18} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-amber-600 font-mono tracking-tight">
                            {formatVND(summaryKPI.totalBonus)}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1.5 flex items-center justify-between border-t border-slate-100 pt-2">
                            <span>Thưởng DS / KPI:</span>
                            <strong className="text-amber-700 font-mono">{formatVND(summaryKPI.totalCommission)}</strong>
                        </div>
                    </div>
                </div>

                {/* KPI 3: TỔNG TẠM ỨNG & GIẢM TRỪ */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Tạm Ứng & Khấu Trừ</span>
                        <div className="w-9 h-9 rounded-xl bg-rose-100/80 text-rose-700 flex items-center justify-center font-bold">
                            <ArrowDownRight size={18} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-rose-600 font-mono tracking-tight">
                            {formatVND(summaryKPI.totalDeduction)}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1.5 flex items-center justify-between border-t border-slate-100 pt-2">
                            <span>Đã tạm ứng:</span>
                            <strong className="text-rose-700 font-mono">{formatVND(summaryKPI.totalAdvance)}</strong>
                        </div>
                    </div>
                </div>

                {/* KPI 4: TIẾN ĐỘ THANH TOÁN */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Tiến Độ Chi Trả</span>
                        <div className="w-9 h-9 rounded-xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center font-bold">
                            <CreditCard size={18} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1.5">
                            <span>{summaryKPI.countPaid}</span>
                            <span className="text-xs font-bold text-slate-400 font-sans">/ {summaryKPI.totalEmployees} nhân sự</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 border-t border-slate-100 pt-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div 
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${summaryKPI.totalEmployees ? (summaryKPI.countPaid / summaryKPI.totalEmployees) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <span className="text-xs font-extrabold text-emerald-700 font-mono">
                                {summaryKPI.totalEmployees ? Math.round((summaryKPI.countPaid / summaryKPI.totalEmployees) * 100) : 0}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BỘ LỌC VÀ BẢNG BÁO CÁO LƯƠNG CHI TIẾT */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* TOOLBAR: TÌM KIẾM & LỌC */}
                <div className="p-4.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3.5 bg-slate-50/70">
                    <div className="flex items-center gap-3 flex-wrap flex-1">
                        {/* Search Bar */}
                        <div className="relative min-w-[280px] max-w-md flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                placeholder="Tìm theo tên, email, phòng ban..."
                                className="w-full h-10 pl-10 pr-4 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Dropdown Phòng Ban */}
                        <div className="relative h-10 flex items-center bg-white px-3 rounded-xl border border-slate-300 shadow-2xs hover:border-slate-400 transition-colors">
                            <Building2 size={15} className="text-slate-400 mr-2 shrink-0" />
                            <select 
                                value={selectedDept}
                                onChange={e => setSelectedDept(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-4 appearance-none"
                            >
                                <option value="ALL">Tất cả phòng ban</option>
                                {departments.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="text-slate-400 pointer-events-none absolute right-2.5" />
                        </div>

                        {/* Dropdown Trạng Thái */}
                        <div className="relative h-10 flex items-center bg-white px-3 rounded-xl border border-slate-300 shadow-2xs hover:border-slate-400 transition-colors">
                            <Filter size={15} className="text-slate-400 mr-2 shrink-0" />
                            <select 
                                value={selectedStatus}
                                onChange={e => setSelectedStatus(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-4 appearance-none"
                            >
                                <option value="ALL">Tất cả trạng thái</option>
                                <option value="DRAFT">Bản nháp ({summaryKPI.countDraft})</option>
                                <option value="APPROVED">Đã duyệt ({summaryKPI.countApproved})</option>
                                <option value="PAID">Đã chi trả ({summaryKPI.countPaid})</option>
                            </select>
                            <ChevronDown size={14} className="text-slate-400 pointer-events-none absolute right-2.5" />
                        </div>
                    </div>

                    {/* Batch Actions khi chọn nhiều dòng */}
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300 animate-in fade-in duration-200">
                            <span className="text-xs font-extrabold text-emerald-900 pr-1">
                                Đã chọn: {selectedIds.length}
                            </span>
                            <button 
                                onClick={() => handleBatchStatus('APPROVED')}
                                disabled={loading}
                                className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-xs transition-colors"
                            >
                                <CheckCircle size={13} /> Duyệt nhanh
                            </button>
                            <button 
                                onClick={() => handleBatchStatus('PAID')}
                                disabled={loading}
                                className="px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-xs transition-colors"
                            >
                                <CreditCard size={13} /> Đã chi trả
                            </button>
                            <button 
                                onClick={handleBatchDelete}
                                disabled={loading}
                                className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 shadow-xs transition-colors"
                            >
                                <Trash2 size={13} /> Xóa
                            </button>
                        </div>
                    )}
                </div>

                {/* TABLE DỮ LIỆU BẢNG LƯƠNG CHUẨN KẾ TOÁN */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1150px]">
                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[11px] uppercase font-extrabold tracking-wider">
                            <tr>
                                <th className="px-4 py-3.5 text-center w-11">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                        checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                                        onChange={e => handleSelectAll(e.target.checked)}
                                    />
                                </th>
                                <th className="px-4 py-3.5 text-left">Hồ Sơ Nhân Sự</th>
                                <th className="px-4 py-3.5 text-right">Lương Cơ Bản</th>
                                <th className="px-4 py-3.5 text-center">Công Chuẩn</th>
                                <th className="px-4 py-3.5 text-right">Phụ Cấp & OT</th>
                                <th className="px-4 py-3.5 text-right">Thưởng & DS</th>
                                <th className="px-4 py-3.5 text-right">Tạm Ứng</th>
                                <th className="px-4 py-3.5 text-right">Khấu Trừ & Phạt</th>
                                <th className="px-4 py-3.5 text-right">Thực Lĩnh (Net)</th>
                                <th className="px-4 py-3.5 text-center">Trạng Thái</th>
                                <th className="px-4 py-3.5 text-center w-[120px]">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs font-medium">
                            {filteredRecords.map((row) => {
                                const isSelected = selectedIds.includes(row.id);
                                const actualSalary = Math.round((row.baseSalary / 26) * row.workDays);
                                const totalBonus = (row.commissionBonus || 0) + (row.bonus || 0);
                                const totalDeduction = (row.latePenalties || 0) + (row.advancePayment || 0) + (row.insuranceDeduction || 0) + (row.taxDeduction || 0) + (row.deductions || 0);

                                return (
                                    <tr 
                                        key={row.id} 
                                        className={`transition-colors ${isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'}`}
                                    >
                                        {/* Checkbox */}
                                        <td className="px-4 py-3.5 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                checked={isSelected}
                                                onChange={e => handleSelectRow(row.id, e.target.checked)}
                                            />
                                        </td>

                                        {/* User Info with Avatar */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-extrabold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                                                    {getInitials(row.user.name)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-[13px] hover:text-emerald-700 transition-colors">
                                                        {row.user.name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-semibold text-slate-700">
                                                            {row.user.employeeProfile?.department || 'Chưa phân ban'}
                                                        </span>
                                                        {row.user.employeeProfile?.position && (
                                                            <>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="text-slate-500">{row.user.employeeProfile.position}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {row.notes && (
                                                        <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1 max-w-[220px] truncate" title={row.notes}>
                                                            📝 {row.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Base Salary */}
                                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                                            {formatVND(row.baseSalary)}
                                        </td>

                                        {/* Work Days */}
                                        <td className="px-4 py-3.5 text-center">
                                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg font-mono font-extrabold text-xs">
                                                <span className="text-emerald-700">{row.workDays}</span>
                                                <span className="text-slate-400 font-normal">/ 26</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                ≈ {formatVND(actualSalary)}
                                            </div>
                                        </td>

                                        {/* Allowance & OT */}
                                        <td className="px-4 py-3.5 text-right font-mono">
                                            {row.allowances > 0 && (
                                                <div className="text-slate-900 font-bold">+{formatVND(row.allowances)}</div>
                                            )}
                                            {row.otSalary > 0 && (
                                                <div className="text-indigo-700 text-[11px] font-extrabold">OT: +{formatVND(row.otSalary)}</div>
                                            )}
                                            {row.allowances === 0 && row.otSalary === 0 && (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>

                                        {/* Bonus & Commission */}
                                        <td className="px-4 py-3.5 text-right font-mono">
                                            {totalBonus > 0 ? (
                                                <div>
                                                    <div className="text-emerald-700 font-extrabold">+{formatVND(totalBonus)}</div>
                                                    {row.commissionBonus > 0 && (
                                                        <div className="text-[10px] text-amber-700 font-bold">DS: +{formatVND(row.commissionBonus)}</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">0 ₫</span>
                                            )}
                                        </td>

                                        {/* Advance Payment */}
                                        <td className="px-4 py-3.5 text-right font-mono">
                                            {row.advancePayment > 0 ? (
                                                <span className="text-rose-700 font-extrabold px-2 py-0.5 bg-rose-50 border border-rose-200 rounded">
                                                    -{formatVND(row.advancePayment)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">0 ₫</span>
                                            )}
                                        </td>

                                        {/* Deductions & Late */}
                                        <td className="px-4 py-3.5 text-right font-mono text-xs">
                                            {totalDeduction > 0 ? (
                                                <div>
                                                    <div className="text-rose-600 font-extrabold">-{formatVND(totalDeduction)}</div>
                                                    {row.latePenalties > 0 && (
                                                        <div className="text-[10px] text-rose-500 font-bold">Phạt: -{formatVND(row.latePenalties)}</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">0 ₫</span>
                                            )}
                                        </td>

                                        {/* Net Salary Highlight */}
                                        <td className="px-4 py-3.5 text-right font-mono">
                                            <span className="text-emerald-800 font-black text-sm bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 inline-block shadow-2xs">
                                                {formatVND(row.netSalary)}
                                            </span>
                                        </td>

                                        {/* Status Badge Pill */}
                                        <td className="px-4 py-3.5 text-center">
                                            {row.status === 'DRAFT' && (
                                                <button 
                                                    onClick={() => handleQuickStatus(row.id, 'APPROVED')}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-[11px] font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                                                    title="Bấm để Chốt duyệt phiếu lương"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                    Bản Nháp
                                                </button>
                                            )}
                                            {row.status === 'APPROVED' && (
                                                <button 
                                                    onClick={() => handleQuickStatus(row.id, 'PAID')}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[11px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                                                    title="Bấm để Xác nhận đã chi trả"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    Đã Duyệt
                                                </button>
                                            )}
                                            {row.status === 'PAID' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-300 rounded-full text-[11px] font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                    Đã Chi Trả
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3.5 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* Xem / In Phiếu Lương */}
                                                <button 
                                                    onClick={() => setViewingSlipRecord(row)}
                                                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Xem & In Phiếu Lương (Payslip)"
                                                >
                                                    <Printer size={16} />
                                                </button>

                                                {/* Chỉnh sửa chi tiết */}
                                                <button 
                                                    onClick={() => handleOpenEdit(row)}
                                                    className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Điều chỉnh thưởng, phụ cấp, tạm ứng, giảm trừ"
                                                >
                                                    <FileEdit size={16} />
                                                </button>

                                                {/* Xóa phiếu lương */}
                                                <button 
                                                    onClick={() => handleDeleteRecord(row.id, row.user.name || '')}
                                                    className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Xóa phiếu lương này"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={11} className="py-16 text-center text-xs font-semibold text-slate-500">
                                        Không tìm thấy dữ liệu bảng lương phù hợp. Hãy bấm <strong>"Tính Lại Bảng Lương"</strong> hoặc kiểm tra bộ lọc.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                        {/* DÒNG TỔNG CỘNG FOOTER BẢNG LƯƠNG CHUẨN DOANH NGHIỆP */}
                        {filteredRecords.length > 0 && (
                            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-mono text-xs font-black text-slate-900">
                                <tr>
                                    <td colSpan={2} className="px-4 py-3.5 text-left uppercase text-slate-800 font-sans tracking-wider">
                                        TỔNG CỘNG ({filteredRecords.length} Nhân Sự)
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-slate-900">
                                        {formatVND(summaryKPI.totalBaseSalary)}
                                    </td>
                                    <td className="px-4 py-3.5 text-center text-slate-500 font-sans font-normal text-[11px]">
                                        -
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-slate-900">
                                        +{formatVND(summaryKPI.totalAllowances + summaryKPI.totalOT)}
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-emerald-800 font-extrabold">
                                        +{formatVND(summaryKPI.totalBonus)}
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-rose-700 font-extrabold">
                                        -{formatVND(summaryKPI.totalAdvance)}
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-rose-700 font-extrabold">
                                        -{formatVND(summaryKPI.totalDeduction)}
                                    </td>
                                    <td className="px-4 py-3.5 text-right font-black text-sm text-emerald-900 bg-emerald-100/60">
                                        {formatVND(summaryKPI.totalNet)}
                                    </td>
                                    <td colSpan={2} className="px-4 py-3.5 text-center text-slate-400 font-sans font-normal text-[11px]">
                                        -
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* ======================================================== */}
            {/* MODAL ĐIỀU CHỈNH CHI TIẾT LƯƠNG (ADJUSTMENT MODAL) */}
            {/* ======================================================== */}
            <Modal 
                isOpen={!!editingRecord} 
                onClose={() => setEditingRecord(null)} 
                title={`Điều Chỉnh Chi Tiết Lương: ${editingRecord?.user.name || ''}`}
            >
                {editingRecord && (
                    <form onSubmit={handleSaveEdit} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
                        {/* Header Employee Info */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-800 font-black flex items-center justify-center text-sm">
                                    {getInitials(editingRecord.user.name)}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">{editingRecord.user.name}</div>
                                    <div className="text-xs text-slate-600 mt-0.5">
                                        {editingRecord.user.employeeProfile?.department || 'Chưa phân ban'} • {editingRecord.user.employeeProfile?.position || 'Nhân viên'}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold px-3 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 shadow-2xs">
                                    Kỳ Lương: T{editingRecord.month}/{editingRecord.year}
                                </span>
                            </div>
                        </div>

                        {/* SECTION 1: CÁC KHOẢN THU NHẬP */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-emerald-200">
                                <ArrowUpRight size={15} className="text-emerald-600" /> 1. Các Khoản Thu Nhập (Earnings)
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Lương Cơ Bản (VNĐ)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900"
                                        value={editForm.baseSalary}
                                        onChange={e => setEditForm({ ...editForm, baseSalary: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Số Ngày Công Thực Tế (/26)</label>
                                    <input 
                                        type="number" 
                                        step="0.5"
                                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900"
                                        value={editForm.workDays}
                                        onChange={e => setEditForm({ ...editForm, workDays: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Phụ Cấp (Ăn trưa, xăng xe...)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900"
                                        value={editForm.allowances}
                                        onChange={e => setEditForm({ ...editForm, allowances: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Thưởng Doanh Số / KPI (VNĐ)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-emerald-700"
                                        value={editForm.commissionBonus}
                                        onChange={e => setEditForm({ ...editForm, commissionBonus: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Thưởng Thêm / Dự Án Khác (VNĐ)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-emerald-700"
                                        value={editForm.bonus}
                                        onChange={e => setEditForm({ ...editForm, bonus: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tiền Tăng Ca OT (VNĐ)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-indigo-700"
                                        value={editForm.otSalary}
                                        onChange={e => setEditForm({ ...editForm, otSalary: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: CÁC KHOẢN GIẢM TRỪ & TẠM ỨNG */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-rose-200">
                                <ArrowDownRight size={15} className="text-rose-600" /> 2. Các Khoản Giảm Trừ & Tạm Ứng (Deductions)
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tạm Ứng Đã Nhận Trong Tháng (VNĐ)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3.5 py-2 text-xs bg-rose-50/50 border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-mono font-black text-rose-700"
                                        value={editForm.advancePayment}
                                        onChange={e => setEditForm({ ...editForm, advancePayment: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Phạt Đi Muộn / Kỷ Luật (VNĐ)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-mono font-bold text-rose-600"
                                        value={editForm.latePenalties}
                                        onChange={e => setEditForm({ ...editForm, latePenalties: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Trừ BHXH / BHYT / BHTN (VNĐ)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-mono font-bold text-slate-900"
                                        value={editForm.insuranceDeduction}
                                        onChange={e => setEditForm({ ...editForm, insuranceDeduction: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Thuế TNCN Tạm Tính (VNĐ)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-mono font-bold text-slate-900"
                                        value={editForm.taxDeduction}
                                        onChange={e => setEditForm({ ...editForm, taxDeduction: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Khoản Giảm Trừ Khác (VNĐ)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-mono font-bold text-slate-900"
                                        value={editForm.deductions}
                                        onChange={e => setEditForm({ ...editForm, deductions: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: GHI CHÚ & TRẠNG THÁI */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Trạng Thái Phiếu Lương</label>
                                <select 
                                    value={editForm.status}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-800"
                                >
                                    <option value="DRAFT">Bản Nháp (DRAFT)</option>
                                    <option value="APPROVED">Đã Duyệt (APPROVED)</option>
                                    <option value="PAID">Đã Chi Trả (PAID)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi Chú Giải Trình</label>
                                <input 
                                    type="text" 
                                    placeholder="Lý do thưởng nóng, phạt, tạm ứng..."
                                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900"
                                    value={editForm.notes || ''}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* LIVE PREVIEW CALCULATION BOX */}
                        <div className="bg-slate-900 text-white p-4.5 rounded-2xl space-y-2.5 shadow-md">
                            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Xem Trước Kết Quả Tính Lương Tức Thì</span>
                                <span className="text-[10px] font-normal text-slate-400">Tự động tính theo số liệu đã nhập</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2.5 text-xs pt-2 border-t border-slate-800">
                                <div>
                                    <div className="text-slate-400 font-medium">Tổng Thu Nhập:</div>
                                    <div className="font-bold font-mono text-sm text-white mt-0.5">{formatVND(previewCalc.gross)}</div>
                                </div>
                                <div>
                                    <div className="text-rose-400 font-medium">Tổng Giảm Trừ:</div>
                                    <div className="font-bold font-mono text-sm text-rose-300 mt-0.5">-{formatVND(previewCalc.totalDed)}</div>
                                </div>
                                <div>
                                    <div className="text-emerald-400 font-medium">Thực Lĩnh (Net):</div>
                                    <div className="font-black font-mono text-base text-yellow-300 mt-0.5">{formatVND(previewCalc.net)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Form Buttons */}
                        <div className="flex gap-2.5 justify-end pt-2">
                            <button 
                                type="button" 
                                onClick={() => setEditingRecord(null)}
                                className="px-4.5 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
                            >
                                Đóng
                            </button>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Đang lưu...' : 'Lưu Thay Đổi & Cập Nhật'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* ======================================================== */}
            {/* MODAL XEM & IN PHIẾU LƯƠNG CÁ NHÂN (PAYSLIP PRINT MODAL) */}
            {/* ======================================================== */}
            <Modal 
                isOpen={!!viewingSlipRecord} 
                onClose={() => setViewingSlipRecord(null)} 
                title={`Phiếu Lương: ${viewingSlipRecord?.user.name || ''}`}
            >
                {viewingSlipRecord && (
                    <div className="p-4 space-y-4">
                        {/* Print Actions Bar */}
                        <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200 no-print">
                            <div className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
                                <Sparkles size={15} className="text-emerald-600" />
                                <span>Phiếu lương chuẩn mẫu kế toán doanh nghiệp A4/A5</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleTriggerPrint}
                                    className="px-4.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-98"
                                >
                                    <Printer size={15} /> In Phiếu Lương
                                </button>
                            </div>
                        </div>

                        {/* ================= KHUNG PHIẾU LƯƠNG IN ================= */}
                        <div 
                            id="printable-payslip-area" 
                            ref={printRef}
                            className="bg-white p-7 rounded-2xl border border-slate-300 text-slate-900 font-sans shadow-sm"
                        >
                            {/* Header Công Ty */}
                            <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                                <div>
                                    <h2 className="text-base font-black uppercase tracking-wide text-slate-900">
                                        CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ TSOL
                                    </h2>
                                    <p className="text-[11px] text-slate-600 mt-0.5">
                                        Địa chỉ: Tòa nhà Văn phòng, TP. Hồ Chí Minh, Việt Nam
                                    </p>
                                    <p className="text-[11px] text-slate-600">
                                        Điện thoại: 1900 xxxx - Email: hr@tsol.vn
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 border border-slate-300 rounded uppercase text-slate-800">
                                        Mã PL: PL-{viewingSlipRecord.month}{viewingSlipRecord.year}-{viewingSlipRecord.user.id.slice(-4).toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {/* Tiêu Đề Phiếu Lương */}
                            <div className="text-center my-4.5">
                                <h1 className="text-xl font-black uppercase text-slate-900 tracking-wider">
                                    PHIẾU LƯƠNG NHÂN VIÊN
                                </h1>
                                <p className="text-xs font-bold text-slate-700 mt-1">
                                    Kỳ tính lương: Tháng {viewingSlipRecord.month} năm {viewingSlipRecord.year}
                                </p>
                            </div>

                            {/* Thông Tin Nhân Viên */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200 my-4">
                                <div>
                                    <span className="text-slate-600 font-medium">Họ và tên:</span>{' '}
                                    <strong className="text-slate-900 font-bold">{viewingSlipRecord.user.name}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-600 font-medium">Phòng ban:</span>{' '}
                                    <strong className="text-slate-900">{viewingSlipRecord.user.employeeProfile?.department || 'Chưa phân ban'}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-600 font-medium">Chức vụ:</span>{' '}
                                    <strong className="text-slate-900">{viewingSlipRecord.user.employeeProfile?.position || 'Nhân viên'}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-600 font-medium">Mã số thuế:</span>{' '}
                                    <span className="font-mono font-bold text-slate-900">{viewingSlipRecord.user.employeeProfile?.taxCode || '---'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-600 font-medium">Tài khoản nhận:</span>{' '}
                                    <span className="font-mono font-bold text-slate-900">{viewingSlipRecord.user.employeeProfile?.bankAccount || '---'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-600 font-medium">Ngân hàng:</span>{' '}
                                    <span className="font-bold text-slate-900">{viewingSlipRecord.user.employeeProfile?.bankName || '---'}</span>
                                </div>
                            </div>

                            {/* Bảng Chi Tiết Thu Nhập & Giảm Trừ */}
                            {(() => {
                                const actualSal = Math.round((viewingSlipRecord.baseSalary / 26) * viewingSlipRecord.workDays);
                                const totalGross = actualSal + viewingSlipRecord.allowances + viewingSlipRecord.commissionBonus + viewingSlipRecord.bonus + viewingSlipRecord.otSalary;
                                const totalDed = viewingSlipRecord.latePenalties + viewingSlipRecord.advancePayment + viewingSlipRecord.insuranceDeduction + viewingSlipRecord.taxDeduction + viewingSlipRecord.deductions;

                                return (
                                    <>
                                        <div className="grid grid-cols-2 gap-4.5 my-4">
                                            {/* CỘT TRÁI: THU NHẬP */}
                                            <div className="border border-slate-300 rounded-xl overflow-hidden">
                                                <div className="bg-emerald-50 px-3.5 py-2.5 border-b border-emerald-200 font-bold text-xs text-emerald-900 uppercase">
                                                    I. CÁC KHOẢN THU NHẬP (VNĐ)
                                                </div>
                                                <div className="divide-y divide-slate-100 text-xs p-1">
                                                    <div className="flex justify-between py-2 px-2.5">
                                                        <span className="text-slate-700">1. Lương cơ bản:</span>
                                                        <span className="font-mono font-bold">{formatVND(viewingSlipRecord.baseSalary)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 px-2.5">
                                                        <span className="text-slate-700">2. Ngày công tính ({viewingSlipRecord.workDays}/26):</span>
                                                        <span className="font-mono font-bold">{formatVND(actualSal)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 px-2.5">
                                                        <span className="text-slate-700">3. Phụ cấp cố định:</span>
                                                        <span className="font-mono font-bold">{formatVND(viewingSlipRecord.allowances)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 px-2.5">
                                                        <span className="text-slate-700">4. Thưởng doanh số / KPI:</span>
                                                        <span className="font-mono font-bold text-amber-700">{formatVND(viewingSlipRecord.commissionBonus)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 px-2.5">
                                                        <span className="text-slate-700">5. Thưởng hiệu quả / Khác:</span>
                                                        <span className="font-mono font-bold text-emerald-700">{formatVND(viewingSlipRecord.bonus)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 px-2.5">
                                                        <span className="text-slate-700">6. Tiền làm thêm giờ (OT):</span>
                                                        <span className="font-mono font-bold text-indigo-700">{formatVND(viewingSlipRecord.otSalary)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2.5 px-2.5 bg-emerald-50 font-black text-emerald-900 border-t border-emerald-300">
                                                        <span>TỔNG THU NHẬP (A):</span>
                                                        <span className="font-mono">{formatVND(totalGross)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CỘT PHẢI: GIẢM TRỪ */}
                                            <div className="border border-slate-300 rounded-xl overflow-hidden">
                                                <div className="bg-rose-50 px-3.5 py-2.5 border-b border-rose-200 font-bold text-xs text-rose-900 uppercase">
                                                    II. CÁC KHOẢN KHẤU TRỪ (VNĐ)
                                                </div>
                                                <div className="divide-y divide-slate-100 text-xs p-1">
                                                    <div className="flex justify-between py-2 px-2.5 bg-rose-50/60">
                                                        <span className="text-rose-950 font-bold">1. Tạm ứng đã nhận trong tháng:</span>
                                                        <span className="font-mono font-black text-rose-700">{formatVND(viewingSlipRecord.advancePayment)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 px-2.5">
                                                        <span className="text-slate-700">2. Phạt đi muộn / Kỷ luật:</span>
                                                        <span className="font-mono font-bold text-rose-600">{formatVND(viewingSlipRecord.latePenalties)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 px-2.5">
                                                        <span className="text-slate-700">3. Trừ đóng BHXH / BHYT:</span>
                                                        <span className="font-mono font-bold">{formatVND(viewingSlipRecord.insuranceDeduction)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 px-2.5">
                                                        <span className="text-slate-700">4. Thuế TNCN:</span>
                                                        <span className="font-mono font-bold">{formatVND(viewingSlipRecord.taxDeduction)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 px-2.5">
                                                        <span className="text-slate-700">5. Các khoản giảm trừ khác:</span>
                                                        <span className="font-mono font-bold">{formatVND(viewingSlipRecord.deductions)}</span>
                                                    </div>
                                                    <div className="py-2 px-2.5 invisible">
                                                        <span>-</span>
                                                    </div>
                                                    <div className="flex justify-between py-2.5 px-2.5 bg-rose-50 font-black text-rose-900 border-t border-rose-300">
                                                        <span>TỔNG KHẤU TRỪ (B):</span>
                                                        <span className="font-mono">{formatVND(totalDed)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* TỔNG KẾT THỰC LĨNH */}
                                        <div className="bg-slate-900 text-white p-5 rounded-2xl my-4.5 shadow-md">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-bold uppercase tracking-wider">
                                                    III. LƯƠNG THỰC LĨNH CHUYỂN KHOẢN (A - B):
                                                </div>
                                                <div className="text-2xl font-black font-mono text-emerald-400">
                                                    {formatVND(viewingSlipRecord.netSalary)}
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-300 italic mt-1.5 pt-2 border-t border-slate-800">
                                                Bằng chữ: <strong className="text-white not-italic">{numberToVietnameseWords(viewingSlipRecord.netSalary)}</strong>
                                            </div>
                                        </div>

                                        {viewingSlipRecord.notes && (
                                            <div className="text-xs text-slate-800 bg-amber-50 p-3 rounded-xl border border-amber-300 mb-4">
                                                <strong>Ghi chú bổ sung:</strong> {viewingSlipRecord.notes}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            {/* Chữ Ký 3 Bên */}
                            <div className="grid grid-cols-3 gap-4 text-center text-xs mt-9 pt-4 border-t border-slate-300">
                                <div>
                                    <div className="font-bold text-slate-900 uppercase">Người Lập Biểu</div>
                                    <div className="text-[10px] text-slate-500 italic">(Ký, họ tên)</div>
                                    <div className="h-16"></div>
                                    <div className="font-bold text-slate-900">Phòng Nhân Sự</div>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 uppercase">Kế Toán Trưởng</div>
                                    <div className="text-[10px] text-slate-500 italic">(Ký, họ tên)</div>
                                    <div className="h-16"></div>
                                    <div className="font-bold text-slate-900">Kế Toán Thanh Toán</div>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 uppercase">Người Nhận Lương</div>
                                    <div className="text-[10px] text-slate-500 italic">(Ký, ghi rõ họ tên)</div>
                                    <div className="h-16"></div>
                                    <div className="font-bold text-slate-900">{viewingSlipRecord.user.name}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
