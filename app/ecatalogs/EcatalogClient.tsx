'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    ExternalLink,
    Copy,
    Check,
    QrCode,
    BookOpen,
    Layers,
    Globe,
    Lock,
    Sparkles,
    Eye,
    LayoutGrid,
    List,
    Download,
    Share2,
    Calendar,
    User,
    ArrowUpRight,
    X,
    Box
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { confirmModal } from '@/app/components/providers/ConfirmProvider';
import { toast } from '@/app/components/providers/ToastProvider';
import { submitEcatalog, deleteEcatalog } from './actions';
import { formatDate } from '@/lib/utils/formatters';

export default function EcatalogClient({
    initialEcatalogs,
    products,
    users,
    currentUserId,
    isAdminOrManager
}: any) {
    const router = useRouter();
    const [ecatalogs, setEcatalogs] = useState(initialEcatalogs);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLIC' | 'INTERNAL'>('ALL');
    const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

    // QR & Share Modal state
    const [qrModalCatalog, setQrModalCatalog] = useState<any | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Create Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [showDealerPrice, setShowDealerPrice] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // KPI Stats
    const stats = useMemo(() => {
        const total = ecatalogs.length;
        const totalItems = ecatalogs.reduce((acc: number, c: any) => acc + (c._count?.items || c.items?.length || 0), 0);
        const publicCount = ecatalogs.filter((c: any) => c.isPublic).length;
        const internalCount = total - publicCount;
        return { total, totalItems, publicCount, internalCount };
    }, [ecatalogs]);

    // Filtered catalogs
    const filteredCatalogs = useMemo(() => {
        return ecatalogs.filter((c: any) => {
            const matchesSearch =
                !search ||
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.code.toLowerCase().includes(search.toLowerCase()) ||
                (c.description && c.description.toLowerCase().includes(search.toLowerCase()));

            const matchesStatus =
                statusFilter === 'ALL' ||
                (statusFilter === 'PUBLIC' && c.isPublic) ||
                (statusFilter === 'INTERNAL' && !c.isPublic);

            return matchesSearch && matchesStatus;
        });
    }, [ecatalogs, search, statusFilter]);

    const getPublicUrl = (catalogId: string) => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/public/ecatalog/${catalogId}`;
        }
        return `/public/ecatalog/${catalogId}`;
    };

    const handleCopyLink = (catalog: any, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const url = getPublicUrl(catalog.id);
        navigator.clipboard.writeText(url);
        setCopiedId(catalog.id);
        toast.success(`Đã sao chép liên kết E-Catalog "${catalog.name}"`);
        setTimeout(() => setCopiedId(null), 2500);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.warning('Vui lòng nhập tên Catalog');
            return;
        }

        setIsCreating(true);
        const res = await submitEcatalog(currentUserId, {
            name: name.trim(),
            code: code.trim() || undefined,
            description: description.trim() || null,
            isPublic,
            showDealerPrice,
            items: []
        });

        setIsCreating(false);
        if (res.success && res.data) {
            toast.success('Khởi tạo E-Catalog thành công!');
            setIsCreateModalOpen(false);
            setName('');
            setCode('');
            setDescription('');
            router.push(`/ecatalogs/${res.data.id}`);
        } else {
            toast.error(res.error || 'Lỗi khi tạo E-Catalog');
        }
    };

    const handleDelete = async (catalog: any, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!(await confirmModal(`Bạn có chắc chắn muốn xóa E-Catalog "${catalog.name}"? Thao tác này không thể hoàn tác.`))) {
            return;
        }
        const res = await deleteEcatalog(catalog.id, currentUserId);
        if (res.success) {
            toast.info(`Đã xóa Catalog ${catalog.code}`);
            setEcatalogs(ecatalogs.filter((c: any) => c.id !== catalog.id));
        } else {
            toast.error(res.error || 'Lỗi khi xóa Catalog');
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. Header & KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Total Catalogs */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl transform translate-x-6 -translate-y-6 group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Tổng E-Catalog
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <BookOpen size={20} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                            {stats.total}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">bộ sưu tập</span>
                    </div>
                </div>

                {/* Card 2: Total Listed Products */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl transform translate-x-6 -translate-y-6 group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Sản Phẩm Niêm Yết
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Box size={20} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                            {stats.totalItems}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">mặt hàng phủ sóng</span>
                    </div>
                </div>

                {/* Card 3: Public Catalogs */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl transform translate-x-6 -translate-y-6 group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Đang Công Khai
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <Globe size={20} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-indigo-600 font-mono">
                            {stats.publicCount}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">sẵn sàng chia sẻ</span>
                    </div>
                </div>

                {/* Card 4: Internal / Draft */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl transform translate-x-6 -translate-y-6 group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Chế độ Nội Bộ
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Lock size={20} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-amber-700 font-mono">
                            {stats.internalCount}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">đang biên soạn</span>
                    </div>
                </div>
            </div>

            {/* 2. Interactive Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Search & Status Filters */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên catalog, mã CAT..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs text-slate-800 placeholder:text-slate-400 font-medium transition-all"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                statusFilter === 'ALL'
                                    ? 'bg-white text-slate-900 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Tất cả ({stats.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('PUBLIC')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                statusFilter === 'PUBLIC'
                                    ? 'bg-white text-emerald-700 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Globe size={12} className="text-emerald-600" />
                            Công khai ({stats.publicCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('INTERNAL')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                statusFilter === 'INTERNAL'
                                    ? 'bg-white text-amber-700 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Lock size={12} className="text-amber-600" />
                            Nội bộ ({stats.internalCount})
                        </button>
                    </div>
                </div>

                {/* Right: View Mode & Create Button */}
                <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
                    {/* View mode toggle */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                        <button
                            type="button"
                            onClick={() => setViewMode('GRID')}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                viewMode === 'GRID'
                                    ? 'bg-white text-emerald-700 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Chế độ bìa sách 3D (Grid Showroom)"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('TABLE')}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                viewMode === 'TABLE'
                                    ? 'bg-white text-emerald-700 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Chế độ bảng chi tiết (Smart Table)"
                        >
                            <List size={16} />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        <span>Tạo E-Catalog Mới</span>
                    </button>
                </div>
            </div>

            {/* 3. Catalog Listings: Grid Mode vs Table Mode */}
            {filteredCatalogs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 flex flex-col items-center justify-center text-center shadow-2xs">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                        <BookOpen size={32} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                        {search ? 'Không tìm thấy E-Catalog phù hợp' : 'Chưa có E-Catalog nào'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mb-5 leading-relaxed">
                        {search
                            ? `Không có kết quả nào cho "${search}". Vui lòng thử tìm với từ khóa khác.`
                            : 'Hãy bắt đầu tạo cuốn E-Catalog số đầu tiên để gửi thông tin sản phẩm và báo giá trực tuyến chuyên nghiệp tới khách hàng.'}
                    </p>
                    {search ? (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                        >
                            Xóa bộ lọc
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                            <Plus size={15} /> Tạo E-Catalog Ngay
                        </button>
                    )}
                </div>
            ) : viewMode === 'GRID' ? (
                /* GRID VIEW: Digital Book Cover Style */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredCatalogs.map((catalog: any) => {
                        const itemCount = catalog._count?.items || catalog.items?.length || 0;
                        const previewItems = catalog.items || [];
                        const isCopied = copiedId === catalog.id;

                        return (
                            <div
                                key={catalog.id}
                                className="bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group relative"
                            >
                                {/* Top Cover Spine / Gradient Banner */}
                                <div className="h-32 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-4 flex flex-col justify-between relative overflow-hidden">
                                    {/* Tech Grid Background Overlay */}
                                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />

                                    {/* Top Badges */}
                                    <div className="flex items-center justify-between z-10">
                                        <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-md backdrop-blur-xs">
                                            {catalog.code}
                                        </span>

                                        <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider backdrop-blur-xs ${
                                                catalog.isPublic
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                            }`}
                                        >
                                            {catalog.isPublic ? (
                                                <>
                                                    <Globe size={11} /> Công khai
                                                </>
                                            ) : (
                                                <>
                                                    <Lock size={11} /> Nội bộ
                                                </>
                                            )}
                                        </span>
                                    </div>

                                    {/* Bottom spine info */}
                                    <div className="z-10 flex items-center justify-between text-white/80 text-[11px]">
                                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                                            <BookOpen size={13} /> {itemCount} sản phẩm
                                        </span>
                                        <span className="text-white/60 text-[10.5px]">
                                            {formatDate(catalog.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                {/* Body Content */}
                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div>
                                        <Link
                                            href={`/ecatalogs/${catalog.id}`}
                                            className="block font-bold text-sm text-slate-900 hover:text-emerald-700 transition-colors line-clamp-2 leading-snug mb-1.5"
                                            title={catalog.name}
                                        >
                                            {catalog.name}
                                        </Link>

                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3 min-h-[32px]">
                                            {catalog.description || 'Chưa có mô tả ngắn về bộ sưu tập này.'}
                                        </p>

                                        {/* Product Preview Thumbnails (Up to 4) */}
                                        {previewItems.length > 0 && (
                                            <div className="flex items-center gap-1.5 mb-3.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                                {previewItems.slice(0, 4).map((p: any, idx: number) => {
                                                    const img = p.imageUrl || p.product?.imageUrl;
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-0.5 shrink-0"
                                                            title={p.customName || p.product?.name}
                                                        >
                                                            {img ? (
                                                                <img
                                                                    src={img}
                                                                    alt=""
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            ) : (
                                                                <Box size={16} className="text-slate-300" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {itemCount > 4 && (
                                                    <span className="text-[10.5px] font-bold text-slate-400 pl-1 font-mono">
                                                        +{itemCount - 4}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Creator & Actions Footer */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                    {catalog.creator?.name?.charAt(0) || 'U'}
                                                </div>
                                                <span className="truncate text-[11px] font-medium text-slate-600">
                                                    {catalog.creator?.name || 'Quản trị viên'}
                                                </span>
                                            </div>

                                            {/* QR Trigger Button */}
                                            <button
                                                type="button"
                                                onClick={() => setQrModalCatalog(catalog)}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                                title="Mở mã QR quét xem E-Catalog"
                                            >
                                                <QrCode size={13} className="text-slate-500" />
                                                <span>QR</span>
                                            </button>
                                        </div>

                                        {/* Action Buttons Row */}
                                        <div className="flex items-center gap-1.5">
                                            {/* Copy link button */}
                                            <button
                                                type="button"
                                                onClick={(e) => handleCopyLink(catalog, e)}
                                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                                    isCopied
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                }`}
                                                title="Sao chép đường dẫn gửi cho khách"
                                            >
                                                {isCopied ? <Check size={13} /> : <Copy size={13} />}
                                                <span>{isCopied ? 'Đã chép' : 'Copy link'}</span>
                                            </button>

                                            {/* Public preview button */}
                                            <Link
                                                href={`/public/ecatalog/${catalog.id}`}
                                                target="_blank"
                                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                                                title="Xem giao diện khách (Digital Brochure)"
                                            >
                                                <ExternalLink size={15} />
                                            </Link>

                                            {/* Edit button */}
                                            <Link
                                                href={`/ecatalogs/${catalog.id}`}
                                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors cursor-pointer"
                                                title="Chỉnh sửa sản phẩm & thông số"
                                            >
                                                <Edit2 size={15} />
                                            </Link>

                                            {/* Delete button */}
                                            <button
                                                type="button"
                                                onClick={(e) => handleDelete(catalog, e)}
                                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                                title="Xóa E-Catalog này"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* TABLE VIEW: Smart Table Mode */
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="py-3 px-4">Mã Catalog</th>
                                    <th className="py-3 px-4">Tên Catalog & Mô tả</th>
                                    <th className="py-3 px-4 text-center">Sản phẩm</th>
                                    <th className="py-3 px-4 text-center">Trạng thái</th>
                                    <th className="py-3 px-4">Người tạo</th>
                                    <th className="py-3 px-4">Ngày tạo</th>
                                    <th className="py-3 px-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCatalogs.map((catalog: any) => {
                                    const itemCount = catalog._count?.items || catalog.items?.length || 0;
                                    const isCopied = copiedId === catalog.id;

                                    return (
                                        <tr key={catalog.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-4">
                                                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                                                    {catalog.code}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4">
                                                <Link
                                                    href={`/ecatalogs/${catalog.id}`}
                                                    className="font-bold text-slate-900 hover:text-emerald-700 hover:underline block text-xs"
                                                >
                                                    {catalog.name}
                                                </Link>
                                                {catalog.description && (
                                                    <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 block">
                                                        {catalog.description}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                                                    <Box size={11} />
                                                    {itemCount} SP
                                                </span>
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                                                        catalog.isPublic
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                                                    }`}
                                                >
                                                    {catalog.isPublic ? <Globe size={11} /> : <Lock size={11} />}
                                                    {catalog.isPublic ? 'Công khai' : 'Nội bộ'}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                        {catalog.creator?.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <span className="text-slate-700 font-medium truncate">
                                                        {catalog.creator?.name || 'Quản trị viên'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                                {formatDate(catalog.createdAt)}
                                            </td>

                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setQrModalCatalog(catalog)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                        title="Mã QR E-Catalog"
                                                    >
                                                        <QrCode size={15} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCopyLink(catalog, e)}
                                                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                                            isCopied
                                                                ? 'text-emerald-600 bg-emerald-50'
                                                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                                        }`}
                                                        title="Sao chép liên kết"
                                                    >
                                                        {isCopied ? <Check size={15} /> : <Copy size={15} />}
                                                    </button>

                                                    <Link
                                                        href={`/public/ecatalog/${catalog.id}`}
                                                        target="_blank"
                                                        className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Xem trang khách"
                                                    >
                                                        <ExternalLink size={15} />
                                                    </Link>

                                                    <Link
                                                        href={`/ecatalogs/${catalog.id}`}
                                                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Chỉnh sửa sản phẩm"
                                                    >
                                                        <Edit2 size={15} />
                                                    </Link>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDelete(catalog, e)}
                                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 4. Interactive QR Code Modal */}
            {qrModalCatalog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 relative">
                        <button
                            type="button"
                            onClick={() => setQrModalCatalog(null)}
                            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>

                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                            <QrCode size={24} />
                        </div>

                        <div>
                            <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                                {qrModalCatalog.name}
                            </h3>
                            <p className="font-mono text-xs text-emerald-600 font-bold mt-0.5">
                                {qrModalCatalog.code}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                Quét mã để xem trực tiếp E-Catalog trên thiết bị di động
                            </p>
                        </div>

                        {/* QR Code Canvas Frame */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 inline-block shadow-inner">
                            <QRCodeSVG
                                value={getPublicUrl(qrModalCatalog.id)}
                                size={180}
                                level="H"
                                includeMargin={false}
                                className="mx-auto"
                            />
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => handleCopyLink(qrModalCatalog)}
                                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Copy size={14} />
                                <span>Sao chép đường dẫn E-Catalog</span>
                            </button>

                            <Link
                                href={`/public/ecatalog/${qrModalCatalog.id}`}
                                target="_blank"
                                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <ExternalLink size={14} />
                                <span>Mở trang xem thử (Khách)</span>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Create E-Catalog Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 relative">
                        <button
                            type="button"
                            onClick={() => !isCreating && setIsCreateModalOpen(false)}
                            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Tạo Cuốn E-Catalog Mới
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Khởi tạo bộ sưu tập giới thiệu giải pháp & sản phẩm số hóa
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4 text-xs">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">
                                    Tên E-Catalog <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="VD: Tổng Đài Điện Thoại Analog & VoIP..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs text-slate-800 font-medium"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">
                                    Mã Catalog (Tùy chọn - Tự sinh nếu để trống)
                                </label>
                                <input
                                    type="text"
                                    placeholder="VD: CAT-TONGDAI-2026..."
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs text-slate-800 font-mono"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">
                                    Mô tả ngắn / Thông điệp giới thiệu
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Giới thiệu sơ lược về danh mục, giải pháp phục vụ..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs text-slate-800 font-normal leading-relaxed"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <label className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={isPublic}
                                        onChange={(e) => setIsPublic(e.target.checked)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                    />
                                    <div>
                                        <span className="font-bold text-slate-800 block">Xuất bản công khai</span>
                                        <span className="text-[10.5px] text-slate-400 block">Khách hàng có link có thể xem ngay</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={showDealerPrice}
                                        onChange={(e) => setShowDealerPrice(e.target.checked)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                    />
                                    <div>
                                        <span className="font-bold text-slate-800 block">Hiển thị giá đại lý</span>
                                        <span className="text-[10.5px] text-slate-400 block">Hiện giá đại lý bên cạnh giá lẻ</span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    disabled={isCreating}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                >
                                    {isCreating ? (
                                        <span>Đang khởi tạo...</span>
                                    ) : (
                                        <>
                                            <Plus size={14} />
                                            <span>Tạo & Thêm Sản Phẩm</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
