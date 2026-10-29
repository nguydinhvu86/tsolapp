'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    BookOpen, LayoutGrid, Search, X, ChevronLeft, ChevronRight, 
    Share2, Maximize2, Minimize2, Play, Pause, Copy, Check, 
    Phone, Mail, Globe, Sparkles, Cpu, ShieldCheck, Zap, 
    Wifi, Layers, FileText, CheckCircle, SlidersHorizontal, 
    ArrowRight, Info, User, MapPin, Tag, ExternalLink, Image as ImageIcon
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface EcatalogItem {
    id: string;
    productId?: string | null;
    customSku?: string | null;
    customName?: string | null;
    customDesc?: string | null;
    customPrice?: number | null;
    customRetailPrice?: number | null;
    customDealerPrice?: number | null;
    customOrigin?: string | null;
    customNote?: string | null;
    imageUrl?: string | null;
    displayOrder: number;
    product?: {
        id: string;
        name: string;
        sku?: string | null;
        description?: string | null;
        salePrice?: number | null;
        imageUrl?: string | null;
        unit?: string | null;
        notes?: string | null;
    } | null;
}

interface Ecatalog {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    isPublic: boolean;
    showDealerPrice: boolean;
    creator: {
        name?: string | null;
        email?: string | null;
        avatar?: string | null;
    };
    items: EcatalogItem[];
}

interface CompanyInfo {
    name: string;
    fullName: string;
    logo?: string;
    email?: string;
    phone?: string;
    website?: string;
}

interface PublicEcatalogClientProps {
    ecatalog: Ecatalog;
    companyInfo: CompanyInfo;
}

// Smart Parser: Extracts technical specifications and key feature highlights from raw description
function parseTechSpecsAndFeatures(desc?: string | null, origin?: string | null, note?: string | null, sku?: string | null) {
    const specs: { label: string; value: string }[] = [];
    const features: { title: string; desc: string; iconType: string }[] = [];

    if (sku) specs.push({ label: 'Mã Model / SKU', value: sku });
    if (origin) specs.push({ label: 'Xuất xứ / Origin', value: origin });
    if (note) specs.push({ label: 'Tiêu chuẩn / Ghi chú', value: note });

    if (!desc) return { specs, features };

    const lines = desc.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
        const colonIdx = line.indexOf(':');
        const dashMatch = line.match(/^[-•*✓]\s*(.+)/);
        const cleanLine = dashMatch ? dashMatch[1].trim() : line;

        // Key-value pair like "Bộ nhớ: 16GB"
        if (colonIdx > 0 && colonIdx < 40 && !cleanLine.startsWith('http')) {
            const label = cleanLine.substring(0, cleanLine.indexOf(':')).replace(/^[-•*✓]\s*/, '').trim();
            const value = cleanLine.substring(cleanLine.indexOf(':') + 1).trim();
            if (label && value) {
                specs.push({ label, value });
                continue;
            }
        }

        // Feature / Highlight bullet
        if (cleanLine.length > 5) {
            const lower = cleanLine.toLowerCase();
            let iconType = 'cpu';
            if (lower.includes('bảo hành') || lower.includes('bền') || lower.includes('chống') || lower.includes('an toàn') || lower.includes('bảo mật')) {
                iconType = 'shield';
            } else if (lower.includes('tốc độ') || lower.includes('nhanh') || lower.includes('hiệu năng') || lower.includes('công suất') || lower.includes('mạnh')) {
                iconType = 'zap';
            } else if (lower.includes('kết nối') || lower.includes('wifi') || lower.includes('bluetooth') || lower.includes('mạng') || lower.includes('port')) {
                iconType = 'wifi';
            } else if (lower.includes('tiết kiệm') || lower.includes('pin') || lower.includes('nguồn') || lower.includes('thông minh')) {
                iconType = 'sparkles';
            }

            features.push({
                title: cleanLine.length > 60 ? cleanLine.substring(0, 57) + '...' : cleanLine,
                desc: cleanLine,
                iconType
            });
        }
    }

    return { specs, features };
}

export default function PublicEcatalogClient({ ecatalog, companyInfo }: PublicEcatalogClientProps) {
    // Viewing Mode: 'FLIPBOOK' (📖 Lật Catalogue) or 'GRID' (▦ Showroom)
    const [viewMode, setViewMode] = useState<'FLIPBOOK' | 'GRID'>('FLIPBOOK');
    
    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrigin, setSelectedOrigin] = useState<string>('ALL');
    const [sortBy, setSortBy] = useState<'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC' | 'NAME'>('DEFAULT');

    // Flipbook State
    const [currentFlipIndex, setCurrentFlipIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [showThumbnails, setShowThumbnails] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Deep-dive Specs Drawer / Modal State
    const [drawerItem, setDrawerItem] = useState<EcatalogItem | null>(null);
    const [drawerActiveTab, setDrawerActiveTab] = useState<'FEATURES' | 'SPECS' | 'GALLERY' | 'QUOTE'>('FEATURES');
    const [specsSearchQuery, setSpecsSearchQuery] = useState('');
    const [copiedSpecs, setCopiedSpecs] = useState(false);

    // Share & QR Modal State
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    // Consultant Modal State
    const [consultantModalOpen, setConsultantModalOpen] = useState(false);

    // Filter items
    const filteredItems = useMemo(() => {
        let result = ecatalog.items.filter((item) => {
            const name = (item.customName || item.product?.name || '').toLowerCase();
            const sku = (item.customSku || item.product?.sku || '').toLowerCase();
            const desc = (item.customDesc || item.product?.description || '').toLowerCase();
            const origin = (item.customOrigin || '').toLowerCase();

            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query || name.includes(query) || sku.includes(query) || desc.includes(query) || origin.includes(query);
            const matchesOrigin = selectedOrigin === 'ALL' || (item.customOrigin || '').trim() === selectedOrigin;

            return matchesSearch && matchesOrigin;
        });

        if (sortBy === 'PRICE_ASC') {
            result.sort((a, b) => {
                const priceA = a.customRetailPrice ?? a.customPrice ?? a.product?.salePrice ?? 0;
                const priceB = b.customRetailPrice ?? b.customPrice ?? b.product?.salePrice ?? 0;
                return priceA - priceB;
            });
        } else if (sortBy === 'PRICE_DESC') {
            result.sort((a, b) => {
                const priceA = a.customRetailPrice ?? a.customPrice ?? a.product?.salePrice ?? 0;
                const priceB = b.customRetailPrice ?? b.customPrice ?? b.product?.salePrice ?? 0;
                return priceB - priceA;
            });
        } else if (sortBy === 'NAME') {
            result.sort((a, b) => {
                const nameA = a.customName || a.product?.name || '';
                const nameB = b.customName || b.product?.name || '';
                return nameA.localeCompare(nameB);
            });
        }

        return result;
    }, [ecatalog.items, searchQuery, selectedOrigin, sortBy]);

    // Unique origins for filter pills
    const availableOrigins = useMemo(() => {
        const set = new Set<string>();
        ecatalog.items.forEach(i => {
            if (i.customOrigin && i.customOrigin.trim()) {
                set.add(i.customOrigin.trim());
            }
        });
        return Array.from(set);
    }, [ecatalog.items]);

    // Bound currentFlipIndex safely
    useEffect(() => {
        if (currentFlipIndex >= filteredItems.length && filteredItems.length > 0) {
            setCurrentFlipIndex(0);
        }
    }, [filteredItems.length, currentFlipIndex]);

    // Autoplay slideshow
    useEffect(() => {
        if (!isAutoPlaying || filteredItems.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentFlipIndex(prev => (prev + 1) % filteredItems.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [isAutoPlaying, filteredItems.length]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (drawerItem || shareModalOpen || consultantModalOpen) return;
            if (viewMode === 'FLIPBOOK') {
                if (e.key === 'ArrowRight' || e.key === ' ') {
                    e.preventDefault();
                    setCurrentFlipIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    setCurrentFlipIndex(prev => Math.max(prev - 1, 0));
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, filteredItems.length, drawerItem, shareModalOpen, consultantModalOpen]);

    // Fullscreen toggle handler
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    };

    const formatCurrency = (amount?: number | null) => {
        if (!amount || amount === 0) return 'Liên hệ';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const currentItem = filteredItems[currentFlipIndex] || null;
    const currentSpecsAndFeatures = useMemo(() => {
        if (!currentItem) return { specs: [], features: [] };
        return parseTechSpecsAndFeatures(
            currentItem.customDesc || currentItem.product?.description,
            currentItem.customOrigin,
            currentItem.customNote,
            currentItem.customSku || currentItem.product?.sku
        );
    }, [currentItem]);

    // Active drawer parsed specs & features
    const drawerSpecsAndFeatures = useMemo(() => {
        if (!drawerItem) return { specs: [], features: [] };
        return parseTechSpecsAndFeatures(
            drawerItem.customDesc || drawerItem.product?.description,
            drawerItem.customOrigin,
            drawerItem.customNote,
            drawerItem.customSku || drawerItem.product?.sku
        );
    }, [drawerItem]);

    // Filter drawer specs by search query
    const filteredDrawerSpecs = useMemo(() => {
        if (!specsSearchQuery) return drawerSpecsAndFeatures.specs;
        const q = specsSearchQuery.toLowerCase();
        return drawerSpecsAndFeatures.specs.filter(s => 
            s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
        );
    }, [drawerSpecsAndFeatures.specs, specsSearchQuery]);

    // Copy specs to clipboard
    const handleCopySpecs = () => {
        if (!drawerItem) return;
        const text = drawerSpecsAndFeatures.specs.map(s => `${s.label}: ${s.value}`).join('\n');
        navigator.clipboard.writeText(text);
        setCopiedSpecs(true);
        setTimeout(() => setCopiedSpecs(false), 2000);
    };

    // Copy public share link
    const handleCopyShareLink = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        }
    };

    // Generate direct Zalo share link
    const getZaloShareUrl = () => {
        if (typeof window === 'undefined') return '#';
        return `https://zalo.me/share?url=${encodeURIComponent(window.location.href)}`;
    };

    // Direct consultation text for Zalo
    const getConsultationMessage = (item?: EcatalogItem | null) => {
        const itemName = item?.customName || item?.product?.name || ecatalog.name;
        const itemSku = item?.customSku || item?.product?.sku || '';
        const text = `Xin chào! Tôi đang xem sản phẩm "${itemName}" ${itemSku ? `(Model: ${itemSku})` : ''} trên E-Catalog "${ecatalog.name}". Xin vui lòng hỗ trợ tư vấn thông số kỹ thuật và báo giá chi tiết.`;
        return encodeURIComponent(text);
    };

    const consultantPhone = companyInfo?.phone || '0901232255';
    const cleanPhone = consultantPhone.replace(/\s+/g, '');

    return (
        <div className="w-full">
            {/* HERO BANNER & CATALOG META */}
            <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5 shadow-sm">
                                <Sparkles size={13} className="text-emerald-400" />
                                {ecatalog.code}
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                                {ecatalog.items.length} Thiết bị & Giải pháp
                            </span>
                            {ecatalog.showDealerPrice && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                    ★ Hiển thị Giá Đại Lý
                                </span>
                            )}
                        </div>

                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight" style={{ color: "#ffffff" }}>
                            {ecatalog.name}
                        </h1>

                        <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed font-normal">
                            {ecatalog.description || 'Khám phá giải pháp công nghệ tiên tiến, đầy đủ thông số kỹ thuật, xuất xứ rõ ràng và chính sách giá ưu đãi trực tuyến.'}
                        </p>
                    </div>

                    {/* Consultant High-Tech Mini Card */}
                    <div className="w-full lg:w-auto bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl flex items-center justify-between gap-4 shrink-0 hover:border-slate-700 transition-colors">
                        <div className="flex items-center gap-3.5">
                            <div className="relative">
                                {ecatalog.creator.avatar ? (
                                    <img src={ecatalog.creator.avatar} alt={ecatalog.creator.name || ''} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50 shadow-md" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black text-lg border-2 border-emerald-400/30 shadow-md">
                                        {ecatalog.creator.name?.charAt(0) || 'E'}
                                    </div>
                                )}
                                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
                            </div>
                            <div>
                                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                    <User size={12} /> Chuyên Viên Tư Vấn
                                </div>
                                <div className="text-sm font-bold text-white">{ecatalog.creator.name || 'Đội ngũ kỹ thuật'}</div>
                                <div className="text-xs text-slate-400">{consultantPhone}</div>
                            </div>
                        </div>

                        <button 
                            onClick={() => setConsultantModalOpen(true)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 shrink-0" style={{ background: "#10b981", color: "#020617", fontWeight: 800 }}
                        >
                            Liên hệ tư vấn
                        </button>
                    </div>
                </div>
            </div>

            {/* FLOATING COMMAND BAR & DOCK */}
            <div className="sticky top-[69px] z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl px-4 sm:px-6 lg:px-8 py-3.5 transition-all">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
                    {/* View Mode Switcher Pill */}
                    <div className="flex items-center gap-2">
                        <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl shadow-inner">
                            <button
                                onClick={() => setViewMode('FLIPBOOK')}
                                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={viewMode === 'FLIPBOOK' ? { background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', color: '#020617', fontWeight: 800 } : { background: '#1e293b', color: '#cbd5e1' }}
                            >
                                <BookOpen size={15} />
                                <span>📖 Lật Mở Catalogue</span>
                            </button>
                            <button
                                onClick={() => setViewMode('GRID')}
                                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={viewMode === 'GRID' ? { background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', color: '#020617', fontWeight: 800 } : { background: '#1e293b', color: '#cbd5e1' }}
                            >
                                <LayoutGrid size={15} />
                                <span>▦ Showroom Công Nghệ</span>
                            </button>
                        </div>

                        {/* Total Count Pill */}
                        <span className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1.5 bg-slate-900 text-slate-400 border border-slate-800 rounded-lg">
                            {filteredItems.length} sản phẩm
                        </span>
                    </div>

                    {/* Quick Live Search Bar */}
                    <div className="flex-1 max-w-md relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo Model, Tên thiết bị, Xuất xứ, Thông số..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentFlipIndex(0);
                            }}
                            className="w-full pl-9 pr-9 py-2 bg-slate-900/90 border border-slate-700/60 rounded-xl text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); setCurrentFlipIndex(0); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-md"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Secondary Actions: Fullscreen, Share & Slideshow */}
                    <div className="flex items-center justify-end gap-2 shrink-0">
                        {viewMode === 'FLIPBOOK' && filteredItems.length > 1 && (
                            <button
                                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                    isAutoPlaying
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm animate-pulse'
                                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                                }`}
                                title="Tự động trình chiếu lần lượt các trang"
                            >
                                {isAutoPlaying ? <Pause size={14} /> : <Play size={14} />}
                                <span className="hidden sm:inline">{isAutoPlaying ? 'Dừng chiếu' : 'Trình chiếu'}</span>
                            </button>
                        )}

                        <button
                            onClick={toggleFullscreen}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all"
                            title="Chế độ toàn màn hình (Showroom Mode)"
                        >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>

                        <button
                            onClick={() => setShareModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all"
                            title="Chia sẻ hoặc quét mã QR"
                        >
                            <Share2 size={15} />
                            <span className="hidden sm:inline">Chia sẻ & QR</span>
                        </button>
                    </div>
                </div>

                {/* Filter Pills Ribbon (Origins) */}
                {availableOrigins.length > 0 && (
                    <div className="max-w-7xl mx-auto flex items-center gap-1.5 pt-2.5 overflow-x-auto no-scrollbar text-xs">
                        <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1 mr-1">
                            <MapPin size={12} /> Xuất xứ:
                        </span>
                        <button
                            onClick={() => setSelectedOrigin('ALL')}
                            className="px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer"
                            style={selectedOrigin === 'ALL' ? { background: '#10b981', color: '#020617', fontWeight: 800 } : { background: '#0f172a', color: '#cbd5e1', border: '1px solid #334155' }}
                        >
                            Tất cả ({ecatalog.items.length})
                        </button>
                        {availableOrigins.map((orig) => {
                            const count = ecatalog.items.filter(i => (i.customOrigin || '').trim() === orig).length;
                            return (
                                <button
                                    key={orig}
                                    onClick={() => setSelectedOrigin(orig)}
                                    className="px-2.5 py-1 rounded-lg font-medium shrink-0 transition-all cursor-pointer"
                                    style={selectedOrigin === orig ? { background: '#10b981', color: '#020617', fontWeight: 800 } : { background: '#0f172a', color: '#cbd5e1', border: '1px solid #334155' }}
                                >
                                    {orig} ({count})
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* EMPTY STATE */}
            {filteredItems.length === 0 && (
                <div className="max-w-xl mx-auto my-20 p-8 rounded-3xl bg-slate-900/60 border border-dashed border-slate-800 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
                        <Search size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Không tìm thấy sản phẩm phù hợp</h3>
                    <p className="text-xs text-slate-400 mb-6">
                        Không có sản phẩm nào khớp với bộ lọc hoặc từ khóa &quot;{searchQuery}&quot;. Vui lòng thử tìm từ khóa khác.
                    </p>
                    <button
                        onClick={() => { setSearchQuery(''); setSelectedOrigin('ALL'); }}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                    >
                        Xóa tất cả bộ lọc
                    </button>
                </div>
            )}

            {/* VIEW MODE 1: 📖 LẬT MỞ CATALOGUE (DIGITAL FLIPBOOK SPREAD) */}
            {viewMode === 'FLIPBOOK' && currentItem && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                    {/* Flippable 2-Page Spread Book Canvas */}
                    <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl overflow-hidden transition-all duration-500">
                        {/* Book Spine Center Lighting Decor */}
                        <div className="hidden lg:block absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 z-20 pointer-events-none bg-gradient-to-r from-black/40 via-white/5 to-black/40" />

                        {/* Spread Grid: Left Page (Showcase) + Right Page (Specs & Features) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
                            
                            {/* LEFT PAGE: PRODUCT STAGE & VISUAL SHOWCASE */}
                            <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-between relative bg-gradient-to-br from-slate-900/80 via-slate-950/60 to-slate-900/90 min-h-[460px] md:min-h-[560px]">
                                {/* Page Top Bar */}
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded-lg text-xs font-mono font-black bg-slate-800 text-slate-200 border border-slate-700/80 uppercase tracking-wider">
                                            {currentItem.customSku || currentItem.product?.sku || 'SKU-001'}
                                        </span>
                                        {currentItem.customOrigin && (
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                                <MapPin size={12} /> {currentItem.customOrigin}
                                            </span>
                                        )}
                                    </div>

                                    <span className="text-[11px] font-mono font-bold text-slate-400 tracking-wider">
                                        TRANG {currentFlipIndex + 1} / {filteredItems.length}
                                    </span>
                                </div>

                                {/* Product Image Stage with Glow Effect */}
                                <div className="my-auto py-6 flex items-center justify-center relative group">
                                    {/* Ambient Glow */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 via-teal-500/5 to-transparent rounded-3xl blur-2xl group-hover:from-emerald-500/20 transition-all duration-700 pointer-events-none" />

                                    {currentItem.imageUrl || currentItem.product?.imageUrl ? (
                                        <div className="relative max-w-md w-full aspect-square sm:aspect-[4/3] flex items-center justify-center p-4">
                                            <img
                                                src={currentItem.imageUrl || currentItem.product?.imageUrl || ''}
                                                alt={currentItem.customName || currentItem.product?.name || ''}
                                                className="max-h-80 w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] transform group-hover:scale-105 transition-transform duration-700 ease-out select-none"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-64 w-full flex flex-col items-center justify-center text-slate-600 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                                            <ImageIcon size={64} className="stroke-[1.2] mb-3 opacity-60" />
                                            <span className="text-xs font-mono tracking-widest text-slate-500">HÌNH ẢNH ĐANG CẬP NHẬT</span>
                                        </div>
                                    )}
                                </div>

                                {/* Left Page Footer Note */}
                                <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <ShieldCheck size={14} className="text-emerald-400" /> Chính Hãng 100%
                                    </span>
                                    {currentItem.customNote && (
                                        <span className="text-amber-400 font-semibold truncate max-w-[200px]" title={currentItem.customNote}>
                                            ★ {currentItem.customNote}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT PAGE: TECH MATRIX & INTERACTIVE FEATURE FLIP */}
                            <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-between relative bg-gradient-to-bl from-slate-900/60 via-slate-900/90 to-slate-950/90 min-h-[460px] md:min-h-[560px]">
                                <div>
                                    {/* Product Title */}
                                    <div className="mb-4">
                                        <span className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase">
                                            THÔNG SỐ & TÍNH NĂNG CHI TIẾT
                                        </span>
                                        <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 leading-snug tracking-tight" style={{ color: '#ffffff' }}>
                                            {currentItem.customName || currentItem.product?.name}
                                        </h2>
                                    </div>

                                    {/* Pricing High-Tech Box */}
                                    <div className="mb-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                Giá Bán Lẻ Niêm Yết
                                            </span>
                                            <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight" style={{ color: '#34d399' }}>
                                                {formatCurrency(currentItem.customRetailPrice ?? currentItem.customPrice ?? currentItem.product?.salePrice)}
                                            </span>
                                        </div>

                                        {ecatalog.showDealerPrice && (currentItem.customDealerPrice ?? 0) > 0 && (
                                            <div className="border-l border-slate-800 pl-4">
                                                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1" style={{ color: '#fbbf24' }}>
                                                    Giá Đại Lý / Đối Tác
                                                </span>
                                                <span className="text-xl font-black text-amber-300" style={{ color: '#fcd34d' }}>
                                                    {formatCurrency(currentItem.customDealerPrice)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Key Features Highlights (Parsed from desc) */}
                                    <div className="space-y-2.5 mb-6">
                                        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#5eead4' }}>
                                            <Zap size={14} className="text-teal-400" /> Tính Năng Nổi Bật:
                                        </div>

                                        {currentSpecsAndFeatures.features.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2">
                                                {currentSpecsAndFeatures.features.slice(0, 3).map((feat, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 flex items-start gap-3 transition-colors"
                                                    >
                                                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                                                            {feat.iconType === 'shield' ? <ShieldCheck size={14} /> :
                                                             feat.iconType === 'zap' ? <Zap size={14} /> :
                                                             feat.iconType === 'wifi' ? <Wifi size={14} /> :
                                                             <Cpu size={14} />}
                                                        </div>
                                                        <div className="text-xs text-white font-medium leading-relaxed" style={{ color: '#f8fafc' }}>
                                                            {feat.desc}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-200 bg-slate-950/70 p-3 rounded-xl border border-slate-800 leading-relaxed font-medium" style={{ color: '#e2e8f0' }}>
                                                {currentItem.customDesc || currentItem.product?.description || 'Chi tiết tính năng sản phẩm đang được chuẩn bị.'}
                                            </p>
                                        )}
                                    </div>

                                    {/* Mini Spec Matrix Preview */}
                                    {currentSpecsAndFeatures.specs.length > 0 && (
                                        <div className="mb-6 rounded-xl bg-slate-950/90 border border-slate-700/60 p-3.5 overflow-hidden shadow-inner">
                                            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                                                <span className="flex items-center gap-1.5 text-slate-200" style={{ color: '#e2e8f0' }}><Layers size={13} className="text-emerald-400" /> Bảng Thông Số Rút Gọn</span>
                                                <span className="text-[10px] text-emerald-400 font-bold" style={{ color: '#34d399' }}>({currentSpecsAndFeatures.specs.length} thông số)</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {currentSpecsAndFeatures.specs.slice(0, 4).map((spec, sIdx) => (
                                                    <div key={sIdx} className="flex items-baseline justify-between text-xs py-1.5 border-b border-slate-800/60 last:border-0">
                                                        <span className="text-slate-300 font-medium" style={{ color: '#cbd5e1' }}>{spec.label}</span>
                                                        <span className="text-white font-bold text-right max-w-[60%] truncate" style={{ color: '#ffffff' }}>{spec.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons: LẬT MỞ CHI TIẾT KỸ THUẬT & LIÊN HỆ */}
                                <div className="pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setDrawerItem(currentItem);
                                            setDrawerActiveTab('SPECS');
                                        }}
                                        className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer hover:brightness-110 active:scale-[0.99]" style={{ background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', color: '#020617', fontWeight: 800 }}
                                    >
                                        <Sparkles size={16} />
                                        <span>Lật Mở Thông Số & Tính Năng</span>
                                    </button>

                                    <a
                                        href={`https://zalo.me/${cleanPhone}?text=${getConsultationMessage(currentItem)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full sm:w-auto py-3 px-4 rounded-xl text-xs sm:text-sm font-bold border border-slate-700/80 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md hover:bg-slate-700" style={{ background: '#1e293b', color: '#ffffff' }}
                                    >
                                        <div className="w-5 h-5 rounded-md bg-blue-500 text-white flex items-center justify-center text-[10px] font-black">Z</div>
                                        <span>Nhận Báo Giá</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Large Side Navigation Flippers */}
                        <button
                            onClick={() => setCurrentFlipIndex(prev => Math.max(prev - 1, 0))}
                            disabled={currentFlipIndex === 0}
                            className={`absolute left-3 top-1/2 -translate-y-1/2 z-30 p-3 rounded-2xl backdrop-blur-xl border transition-all ${
                                currentFlipIndex === 0
                                    ? 'bg-slate-900/40 text-slate-600 border-slate-800/40 cursor-not-allowed opacity-30'
                                    : 'bg-slate-900/90 text-white hover:bg-emerald-500 hover:text-slate-950 border-slate-700/80 shadow-2xl hover:scale-110'
                            }`}
                            title="Lật sang trang trước"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        <button
                            onClick={() => setCurrentFlipIndex(prev => Math.min(prev + 1, filteredItems.length - 1))}
                            disabled={currentFlipIndex === filteredItems.length - 1}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 z-30 p-3 rounded-2xl backdrop-blur-xl border transition-all ${
                                currentFlipIndex === filteredItems.length - 1
                                    ? 'bg-slate-900/40 text-slate-600 border-slate-800/40 cursor-not-allowed opacity-30'
                                    : 'bg-slate-900/90 text-white hover:bg-emerald-500 hover:text-slate-950 border-slate-700/80 shadow-2xl hover:scale-110'
                            }`}
                            title="Lật sang trang tiếp theo"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    {/* Bottom Floating Scrubber & Thumbnail Strip Toggle */}
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800">
                        {/* Page Tracker & Thumbnails Toggle */}
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => setShowThumbnails(!showThumbnails)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                    showThumbnails
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                }`}
                            >
                                <Layers size={14} />
                                <span>{showThumbnails ? 'Ẩn mục lục ảnh' : 'Mục lục ảnh nhanh'}</span>
                            </button>

                            <span className="text-xs font-mono font-bold text-slate-300">
                                {currentFlipIndex + 1} / {filteredItems.length}
                            </span>
                        </div>

                        {/* Interactive Page Slider */}
                        <div className="flex-1 w-full max-w-lg flex items-center gap-3">
                            <button
                                onClick={() => setCurrentFlipIndex(prev => Math.max(prev - 1, 0))}
                                disabled={currentFlipIndex === 0}
                                className="p-1.5 text-slate-400 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <input
                                type="range"
                                min={0}
                                max={filteredItems.length - 1}
                                value={currentFlipIndex}
                                onChange={(e) => setCurrentFlipIndex(Number(e.target.value))}
                                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                            />

                            <button
                                onClick={() => setCurrentFlipIndex(prev => Math.min(prev + 1, filteredItems.length - 1))}
                                disabled={currentFlipIndex === filteredItems.length - 1}
                                className="p-1.5 text-slate-400 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Interactive Thumbnail Ribbon (Expandable) */}
                    {showThumbnails && (
                        <div className="mt-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 overflow-x-auto no-scrollbar flex items-center gap-3 transition-all">
                            {filteredItems.map((item, idx) => (
                                <button
                                    key={item.id || idx}
                                    onClick={() => setCurrentFlipIndex(idx)}
                                    className={`relative shrink-0 w-24 h-24 rounded-xl p-2 border transition-all flex flex-col items-center justify-between ${
                                        currentFlipIndex === idx
                                            ? 'bg-slate-800 border-emerald-500 shadow-lg shadow-emerald-500/20 scale-105'
                                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                                    }`}
                                >
                                    <span className="text-[10px] font-mono font-bold text-slate-400 self-start">#{idx + 1}</span>
                                    {item.imageUrl || item.product?.imageUrl ? (
                                        <img
                                            src={item.imageUrl || item.product?.imageUrl || ''}
                                            alt=""
                                            className="w-12 h-12 object-contain"
                                        />
                                    ) : (
                                        <ImageIcon size={20} className="text-slate-600" />
                                    )}
                                    <span className="text-[9px] font-bold text-slate-300 truncate w-full text-center">
                                        {item.customSku || item.product?.sku || item.customName}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* VIEW MODE 2: ▦ SHOWROOM CÔNG NGHỆ (HIGH-TECH GRID VIEW) */}
            {viewMode === 'GRID' && filteredItems.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                    {/* Sort & Quick Filter Bar */}
                    <div className="flex items-center justify-between gap-4 mb-6 text-xs">
                        <span className="text-slate-400 font-medium">
                            Đang hiển thị <strong className="text-white">{filteredItems.length}</strong> sản phẩm công nghệ
                        </span>

                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Sắp xếp:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                            >
                                <option value="DEFAULT">Mặc định danh mục</option>
                                <option value="PRICE_ASC">Giá tăng dần</option>
                                <option value="PRICE_DESC">Giá giảm dần</option>
                                <option value="NAME">Tên A → Z</option>
                            </select>
                        </div>
                    </div>

                    {/* Showroom Multi-Column Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map((item, index) => {
                            const name = item.customName || item.product?.name;
                            const sku = item.customSku || item.product?.sku;
                            const retailPrice = item.customRetailPrice ?? item.customPrice ?? item.product?.salePrice ?? 0;
                            const dealerPrice = item.customDealerPrice ?? 0;
                            const origin = item.customOrigin || '';
                            const note = item.customNote || '';
                            const image = item.imageUrl || item.product?.imageUrl;

                            return (
                                <div
                                    key={item.id || index}
                                    className="group rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col overflow-hidden relative"
                                >
                                    {/* Image Showcase Stage */}
                                    <div 
                                        className="aspect-[4/3] bg-gradient-to-b from-slate-950 to-slate-900/60 p-6 flex items-center justify-center relative overflow-hidden cursor-pointer"
                                        onClick={() => {
                                            setDrawerItem(item);
                                            setDrawerActiveTab('FEATURES');
                                        }}
                                    >
                                        {/* Corner Badges */}
                                        <div className="absolute top-3.5 left-3.5 z-10 flex flex-col gap-1.5">
                                            {sku && (
                                                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-black bg-slate-900/95 text-slate-200 border border-slate-700/80 uppercase shadow-sm">
                                                    {sku}
                                                </span>
                                            )}
                                        </div>

                                        <div className="absolute top-3.5 right-3.5 z-10 flex flex-col gap-1.5">
                                            {origin && (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                                                    <MapPin size={10} /> {origin}
                                                </span>
                                            )}
                                        </div>

                                        {/* Product Cutout */}
                                        {image ? (
                                            <img
                                                src={image}
                                                alt={name || ''}
                                                className="max-h-full max-w-full object-contain transform group-hover:scale-110 transition-transform duration-500 ease-out drop-shadow-lg"
                                            />
                                        ) : (
                                            <div className="text-slate-600 flex flex-col items-center">
                                                <ImageIcon size={48} className="mb-2 opacity-50" />
                                                <span className="text-[10px] font-mono tracking-widest text-slate-500">NO IMAGE</span>
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                            <span className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black shadow-xl flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                                <Sparkles size={14} /> Lật mở chi tiết
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-5 flex flex-col flex-1 justify-between">
                                        <div>
                                            <h3 
                                                onClick={() => {
                                                    setDrawerItem(item);
                                                    setDrawerActiveTab('FEATURES');
                                                }}
                                                className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug cursor-pointer mb-2"
                                                style={{ color: '#ffffff' }}
                                            >
                                                {name}
                                            </h3>

                                            {note && (
                                                <div className="text-[11px] text-amber-400 font-medium mb-3 line-clamp-1 flex items-center gap-1">
                                                    <ShieldCheck size={12} className="shrink-0" />
                                                    <span>{note}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Pricing & CTA */}
                                        <div className="pt-3 border-t border-slate-800/80 mt-auto">
                                            <div className="flex items-baseline justify-between mb-3">
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                        Giá bán lẻ
                                                    </span>
                                                    <span className="text-lg font-black text-emerald-400" style={{ color: '#34d399' }}>
                                                        {formatCurrency(retailPrice)}
                                                    </span>
                                                </div>

                                                {ecatalog.showDealerPrice && dealerPrice > 0 && (
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                                                            Đại lý
                                                        </span>
                                                        <span className="text-xs font-black text-amber-300" style={{ color: '#fcd34d' }}>
                                                            {formatCurrency(dealerPrice)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => {
                                                        setDrawerItem(item);
                                                        setDrawerActiveTab('SPECS');
                                                    }}
                                                    className="py-2 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <FileText size={13} className="text-emerald-400" />
                                                    <span>Thông số</span>
                                                </button>

                                                <a
                                                    href={`https://zalo.me/${cleanPhone}?text=${getConsultationMessage(item)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="py-2 px-3 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <div className="w-3.5 h-3.5 rounded-sm bg-blue-500 text-white flex items-center justify-center text-[8px] font-black">Z</div>
                                                    <span>Báo giá</span>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* DEEP-DIVE SPEC DRAWER / MODAL: "LẬT MỞ XEM TÍNH NĂNG & THÔNG SỐ KỸ THUẬT" */}
            {drawerItem && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => setDrawerItem(null)}
                    />

                    {/* Sliding Drawer Panel */}
                    <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full z-10 overflow-hidden transform transition-transform duration-500">
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700 uppercase">
                                        {drawerItem.customSku || drawerItem.product?.sku || 'SKU'}
                                    </span>
                                    {drawerItem.customOrigin && (
                                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                            <MapPin size={11} /> {drawerItem.customOrigin}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight" style={{ color: '#ffffff' }}>
                                    {drawerItem.customName || drawerItem.product?.name}
                                </h3>
                            </div>

                            <button
                                onClick={() => setDrawerItem(null)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Interactive Tabs Navigation */}
                        <div className="flex items-center border-b border-slate-800 px-6 bg-slate-900/90 text-xs font-bold overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setDrawerActiveTab('FEATURES')}
                                className={`py-3.5 px-3 border-b-2 flex items-center gap-2 shrink-0 transition-all ${
                                    drawerActiveTab === 'FEATURES'
                                        ? 'border-emerald-500 text-emerald-400'
                                        : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                            >
                                <Sparkles size={14} />
                                <span>Tính Năng Nổi Bật</span>
                            </button>

                            <button
                                onClick={() => setDrawerActiveTab('SPECS')}
                                className={`py-3.5 px-3 border-b-2 flex items-center gap-2 shrink-0 transition-all ${
                                    drawerActiveTab === 'SPECS'
                                        ? 'border-emerald-500 text-emerald-400'
                                        : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                            >
                                <Layers size={14} />
                                <span>Thông Số Kỹ Thuật ({drawerSpecsAndFeatures.specs.length})</span>
                            </button>

                            <button
                                onClick={() => setDrawerActiveTab('GALLERY')}
                                className={`py-3.5 px-3 border-b-2 flex items-center gap-2 shrink-0 transition-all ${
                                    drawerActiveTab === 'GALLERY'
                                        ? 'border-emerald-500 text-emerald-400'
                                        : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                            >
                                <ImageIcon size={14} />
                                <span>Hình Ảnh & Media</span>
                            </button>

                            <button
                                onClick={() => setDrawerActiveTab('QUOTE')}
                                className={`py-3.5 px-3 border-b-2 flex items-center gap-2 shrink-0 transition-all ${
                                    drawerActiveTab === 'QUOTE'
                                        ? 'border-emerald-500 text-emerald-400'
                                        : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                            >
                                <Phone size={14} />
                                <span>Tư Vấn & Báo Giá</span>
                            </button>
                        </div>

                        {/* Drawer Body Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            
                            {/* TAB 1: FEATURES */}
                            {drawerActiveTab === 'FEATURES' && (
                                <div className="space-y-4">
                                    {drawerItem.customNote && (
                                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                                            <ShieldCheck className="text-amber-400 shrink-0 mt-0.5" size={18} />
                                            <div>
                                                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                                                    Tiêu Chuẩn & Chứng Nhận
                                                </h4>
                                                <p className="text-xs text-amber-200/90 leading-relaxed">
                                                    {drawerItem.customNote}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {drawerSpecsAndFeatures.features.length > 0 ? (
                                        <div className="space-y-3">
                                            {drawerSpecsAndFeatures.features.map((feat, fIdx) => (
                                                <div 
                                                    key={fIdx}
                                                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3.5"
                                                >
                                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                                                        {feat.iconType === 'shield' ? <ShieldCheck size={18} /> :
                                                         feat.iconType === 'zap' ? <Zap size={18} /> :
                                                         feat.iconType === 'wifi' ? <Wifi size={18} /> :
                                                         <Cpu size={18} />}
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xs font-bold text-white mb-1">{feat.title}</h5>
                                                        <p className="text-xs text-slate-300 leading-relaxed">{feat.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}

                                    {/* Raw Description Box */}
                                    <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <FileText size={14} className="text-emerald-400" /> Chi Tiết Giới Thiệu
                                        </h4>
                                        {drawerItem.customDesc || drawerItem.product?.description || 'Chưa có thông tin mô tả bổ sung cho sản phẩm này.'}
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: TECH SPECS SHEET */}
                            {drawerActiveTab === 'SPECS' && (
                                <div className="space-y-4">
                                    {/* Specs Search & Action Toolbar */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Lọc thông số kỹ thuật..."
                                                value={specsSearchQuery}
                                                onChange={(e) => setSpecsSearchQuery(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>

                                        <button
                                            onClick={handleCopySpecs}
                                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                                            title="Sao chép toàn bộ bảng thông số"
                                        >
                                            {copiedSpecs ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                            <span>{copiedSpecs ? 'Đã sao chép' : 'Sao chép bảng'}</span>
                                        </button>
                                    </div>

                                    {/* Tech Specifications Zebra Table */}
                                    <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/60">
                                        <table className="w-full text-xs">
                                            <tbody>
                                                {filteredDrawerSpecs.map((spec, specIdx) => (
                                                    <tr 
                                                        key={specIdx}
                                                        className={`border-b border-slate-800/60 last:border-0 ${
                                                            specIdx % 2 === 0 ? 'bg-slate-900/40' : 'bg-transparent'
                                                        }`}
                                                    >
                                                        <td className="py-3 px-4 text-slate-400 font-semibold w-2/5 border-r border-slate-800/40">
                                                            {spec.label}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-200 font-medium w-3/5">
                                                            {spec.value}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredDrawerSpecs.length === 0 && (
                                                    <tr>
                                                        <td colSpan={2} className="py-8 text-center text-slate-500 italic">
                                                            Không tìm thấy thông số nào khớp với từ khóa tìm kiếm.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: GALLERY & MEDIA */}
                            {drawerActiveTab === 'GALLERY' && (
                                <div className="space-y-4">
                                    <div className="aspect-[4/3] rounded-2xl bg-slate-950 p-6 flex items-center justify-center border border-slate-800 relative group overflow-hidden">
                                        {drawerItem.imageUrl || drawerItem.product?.imageUrl ? (
                                            <img
                                                src={drawerItem.imageUrl || drawerItem.product?.imageUrl || ''}
                                                alt={drawerItem.customName || ''}
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        ) : (
                                            <div className="text-slate-600 flex flex-col items-center">
                                                <ImageIcon size={64} className="mb-2 opacity-50" />
                                                <span className="text-xs font-mono">CHƯA CÓ HÌNH ẢNH</span>
                                            </div>
                                        )}
                                    </div>

                                    {(drawerItem.imageUrl || drawerItem.product?.imageUrl) && (
                                        <a
                                            href={drawerItem.imageUrl || drawerItem.product?.imageUrl || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink size={14} />
                                            <span>Xem ảnh gốc độ phân giải cao</span>
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* TAB 4: QUOTE & CONSULTANT */}
                            {drawerActiveTab === 'QUOTE' && (
                                <div className="space-y-4">
                                    <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Sparkles size={16} className="text-emerald-400" />
                                            Nhận Tư Vấn Kỹ Thuật & Báo Giá Ưu Đãi
                                        </h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Chúng tôi sẵn sàng cung cấp tài liệu giải pháp, catalogue PDF, thông số kỹ thuật theo yêu cầu dự án và báo giá tốt nhất cho doanh nghiệp của bạn.
                                        </p>

                                        <div className="space-y-2 pt-2">
                                            <a
                                                href={`https://zalo.me/${cleanPhone}?text=${getConsultationMessage(drawerItem)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                                            >
                                                <div className="w-5 h-5 rounded-md bg-white text-blue-600 flex items-center justify-center text-[10px] font-black">Z</div>
                                                <span>Nhắn tin Zalo trực tiếp với chuyên viên</span>
                                            </a>

                                            <a
                                                href={`tel:${cleanPhone}`}
                                                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                                            >
                                                <Phone size={15} />
                                                <span>Gọi điện trực tiếp: {consultantPhone}</span>
                                            </a>

                                            {companyInfo?.email && (
                                                <a
                                                    href={`mailto:${companyInfo.email}?subject=Yêu cầu báo giá sản phẩm ${drawerItem.customName || drawerItem.product?.name}&body=${decodeURIComponent(getConsultationMessage(drawerItem))}`}
                                                    className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Mail size={15} />
                                                    <span>Gửi Email yêu cầu: {companyInfo.email}</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sticky Bottom Pricing & Action Bar */}
                        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Giá bán lẻ
                                </span>
                                <span className="text-xl sm:text-2xl font-black text-emerald-400" style={{ color: '#34d399' }}>
                                    {formatCurrency(drawerItem.customRetailPrice ?? drawerItem.customPrice ?? drawerItem.product?.salePrice)}
                                </span>
                            </div>

                            <a
                                href={`https://zalo.me/${cleanPhone}?text=${getConsultationMessage(drawerItem)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto px-6 py-3 rounded-xl text-slate-950 text-xs sm:text-sm font-black transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer hover:brightness-110" style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', color: '#020617', fontWeight: 800 }}
                            >
                                <div className="w-4 h-4 rounded-sm bg-blue-600 text-white flex items-center justify-center text-[8px] font-black">Z</div>
                                <span>Tư Vấn Ngay Qua Zalo</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* SHARE & QR CODE MODAL */}
            {shareModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShareModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 text-center">
                        <button
                            onClick={() => setShareModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl"
                        >
                            <X size={18} />
                        </button>

                        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                            <Share2 size={24} />
                        </div>

                        <h3 className="text-lg font-black text-white mb-1">Chia Sẻ E-Catalog Trực Tuyến</h3>
                        <p className="text-xs text-slate-400 mb-6">
                            Quét mã QR bằng điện thoại hoặc sao chép liên kết để gửi cho khách hàng và đối tác
                        </p>

                        {/* Live QR Code Box */}
                        <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mb-6">
                            <QRCodeSVG 
                                value={typeof window !== 'undefined' ? window.location.href : 'https://tsol.vn'}
                                size={190}
                                level="H"
                                includeMargin={true}
                            />
                        </div>

                        {/* Link Copy Box */}
                        <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 mb-4">
                            <input
                                type="text"
                                readOnly
                                value={typeof window !== 'undefined' ? window.location.href : ''}
                                className="bg-transparent text-xs text-slate-300 px-2 flex-1 outline-none font-mono truncate"
                            />
                            <button
                                onClick={handleCopyShareLink}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 transition-colors"
                            >
                                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                                <span>{copiedLink ? 'Đã chép' : 'Sao chép'}</span>
                            </button>
                        </div>

                        {/* Direct Share Channels */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                            <a
                                href={getZaloShareUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition-colors"
                            >
                                <div className="w-4 h-4 rounded-sm bg-white text-blue-600 flex items-center justify-center text-[9px] font-black">Z</div>
                                <span>Chia sẻ Zalo</span>
                            </a>

                            <button
                                onClick={handleCopyShareLink}
                                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-2 transition-colors"
                            >
                                <Copy size={14} />
                                <span>Gửi đường link</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONSULTANT CONTACT MODAL */}
            {consultantModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setConsultantModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 text-center">
                        <button
                            onClick={() => setConsultantModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl"
                        >
                            <X size={18} />
                        </button>

                        <div className="relative w-20 h-20 mx-auto mb-4">
                            {ecatalog.creator.avatar ? (
                                <img src={ecatalog.creator.avatar} alt="" className="w-full h-full rounded-full object-cover border-4 border-emerald-500/40 shadow-xl" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl">
                                    {ecatalog.creator.name?.charAt(0) || 'E'}
                                </div>
                            )}
                            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
                        </div>

                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                            CHUYÊN VIÊN PHỤ TRÁCH DỰ ÁN
                        </span>
                        <h3 className="text-xl font-black text-white mb-1">{ecatalog.creator.name || 'Tư vấn kỹ thuật'}</h3>
                        <p className="text-xs text-slate-400 mb-6">{companyInfo?.fullName || ''}</p>

                        <div className="space-y-2 text-xs font-bold text-left">
                            <a
                                href={`tel:${cleanPhone}`}
                                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                                    <Phone size={18} />
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Hotline / Di động</div>
                                    <div className="text-sm font-bold text-white">{consultantPhone}</div>
                                </div>
                            </a>

                            <a
                                href={`https://zalo.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                                    <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-black">Z</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Zalo Trực Tuyến</div>
                                    <div className="text-sm font-bold text-white">{consultantPhone}</div>
                                </div>
                            </a>

                            {companyInfo?.email && (
                                <a
                                    href={`mailto:${companyInfo.email}`}
                                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Email hỗ trợ</div>
                                        <div className="text-xs font-bold text-white truncate max-w-[220px]">{companyInfo.email}</div>
                                    </div>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
