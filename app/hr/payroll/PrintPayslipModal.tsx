'use client';

import React, { useEffect } from 'react';
import { X, Printer, ArrowLeft, Sparkles, Building2, User, CreditCard, ShieldCheck } from 'lucide-react';
import { numberToVietnameseWords, formatVND } from '@/lib/vietnameseCurrency';

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

export interface PayrollRecord {
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
    record: PayrollRecord;
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
        city?: string;
    };
    onClose: () => void;
}

export default function PrintPayslipModal({ record, companyInfo, onClose }: Props) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!record) return null;

    const actualSalary = Math.round((record.baseSalary / 26) * record.workDays);
    const totalGross = actualSalary + (record.allowances || 0) + (record.commissionBonus || 0) + (record.bonus || 0) + (record.otSalary || 0);
    const totalDed = (record.latePenalties || 0) + (record.advancePayment || 0) + (record.insuranceDeduction || 0) + (record.taxDeduction || 0) + (record.deductions || 0);
    const netSalary = record.netSalary || Math.max(0, totalGross - totalDed);

    const docCode = `PL-${record.month.toString().padStart(2, '0')}${record.year}-${record.user.id.slice(-4).toUpperCase()}`;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto print-payslip-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* CSS In Ấn: 2 Cột Song Song Cân Đối & Trọn Vẹn 1 Trang A4 Không Bị Tràn */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 6mm 10mm;
                    }
                    html, body {
                        background: #ffffff !important;
                        color: #0f172a !important;
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Ẩn tất cả phần tử khác trên trang */
                    body * {
                        visibility: hidden !important;
                    }
                    /* Chỉ hiển thị duy nhất khu vực phiếu lương */
                    .print-payslip-overlay,
                    .print-payslip-overlay * {
                        visibility: visible !important;
                    }
                    .print-payslip-overlay {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: transparent !important;
                        backdrop-filter: none !important;
                        display: block !important;
                        overflow: visible !important;
                        z-index: 9999999 !important;
                    }
                    .print-payslip-paper {
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 10px 15px !important;
                        border: none !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        background: #ffffff !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    /* Ép 2 cột luôn luôn song song khi in */
                    .payslip-dual-columns {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 14px !important;
                        margin-top: 10px !important;
                        margin-bottom: 10px !important;
                    }
                    .payslip-info-grid {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 8px !important;
                    }
                    .no-print,
                    .print\\:hidden {
                        display: none !important;
                        visibility: hidden !important;
                    }
                }
            `}</style>

            {/* Khung Chứa Phiếu Lương Rộng Rãi, Chuẩn Tỉ Lệ A4 Cho Desktop & Chụp Ảnh */}
            <div className="w-full max-w-4xl my-6 space-y-3.5">
                {/* Thanh Điều Khiển Đầu Trang (Ẩn Khi In) */}
                <div className="bg-slate-900/90 text-white p-3 px-5 rounded-2xl border border-slate-700 shadow-2xl flex flex-wrap items-center justify-between gap-3 backdrop-blur-md no-print">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-100">
                                Phiếu Lương: <span className="text-emerald-400">{record.user.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                                Thiết kế 2 cột song song chuẩn A4 • Gọn gàng, vừa khít 1 trang in & sắc nét khi chụp ảnh
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={handlePrint}
                            className="px-4.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                        >
                            <Printer size={16} />
                            <span>In Phiếu Lương</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Đóng (ESC)"
                        >
                            <X size={16} />
                            <span>Đóng</span>
                        </button>
                    </div>
                </div>

                {/* ================= KHUNG GIẤY PHIẾU LƯƠNG CHÍNH (A4 CANVAS) ================= */}
                <div className="print-payslip-paper bg-white p-7 sm:p-9 rounded-2xl border border-slate-300 shadow-2xl font-sans text-slate-900">
                    {/* Header: Thông Tin Doanh Nghiệp & Mã Số Phiếu */}
                    <div className="border-b-2 border-slate-800 pb-3.5 flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1 max-w-2xl">
                            <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-950">
                                {companyInfo?.fullName || companyInfo?.displayName || companyInfo?.name || 'CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ TSOL'}
                            </h2>
                            {companyInfo?.address && (
                                <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                                    <span className="font-semibold text-slate-700">Địa chỉ:</span> {companyInfo.address}
                                </p>
                            )}
                            <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-0.5 pt-0.5">
                                {companyInfo?.taxCode && (
                                    <span>Mã số thuế: <strong className="text-slate-900 font-mono">{companyInfo.taxCode}</strong></span>
                                )}
                                {companyInfo?.phone && (
                                    <span>Hotline/SĐT: <strong className="text-slate-900">{companyInfo.phone}</strong></span>
                                )}
                                {companyInfo?.email && (
                                    <span>Email: <strong className="text-slate-900 font-normal">{companyInfo.email}</strong></span>
                                )}
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <div className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800">
                                Mã PL: {docCode}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                Ngày lập: {new Date().toLocaleDateString('vi-VN')}
                            </div>
                        </div>
                    </div>

                    {/* Tiêu Đề Phiếu Lương & Kỳ Lương */}
                    <div className="text-center my-3.5 sm:my-4">
                        <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-950 tracking-wider">
                            PHIẾU LƯƠNG NHÂN VIÊN
                        </h1>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <span className="text-xs sm:text-sm font-bold text-slate-700">
                                Kỳ tính lương: <strong className="text-slate-950">Tháng {record.month} năm {record.year}</strong>
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                record.status === 'PAID' 
                                    ? 'bg-blue-50 text-blue-800 border-blue-200' 
                                    : record.status === 'APPROVED' 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                                {record.status === 'PAID' ? 'Đã chi trả' : record.status === 'APPROVED' ? 'Đã duyệt' : 'Bản nháp'}
                            </span>
                        </div>
                    </div>

                    {/* Khung Thông Tin Chi Tiết Nhân Sự (3 Cột Gọn Gàng) */}
                    <div className="bg-slate-50/90 p-3.5 sm:p-4 rounded-xl border border-slate-200 mb-3.5">
                        <div className="payslip-info-grid grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                            <div>
                                <span className="text-slate-500 font-medium">Họ và tên:</span>{' '}
                                <strong className="text-slate-950 font-bold">{record.user.name}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Mã nhân sự:</span>{' '}
                                <span className="font-mono font-bold text-slate-900">{record.user.id.slice(-6).toUpperCase()}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Phòng ban:</span>{' '}
                                <strong className="text-slate-900">{record.user.employeeProfile?.department || 'Chưa phân ban'}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Chức vụ:</span>{' '}
                                <strong className="text-slate-900">{record.user.employeeProfile?.position || 'Nhân viên'}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Ngày công chuẩn:</span>{' '}
                                <strong className="text-slate-900 font-mono">26 công</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Ngày công tính lương:</span>{' '}
                                <strong className="text-emerald-700 font-mono font-bold">{record.workDays} / 26 công</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Mã số thuế:</span>{' '}
                                <span className="font-mono font-bold text-slate-900">{record.user.employeeProfile?.taxCode || '---'}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Số tài khoản nhận:</span>{' '}
                                <span className="font-mono font-bold text-slate-900">{record.user.employeeProfile?.bankAccount || '---'}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Ngân hàng thụ hưởng:</span>{' '}
                                <strong className="text-slate-900">{record.user.employeeProfile?.bankName || '---'}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Bảng Chi Tiết 2 CỘT SONG SONG (EARNINGS & DEDUCTIONS) */}
                    <div className="payslip-dual-columns grid grid-cols-2 gap-4 my-3.5">
                        {/* CỘT TRÁI: CÁC KHOẢN THU NHẬP */}
                        <div className="border border-slate-300 rounded-xl overflow-hidden flex flex-col justify-between">
                            <div>
                                <div className="bg-emerald-700 text-white px-3.5 py-2 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
                                    <span>I. Các Khoản Thu Nhập (Earnings)</span>
                                    <span className="text-[10px] font-medium text-emerald-200">VNĐ</span>
                                </div>
                                <div className="divide-y divide-slate-100 text-xs">
                                    <div className="flex justify-between py-1.5 px-3">
                                        <span className="text-slate-700">1. Lương cơ bản hợp đồng:</span>
                                        <span className="font-mono font-bold text-slate-900">{formatVND(record.baseSalary)}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 px-3 bg-emerald-50/40">
                                        <span className="text-slate-800 font-semibold">2. Lương thực tế ({record.workDays}/26 công):</span>
                                        <span className="font-mono font-bold text-emerald-800">{formatVND(actualSalary)}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 px-3">
                                        <span className="text-slate-700">3. Phụ cấp cố định:</span>
                                        <span className="font-mono font-bold text-slate-900">{formatVND(record.allowances)}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 px-3">
                                        <span className="text-slate-700">4. Thưởng doanh số / KPI:</span>
                                        <span className="font-mono font-bold text-amber-700">{formatVND(record.commissionBonus)}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 px-3">
                                        <span className="text-slate-700">5. Thưởng hiệu quả / Khác:</span>
                                        <span className="font-mono font-bold text-emerald-700">{formatVND(record.bonus)}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 px-3">
                                        <span className="text-slate-700">6. Tiền làm thêm giờ (OT):</span>
                                        <span className="font-mono font-bold text-indigo-700">{formatVND(record.otSalary)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Dòng Tổng Thu Nhập A */}
                            <div className="flex justify-between py-2 px-3 bg-emerald-100/90 font-black text-emerald-950 border-t-2 border-emerald-400 text-xs">
                                <span>TỔNG THU NHẬP (A):</span>
                                <span className="font-mono text-sm text-emerald-900">{formatVND(totalGross)}</span>
                            </div>
                        </div>

                        {/* CỘT PHẢI: CÁC KHOẢN KHẤU TRỪ & TẠM ỨNG */}
                        <div className="border border-slate-300 rounded-xl overflow-hidden flex flex-col justify-between">
                            <div>
                                <div className="bg-rose-700 text-white px-3.5 py-2 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
                                    <span>II. Các Khoản Khấu Trừ & Tạm Ứng</span>
                                    <span className="text-[10px] font-medium text-rose-200">VNĐ</span>
                                </div>
                                <div className="divide-y divide-slate-100 text-xs">
                                    <div className="flex justify-between py-1.5 px-3 bg-rose-50/70">
                                        <span className="text-rose-950 font-bold">1. Tạm ứng đã nhận trong tháng:</span>
                                        <span className="font-mono font-black text-rose-700">{formatVND(record.advancePayment)}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 px-3">
                                        <span className="text-slate-700">2. Phạt đi muộn / Kỷ luật:</span>
                                        <span className="font-mono font-bold text-rose-600">{formatVND(record.latePenalties)}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 px-3">
                                        <span className="text-slate-700">3. Trừ BHXH / BHYT / BHTN:</span>
                                        <span className="font-mono font-bold text-slate-900">{formatVND(record.insuranceDeduction)}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 px-3">
                                        <span className="text-slate-700">4. Thuế TNCN tạm nộp:</span>
                                        <span className="font-mono font-bold text-slate-900">{formatVND(record.taxDeduction)}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 px-3">
                                        <span className="text-slate-700">5. Các khoản giảm trừ khác:</span>
                                        <span className="font-mono font-bold text-slate-900">{formatVND(record.deductions)}</span>
                                    </div>
                                    {/* Dòng cân bằng chiều cao 2 cột */}
                                    <div className="flex justify-between py-1.5 px-3 invisible">
                                        <span>-</span>
                                        <span>-</span>
                                    </div>
                                </div>
                            </div>

                            {/* Dòng Tổng Khấu Trừ B */}
                            <div className="flex justify-between py-2 px-3 bg-rose-100/90 font-black text-rose-950 border-t-2 border-rose-400 text-xs">
                                <span>TỔNG KHẤU TRỪ (B):</span>
                                <span className="font-mono text-sm text-rose-900">{formatVND(totalDed)}</span>
                            </div>
                        </div>
                    </div>

                    {/* KHUNG THỰC LĨNH CAO CẤP MÀU XANH THƯƠNG HIỆU */}
                    <div className="bg-emerald-800 text-white p-4.5 sm:p-5 rounded-xl my-3.5 shadow-md border border-emerald-700">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="text-xs font-black text-emerald-100 uppercase tracking-widest">
                                    III. LƯƠNG THỰC LĨNH CHUYỂN KHOẢN (A - B)
                                </div>
                                <div className="text-xs text-emerald-100/90 italic mt-1">
                                    Bằng chữ: <strong className="text-yellow-300 not-italic font-semibold">{numberToVietnameseWords(netSalary)}</strong>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight drop-shadow-xs">
                                    {formatVND(netSalary)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ghi Chú Giải Trình Nếu Có */}
                    {record.notes && (
                        <div className="text-xs text-slate-800 bg-amber-50/80 p-3 rounded-lg border border-amber-300 mb-3.5">
                            <span className="font-bold text-amber-900">📝 Ghi chú giải trình:</span> {record.notes}
                        </div>
                    )}

                    {/* Chữ Ký 3 Bên Chuẩn Doanh Nghiệp (Vừa Khít 1 Trang A4) */}
                    <div className="grid grid-cols-3 gap-4 text-center text-xs mt-6 pt-4 border-t-2 border-slate-300">
                        <div>
                            <div className="font-extrabold text-slate-950 uppercase tracking-tight">Người Lập Biểu</div>
                            <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, họ tên)</div>
                            <div className="h-14 sm:h-16"></div>
                            <div className="font-bold text-slate-900 text-xs">Phòng Nhân Sự</div>
                        </div>

                        <div>
                            <div className="font-extrabold text-slate-950 uppercase tracking-tight">Kế Toán Trưởng / Giám Đốc</div>
                            <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, họ tên, đóng dấu)</div>
                            <div className="h-14 sm:h-16"></div>
                            <div className="font-bold text-slate-900 text-xs">Ban Giám Đốc</div>
                        </div>

                        <div>
                            <div className="font-extrabold text-slate-950 uppercase tracking-tight">Người Nhận Lương</div>
                            <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                            <div className="h-14 sm:h-16 flex items-end justify-center">
                                <span className="font-bold text-slate-950 text-xs sm:text-sm">{record.user.name}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Thanh Đáy Nhanh (Ẩn Khi In) */}
                <div className="flex items-center justify-between no-print px-2 text-xs text-slate-400">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition border border-slate-700 cursor-pointer"
                    >
                        <ArrowLeft size={15} />
                        <span>Quay Lại Danh Sách</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
                    >
                        <Printer size={15} />
                        <span>In Phiếu Lương Ngay</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
