'use client'

import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Globe,
    Code,
    ExternalLink,
    QrCode, 
    Search, 
    Plus, 
    ShieldCheck, 
    ShieldAlert, 
    CheckCircle2, 
    Package, 
    User, 
    FileText, 
    Clock, 
    RefreshCw,
    X,
    Filter,
    Upload,
    ArrowUpRight,
    Trash2,
    CheckSquare,
    Square,
    AlertCircle,
    Warehouse,
    Phone,
    Mail,
    Calendar,
    Copy,
    Check
} from 'lucide-react';
import { 
    AlertTriangle, ClipboardCheck, Scale, ArrowRightLeft, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { 
    fetchSerials,
    getInventorySerialDiscrepancies,
    reconcileInventoryToSerials,
    schedulePhysicalInventoryAudit, 
    createSerialRecord, 
    bulkCreateSerials, 
    dispatchSerialsAction,
    updateSerialStatus,
    deleteSerialRecord,
    lookupWarranty 
} from './actions';

export default function SerialManagementClient() {
    const [serials, setSerials] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, inStock: 0, sold: 0, other: 0 });
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [productFilter, setProductFilter] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('');

    // Selection
    const [selectedSerialNumbers, setSelectedSerialNumbers] = useState<string[]>([]);

    // Đối Soát & Cảnh Báo Lệch Tồn Kho vs Serial
    const [discrepancies, setDiscrepancies] = useState<any[]>([]);
    const [loadingDiscrepancies, setLoadingDiscrepancies] = useState(false);
    const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);
    const [isDiscrepancyExpanded, setIsDiscrepancyExpanded] = useState(true);

    const loadDiscrepancies = async () => {
        setLoadingDiscrepancies(true);
        try {
            const res = await getInventorySerialDiscrepancies();
            if (res.success) {
                setDiscrepancies(res.discrepancies || []);
            }
        } catch (e) {
            console.error('Lỗi tải đối soát tồn kho serial:', e);
        } finally {
            setLoadingDiscrepancies(false);
        }
    };

    const handleReconcile = async (item: any) => {
        if (!confirm(`Xác nhận điều chỉnh Tồn kho WMS của sản phẩm "${item.productName}" thành ${item.serialQty} chiếc để khớp chính xác với số mã Serial đang có trong kho?`)) {
            return;
        }
        setActionProcessingId(item.productId);
        try {
            const res = await reconcileInventoryToSerials(item.productId, item.warehouseId);
            if (res.success) {
                toast.success(res.message || 'Thao tác thành công');
                await Promise.all([loadData(), loadDiscrepancies()]);
            } else {
                toast.error(res.error || 'Lỗi khi cân bằng tồn kho');
            }
        } catch (err: any) {
            toast.error(err.message || 'Lỗi hệ thống');
        } finally {
            setActionProcessingId(null);
        }
    };

    const handleScheduleAudit = async (item: any) => {
        const notes = prompt(`Nhập ghi chú gửi Thủ kho / Bộ phận kiểm kê sản phẩm "${item.productName}":`, 'Yêu cầu kiểm đếm lại toàn bộ thiết bị thực tế tại kho và đối chiếu mã vạch serial/IMEI');
        if (notes === null) return;
        setActionProcessingId(item.productId);
        try {
            const res = await schedulePhysicalInventoryAudit(item.productId, item.warehouseId, notes);
            if (res.success) {
                toast.success(res.message || 'Thao tác thành công');
            } else {
                toast.error(res.error || 'Lỗi khi tạo yêu cầu kiểm kho');
            }
        } catch (err: any) {
            toast.error(err.message || 'Lỗi hệ thống');
        } finally {
            setActionProcessingId(null);
        }
    };

    // Modal Single Add
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [newSerial, setNewSerial] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [savingSingle, setSavingSingle] = useState(false);

    // Modal Bulk Import (Nhập hàng loạt 100 - 200 serial)
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkProductId, setBulkProductId] = useState('');
    const [bulkWarehouseId, setBulkWarehouseId] = useState('');
    const [bulkText, setBulkText] = useState('');
    const [bulkNotes, setBulkNotes] = useState('');
    const [savingBulk, setSavingBulk] = useState(false);

    // Modal Dispatch / Sell (Xuất bán cho khách hàng)
    const [showDispatchModal, setShowDispatchModal] = useState(false);
    const [dispatchCustomerId, setDispatchCustomerId] = useState('');
    const [dispatchWarrantyMonths, setDispatchWarrantyMonths] = useState(12);
    const [dispatchNotes, setDispatchNotes] = useState('');
    const [dispatchSerialList, setDispatchSerialList] = useState<string[]>([]);
    const [savingDispatch, setSavingDispatch] = useState(false);

    // Lookup state
    const [lookupSearch, setLookupSearch] = useState('');
    const [lookupResult, setLookupResult] = useState<any>(null);
    const [showEmbedCode, setShowEmbedCode] = useState(false);
    const [copiedPublicUrl, setCopiedPublicUrl] = useState(false);
    const [copiedEmbedSnippet, setCopiedEmbedSnippet] = useState(false);

    const getPublicLookupUrl = () => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/warranty`;
        }
        return '/warranty';
    };

    const handleCopyPublicUrl = () => {
        const url = getPublicLookupUrl();
        navigator.clipboard.writeText(url);
        setCopiedPublicUrl(true);
        toast.success('Đã sao chép đường link tra cứu bảo hành công khai!');
        setTimeout(() => setCopiedPublicUrl(false), 2000);
    };

    const handleCopyEmbedCode = () => {
        const snippet = `<iframe src="${getPublicLookupUrl()}?embed=true" width="100%" height="720" frameborder="0" style="border:none;border-radius:16px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);"></iframe>`;
        navigator.clipboard.writeText(snippet);
        setCopiedEmbedSnippet(true);
        toast.success('Đã sao chép mã nhúng Iframe cho website!');
        setTimeout(() => setCopiedEmbedSnippet(false), 2000);
    };
    const [lookingUp, setLookingUp] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const res = await fetchSerials({
            search,
            status: statusFilter,
            productId: productFilter || undefined,
            warehouseId: warehouseFilter || undefined
        });
        if (res.success) {
            setSerials(res.serials || []);
            setProducts(res.products || []);
            setCustomers(res.customers || []);
            setWarehouses(res.warehouses || []);
            if (res.stats) setStats(res.stats);
        } else {
            toast.error(res.error || 'Lỗi khi tải dữ liệu');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
        loadDiscrepancies();
    }, [statusFilter, productFilter, warehouseFilter]);

    // Parse bulk text into distinct serials
    const parsedBulkSerials = useMemo(() => {
        if (!bulkText.trim()) return [];
        // Split by newline, comma, semicolon, tab or space
        const tokens = bulkText
            .split(/[\r\n,;\t]+/)
            .map(s => s.trim())
            .filter(Boolean);
        return Array.from(new Set(tokens));
    }, [bulkText]);

    const handleCreateSerial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductId || !newSerial.trim()) {
            toast.warning('Vui lòng chọn sản phẩm và nhập số Serial');
            return;
        }

        setSavingSingle(true);
        const res = await createSerialRecord({
            productId: selectedProductId,
            serialNumber: newSerial.trim(),
            warehouseId: selectedWarehouseId || undefined,
            notes: newNotes
        });
        setSavingSingle(false);

        if (res.success) {
            toast.success(`Đã thêm số Serial ${newSerial.trim()} vào kho thành công!`);
            setShowAddModal(false);
            setNewSerial('');
            setNewNotes('');
            loadData();
        } else {
            toast.error(res.error || 'Lỗi khi tạo Serial');
        }
    };

    const handleBulkCreateSerials = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkProductId) {
            toast.warning('Vui lòng chọn sản phẩm áp dụng cho lô Serial này');
            return;
        }
        if (parsedBulkSerials.length === 0) {
            toast.warning('Vui lòng dán danh sách số Serial/IMEI');
            return;
        }

        setSavingBulk(true);
        const res = await bulkCreateSerials({
            productId: bulkProductId,
            serialNumbers: parsedBulkSerials,
            warehouseId: bulkWarehouseId || undefined,
            notes: bulkNotes
        });
        setSavingBulk(false);

        if (res.success) {
            toast.success(`Đã nhập kho thành công ${res.count} số Serial/IMEI!`);
            setShowBulkModal(false);
            setBulkText('');
            setBulkNotes('');
            loadData();
        } else {
            toast.error(res.error || 'Lỗi khi nhập danh sách Serial');
        }
    };

    const openDispatchModalForSelected = () => {
        if (selectedSerialNumbers.length === 0) {
            toast.warning('Vui lòng chọn ít nhất 1 số Serial để xuất bán');
            return;
        }
        setDispatchSerialList(selectedSerialNumbers);
        setShowDispatchModal(true);
    };

    const openDispatchModalForSingle = (serialNumber: string) => {
        setDispatchSerialList([serialNumber]);
        setShowDispatchModal(true);
    };

    const handleDispatchSerials = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dispatchCustomerId) {
            toast.warning('Vui lòng chọn khách hàng mua thiết bị');
            return;
        }
        if (dispatchSerialList.length === 0) {
            toast.warning('Chưa có số Serial nào để xuất bán');
            return;
        }

        setSavingDispatch(true);
        const res = await dispatchSerialsAction({
            serialNumbers: dispatchSerialList,
            customerId: dispatchCustomerId,
            warrantyMonths: Number(dispatchWarrantyMonths),
            notes: dispatchNotes
        });
        setSavingDispatch(false);

        if (res.success) {
            toast.success(`Đã xuất bán thành công ${res.count} thiết bị và kích hoạt bảo hành điện tử!`);
            setShowDispatchModal(false);
            setSelectedSerialNumbers([]);
            setDispatchSerialList([]);
            setDispatchNotes('');
            loadData();
        } else {
            toast.error(res.error || 'Lỗi khi xuất bán Serial');
        }
    };

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lookupSearch.trim()) return;
        setLookingUp(true);
        const res = await lookupWarranty(lookupSearch);
        setLookingUp(false);
        if (res.success) {
            setLookupResult(res.data);
            toast.success('Đã tìm thấy thông tin sản phẩm!');
        } else {
            toast.error(res.error || 'Không tìm thấy thông tin Serial');
            setLookupResult(null);
        }
    };

    const handleToggleSelectSerial = (serialNumber: string) => {
        setSelectedSerialNumbers(prev => 
            prev.includes(serialNumber) 
                ? prev.filter(s => s !== serialNumber) 
                : [...prev, serialNumber]
        );
    };

    const handleSelectAllInStock = () => {
        const inStockSerials = serials
            .filter(s => s.status === 'IN_STOCK')
            .map(s => s.serialNumber);

        if (selectedSerialNumbers.length === inStockSerials.length) {
            setSelectedSerialNumbers([]);
        } else {
            setSelectedSerialNumbers(inStockSerials);
        }
    };

    const handleDeleteSerial = async (id: string, serialNumber: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa số Serial "${serialNumber}" khỏi hệ thống không?`)) {
            return;
        }
        const res = await deleteSerialRecord(id);
        if (res.success) {
            toast.success('Đã xóa số Serial thành công');
            loadData();
        } else {
            toast.error(res.error || 'Lỗi khi xóa Serial');
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        const res = await updateSerialStatus(id, newStatus);
        if (res.success) {
            toast.success('Cập nhật trạng thái thành công');
            loadData();
        } else {
            toast.error(res.error || 'Lỗi khi cập nhật trạng thái');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'IN_STOCK':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Tồn kho</span>;
            case 'SOLD':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Đã xuất bán</span>;
            case 'UNDER_WARRANTY':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Đang bảo hành</span>;
            case 'DEFECTIVE':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">Lỗi / Hỏng</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                        <QrCode className="w-5 h-5" /> Quản Trị Kho Nâng Cao (Advanced WMS)
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Quản Lý Mã Định Danh Serial / IMEI & Bảo Hành</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Theo dõi vòng đời từng thiết bị: Nhập hàng loạt từ NCC, lưu kho, xuất bán cho đúng khách hàng & bảo hành điện tử chính xác
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer"
                    >
                        <Upload className="w-4 h-4" /> Nhập Hàng Loạt (100 - 200 mã)
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" /> Thêm Serial Lẻ
                    </button>
                </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs font-medium text-slate-400">Tổng mã định danh</span>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
                </div>
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 shadow-sm">
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Tồn kho khả dụng</span>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{stats.inStock}</p>
                </div>
                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800/40 shadow-sm">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Đã xuất bán cho khách</span>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{stats.sold}</p>
                </div>
                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/40 shadow-sm">
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Bảo hành / Đang xử lý</span>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{stats.other}</p>
                </div>
            </div>

            {/* Public Warranty Link & Website Embed Integration Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Cổng Tra Cứu Bảo Hành Công Khai & Tích Hợp Website
                                </h3>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                                    Public Link
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                Dùng để gửi cho khách hàng tra cứu trực tiếp hoặc nhúng vào website đại lý / đối tác (chỉ hiển thị thông tin sản phẩm và thời hạn bảo hành).
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleCopyPublicUrl}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                            {copiedPublicUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
                            <span>{copiedPublicUrl ? 'Đã Sao Chép Link' : 'Sao Chép Link Tra Cứu'}</span>
                        </button>
                        <a
                            href="/warranty"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                            <ExternalLink className="w-4 h-4" />
                            <span>Mở Trang Tra Cứu</span>
                        </a>
                        <button
                            type="button"
                            onClick={() => setShowEmbedCode(!showEmbedCode)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                            <Code className="w-4 h-4" />
                            <span>{showEmbedCode ? 'Ẩn Mã Nhúng' : 'Mã Nhúng Iframe'}</span>
                        </button>
                    </div>
                </div>

                {/* Display Public URL with One-Click Copy */}
                <div className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="font-semibold text-slate-500 whitespace-nowrap pl-1">Đường dẫn công khai:</span>
                    <input
                        type="text"
                        readOnly
                        value={getPublicLookupUrl()}
                        className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 font-mono font-bold text-blue-600 dark:text-blue-400 select-all outline-none"
                    />
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        Gợi ý: Gắn kèm <code className="font-mono text-emerald-600 font-bold">?sn=SERIAL</code> để tạo mã QR dán tem thiết bị
                    </span>
                </div>

                {/* Collapsible Iframe Code Box */}
                {showEmbedCode && (
                    <div className="p-4 rounded-xl bg-slate-900 text-slate-200 space-y-2.5 animate-in fade-in">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Code className="w-4 h-4 text-emerald-400" />
                                Mã HTML Nhúng Vào Website Đại Lý / Landing Page
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyEmbedCode}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                            >
                                {copiedEmbedSnippet ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedEmbedSnippet ? 'Đã Sao Chép Mã' : 'Sao Chép Mã Nhúng'}</span>
                            </button>
                        </div>
                        <pre className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap select-all border border-slate-800">
{`<iframe src="${getPublicLookupUrl()}?embed=true" width="100%" height="720" frameborder="0" style="border:none;border-radius:16px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);"></iframe>`}
                        </pre>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            💡 Quý đại lý có thể sao chép đoạn mã trên và dán trực tiếp vào mã nguồn website (WordPress, Landing Page, React...) để tạo khung kiểm tra bảo hành đồng bộ chính hãng cho khách hàng của mình.
                        </p>
                    </div>
                )}
            </div>

            {/* Electronic Warranty Quick Lookup Banner */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-blue-500/5 to-transparent p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        Tra Cứu Nhanh Bảo Hành Điện Tử & Khách Hàng Sở Hữu
                    </h2>
                    <span className="text-xs text-slate-500">Tra cứu tức thì bằng Serial hoặc IMEI</span>
                </div>
                <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                    <input
                        type="text"
                        placeholder="Nhập số Serial / IMEI (VD: SN-2026-WIN11, 8645020...)..."
                        value={lookupSearch}
                        onChange={(e) => setLookupSearch(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-sm"
                    />
                    <button
                        type="submit"
                        disabled={lookingUp}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {lookingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Kiểm tra bảo hành
                    </button>
                </form>

                {lookupResult && (
                    <div className="mt-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 shadow-lg space-y-4 animate-in fade-in">
                        {/* Certificate Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono font-extrabold text-lg text-slate-900 dark:text-white tracking-wider">
                                            {lookupResult.serialNumber}
                                        </span>
                                        {getStatusBadge(lookupResult.status)}
                                    </div>
                                    <span className="text-xs text-slate-500 font-medium">Chứng nhận bảo hành điện tử chính hãng</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {lookupResult.isNoWarranty ? (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
                                        Không áp dụng bảo hành (KBH)
                                    </span>
                                ) : lookupResult.status === 'IN_STOCK' ? (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        Thiết bị tồn kho (Bảo hành {lookupResult.warrantyMonths || 12} tháng khi bán)
                                    </span>
                                ) : lookupResult.isWarrantyValid ? (
                                    <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-xs">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        CÒN BẢO HÀNH (Còn {lookupResult.remainingDays} ngày)
                                    </span>
                                ) : (
                                    <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-xs">
                                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                                        HẾT HẠN BẢO HÀNH ({lookupResult.expiredDays ? `Hết ${lookupResult.expiredDays} ngày trước` : 'Đã hết hạn'})
                                    </span>
                                )}
                                <button 
                                    onClick={() => setLookupResult(null)} 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Certificate Details 3-Column Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            {/* Card 1: Warranty Period & Range */}
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
                                <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                    Thời Gian Bảo Hành Từ Ngày - Đến Ngày
                                </span>
                                
                                <div className="space-y-1.5 pt-1 text-slate-600 dark:text-slate-300">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Chính sách bảo hành:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            {lookupResult.isNoWarranty ? 'Không bảo hành (KBH)' : `${lookupResult.warrantyMonths || 12} Tháng`}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Từ ngày (Kích hoạt/Xuất):</span>
                                        <span className="font-bold font-mono text-slate-900 dark:text-white">
                                            {lookupResult.warrantyStartDate ? new Date(lookupResult.warrantyStartDate).toLocaleDateString('vi-VN') : (lookupResult.salesInvoiceDate ? new Date(lookupResult.salesInvoiceDate).toLocaleDateString('vi-VN') : (lookupResult.status === 'IN_STOCK' ? 'Kích hoạt khi xuất bán' : 'Chưa có'))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Đến ngày (Hết hạn):</span>
                                        <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">
                                            {lookupResult.warrantyEndDate ? new Date(lookupResult.warrantyEndDate).toLocaleDateString('vi-VN') : (lookupResult.isNoWarranty ? 'Không áp dụng' : 'Chưa kích hoạt')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700">
                                        <span className="text-slate-400">Thời gian còn lại:</span>
                                        <span className="font-extrabold text-slate-900 dark:text-white">
                                            {lookupResult.isNoWarranty ? (
                                                'Không tính hạn'
                                            ) : lookupResult.status === 'IN_STOCK' ? (
                                                'Nguyên hạn trong kho'
                                            ) : lookupResult.isWarrantyValid ? (
                                                `${lookupResult.remainingDays} ngày (~${Math.floor(lookupResult.remainingDays / 30)} tháng ${lookupResult.remainingDays % 30} ngày)`
                                            ) : (
                                                'Đã hết hạn bảo hành'
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Product & Warehouse Info */}
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
                                <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5 text-blue-600" />
                                    Thông Tin Sản Phẩm & Chứng Từ
                                </span>

                                <div className="space-y-1.5 pt-1 text-slate-600 dark:text-slate-300">
                                    <div>
                                        <span className="text-slate-400">Sản phẩm:</span>
                                        <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 line-clamp-1">{lookupResult.productName}</p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Mã SKU:</span>
                                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{lookupResult.sku || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Kho hàng:</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">{lookupResult.warehouseName || 'Kho chính'}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700">
                                        <span className="text-slate-400">Hóa đơn xuất:</span>
                                        <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                                            {lookupResult.salesInvoiceCode ? `HĐ: ${lookupResult.salesInvoiceCode}` : (lookupResult.purchaseBillCode ? `HĐ Mua: ${lookupResult.purchaseBillCode}` : 'Chưa xuất bán')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Customer & Ownership */}
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
                                <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-purple-600" />
                                    Khách Hàng Sở Hữu & Ghi Chú
                                </span>

                                <div className="space-y-1.5 pt-1 text-slate-600 dark:text-slate-300">
                                    {lookupResult.customerName ? (
                                        <>
                                            <div>
                                                <span className="text-slate-400">Khách hàng:</span>
                                                <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">{lookupResult.customerName}</p>
                                            </div>
                                            {lookupResult.customerPhone && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">Số điện thoại:</span>
                                                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{lookupResult.customerPhone}</span>
                                                </div>
                                            )}
                                            {lookupResult.customerEmail && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">Email:</span>
                                                    <span className="text-slate-700 dark:text-slate-300">{lookupResult.customerEmail}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="py-2 text-slate-400 italic">
                                            Thiết bị đang tồn trong kho, chưa xuất bán cho khách hàng.
                                        </div>
                                    )}
                                    {lookupResult.notes && (
                                        <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700">
                                            <span className="text-slate-400">Ghi chú:</span>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 italic mt-0.5">{lookupResult.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Selection Toolbar (Shows when items are selected) */}
            {selectedSerialNumbers.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            Đã chọn <span className="underline font-bold">{selectedSerialNumbers.length}</span> số Serial trong kho
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={openDispatchModalForSelected}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer"
                        >
                            <ArrowUpRight className="w-4 h-4" /> Xuất Bán Cho Khách Hàng ({selectedSerialNumbers.length})
                        </button>
                        <button
                            onClick={() => setSelectedSerialNumbers([])}
                            className="px-3 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 text-sm font-medium"
                        >
                            Bỏ chọn
                        </button>
                    </div>
                </div>
            )}

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo Serial, tên sản phẩm, tên khách hàng, số điện thoại..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadData()}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex flex-wrap gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="IN_STOCK">Tồn kho (In Stock)</option>
                        <option value="SOLD">Đã xuất bán (Sold)</option>
                        <option value="UNDER_WARRANTY">Đang bảo hành</option>
                        <option value="DEFECTIVE">Lỗi / Hỏng</option>
                    </select>

                    <select
                        value={productFilter}
                        onChange={(e) => setProductFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none max-w-[200px]"
                    >
                        <option value="">Tất cả sản phẩm</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    {warehouses.length > 0 && (
                        <select
                            value={warehouseFilter}
                            onChange={(e) => setWarehouseFilter(e.target.value)}
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none max-w-[180px]"
                        >
                            <option value="">Tất cả kho</option>
                            {warehouses.map((w) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={loadData}
                        title="Tải lại dữ liệu"
                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {serials.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <QrCode className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="font-semibold text-base">Chưa có mã Serial/IMEI nào phù hợp</p>
                        <p className="text-sm mt-1">Bấm "Nhập Hàng Loạt" để copy/paste 100-200 serial từ nhà cung cấp vào kho cùng lúc.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-semibold">
                                    <th className="py-3 px-4 w-10 text-center">
                                        <button 
                                            type="button" 
                                            onClick={handleSelectAllInStock} 
                                            title="Chọn tất cả số Serial đang tồn kho"
                                            className="text-slate-400 hover:text-blue-600"
                                        >
                                            {selectedSerialNumbers.length > 0 && selectedSerialNumbers.length === serials.filter(s => s.status === 'IN_STOCK').length ? (
                                                <CheckSquare className="w-4 h-4 text-blue-600" />
                                            ) : (
                                                <Square className="w-4 h-4" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="py-3 px-4">Số Serial / IMEI</th>
                                    <th className="py-3 px-4">Sản Phẩm</th>
                                    <th className="py-3 px-4">Kho Lưu Trữ</th>
                                    <th className="py-3 px-4">Trạng Thái</th>
                                    <th className="py-3 px-4">Khách Hàng Mua</th>
                                    <th className="py-3 px-4">Hạn Bảo Hành</th>
                                    <th className="py-3 px-4 text-right">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {serials.map((s) => {
                                    const isSelected = selectedSerialNumbers.includes(s.serialNumber);
                                    return (
                                        <tr 
                                            key={s.id} 
                                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                                                isSelected ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                                            }`}
                                        >
                                            <td className="py-3 px-4 text-center">
                                                {s.status === 'IN_STOCK' ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelectSerial(s.serialNumber)}
                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                                                {s.serialNumber}
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{s.product?.name}</p>
                                                <span className="text-xs text-slate-400 font-mono">Mã: {s.product?.sku || 'N/A'}</span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">
                                                {s.warehouse?.name || 'Kho chính'}
                                            </td>
                                            <td className="py-3 px-4">
                                                {getStatusBadge(s.status)}
                                            </td>
                                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                                {s.customer ? (
                                                    <div>
                                                        <p className="font-medium flex items-center gap-1">
                                                            <User className="w-3.5 h-3.5 text-blue-500" />
                                                            {s.customer.name}
                                                        </p>
                                                        {s.customer.phone && (
                                                            <span className="text-xs text-slate-400">{s.customer.phone}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">Chưa xuất bán</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                                {s.product?.warrantyMonths === 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                                        KBH
                                                    </span>
                                                ) : s.warrantyEndDate ? (
                                                    <div>
                                                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                            {new Date(s.warrantyEndDate).toLocaleDateString('vi-VN')}
                                                        </span>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${new Date() <= new Date(s.warrantyEndDate) ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                            <span className={`text-[10px] font-bold ${new Date() <= new Date(s.warrantyEndDate) ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                                {new Date() <= new Date(s.warrantyEndDate) ? 'Còn hạn' : 'Hết hạn'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                ({s.product?.warrantyMonths || 12}T)
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">
                                                        {s.status === 'IN_STOCK' ? `${s.product?.warrantyMonths || 12}T (Kho)` : '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {s.status === 'IN_STOCK' && (
                                                        <button
                                                            onClick={() => openDispatchModalForSingle(s.serialNumber)}
                                                            className="px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg transition-colors flex items-center gap-1"
                                                            title="Xuất bán cho khách hàng"
                                                        >
                                                            <ArrowUpRight className="w-3.5 h-3.5" /> Xuất bán
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteSerial(s.id, s.serialNumber)}
                                                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                                        title="Xóa Serial này"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal 1: Nhập Hàng Loạt (Bulk Import 100 - 200 serial từ NCC) */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-emerald-600" /> Nhập Hàng Loạt Số Serial / IMEI (100 - 200+ mã)
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Copy danh sách từ Excel hoặc email của Nhà cung cấp và dán thẳng vào đây
                                </p>
                            </div>
                            <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleBulkCreateSerials} className="space-y-4 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Chọn Sản phẩm nhập kho <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={bulkProductId}
                                        onChange={(e) => setBulkProductId(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                    >
                                        <option value="">-- Chọn sản phẩm --</option>
                                        {products.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.sku || 'Không có mã'})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Kho nhập lưu trữ
                                    </label>
                                    <select
                                        value={bulkWarehouseId}
                                        onChange={(e) => setBulkWarehouseId(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                    >
                                        <option value="">-- Kho chính (Mặc định) --</option>
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                                        Dán Danh Sách Serial / IMEI <span className="text-rose-500">*</span>
                                    </label>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                        parsedBulkSerials.length > 0 
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                            : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        Đã nhận diện: {parsedBulkSerials.length} mã hợp lệ
                                    </span>
                                </div>
                                <textarea
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder="Dán 100 hoặc 200 mã vào đây...&#10;VD:&#10;SN-WIN11-PRO-0001&#10;SN-WIN11-PRO-0002&#10;SN-WIN11-PRO-0003...&#10;(Mỗi mã một dòng hoặc cách nhau bằng dấu phẩy, khoảng trắng)"
                                    rows={8}
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-mono text-xs"
                                />
                            </div>

                            {parsedBulkSerials.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                                    <span className="text-xs text-slate-500 font-medium">Xem trước 5 mã đầu tiên:</span>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {parsedBulkSerials.slice(0, 5).map((sn, idx) => (
                                            <span key={idx} className="font-mono text-xs px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
                                                {sn}
                                            </span>
                                        ))}
                                        {parsedBulkSerials.length > 5 && (
                                            <span className="text-xs text-slate-400 self-center">
                                                ... và {parsedBulkSerials.length - 5} mã khác
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Ghi chú lô hàng (Nhà cung cấp, Số hóa đơn mua...)
                                </label>
                                <input
                                    type="text"
                                    value={bulkNotes}
                                    onChange={(e) => setBulkNotes(e.target.value)}
                                    placeholder="VD: Lô nhập NCC Digiworld theo HĐ mua PB-2026-09"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingBulk || parsedBulkSerials.length === 0}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {savingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {savingBulk ? 'Đang lưu vào kho...' : `Nhập Kho Ngay (${parsedBulkSerials.length} mã)`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Thêm 1 Serial lẻ */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Thêm Serial / IMEI Lẻ</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSerial} className="space-y-4 text-sm">
                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Chọn Sản phẩm <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                >
                                    <option value="">-- Chọn sản phẩm --</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.sku || 'N/A'})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Kho lưu trữ
                                </label>
                                <select
                                    value={selectedWarehouseId}
                                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                >
                                    <option value="">-- Kho chính (Mặc định) --</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Số Serial / IMEI <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newSerial}
                                    onChange={(e) => setNewSerial(e.target.value)}
                                    placeholder="VD: SN-2026-WIN11-001"
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-mono"
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Ghi chú
                                </label>
                                <textarea
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                    placeholder="Vị trí kệ, lô sản xuất..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingSingle}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm cursor-pointer"
                                >
                                    {savingSingle ? 'Đang lưu...' : 'Lưu Serial'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 3: Xuất Bán / Gán Khách Hàng & Kích Hoạt Bảo Hành */}
            {showDispatchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <ArrowUpRight className="w-5 h-5 text-blue-600" /> Xuất Bán & Kích Hoạt Bảo Hành
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Gán chính xác số Serial đã bán cho khách hàng để theo dõi và kiểm tra sau bán
                                </p>
                            </div>
                            <button onClick={() => setShowDispatchModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleDispatchSerials} className="space-y-4 text-sm">
                            <div className="bg-blue-50/60 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-200 dark:border-blue-800/50">
                                <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold block mb-1">
                                    Danh sách {dispatchSerialList.length} số Serial được xuất bán:
                                </span>
                                <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1">
                                    {dispatchSerialList.map((sn, idx) => (
                                        <span key={idx} className="font-mono text-xs px-2 py-0.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded text-blue-900 dark:text-blue-200 font-medium">
                                            {sn}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Chọn Khách Hàng Mua <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={dispatchCustomerId}
                                    onChange={(e) => setDispatchCustomerId(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                >
                                    <option value="">-- Chọn khách hàng nhận hàng --</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.phone ? `(${c.phone})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Thời Hạn Bảo Hành Điện Tử (Tháng)
                                </label>
                                <select
                                    value={dispatchWarrantyMonths}
                                    onChange={(e) => setDispatchWarrantyMonths(Number(e.target.value))}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                >
                                    <option value={0}>Không bảo hành</option>
                                    <option value={3}>3 tháng</option>
                                    <option value={6}>6 tháng</option>
                                    <option value={12}>12 tháng (1 năm)</option>
                                    <option value={24}>24 tháng (2 năm)</option>
                                    <option value={36}>36 tháng (3 năm)</option>
                                    <option value={60}>60 tháng (5 năm)</option>
                                </select>
                                <span className="text-xs text-slate-400 mt-1 block">
                                    Hệ thống sẽ tự động tính ngày hết hạn bảo hành kể từ ngày hôm nay.
                                </span>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Ghi chú xuất bán (Mã đơn hàng, nhân viên giao...)
                                </label>
                                <input
                                    type="text"
                                    value={dispatchNotes}
                                    onChange={(e) => setDispatchNotes(e.target.value)}
                                    placeholder="VD: Xuất theo đơn bán hàng SO-0826"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowDispatchModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingDispatch || !dispatchCustomerId}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {savingDispatch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {savingDispatch ? 'Đang xuất bán...' : `Xác Nhận Xuất Bán (${dispatchSerialList.length} thiết bị)`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
