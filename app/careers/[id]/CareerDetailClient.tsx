'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
    Briefcase, MapPin, Clock, DollarSign, Users, Share2, 
    CheckCircle2, ArrowRight, UploadCloud, FileText, Check, 
    Copy, ExternalLink, ShieldCheck, Mail, Phone, Calendar, 
    ChevronRight, Sparkles, Building2, Award, HeartHandshake, 
    GraduationCap, AlertCircle, X, Download, QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { submitPublicCandidateApplication } from '../actions';
import { formatMoney } from '@/lib/utils/formatters';

interface CareerDetailClientProps {
    posting: any;
    companyInfo: {
        name: string;
        displayName: string;
        logo: string;
        phone: string;
        email: string;
        address: string;
        website: string;
        tax: string;
    };
}

export default function CareerDetailClient({ posting, companyInfo }: CareerDetailClientProps) {
    const [copied, setCopied] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [currentUrl, setCurrentUrl] = useState('');

    // Form fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [skills, setSkills] = useState('');
    const [notes, setNotes] = useState('');
    const [cvLink, setCvLink] = useState('');
    const [cvFile, setCvFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentUrl(window.location.href);
        }
    }, []);

    const handleCopyLink = () => {
        if (navigator?.clipboard) {
            navigator.clipboard.writeText(currentUrl || window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 15 * 1024 * 1024) {
                alert("Dung lượng file CV tối đa 15MB!");
                return;
            }
            setCvFile(file);
        }
    };

    const handleRemoveFile = () => {
        setCvFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmitApplication = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');

        if (!fullName.trim() || !phone.trim()) {
            setSubmitError('Vui lòng điền đầy đủ Họ và tên cùng Số điện thoại liên hệ!');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('postingId', posting.id);
            formData.append('fullName', fullName);
            formData.append('phone', phone);
            formData.append('email', email);
            formData.append('skills', skills);
            formData.append('notes', notes);
            formData.append('cvLink', cvLink);
            if (cvFile) {
                formData.append('cvFile', cvFile);
            }

            const res = await submitPublicCandidateApplication(formData);
            if (res.success) {
                setSubmitted(true);
            } else {
                setSubmitError(res.error || 'Có lỗi xảy ra khi nộp hồ sơ. Vui lòng thử lại!');
            }
        } catch (err: any) {
            setSubmitError(err.message || 'Lỗi kết nối máy chủ');
        } finally {
            setSubmitting(false);
        }
    };

    const scrollToApply = () => {
        const el = document.getElementById('apply-section');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const salaryDisplay = posting.requisition?.budget 
        ? formatMoney(Number(posting.requisition.budget))
        : 'Mức lương thỏa thuận cạnh tranh';

    const isClosedOrDraft = posting.status !== 'PUBLISHED';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans selection:bg-emerald-500 selection:text-white">
            {/* Top Corporate Navigation Bar */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        {companyInfo.logo ? (
                            <img 
                                src={companyInfo.logo} 
                                alt={companyInfo.displayName} 
                                className="h-10 w-auto object-contain max-w-[140px]" 
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        ) : null}
                        <div>
                            <div className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight flex items-center gap-1.5">
                                <span>{companyInfo.displayName || 'T-SOLUTION'}</span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <ShieldCheck size={11} /> Tuyển dụng chính thức
                                </span>
                            </div>
                            <div className="text-[11px] text-slate-500 hidden sm:block">
                                Cổng Thông Tin Tuyển Dụng & Phát Triển Nghề Nghiệp
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-4">
                        <button 
                            onClick={handleCopyLink}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="Sao chép liên kết gửi ứng viên"
                        >
                            {copied ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                            <span className="hidden sm:inline">{copied ? 'Đã sao chép link!' : 'Chia sẻ cơ hội'}</span>
                        </button>

                        <button 
                            onClick={() => setShowQrModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="Mã QR tiện lợi cho di động"
                        >
                            <QrCode size={14} />
                            <span className="hidden sm:inline">Mã QR</span>
                        </button>

                        {!isClosedOrDraft && (
                            <button 
                                onClick={scrollToApply}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-200 hover:shadow transition-all cursor-pointer"
                            >
                                <span>Ứng Tuyển Ngay</span>
                                <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Closed / Draft Notice Banner */}
            {isClosedOrDraft && (
                <div className="bg-amber-500 text-white py-2.5 px-4 text-center text-xs sm:text-sm font-semibold shadow-inner flex items-center justify-center gap-2">
                    <AlertCircle size={16} />
                    <span>Vị trí tuyển dụng này hiện đang tạm dừng nhận hồ sơ hoặc đã đóng. Quý ứng viên vui lòng theo dõi các cơ hội nghề nghiệp tiếp theo!</span>
                </div>
            )}

            {/* Hero Banner Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white py-12 sm:py-16 lg:py-20">
                {/* Decorative Background Elements */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-4 flex-wrap">
                        <span>Trang Chủ</span>
                        <ChevronRight size={12} className="text-slate-400" />
                        <span>Cơ Hội Nghề Nghiệp</span>
                        <ChevronRight size={12} className="text-slate-400" />
                        <span className="text-emerald-400">{posting.requisition?.department || 'Khối Chuyên Môn'}</span>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                        <div className="max-w-3xl space-y-4">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    <Sparkles size={12} /> Đang Tuyển Dụng
                                </span>
                                {posting.requisition?.code && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-white/10 text-slate-200 border border-white/15">
                                        Mã: {posting.requisition.code}
                                    </span>
                                )}
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/15">
                                    Toàn thời gian
                                </span>
                            </div>

                            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                                {posting.title}
                            </h1>

                            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-2xl">
                                Gia nhập đội ngũ {companyInfo.name || 'chúng tôi'} để cùng kiến tạo những giải pháp công nghệ chuyển đổi số đột phá, nâng tầm giá trị doanh nghiệp.
                            </p>

                            {/* Key Highlights Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                                    <div className="text-[11px] uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1">
                                        <Building2 size={13} className="text-emerald-400" /> Phòng ban
                                    </div>
                                    <div className="font-bold text-xs sm:text-sm text-white mt-1 truncate">
                                        {posting.requisition?.department || 'Tất cả khối'}
                                    </div>
                                </div>

                                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                                    <div className="text-[11px] uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1">
                                        <DollarSign size={13} className="text-emerald-400" /> Thu nhập
                                    </div>
                                    <div className="font-bold text-xs sm:text-sm text-emerald-300 mt-1 truncate">
                                        {salaryDisplay}
                                    </div>
                                </div>

                                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                                    <div className="text-[11px] uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1">
                                        <Users size={13} className="text-emerald-400" /> Số lượng
                                    </div>
                                    <div className="font-bold text-xs sm:text-sm text-white mt-1">
                                        {posting.requisition?.headcount || 1} nhân sự
                                    </div>
                                </div>

                                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                                    <div className="text-[11px] uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1">
                                        <MapPin size={13} className="text-emerald-400" /> Địa điểm
                                    </div>
                                    <div className="font-bold text-xs sm:text-sm text-white mt-1 truncate">
                                        TP.HCM / Bình Dương
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTA Card in Hero */}
                        {!isClosedOrDraft && (
                            <div className="lg:w-80 shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 space-y-4">
                                <div className="text-xs text-slate-300">
                                    Thời gian phản hồi hồ sơ:
                                    <span className="font-bold text-emerald-300 block text-sm mt-0.5">Trong vòng 24 - 48 giờ</span>
                                </div>
                                <button 
                                    onClick={scrollToApply}
                                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-slate-900 bg-emerald-400 hover:bg-emerald-300 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <span>Nộp Đơn Ứng Tuyển</span>
                                    <ArrowRight size={16} />
                                </button>
                                <div className="text-[11px] text-slate-300 text-center flex items-center justify-center gap-1.5">
                                    <ShieldCheck size={13} className="text-emerald-400" />
                                    <span>Bảo mật 100% dữ liệu ứng viên</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Main Content Layout */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                    {/* Left Column: Job Details & Company Info (8 cols) */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Company Culture & About */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                        Về {companyInfo.displayName || 'T-SOLUTION'}
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Môi trường làm việc chuyên nghiệp, kiến tạo & tôn trọng cá nhân
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                                <strong>{companyInfo.name}</strong> là đơn vị tiên phong chuyên cung cấp các giải pháp công nghệ số, phần mềm ERP quản trị doanh nghiệp toàn diện và hệ thống hạ tầng viễn thông hiện đại. Chúng tôi tin rằng con người là tài sản quý giá nhất, luôn cam kết tạo ra không gian phát triển công bằng, sáng tạo và chế độ đãi ngộ xứng đáng nhất cho nhân tài.
                            </p>
                        </div>

                        {/* Job Description (JD) Card */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-5">
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Briefcase size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                        Mô Tả Công Việc (Job Description)
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Nhiệm vụ và trách nhiệm chính trong vị trí này
                                    </p>
                                </div>
                            </div>

                            {posting.content ? (
                                <div 
                                    className="prose prose-sm max-w-none text-slate-600 prose-headings:font-bold prose-headings:text-slate-800 prose-a:text-emerald-600 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: posting.content }}
                                />
                            ) : (
                                <div className="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed font-normal">
                                    {posting.requisition?.description || 'Nội dung mô tả công việc đang được cập nhật chi tiết.'}
                                </div>
                            )}
                        </div>

                        {/* Candidate Requirements Card */}
                        {(posting.requisition?.requirements) && (
                            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-5">
                                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <GraduationCap size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                            Yêu Cầu Tuyển Dụng & Tiêu Chuẩn Ứng Viên
                                        </h2>
                                        <p className="text-xs text-slate-500 font-medium">
                                            Kinh nghiệm, kỹ năng và phẩm chất phù hợp
                                        </p>
                                    </div>
                                </div>

                                <div className="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed font-normal">
                                    {posting.requisition.requirements}
                                </div>
                            </div>
                        )}

                        {/* Corporate Benefits & Perks */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <Award size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                        Quyền Lợi & Đãi Ngộ Dành Cho Bạn
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Chính sách phúc lợi toàn diện và minh bạch
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                                    <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                        <span>Thu Nhập Hấp Dẫn & Thưởng</span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-normal pl-6">
                                        Lương cạnh tranh xứng đáng theo năng lực, thưởng dự án, thưởng KPI và tháng lương thứ 13.
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                                    <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                        <span>Bảo Hiểm & Sức Khỏe Đầy Đủ</span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-normal pl-6">
                                        Tham gia đầy đủ BHXH, BHYT, BHTN theo đúng quy định Luật Lao động cùng chế độ khám sức khỏe định kỳ.
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                                    <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                        <span>Lộ Trình Thăng Tiến Rõ Ràng</span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-normal pl-6">
                                        Đánh giá hiệu quả công việc định kỳ, có cơ hội thăng tiến lên cấp Quản lý/Leader không giới hạn tuổi tác.
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                                    <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                        <span>Môi Trường & Đào Tạo Chuyên Sâu</span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-normal pl-6">
                                        Được tài trợ tham gia các khóa đào tạo chuyên môn, trang bị máy móc hiện đại, du lịch thường niên và teambuilding.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Recruitment Process Steps */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-5">
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <HeartHandshake size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                        Quy Trình Ứng Tuyển & Tuyển Chọn
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">
                                        4 bước nhanh chóng, minh bạch và tôn trọng thời gian của ứng viên
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 relative">
                                    <div className="text-emerald-600 font-mono font-black text-lg">01</div>
                                    <div className="font-bold text-xs text-slate-800 mt-1">Nộp Hồ Sơ Online</div>
                                    <div className="text-[11px] text-slate-500 mt-1">Điền thông tin và đính kèm CV trực tiếp bên dưới.</div>
                                </div>
                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 relative">
                                    <div className="text-emerald-600 font-mono font-black text-lg">02</div>
                                    <div className="font-bold text-xs text-slate-800 mt-1">Sơ Vấn Nhanh</div>
                                    <div className="text-[11px] text-slate-500 mt-1">Bộ phận Nhân sự trao đổi ngắn qua điện thoại trong 1-2 ngày.</div>
                                </div>
                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 relative">
                                    <div className="text-emerald-600 font-mono font-black text-lg">03</div>
                                    <div className="font-bold text-xs text-slate-800 mt-1">Phỏng Vấn Trực Tiếp</div>
                                    <div className="text-[11px] text-slate-500 mt-1">Gặp gỡ Trưởng bộ phận và Ban Giám Đốc để hiểu rõ công việc.</div>
                                </div>
                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 relative">
                                    <div className="text-emerald-600 font-mono font-black text-lg">04</div>
                                    <div className="font-bold text-xs text-slate-800 mt-1">Nhận Offer & Đi Làm</div>
                                    <div className="text-[11px] text-slate-500 mt-1">Nhận thư mời làm việc với đãi ngộ rõ ràng và chào đón gia nhập!</div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Application Form */}
                        <div id="apply-section" className="scroll-mt-24">
                            <div className="bg-white rounded-3xl p-6 sm:p-10 border-2 border-emerald-500/30 shadow-xl shadow-emerald-950/5 space-y-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

                                <div className="relative pb-4 border-b border-slate-100">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
                                        <Sparkles size={12} /> ỨNG TUYỂN TRỰC TUYẾN
                                    </span>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                        Gửi Hồ Sơ Ứng Tuyển Vị Trí: {posting.title}
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                        Điền thông tin của bạn bên dưới. Bộ phận tuyển dụng sẽ liên hệ phản hồi sớm nhất!
                                    </p>
                                </div>

                                {submitted ? (
                                    <div className="py-12 text-center space-y-4">
                                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                            <CheckCircle2 size={36} />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900">
                                            Ứng Tuyển Thành Công!
                                        </h3>
                                        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                                            Cảm ơn bạn đã quan tâm và nộp hồ sơ vào <strong>{companyInfo.name}</strong>. Hồ sơ của bạn đã được chuyển tới Ban Tuyển Dụng. Chúng tôi sẽ liên hệ lại với bạn trong vòng 24 - 48 giờ làm việc.
                                        </p>
                                        <div className="pt-2">
                                            <button 
                                                onClick={() => { setSubmitted(false); setFullName(''); setPhone(''); setEmail(''); setCvFile(null); }}
                                                className="px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                            >
                                                Nộp thêm hồ sơ khác
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmitApplication} className="relative space-y-4">
                                        {submitError && (
                                            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                                                <AlertCircle size={15} className="shrink-0" />
                                                <span>{submitError}</span>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700">
                                                    Họ và tên của bạn <span className="text-rose-500">*</span>
                                                </label>
                                                <input 
                                                    type="text"
                                                    required
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    placeholder="Ví dụ: Nguyễn Văn An"
                                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700">
                                                    Số điện thoại liên hệ <span className="text-rose-500">*</span>
                                                </label>
                                                <input 
                                                    type="tel"
                                                    required
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="Ví dụ: 0912 345 678"
                                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700">
                                                    Địa chỉ Email
                                                </label>
                                                <input 
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="Ví dụ: nguyenvanan@gmail.com"
                                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700">
                                                    Kỹ năng / Điểm mạnh chính
                                                </label>
                                                <input 
                                                    type="text"
                                                    value={skills}
                                                    onChange={(e) => setSkills(e.target.value)}
                                                    placeholder="Ví dụ: Giao tiếp, Kỹ thuật viên, Tiếng Anh..."
                                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all"
                                                />
                                            </div>
                                        </div>

                                        {/* CV Upload Box */}
                                        <div className="space-y-1.5 pt-1">
                                            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                                <span>Đính kèm Hồ sơ / CV của bạn (PDF, DOC, DOCX tối đa 15MB)</span>
                                                <span className="text-[11px] text-slate-400 font-normal">Khuyên dùng PDF</span>
                                            </label>

                                            <input 
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                                className="hidden"
                                                id="cv-file-input"
                                            />

                                            {cvFile ? (
                                                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <FileText className="text-emerald-600 shrink-0" size={20} />
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold text-slate-900 truncate">{cvFile.name}</div>
                                                            <div className="text-[11px] text-slate-500 font-mono">{(cvFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={handleRemoveFile} 
                                                        className="p-1 rounded-lg hover:bg-emerald-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                                        title="Chọn lại file khác"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div 
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30 transition-all text-center cursor-pointer group"
                                                >
                                                    <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 mx-auto transition-colors" />
                                                    <div className="text-xs font-bold text-slate-800 mt-2">
                                                        Bấm để chọn file CV từ thiết bị của bạn
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        Hỗ trợ định dạng: PDF, DOC, DOCX hoặc ảnh chụp hồ sơ
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Or CV Link */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">
                                                Hoặc dán Link CV trực tuyến (Google Drive, LinkedIn, Portfolio...)
                                            </label>
                                            <input 
                                                type="url"
                                                value={cvLink}
                                                onChange={(e) => setCvLink(e.target.value)}
                                                placeholder="https://drive.google.com/file/d/..."
                                                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all"
                                            />
                                        </div>

                                        {/* Notes / Message */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">
                                                Thư giới thiệu / Lời nhắn gửi tới Ban Tuyển Dụng
                                            </label>
                                            <textarea 
                                                rows={3}
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Giới thiệu ngắn về kinh nghiệm làm việc, thời gian có thể bắt đầu đi làm..."
                                                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all resize-y"
                                            />
                                        </div>

                                        {/* Action Button */}
                                        <div className="pt-2">
                                            <button 
                                                type="submit"
                                                disabled={submitting}
                                                className="w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                                            >
                                                {submitting ? (
                                                    <span>Đang tải lên và gửi hồ sơ...</span>
                                                ) : (
                                                    <>
                                                        <span>Xác Nhận & Gửi Hồ Sơ Ứng Tuyển</span>
                                                        <ArrowRight size={16} />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sticky Sidebar Info & Contacts (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Summary Sticky Card */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-5 lg:sticky lg:top-24">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 pb-3 border-b border-slate-100">
                                Tổng Quan Vị Trí
                            </h3>

                            <div className="space-y-3.5 text-xs">
                                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Phòng ban:</span>
                                    <span className="font-bold text-slate-800">{posting.requisition?.department || 'Khối Chuyên Môn'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Chức danh:</span>
                                    <span className="font-bold text-slate-800">{posting.requisition?.position || posting.title}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Số lượng cần:</span>
                                    <span className="font-bold text-emerald-700 font-mono">{posting.requisition?.headcount || 1} người</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Mức lương:</span>
                                    <span className="font-bold text-emerald-700">{salaryDisplay}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Hình thức:</span>
                                    <span className="font-bold text-slate-800">Toàn thời gian (Full-time)</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                    <span className="text-slate-500">Địa điểm:</span>
                                    <span className="font-bold text-slate-800 text-right">{companyInfo.address || 'TP. Hồ Chí Minh'}</span>
                                </div>
                            </div>

                            {!isClosedOrDraft && (
                                <button 
                                    onClick={scrollToApply}
                                    className="w-full py-3 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    <span>Nộp hồ sơ ngay</span>
                                    <ArrowRight size={14} />
                                </button>
                            )}

                            {/* Share Tools */}
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Chia Sẻ Tin Tuyển Dụng
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={handleCopyLink}
                                        className="py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                        <span>{copied ? 'Đã sao chép' : 'Sao chép link'}</span>
                                    </button>

                                    <button 
                                        onClick={() => setShowQrModal(true)}
                                        className="py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <QrCode size={14} />
                                        <span>Mã QR di động</span>
                                    </button>
                                </div>
                            </div>

                            {/* HR Contact Support */}
                            <div className="pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-2xl space-y-3">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <Phone size={13} className="text-emerald-600" />
                                    <span>Hỗ Trợ Ứng Viên 24/7</span>
                                </div>
                                <div className="space-y-1.5 text-xs text-slate-600">
                                    {companyInfo.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone size={12} className="text-slate-400" />
                                            <span className="font-semibold text-slate-800">{companyInfo.phone}</span>
                                        </div>
                                    )}
                                    {companyInfo.email && (
                                        <div className="flex items-center gap-2 truncate">
                                            <Mail size={12} className="text-slate-400" />
                                            <span className="font-semibold text-slate-800 truncate">{companyInfo.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Corporate Footer */}
            <footer className="bg-white border-t border-slate-200 py-10 mt-16 text-slate-600 text-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
                        <div>
                            <div className="font-black text-sm text-slate-900 tracking-tight">
                                {companyInfo.name}
                            </div>
                            <div className="text-slate-500 mt-1">
                                {companyInfo.address}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500">
                            {companyInfo.tax && <span>MST: <strong>{companyInfo.tax}</strong></span>}
                            {companyInfo.website && (
                                <span>• Website: <a href={`https://${companyInfo.website}`} target="_blank" rel="noreferrer" className="text-emerald-600 font-semibold hover:underline">{companyInfo.website}</a></span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-slate-400">
                        <div>
                            © {new Date().getFullYear()} {companyInfo.displayName || 'T-SOLUTION'}. Mọi quyền được bảo lưu.
                        </div>
                        <div className="flex items-center gap-4">
                            <span>Chính sách bảo mật hồ sơ</span>
                            <span>•</span>
                            <span>Quy chuẩn tuyển dụng doanh nghiệp</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* QR Code Modal */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-5">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-sm text-slate-900">Mã QR Tin Tuyển Dụng</h3>
                            <button 
                                onClick={() => setShowQrModal(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
                            <QRCodeSVG 
                                value={currentUrl || 'https://inside.tsol.vn'} 
                                size={200}
                                level="M"
                                includeMargin={true}
                            />
                        </div>

                        <div className="text-xs text-slate-500">
                            Quét mã QR bằng Camera điện thoại hoặc Zalo để mở và nộp hồ sơ trực tuyến ngay lập tức.
                        </div>

                        <button 
                            onClick={handleCopyLink}
                            className="w-full py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Copy size={14} />
                            <span>{copied ? 'Đã sao chép link' : 'Sao chép đường dẫn'}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
