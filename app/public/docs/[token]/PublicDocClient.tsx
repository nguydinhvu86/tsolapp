'use client';

import React, { useState } from 'react';
import { 
    Lock, 
    Printer, 
    Share2, 
    Check, 
    Copy, 
    FileText, 
    Building2, 
    Calendar, 
    User, 
    Clock, 
    ZoomIn, 
    ZoomOut, 
    ShieldCheck, 
    AlertTriangle,
    Eye,
    ArrowRight
} from 'lucide-react';
import { toast } from '@/app/components/providers/ToastProvider';
import { getPublicDocument } from '@/app/library/actions';

interface PublicDocClientProps {
    token: string;
    initialData: {
        document?: any;
        company?: any;
        isPasswordProtected?: boolean;
        title?: string;
        creatorName?: string;
        error?: string | null;
        expiresAt?: any;
    };
}

export default function PublicDocClient({ token, initialData }: PublicDocClientProps) {
    const [data, setData] = useState(initialData);
    const [passwordInput, setPasswordInput] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [passError, setPassError] = useState('');
    const [copiedLink, setCopiedLink] = useState(false);
    const [zoomLevel, setZoomLevel] = useState<'normal' | 'large' | 'xlarge'>('normal');

    // Handle password verification
    const handleVerifyPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordInput.trim()) {
            setPassError('Vui lòng nhập mật mã truy cập');
            return;
        }

        try {
            setIsVerifying(true);
            setPassError('');
            const res = await getPublicDocument(token, passwordInput.trim());
            if (res.error === 'WRONG_PASSWORD') {
                setPassError('Mật khẩu không chính xác. Vui lòng kiểm tra lại');
            } else if (res.document) {
                setData(res);
                toast.success('Mở khóa tài liệu thành công!');
            } else {
                setPassError('Không thể mở khóa tài liệu. Vui lòng thử lại');
            }
        } catch {
            setPassError('Đã xảy ra lỗi khi xác thực mật khẩu');
        } finally {
            setIsVerifying(false);
        }
    };

    // Handle copy link
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopiedLink(true);
            toast.success('Đã sao chép liên kết tài liệu!');
            setTimeout(() => setCopiedLink(false), 2500);
        } catch {
            toast.error('Không thể tự động sao chép');
        }
    };

    // Handle print
    const handlePrint = () => {
        window.print();
    };

    // ERROR STATE: NOT FOUND OR DISABLED
    if (data.error === 'NOT_FOUND' || data.error === 'DISABLED') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Lock size={28} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">
                        Tài Liệu Không Khả Dụng
                    </h1>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Tài liệu này không tồn tại hoặc đã được người gửi chuyển sang chế độ nội bộ và ngưng chia sẻ ra bên ngoài.
                    </p>
                    <div className="pt-2">
                        <span className="text-[11px] text-slate-400 font-medium">
                            Vui lòng liên hệ doanh nghiệp phát hành để nhận liên kết mới.
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // ERROR STATE: EXPIRED
    if (data.error === 'EXPIRED') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-rose-200 shadow-xl text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto border border-rose-100">
                        <AlertTriangle size={28} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">
                        Liên Kết Đã Hết Hạn
                    </h1>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Thời hạn truy cập công khai của tài liệu này đã kết thúc vào ngày{' '}
                        <strong className="text-slate-700">
                            {data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('vi-VN') : ''}
                        </strong>.
                    </p>
                    <div className="pt-2">
                        <span className="text-[11px] text-slate-400 font-medium">
                            Vui lòng liên hệ với người gửi để gia hạn hoặc tạo liên kết mới.
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // STATE: PASSWORD PROTECTED
    if (data.isPasswordProtected && !data.document) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
                    <div className="p-8 text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200/80 shadow-xs">
                            <Lock size={28} />
                        </div>
                        <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 mb-2">
                                Bảo mật bằng mật mã
                            </span>
                            <h1 className="text-xl font-bold text-slate-900">
                                {data.title || 'Văn Bản Được Bảo Vệ'}
                            </h1>
                            <p className="text-xs text-slate-500 mt-1">
                                Văn bản này yêu cầu mật khẩu để mở khóa xem nội dung.
                            </p>
                        </div>

                        <form onSubmit={handleVerifyPassword} className="space-y-4 pt-2 text-left">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                                    Nhập Mật Mã Truy Cập:
                                </label>
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    placeholder="Nhập mã passcode được cung cấp..."
                                    autoFocus
                                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-all font-mono"
                                />
                                {passError && (
                                    <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                                        <AlertTriangle size={13} /> {passError}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isVerifying}
                                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
                            >
                                <span>{isVerifying ? 'Đang xác thực...' : 'Mở Khóa Xem Văn Bản'}</span>
                                <ArrowRight size={15} />
                            </button>
                        </form>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400">
                        Phát hành bởi {data.creatorName || 'Doanh Nghiệp'}
                    </div>
                </div>
            </div>
        );
    }

    // STATE: GRANTED - SHOW DOCUMENT
    const doc = data.document;
    const company = data.company || {};
    const allowPrint = doc?.allowDownload !== false;

    return (
        <div className="min-h-screen bg-slate-100/90 text-slate-900 font-sans flex flex-col print:bg-white print:m-0">
            {/* Top Navigation & Brand Header */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs px-4 py-3 sm:px-8 print:hidden">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    {/* Brand Info */}
                    <div className="flex items-center gap-3 min-w-0">
                        {company.logo ? (
                            <img 
                                src={company.logo} 
                                alt="Logo" 
                                className="w-9 h-9 rounded-xl object-contain bg-white border border-slate-200/80 p-1 shrink-0 shadow-2xs" 
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                <Building2 size={16} />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 truncate">
                                {company.name || 'T-SOLUTIONS ENTERPRISE'}
                            </h2>
                            <span className="text-[10px] text-slate-400 block truncate font-medium">
                                Cổng Xem Tài Liệu & Văn Bản Trực Tuyến
                            </span>
                        </div>
                    </div>

                    {/* Reader Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Zoom buttons */}
                        <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 mr-1">
                            <button
                                type="button"
                                onClick={() => setZoomLevel('normal')}
                                className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                    zoomLevel === 'normal' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                }`}
                                title="Cỡ chữ chuẩn"
                            >
                                A
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoomLevel('large')}
                                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
                                    zoomLevel === 'large' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                }`}
                                title="Cỡ chữ to"
                            >
                                A+
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoomLevel('xlarge')}
                                className={`px-2 py-1 text-sm font-extrabold rounded-md transition-colors ${
                                    zoomLevel === 'xlarge' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                }`}
                                title="Cỡ chữ rất to"
                            >
                                A++
                            </button>
                        </div>

                        {/* Copy Link */}
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                            title="Sao chép liên kết này"
                        >
                            {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            <span className="hidden sm:inline">{copiedLink ? 'Đã Chép' : 'Chia Sẻ'}</span>
                        </button>

                        {/* Print / Save PDF */}
                        {allowPrint && (
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors active:scale-95"
                                title="In hoặc lưu PDF văn bản này"
                            >
                                <Printer size={14} />
                                <span>In / Lưu PDF</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Reading Container */}
            <main className="flex-1 py-8 px-4 sm:px-6 print:p-0 print:m-0">
                <article className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-lg print:border-none print:shadow-none print:rounded-none overflow-hidden">
                    {/* Document Header */}
                    <div className="p-8 sm:p-12 border-b border-slate-100 bg-gradient-to-b from-slate-50/60 to-white">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                                <ShieldCheck size={12} className="text-emerald-600" />
                                Văn Bản Chính Thức
                            </span>
                            {doc.categoryName && (
                                <span className="bg-slate-100 px-2.5 py-0.5 rounded-full font-medium text-slate-600">
                                    Thư mục: {doc.categoryName}
                                </span>
                            )}
                            {doc.version && (
                                <span className="text-slate-400 font-mono text-[11px]">
                                    Phiên bản v{doc.version}
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
                            {doc.title}
                        </h1>

                        {doc.description && (
                            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl italic">
                                {doc.description}
                            </p>
                        )}

                        <div className="pt-6 mt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <User size={13} className="text-slate-400" />
                                    <span>Người phát hành: <strong className="text-slate-800">{doc.creator?.name || 'Doanh Nghiệp'}</strong></span>
                                </div>
                                <span>•</span>
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={13} className="text-slate-400" />
                                    <span>Ngày lập: <strong className="text-slate-800">{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</strong></span>
                                </div>
                            </div>

                            <span className="text-[11px] text-slate-400 font-mono">
                                Cập nhật lần cuối: {new Date(doc.updatedAt).toLocaleDateString('vi-VN')}
                            </span>
                        </div>
                    </div>

                    {/* Document Body Content */}
                    <div className="p-8 sm:p-14">
                        <style>{`
                            .public-doc-body {
                                color: #0f172a;
                                line-height: 1.8;
                            }
                            .public-doc-body.zoom-normal { font-size: 15px; }
                            .public-doc-body.zoom-large { font-size: 17px; }
                            .public-doc-body.zoom-xlarge { font-size: 19px; }

                            .public-doc-body h1 {
                                font-size: 1.85em;
                                font-weight: 800;
                                margin-top: 1.5em;
                                margin-bottom: 0.6em;
                                color: #0f172a;
                                letter-spacing: -0.02em;
                            }
                            .public-doc-body h2 {
                                font-size: 1.45em;
                                font-weight: 700;
                                margin-top: 1.3em;
                                margin-bottom: 0.5em;
                                color: #1e293b;
                            }
                            .public-doc-body h3 {
                                font-size: 1.2em;
                                font-weight: 600;
                                margin-top: 1.1em;
                                margin-bottom: 0.4em;
                                color: #334155;
                            }
                            .public-doc-body p {
                                margin-bottom: 1em;
                            }
                            .public-doc-body blockquote {
                                border-left: 4px solid #10b981;
                                padding-left: 1.25em;
                                color: #334155;
                                font-style: italic;
                                background: #f0fdf4;
                                padding-top: 0.75em;
                                padding-bottom: 0.75em;
                                margin: 1.25em 0;
                                border-radius: 0 12px 12px 0;
                            }
                            .public-doc-body ul, .public-doc-body ol {
                                margin: 1em 0;
                                padding-left: 1.75em;
                            }
                            .public-doc-body li {
                                margin-bottom: 0.35em;
                            }
                            .public-doc-body table {
                                width: 100%;
                                border-collapse: collapse;
                                margin: 1.5em 0;
                                font-size: 0.95em;
                            }
                            .public-doc-body th, .public-doc-body td {
                                border: 1px solid #cbd5e1;
                                padding: 0.6em 0.85em;
                                text-align: left;
                            }
                            .public-doc-body th {
                                background-color: #f1f5f9;
                                font-weight: 700;
                            }
                            .public-doc-body img {
                                max-width: 100%;
                                height: auto;
                                border-radius: 12px;
                                margin: 1.5em auto;
                                display: block;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                            }
                            .public-doc-body pre {
                                background: #0f172a;
                                color: #f8fafc;
                                padding: 1.25em;
                                border-radius: 12px;
                                overflow-x: auto;
                                font-size: 0.85em;
                                margin: 1.25em 0;
                            }
                            .public-doc-body a {
                                color: #059669;
                                text-decoration: underline;
                            }
                        `}</style>
                        <div
                            className={`public-doc-body zoom-${zoomLevel}`}
                            dangerouslySetInnerHTML={{ __html: doc.content || '<p class="text-slate-400 italic">Văn bản không có nội dung.</p>' }}
                        />
                    </div>

                    {/* Official Sign-off & Verification Footer */}
                    <div className="p-8 sm:p-12 border-t border-slate-100 bg-slate-50/70 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="font-bold text-slate-800 uppercase tracking-wider">
                                {company.name || 'T-SOLUTIONS ENTERPRISE'}
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Văn bản chính thức được khởi tạo và lưu trữ trên nền tảng T-Drive
                            </p>
                        </div>
                        <div className="text-[11px] text-slate-400 text-left sm:text-right">
                            <div>Mã xác thực: <span className="font-mono text-slate-600">{token.slice(0, 16)}...</span></div>
                            <div>Thời điểm truy xuất: {new Date().toLocaleString('vi-VN')}</div>
                        </div>
                    </div>
                </article>
            </main>

            {/* Footer note */}
            <footer className="py-6 text-center text-xs text-slate-400 print:hidden">
                Được bảo mật và hỗ trợ bởi <strong>T-Solutions Enterprise System</strong>
            </footer>
        </div>
    );
}
