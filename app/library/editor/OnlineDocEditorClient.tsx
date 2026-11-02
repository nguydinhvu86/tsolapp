'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
    Sparkles,
    Download,
    Link2,
    Loader2,
    CheckCircle2,
    Layers,
    ChevronDown,
    Maximize2
} from 'lucide-react';
import { createOnlineDocument, updateOnlineDocument } from '../actions';
import { renderCategorySelectOptions } from '../LibraryActionButtons';
import { fetchGoogleDocHTML } from '@/app/actions/fetchGoogleDoc';

// Dynamically import JoditEditor to prevent SSR window issues
const JoditEditor = dynamic(() => import('jodit-react'), { 
    ssr: false,
    loading: () => (
        <div className="h-[750px] bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium">Đang tải trình soạn thảo văn bản Word Canvas...</p>
        </div>
    )
});

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
    const editorRef = useRef<any>(null);
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
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Google Docs Import Drawer / Modal
    const [isGDocOpen, setIsGDocOpen] = useState(false);
    const [googleDocLink, setGoogleDocLink] = useState('');
    const [isFetchingGoogleDoc, setIsFetchingGoogleDoc] = useState(false);
    const [googleDocError, setGoogleDocError] = useState('');

    // Public link calculation
    const publicUrl = useMemo(() => {
        if (typeof window === 'undefined') return '';
        const token = shareToken || initialDocument?.shareToken;
        if (!token) return '';
        return `${window.location.origin}/public/docs/${token}`;
    }, [shareToken, initialDocument?.shareToken]);

    // Word and character statistics
    const stats = useMemo(() => {
        const textOnly = (content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const words = textOnly ? textOnly.split(' ').filter(Boolean).length : 0;
        const chars = textOnly.length;
        const readingTime = Math.max(1, Math.ceil(words / 220));
        return { words, chars, readingTime };
    }, [content]);

    // Track changes
    const handleContentChange = useCallback((newContent: string) => {
        setContent(newContent);
        setHasUnsavedChanges(true);
    }, []);

    // Handle Copy Link
    const handleCopyLink = async () => {
        if (!publicUrl) {
            toast.info('Vui lòng lưu văn bản trước để hệ thống tạo liên kết chia sẻ');
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
                content: content || '',
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
            setHasUnsavedChanges(false);
            router.refresh();
        } catch (error: any) {
            console.error('Error saving online document:', error);
            toast.error(error.message || 'Không thể lưu văn bản. Vui lòng kiểm tra lại');
        } finally {
            setIsSaving(false);
        }
    };

    // Keyboard shortcut (Ctrl+S / Cmd+S to save)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [title, description, content, categoryId, securityLevel, isShareable, sharePassword, hasPassword, shareExpiresAt, hasExpiry, allowDownload, isEdit]);

    // Handle Import from Google Docs
    const handleImportGoogleDoc = async () => {
        if (!googleDocLink.trim()) {
            setGoogleDocError('Vui lòng nhập liên kết tài liệu Google Docs.');
            return;
        }

        setGoogleDocError('');
        setIsFetchingGoogleDoc(true);

        try {
            const res = await fetchGoogleDocHTML(googleDocLink);
            if (!res.success) {
                setGoogleDocError(res.error || 'Có lỗi xảy ra khi tải dữ liệu từ Google Docs.');
            } else if (res.html) {
                setContent(res.html);
                setHasUnsavedChanges(true);
                setIsGDocOpen(false);
                setGoogleDocLink('');
                toast.success('Đã nhập nội dung từ Google Docs thành công!');
            }
        } catch (error: any) {
            setGoogleDocError(error.message || 'Lỗi mạng khi kết nối Google Docs.');
        } finally {
            setIsFetchingGoogleDoc(false);
        }
    };

    // Jodit Editor Configuration - Enterprise Word-grade Ribbon
    const joditConfig = useMemo(() => ({
        readonly: false,
        placeholder: 'Bắt đầu soạn thảo văn bản, báo cáo, quyết định, quy trình vận hành...',
        language: 'vi',
        height: 850,
        minHeight: 650,
        width: '100%',
        theme: 'default',
        toolbarSticky: false,
        toolbarAdaptive: false,
        showCharsCounter: false,
        showWordsCounter: false,
        showXPathInStatusbar: false,
        enableDragAndDropFileToEditor: true,
        uploader: {
            insertImageAsBase64URI: true
        },
        buttons: [
            'source', '|',
            'undo', 'redo', '|',
            'paragraph', 'font', 'fontsize', 'brush', '|',
            'bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', '|',
            'align', '|',
            'ul', 'ol', 'outdent', 'indent', '|',
            'table', 'image', 'link', 'hr', '|',
            'copyformat', 'eraser', '|',
            'symbol', 'find', '|',
            'fullsize', 'preview', 'print'
        ],
        controls: {
            font: {
                list: {
                    'Plus Jakarta Sans, sans-serif': 'Plus Jakarta Sans (Hiện đại)',
                    'Times New Roman, Times, serif': 'Times New Roman (Văn bản chuẩn)',
                    'Arial, Helvetica, sans-serif': 'Arial (Tiêu chuẩn)',
                    'Inter, sans-serif': 'Inter (Công nghệ)',
                    'Roboto, sans-serif': 'Roboto',
                    'Calibri, sans-serif': 'Calibri (Office)',
                    'Georgia, serif': 'Georgia',
                    'Courier New, Courier, monospace': 'Courier New (Mã lệnh)'
                }
            },
            fontsize: {
                list: [
                    '9', '10', '11', '12', '13', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72'
                ]
            }
        },
        iframe: true,
        iframeStyle: `
            html {
                background: #f1f5f9;
                padding: 2.5rem 0;
                display: flex;
                justify-content: center;
                min-height: 100%;
                box-sizing: border-box;
            }
            body {
                width: 21cm !important;
                min-height: 29.7cm !important;
                margin: 0 auto !important;
                background: #ffffff !important;
                padding: 2.5cm 2cm 2cm 2.5cm !important;
                box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08) !important;
                border-radius: 4px !important;
                box-sizing: border-box !important;
                font-family: 'Plus Jakarta Sans', 'Times New Roman', Arial, sans-serif;
                font-size: 13.5pt;
                line-height: 1.6;
                color: #0f172a;
            }
            body > *:first-child {
                margin-top: 0;
            }
            h1 {
                font-size: 20pt;
                font-weight: 800;
                color: #0f172a;
                margin-top: 1.25rem;
                margin-bottom: 0.75rem;
                line-height: 1.3;
            }
            h2 {
                font-size: 16pt;
                font-weight: 700;
                color: #1e293b;
                margin-top: 1rem;
                margin-bottom: 0.5rem;
                line-height: 1.35;
            }
            h3 {
                font-size: 14pt;
                font-weight: 600;
                color: #334155;
                margin-top: 0.75rem;
                margin-bottom: 0.5rem;
            }
            h4 {
                font-size: 13pt;
                font-weight: 600;
                color: #475569;
            }
            p {
                margin-top: 0;
                margin-bottom: 0.65rem;
                text-align: justify;
            }
            table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 1rem 0 !important;
            }
            table td, table th {
                border: 1px solid #cbd5e1 !important;
                padding: 8px 12px !important;
                vertical-align: top !important;
            }
            table th {
                background-color: #f8fafc !important;
                font-weight: 700 !important;
                color: #0f172a !important;
            }
            blockquote {
                border-left: 4px solid #10b981;
                margin: 1rem 0;
                padding: 0.5rem 1rem;
                background: #f0fdf4;
                color: #166534;
                font-style: italic;
                border-radius: 0 6px 6px 0;
            }
            img {
                max-width: 100%;
                height: auto;
                border-radius: 6px;
            }
            a {
                color: #0284c7;
                text-decoration: underline;
            }
            hr {
                border: 0;
                border-top: 1px solid #cbd5e1;
                margin: 1.5rem 0;
            }
        `
    }), []);

    return (
        <div className="w-full flex flex-col font-sans -mt-4 -mx-4 md:-mt-8 md:-mx-8">
            {/* ======================================================== */}
            {/* 1. TOP COMMAND BAR (Word / Google Docs Suite Standard)     */}
            {/* ======================================================== */}
            <div className="bg-white border-b border-slate-200 shadow-2xs z-30">
                <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-3">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        
                        {/* LEFT: BACK BUTTON & TITLE INLINE EDIT */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Link
                                href={categoryId ? `/library?category=${categoryId}` : '/library'}
                                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0 border border-slate-200"
                                title="Quay lại danh mục T-Drive"
                            >
                                <ArrowLeft size={18} />
                            </Link>

                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xs shrink-0">
                                <FileText size={20} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => {
                                        setTitle(e.target.value);
                                        setHasUnsavedChanges(true);
                                    }}
                                    placeholder="Nhập tiêu đề văn bản (VD: Quy chế làm việc 2026, Hợp đồng nguyên tắc...)"
                                    className="w-full text-base sm:text-lg font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg outline-none transition-all px-2 py-1 placeholder:text-slate-400 placeholder:font-normal"
                                />

                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 px-2 mt-0.5">
                                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 flex items-center gap-1">
                                        <Sparkles size={11} />
                                        {isEdit ? `Tài liệu v${initialDocument.version || '1.0'}` : 'Văn bản mới'}
                                    </span>
                                    <span>•</span>
                                    <span>{stats.words} từ</span>
                                    <span>•</span>
                                    <span>{stats.chars} ký tự</span>
                                    <span>•</span>
                                    <span>~{stats.readingTime} phút đọc</span>
                                    {hasUnsavedChanges ? (
                                        <span className="text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                                            ● Chưa lưu thay đổi (Ctrl+S)
                                        </span>
                                    ) : (
                                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                                            <CheckCircle2 size={11} /> Đã đồng bộ
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: ACTIONS & SUITE BUTTONS */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-auto">
                            {/* Import Google Docs */}
                            <button
                                type="button"
                                onClick={() => setIsGDocOpen(!isGDocOpen)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                                    isGDocOpen 
                                        ? 'bg-blue-50 border-blue-300 text-blue-700' 
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                                title="Nhập nội dung từ liên kết Google Docs"
                            >
                                <Link2 size={14} className="text-blue-600" />
                                <span>Chép từ Google Docs</span>
                            </button>

                            {/* Preview Mode */}
                            <button
                                type="button"
                                onClick={() => setIsPreviewMode(!isPreviewMode)}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                                    isPreviewMode 
                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700' 
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                                title="Chuyển đổi giữa chế độ soạn thảo và xem trước bản in"
                            >
                                {isPreviewMode ? <Edit3 size={14} /> : <Eye size={14} />}
                                <span>{isPreviewMode ? 'Tiếp tục soạn' : 'Xem trước bản in'}</span>
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
                                title="Cài đặt phân quyền, mật khẩu và lấy link chia sẻ cho khách ngoài"
                            >
                                <Share2 size={14} className={isShareable ? 'text-emerald-600' : 'text-slate-500'} />
                                <span>{isShareable ? 'Đang Chia Sẻ Link' : 'Chia Sẻ & Quyền'}</span>
                            </button>

                            {/* Save Document Button */}
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs hover:shadow transition-all disabled:opacity-60 active:scale-95 cursor-pointer"
                                title="Lưu văn bản (Ctrl + S)"
                            >
                                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                <span>{isSaving ? 'Đang lưu...' : 'Lưu Văn Bản'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ======================================================== */}
                {/* 2. SUB-BAR: METADATA, FOLDER, SECURITY & FAST SHARE LINK */}
                {/* ======================================================== */}
                <div className="bg-slate-50/90 border-t border-slate-200/80 px-4 sm:px-6 py-2">
                    <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Category Select */}
                            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                <span className="text-slate-500 font-medium flex items-center gap-1">
                                    <Folder size={13} className="text-amber-500" />
                                    Lưu tại:
                                </span>
                                <select
                                    value={categoryId}
                                    onChange={(e) => {
                                        setCategoryId(e.target.value);
                                        setHasUnsavedChanges(true);
                                    }}
                                    className="bg-transparent border-none text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-1"
                                >
                                    <option value="">📁 Gốc T-Drive (Không thuộc thư mục)</option>
                                    {renderCategorySelectOptions(categories)}
                                </select>
                            </div>

                            {/* Security Level Select */}
                            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                <span className="text-slate-500 font-medium flex items-center gap-1">
                                    <Shield size={13} className="text-indigo-500" />
                                    Bảo mật:
                                </span>
                                <select
                                    value={securityLevel}
                                    onChange={(e) => {
                                        setSecurityLevel(e.target.value as any);
                                        setHasUnsavedChanges(true);
                                    }}
                                    className="bg-transparent border-none text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-1"
                                >
                                    <option value="INHERIT">Kế thừa thư mục cha (Mặc định)</option>
                                    <option value="PUBLIC">🌐 Toàn công ty (Tất cả nhân sự)</option>
                                    {isLeadership && (
                                        <option value="CONFIDENTIAL">🔒 MẬT (Chỉ Ban Lãnh Đạo)</option>
                                    )}
                                </select>
                            </div>

                            {/* Optional Short Description */}
                            <div className="hidden md:flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 max-w-md flex-1">
                                <span className="text-slate-400 font-medium text-[11px] shrink-0">Mô tả tóm tắt:</span>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => {
                                        setDescription(e.target.value);
                                        setHasUnsavedChanges(true);
                                    }}
                                    placeholder="Ghi chú tóm tắt mục đích văn bản..."
                                    className="w-full bg-transparent border-none text-xs text-slate-700 outline-none placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Quick Share Link Pill */}
                        <div className="flex items-center gap-2">
                            {isShareable ? (
                                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-lg font-medium text-[11px]">
                                    <Globe size={13} className="text-emerald-600" />
                                    <span>Khách ngoài có thể xem link</span>
                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        className="ml-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded shadow-2xs transition-colors cursor-pointer"
                                        title="Sao chép liên kết chia sẻ cho khách hàng"
                                    >
                                        {copiedLink ? '✓ Đã chép' : 'Sao chép link'}
                                    </button>
                                </div>
                            ) : (
                                <span className="text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                                    <Lock size={12} className="text-slate-400" /> Chỉ lưu hành nội bộ
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Google Docs Import Drawer (collapsible) */}
                {isGDocOpen && (
                    <div className="bg-blue-50/70 border-t border-blue-200 px-4 sm:px-6 py-3 transition-all animate-fadeIn">
                        <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 shrink-0">
                                <Link2 size={16} className="text-blue-600" />
                                <span>Tải nội dung trực tiếp từ Google Docs:</span>
                            </div>
                            <div className="flex-1 flex gap-2">
                                <input
                                    type="text"
                                    value={googleDocLink}
                                    onChange={(e) => setGoogleDocLink(e.target.value)}
                                    placeholder="Dán link bài viết Google Docs (Chế độ chia sẻ: Bất kỳ ai có liên kết đều xem được)..."
                                    className="flex-1 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 shadow-2xs"
                                    disabled={isFetchingGoogleDoc}
                                />
                                <button
                                    type="button"
                                    onClick={handleImportGoogleDoc}
                                    disabled={isFetchingGoogleDoc || !googleDocLink.trim()}
                                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                                >
                                    {isFetchingGoogleDoc ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                                    <span>{isFetchingGoogleDoc ? 'Đang chép...' : 'Chép Dữ Liệu'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsGDocOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        </div>
                        {googleDocError && (
                            <div className="max-w-[1700px] mx-auto mt-1.5 text-[11px] text-red-600 font-medium">
                                {googleDocError}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* 3. MAIN EDITOR WORKSPACE                                  */}
            {/* ======================================================== */}
            <main className="flex-1 bg-slate-100/90 py-6 px-3 sm:px-6">
                <div className="max-w-[1300px] mx-auto">
                    {isPreviewMode ? (
                        /* PREVIEW MODE: Standard A4 Print Paper Preview */
                        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 sm:p-16 max-w-[850px] mx-auto min-h-[900px]">
                            <div className="border-b border-slate-200 pb-6 mb-8">
                                <div className="text-center space-y-1 mb-8">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                                    </p>
                                    <p className="text-xs font-semibold text-slate-600 underline underline-offset-4">
                                        Độc lập - Tự do - Hạnh phúc
                                    </p>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center tracking-tight mb-3">
                                    {title || 'Văn bản không có tiêu đề'}
                                </h1>
                                {description && (
                                    <p className="text-xs text-slate-500 italic text-center max-w-xl mx-auto">
                                        {description}
                                    </p>
                                )}
                                <div className="flex items-center justify-between text-xs text-slate-400 mt-6 pt-4 border-t border-slate-100">
                                    <span>Tác giả: <strong className="text-slate-700">{currentUser?.name}</strong></span>
                                    <span>Ngày lập: {new Date().toLocaleDateString('vi-VN')}</span>
                                    <span>{stats.words} từ</span>
                                </div>
                            </div>

                            <div 
                                className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-sans text-sm sm:text-base"
                                dangerouslySetInnerHTML={{ __html: content || '<p class="text-slate-400 italic text-center">Nội dung văn bản còn trống...</p>' }}
                            />

                            <div className="mt-12 pt-8 border-t border-slate-200 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                                >
                                    <Printer size={14} />
                                    <span>In văn bản này</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* EDITING MODE: Enterprise Jodit Word Canvas */
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
                            <style>{`
                                /* Jodit Enterprise Word Styling Tweaks */
                                .jodit-toolbar-button__button {
                                    padding: 6px 7px !important;
                                    border-radius: 6px !important;
                                }
                                .jodit-toolbar-button:hover .jodit-toolbar-button__button {
                                    background: #f1f5f9 !important;
                                }
                                .jodit-container {
                                    border: none !important;
                                    font-family: inherit !important;
                                }
                                .jodit-toolbar-editor-collection_mode_horizontal {
                                    background: #ffffff !important;
                                    border-bottom: 1px solid #e2e8f0 !important;
                                    padding: 6px 12px !important;
                                }
                                .jodit-workplace {
                                    background: #f1f5f9 !important;
                                }
                                .jodit-status-bar {
                                    background: #f8fafc !important;
                                    border-top: 1px solid #e2e8f0 !important;
                                    padding: 4px 12px !important;
                                    font-size: 11px !important;
                                    color: #64748b !important;
                                }
                            `}</style>
                            <JoditEditor
                                ref={editorRef}
                                value={content}
                                config={joditConfig}
                                onBlur={(newContent) => handleContentChange(newContent)}
                                onChange={() => {
                                    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
                                }}
                            />
                        </div>
                    )}
                </div>
            </main>

            {/* ======================================================== */}
            {/* 4. MODAL: SHARING & SECURITY SETTINGS                     */}
            {/* ======================================================== */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-scaleIn">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                    <Share2 size={17} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Cài Đặt Chia Sẻ & Phân Quyền Văn Bản</h3>
                                    <p className="text-[11px] text-slate-500">Thiết lập liên kết cho khách hàng ngoài công ty xem văn bản</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsShareModalOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            {/* Toggle Shareable */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                                <div>
                                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                        <Globe size={14} className="text-emerald-600" />
                                        Bật liên kết chia sẻ công khai
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Khách hàng hoặc đối tác bên ngoài có liên kết có thể mở đọc văn bản này mà không cần đăng nhập tài khoản hệ thống.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                                    <input 
                                        type="checkbox" 
                                        checked={isShareable} 
                                        onChange={(e) => {
                                            setIsShareable(e.target.checked);
                                            setHasUnsavedChanges(true);
                                        }}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>

                            {/* Options if Shareable */}
                            {isShareable && (
                                <div className="space-y-4 pt-1">
                                    {/* Link display & copy */}
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                                            Đường dẫn công khai cho khách hàng:
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={publicUrl || 'Sẽ có liên kết sau khi lưu văn bản lần đầu'}
                                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCopyLink}
                                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
                                            >
                                                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                                                <span>{copiedLink ? 'Đã Chép' : 'Sao Chép'}</span>
                                            </button>
                                            {publicUrl && (
                                                <a
                                                    href={publicUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
                                                    title="Mở xem thử trên tab mới"
                                                >
                                                    <ExternalLink size={15} />
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Password protection */}
                                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={hasPassword} 
                                                    onChange={(e) => {
                                                        setHasPassword(e.target.checked);
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                                />
                                                <Lock size={13} className="text-slate-400" />
                                                Đặt mật khẩu xem văn bản
                                            </label>
                                        </div>
                                        {hasPassword && (
                                            <div className="mt-2.5">
                                                <input
                                                    type="text"
                                                    value={sharePassword}
                                                    onChange={(e) => {
                                                        setSharePassword(e.target.value);
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                    placeholder="Nhập mật khẩu (VD: ETI@2026)..."
                                                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Khách hàng phải nhập đúng mật khẩu này mới xem được nội dung.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Expiration date */}
                                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={hasExpiry} 
                                                    onChange={(e) => {
                                                        setHasExpiry(e.target.checked);
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                                />
                                                <Calendar size={13} className="text-slate-400" />
                                                Hạn sử dụng liên kết (Tự động khóa sau ngày này)
                                            </label>
                                        </div>
                                        {hasExpiry && (
                                            <div className="mt-2.5">
                                                <input
                                                    type="date"
                                                    value={shareExpiresAt}
                                                    onChange={(e) => {
                                                        setShareExpiresAt(e.target.value);
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Allow Download & Print */}
                                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                                            <Printer size={13} className="text-slate-400" />
                                            Cho phép khách tải về hoặc in văn bản
                                        </label>
                                        <input 
                                            type="checkbox" 
                                            checked={allowDownload} 
                                            onChange={(e) => {
                                                setAllowDownload(e.target.checked);
                                                setHasUnsavedChanges(true);
                                            }}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsShareModalOpen(false)}
                                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsShareModalOpen(false);
                                    handleSave();
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                            >
                                Áp Dụng & Lưu Văn Bản
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
