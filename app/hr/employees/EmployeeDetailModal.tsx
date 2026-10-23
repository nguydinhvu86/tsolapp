'use client';

import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useRef } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import {
    updateEmployeeProfile,
    createLaborContract,
    deleteLaborContract,
    EmployeeProfilePayload
} from './actions';
import {
    Save, FileText, CreditCard, CalendarDays,
    UploadCloud, Briefcase, Wallet, GraduationCap,
    MapPin, User, Printer, Trash2,
    CheckCircle, ChevronDown, Plus, Building2, Phone, Mail
} from 'lucide-react';
import { formatVND } from '@/lib/vietnameseCurrency';

interface Props {
    employee: any;
    isOpen: boolean;
    onClose: () => void;
    onUpdated: (updatedEmployee: any) => void;
}

const inputBaseStyle: React.CSSProperties = {
    fontFamily: 'inherit',
    fontSize: '0.75rem',
    lineHeight: '1rem',
};

export default function EmployeeDetailModal({ employee, isOpen, onClose, onUpdated }: Props) {
    const printRef = useRef<HTMLDivElement>(null);
    const [tab, setTab] = useState<'PERSONAL' | 'JOB' | 'SALARY' | 'EDUCATION' | 'CONTRACTS'>('PERSONAL');
    const [loading, setLoading] = useState(false);

    // Profile Form State đầy đủ
    const [profile, setProfile] = useState<EmployeeProfilePayload>({
        employeeCode: employee.employeeProfile?.employeeCode || `NV-${employee.id.slice(-4).toUpperCase()}`,
        identityNumber: employee.employeeProfile?.identityNumber || '',
        identityDate: employee.employeeProfile?.identityDate ? new Date(employee.employeeProfile.identityDate).toISOString().split('T')[0] : '',
        identityPlace: employee.employeeProfile?.identityPlace || 'Cục CS QLHC về TTXH',
        taxCode: employee.employeeProfile?.taxCode || '',
        bankAccount: employee.employeeProfile?.bankAccount || '',
        bankName: employee.employeeProfile?.bankName || '',
        bankBranch: employee.employeeProfile?.bankBranch || '',
        dob: employee.employeeProfile?.dob ? new Date(employee.employeeProfile.dob).toISOString().split('T')[0] : '',
        gender: employee.employeeProfile?.gender || 'MALE',
        placeOfOrigin: employee.employeeProfile?.placeOfOrigin || '',
        permanentAddress: employee.employeeProfile?.permanentAddress || employee.employeeProfile?.address || '',
        currentAddress: employee.employeeProfile?.currentAddress || employee.employeeProfile?.address || '',
        phoneNumber: employee.employeeProfile?.phoneNumber || '',
        personalEmail: employee.employeeProfile?.personalEmail || '',
        nationality: employee.employeeProfile?.nationality || 'Việt Nam',
        ethnicity: employee.employeeProfile?.ethnicity || 'Kinh',
        maritalStatus: employee.employeeProfile?.maritalStatus || 'SINGLE',
        emergencyContact: employee.employeeProfile?.emergencyContact || '',
        emergencyPhone: employee.employeeProfile?.emergencyPhone || '',

        department: employee.employeeProfile?.department || employee.department || '',
        position: employee.employeeProfile?.position || '',
        employmentStatus: employee.employeeProfile?.employmentStatus || 'OFFICIAL',
        workLocation: employee.employeeProfile?.workLocation || 'Văn phòng chính',
        startDate: employee.employeeProfile?.startDate ? new Date(employee.employeeProfile.startDate).toISOString().split('T')[0] : '',
        probationEndDate: employee.employeeProfile?.probationEndDate ? new Date(employee.employeeProfile.probationEndDate).toISOString().split('T')[0] : '',
        officialStartDate: employee.employeeProfile?.officialStartDate ? new Date(employee.employeeProfile.officialStartDate).toISOString().split('T')[0] : '',
        resignationDate: employee.employeeProfile?.resignationDate ? new Date(employee.employeeProfile.resignationDate).toISOString().split('T')[0] : '',

        baseSalary: employee.employeeProfile?.baseSalary || 0,
        insuranceSalary: employee.employeeProfile?.insuranceSalary || employee.employeeProfile?.baseSalary || 0,
        allowances: employee.employeeProfile?.allowances || 0,
        socialInsuranceNumber: employee.employeeProfile?.socialInsuranceNumber || '',
        healthInsuranceCardNumber: employee.employeeProfile?.healthInsuranceCardNumber || '',
        healthInsurancePlace: employee.employeeProfile?.healthInsurancePlace || '',

        educationLevel: employee.employeeProfile?.educationLevel || 'Đại học',
        major: employee.employeeProfile?.major || '',
        schoolName: employee.employeeProfile?.schoolName || '',
        graduationYear: employee.employeeProfile?.graduationYear || (new Date().getFullYear() - 3)
    });

    // Contract Form State
    const [showAddContract, setShowAddContract] = useState(false);
    const [contract, setContract] = useState({
        contractNumber: `HĐLĐ-${new Date().getFullYear()}-${employee.id.slice(-4).toUpperCase()}`,
        type: 'FULL_TIME',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        fileUrl: ''
    });

    // Lưu hồ sơ
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await updateEmployeeProfile(employee.id, profile);
            if (res.success && res.data) {
                toast.success('Đã cập nhật đầy đủ hồ sơ nhân sự thành công!');
                onUpdated({ ...employee, employeeProfile: res.data, department: res.data.department });
            } else {
                toast.error('Lỗi cập nhật: ' + (res.error || 'Có lỗi xảy ra'));
            }
        } catch (err: any) {
            toast.error('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Thêm hợp đồng
    const handleAddContract = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await createLaborContract(employee.id, contract);
            if (res.success && res.data) {
                toast.success('Đã thêm hợp đồng lao động thành công!');
                setShowAddContract(false);
                const currentContracts = employee.laborContracts || [];
                onUpdated({ ...employee, laborContracts: [...currentContracts, res.data] });
            } else {
                toast.error('Lỗi: ' + (res.error || 'Có lỗi xảy ra'));
            }
        } catch (err: any) {
            toast.error('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Xóa hợp đồng
    const handleDeleteContract = async (contractId: string) => {
        if (!confirm('Bạn có chắc muốn xóa hợp đồng này?')) return;
        setLoading(true);
        try {
            const res = await deleteLaborContract(contractId);
            if (res.success) {
                const filteredContracts = (employee.laborContracts || []).filter((c: any) => c.id !== contractId);
                onUpdated({ ...employee, laborContracts: filteredContracts });
            } else {
                toast.error('Lỗi: ' + res.error);
            }
        } catch (err: any) {
            toast.error('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrintProfile = () => {
        window.print();
    };

    const getInitials = (name?: string | null) => {
        if (!name) return 'NV';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const inputClass =
        "w-full h-[38px] px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all";
    const labelClass =
        "block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5";

    const renderSelect = (
        value: string,
        onChange: (val: string) => void,
        options: { value: string; label: string }[]
    ) => (
        <div className="relative flex items-center h-[38px] bg-white border border-slate-300 rounded-lg px-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent', ...inputBaseStyle }}
                className="w-full h-full appearance-none pr-5 text-xs font-semibold text-slate-800 bg-transparent border-none outline-none cursor-pointer"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <ChevronDown size={14} className="text-slate-400 pointer-events-none absolute right-2.5" />
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Hồ Sơ Nhân Sự: ${employee.name || ''}`}
            maxWidth="960px"
        >
            <div className="flex flex-col font-sans text-slate-800">
                <style jsx global>{`
                    @media print {
                        body * {
                            visibility: hidden !important;
                        }
                        #printable-employee-profile, #printable-employee-profile * {
                            visibility: visible !important;
                        }
                        #printable-employee-profile {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            background: white !important;
                            padding: 24px !important;
                            box-sizing: border-box !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}</style>

                {/* 1. HEADER INFO BANNER */}
                <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-xl flex flex-wrap items-center justify-between gap-4 no-print shadow-sm">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center border border-indigo-400/50 shadow-sm shrink-0">
                            {getInitials(employee.name)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-bold text-white tracking-tight m-0">
                                    {employee.name}
                                </h3>
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                    profile.employmentStatus === 'OFFICIAL'
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        : profile.employmentStatus === 'PROBATION'
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                        : profile.employmentStatus === 'RESIGNED'
                                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                        : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                }`}>
                                    {profile.employmentStatus === 'OFFICIAL'
                                        ? 'Chính thức'
                                        : profile.employmentStatus === 'PROBATION'
                                        ? 'Thử việc'
                                        : profile.employmentStatus === 'RESIGNED'
                                        ? 'Đã thôi việc'
                                        : 'Thực tập sinh'}
                                </span>
                            </div>
                            <div className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                                <span>Mã NV: <strong className="text-white tabular-nums">{profile.employeeCode || '---'}</strong></span>
                                <span className="text-slate-600">•</span>
                                <span>Phòng ban: <strong className="text-white">{profile.department || 'Chưa phân ban'}</strong></span>
                                <span className="text-slate-600">•</span>
                                <span>Chức vụ: <strong className="text-white">{profile.position || 'Nhân viên'}</strong></span>
                                {employee.email && (
                                    <>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-slate-300">{employee.email}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrintProfile}
                            className="h-[34px] px-3 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                            <Printer size={14} /> In Sơ Yếu Lý Lịch
                        </button>
                    </div>
                </div>

                {/* 2. 5 TABS NAVIGATION (Fits cleanly on 1 row without ugly horizontal scrollbar) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-slate-100 p-1.5 rounded-xl mt-3.5 no-print">
                    {[
                        { id: 'PERSONAL', label: '1. Sơ Yếu Lý Lịch', icon: User },
                        { id: 'JOB', label: '2. Công Việc & Tổ Chức', icon: Briefcase },
                        { id: 'SALARY', label: '3. Lương & BHXH', icon: Wallet },
                        { id: 'EDUCATION', label: '4. Học Vấn & Bằng Cấp', icon: GraduationCap },
                        { id: 'CONTRACTS', label: `5. Hợp Đồng (${employee.laborContracts?.length || 0})`, icon: FileText },
                    ].map(item => {
                        const Icon = item.icon;
                        const active = tab === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setTab(item.id as any)}
                                className={`h-[36px] px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none whitespace-nowrap ${
                                    active
                                        ? 'bg-white text-indigo-600 shadow-xs font-bold'
                                        : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                }`}
                            >
                                <Icon size={14} className="shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 3. FORM TỔNG HỢP (TAB 1 -> TAB 5) */}
                <div className="pt-4 min-h-[420px]">
                    {tab !== 'CONTRACTS' && (
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            {/* TAB 1: SƠ YẾU LÝ LỊCH & CÁ NHÂN */}
                            {tab === 'PERSONAL' && (
                                <div className="space-y-4">
                                    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3.5">
                                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                                            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 m-0">
                                                <User size={15} className="text-indigo-600" /> Thông Tin Nhân Thân & Căn Cước Công Dân
                                            </h4>
                                            <span className="text-[11px] text-slate-400">Thông tin định danh pháp lý</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                            <div>
                                                <label className={labelClass}>Mã Nhân Viên</label>
                                                <input
                                                    type="text"
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} font-bold tabular-nums`}
                                                    value={profile.employeeCode}
                                                    onChange={e => setProfile({ ...profile, employeeCode: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Số CMND / CCCD</label>
                                                <input
                                                    type="text"
                                                    placeholder="Nhập 12 số CCCD..."
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} font-semibold tabular-nums`}
                                                    value={profile.identityNumber}
                                                    onChange={e => setProfile({ ...profile, identityNumber: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Ngày Cấp CCCD</label>
                                                <input
                                                    type="date"
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} tabular-nums`}
                                                    value={profile.identityDate as string}
                                                    onChange={e => setProfile({ ...profile, identityDate: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Nơi Cấp CCCD</label>
                                                <input
                                                    type="text"
                                                    style={inputBaseStyle}
                                                    className={inputClass}
                                                    value={profile.identityPlace}
                                                    onChange={e => setProfile({ ...profile, identityPlace: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Ngày Sinh</label>
                                                <input
                                                    type="date"
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} tabular-nums`}
                                                    value={profile.dob as string}
                                                    onChange={e => setProfile({ ...profile, dob: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Giới Tính</label>
                                                {renderSelect(profile.gender || 'MALE', val => setProfile({ ...profile, gender: val }), [
                                                    { value: 'MALE', label: 'Nam' },
                                                    { value: 'FEMALE', label: 'Nữ' },
                                                    { value: 'OTHER', label: 'Khác' },
                                                ])}
                                            </div>
                                            <div>
                                                <label className={labelClass}>Quê Quán / Nguyên Quán</label>
                                                <input
                                                    type="text"
                                                    placeholder="Tỉnh / Thành phố..."
                                                    style={inputBaseStyle}
                                                    className={inputClass}
                                                    value={profile.placeOfOrigin}
                                                    onChange={e => setProfile({ ...profile, placeOfOrigin: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Dân Tộc / Quốc Tịch</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Dân tộc"
                                                        style={inputBaseStyle}
                                                        className={inputClass}
                                                        value={profile.ethnicity}
                                                        onChange={e => setProfile({ ...profile, ethnicity: e.target.value })}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Quốc tịch"
                                                        style={inputBaseStyle}
                                                        className={inputClass}
                                                        value={profile.nationality}
                                                        onChange={e => setProfile({ ...profile, nationality: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Tình Trạng Hôn Nhân</label>
                                                {renderSelect(profile.maritalStatus || 'SINGLE', val => setProfile({ ...profile, maritalStatus: val }), [
                                                    { value: 'SINGLE', label: 'Độc thân' },
                                                    { value: 'MARRIED', label: 'Đã kết hôn' },
                                                    { value: 'DIVORCED', label: 'Ly hôn' },
                                                    { value: 'OTHER', label: 'Khác' },
                                                ])}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Địa chỉ & Liên hệ */}
                                    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3.5">
                                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                                            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 m-0">
                                                <MapPin size={15} className="text-indigo-600" /> Địa Chỉ Cư Trú & Thông Tin Liên Hệ
                                            </h4>
                                            <span className="text-[11px] text-slate-400">Thông tin liên lạc khẩn cấp</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                            <div>
                                                <label className={labelClass}>Địa Chỉ Thường Trú (Hộ khẩu)</label>
                                                <input
                                                    type="text"
                                                    placeholder="Số nhà, đường, phường/xã, tỉnh/thành..."
                                                    style={inputBaseStyle}
                                                    className={inputClass}
                                                    value={profile.permanentAddress}
                                                    onChange={e => setProfile({ ...profile, permanentAddress: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Địa Chỉ Tạm Trú / Nơi Ở Hiện Nay</label>
                                                <input
                                                    type="text"
                                                    placeholder="Địa chỉ đang sinh sống hiện tại..."
                                                    style={inputBaseStyle}
                                                    className={inputClass}
                                                    value={profile.currentAddress}
                                                    onChange={e => setProfile({ ...profile, currentAddress: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Điện Thoại Di Động Cá Nhân</label>
                                                <input
                                                    type="text"
                                                    placeholder="09xx xxx xxx"
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} font-semibold tabular-nums`}
                                                    value={profile.phoneNumber}
                                                    onChange={e => setProfile({ ...profile, phoneNumber: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Email Cá Nhân (Ngoài công ty)</label>
                                                <input
                                                    type="email"
                                                    placeholder="example@gmail.com"
                                                    style={inputBaseStyle}
                                                    className={inputClass}
                                                    value={profile.personalEmail}
                                                    onChange={e => setProfile({ ...profile, personalEmail: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Người Liên Hệ Khẩn Cấp</label>
                                                <input
                                                    type="text"
                                                    placeholder="VD: Nguyễn Văn A (Bố/Mẹ/Vợ/Chồng)"
                                                    style={inputBaseStyle}
                                                    className={inputClass}
                                                    value={profile.emergencyContact}
                                                    onChange={e => setProfile({ ...profile, emergencyContact: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>SĐT Người Liên Hệ Khẩn Cấp</label>
                                                <input
                                                    type="text"
                                                    placeholder="09xx xxx xxx"
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} font-semibold tabular-nums`}
                                                    value={profile.emergencyPhone}
                                                    onChange={e => setProfile({ ...profile, emergencyPhone: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: CÔNG VIỆC & TỔ CHỨC */}
                            {tab === 'JOB' && (
                                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3.5">
                                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 m-0">
                                            <Briefcase size={15} className="text-indigo-600" /> Thông Tin Công Việc, Phòng Ban & Mốc Thời Gian
                                        </h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                        <div>
                                            <label className={labelClass}>Phòng Ban</label>
                                            <input
                                                type="text"
                                                placeholder="VD: Phòng Kinh Doanh, Kỹ Thuật..."
                                                style={inputBaseStyle}
                                                className={`${inputClass} font-semibold`}
                                                value={profile.department}
                                                onChange={e => setProfile({ ...profile, department: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Chức Vụ / Vị Trí</label>
                                            <input
                                                type="text"
                                                placeholder="VD: Trưởng Phòng, Chuyên Viên..."
                                                style={inputBaseStyle}
                                                className={`${inputClass} font-semibold`}
                                                value={profile.position}
                                                onChange={e => setProfile({ ...profile, position: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Trạng Thái Làm Việc</label>
                                            {renderSelect(profile.employmentStatus || 'OFFICIAL', val => setProfile({ ...profile, employmentStatus: val }), [
                                                { value: 'OFFICIAL', label: 'Chính thức (OFFICIAL)' },
                                                { value: 'PROBATION', label: 'Thử việc (PROBATION)' },
                                                { value: 'INTERN', label: 'Thực tập sinh (INTERN)' },
                                                { value: 'RESIGNED', label: 'Đã thôi việc (RESIGNED)' },
                                            ])}
                                        </div>
                                        <div>
                                            <label className={labelClass}>Địa Điểm Làm Việc</label>
                                            <input
                                                type="text"
                                                placeholder="VD: Văn phòng chính, Chi nhánh..."
                                                style={inputBaseStyle}
                                                className={inputClass}
                                                value={profile.workLocation}
                                                onChange={e => setProfile({ ...profile, workLocation: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Ngày Nhận Việc (Start Date)</label>
                                            <input
                                                type="date"
                                                style={inputBaseStyle}
                                                className={`${inputClass} tabular-nums`}
                                                value={profile.startDate as string}
                                                onChange={e => setProfile({ ...profile, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Ngày Kết Thúc Thử Việc</label>
                                            <input
                                                type="date"
                                                style={inputBaseStyle}
                                                className={`${inputClass} tabular-nums`}
                                                value={profile.probationEndDate as string}
                                                onChange={e => setProfile({ ...profile, probationEndDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Ngày Vào Chính Thức</label>
                                            <input
                                                type="date"
                                                style={inputBaseStyle}
                                                className={`${inputClass} tabular-nums`}
                                                value={profile.officialStartDate as string}
                                                onChange={e => setProfile({ ...profile, officialStartDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Ngày Thôi Việc (Nếu có)</label>
                                            <input
                                                type="date"
                                                style={inputBaseStyle}
                                                className={`${inputClass} tabular-nums`}
                                                value={profile.resignationDate as string}
                                                onChange={e => setProfile({ ...profile, resignationDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: LƯƠNG & PHÚC LỢI - BHXH */}
                            {tab === 'SALARY' && (
                                <div className="space-y-4">
                                    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3.5">
                                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5 m-0">
                                            <CreditCard size={15} className="text-indigo-600" /> Chế Độ Lương & Phụ Cấp Định Kỳ
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                            <div>
                                                <label className={labelClass}>Lương Cơ Bản (VNĐ / Tháng)</label>
                                                <input
                                                    type="number"
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} font-bold text-emerald-700 bg-emerald-50/30 border-emerald-300 tabular-nums`}
                                                    value={profile.baseSalary}
                                                    onChange={e => setProfile({ ...profile, baseSalary: parseFloat(e.target.value) || 0 })}
                                                />
                                                <p className="text-[11px] text-slate-500 mt-1 m-0">
                                                    Hiển thị: <strong className="text-emerald-700 tabular-nums">{formatVND(profile.baseSalary || 0)}</strong>
                                                </p>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Mức Lương Đóng BHXH (VNĐ)</label>
                                                <input
                                                    type="number"
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} font-bold tabular-nums`}
                                                    value={profile.insuranceSalary}
                                                    onChange={e => setProfile({ ...profile, insuranceSalary: parseFloat(e.target.value) || 0 })}
                                                />
                                                <p className="text-[11px] text-slate-500 mt-1 m-0">
                                                    Hiển thị: <strong className="text-slate-700 tabular-nums">{formatVND(profile.insuranceSalary || 0)}</strong>
                                                </p>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Phụ Cấp Cố Định (VNĐ)</label>
                                                <input
                                                    type="number"
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} font-bold tabular-nums`}
                                                    value={profile.allowances}
                                                    onChange={e => setProfile({ ...profile, allowances: parseFloat(e.target.value) || 0 })}
                                                />
                                                <p className="text-[11px] text-slate-500 mt-1 m-0">
                                                    Hiển thị: <strong className="text-slate-700 tabular-nums">{formatVND(profile.allowances || 0)}</strong>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3.5">
                                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5 m-0">
                                            <Wallet size={15} className="text-indigo-600" /> Tài Khoản Ngân Hàng, Thuế TNCN & Bảo Hiểm
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                            <div>
                                                <label className={labelClass}>Số Tài Khoản Ngân Hàng</label>
                                                <input
                                                    type="text"
                                                    placeholder="Nhập số tài khoản..."
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} font-bold tabular-nums`}
                                                    value={profile.bankAccount}
                                                    onChange={e => setProfile({ ...profile, bankAccount: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Tên Ngân Hàng</label>
                                                <input
                                                    type="text"
                                                    placeholder="VD: Vietcombank, MB Bank, ACB..."
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} font-semibold`}
                                                    value={profile.bankName}
                                                    onChange={e => setProfile({ ...profile, bankName: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Chi Nhánh Ngân Hàng</label>
                                                <input
                                                    type="text"
                                                    placeholder="VD: CN TP.HCM..."
                                                    style={inputBaseStyle}
                                                    className={inputClass}
                                                    value={profile.bankBranch}
                                                    onChange={e => setProfile({ ...profile, bankBranch: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Mã Số Thuế Cá Nhân</label>
                                                <input
                                                    type="text"
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} font-semibold tabular-nums`}
                                                    value={profile.taxCode}
                                                    onChange={e => setProfile({ ...profile, taxCode: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Mã Số Sổ BHXH</label>
                                                <input
                                                    type="text"
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} font-semibold tabular-nums`}
                                                    value={profile.socialInsuranceNumber}
                                                    onChange={e => setProfile({ ...profile, socialInsuranceNumber: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Mã Thẻ BHYT</label>
                                                <input
                                                    type="text"
                                                    style={inputBaseStyle}
                                                    className={`${inputClass} font-semibold tabular-nums`}
                                                    value={profile.healthInsuranceCardNumber}
                                                    onChange={e => setProfile({ ...profile, healthInsuranceCardNumber: e.target.value })}
                                                />
                                            </div>
                                            <div className="sm:col-span-2 lg:col-span-3">
                                                <label className={labelClass}>Nơi Đăng Ký Khám Chữa Bệnh Ban Đầu</label>
                                                <input
                                                    type="text"
                                                    placeholder="VD: Bệnh viện Đa khoa..."
                                                    style={inputBaseStyle}
                                                    className={inputClass}
                                                    value={profile.healthInsurancePlace}
                                                    onChange={e => setProfile({ ...profile, healthInsurancePlace: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: HỌC VẤN & BẰNG CẤP */}
                            {tab === 'EDUCATION' && (
                                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3.5">
                                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/80 pb-2.5 m-0">
                                        <GraduationCap size={15} className="text-indigo-600" /> Trình Độ Học Vấn & Chuyên Môn Đào Tạo
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className={labelClass}>Trình Độ Học Vấn Cao Nhất</label>
                                            {renderSelect(profile.educationLevel || 'Đại học', val => setProfile({ ...profile, educationLevel: val }), [
                                                { value: 'Đại học', label: 'Đại học' },
                                                { value: 'Thạc sĩ', label: 'Thạc sĩ' },
                                                { value: 'Tiến sĩ', label: 'Tiến sĩ' },
                                                { value: 'Cao đẳng', label: 'Cao đẳng' },
                                                { value: 'Trung cấp', label: 'Trung cấp' },
                                                { value: 'Phổ thông', label: 'THPT' },
                                            ])}
                                        </div>
                                        <div>
                                            <label className={labelClass}>Chuyên Ngành Đào Tạo</label>
                                            <input
                                                type="text"
                                                placeholder="VD: Kỹ thuật phần mềm, Quản trị kinh doanh, Kế toán..."
                                                style={inputBaseStyle}
                                                className={inputClass}
                                                value={profile.major}
                                                onChange={e => setProfile({ ...profile, major: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Trường / Cơ Sở Đào Tạo</label>
                                            <input
                                                type="text"
                                                placeholder="VD: ĐH Bách Khoa, ĐH Kinh Tế..."
                                                style={inputBaseStyle}
                                                className={inputClass}
                                                value={profile.schoolName}
                                                onChange={e => setProfile({ ...profile, schoolName: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Năm Tốt Nghiệp</label>
                                            <input
                                                type="number"
                                                style={inputBaseStyle}
                                                className={`${inputClass} font-semibold tabular-nums`}
                                                value={profile.graduationYear || ''}
                                                onChange={e => setProfile({ ...profile, graduationYear: parseInt(e.target.value) || null })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer Action Buttons */}
                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="h-[36px] px-4 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="h-[36px] px-4 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer border-none"
                                >
                                    <Save size={14} />
                                    <span>{loading ? 'Đang lưu...' : 'Lưu Hồ Sơ Nhân Sự'}</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* TAB 5: HỢP ĐỒNG LAO ĐỘNG */}
                    {tab === 'CONTRACTS' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider m-0">
                                        Danh Sách Hợp Đồng Lao Động
                                    </h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5 m-0">
                                        Quản lý các hợp đồng thử việc, chính thức có thời hạn và vô thời hạn
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAddContract(!showAddContract)}
                                    className="h-[34px] px-3 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer border-none"
                                >
                                    <Plus size={14} /> Soạn Hợp Đồng Mới
                                </button>
                            </div>

                            {showAddContract && (
                                <form onSubmit={handleAddContract} className="bg-indigo-50/40 border border-indigo-200 p-4 rounded-xl space-y-3.5">
                                    <h4 className="font-bold text-indigo-950 text-xs uppercase tracking-wider m-0">
                                        Thêm Hợp Đồng Lao Động Mới
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                        <div>
                                            <label className={labelClass}>Số Hợp Đồng</label>
                                            <input
                                                required
                                                style={inputBaseStyle}
                                                className={`${inputClass} font-bold tabular-nums`}
                                                value={contract.contractNumber}
                                                onChange={e => setContract({ ...contract, contractNumber: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Loại Hợp Đồng</label>
                                            {renderSelect(contract.type, val => setContract({ ...contract, type: val }), [
                                                { value: 'PROBATION', label: 'Thử việc (PROBATION)' },
                                                { value: 'FULL_TIME', label: 'Chính thức có thời hạn' },
                                                { value: 'INDEFINITE', label: 'Không xác định thời hạn' },
                                                { value: 'PART_TIME', label: 'Bán thời gian (PART_TIME)' },
                                                { value: 'TEMPORARY', label: 'Thời vụ / Khoán việc' },
                                            ])}
                                        </div>
                                        <div>
                                            <label className={labelClass}>Ngày Bắt Đầu</label>
                                            <input
                                                required
                                                type="date"
                                                style={inputBaseStyle}
                                                className={`${inputClass} tabular-nums`}
                                                value={contract.startDate}
                                                onChange={e => setContract({ ...contract, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Ngày Kết Thúc</label>
                                            <input
                                                type="date"
                                                style={inputBaseStyle}
                                                className={`${inputClass} tabular-nums`}
                                                value={contract.endDate}
                                                onChange={e => setContract({ ...contract, endDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Link File Scan / Google Drive HĐ (Tùy chọn)</label>
                                        <input
                                            placeholder="https://drive.google.com/..."
                                            style={inputBaseStyle}
                                            className={inputClass}
                                            value={contract.fileUrl}
                                            onChange={e => setContract({ ...contract, fileUrl: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddContract(false)}
                                            className="h-[34px] px-3.5 text-xs font-semibold rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 cursor-pointer"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="h-[34px] px-4 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white border-none cursor-pointer"
                                        >
                                            Tạo & Lưu Hợp Đồng
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Danh sách HĐ */}
                            <div className="space-y-2.5">
                                {employee.laborContracts && employee.laborContracts.length > 0 ? (
                                    employee.laborContracts.map((c: any) => (
                                        <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 hover:border-indigo-300 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 text-xs tabular-nums">{c.contractNumber}</span>
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/70">
                                                            {c.type === 'PROBATION' ? 'Thử việc' : c.type === 'FULL_TIME' ? 'Chính thức' : c.type === 'INDEFINITE' ? 'Vô thời hạn' : c.type}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 m-0 tabular-nums">
                                                        <CalendarDays size={12} className="text-slate-400" />
                                                        <span>Từ <strong>{new Date(c.startDate).toLocaleDateString('vi-VN')}</strong></span>
                                                        <span>đến <strong>{c.endDate ? new Date(c.endDate).toLocaleDateString('vi-VN') : 'Vô thời hạn'}</strong></span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {c.fileUrl && (
                                                    <a
                                                        href={c.fileUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 inline-flex items-center gap-1 border border-slate-200 transition-colors no-underline"
                                                    >
                                                        <UploadCloud size={13} /> Xem File HĐ
                                                    </a>
                                                )}
                                                <span className="px-2.5 py-1 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-full text-[11px] font-semibold inline-flex items-center gap-1">
                                                    <CheckCircle size={11} /> Đang hiệu lực
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteContract(c.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors bg-transparent border-none cursor-pointer"
                                                    title="Xóa hợp đồng này"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-slate-400 py-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-xs">
                                        Chưa có hợp đồng lao động nào được lập cho nhân sự này.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* KHUNG IN SƠ YẾU LÝ LỊCH (PRINT ONLY) */}
                <div id="printable-employee-profile" ref={printRef} className="hidden print:block text-slate-900 font-sans">
                    <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                        <div>
                            <h2 className="text-base font-bold uppercase tracking-wide text-slate-900">
                                CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ TSOL
                            </h2>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                                Hệ thống Quản trị Doanh nghiệp & Hồ sơ Nhân sự
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 border border-slate-300 rounded uppercase tabular-nums">
                                MÃ NV: {profile.employeeCode}
                            </span>
                        </div>
                    </div>

                    <div className="text-center my-6">
                        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
                            SƠ YẾU LÝ LỊCH TRÍCH NGANG NHÂN SỰ
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">Cập nhật ngày: {new Date().toLocaleDateString('vi-VN')}</p>
                    </div>

                    <div className="space-y-4 text-xs">
                        <div className="bg-slate-100 p-2 font-bold uppercase border-l-4 border-slate-800">
                            I. THÔNG TIN CÁ NHÂN & NHÂN THÂN
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-2">
                            <div>Họ và tên: <strong className="text-sm">{employee.name}</strong></div>
                            <div>Mã nhân viên: <strong>{profile.employeeCode}</strong></div>
                            <div>Ngày sinh: <strong>{profile.dob ? new Date(profile.dob as string).toLocaleDateString('vi-VN') : '---'}</strong></div>
                            <div>Giới tính: <strong>{profile.gender === 'MALE' ? 'Nam' : profile.gender === 'FEMALE' ? 'Nữ' : 'Khác'}</strong></div>
                            <div>Số CCCD: <strong>{profile.identityNumber || '---'}</strong></div>
                            <div>Ngày cấp: <strong>{profile.identityDate ? new Date(profile.identityDate as string).toLocaleDateString('vi-VN') : '---'}</strong> ({profile.identityPlace || ''})</div>
                            <div>Quê quán: <strong>{profile.placeOfOrigin || '---'}</strong></div>
                            <div>Dân tộc: <strong>{profile.ethnicity || 'Kinh'}</strong> (Quốc tịch: {profile.nationality || 'Việt Nam'})</div>
                            <div>Hộ khẩu thường trú: <strong>{profile.permanentAddress || '---'}</strong></div>
                            <div>Nơi ở hiện nay: <strong>{profile.currentAddress || '---'}</strong></div>
                            <div>Điện thoại di động: <strong>{profile.phoneNumber || '---'}</strong></div>
                            <div>Email: <strong>{employee.email}</strong> {profile.personalEmail ? ` / ${profile.personalEmail}` : ''}</div>
                            <div>Người liên hệ khẩn cấp: <strong>{profile.emergencyContact || '---'}</strong> ({profile.emergencyPhone || ''})</div>
                        </div>

                        <div className="bg-slate-100 p-2 font-bold uppercase border-l-4 border-slate-800 mt-4">
                            II. CÔNG TÁC & VỊ TRÍ CHUYÊN MÔN
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-2">
                            <div>Phòng ban: <strong>{profile.department || '---'}</strong></div>
                            <div>Chức vụ / Vị trí: <strong>{profile.position || '---'}</strong></div>
                            <div>Trạng thái làm việc: <strong>{profile.employmentStatus === 'OFFICIAL' ? 'Chính thức' : 'Thử việc'}</strong></div>
                            <div>Địa điểm làm việc: <strong>{profile.workLocation || 'Trụ sở chính'}</strong></div>
                            <div>Ngày nhận việc: <strong>{profile.startDate ? new Date(profile.startDate as string).toLocaleDateString('vi-VN') : '---'}</strong></div>
                            <div>Ngày vào chính thức: <strong>{profile.officialStartDate ? new Date(profile.officialStartDate as string).toLocaleDateString('vi-VN') : '---'}</strong></div>
                        </div>

                        <div className="bg-slate-100 p-2 font-bold uppercase border-l-4 border-slate-800 mt-4">
                            III. LƯƠNG, BẢO HIỂM & TÀI KHOẢN
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-2">
                            <div>Lương cơ bản: <strong>{formatVND(profile.baseSalary)}</strong></div>
                            <div>Mức lương đóng BHXH: <strong>{formatVND(profile.insuranceSalary)}</strong></div>
                            <div>Mã số thuế cá nhân: <strong>{profile.taxCode || '---'}</strong></div>
                            <div>Số sổ BHXH / BHYT: <strong>{profile.socialInsuranceNumber || '---'} / {profile.healthInsuranceCardNumber || '---'}</strong></div>
                            <div>Tài khoản ngân hàng: <strong>{profile.bankAccount || '---'}</strong> ({profile.bankName || ''} - {profile.bankBranch || ''})</div>
                        </div>

                        <div className="bg-slate-100 p-2 font-bold uppercase border-l-4 border-slate-800 mt-4">
                            IV. TRÌNH ĐỘ HỌC VẤN & BẰNG CẤP
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-2">
                            <div>Trình độ: <strong>{profile.educationLevel || '---'}</strong></div>
                            <div>Chuyên ngành: <strong>{profile.major || '---'}</strong></div>
                            <div>Trường đào tạo: <strong>{profile.schoolName || '---'}</strong></div>
                            <div>Năm tốt nghiệp: <strong>{profile.graduationYear || '---'}</strong></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center text-xs mt-10 pt-6 border-t border-slate-300">
                        <div>
                            <div className="font-bold uppercase text-slate-900">Xác Nhận Của Phòng Nhân Sự</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
                            <div className="h-20"></div>
                            <div className="font-bold">Phụ Trách Nhân Sự</div>
                        </div>
                        <div>
                            <div className="font-bold uppercase text-slate-900">Người Khai Hồ Sơ</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
                            <div className="h-20"></div>
                            <div className="font-bold">{employee.name}</div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
