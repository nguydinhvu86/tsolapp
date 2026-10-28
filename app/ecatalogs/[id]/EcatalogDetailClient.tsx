'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/app/components/providers/ToastProvider';
import { 
    Plus, Trash2, ExternalLink, ArrowLeft, Save, Upload, Download, 
    Share2, Eye, Sparkles, Layers, ShieldCheck, MapPin, Search, 
    ArrowUp, ArrowDown, Copy, Check, X, FileText, CheckCircle2,
    DollarSign, Image as ImageIcon, Info, HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MediaPickerModal } from '@/app/components/ui/modals/MediaPickerModal';
import { updateEcatalog } from '../actions';
import { QRCodeSVG } from 'qrcode.react';

interface EcatalogDetailClientProps {
    initialEcatalog: any;
    products: any[];
    currentUserId?: string;
    isAdminOrManager?: boolean;
}

export default function EcatalogDetailClient({
    initialEcatalog,
    products,
    currentUserId,
    isAdminOrManager
}: EcatalogDetailClientProps) {
    const router = useRouter();
    const [ecatalog, setEcatalog] = useState(initialEcatalog);
    const [name, setName] = useState(ecatalog.name || '');
    const [description, setDescription] = useState(ecatalog.description || '');
    const [isPublic, setIsPublic] = useState(ecatalog.isPublic ?? true);
    const [showDealerPrice, setShowDealerPrice] = useState(ecatalog.showDealerPrice || false);
    const [items, setItems] = useState<any[]>(ecatalog.items || []);
    const [isSaving, setIsSaving] = useState(false);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [previewItemIndex, setPreviewItemIndex] = useState<number | null>(null);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [copiedShareLink, setCopiedShareLink] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

    // Keyboard shortcut Ctrl+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [name, description, isPublic, showDealerPrice, items]);

    // KPI Metrics calculation
    const metrics = useMemo(() => {
        const totalItems = items.length;
        const itemsWithImages = items.filter(i => i.imageUrl || i.product?.imageUrl).length;
        const imagePercentage = totalItems > 0 ? Math.round((itemsWithImages / totalItems) * 100) : 0;
        const totalRetailValue = items.reduce((sum, item) => {
            const price = item.customRetailPrice || item.customPrice || item.product?.salePrice || 0;
            return sum + Number(price);
        }, 0);
        const totalDealerValue = items.reduce((sum, item) => {
            return sum + Number(item.customDealerPrice || 0);
        }, 0);

        return {
            totalItems,
            itemsWithImages,
            imagePercentage,
            totalRetailValue,
            totalDealerValue
        };
    }, [items]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Vui lòng nhập tên E-Catalog");
            return;
        }

        setIsSaving(true);
        try {
            const res = await updateEcatalog(ecatalog.id, {
                name: name.trim(),
                description: description.trim(),
                isPublic,
                showDealerPrice,
                items: items.map((item, idx) => ({
                    productId: item.productId || null,
                    customSku: item.customSku || item.product?.sku || '',
                    customName: item.customName || item.product?.name || '',
                    customDesc: item.customDesc || item.product?.description || '',
                    customPrice: Number(item.customPrice) || 0,
                    customRetailPrice: Number(item.customRetailPrice) || 0,
                    customDealerPrice: Number(item.customDealerPrice) || 0,
                    customOrigin: item.customOrigin || '',
                    customNote: item.customNote || '',
                    imageUrl: item.imageUrl || item.product?.imageUrl || '',
                    displayOrder: idx
                }))
            }, currentUserId);

            if (res.success) {
                toast.success("Đã lưu toàn bộ thay đổi thành công!");
                setEcatalog(res.data);
                router.refresh();
            } else {
                toast.error(res.error || "Lỗi lưu dữ liệu E-Catalog");
            }
        } catch (error: any) {
            toast.error(error.message || "Lỗi khi lưu");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveItem = (index: number) => {
        const itemToDelete = items[index];
        const confirmName = itemToDelete.customName || itemToDelete.product?.name || `Mục #${index + 1}`;
        if (confirm(`Bạn có chắc muốn xóa sản phẩm "${confirmName}" khỏi E-Catalog?`)) {
            const newItems = [...items];
            newItems.splice(index, 1);
            setItems(newItems);
            toast.info("Đã xóa sản phẩm khỏi danh sách (nhớ nhấn Lưu thay đổi)");
        }
    };

    const handleMoveItem = (index: number, direction: 'UP' | 'DOWN') => {
        const newItems = [...items];
        const targetIndex = direction === 'UP' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newItems.length) return;
        const temp = newItems[index];
        newItems[index] = newItems[targetIndex];
        newItems[targetIndex] = temp;
        setItems(newItems);
    };

    const handleAddManualProduct = () => {
        const newItem = {
            customSku: '',
            customName: 'Sản phẩm mới',
            customDesc: '- Độ phân giải: \n- Cổng kết nối: \n- Bảo hành: 24 tháng',
            customRetailPrice: 0,
            customDealerPrice: 0,
            customOrigin: 'Việt Nam',
            customNote: 'Hàng chính hãng',
            imageUrl: ''
        };
        setItems([newItem, ...items]);
        toast.success("Đã thêm 1 mục mới ở đầu danh sách");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                if (data.length <= 1) {
                    toast.info("File Excel trống hoặc không đúng cấu trúc!");
                    return;
                }

                const newItems: any[] = [];
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length === 0 || !row[1]) continue;

                    let imageUrl = '';
                    let customNote = '';
                    let col2 = row[2] ? String(row[2]) : '';
                    if (col2.startsWith('http')) {
                        imageUrl = col2;
                    } else {
                        customNote = col2;
                    }

                    newItems.push({
                        customSku: row[1] ? String(row[1]) : '',
                        customDesc: row[3] ? String(row[3]) : '',
                        customName: row[3] ? String(row[3]).substring(0, 60) : 'Sản phẩm',
                        customOrigin: row[4] ? String(row[4]) : '',
                        customDealerPrice: row[5] ? Number(row[5]) : 0,
                        customRetailPrice: row[6] ? Number(row[6]) : 0,
                        customNote: customNote,
                        imageUrl: imageUrl
                    });
                }

                setItems([...items, ...newItems]);
                toast.success(`Đã nhập thành công ${newItems.length} sản phẩm từ file Excel! Đừng quên nhấn Lưu thay đổi.`);
            } catch (error) {
                console.error(error);
                toast.error("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
            }
        };
        reader.readAsBinaryString(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const downloadSampleExcel = () => {
        const headers = [['TT', 'Part. Number Model', 'Hình ảnh / Ghi chú', 'Mô tả & Thông số kỹ thuật', 'Xuất xứ', 'Giá đại lý VNĐ', 'Giá bán lẻ VNĐ']];
        const sampleData = [
            [1, 'CAM-AI-01', 'https://example.com/camera.png', '- Độ phân giải: 4K UHD 60fps\n- Cảm biến: Sony Starvis II\n- Kết nối: PoE, Wi-Fi 6\n- Tiêu chuẩn: IP67, IK10', 'Nhật Bản', 3500000, 5200000],
            [2, 'SW-CORE-24', 'Hàng nhập khẩu chính ngạch', '- Số cổng: 24 Port Gigabit PoE+\n- Băng thông chuyển mạch: 128 Gbps\n- Nguồn: 370W High-power', 'Mỹ', 8900000, 12500000]
        ];
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
        XLSX.utils.book_append_sheet(wb, ws, "DanhSachSP");
        XLSX.writeFile(wb, `Ecatalog_Mau_Import_${ecatalog.code}.xlsx`);
    };

    // Filtered items in management view
    const filteredManagementItems = useMemo(() => {
        if (!itemSearchQuery) return items;
        const q = itemSearchQuery.toLowerCase();
        return items.filter(item => {
            const name = (item.customName || item.product?.name || '').toLowerCase();
            const sku = (item.customSku || item.product?.sku || '').toLowerCase();
            const origin = (item.customOrigin || '').toLowerCase();
            return name.includes(q) || sku.includes(q) || origin.includes(q);
        });
    }, [items, itemSearchQuery]);

    const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/public/ecatalog/${ecatalog.id}` : `/public/ecatalog/${ecatalog.id}`;

    return (
        <div className="min-h-screen bg-slate-900/40 p-4 sm:p-6 lg:p-8 space-y-6">
            {/* TOP BAR / BREADCRUMB */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/ecatalogs')} 
                        className="p-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                        title="Quay lại danh sách E-Catalog"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {ecatalog.code}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isPublic ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                            }`}>
                                {isPublic ? '● Công khai (Public)' : '○ Nội bộ (Private)'}
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                            {name || 'Chưa đặt tên E-Catalog'}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Người tạo: <strong className="text-slate-700 dark:text-slate-300">{ecatalog.creator?.name || 'N/A'}</strong> • Cập nhật: {new Date(ecatalog.updatedAt).toLocaleDateString('vi-VN')}
                        </p>
                    </div>
                </div>

                {/* Primary Action Controls */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button 
                        onClick={() => setShareModalOpen(true)}
                        className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                    >
                        <Share2 size={15} /> Mã QR & Link
                    </button>

                    <button 
                        onClick={() => window.open(`/public/ecatalog/${ecatalog.id}`, '_blank')}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/50 rounded-xl transition-all shadow-sm"
                    >
                        <Eye size={15} /> Xem Flipbook Trực Tuyến
                    </button>

                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-60"
                    >
                        <Save size={16} />
                        <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi (Ctrl+S)'}</span>
                    </button>
                </div>
            </div>

            {/* KPI METRIC TILES */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <Layers size={24} />
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Tổng Sản Phẩm</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.totalItems}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <ImageIcon size={24} />
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Hình Ảnh Phủ</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.imagePercentage}%</span>
                            <span className="text-xs text-slate-400 font-medium">({metrics.itemsWithImages}/{metrics.totalItems})</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Tổng Giá Niêm Yết</span>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 truncate block">
                            {formatCurrency(metrics.totalRetailValue)}
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Chế Độ Báo Giá</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {showDealerPrice ? 'Công Khai & Đại Lý' : 'Chỉ Giá Bán Lẻ'}
                        </span>
                    </div>
                </div>
            </div>

            {/* MAIN TWO-COLUMN MANAGEMENT WORKSPACE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: CATALOG SETTINGS & PREVIEW */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Sparkles size={18} className="text-emerald-500" />
                                Thiết Lập E-Catalog
                            </h2>
                            <span className="text-xs font-mono font-bold text-slate-400">ID: {ecatalog.id.slice(0, 8)}...</span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                Tên E-Catalog <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="VD: Bảng Giá & Catalogue Thiết Bị Viễn Thông 2026"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                Mô Tả Giới Thiệu
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                placeholder="Giới thiệu tổng quan về danh mục sản phẩm, chính sách bảo hành, cam kết chính hãng..."
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                        </div>

                        {/* Visibility & Price Toggles */}
                        <div className="space-y-3 pt-2">
                            <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                <div>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white block">Công khai (Public)</span>
                                    <span className="text-xs text-slate-500">Khách hàng có thể truy cập qua đường link trực tuyến</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                    className="w-5 h-5 accent-emerald-500 cursor-pointer rounded"
                                />
                            </label>

                            <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                <div>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white block">Hiển thị Giá Đại Lý</span>
                                    <span className="text-xs text-slate-500">Hiển thị mức giá bán buôn/đại lý trên trang công khai</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={showDealerPrice}
                                    onChange={(e) => setShowDealerPrice(e.target.checked)}
                                    className="w-5 h-5 accent-amber-500 cursor-pointer rounded"
                                />
                            </label>
                        </div>

                        {/* Direct QR Code Box */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                            <div className="p-2 bg-white rounded-xl inline-block shadow-sm">
                                <QRCodeSVG value={publicUrl} size={130} level="M" />
                            </div>
                            <div className="text-xs text-slate-500 font-medium">
                                Quét mã để xem trực tiếp trên điện thoại
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: PRODUCT ITEMS & SPEC BUILDER */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                        
                        {/* Items Header & Toolbar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Layers size={18} className="text-emerald-500" />
                                    Danh Sách Sản Phẩm ({items.length})
                                </h2>
                                <p className="text-xs text-slate-500">Kéo hoặc dùng mũi tên để sắp xếp thứ tự hiển thị trong catalogue</p>
                            </div>

                            {/* Toolbar Buttons */}
                            <div className="flex flex-wrap items-center gap-2">
                                <input 
                                    type="file" 
                                    accept=".xlsx, .xls" 
                                    className="hidden" 
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />
                                
                                <button 
                                    onClick={downloadSampleExcel}
                                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-xl transition-all"
                                    title="Tải file Excel mẫu để chuẩn bị dữ liệu"
                                >
                                    <Download size={14} /> File Mẫu
                                </button>

                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/50 px-3.5 py-2 rounded-xl transition-all"
                                >
                                    <Upload size={14} /> Nhập Excel
                                </button>

                                <button 
                                    onClick={handleAddManualProduct}
                                    className="flex items-center gap-1.5 text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-3.5 py-2 rounded-xl shadow-md transition-all"
                                >
                                    <Plus size={14} /> Thêm Thủ Công
                                </button>
                            </div>
                        </div>

                        {/* Search Bar for Management */}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Lọc nhanh theo Model, Tên sản phẩm hoặc Xuất xứ..."
                                value={itemSearchQuery}
                                onChange={(e) => setItemSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                            />
                            {itemSearchQuery && (
                                <button 
                                    onClick={() => setItemSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Product Items List */}
                        <div className="space-y-4">
                            {filteredManagementItems.length === 0 ? (
                                <div className="text-center py-16 px-4 bg-slate-50 dark:bg-slate-950/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
                                    <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
                                        <Layers size={24} />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        {itemSearchQuery ? 'Không tìm thấy sản phẩm nào' : 'E-Catalog chưa có sản phẩm nào'}
                                    </h4>
                                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                                        {itemSearchQuery 
                                            ? `Không có mục nào khớp với "${itemSearchQuery}".` 
                                            : 'Bạn có thể nhấn "Thêm Thủ Công" hoặc tải file Excel mẫu để nhập hàng loạt.'}
                                    </p>
                                    {!itemSearchQuery && (
                                        <button
                                            onClick={handleAddManualProduct}
                                            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-md"
                                        >
                                            Thêm sản phẩm đầu tiên
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredManagementItems.map((item, index) => (
                                    <div 
                                        key={index}
                                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 hover:border-emerald-500/50 hover:shadow-lg transition-all space-y-4 relative group"
                                    >
                                        {/* Item Top Controls */}
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold flex items-center justify-center">
                                                    #{index + 1}
                                                </span>
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    Thông tin sản phẩm
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {/* Reorder Buttons */}
                                                <button
                                                    onClick={() => handleMoveItem(index, 'UP')}
                                                    disabled={index === 0}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                                                    title="Chuyển lên trước"
                                                >
                                                    <ArrowUp size={15} />
                                                </button>

                                                <button
                                                    onClick={() => handleMoveItem(index, 'DOWN')}
                                                    disabled={index === items.length - 1}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                                                    title="Chuyển xuống sau"
                                                >
                                                    <ArrowDown size={15} />
                                                </button>

                                                {/* Delete Button */}
                                                <button 
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-2"
                                                    title="Xóa khỏi E-Catalog"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Main Item Fields Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                            {/* Image Thumbnail Box */}
                                            <div className="sm:col-span-3 flex flex-col items-center">
                                                <div 
                                                    className="w-full aspect-square rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 flex items-center justify-center relative overflow-hidden group/img cursor-pointer"
                                                    onClick={() => {
                                                        setActiveItemIndex(index);
                                                        setMediaPickerOpen(true);
                                                    }}
                                                    title="Nhấn để tải hoặc chọn ảnh mới"
                                                >
                                                    {item.imageUrl || item.product?.imageUrl ? (
                                                        <img 
                                                            src={item.imageUrl || item.product?.imageUrl} 
                                                            alt="" 
                                                            className="w-full h-full object-contain"
                                                        />
                                                    ) : (
                                                        <div className="text-center p-2 text-slate-400">
                                                            <ImageIcon size={32} className="mx-auto mb-1 opacity-50" />
                                                            <span className="text-[10px] block font-medium">Chọn ảnh</span>
                                                        </div>
                                                    )}

                                                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                                        <Upload size={14} /> Thay ảnh
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveItemIndex(index);
                                                        setMediaPickerOpen(true);
                                                    }}
                                                    className="mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                                                >
                                                    Đổi hình ảnh
                                                </button>
                                            </div>

                                            {/* Text Fields */}
                                            <div className="sm:col-span-9 space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                                    <div className="sm:col-span-8">
                                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                            Tên Thiết Bị / Sản Phẩm <span className="text-red-500">*</span>
                                                        </label>
                                                        <input 
                                                            type="text"
                                                            value={item.customName || ''}
                                                            onChange={(e) => {
                                                                const newItems = [...items];
                                                                newItems[index].customName = e.target.value;
                                                                setItems(newItems);
                                                            }}
                                                            placeholder="VD: Camera AI Nhận Diện Khuôn Mặt 4K"
                                                            className="w-full px-3 py-2 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-500 outline-none"
                                                        />
                                                    </div>

                                                    <div className="sm:col-span-4">
                                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                            Mã Model / SKU <span className="text-red-500">*</span>
                                                        </label>
                                                        <input 
                                                            type="text"
                                                            value={item.customSku || ''}
                                                            onChange={(e) => {
                                                                const newItems = [...items];
                                                                newItems[index].customSku = e.target.value;
                                                                setItems(newItems);
                                                            }}
                                                            placeholder="VD: TSOL-CAM-4K"
                                                            className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-500 outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                                    <div className="sm:col-span-6">
                                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                            Xuất Xứ / Hãng
                                                        </label>
                                                        <input 
                                                            type="text"
                                                            value={item.customOrigin || ''}
                                                            onChange={(e) => {
                                                                const newItems = [...items];
                                                                newItems[index].customOrigin = e.target.value;
                                                                setItems(newItems);
                                                            }}
                                                            placeholder="VD: Nhật Bản, Việt Nam, USA..."
                                                            className="w-full px-3 py-2 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-500 outline-none"
                                                        />
                                                    </div>

                                                    <div className="sm:col-span-6">
                                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                            Tiêu Chuẩn / Ghi Chú Nổi Bật
                                                        </label>
                                                        <input 
                                                            type="text"
                                                            value={item.customNote || ''}
                                                            onChange={(e) => {
                                                                const newItems = [...items];
                                                                newItems[index].customNote = e.target.value;
                                                                setItems(newItems);
                                                            }}
                                                            placeholder="VD: Bảo hành 36T, Tiêu chuẩn IP68, CO/CQ đầy đủ"
                                                            className="w-full px-3 py-2 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-500 outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Pricing Fields */}
                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                                    <div className="sm:col-span-6">
                                                        <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                                                            Giá Bán Lẻ (VNĐ)
                                                        </label>
                                                        <input 
                                                            type="number"
                                                            value={item.customRetailPrice || 0}
                                                            onChange={(e) => {
                                                                const newItems = [...items];
                                                                newItems[index].customRetailPrice = Number(e.target.value);
                                                                setItems(newItems);
                                                            }}
                                                            className="w-full px-3 py-2 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-500 outline-none"
                                                        />
                                                    </div>

                                                    <div className="sm:col-span-6">
                                                        <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                                                            Giá Đại Lý / Đối Tác (VNĐ)
                                                        </label>
                                                        <input 
                                                            type="number"
                                                            value={item.customDealerPrice || 0}
                                                            onChange={(e) => {
                                                                const newItems = [...items];
                                                                newItems[index].customDealerPrice = Number(e.target.value);
                                                                setItems(newItems);
                                                            }}
                                                            className="w-full px-3 py-2 text-xs font-black text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Technical Specs & Description */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                                            Mô Tả & Thông Số Kỹ Thuật (Định dạng tự động chia bảng: &quot;Tên thông số: Giá trị&quot;)
                                                        </label>
                                                        <span className="text-[10px] text-emerald-500 font-semibold">
                                                            Hỗ trợ gạch đầu dòng &amp; dấu hai chấm
                                                        </span>
                                                    </div>
                                                    <textarea 
                                                        value={item.customDesc || ''}
                                                        onChange={(e) => {
                                                            const newItems = [...items];
                                                            newItems[index].customDesc = e.target.value;
                                                            setItems(newItems);
                                                        }}
                                                        rows={3}
                                                        placeholder="- Độ phân giải: 4K Ultra HD&#10;- Băng thông: 10Gbps&#10;- Nguồn điện: 220V / PoE&#10;- Bảo hành: 24 tháng chính hãng"
                                                        className="w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-500 outline-none font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MEDIA PICKER MODAL */}
            <MediaPickerModal 
                isOpen={mediaPickerOpen} 
                onClose={() => setMediaPickerOpen(false)} 
                onSelect={(url) => {
                    if (activeItemIndex !== null) {
                        const newItems = [...items];
                        newItems[activeItemIndex].imageUrl = url;
                        setItems(newItems);
                        setActiveItemIndex(null);
                        toast.success("Đã cập nhật hình ảnh sản phẩm");
                    }
                }} 
            />

            {/* SHARE MODAL */}
            {shareModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShareModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 text-center">
                        <button
                            onClick={() => setShareModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
                        >
                            <X size={18} />
                        </button>

                        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                            <Share2 size={24} />
                        </div>

                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Chia Sẻ E-Catalog</h3>
                        <p className="text-xs text-slate-500 mb-6">Gửi mã QR hoặc liên kết cho đối tác và khách hàng</p>

                        <div className="p-4 bg-white rounded-2xl inline-block shadow-md mb-6 border border-slate-100">
                            <QRCodeSVG value={publicUrl} size={180} level="H" includeMargin />
                        </div>

                        <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 mb-4">
                            <input
                                type="text"
                                readOnly
                                value={publicUrl}
                                className="bg-transparent text-xs text-slate-700 dark:text-slate-300 px-2 flex-1 outline-none font-mono truncate"
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(publicUrl);
                                    setCopiedShareLink(true);
                                    setTimeout(() => setCopiedShareLink(false), 2000);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0"
                            >
                                {copiedShareLink ? <Check size={14} /> : <Copy size={14} />}
                                <span>{copiedShareLink ? 'Đã sao chép' : 'Sao chép'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
