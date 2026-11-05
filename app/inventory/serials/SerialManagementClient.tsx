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
    AlertTriangle, ClipboardCheck, Scale, ArrowRightLeft, Sparkles, ChevronDown, ChevronUp, Barcode, ClipboardPaste, Tag, KeyRound, Pencil } from 'lucide-react';
import ProductSearchSelect from '@/app/components/inventory/ProductSearchSelect';
import { 
    fetchSerials,
    getInventorySerialDiscrepancies,
    reconcileInventoryToSerials,
    schedulePhysicalInventoryAudit, 
    createSerialRecord, 
    bulkCreateSerials, 
    dispatchSerialsAction,
    updateSerialRecord,
    updateSerialStatus,
    deleteSerialRecord,
    lookupWarranty 
} from './actions';
import { calculateWarrantyRemaining } from '@/lib/warranty';

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
    const [serialTags, setSerialTags] = useState<string[]>([]);
    const [newNotes, setNewNotes] = useState('');
    const [savingSingle, setSavingSingle] = useState(false);

    // Modal Edit Serial & Product (Sửa sản phẩm / serial khi nhập sai)
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSerial, setEditingSerial] = useState<any>(null);
    const [editProductId, setEditProductId] = useState('');
    const [editSerialNumber, setEditSerialNumber] = useState('');
    const [editWarehouseId, setEditWarehouseId] = useState('');
    const [editStatus, setEditStatus] = useState('IN_STOCK');
    const [editNotes, setEditNotes] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    const handleOpenEditModal = (item: any) => {
        setEditingSerial(item);
        setEditProductId(item.productId || item.product?.id || '');
        setEditSerialNumber(item.serialNumber || '');
        setEditWarehouseId(item.warehouseId || item.warehouse?.id || '');
        setEditStatus(item.status || 'IN_STOCK');
        setEditNotes(item.notes || '');
        setShowEditModal(true);
    };

    const handleUpdateSerial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSerial) return;
        if (!editProductId) {
            toast.warning('Vui lòng chọn sản phẩm chính xác');
            return;
        }
        if (!editSerialNumber.trim()) {
            toast.warning('Số Serial/IMEI không được để trống');
            return;
        }

        setSavingEdit(true);
        const res = await updateSerialRecord({
            id: editingSerial.id,
            productId: editProductId,
            serialNumber: editSerialNumber.trim(),
            warehouseId: editWarehouseId || undefined,
            status: editStatus,
            notes: editNotes
        });
        setSavingEdit(false);

        if (res.success) {
            toast.success(`Đã cập nhật thông tin sản phẩm và Serial "${editSerialNumber.trim()}" thành công!`);
            setShowEditModal(false);
            setEditingSerial(null);
            loadData();
        } else {
            toast.error(res.error || 'Lỗi khi cập nhật Serial');
        }
    };

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
    const activeWarrantyStats = useMemo(() => {
        if (!lookupResult || !lookupResult.warrantyEndDate) return null;
        return calculateWarrantyRemaining(lookupResult.warrantyEndDate, lookupResult.warrantyMonths);
    }, [lookupResult]);
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

    const duplicateBulkCount = useMemo(() => {
        if (!bulkText.trim()) return 0;
        const rawTokens = bulkText.split(/[\r\n,;\t]+/).map(s => s.trim()).filter(Boolean);
        return Math.max(0, rawTokens.length - parsedBulkSerials.length);
    }, [bulkText, parsedBulkSerials.length]);

    const handleBulkPasteClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text || !text.trim()) {
                toast.info('Bộ nhớ tạm (Clipboard) đang trống.');
                return;
            }
            setBulkText(prev => prev ? `${prev}\n${text.trim()}` : text.trim());
            toast.success('Đã dán danh sách mã từ Clipboard!');
        } catch {
            toast.info('Nhấn Ctrl+V vào ô văn bản để dán danh sách mã');
        }
    };

    const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (text) {
                setBulkText(prev => prev ? `${prev}\n${text.trim()}` : text.trim());
                toast.success(`Đã đọc nội dung từ tệp "${file.name}"!`);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleInsertSampleSerials = () => {
        const sample = `SN-WIN11-PRO-001\nSN-WIN11-PRO-002\nSN-WIN11-PRO-003\nSN-WIN11-PRO-004\nSN-WIN11-PRO-005`;
        setBulkText(sample);
        toast.info('Đã điền 5 mã mẫu thử nghiệm');
    };

    const handleAddTag = () => {
        const trimmed = newSerial.trim();
        if (!trimmed) return;
        const tokens = trimmed.split(/[\r\n,;\t]+/).map(s => s.trim()).filter(Boolean);
        if (tokens.length === 0) return;

        setSerialTags(prev => {
            const combined = [...prev];
            let addedCount = 0;
            tokens.forEach(tok => {
                if (!combined.includes(tok)) {
                    combined.push(tok);
                    addedCount++;
                }
            });
            if (addedCount === 0) {
                toast.warning('Mã này đã có trong danh sách thẻ!');
            }
            return combined;
        });
        setNewSerial('');
    };

    const handlePasteClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text || !text.trim()) {
                toast.info('Bộ nhớ tạm (Clipboard) đang trống.');
                return;
            }
            const tokens = text.split(/[\r\n,;\t]+/).map(s => s.trim()).filter(Boolean);
            if (tokens.length === 0) return;

            setSerialTags(prev => {
                const combined = [...prev];
                tokens.forEach(tok => {
                    if (!combined.includes(tok)) {
                        combined.push(tok);
                    }
                });
                return combined;
            });
            toast.success(`Đã nhận diện ${tokens.length} mã thẻ từ clipboard!`);
        } catch (err) {
            toast.info('Nhấn Ctrl+V để dán mã vào ô nhập');
        }
    };

    const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData('text');
        if (!text) return;
        const tokens = text.split(/[\r\n,;\t]+/).map(s => s.trim()).filter(Boolean);
        if (tokens.length > 1) {
            e.preventDefault();
            setSerialTags(prev => {
                const combined = [...prev];
                tokens.forEach(tok => {
                    if (!combined.includes(tok)) {
                        combined.push(tok);
                    }
                });
                return combined;
            });
            setNewSerial('');
            toast.success(`Đã nhận diện và thêm ${tokens.length} mã thẻ từ nội dung dán!`);
        }
    };

    const handleRemoveTag = (index: number) => {
        setSerialTags(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleCreateSerial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductId) {
            toast.warning('Vui lòng chọn sản phẩm cần nhập Serial');
            return;
        }

        // Combine tags and any leftover text in the input
        const allSerials = [...serialTags];
        const trimmedInput = newSerial.trim();
        if (trimmedInput) {
            const pendingTokens = trimmedInput.split(/[\r\n,;\t]+/).map(s => s.trim()).filter(Boolean);
            pendingTokens.forEach(tok => {
                if (!allSerials.includes(tok)) {
                    allSerials.push(tok);
                }
            });
        }

        if (allSerials.length === 0) {
            toast.warning('Vui lòng nhập ít nhất 1 số Serial / IMEI / Mã thẻ');
            return;
        }

        setSavingSingle(true);
        if (allSerials.length === 1) {
            const res = await createSerialRecord({
                productId: selectedProductId,
                serialNumber: allSerials[0],
                warehouseId: selectedWarehouseId || undefined,
                notes: newNotes
            });
            setSavingSingle(false);

            if (res.success) {
                toast.success(`Đã thêm mã "${allSerials[0]}" vào kho thành công!`);
                setShowAddModal(false);
                setNewSerial('');
                setSerialTags([]);
                setNewNotes('');
                loadData();
            } else {
                toast.error(res.error || 'Lỗi khi tạo Serial');
            }
        } else {
            const res = await bulkCreateSerials({
                productId: selectedProductId,
                serialNumbers: allSerials,
                warehouseId: selectedWarehouseId || undefined,
                notes: newNotes
            });
            setSavingSingle(false);

            if (res.success) {
                toast.success(`Đã thêm thành công ${res.count} mã Serial / Thẻ vào kho!`);
                setShowAddModal(false);
                setNewSerial('');
                setSerialTags([]);
                setNewNotes('');
                loadData();
            } else {
                toast.error(res.error || 'Lỗi khi tạo danh sách Serial');
            }
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
                        suppressHydrationWarning
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
                        <pre suppressHydrationWarning className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap select-all border border-slate-800">
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
                                ) : (activeWarrantyStats?.isValid ?? lookupResult.isWarrantyValid) ? (
                                    <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-xs">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        {activeWarrantyStats?.badgeText || `CÒN BẢO HÀNH (Còn ${lookupResult.remainingDays} ngày)`}
                                    </span>
                                ) : (
                                    <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-xs">
                                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                                        {activeWarrantyStats?.badgeText || (lookupResult.expiredDays ? `HẾT HẠN BẢO HÀNH (Hết ${lookupResult.expiredDays} ngày trước)` : 'HẾT HẠN BẢO HÀNH')}
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
                                        <span className="font-bold font-mono text-slate-900 dark:text-white" suppressHydrationWarning>
                                            {lookupResult.warrantyStartDate ? new Date(lookupResult.warrantyStartDate).toLocaleDateString('vi-VN') : (lookupResult.salesInvoiceDate ? new Date(lookupResult.salesInvoiceDate).toLocaleDateString('vi-VN') : (lookupResult.status === 'IN_STOCK' ? 'Kích hoạt khi xuất bán' : 'Chưa có'))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Đến ngày (Hết hạn):</span>
                                        <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400" suppressHydrationWarning>
                                            {lookupResult.warrantyEndDate ? new Date(lookupResult.warrantyEndDate).toLocaleDateString('vi-VN') : (lookupResult.isNoWarranty ? 'Không áp dụng' : 'Chưa kích hoạt')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700">
                                        <span className="text-slate-400">Thời gian còn lại:</span>
                                        <span className="font-extrabold text-slate-900 dark:text-white" suppressHydrationWarning>
                                            {lookupResult.isNoWarranty ? (
                                                'Không tính hạn'
                                            ) : lookupResult.status === 'IN_STOCK' ? (
                                                'Nguyên hạn trong kho'
                                            ) : (
                                                activeWarrantyStats?.detailText || (
                                                    lookupResult.isWarrantyValid
                                                        ? `${lookupResult.remainingDays} ngày`
                                                        : 'Đã hết hạn bảo hành'
                                                )
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
                                        <a
                                            href={`/inventory/products?search=${encodeURIComponent(lookupResult.sku || lookupResult.productName || '')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex items-center gap-1 group"
                                            title="Nhấp để mở chi tiết / quản lý sản phẩm này"
                                        >
                                            <span className="line-clamp-1">{lookupResult.productName}</span>
                                            <ExternalLink className="w-3 h-3 text-blue-500 opacity-60 group-hover:opacity-100 shrink-0" />
                                        </a>
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
                                        <span className="text-slate-400">Chứng từ hóa đơn:</span>
                                        {lookupResult.salesInvoiceId ? (
                                            <a
                                                href={`/sales/invoices/${lookupResult.salesInvoiceId}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-mono font-bold text-xs hover:underline transition-all shadow-2xs"
                                                title="Mở chi tiết Hóa đơn bán hàng xuất thiết bị này"
                                            >
                                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                                <span>HĐ: {lookupResult.salesInvoiceCode}</span>
                                                <ExternalLink className="w-3 h-3 text-blue-500" />
                                            </a>
                                        ) : lookupResult.purchaseBillId ? (
                                            <a
                                                href={`/purchasing/bills/${lookupResult.purchaseBillId}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-mono font-bold text-xs hover:underline transition-all shadow-2xs"
                                                title="Mở chi tiết Hóa đơn mua hàng nhập thiết bị này"
                                            >
                                                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>HĐ Mua: {lookupResult.purchaseBillCode}</span>
                                                <ExternalLink className="w-3 h-3 text-emerald-500" />
                                            </a>
                                        ) : (
                                            <span className="font-medium text-slate-400 italic">Chưa xuất bán</span>
                                        )}
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
                                                {lookupResult.customerId ? (
                                                    <a
                                                        href={`/customers/${lookupResult.customerId}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex items-center gap-1 group"
                                                        title="Nhấp để xem hồ sơ và công nợ khách hàng này"
                                                    >
                                                        <span>{lookupResult.customerName}</span>
                                                        <ExternalLink className="w-3 h-3 text-blue-500 opacity-60 group-hover:opacity-100 shrink-0" />
                                                    </a>
                                                ) : (
                                                    <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">{lookupResult.customerName}</p>
                                                )}
                                            </div>
                                            {lookupResult.customerPhone && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">Số điện thoại:</span>
                                                    <a href={`tel:${lookupResult.customerPhone}`} className="font-bold font-mono text-blue-600 dark:text-blue-400 hover:underline">
                                                        {lookupResult.customerPhone}
                                                    </a>
                                                </div>
                                            )}
                                            {lookupResult.customerEmail && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400">Email:</span>
                                                    <a href={`mailto:${lookupResult.customerEmail}`} className="text-slate-700 dark:text-slate-300 hover:underline">
                                                        {lookupResult.customerEmail}
                                                    </a>
                                                </div>
                                            )}
                                            {lookupResult.customerId && (
                                                <div className="pt-1">
                                                    <a
                                                        href={`/customers/${lookupResult.customerId}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-semibold hover:underline transition-colors"
                                                    >
                                                        <User className="w-3 h-3" />
                                                        <span>Mở Hồ Sơ Khách Hàng</span>
                                                        <ExternalLink className="w-2.5 h-2.5" />
                                                    </a>
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

                    <div className="w-full sm:w-[320px] md:w-[360px]">
                        <ProductSearchSelect
                            products={products}
                            value={productFilter}
                            onChange={setProductFilter}
                            allOptionLabel="Tất cả sản phẩm"
                            placeholder="Tất cả sản phẩm"
                        />
                    </div>

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
                                                {s.product ? (
                                                    <a
                                                        href={`/inventory/products?search=${encodeURIComponent(s.product.sku || s.product.name)}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="group flex flex-col items-start hover:text-blue-600 transition-colors"
                                                        title="Nhấp để mở chi tiết / quản lý sản phẩm này"
                                                    >
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline flex items-center gap-1">
                                                            {s.product.name}
                                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 shrink-0" />
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-mono">Mã: {s.product.sku || 'N/A'}</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic">Không rõ</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">
                                                {s.warehouse?.name || 'Kho chính'}
                                            </td>
                                            <td className="py-3 px-4">
                                                {getStatusBadge(s.status)}
                                            </td>
                                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                                {s.customer ? (
                                                    <div className="space-y-0.5">
                                                        <a
                                                            href={`/customers/${s.customer.id}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex items-center gap-1 group"
                                                            title="Nhấp để xem hồ sơ khách hàng này"
                                                        >
                                                            <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                            <span className="truncate max-w-[200px]">{s.customer.name}</span>
                                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 shrink-0" />
                                                        </a>
                                                        {s.customer.phone && (
                                                            <span className="text-xs text-slate-400 block">{s.customer.phone}</span>
                                                        )}
                                                        {s.salesInvoice && (
                                                            <a
                                                                href={`/sales/invoices/${s.salesInvoice.id}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                                                title="Mở hóa đơn bán hàng xuất thiết bị này"
                                                            >
                                                                <FileText className="w-3 h-3" />
                                                                HĐ: {s.salesInvoice.code}
                                                                <ExternalLink className="w-2.5 h-2.5" />
                                                            </a>
                                                        )}
                                                        {s.purchaseBill && !s.salesInvoice && (
                                                            <a
                                                                href={`/purchasing/bills/${s.purchaseBill.id}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                                                                title="Mở hóa đơn mua hàng nhập thiết bị này"
                                                            >
                                                                <FileText className="w-3 h-3" />
                                                                HĐ Mua: {s.purchaseBill.code}
                                                                <ExternalLink className="w-2.5 h-2.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-0.5">
                                                        <span className="text-slate-400 italic text-xs">Chưa xuất bán</span>
                                                        {s.purchaseBill && (
                                                            <a
                                                                href={`/purchasing/bills/${s.purchaseBill.id}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="block font-mono text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                                                                title="Mở hóa đơn mua hàng nhập thiết bị này"
                                                            >
                                                                HĐ Mua: {s.purchaseBill.code}
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                                {s.product?.warrantyMonths === 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                                        KBH
                                                    </span>
                                                ) : s.warrantyEndDate ? (() => {
                                                    const wStat = calculateWarrantyRemaining(s.warrantyEndDate, s.product?.warrantyMonths ?? 12);
                                                    return (
                                                        <div>
                                                            <span className="font-bold text-xs text-slate-900 dark:text-white" suppressHydrationWarning>
                                                                {new Date(s.warrantyEndDate).toLocaleDateString('vi-VN')}
                                                            </span>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${wStat.isValid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                                <span className={`text-[10px] font-bold ${wStat.isValid ? 'text-emerald-600' : 'text-rose-500'}`} suppressHydrationWarning>
                                                                    {wStat.isValid ? `Còn ${wStat.daysRemaining} ngày` : 'Hết hạn'}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    ({s.product?.warrantyMonths || 12}T)
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })() : (
                                                    <span className="text-slate-400 text-xs">
                                                        {s.status === 'IN_STOCK' ? `${s.product?.warrantyMonths || 12}T (Kho)` : '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {s.status === 'IN_STOCK' && (
                                                        <button
                                                            onClick={() => openDispatchModalForSingle(s.serialNumber)}
                                                            className="px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                                            title="Xuất bán cho khách hàng"
                                                        >
                                                            <ArrowUpRight className="w-3.5 h-3.5" /> Xuất bán
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleOpenEditModal(s)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                                                        title="Sửa sản phẩm / số Serial này"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSerial(s.id, s.serialNumber)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer"
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

            {/* Modal 1: Nhập Hàng Loạt (Bulk Import 100 - 500+ serial từ NCC) */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                        Nhập Hàng Loạt Số Serial / IMEI / Thẻ Bản Quyền
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Dán cột Excel, email NCC hoặc tải tệp .txt / .csv để nhập đồng loạt 100 – 500+ mã vào kho
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowBulkModal(false);
                                    setBulkText('');
                                    setBulkNotes('');
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleBulkCreateSerials} className="space-y-5 text-sm">
                            {/* Row 1: Product Selection & Warehouse */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                        <Package className="w-4 h-4 text-emerald-600" />
                                        Chọn Sản Phẩm Nhập Kho <span className="text-rose-500">*</span>
                                    </label>
                                    <ProductSearchSelect
                                        products={products}
                                        value={bulkProductId}
                                        onChange={setBulkProductId}
                                        required
                                        placeholder="-- Gõ tên hoặc mã SKU sản phẩm --"
                                    />
                                    {bulkProductId && (() => {
                                        const selectedProd = products.find(p => p.id === bulkProductId);
                                        return (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 text-[11px] text-emerald-900 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 animate-in fade-in">
                                                <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                <span>Mã SKU: <strong>{selectedProd?.sku || 'N/A'}</strong></span>
                                                {selectedProd?.unit && <span>• ĐVT: <strong>{selectedProd.unit}</strong></span>}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                        <Warehouse className="w-4 h-4 text-emerald-600" />
                                        Kho Nhập Lưu Trữ
                                    </label>
                                    <div className="relative">
                                        <Warehouse className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                                        <select
                                            value={bulkWarehouseId}
                                            onChange={(e) => setBulkWarehouseId(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900 dark:text-white"
                                        >
                                            <option value="">-- Kho chính (Mặc định) --</option>
                                            {warehouses.map((w) => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Bulk Text Input with Actions */}
                            <div className="space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <label className="font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                            <Barcode className="w-4 h-4 text-emerald-600" />
                                            Dán Danh Sách Serial / IMEI <span className="text-rose-500">*</span>
                                        </label>
                                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full transition-all ${
                                            parsedBulkSerials.length > 0
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                            {parsedBulkSerials.length > 0 ? `Đã nhận diện: ${parsedBulkSerials.length} mã` : 'Chưa có mã'}
                                        </span>
                                    </div>

                                    {/* Quick Actions Toolbar */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={handleBulkPasteClipboard}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                                            title="Dán từ Clipboard máy tính"
                                        >
                                            <ClipboardPaste className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Dán Clipboard</span>
                                        </button>

                                        <label
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                                            title="Tải tệp .txt hoặc .csv"
                                        >
                                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Tải tệp</span>
                                            <input
                                                type="file"
                                                accept=".txt,.csv"
                                                onChange={handleBulkFileUpload}
                                                className="hidden"
                                            />
                                        </label>

                                        <button
                                            type="button"
                                            onClick={handleInsertSampleSerials}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                                            title="Điền 5 mã mẫu"
                                        >
                                            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                            <span>Mẫu thử</span>
                                        </button>

                                        {bulkText && (
                                            <button
                                                type="button"
                                                onClick={() => setBulkText('')}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                                title="Xóa trắng nội dung"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Xóa</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="relative">
                                    <textarea
                                        value={bulkText}
                                        onChange={(e) => setBulkText(e.target.value)}
                                        placeholder="Dán 100, 200 hoặc 500 mã vào đây...&#10;VD:&#10;SN-WIN11-PRO-0001&#10;SN-WIN11-PRO-0002&#10;SN-WIN11-PRO-0003...&#10;(Mỗi mã một dòng, hoặc cách nhau bằng dấu phẩy, dấu chấm phẩy, khoảng trắng)"
                                        rows={7}
                                        required
                                        className="w-full p-3.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs text-slate-900 dark:text-white uppercase leading-relaxed shadow-2xs"
                                    />
                                </div>

                                {/* Duplicates warning pill */}
                                {duplicateBulkCount > 0 && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-[11px] text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 animate-in fade-in font-medium">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>Đã tự động loại bỏ <strong>{duplicateBulkCount}</strong> mã trùng lặp trong nội dung bạn dán.</span>
                                    </div>
                                )}

                                {/* Preview chips container */}
                                {parsedBulkSerials.length > 0 && (
                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 animate-in fade-in">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                Xem trước <strong className="text-emerald-600 dark:text-emerald-400">{Math.min(12, parsedBulkSerials.length)}</strong>/{parsedBulkSerials.length} mã đầu tiên:
                                            </span>
                                            {parsedBulkSerials.length > 12 && (
                                                <span className="text-[11px] text-slate-400">
                                                    ... và {parsedBulkSerials.length - 12} mã khác
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                                            {parsedBulkSerials.slice(0, 12).map((sn, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 shadow-2xs"
                                                >
                                                    <span className="text-[10px] text-slate-400 font-sans font-normal">#{idx + 1}</span>
                                                    <span>{sn}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Row 3: Notes */}
                            <div className="space-y-1.5">
                                <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                    Ghi Chú Lô Hàng (Nhà cung cấp, Số hóa đơn mua...)
                                </label>
                                <input
                                    type="text"
                                    value={bulkNotes}
                                    onChange={(e) => setBulkNotes(e.target.value)}
                                    placeholder="VD: Lô nhập NCC Digiworld theo HĐ mua PB-2026-09"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                                />
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-[11px] text-slate-400">
                                    💡 Các mã sau khi nhập sẽ ở trạng thái <strong className="text-emerald-600">Tồn kho</strong> và tự động cập nhật số lượng WMS.
                                </p>
                                <div className="flex items-center justify-end gap-3 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowBulkModal(false);
                                            setBulkText('');
                                            setBulkNotes('');
                                        }}
                                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingBulk || parsedBulkSerials.length === 0 || !bulkProductId}
                                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
                                    >
                                        {savingBulk ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Check className="w-4 h-4" />
                                        )}
                                        <span>
                                            {savingBulk
                                                ? 'Đang lưu vào kho...'
                                                : parsedBulkSerials.length > 0
                                                ? `Xác Nhận Nhập ${parsedBulkSerials.length} Mã Vào Kho`
                                                : 'Nhập Kho Hàng Loạt'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Thêm Serial / IMEI / Thẻ Bản Quyền */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                                    <Barcode className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                        Thêm Serial / IMEI / Thẻ Bản Quyền
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Nhập mã định danh thiết bị hoặc thẻ bản quyền phần mềm vào kho
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewSerial('');
                                    setSerialTags([]);
                                    setNewNotes('');
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSerial} className="space-y-4 text-sm">
                            {/* Product Combobox */}
                            <div className="space-y-1.5">
                                <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <Package className="w-4 h-4 text-emerald-600" />
                                    Chọn Sản phẩm <span className="text-rose-500">*</span>
                                </label>
                                <ProductSearchSelect
                                    products={products}
                                    value={selectedProductId}
                                    onChange={setSelectedProductId}
                                    required
                                    placeholder="-- Gõ tên hoặc chọn sản phẩm --"
                                />
                                {selectedProductId && (() => {
                                    const selectedProd = products.find(p => p.id === selectedProductId);
                                    return (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 text-[11px] text-emerald-900 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 animate-in fade-in">
                                            <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            <span>Mã SKU: <strong>{selectedProd?.sku || 'N/A'}</strong></span>
                                            {selectedProd?.unit && <span>• ĐVT: <strong>{selectedProd.unit}</strong></span>}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Warehouse Select */}
                            <div className="space-y-1.5">
                                <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <Warehouse className="w-4 h-4 text-emerald-600" />
                                    Kho Lưu Trữ Thiết Bị / Thẻ
                                </label>
                                <div className="relative">
                                    <Warehouse className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                                    <select
                                        value={selectedWarehouseId}
                                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-900 dark:text-white"
                                    >
                                        <option value="">-- Kho chính (Mặc định) --</option>
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Serial / IMEI / Thẻ Key Input */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <label className="font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                        <Barcode className="w-4 h-4 text-emerald-600" />
                                        Mã Serial / IMEI / Thẻ Bản Quyền <span className="text-rose-500">*</span>
                                    </label>
                                    {serialTags.length > 0 && (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                                            Đã thêm {serialTags.length} mã
                                        </span>
                                    )}
                                </div>

                                {/* Clean input card with seamless styling and NO rectangular browser border */}
                                <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 p-2.5 focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all shadow-2xs space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                            <Barcode className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={newSerial}
                                            onChange={(e) => setNewSerial(e.target.value)}
                                            onPaste={handleInputPaste}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ',') {
                                                    e.preventDefault();
                                                    handleAddTag();
                                                }
                                            }}
                                            placeholder="Nhập mã thẻ / serial... (Enter để tạo thẻ)"
                                            className="w-full bg-transparent px-2 py-1 text-sm font-mono tracking-wider font-bold text-slate-900 dark:text-white uppercase border-0 border-none outline-none ring-0 focus:ring-0 focus:outline-none shadow-none placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:normal-case placeholder:text-slate-400"
                                        />
                                        {newSerial.trim() && (
                                            <button
                                                type="button"
                                                onClick={() => setNewSerial('')}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                                                title="Xóa trắng ô nhập"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleAddTag}
                                            disabled={!newSerial.trim()}
                                            title="Tạo thẻ mới từ mã vừa nhập"
                                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-35 disabled:cursor-not-allowed rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Thêm thẻ</span>
                                        </button>
                                    </div>

                                    {/* Action toolbar & helper */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-xs">
                                        <button
                                            type="button"
                                            onClick={handlePasteClipboard}
                                            title="Dán từ Clipboard máy tính"
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs"
                                        >
                                            <ClipboardPaste className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Dán từ Clipboard</span>
                                        </button>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                                            <span>Nhấn <strong>Enter</strong> hoặc phẩy <strong>(,)</strong> để tạo thẻ. Hỗ trợ dán nhiều mã cùng lúc.</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Tags Preview Area */}
                                {serialTags.length > 0 && (
                                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/60 space-y-2 animate-in fade-in">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                Danh sách <strong className="text-emerald-700 dark:text-emerald-400">{serialTags.length}</strong> thẻ sẽ lưu vào kho:
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setSerialTags([])}
                                                className="text-[11px] text-rose-500 hover:underline cursor-pointer font-medium"
                                            >
                                                Xóa tất cả
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                            {serialTags.map((tag, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-xs font-mono font-bold text-emerald-950 dark:text-emerald-200 shadow-2xs"
                                                >
                                                    <span className="text-[10px] text-slate-400 font-sans font-normal">#{idx + 1}</span>
                                                    <span>{tag}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTag(idx)}
                                                        className="text-slate-400 hover:text-rose-500 transition-colors ml-0.5 cursor-pointer"
                                                        title="Xóa thẻ này"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="space-y-1.5">
                                <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                    Ghi Chú Lưu Kho (Tùy chọn)
                                </label>
                                <textarea
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                    placeholder="Vị trí kệ, lô sản xuất, nhà cung cấp, thông tin bổ sung..."
                                    rows={2}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                                />
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setNewSerial('');
                                        setSerialTags([]);
                                        setNewNotes('');
                                    }}
                                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingSingle || (!selectedProductId && serialTags.length === 0 && !newSerial.trim())}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    {savingSingle ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                    <span>
                                        {savingSingle
                                            ? 'Đang lưu vào kho...'
                                            : serialTags.length > 1 || (serialTags.length >= 1 && newSerial.trim())
                                            ? `Lưu ${serialTags.length + (newSerial.trim() && !serialTags.includes(newSerial.trim()) ? 1 : 0)} Thẻ Vào Kho`
                                            : 'Lưu Mã Thẻ Vào Kho'}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Edit: Chỉnh Sửa Serial / Đổi Sản Phẩm Khi Nhập Sai */}
            {showEditModal && editingSerial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
                                    <Pencil className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                        Chỉnh Sửa Thông Tin Serial / Đổi Sản Phẩm
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Sửa lại tên sản phẩm, số serial hoặc thông tin kho khi phát hiện nhập sai
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingSerial(null);
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateSerial} className="space-y-4 text-sm">
                            {/* Product Combobox */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                        <Package className="w-4 h-4 text-amber-600" />
                                        Sản Phẩm Áp Dụng <span className="text-rose-500">*</span>
                                    </label>
                                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                        (Gõ để đổi sang sản phẩm đúng)
                                    </span>
                                </div>
                                <ProductSearchSelect
                                    products={products}
                                    value={editProductId}
                                    onChange={setEditProductId}
                                    required
                                    placeholder="-- Gõ tên để tìm hoặc đổi sản phẩm --"
                                />
                                {editProductId && (() => {
                                    const selectedProd = products.find(p => p.id === editProductId);
                                    return (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 text-[11px] text-amber-900 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 animate-in fade-in">
                                            <Tag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                            <span>Mã SKU: <strong>{selectedProd?.sku || 'N/A'}</strong></span>
                                            {selectedProd?.unit && <span>• ĐVT: <strong>{selectedProd.unit}</strong></span>}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Serial / IMEI Input */}
                            <div className="space-y-1.5">
                                <label className="font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <Barcode className="w-4 h-4 text-amber-600" />
                                    Số Serial / IMEI / Mã Thẻ <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative flex items-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all p-1.5 shadow-2xs">
                                    <Barcode className="w-5 h-5 text-slate-400 ml-2 shrink-0" />
                                    <input
                                        type="text"
                                        value={editSerialNumber}
                                        onChange={(e) => setEditSerialNumber(e.target.value)}
                                        required
                                        placeholder="VD: SN-2026-WIN11-001"
                                        className="w-full bg-transparent px-3 py-1.5 text-sm font-mono tracking-wider font-bold text-slate-900 dark:text-white uppercase border-0 border-none outline-none ring-0 focus:ring-0 focus:outline-none shadow-none"
                                    />
                                </div>
                            </div>

                            {/* Warehouse & Status 2-col */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                        <Warehouse className="w-4 h-4 text-amber-600" />
                                        Kho Lưu Trữ
                                    </label>
                                    <select
                                        value={editWarehouseId}
                                        onChange={(e) => setEditWarehouseId(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium text-slate-900 dark:text-white"
                                    >
                                        <option value="">-- Kho chính (Mặc định) --</option>
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                        <Filter className="w-4 h-4 text-amber-600" />
                                        Trạng Thái
                                    </label>
                                    <select
                                        value={editStatus}
                                        onChange={(e) => setEditStatus(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-semibold text-slate-900 dark:text-white"
                                    >
                                        <option value="IN_STOCK">Tồn kho (In Stock)</option>
                                        <option value="SOLD">Đã xuất bán (Sold)</option>
                                        <option value="UNDER_WARRANTY">Đang bảo hành</option>
                                        <option value="DEFECTIVE">Lỗi / Hỏng</option>
                                    </select>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-1.5">
                                <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-amber-600" />
                                    Ghi Chú
                                </label>
                                <textarea
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="Lý do điều chỉnh hoặc ghi chú thêm..."
                                    rows={2}
                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
                                />
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingSerial(null);
                                    }}
                                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit || !editProductId || !editSerialNumber.trim()}
                                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    {savingEdit ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                    <span>{savingEdit ? 'Đang cập nhật...' : 'Lưu Thay Đổi'}</span>
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
