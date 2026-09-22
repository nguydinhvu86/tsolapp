'use client'

import React, { useState, useEffect, useTransition } from 'react';
import { 
    HardDrive,
    ShieldCheck, 
    RefreshCw, 
    Search, 
    FileText,
    FileSpreadsheet,
    FileCode,
    FileImage,
    FileVideo,
    FileAudio,
    FileArchive,
    File,
    ExternalLink,
    Lock,
    Eye,
    Download,
    Filter,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    X,
    Database,
    Layers,
    User as UserIcon,
    Calendar,
    ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { fetchVaultAttachments, fetchVaultAuditLogs } from './actions';
import { DocumentPreviewModal } from '@/app/components/ui/DocumentPreviewModal';

const ENTITY_OPTIONS = [
    { value: 'ALL', label: 'Tất cả thực thể' },
    { value: 'TASK', label: 'Công Việc (Task)' },
    { value: 'SALES_INVOICE', label: 'Hóa Đơn Bán Hàng' },
    { value: 'SALES_ESTIMATE', label: 'Báo Giá Bán Hàng' },
    { value: 'SALES_ORDER', label: 'Đơn Hàng Bán' },
    { value: 'SALES_PAYMENT', label: 'Phiếu Thu Tiền' },
    { value: 'PURCHASE_BILL', label: 'Hóa Đơn Mua Hàng' },
    { value: 'PURCHASE_ORDER', label: 'Đơn Mua Hàng' },
    { value: 'PURCHASE_PAYMENT', label: 'Thanh Toán Nhà Cung Cấp' },
    { value: 'EXPENSE', label: 'Phiếu Chi Phí' },
    { value: 'CUSTOMER', label: 'Khách Hàng' },
    { value: 'SUPPLIER', label: 'Nhà Cung Cấp' },
    { value: 'PROJECT', label: 'Dự Án' },
    { value: 'LEAD', label: 'Cơ Hội Bán Hàng' },
    { value: 'CASH_TRANSACTION', label: 'Sổ Quỹ / Giao Dịch' },
];

const FILE_TYPE_OPTIONS = [
    { value: 'ALL', label: 'Tất cả định dạng' },
    { value: 'PDF', label: 'Tài liệu PDF (.pdf)' },
    { value: 'IMAGE', label: 'Hình ảnh (.png, .jpg, .webp...)' },
    { value: 'EXCEL', label: 'Bảng tính Excel (.xlsx, .csv)' },
    { value: 'DOCX', label: 'Tài liệu Word (.docx, .doc)' },
    { value: 'VIDEO', label: 'Video Clip (.mp4, .mov...)' },
    { value: 'AUDIO', label: 'Âm thanh (.mp3, .wav...)' },
    { value: 'ARCHIVE', label: 'Tệp nén (.zip, .rar...)' },
    { value: 'OTHER', label: 'Định dạng khác' },
];

const AUDIT_ACTION_OPTIONS = [
    { value: 'ALL', label: 'Tất cả hành động' },
    { value: 'CREATE', label: 'Tạo mới (CREATE)' },
    { value: 'UPDATE', label: 'Cập nhật (UPDATE)' },
    { value: 'STATUS_CHANGE', label: 'Đổi trạng thái' },
    { value: 'SIGN', label: 'Ký điện tử (SIGN)' },
    { value: 'ALLOCATE', label: 'Phân bổ thanh toán' },
    { value: 'DELETE', label: 'Xóa (DELETE)' },
];

export default function StorageVaultClient() {
    const [activeTab, setActiveTab] = useState<'vault' | 'audit'>('vault');
    const [isPending, startTransition] = useTransition();

    // Vault State
    const [attachments, setAttachments] = useState<any[]>([]);
    const [vaultTotal, setVaultTotal] = useState(0);
    const [vaultTotalAll, setVaultTotalAll] = useState(0);
    const [vaultTotalSize, setVaultTotalSize] = useState(0);
    const [vaultPage, setVaultPage] = useState(1);
    const [vaultPageSize, setVaultPageSize] = useState(25);
    const [vaultTotalPages, setVaultTotalPages] = useState(1);
    const [vaultSearch, setVaultSearch] = useState('');
    const [vaultEntityType, setVaultEntityType] = useState('ALL');
    const [vaultFileType, setVaultFileType] = useState('ALL');

    // Audit State
    const [logs, setLogs] = useState<any[]>([]);
    const [auditTotal, setAuditTotal] = useState(0);
    const [auditTotalAll, setAuditTotalAll] = useState(0);
    const [auditPage, setAuditPage] = useState(1);
    const [auditPageSize, setAuditPageSize] = useState(25);
    const [auditTotalPages, setAuditTotalPages] = useState(1);
    const [auditSearch, setAuditSearch] = useState('');
    const [auditEntityType, setAuditEntityType] = useState('ALL');
    const [auditAction, setAuditAction] = useState('ALL');

    const [loading, setLoading] = useState(true);

    // Preview Modal State
    const [previewModal, setPreviewModal] = useState<{
        isOpen: boolean;
        fileUrl: string;
        fileName: string;
    }>({
        isOpen: false,
        fileUrl: '',
        fileName: ''
    });

    // Fetch Vault Attachments
    const loadVaultData = async (page = vaultPage, search = vaultSearch, entityType = vaultEntityType, fileType = vaultFileType, pageSize = vaultPageSize) => {
        setLoading(true);
        const res = await fetchVaultAttachments({
            page,
            pageSize,
            search,
            entityType,
            fileType
        });
        if (res.success) {
            setAttachments(res.attachments || []);
            setVaultTotal(res.total || 0);
            setVaultTotalAll(res.totalAll || 0);
            setVaultTotalSize(res.totalSize || 0);
            setVaultTotalPages(res.totalPages || 1);
            setVaultPage(res.page || 1);
        }
        setLoading(false);
    };

    // Fetch Audit Logs
    const loadAuditData = async (page = auditPage, search = auditSearch, entityType = auditEntityType, action = auditAction, pageSize = auditPageSize) => {
        setLoading(true);
        const res = await fetchVaultAuditLogs({
            page,
            pageSize,
            search,
            entityType,
            action
        });
        if (res.success) {
            setLogs(res.logs || []);
            setAuditTotal(res.total || 0);
            setAuditTotalAll(res.totalAll || 0);
            setAuditTotalPages(res.totalPages || 1);
            setAuditPage(res.page || 1);
        }
        setLoading(false);
    };

    // Initial load & Tab Switch
    useEffect(() => {
        if (activeTab === 'vault') {
            loadVaultData();
        } else {
            loadAuditData();
        }
    }, [activeTab]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeTab === 'vault') {
            loadVaultData(1, vaultSearch, vaultEntityType, vaultFileType, vaultPageSize);
        } else {
            loadAuditData(1, auditSearch, auditEntityType, auditAction, auditPageSize);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileType: string, fileName: string) => {
        const ext = fileName?.split('.').pop()?.toLowerCase() || '';
        if (fileType === 'PDF' || ext === 'pdf') {
            return <FileText className="w-4 h-4 text-rose-600 shrink-0" />;
        }
        if (fileType === 'EXCEL' || ['xlsx', 'xls', 'csv'].includes(ext)) {
            return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />;
        }
        if (fileType === 'DOCX' || ['docx', 'doc'].includes(ext)) {
            return <FileText className="w-4 h-4 text-blue-600 shrink-0" />;
        }
        if (fileType === 'IMAGE' || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
            return <FileImage className="w-4 h-4 text-purple-600 shrink-0" />;
        }
        if (fileType === 'VIDEO' || ['mp4', 'mov', 'avi'].includes(ext)) {
            return <FileVideo className="w-4 h-4 text-amber-600 shrink-0" />;
        }
        if (fileType === 'AUDIO' || ['mp3', 'wav'].includes(ext)) {
            return <FileAudio className="w-4 h-4 text-teal-600 shrink-0" />;
        }
        if (fileType === 'ARCHIVE' || ['zip', 'rar', '7z'].includes(ext)) {
            return <FileArchive className="w-4 h-4 text-orange-600 shrink-0" />;
        }
        return <File className="w-4 h-4 text-slate-500 shrink-0" />;
    };

    const getEntityInfo = (entityType: string, entityId: string) => {
        let label = entityType;
        let url: string | null = null;
        let color = 'bg-slate-100 text-slate-700 border-slate-200';

        switch (entityType) {
            case 'TASK':
                label = 'Công Việc';
                url = `/tasks/${entityId}`;
                color = 'bg-blue-50 text-blue-700 border-blue-200';
                break;
            case 'SALES_INVOICE':
                label = 'Hóa Đơn Bán';
                url = `/sales/invoices/${entityId}`;
                color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                break;
            case 'SALES_ESTIMATE':
                label = 'Báo Giá';
                url = `/sales/estimates/${entityId}`;
                color = 'bg-sky-50 text-sky-700 border-sky-200';
                break;
            case 'SALES_ORDER':
                label = 'Đơn Hàng Bán';
                url = `/sales/orders/${entityId}`;
                color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                break;
            case 'SALES_PAYMENT':
                label = 'Phiếu Thu';
                url = `/sales/payments/${entityId}`;
                color = 'bg-green-50 text-green-700 border-green-200';
                break;
            case 'PURCHASE_BILL':
                label = 'Hóa Đơn Mua';
                url = `/purchasing/bills/${entityId}`;
                color = 'bg-orange-50 text-orange-700 border-orange-200';
                break;
            case 'PURCHASE_ORDER':
                label = 'Đơn Mua Hàng';
                url = `/purchasing/orders/${entityId}`;
                color = 'bg-amber-50 text-amber-700 border-amber-200';
                break;
            case 'PURCHASE_PAYMENT':
                label = 'Chi Nhà Cung Cấp';
                url = `/purchasing/payments/${entityId}`;
                color = 'bg-purple-50 text-purple-700 border-purple-200';
                break;
            case 'EXPENSE':
                label = 'Phiếu Chi';
                url = `/sales/expenses/${entityId}`;
                color = 'bg-rose-50 text-rose-700 border-rose-200';
                break;
            case 'CUSTOMER':
                label = 'Khách Hàng';
                url = `/customers/${entityId}`;
                color = 'bg-cyan-50 text-cyan-700 border-cyan-200';
                break;
            case 'SUPPLIER':
                label = 'Nhà Cung Cấp';
                url = `/suppliers/${entityId}`;
                color = 'bg-teal-50 text-teal-700 border-teal-200';
                break;
            case 'PROJECT':
                label = 'Dự Án';
                url = `/projects/${entityId}`;
                color = 'bg-violet-50 text-violet-700 border-violet-200';
                break;
            case 'LEAD':
                label = 'Cơ Hội (Lead)';
                url = `/sales/leads/${entityId}`;
                color = 'bg-yellow-50 text-yellow-800 border-yellow-200';
                break;
        }

        return { label, url, color };
    };

    const handleOpenPreview = (fileUrl: string, fileName: string) => {
        if (!fileUrl) {
            alert('Không tìm thấy đường dẫn tệp tin!');
            return;
        }
        setPreviewModal({
            isOpen: true,
            fileUrl,
            fileName: fileName || 'Tập tin đính kèm'
        });
    };

    // Render pagination buttons
    const renderPagination = (
        currentPage: number,
        totalPages: number,
        onPageChange: (newPage: number) => void
    ) => {
        if (totalPages <= 1) return null;

        const pages = [];
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return (
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Trang đầu"
                >
                    <ChevronsLeft size={16} />
                </button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Trang trước"
                >
                    <ChevronLeft size={16} />
                </button>

                {start > 1 && <span className="px-1 text-slate-400">...</span>}

                {pages.map((p) => (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={`min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            p === currentPage
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        {p}
                    </button>
                ))}

                {end < totalPages && <span className="px-1 text-slate-400">...</span>}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Trang sau"
                >
                    <ChevronRight size={16} />
                </button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Trang cuối"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 max-w-[1680px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                        <Lock className="w-4 h-4" /> Bảo Mật & Quản Trị CSDL Tập Trung
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                        Kho Lưu Trữ Đính Kèm & Nhật Ký Kiểm Toán Hợp Nhất
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
                        Quản trị tập trung toàn bộ tệp đính kèm trong CSDL và giám sát chi tiết lịch sử thay đổi dữ liệu (Audit Log).
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Stats Pill */}
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
                        <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                            <span className="text-slate-500 font-medium">Tổng dung lượng: </span>
                            <strong className="text-slate-800 dark:text-slate-200 font-mono">{formatFileSize(vaultTotalSize)}</strong>
                        </div>
                    </div>

                    <button
                        onClick={() => activeTab === 'vault' ? loadVaultData() : loadAuditData()}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-8">
                <button
                    onClick={() => setActiveTab('vault')}
                    className={`flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                        activeTab === 'vault'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                >
                    <HardDrive className="w-4 h-4" />
                    <span>Kho Tệp Đính Kèm Tập Trung</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-mono font-semibold">
                        {vaultTotalAll.toLocaleString('vi-VN')}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('audit')}
                    className={`flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                        activeTab === 'audit'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Nhật Ký Kiểm Toán Hợp Nhất</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono font-semibold">
                        {auditTotalAll.toLocaleString('vi-VN')}
                    </span>
                </button>
            </div>

            {/* TAB 1: KHO TỆP ĐÍNH KÈM TẬP TRUNG */}
            {activeTab === 'vault' && (
                <div className="space-y-4">
                    {/* Search & Filters Bar */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
                        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
                            {/* Search Input */}
                            <div className="lg:col-span-6 relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={vaultSearch}
                                    onChange={(e) => setVaultSearch(e.target.value)}
                                    placeholder="Tìm theo tên tệp, mã thực thể, ghi chú, người tải lên..."
                                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                />
                                {vaultSearch && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setVaultSearch('');
                                            loadVaultData(1, '', vaultEntityType, vaultFileType, vaultPageSize);
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Entity Type Filter */}
                            <div className="lg:col-span-3">
                                <select
                                    value={vaultEntityType}
                                    onChange={(e) => {
                                        setVaultEntityType(e.target.value);
                                        loadVaultData(1, vaultSearch, e.target.value, vaultFileType, vaultPageSize);
                                    }}
                                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                >
                                    {ENTITY_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* File Type Filter */}
                            <div className="lg:col-span-2">
                                <select
                                    value={vaultFileType}
                                    onChange={(e) => {
                                        setVaultFileType(e.target.value);
                                        loadVaultData(1, vaultSearch, vaultEntityType, e.target.value, vaultPageSize);
                                    }}
                                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                >
                                    {FILE_TYPE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Search Button */}
                            <div className="lg:col-span-1">
                                <button
                                    type="submit"
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                    Tìm
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Table Container */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
                        {loading ? (
                            <div className="p-16 text-center text-slate-500 space-y-3">
                                <RefreshCw className="w-8 h-8 mx-auto text-blue-600 animate-spin" />
                                <p className="text-sm font-medium">Đang tải danh sách tệp đính kèm tập trung...</p>
                            </div>
                        ) : attachments.length === 0 ? (
                            <div className="p-16 text-center text-slate-500 space-y-3">
                                <HardDrive className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                                <p className="font-bold text-base text-slate-800 dark:text-slate-200">Không tìm thấy tệp đính kèm nào</p>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                    Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc thực thể / định dạng tệp tin.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase text-slate-500 font-bold tracking-wider">
                                            <th className="py-3.5 px-4">Tên Tệp Đính Kèm</th>
                                            <th className="py-3.5 px-4">Thực Thể Liên Kết</th>
                                            <th className="py-3.5 px-4 text-center">Định Dạng</th>
                                            <th className="py-3.5 px-4 text-right">Dung Lượng</th>
                                            <th className="py-3.5 px-4">Người Tải / Ngày Đăng</th>
                                            <th className="py-3.5 px-4 text-center">Thao Tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {attachments.map((att) => {
                                            const entityInfo = getEntityInfo(att.entityType, att.entityId);
                                            return (
                                                <tr 
                                                    key={att.id} 
                                                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                                                >
                                                    {/* File Name & Preview Link */}
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex items-start gap-2.5 max-w-[340px] sm:max-w-md">
                                                            <div className="mt-0.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                                                                {getFileIcon(att.fileType, att.fileName)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <button
                                                                    onClick={() => handleOpenPreview(att.fileUrl, att.fileName)}
                                                                    className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-xs sm:text-sm text-left truncate block max-w-full cursor-pointer transition-colors"
                                                                    title="Nhấn để xem trước tệp tin"
                                                                >
                                                                    {att.fileName}
                                                                </button>
                                                                {att.notes && (
                                                                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                                                        {att.notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Entity Link */}
                                                    <td className="py-3.5 px-4">
                                                        {entityInfo.url ? (
                                                            <Link
                                                                href={entityInfo.url}
                                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors shadow-2xs ${entityInfo.color} hover:opacity-85`}
                                                                title="Xem chi tiết thực thể liên kết"
                                                            >
                                                                <span>{entityInfo.label}</span>
                                                                <span className="font-mono text-[10px] opacity-75">#{att.entityId.slice(-6)}</span>
                                                                <ArrowUpRight size={12} className="opacity-60" />
                                                            </Link>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                                {att.entityType}: {att.entityId.slice(-6)}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* File Type Badge */}
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md font-mono">
                                                            {att.fileType || 'FILE'}
                                                        </span>
                                                    </td>

                                                    {/* File Size */}
                                                    <td className="py-3.5 px-4 text-right text-xs text-slate-600 dark:text-slate-300 font-mono font-semibold">
                                                        {formatFileSize(att.fileSize)}
                                                    </td>

                                                    {/* Uploaded User & Date */}
                                                    <td className="py-3.5 px-4">
                                                        <div className="text-xs">
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                                                <UserIcon size={12} className="text-slate-400 shrink-0" />
                                                                <span>{att.uploadedBy?.name || 'Hệ thống'}</span>
                                                            </div>
                                                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                                                {new Date(att.createdAt).toLocaleString('vi-VN')}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-3.5 px-4 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={() => handleOpenPreview(att.fileUrl, att.fileName)}
                                                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 transition-colors cursor-pointer"
                                                                title="Xem trước tệp"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <a
                                                                href={att.fileUrl}
                                                                download={att.fileName}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
                                                                title="Tải tệp xuống / Mở liên kết gốc"
                                                            >
                                                                <Download size={14} />
                                                            </a>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
                            <div className="flex items-center gap-3 text-slate-500">
                                <span>
                                    Hiển thị <strong>{attachments.length > 0 ? (vaultPage - 1) * vaultPageSize + 1 : 0}</strong> - <strong>{Math.min(vaultTotal, vaultPage * vaultPageSize)}</strong> trên tổng số <strong className="text-slate-800 dark:text-slate-200">{vaultTotal.toLocaleString('vi-VN')}</strong> tệp
                                </span>
                                <div className="flex items-center gap-1 pl-3 border-l border-slate-200 dark:border-slate-700">
                                    <span>Xem:</span>
                                    <select
                                        value={vaultPageSize}
                                        onChange={(e) => {
                                            const newSize = parseInt(e.target.value, 10);
                                            setVaultPageSize(newSize);
                                            loadVaultData(1, vaultSearch, vaultEntityType, vaultFileType, newSize);
                                        }}
                                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                                    >
                                        <option value={15}>15</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                    <span>tệp/trang</span>
                                </div>
                            </div>

                            <div>
                                {renderPagination(vaultPage, vaultTotalPages, (newPage) => {
                                    loadVaultData(newPage, vaultSearch, vaultEntityType, vaultFileType, vaultPageSize);
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: NHẬT KÝ KIỂM TOÁN HỢP NHẤT */}
            {activeTab === 'audit' && (
                <div className="space-y-4">
                    {/* Search & Filters Bar */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
                        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
                            {/* Search Input */}
                            <div className="lg:col-span-6 relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={auditSearch}
                                    onChange={(e) => setAuditSearch(e.target.value)}
                                    placeholder="Tìm theo nội dung hành động, mã thực thể, người thao tác..."
                                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                />
                                {auditSearch && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAuditSearch('');
                                            loadAuditData(1, '', auditEntityType, auditAction, auditPageSize);
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Entity Filter */}
                            <div className="lg:col-span-3">
                                <select
                                    value={auditEntityType}
                                    onChange={(e) => {
                                        setAuditEntityType(e.target.value);
                                        loadAuditData(1, auditSearch, e.target.value, auditAction, auditPageSize);
                                    }}
                                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                >
                                    {ENTITY_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Action Filter */}
                            <div className="lg:col-span-2">
                                <select
                                    value={auditAction}
                                    onChange={(e) => {
                                        setAuditAction(e.target.value);
                                        loadAuditData(1, auditSearch, auditEntityType, e.target.value, auditPageSize);
                                    }}
                                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                >
                                    {AUDIT_ACTION_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Search Button */}
                            <div className="lg:col-span-1">
                                <button
                                    type="submit"
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                    Tìm
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Audit Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
                        {loading ? (
                            <div className="p-16 text-center text-slate-500 space-y-3">
                                <RefreshCw className="w-8 h-8 mx-auto text-blue-600 animate-spin" />
                                <p className="text-sm font-medium">Đang tải nhật ký kiểm toán hợp nhất...</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="p-16 text-center text-slate-500 space-y-3">
                                <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                                <p className="font-bold text-base text-slate-800 dark:text-slate-200">Không tìm thấy bản ghi kiểm toán nào</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase text-slate-500 font-bold tracking-wider">
                                            <th className="py-3.5 px-4">Hành Động</th>
                                            <th className="py-3.5 px-4">Đối Tượng Liên Quan</th>
                                            <th className="py-3.5 px-4">Chi Tiết Sự Kiện</th>
                                            <th className="py-3.5 px-4">Người Thực Hiện</th>
                                            <th className="py-3.5 px-4 text-right">Thời Gian</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {logs.map((log) => {
                                            const entityInfo = getEntityInfo(log.entityType, log.entityId);
                                            return (
                                                <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="py-3.5 px-4">
                                                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/70">
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        {entityInfo.url ? (
                                                            <Link
                                                                href={entityInfo.url}
                                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${entityInfo.color}`}
                                                            >
                                                                <span>{entityInfo.label}</span>
                                                                <span className="font-mono text-[10px]">#{log.entityId.slice(-6)}</span>
                                                                <ArrowUpRight size={12} className="opacity-60" />
                                                            </Link>
                                                        ) : (
                                                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                                                {log.entityType} ({log.entityId.slice(-6)})
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300 max-w-md">
                                                        <div className="line-clamp-2 leading-relaxed">
                                                            {log.details || 'Không có mô tả chi tiết'}
                                                        </div>
                                                        {log.ipAddress && (
                                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                                IP: {log.ipAddress}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs font-medium text-slate-800 dark:text-slate-200">
                                                        {log.user?.name || 'Hệ thống'}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                                                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
                            <div className="flex items-center gap-3 text-slate-500">
                                <span>
                                    Hiển thị <strong>{logs.length > 0 ? (auditPage - 1) * auditPageSize + 1 : 0}</strong> - <strong>{Math.min(auditTotal, auditPage * auditPageSize)}</strong> trên tổng số <strong className="text-slate-800 dark:text-slate-200">{auditTotal.toLocaleString('vi-VN')}</strong> bản ghi
                                </span>
                                <div className="flex items-center gap-1 pl-3 border-l border-slate-200 dark:border-slate-700">
                                    <span>Xem:</span>
                                    <select
                                        value={auditPageSize}
                                        onChange={(e) => {
                                            const newSize = parseInt(e.target.value, 10);
                                            setAuditPageSize(newSize);
                                            loadAuditData(1, auditSearch, auditEntityType, auditAction, newSize);
                                        }}
                                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                                    >
                                        <option value={15}>15</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                    <span>bản ghi/trang</span>
                                </div>
                            </div>

                            <div>
                                {renderPagination(auditPage, auditTotalPages, (newPage) => {
                                    loadAuditData(newPage, auditSearch, auditEntityType, auditAction, auditPageSize);
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            <DocumentPreviewModal
                isOpen={previewModal.isOpen}
                onClose={() => setPreviewModal({ ...previewModal, isOpen: false })}
                fileUrl={previewModal.fileUrl}
                fileName={previewModal.fileName}
            />
        </div>
    );
}
