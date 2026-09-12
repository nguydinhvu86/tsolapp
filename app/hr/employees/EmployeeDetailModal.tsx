'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { 
    updateEmployeeProfile, 
    createLaborContract, 
    deleteLaborContract,
    EmployeeProfilePayload 
} from './actions';
import { 
    Save, FileText, UserPlus, CreditCard, CalendarDays, 
    UploadCloud, Briefcase, Wallet, GraduationCap, ShieldCheck, 
    Phone, Mail, MapPin, Building2, User, Printer, Trash2,
    Calendar, CheckCircle, AlertCircle, Sparkles, X
} from 'lucide-react';
import { formatVND } from '@/lib/vietnameseCurrency';

interface Props {
    employee: any;
    isOpen: boolean;
    onClose: () => void;
    onUpdated: (updatedEmployee: any) => void;
}

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
                alert('Đã cập nhật đầy đủ hồ sơ nhân sự thành công!');
                onUpdated({ ...employee, employeeProfile: res.data, department: res.data.department });
            } else {
                alert('Lỗi cập nhật: ' + (res.error || 'Có lỗi xảy ra'));
            }
        } catch (err: any) {
            alert('Lỗi: ' + err.message);
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
                alert('Đã thêm hợp đồng lao động thành công!');
                setShowAddContract(false);
                const currentContracts = employee.laborContracts || [];
                onUpdated({ ...employee, laborContracts: [...currentContracts, res.data] });
            } else {
                alert('Lỗi: ' + (res.error || 'Có lỗi xảy ra'));
            }
        } catch (err: any) {
            alert('Lỗi: ' + err.message);
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
                alert('Lỗi: ' + res.error);
            }
        } catch (err: any) {
            alert('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // In Hồ Sơ
    const handlePrintProfile = () => {
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
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Hồ Sơ Nhân Sự: ${employee.name || ''}`} 
            maxWidth="max-w-5xl"
        >
            <div className="flex flex-col h-full">
                {/* CSS In Hồ Sơ Chuẩn A4 */}
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

                {/* HEADER INFO BANNER */}
                <div className="bg-slate-900 text-white p-5 rounded-xl flex flex-wrap items-center justify-between gap-4 no-print shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center border-2 border-emerald-400 shadow-md">
                            {getInitials(employee.name)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h3 className="text-base font-extrabold text-white tracking-tight">{employee.name}</h3>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    {profile.employmentStatus === 'OFFICIAL' ? 'Chính Thức' : profile.employmentStatus === 'PROBATION' ? 'Thử Việc' : profile.employmentStatus === 'RESIGNED' ? 'Đã Thôi Việc' : 'Thực Tập'}
                                </span>
                            </div>
                            <div className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap font-medium">
                                <span>Mã NV: <strong className="text-white font-mono">{profile.employeeCode || '---'}</strong></span>
                                <span className="text-slate-600">•</span>
                                <span>Phòng: <strong className="text-white">{profile.department || 'Chưa phân ban'}</strong></span>
                                <span className="text-slate-600">•</span>
                                <span>Chức vụ: <strong className="text-white">{profile.position || 'Nhân viên'}</strong></span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            onClick={handlePrintProfile}
                            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                            <Printer size={15} /> In Hồ Sơ
                        </button>
                    </div>
                </div>

                {/* 5 TABS NAVIGATION */}
                <div className="flex border-b border-slate-200 bg-white px-2 mt-3 gap-1 overflow-x-auto no-print">
                    <button 
                        className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${tab === 'PERSONAL' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        onClick={() => setTab('PERSONAL')}
                    >
                        <User size={15}/> 1. Sơ Yếu Lý Lịch
                    </button>
                    <button 
                        className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${tab === 'JOB' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        onClick={() => setTab('JOB')}
                    >
                        <Briefcase size={15}/> 2. Công Việc & Tổ Chức
                    </button>
                    <button 
                        className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${tab === 'SALARY' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        onClick={() => setTab('SALARY')}
                    >
                        <Wallet size={15}/> 3. Lương & Phúc Lợi - BHXH
                    </button>
                    <button 
                        className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${tab === 'EDUCATION' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        onClick={() => setTab('EDUCATION')}
                    >
                        <GraduationCap size={15}/> 4. Học Vấn & Bằng Cấp
                    </button>
                    <button 
                        className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${tab === 'CONTRACTS' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        onClick={() => setTab('CONTRACTS')}
                    >
                        <FileText size={15}/> 5. Hợp Đồng Lao Động ({employee.laborContracts?.length || 0})
                    </button>
                </div>

                {/* FORM TỔNG HỢP (TAB 1 -> TAB 4) */}
                <div className="p-5 bg-slate-50/60 rounded-b-xl min-h-[460px] overflow-y-auto max-h-[65vh]">
                    {tab !== 'CONTRACTS' && (
                        <form onSubmit={handleSaveProfile} className="space-y-6">
                            {/* TAB 1: SƠ YẾU LÝ LỊCH & CÁ NHÂN */}
                            {tab === 'PERSONAL' && (
                                <div className="space-y-5">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                                            <User size={15} className="text-emerald-600" /> Thông Tin Nhân Thân & Căn Cước Công Dân
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Mã Nhân Viên</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900" 
                                                    value={profile.employeeCode} 
                                                    onChange={e => setProfile({...profile, employeeCode: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Số CMND / CCCD</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900" 
                                                    value={profile.identityNumber} 
                                                    onChange={e => setProfile({...profile, identityNumber: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Ngày Cấp CCCD</label>
                                                <input 
                                                    type="date" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                    value={profile.identityDate as string} 
                                                    onChange={e => setProfile({...profile, identityDate: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Nơi Cấp CCCD</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                    value={profile.identityPlace} 
                                                    onChange={e => setProfile({...profile, identityPlace: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Ngày Sinh</label>
                                                <input 
                                                    type="date" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                    value={profile.dob as string} 
                                                    onChange={e => setProfile({...profile, dob: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Giới Tính</label>
                                                <select 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-800 cursor-pointer" 
                                                    value={profile.gender} 
                                                    onChange={e => setProfile({...profile, gender: e.target.value})}
                                                >
                                                    <option value="MALE">Nam</option>
                                                    <option value="FEMALE">Nữ</option>
                                                    <option value="OTHER">Khác</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Quê Quán / Nguyên Quán</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                    value={profile.placeOfOrigin} 
                                                    onChange={e => setProfile({...profile, placeOfOrigin: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Dân Tộc</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                    value={profile.ethnicity} 
                                                    onChange={e => setProfile({...profile, ethnicity: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Tình Trạng Hôn Nhân</label>
                                                <select 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-800 cursor-pointer" 
                                                    value={profile.maritalStatus} 
                                                    onChange={e => setProfile({...profile, maritalStatus: e.target.value})}
                                                >
                                                    <option value="SINGLE">Độc thân</option>
                                                    <option value="MARRIED">Đã kết hôn</option>
                                                    <option value="DIVORCED">Ly hôn</option>
                                                    <option value="OTHER">Khác</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Địa chỉ & Liên hệ */}
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                                            <MapPin size={15} className="text-emerald-600" /> Địa Chỉ & Thông Tin Liên Hệ
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Địa Chỉ Thường Trú (Hộ khẩu)</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                    value={profile.permanentAddress} 
                                                    onChange={e => setProfile({...profile, permanentAddress: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Địa Chỉ Tạm Trú / Nơi Ở Hiện Nay</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                    value={profile.currentAddress} 
                                                    onChange={e => setProfile({...profile, currentAddress: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Điện Thoại Di Động</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900" 
                                                    value={profile.phoneNumber} 
                                                    onChange={e => setProfile({...profile, phoneNumber: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Email Cá Nhân (Ngoài công ty)</label>
                                                <input 
                                                    type="email" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                    value={profile.personalEmail} 
                                                    onChange={e => setProfile({...profile, personalEmail: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Người Liên Hệ Khẩn Cấp</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="VD: Nguyễn Văn A (Bố ruột)"
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                    value={profile.emergencyContact} 
                                                    onChange={e => setProfile({...profile, emergencyContact: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">SĐT Người Liên Hệ Khẩn Cấp</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900" 
                                                    value={profile.emergencyPhone} 
                                                    onChange={e => setProfile({...profile, emergencyPhone: e.target.value})} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: CÔNG VIỆC & TỔ CHỨC */}
                            {tab === 'JOB' && (
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                                        <Briefcase size={15} className="text-emerald-600" /> Thông Tin Công Việc & Chức Vụ
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Phòng Ban</label>
                                            <input 
                                                type="text" 
                                                placeholder="VD: Phòng Kinh Doanh, Kỹ Thuật..."
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-900" 
                                                value={profile.department} 
                                                onChange={e => setProfile({...profile, department: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Chức Vụ / Vị Trí</label>
                                            <input 
                                                type="text" 
                                                placeholder="VD: Trưởng Phòng, Chuyên Viên, Lập Trình Viên..."
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-900" 
                                                value={profile.position} 
                                                onChange={e => setProfile({...profile, position: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Trạng Thái Làm Việc</label>
                                            <select 
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-800 cursor-pointer" 
                                                value={profile.employmentStatus} 
                                                onChange={e => setProfile({...profile, employmentStatus: e.target.value})}
                                            >
                                                <option value="OFFICIAL">Chính thức (OFFICIAL)</option>
                                                <option value="PROBATION">Thử việc (PROBATION)</option>
                                                <option value="INTERN">Thực tập sinh (INTERN)</option>
                                                <option value="RESIGNED">Đã thôi việc (RESIGNED)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Địa Điểm Làm Việc</label>
                                            <input 
                                                type="text" 
                                                placeholder="VD: Trụ sở chính, Chi nhánh Hà Nội..."
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                value={profile.workLocation} 
                                                onChange={e => setProfile({...profile, workLocation: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Ngày Nhận Việc (Start Date)</label>
                                            <input 
                                                type="date" 
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                value={profile.startDate as string} 
                                                onChange={e => setProfile({...profile, startDate: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Ngày Hết Hạn Thử Việc</label>
                                            <input 
                                                type="date" 
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                value={profile.probationEndDate as string} 
                                                onChange={e => setProfile({...profile, probationEndDate: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Ngày Vào Chính Thức</label>
                                            <input 
                                                type="date" 
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                value={profile.officialStartDate as string} 
                                                onChange={e => setProfile({...profile, officialStartDate: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Ngày Thôi Việc (nếu có)</label>
                                            <input 
                                                type="date" 
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                value={profile.resignationDate as string} 
                                                onChange={e => setProfile({...profile, resignationDate: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: LƯƠNG & PHÚC LỢI - BHXH */}
                            {tab === 'SALARY' && (
                                <div className="space-y-5">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                                            <CreditCard size={15} className="text-emerald-600" /> Chế Độ Lương & Phụ Cấp Mặc Định
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Lương Cơ Bản (VNĐ / Tháng)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full px-3.5 py-2 border border-emerald-300 bg-emerald-50/40 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-black text-emerald-800" 
                                                    value={profile.baseSalary} 
                                                    onChange={e => setProfile({...profile, baseSalary: parseFloat(e.target.value) || 0})} 
                                                />
                                                <p className="text-[10px] text-slate-500 italic mt-1">Dùng để tính Payroll hàng tháng</p>
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Lương Đóng BHXH (VNĐ)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900" 
                                                    value={profile.insuranceSalary} 
                                                    onChange={e => setProfile({...profile, insuranceSalary: parseFloat(e.target.value) || 0})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Phụ Cấp Cố Định (VNĐ)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900" 
                                                    value={profile.allowances} 
                                                    onChange={e => setProfile({...profile, allowances: parseFloat(e.target.value) || 0})} 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bảo Hiểm & Ngân Hàng */}
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                                            <Wallet size={15} className="text-emerald-600" /> Tài Khoản Thanh Toán & Bảo Hiểm Xã Hội
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Số Tài Khoản Ngân Hàng</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900" 
                                                    value={profile.bankAccount} 
                                                    onChange={e => setProfile({...profile, bankAccount: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Tên Ngân Hàng</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="VD: Vietcombank, MB Bank, Techcombank..."
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-900" 
                                                    value={profile.bankName} 
                                                    onChange={e => setProfile({...profile, bankName: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Chi Nhánh Ngân Hàng</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                    value={profile.bankBranch} 
                                                    onChange={e => setProfile({...profile, bankBranch: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Mã Số Thuế Cá Nhân</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900" 
                                                    value={profile.taxCode} 
                                                    onChange={e => setProfile({...profile, taxCode: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Số Sổ BHXH</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900" 
                                                    value={profile.socialInsuranceNumber} 
                                                    onChange={e => setProfile({...profile, socialInsuranceNumber: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 mb-1">Mã Thẻ BHYT</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900" 
                                                    value={profile.healthInsuranceCardNumber} 
                                                    onChange={e => setProfile({...profile, healthInsuranceCardNumber: e.target.value})} 
                                                />
                                            </div>
                                            <div className="sm:col-span-2 lg:col-span-3">
                                                <label className="block font-bold text-slate-700 mb-1">Nơi Đăng Ký KCB Ban Đầu</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="VD: Bệnh viện Quân Y 175, Bệnh viện Đa khoa Sài Gòn..."
                                                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                    value={profile.healthInsurancePlace} 
                                                    onChange={e => setProfile({...profile, healthInsurancePlace: e.target.value})} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: HỌC VẤN & BẰNG CẤP */}
                            {tab === 'EDUCATION' && (
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                                        <GraduationCap size={15} className="text-emerald-600" /> Trình Độ Học Vấn & Chuyên Môn
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Trình Độ Học Vấn Cao Nhất</label>
                                            <select 
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-800 cursor-pointer" 
                                                value={profile.educationLevel} 
                                                onChange={e => setProfile({...profile, educationLevel: e.target.value})}
                                            >
                                                <option value="Đại học">Đại học</option>
                                                <option value="Thạc sĩ">Thạc sĩ</option>
                                                <option value="Tiến sĩ">Tiến sĩ</option>
                                                <option value="Cao đẳng">Cao đẳng</option>
                                                <option value="Trung cấp">Trung cấp</option>
                                                <option value="Phổ thông">THPT</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Chuyên Ngành Đào Tạo</label>
                                            <input 
                                                type="text" 
                                                placeholder="VD: Kỹ thuật phần mềm, Quản trị kinh doanh, Kế toán..."
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                value={profile.major} 
                                                onChange={e => setProfile({...profile, major: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Trường / Cơ Sở Đào Tạo</label>
                                            <input 
                                                type="text" 
                                                placeholder="VD: ĐH Bách Khoa, ĐH Kinh Tế, ĐH Quốc Gia..."
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                value={profile.schoolName} 
                                                onChange={e => setProfile({...profile, schoolName: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Năm Tốt Nghiệp</label>
                                            <input 
                                                type="number" 
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900" 
                                                value={profile.graduationYear || ''} 
                                                onChange={e => setProfile({...profile, graduationYear: parseInt(e.target.value) || null})} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Nút lưu thông tin */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                                <button 
                                    type="button" 
                                    onClick={onClose}
                                    className="px-4.5 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                >
                                    Đóng
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={loading} 
                                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                                >
                                    <Save size={15} />
                                    <span>{loading ? 'Đang lưu...' : 'Lưu Hồ Sơ Nhân Sự'}</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* TAB 5: HỢP ĐỒNG LAO ĐỘNG */}
                    {tab === 'CONTRACTS' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                                <div>
                                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Danh Sách Hợp Đồng Lao Động</h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Quản lý các loại hợp đồng thử việc, chính thức và thời hạn</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setShowAddContract(!showAddContract)}
                                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-all"
                                >
                                    + Soạn Hợp Đồng Mới
                                </button>
                            </div>

                            {showAddContract && (
                                <form onSubmit={handleAddContract} className="bg-emerald-50/60 border border-emerald-200 p-5 rounded-2xl space-y-4 shadow-sm animate-in fade-in duration-200">
                                    <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">Soạn Thảo Hợp Đồng Mới</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Số Hợp Đồng</label>
                                            <input 
                                                required 
                                                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono font-bold text-slate-900" 
                                                value={contract.contractNumber} 
                                                onChange={e => setContract({...contract, contractNumber: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Loại Hợp Đồng</label>
                                            <select 
                                                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-800 cursor-pointer" 
                                                value={contract.type} 
                                                onChange={e => setContract({...contract, type: e.target.value})}
                                            >
                                                <option value="PROBATION">Thử việc (PROBATION)</option>
                                                <option value="FULL_TIME">Chính thức có thời hạn (FULL_TIME)</option>
                                                <option value="INDEFINITE">Không xác định thời hạn (INDEFINITE)</option>
                                                <option value="PART_TIME">Bán thời gian (PART_TIME)</option>
                                                <option value="TEMPORARY">Thời vụ / Khoán việc (TEMPORARY)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Ngày Bắt Đầu</label>
                                            <input 
                                                required 
                                                type="date" 
                                                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                value={contract.startDate} 
                                                onChange={e => setContract({...contract, startDate: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Ngày Kết Thúc (để trống nếu vô thời hạn)</label>
                                            <input 
                                                type="date" 
                                                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                                value={contract.endDate} 
                                                onChange={e => setContract({...contract, endDate: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                    <div className="text-xs">
                                        <label className="block font-bold text-slate-700 mb-1">Link File Scan / Google Drive HĐ (tùy chọn)</label>
                                        <input 
                                            placeholder="https://drive.google.com/..."
                                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900" 
                                            value={contract.fileUrl} 
                                            onChange={e => setContract({...contract, fileUrl: e.target.value})} 
                                        />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowAddContract(false)} 
                                            className="px-4 py-2 text-xs font-bold rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                                        >
                                            Hủy
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={loading} 
                                            className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
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
                                        <div key={c.id} className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 hover:border-emerald-300 transition-all">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-extrabold text-slate-900 text-sm font-mono">{c.contractNumber}</span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                                            {c.type === 'PROBATION' ? 'Thử việc' : c.type === 'FULL_TIME' ? 'Chính thức' : c.type === 'INDEFINITE' ? 'Vô thời hạn' : c.type}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                                                        <CalendarDays size={13} className="text-slate-400" />
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
                                                        className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 flex items-center gap-1.5 border border-slate-200 transition-colors"
                                                    >
                                                        <UploadCloud size={14} /> Xem File HĐ
                                                    </a>
                                                )}
                                                <span className="px-2.5 py-1 border border-emerald-300 text-emerald-800 bg-emerald-50 rounded-lg text-xs font-extrabold flex items-center gap-1">
                                                    <CheckCircle size={12} /> Đang Hiệu Lực
                                                </span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleDeleteContract(c.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                                                    title="Xóa hợp đồng này"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-slate-400 py-12 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-xs font-medium">
                                        Chưa có hợp đồng lao động nào được lập cho nhân sự này.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ================= KHUNG IN SƠ YẾU LÝ LỊCH (PRINT ONLY) ================= */}
                <div id="printable-employee-profile" ref={printRef} className="hidden print:block text-slate-900 font-sans">
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
                            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 border border-slate-300 rounded uppercase">
                                MÃ NV: {profile.employeeCode}
                            </span>
                        </div>
                    </div>

                    <div className="text-center my-6">
                        <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                            SƠ YẾU LÝ LỊCH TRÍCH NGANG NHÂN SỰ
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">Cập nhật ngày: {new Date().toLocaleDateString('vi-VN')}</p>
                    </div>

                    {/* Bảng Thông Tin Cá Nhân */}
                    <div className="space-y-4 text-xs">
                        <div className="bg-slate-100 p-2 font-bold uppercase border-l-4 border-slate-800">
                            I. THÔNG TIN CÁ NHÂN & NHÂN THÂN
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-2">
                            <div>Họ và tên: <strong className="text-sm">{employee.name}</strong></div>
                            <div>Mã nhân viên: <strong>{profile.employeeCode}</strong></div>
                            <div>Ngày sinh: <strong>{profile.dob ? new Date(profile.dob as string).toLocaleDateString('vi-VN') : '---'}</strong></div>
                            <div>Giới tính: <strong>{profile.gender === 'MALE' ? 'Nam' : profile.gender === 'FEMALE' ? 'Nữ' : 'Khác'}</strong></div>
                            <div>Số CCCD: <strong className="font-mono">{profile.identityNumber || '---'}</strong></div>
                            <div>Ngày cấp: <strong>{profile.identityDate ? new Date(profile.identityDate as string).toLocaleDateString('vi-VN') : '---'}</strong> ({profile.identityPlace || ''})</div>
                            <div>Quê quán: <strong>{profile.placeOfOrigin || '---'}</strong></div>
                            <div>Dân tộc: <strong>{profile.ethnicity || 'Kinh'}</strong> (Quốc tịch: {profile.nationality || 'Việt Nam'})</div>
                            <div>Hộ khẩu thường trú: <strong>{profile.permanentAddress || '---'}</strong></div>
                            <div>Nơi ở hiện nay: <strong>{profile.currentAddress || '---'}</strong></div>
                            <div>Điện thoại di động: <strong className="font-mono">{profile.phoneNumber || '---'}</strong></div>
                            <div>Email công ty / cá nhân: <strong>{employee.email}</strong> {profile.personalEmail ? ` / ${profile.personalEmail}` : ''}</div>
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
                            <div>Lương cơ bản: <strong className="font-mono">{formatVND(profile.baseSalary)}</strong></div>
                            <div>Mức lương đóng BHXH: <strong className="font-mono">{formatVND(profile.insuranceSalary)}</strong></div>
                            <div>Mã số thuế cá nhân: <strong className="font-mono">{profile.taxCode || '---'}</strong></div>
                            <div>Số sổ BHXH / BHYT: <strong className="font-mono">{profile.socialInsuranceNumber || '---'} / {profile.healthInsuranceCardNumber || '---'}</strong></div>
                            <div>Tài khoản ngân hàng: <strong className="font-mono">{profile.bankAccount || '---'}</strong> ({profile.bankName || ''} - {profile.bankBranch || ''})</div>
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

                    {/* Chữ Ký Xác Nhận */}
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
