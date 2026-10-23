'use client';

import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useMemo } from 'react';
import {
    Search, CheckCircle, FileEdit, Printer,
    Trash2, RefreshCw, DollarSign, Award,
    CreditCard, ArrowUpRight, ArrowDownRight,
    Calendar, Building2, FileSpreadsheet, X,
    ChevronDown, Filter, RotateCcw, Wallet
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
import { formatVND } from '@/lib/vietnameseCurrency';
import * as XLSX from 'xlsx';
import PrintPayslipModal from './PrintPayslipModal';

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
    companyInfo?: {
        name?: string;
        fullName?: string;
        displayName?: string;
        taxCode?: string;
        address?: string;
        phone?: string;
        email?: string;
        website?: string;
        logo?: string;
    };
}

export default function PayrollClient({ initialData, currentMonth, currentYear, departments, companyInfo }: Props) {
    const router = useRouter();

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

    const handleGenerate = async () => {
        const confirmMsg = `Bạn có chắc muốn tự động tính toán lại dữ liệu lương tháng ${currentMonth}/${currentYear}?\n- Hệ thống sẽ lấy ngày công và phạt muộn từ Chấm công.\n- Các khoản điều chỉnh thủ công (thưởng doanh số, phụ cấp, tạm ứng...) đã nhập sẽ được BẢO TOÀN.`;
        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const res = await generatePayroll(currentMonth, currentYear);
            if (res.success) {
                toast.success('Đã đồng bộ và tính toán bảng lương thành công!');
                router.refresh();
            } else {
                toast.error('Lỗi tính bảng lương: ' + res.error);
            }
        } catch (err: any) {
            toast.error('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

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
                toast.error('Lỗi cập nhật: ' + res.error);
            }
        } catch (err: any) {
            toast.error('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickStatus = async (id: string, status: 'APPROVED' | 'PAID' | 'DRAFT') => {
        const actionLabel = status === 'APPROVED' ? 'Duyệt bảng lương' : status === 'PAID' ? 'Xác nhận Đã chi trả lương' : 'Chuyển về Bản nháp';
        if (!confirm(`${actionLabel} cho nhân viên này?`)) return;
        setLoading(true);
        try {
            await batchUpdatePayrollStatus([id], status);
            router.refresh();
        } catch (e: any) {
            toast.error('Lỗi: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBatchStatus = async (status: 'APPROVED' | 'PAID') => {
        if (selectedIds.length === 0) {
            toast.warning('Vui lòng tích chọn ít nhất 1 nhân viên.');
            return;
        }
        const actionLabel = status === 'APPROVED' ? 'DUYỆT' : 'XÁC NHẬN CHI TRẢ';
        if (!confirm(`Bạn có chắc chắn muốn ${actionLabel} cho ${selectedIds.length} phiếu lương đã chọn?`)) return;

        setLoading(true);
        try {
            const res = await batchUpdatePayrollStatus(selectedIds, status);
            if (res.success) {
                toast.success(`Đã cập nhật ${selectedIds.length} phiếu lương thành công!`);
                setSelectedIds([]);
                router.refresh();
            } else {
                toast.error('Lỗi: ' + res.error);
            }
        } catch (e: any) {
            toast.error('Lỗi: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRecord = async (id: string, name: string) => {
        if (!confirm(`Bạn có chắc muốn xóa phiếu lương của "${name}" kỳ này?`)) return;
        setLoading(true);
        try {
            const res = await deletePayrollRecord(id);
            if (res.success) {
                router.refresh();
            } else {
                toast.error('Lỗi: ' + res.error);
            }
        } catch (e: any) {
            toast.error('Lỗi: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

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
                toast.error('Lỗi: ' + res.error);
            }
        } catch (e: any) {
            toast.error('Lỗi: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

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

    const handleExportExcel = () => {
        if (filteredRecords.length === 0) {
            toast.info('Không có dữ liệu để xuất file Excel.');
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
            { wch: 6 }, { wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 16 },
            { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
            { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 18 },
            { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 25 },
        ];
        worksheet['!cols'] = colWidths;

        XLSX.writeFile(workbook, `Bang_Luong_Cong_Ty_Thang_${currentMonth}_${currentYear}.xlsx`);
    };

    const getInitials = (name?: string | null) => {
        if (!name) return 'NV';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const hasActiveFilters = searchTerm !== '' || selectedDept !== 'ALL' || selectedStatus !== 'ALL';

    return (
        <div className="w-full space-y-5 font-sans text-slate-800 pb-8">
            {/* 1. Standard ERP Header */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                    Nhân Sự & Tiền Lương
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Payroll System
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5 mt-1">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight m-0">
                                    Quản Lý Bảng Lương & Chi Trả
                                </h1>
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full tabular-nums">
                                    Tháng {currentMonth}/{currentYear}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 m-0">
                                Kỳ tính lương <strong>Tháng {currentMonth}/{currentYear}</strong> — Đã lập <strong className="text-indigo-600 tabular-nums">{initialData.length}</strong> phiếu lương nhân sự
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Form chọn Tháng / Năm (No double borders!) */}
                        <form className="flex items-center h-[36px] bg-slate-50/80 px-2 rounded-lg border border-slate-200">
                            <Calendar size={14} className="text-slate-400 mr-1.5 shrink-0" />
                            <div className="relative flex items-center h-full">
                                <select
                                    name="month"
                                    defaultValue={currentMonth}
                                    style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                                    className="appearance-none pr-4 text-xs font-semibold text-slate-800 bg-transparent border-none outline-none cursor-pointer h-full tabular-nums"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>Tháng {m}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="text-slate-400 pointer-events-none absolute right-0.5" />
                            </div>
                            <div className="w-px h-4 bg-slate-200 mx-2" />
                            <div className="relative flex items-center h-full">
                                <select
                                    name="year"
                                    defaultValue={currentYear}
                                    style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                                    className="appearance-none pr-4 text-xs font-semibold text-slate-800 bg-transparent border-none outline-none cursor-pointer h-full tabular-nums"
                                >
                                    {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                                        <option key={y} value={y}>Năm {y}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="text-slate-400 pointer-events-none absolute right-0.5" />
                            </div>
                            <button
                                type="submit"
                                className="ml-2 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer border-none"
                            >
                                Xem
                            </button>
                        </form>

                        {/* Xuất Excel */}
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="inline-flex items-center gap-1.5 h-[36px] px-3 text-xs font-semibold rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                        >
                            <FileSpreadsheet size={14} className="text-emerald-600" />
                            <span>Xuất Excel</span>
                        </button>

                        {/* Tính Lại Bảng Lương */}
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 h-[36px] px-3.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer border-none"
                        >
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                            <span>{loading ? 'Đang tính...' : 'Tính Lại Bảng Lương'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider m-0">
                                Tổng Thực Lĩnh (Net)
                            </p>
                            <h3 className="text-xl font-bold text-emerald-700 tabular-nums mt-1 m-0">
                                {formatVND(summaryKPI.totalNet)}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 shrink-0">
                            <DollarSign size={19} />
                        </div>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>Quỹ tổng (Gross):</span>
                        <strong className="text-slate-800 tabular-nums">{formatVND(summaryKPI.totalGross)}</strong>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider m-0">
                                Thưởng & Hoa Hồng
                            </p>
                            <h3 className="text-xl font-bold text-amber-600 tabular-nums mt-1 m-0">
                                {formatVND(summaryKPI.totalBonus)}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shrink-0">
                            <Award size={19} />
                        </div>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>Thưởng DS / KPI:</span>
                        <strong className="text-amber-700 tabular-nums">{formatVND(summaryKPI.totalCommission)}</strong>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider m-0">
                                Tạm Ứng & Khấu Trừ
                            </p>
                            <h3 className="text-xl font-bold text-rose-600 tabular-nums mt-1 m-0">
                                {formatVND(summaryKPI.totalDeduction)}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60 shrink-0">
                            <ArrowDownRight size={19} />
                        </div>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>Đã tạm ứng:</span>
                        <strong className="text-rose-700 tabular-nums">{formatVND(summaryKPI.totalAdvance)}</strong>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider m-0">
                                Tiến Độ Chi Trả
                            </p>
                            <div className="flex items-baseline gap-1.5 mt-1">
                                <h3 className="text-xl font-bold text-slate-900 tabular-nums m-0">
                                    {summaryKPI.countPaid}
                                </h3>
                                <span className="text-xs font-medium text-slate-400 tabular-nums">
                                    / {summaryKPI.totalEmployees} nhân sự
                                </span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                            <CreditCard size={19} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${summaryKPI.totalEmployees ? (summaryKPI.countPaid / summaryKPI.totalEmployees) * 100 : 0}%` }}
                            />
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 tabular-nums">
                            {summaryKPI.totalEmployees ? Math.round((summaryKPI.countPaid / summaryKPI.totalEmployees) * 100) : 0}%
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Filter Toolbar (No Double Borders, No Icon Overlap) */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                    {/* Search Input */}
                    <div className="flex-1 min-w-[240px] max-w-md flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-3 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                        <Search size={15} className="text-slate-400 shrink-0 mr-2" />
                        <input
                            type="text"
                            placeholder="Tìm theo họ tên, email, phòng ban..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            className="w-full h-full text-xs font-medium text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none p-0"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="text-slate-400 hover:text-slate-600 ml-1.5 bg-transparent border-none cursor-pointer p-0.5 flex items-center"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Department Select */}
                    <div className="relative flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                        <Building2 size={14} className="text-slate-400 mr-1.5 shrink-0" />
                        <select
                            value={selectedDept}
                            onChange={e => setSelectedDept(e.target.value)}
                            style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            className="appearance-none pr-5 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer h-full"
                        >
                            <option value="ALL">Tất cả phòng ban</option>
                            {departments.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="text-slate-400 pointer-events-none absolute right-2" />
                    </div>

                    {/* Status Select */}
                    <div className="relative flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                        <Filter size={13} className="text-slate-400 mr-1.5 shrink-0" />
                        <select
                            value={selectedStatus}
                            onChange={e => setSelectedStatus(e.target.value)}
                            style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            className="appearance-none pr-5 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer h-full"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="DRAFT">Bản nháp ({summaryKPI.countDraft})</option>
                            <option value="APPROVED">Đã duyệt ({summaryKPI.countApproved})</option>
                            <option value="PAID">Đã chi trả ({summaryKPI.countPaid})</option>
                        </select>
                        <ChevronDown size={13} className="text-slate-400 pointer-events-none absolute right-2" />
                    </div>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedDept('ALL');
                                setSelectedStatus('ALL');
                            }}
                            className="inline-flex items-center gap-1 h-[36px] px-2.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 transition cursor-pointer"
                        >
                            <RotateCcw size={12} />
                            <span>Đặt lại</span>
                        </button>
                    )}
                </div>

                {/* Batch Actions */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-indigo-50/80 px-3 py-1.5 rounded-lg border border-indigo-200">
                        <span className="text-xs font-bold text-indigo-900 pr-1 tabular-nums">
                            Đã chọn: {selectedIds.length}
                        </span>
                        <button
                            type="button"
                            onClick={() => handleBatchStatus('APPROVED')}
                            disabled={loading}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 transition-colors border-none cursor-pointer"
                        >
                            <CheckCircle size={12} /> Duyệt nhanh
                        </button>
                        <button
                            type="button"
                            onClick={() => handleBatchStatus('PAID')}
                            disabled={loading}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1 transition-colors border-none cursor-pointer"
                        >
                            <CreditCard size={12} /> Đã chi trả
                        </button>
                        <button
                            type="button"
                            onClick={handleBatchDelete}
                            disabled={loading}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-1 transition-colors border-none cursor-pointer"
                        >
                            <Trash2 size={12} /> Xóa
                        </button>
                    </div>
                )}
            </div>

            {/* 4. Data Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1150px] text-xs whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                                <th className="px-3.5 py-3 text-center w-10">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                                        onChange={e => handleSelectAll(e.target.checked)}
                                    />
                                </th>
                                <th className="px-3.5 py-3 font-bold text-left">Hồ Sơ Nhân Sự</th>
                                <th className="px-3.5 py-3 font-bold text-right">Lương Cơ Bản</th>
                                <th className="px-3.5 py-3 font-bold text-center">Công Chuẩn</th>
                                <th className="px-3.5 py-3 font-bold text-right">Phụ Cấp & OT</th>
                                <th className="px-3.5 py-3 font-bold text-right">Thưởng & DS</th>
                                <th className="px-3.5 py-3 font-bold text-right">Tạm Ứng</th>
                                <th className="px-3.5 py-3 font-bold text-right">Khấu Trừ & Phạt</th>
                                <th className="px-3.5 py-3 font-bold text-right">Thực Lĩnh (Net)</th>
                                <th className="px-3.5 py-3 font-bold text-center">Trạng Thái</th>
                                <th className="px-3.5 py-3 font-bold text-center w-[110px]">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRecords.map((row) => {
                                const isSelected = selectedIds.includes(row.id);
                                const actualSalary = Math.round((row.baseSalary / 26) * row.workDays);
                                const totalBonus = (row.commissionBonus || 0) + (row.bonus || 0);
                                const totalDeduction = (row.latePenalties || 0) + (row.advancePayment || 0) + (row.insuranceDeduction || 0) + (row.taxDeduction || 0) + (row.deductions || 0);

                                return (
                                    <tr
                                        key={row.id}
                                        className={`transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'}`}
                                    >
                                        <td className="px-3.5 py-3 text-center align-middle">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                checked={isSelected}
                                                onChange={e => handleSelectRow(row.id, e.target.checked)}
                                            />
                                        </td>

                                        <td className="px-3.5 py-3 align-middle">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-xs shrink-0">
                                                    {getInitials(row.user.name)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-xs">
                                                        {row.user.name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-medium text-slate-600">
                                                            {row.user.employeeProfile?.department || 'Chưa phân ban'}
                                                        </span>
                                                        {row.user.employeeProfile?.position && (
                                                            <>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="text-slate-400">{row.user.employeeProfile.position}</span>
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

                                        <td className="px-3.5 py-3 text-right font-bold text-slate-900 tabular-nums align-middle">
                                            {formatVND(row.baseSalary)}
                                        </td>

                                        <td className="px-3.5 py-3 text-center align-middle">
                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-md tabular-nums font-bold text-xs">
                                                <span className="text-emerald-700">{row.workDays}</span>
                                                <span className="text-slate-400 font-normal">/ 26</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 tabular-nums mt-0.5">
                                                ≈ {formatVND(actualSalary)}
                                            </div>
                                        </td>

                                        <td className="px-3.5 py-3 text-right tabular-nums align-middle">
                                            {row.allowances > 0 && (
                                                <div className="text-slate-900 font-semibold">+{formatVND(row.allowances)}</div>
                                            )}
                                            {row.otSalary > 0 && (
                                                <div className="text-indigo-600 text-[11px] font-bold">OT: +{formatVND(row.otSalary)}</div>
                                            )}
                                            {row.allowances === 0 && row.otSalary === 0 && (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>

                                        <td className="px-3.5 py-3 text-right tabular-nums align-middle">
                                            {totalBonus > 0 ? (
                                                <div>
                                                    <div className="text-emerald-700 font-bold">+{formatVND(totalBonus)}</div>
                                                    {row.commissionBonus > 0 && (
                                                        <div className="text-[10px] text-amber-700 font-semibold">DS: +{formatVND(row.commissionBonus)}</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">0 ₫</span>
                                            )}
                                        </td>

                                        <td className="px-3.5 py-3 text-right tabular-nums align-middle">
                                            {row.advancePayment > 0 ? (
                                                <span className="text-rose-700 font-bold px-2 py-0.5 bg-rose-50 border border-rose-200/70 rounded">
                                                    -{formatVND(row.advancePayment)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">0 ₫</span>
                                            )}
                                        </td>

                                        <td className="px-3.5 py-3 text-right tabular-nums align-middle">
                                            {totalDeduction > 0 ? (
                                                <div>
                                                    <div className="text-rose-600 font-bold">-{formatVND(totalDeduction)}</div>
                                                    {row.latePenalties > 0 && (
                                                        <div className="text-[10px] text-rose-500 font-semibold">Phạt: -{formatVND(row.latePenalties)}</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">0 ₫</span>
                                            )}
                                        </td>

                                        <td className="px-3.5 py-3 text-right tabular-nums align-middle">
                                            <span className="text-emerald-800 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                                                {formatVND(row.netSalary)}
                                            </span>
                                        </td>

                                        <td className="px-3.5 py-3 text-center align-middle">
                                            {row.status === 'DRAFT' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickStatus(row.id, 'APPROVED')}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                                                    title="Bấm để Chốt duyệt phiếu lương"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                    Bản nháp
                                                </button>
                                            )}
                                            {row.status === 'APPROVED' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickStatus(row.id, 'PAID')}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                                                    title="Bấm để Xác nhận đã chi trả"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Đã duyệt
                                                </button>
                                            )}
                                            {row.status === 'PAID' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-[11px] font-semibold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                    Đã chi trả
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-3.5 py-3 text-center align-middle">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingSlipRecord(row)}
                                                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                                                    title="Xem & In Phiếu Lương (Payslip)"
                                                >
                                                    <Printer size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(row)}
                                                    className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                                                    title="Điều chỉnh thưởng, phụ cấp, tạm ứng, giảm trừ"
                                                >
                                                    <FileEdit size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRecord(row.id, row.user.name || '')}
                                                    className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                                                    title="Xóa phiếu lương này"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={11} className="py-14 text-center text-xs font-medium text-slate-500">
                                        Không tìm thấy dữ liệu bảng lương phù hợp. Hãy bấm <strong>"Tính Lại Bảng Lương"</strong> hoặc kiểm tra bộ lọc.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                        {filteredRecords.length > 0 && (
                            <tfoot className="bg-slate-50/90 border-t border-slate-200 tabular-nums text-xs font-bold text-slate-900">
                                <tr>
                                    <td colSpan={2} className="px-3.5 py-3 text-left uppercase text-slate-600 tracking-wider">
                                        TỔNG CỘNG ({filteredRecords.length} Nhân Sự)
                                    </td>
                                    <td className="px-3.5 py-3 text-right text-slate-900">
                                        {formatVND(summaryKPI.totalBaseSalary)}
                                    </td>
                                    <td className="px-3.5 py-3 text-center text-slate-400 font-normal">
                                        -
                                    </td>
                                    <td className="px-3.5 py-3 text-right text-slate-900">
                                        +{formatVND(summaryKPI.totalAllowances + summaryKPI.totalOT)}
                                    </td>
                                    <td className="px-3.5 py-3 text-right text-emerald-700">
                                        +{formatVND(summaryKPI.totalBonus)}
                                    </td>
                                    <td className="px-3.5 py-3 text-right text-rose-600">
                                        -{formatVND(summaryKPI.totalAdvance)}
                                    </td>
                                    <td className="px-3.5 py-3 text-right text-rose-600">
                                        -{formatVND(summaryKPI.totalDeduction)}
                                    </td>
                                    <td className="px-3.5 py-3 text-right font-bold text-sm text-emerald-800 bg-emerald-50/70">
                                        {formatVND(summaryKPI.totalNet)}
                                    </td>
                                    <td colSpan={2} className="px-3.5 py-3 text-center text-slate-400 font-normal">
                                        -
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* MODAL ĐIỀU CHỈNH CHI TIẾT LƯƠNG */}
            <Modal
                isOpen={!!editingRecord}
                onClose={() => setEditingRecord(null)}
                title={`Điều Chỉnh Chi Tiết Lương: ${editingRecord?.user.name || ''}`}
                maxWidth="700px"
            >
                {editingRecord && (
                    <form onSubmit={handleSaveEdit} className="space-y-4 font-sans text-slate-800">
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold flex items-center justify-center text-sm">
                                    {getInitials(editingRecord.user.name)}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">{editingRecord.user.name}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {editingRecord.user.employeeProfile?.department || 'Chưa phân ban'} • {editingRecord.user.employeeProfile?.position || 'Nhân viên'}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 tabular-nums">
                                    Kỳ Lương: T{editingRecord.month}/{editingRecord.year}
                                </span>
                            </div>
                        </div>

                        {/* SECTION 1 */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-emerald-200 m-0">
                                <ArrowUpRight size={15} className="text-emerald-600" /> 1. Các Khoản Thu Nhập (Earnings)
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Lương Cơ Bản (VNĐ)</label>
                                    <input
                                        type="number"
                                        style={{ fontFamily: 'inherit', fontSize: '0.75rem' }}
                                        className="w-full h-[36px] px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none tabular-nums font-bold text-slate-900"
                                        value={editForm.baseSalary}
                                        onChange={e => setEditForm({ ...editForm, baseSalary: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Số Ngày Công Thực Tế (/26)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        style={{ fontFamily: 'inherit', fontSize: '0.75rem' }}
                                        className="w-full h-[36px] px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none tabular-nums font-bold text-slate-900"
                                        value={editForm.workDays}
                                        onChange={e => setEditForm({ ...editForm, workDays: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Phụ Cấp (Ăn trưa, xăng xe...)</label>
                                    <input
                                        type="number"
                                        style={{ fontFamily: 'inherit', fontSize: '0.75rem' }}
                                        className="w-full h-[36px] px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none tabular-nums font-bold text-slate-900"
                                        value={editForm.allowances}
                                        onChange={e => setEditForm({ ...editForm, allowances: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Thưởng Doanh Số / KPI (VNĐ)</label>
                                    <input
                                        type="number"
                                        style={{ fontFamily: 'inherit', fontSize: '0.75rem' }}
                                        className="w-full h-[36px] px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none tabular-nums font-bold text-emerald-700"
                                        value={editForm.commissionBonus}
                                        onChange={e => setEditForm({ ...editForm, commissionBonus: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Thưởng Thêm / Dự Án Khác (VNĐ)</label>
                                    <input
                                        type="number"
                                        style={{ fontFamily: 'inherit', fontSize: '0.75rem' }}
                                        className="w-full h-[36px] px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none tabular-nums font-bold text-emerald-700"
                                        value={editForm.bonus}
                                        onChange={e => setEditForm({ ...editForm, bonus: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Tiền Tăng Ca OT (VNĐ)</label>
                                    <input
                                        type="number"
                                        style={{ fontFamily: 'inherit', fontSize: '0.75rem' }}
                                        className="w-full h-[36px] px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none tabular-nums font-bold text-indigo-700"
                                        value={editForm.otSalary}
                                        onChange={e => setEditForm({ ...editForm, otSalary: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2 */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-rose-200 m-0">
                                <ArrowDownRight size={15} className="text-rose-600" /> 2. Các Khoản Giảm Trừ & Tạm Ứng (Deductions)
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Tạm Ứng Đã Nhận Trong Tháng (VNĐ)</label>
                                    <input
                                        type="number"
                                        style={{ fontFamily: 'inherit', fontSize: '0.75rem' }}
                                        className="w-full h-[36px] px-3 bg-rose-50/40 border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500/15 focus:border-rose-500 outline-none tabular-nums font-bold text-rose-700"
                                        value={editForm.advancePayment}
                                        onChange={e => setEditForm({ ...editForm, advancePayment: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Phạt Đi Muộn / Kỷ Luật (VNĐ)</label>
                                    <input
                                        type="number"
                                        style={{ fontFamily: 'inherit', fontSize: '0.75rem' }}
                                        className="w-full h-[36px] px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500/15 focus:border-rose-500 outline-none tabular-nums font-bold text-rose-600"
                                        value={editForm.latePenalties}
                                        onChange={e => setEditForm({ ...editForm, latePenalties: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Trừ BHXH / BHYT / BHTN (VNĐ)</label>
                                    <input
                                        type="number"
                                        style={{ fontFamily: 'inherit', fontSize: '0.75rem' }}
                                        className="w-full h-[36px] px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500/15 focus:border-rose-500 outline-none tabular-nums font-bold text-slate-900"
                                        value={editForm.insuranceDeduction}
                                        onChange={e => setEditForm({ ...editForm, insuranceDeduction: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Thuế TNCN Tạm Tính (VNĐ)</label>
                                    <input
                                        type="number"
                                        style={{ fontFamily: 'inherit', fontSize: '0.75rem' }}
                                        className="w-full h-[36px] px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500/15 focus:border-rose-500 outline-none tabular-nums font-bold text-slate-900"
                                        value={editForm.taxDeduction}
                                        onChange={e => setEditForm({ ...editForm, taxDeduction: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Khoản Giảm Trừ Khác (VNĐ)</label>
                                    <input
                                        type="number"
                                        style={{ fontFamily: 'inherit', fontSize: '0.75rem' }}
                                        className="w-full h-[36px] px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500/15 focus:border-rose-500 outline-none tabular-nums font-bold text-slate-900"
                                        value={editForm.deductions}
                                        onChange={e => setEditForm({ ...editForm, deductions: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Trạng Thái Phiếu Lương</label>
                                <div className="relative flex items-center h-[36px] bg-white border border-slate-300 rounded-lg px-3">
                                    <select
                                        value={editForm.status}
                                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                        style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '0.75rem' }}
                                        className="w-full h-full appearance-none pr-5 font-semibold text-slate-800 bg-transparent border-none outline-none cursor-pointer"
                                    >
                                        <option value="DRAFT">Bản nháp (DRAFT)</option>
                                        <option value="APPROVED">Đã duyệt (APPROVED)</option>
                                        <option value="PAID">Đã chi trả (PAID)</option>
                                    </select>
                                    <ChevronDown size={13} className="text-slate-400 pointer-events-none absolute right-2.5" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Ghi Chú Giải Trình</label>
                                <input
                                    type="text"
                                    placeholder="Lý do thưởng nóng, phạt, tạm ứng..."
                                    style={{ fontFamily: 'inherit', fontSize: '0.75rem' }}
                                    className="w-full h-[36px] px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 outline-none font-medium text-slate-900"
                                    value={editForm.notes || ''}
                                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* LIVE PREVIEW CALCULATION BOX */}
                        <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2 shadow-sm">
                            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Xem Trước Kết Quả Tính Lương Tức Thì</span>
                                <span className="text-[10px] font-normal text-slate-400">Tự động tính theo số liệu đã nhập</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2.5 text-xs pt-2 border-t border-slate-800">
                                <div>
                                    <div className="text-slate-400 font-medium">Tổng Thu Nhập:</div>
                                    <div className="font-bold tabular-nums text-sm text-white mt-0.5">{formatVND(previewCalc.gross)}</div>
                                </div>
                                <div>
                                    <div className="text-rose-400 font-medium">Tổng Giảm Trừ:</div>
                                    <div className="font-bold tabular-nums text-sm text-rose-300 mt-0.5">-{formatVND(previewCalc.totalDed)}</div>
                                </div>
                                <div>
                                    <div className="text-emerald-400 font-medium">Thực Lĩnh (Net):</div>
                                    <div className="font-bold tabular-nums text-base text-amber-300 mt-0.5">{formatVND(previewCalc.net)}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2.5 justify-end pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setEditingRecord(null)}
                                className="h-[36px] px-4 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                            >
                                Đóng
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="h-[36px] px-4 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer border-none"
                            >
                                {loading ? 'Đang lưu...' : 'Lưu Thay Đổi & Cập Nhật'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {viewingSlipRecord && (
                <PrintPayslipModal
                    record={viewingSlipRecord}
                    companyInfo={companyInfo}
                    onClose={() => setViewingSlipRecord(null)}
                />
            )}
        </div>
    );
}
