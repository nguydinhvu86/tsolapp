'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { toast } from '@/app/components/providers/ToastProvider';
import { 
    ArrowLeft, 
    Save, 
    Share2, 
    Eye, 
    Edit3, 
    Copy, 
    Check, 
    Lock, 
    Globe, 
    Shield, 
    Calendar, 
    Printer, 
    Folder, 
    Clock, 
    FileText, 
    X,
    ExternalLink,
    AlertCircle,
    SlidersHorizontal,
    Sparkles
} from 'lucide-react';
import { createOnlineDocument, updateOnlineDocument, updateDocumentSharingSettings } from '../actions';
import { renderCategorySelectOptions } from '../LibraryActionButtons';

// Dynamically import ReactQuill to prevent SSR window issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

interface OnlineDocEditorClientProps {
    initialDocument?: any;
    categories: any[];
    defaultCategoryId?: string;
    isLeadership?: boolean;
    currentUser: any;
}

export default function OnlineDocEditorClient({
    initialDocument,
    categories = [],
    defaultCategoryId,
    isLeadership = false,
    currentUser
}: OnlineDocEditorClientProps) {
    const router = useRouter();
    const isEdit = !!initialDocument;

    // Document state
    const [title, setTitle] = useState(initialDocument?.title || '');
    const [description, setDescription] = useState(initialDocument?.description || '');
    const [content, setContent] = useState(initialDocument?.content || '');
    const [categoryId, setCategoryId] = useState(initialDocument?.categoryId || defaultCategoryId || '');
    const [securityLevel, setSecurityLevel] = useState<'INHERIT' | 'PUBLIC' | 'CONFIDENTIAL'>(
        initialDocument?.securityLevel || 'INHERIT'
    );

    // Share & Security state
    const [isShareable, setIsShareable] = useState(initialDocument?.isShareable || false);
    const [sharePassword, setSharePassword] = useState(initialDocument?.sharePassword || '');
    const [hasPassword, setHasPassword] = useState(!!initialDocument?.sharePassword);
    const [shareExpiresAt, setShareExpiresAt] = useState(
        initialDocument?.shareExpiresAt ? new Date(initialDocument.shareExpiresAt).toISOString().split('T')[0] : ''
    );
    const [hasExpiry, setHasExpiry] = useState(!!initialDocument?.shareExpiresAt);
    const [allowDownload, setAllowDownload] = useState(
        initialDocument?.allowDownload !== undefined ? initialDocument.allowDownload : true
    );
    const [shareToken, setShareToken] = useState(initialDocument?.shareToken || '');

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    // Public link calculation
    const publicUrl = useMemo(() => {
        if (typeof window === 'undefined') return '';
        const token = shareToken || initialDocument?.shareToken;
        if (!token) return '';
        return `${window.location.origin}/public/docs/${token}`;
    }, [shareToken, initialDocument?.shareToken]);

    // Word and character statistics
    const stats = useMemo(() => {
        const textOnly = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const words = textOnly ? textOnly.split(' ').length : 0;
        const chars = textOnly.length;
        const readingTime = Math.max(1, Math.ceil(words / 200));
        return { words, chars, readingTime };
    }, [content]);

    // Handle Copy Link
    const handleCopyLink = async () => {
        if (!publicUrl) {
            toast.info('Vui lòng lưu văn bản trước để hệ thống khởi tạo liên kết chia sẻ');
            return;
        }
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopiedLink(true);
            toast.success('Đã sao chép liên kết chia sẻ vào bộ nhớ tạm!');
            setTimeout(() => setCopiedLink(false), 2500);
        } catch {
            toast.error('Không thể tự động sao chép. Vui lòng bôi đen và copy thủ công.');
        }
    };

    // Save document
    const handleSave = async () => {
        if (!title.trim()) {
            toast.info('Vui lòng nhập tiêu đề cho văn bản');
            return;
        }

        try {
            setIsSaving(true);
            const payload = {
                title: title.trim(),
                description: description.trim(),
                content,
                categoryId: categoryId || undefined,
                securityLevel,
                isShareable,
                sharePassword: hasPassword ? sharePassword.trim() : '',
                shareExpiresAt: hasExpiry && shareExpiresAt ? shareExpiresAt : null,
                allowDownload
            };

            let savedDoc;
            if (isEdit) {
                savedDoc = await updateOnlineDocument(initialDocument.id, payload);
                toast.success('Đã cập nhật văn bản thành công!');
            } else {
                savedDoc = await createOnlineDocument(payload);
                toast.success('Đã tạo mới và lưu văn bản thành công!');
                if (savedDoc.shareToken) {
                    setShareToken(savedDoc.shareToken);
                }
                router.replace(`/library/editor/${savedDoc.id}`);
            }

            if (savedDoc?.shareToken) {
                setShareToken(savedDoc.shareToken);
            }
            router.refresh();
        } catch (error: any) {
            console.error('Error saving online document:', error);
            toast.error(error.message || 'Không thể lưu văn bản. Vui lòng kiểm tra lại');
        } finally {
            setIsSaving(false);
        }
    };

    // Quill Toolbar & Modules configuration
    const quillModules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, 3, 4, false] }],
            [{ 'font': [] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['blockquote', 'code-block'],
            ['link', 'image'],
            ['clean']
        ],
    }), []);

    return (
        <div className="min-h-screen bg-slate-100/80 flex flex-col font-sans -m-4 md:-m-8">
            {/* 1. TOP STICKY APP BAR */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 sm:px-6 shadow-2xs">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Left: Back & Title input */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Link
                            href={categoryId ? `/library?category=${categoryId}` : '/library'}
                            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
                            title="Quay lại T-Drive"
                        >
                            <ArrowLeft size={19} />
                        </Link>
                        
                        <div className="min-w-0 flex-1">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Nhập tiêu đề văn bản tại đây (VD: Quy trình vận hành, Hướng dẫn...)"
                                className="w-full text-base sm:text-lg font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none transition-colors px-1 py-0.5 placeholder:text-slate-400 placeholder:font-normal"
                            />
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 px-1 mt-0.5">
                                <span className="flex items-center gap-1 font-medium text-slate-600">
                                    <FileText size={12} className="text-emerald-600" />
                                    {isEdit ? `Phiên bản v${initialDocument.version || '1.0'}` : 'Văn bản mới'}
                                </span>
                                <span>•</span>
                                <span>{stats.words} từ</span>
                                <span>•</span>
                                <span>Ước tính đọc: {stats.readingTime} phút</span>
                                {isShareable && (
                                    <>
                                        <span>•</span>
                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                            <Globe size={11} /> Đang chia sẻ khách
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {/* Toggle Preview Button */}
                        <button
                            type="button"
                            onClick={() => setIsPreviewMode(!isPreviewMode)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                                isPreviewMode 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                            title="Xem trước định dạng hiển thị"
                        >
                            {isPreviewMode ? <Edit3 size={14} /> : <Eye size={14} />}
                            <span>{isPreviewMode ? 'Tiếp tục soạn' : 'Xem trước'}</span>
                        </button>

                        {/* Share & Permissions Button */}
                        <button
                            type="button"
                            onClick={() => setIsShareModalOpen(true)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                                isShareable 
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 shadow-2xs' 
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                            title="Cài đặt phân quyền và liên kết chia sẻ"
                        >
                            <Share2 size={14} className={isShareable ? 'text-emerald-600' : 'text-slate-500'} />
                            <span>{isShareable ? 'Đang Chia Sẻ' : 'Chia Sẻ & Quyền'}</span>
                        </button>

                        {/* Save Button */}
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs hover:shadow transition-all disabled:opacity-60 active:scale-95"
                        >
                            <Save size={15} />
                            <span>{isSaving ? 'Đang lưu...' : 'Lưu Văn Bản'}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* 2. SUB-TOOLBAR: CATEGORY, SECURITY & DESCRIPTION */}
            <div className="bg-white border-b border-slate-200/80 px-4 py-2 sm:px-6">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Select Category */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                                <Folder size={13} className="text-slate-400" />
                                Lưu vào:
                            </span>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="h-8 px-2.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                            >
                                <option value="">📁 Gốc T-Drive (Không thuộc thư mục)</option>
                                {renderCategorySelectOptions(categories)}
                            </select>
                        </div>

                        {/* Security Level */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium flex items-center gap-1">
                                <Shield size={13} className="text-slate-400" />
                                Bảo mật:
                            </span>
                            <select
                                value={securityLevel}
                                onChange={(e) => setSecurityLevel(e.target.value as any)}
                                className="h-8 px-2.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                            >
                                <option value="INHERIT">Kế thừa thư mục cha (Mặc định)</option>
                                <option value="PUBLIC">🌐 Toàn công ty (Tất cả nhân sự)</option>
                                {isLeadership && (
                                    <option value="CONFIDENTIAL">🔒 MẬT (Chỉ Ban Lãnh Đạo)</option>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Quick Share Status Indicator */}
                    <div className="flex items-center gap-2">
                        {isShareable ? (
                            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg font-medium text-[11px]">
                                <Globe size={12} className="text-emerald-600" />
                                <span>Khách ngoài có thể xem qua link</span>
                                <button
                                    type="button"
                                    onClick={handleCopyLink}
                                    className="ml-1 text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
                                    title="Sao chép link ngay"
                                >
                                    {copiedLink ? 'Đã chép!' : 'Copy link'}
                                </button>
                            </div>
                        ) : (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Lock size={12} /> Chỉ nội bộ công ty
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. MAIN EDITOR CANVAS */}
            <main className="flex-1 py-8 px-4 sm:px-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    {/* Optional Short Description / Subtitle box */}
                    <div className="mb-4 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Tóm tắt ngắn / Ghi chú nội bộ (Tùy chọn)
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mô tả tóm tắt mục đích hoặc đối tượng áp dụng của văn bản này..."
                            className="w-full text-xs text-slate-700 bg-transparent outline-none placeholder:text-slate-400 font-medium"
                        />
                    </div>

                    {/* Document Paper Container */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[750px] flex flex-col">
                        {isPreviewMode ? (
                            /* PREVIEW MODE */
                            <div className="p-8 sm:p-14 space-y-6">
                                <div className="border-b border-slate-200 pb-5">
                                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                                        {title || 'Văn bản không tiêu đề'}
                                    </h1>
                                    {description && (
                                        <p className="text-sm text-slate-600 italic">
                                            {description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-4">
                                        <span>Soạn bởi: <strong className="text-slate-700">{currentUser?.name}</strong></span>
                                        <span>•</span>
                                        <span>Ngày: {new Date().toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>
                                
                                <div 
                                    className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-sans text-sm sm:text-base ql-editor-preview"
                                    dangerouslySetInnerHTML={{ __html: content || '<p class="text-slate-400 italic">Nội dung văn bản còn trống...</p>' }}
                                />
                            </div>
                        ) : (
                            /* RICH TEXT EDITING MODE */
                            <div className="flex-1 flex flex-col">
                                <style>{`
                                    .doc-quill-container .ql-toolbar.ql-snow {
                                        position: sticky;
                                        top: 105px;
                                        z-index: 30;
                                        background: #f8fafc;
                                        border: none;
                                        border-bottom: 1px solid #e2e8f0;
                                        padding: 0.75rem 1.25rem;
                                        font-family: inherit;
                                    }
                                    .doc-quill-container .ql-container.ql-snow {
                                        border: none;
                                        font-family: inherit;
                                        font-size: 0.95rem;
                                    }
                                    .doc-quill-container .ql-editor {
                                        min-height: 650px;
                                        padding: 2.5rem 3rem;
                                        line-height: 1.7;
                                        color: #0f172a;
                                    }
                                    .doc-quill-container .ql-editor.ql-blank::before {
                                        color: #94a3b8;
                                        font-style: normal;
                                        left: 3rem;
                                    }
                                    .doc-quill-container .ql-editor h1 {
                                        font-size: 1.85rem;
                                        font-weight: 800;
                                        margin-top: 1.5rem;
                                        margin-bottom: 0.75rem;
                                        color: #0f172a;
                                        letter-spacing: -0.02em;
                                    }
                                    .doc-quill-container .ql-editor h2 {
                                        font-size: 1.4rem;
                                        font-weight: 700;
                                        margin-top: 1.25rem;
                                        margin-bottom: 0.5rem;
                                        color: #1e293b;
                                    }
                                    .doc-quill-container .ql-editor h3 {
                                        font-size: 1.15rem;
                                        font-weight: 600;
                                        margin-top: 1rem;
                                        margin-bottom: 0.5rem;
                                        color: #334155;
                                    }
                                    .doc-quill-container .ql-editor blockquote {
                                        border-left: 4px solid #10b981;
                                        padding-left: 1rem;
                                        color: #475569;
                                        font-style: italic;
                                        background: #f0fdf4;
                                        padding-top: 0.5rem;
                                        padding-bottom: 0.5rem;
                                        border-radius: 0 8px 8px 0;
                                    }
                                    .doc-quill-container .ql-editor table {
                                        border-collapse: collapse;
                                        width: 100%;
                                        margin: 1rem 0;
                                    }
                                    .doc-quill-container .ql-editor table td,
                                    .doc-quill-container .ql-editor table th {
                                        border: 1px solid #cbd5e1;
                                        padding: 0.5rem 0.75rem;
                                    }
                                `}</style>
                                <div className="doc-quill-container flex-1">
                                    <ReactQuill
                                        theme="snow"
                                        value={content}
                                        onChange={setContent}
                                        modules={quillModules}
                                        placeholder="Bắt đầu soạn thảo nội dung văn bản tại đây... Hãy sử dụng thanh công cụ phía trên để định dạng tiêu đề, danh sách, màu sắc, bảng biểu hoặc chèn ảnh minh họa..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* 4. MODAL: SHARING & PERMISSIONS SETTINGS */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                    <Share2 size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Cài Đặt Chia Sẻ & Phân Quyền
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Quản lý quyền xem nội bộ hoặc tạo liên kết gửi khách hàng
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsShareModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            {/* Option 1: Share Mode Toggle */}
                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                            <Globe size={14} className={isShareable ? 'text-emerald-600' : 'text-slate-400'} />
                                            Chia sẻ liên kết công khai (Shareable)
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            {isShareable 
                                                ? 'Bất kỳ ai có liên kết đều có thể đọc nội dung văn bản này mà không cần đăng nhập'
                                                : 'Hiện tại văn bản chỉ được xem bởi nhân sự nội bộ trong hệ thống'}
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                                        <input
                                            type="checkbox"
                                            checked={isShareable}
                                            onChange={(e) => setIsShareable(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>

                                {/* Public Link Box (if shareable) */}
                                {isShareable && (
                                    <div className="pt-2 border-t border-slate-200/80 space-y-2">
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                            Đường dẫn liên kết gửi khách hàng:
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="text"
                                                readOnly
                                                value={publicUrl || 'Sẽ tạo liên kết sau khi bấm Lưu'}
                                                className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 outline-none select-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCopyLink}
                                                className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
                                            >
                                                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                                                <span>{copiedLink ? 'Đã Chép' : 'Copy'}</span>
                                            </button>
                                            {publicUrl && (
                                                <a
                                                    href={publicUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="h-9 w-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-colors shrink-0"
                                                    title="Mở xem trang khách"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Advanced Options for Sharing */}
                            {isShareable && (
                                <div className="space-y-4">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                        Bảo Mật Nâng Cao Cho Khách Xem
                                    </span>

                                    {/* Password protection */}
                                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={hasPassword}
                                                    onChange={(e) => {
                                                        setHasPassword(e.target.checked);
                                                        if (!e.target.checked) setSharePassword('');
                                                    }}
                                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <Lock size={13} className="text-amber-600" />
                                                Đặt mật khẩu mở tài liệu
                                            </label>
                                        </div>
                                        {hasPassword && (
                                            <input
                                                type="text"
                                                value={sharePassword}
                                                onChange={(e) => setSharePassword(e.target.value)}
                                                placeholder="Nhập mã truy cập (VD: 123456 hoặc passcode)..."
                                                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-emerald-500"
                                            />
                                        )}
                                    </div>

                                    {/* Expiration date */}
                                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={hasExpiry}
                                                    onChange={(e) => {
                                                        setHasExpiry(e.target.checked);
                                                        if (!e.target.checked) setShareExpiresAt('');
                                                    }}
                                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <Calendar size={13} className="text-blue-600" />
                                                Cài đặt ngày hết hạn chia sẻ
                                            </label>
                                        </div>
                                        {hasExpiry && (
                                            <input
                                                type="date"
                                                value={shareExpiresAt}
                                                onChange={(e) => setShareExpiresAt(e.target.value)}
                                                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-500"
                                            />
                                        )}
                                    </div>

                                    {/* Allow Print & PDF */}
                                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                            <Printer size={13} className="text-slate-500" />
                                            Cho phép khách in ấn & lưu PDF
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={allowDownload}
                                                onChange={(e) => setAllowDownload(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <span className="text-[11px] text-slate-400">
                                Nhấn "Lưu Cài Đặt" để áp dụng
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsShareModalOpen(false)}
                                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsShareModalOpen(false);
                                        handleSave();
                                    }}
                                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                                >
                                    Lưu Cài Đặt
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
