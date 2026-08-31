'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
    Search,
    Loader2,
    User,
    Building2,
    FileText,
    ShoppingCart,
    Receipt,
    Calculator,
    FileSignature,
    CheckSquare,
    X,
    Target,
    Package,
    ArrowLeft,
    WalletCards,
    Sparkles,
    FileEdit,
    MessageSquare,
    CornerDownLeft
} from 'lucide-react';
import { globalSearch, SearchResult } from './actions';
import { formatDate } from '@/lib/utils/formatters';

export function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string>('ALL');
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);

    const desktopWrapperRef = useRef<HTMLDivElement>(null);
    const desktopInputRef = useRef<HTMLInputElement>(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);

    // Global shortcut Ctrl+K / Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                if (window.innerWidth <= 768) {
                    setIsMobileOpen(true);
                } else {
                    desktopInputRef.current?.focus();
                    setIsOpen(true);
                }
            } else if (e.key === 'Escape') {
                setIsOpen(false);
                setIsMobileOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Auto focus mobile input when mobile modal opens
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                mobileInputRef.current?.focus();
            }, 100);
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileOpen]);

    // Click outside to close desktop dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (desktopWrapperRef.current && !desktopWrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search query
    useEffect(() => {
        if (!query || query.trim().length < 2) {
            setResults([]);
            if (!isMobileOpen) setIsOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            if (!isMobileOpen) setIsOpen(true);
            try {
                const data = await globalSearch(query);
                setResults(data);
                setSelectedIndex(-1);
            } catch (error) {
                console.error('Search failed', error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 350); // 350ms snappy debounce

        return () => clearTimeout(timer);
    }, [query, isMobileOpen]);

    const getIconForType = (type: SearchResult['type']) => {
        switch (type) {
            case 'CUSTOMER': return <User size={16} className="text-blue-600" />;
            case 'SUPPLIER': return <Building2 size={16} className="text-amber-600" />;
            case 'SALES_ESTIMATE': return <Calculator size={16} className="text-emerald-600" />;
            case 'SALES_ORDER': return <ShoppingCart size={16} className="text-purple-600" />;
            case 'SALES_INVOICE': return <Receipt size={16} className="text-rose-600" />;
            case 'PURCHASE_ORDER': return <ShoppingCart size={16} className="text-orange-600" />;
            case 'PURCHASE_BILL': return <Receipt size={16} className="text-teal-600" />;
            case 'QUOTE': return <FileText size={16} className="text-cyan-600" />;
            case 'CONTRACT': return <FileSignature size={16} className="text-indigo-600" />;
            case 'TASK': return <CheckSquare size={16} className="text-violet-600" />;
            case 'LEAD': return <Target size={16} className="text-pink-600" />;
            case 'PRODUCT': return <Package size={16} className="text-sky-600" />;
            case 'EXPENSE': return <WalletCards size={16} className="text-amber-700" />;
            default: return <FileText size={16} className="text-gray-600" />;
        }
    };

    const getTypeLabel = (type: SearchResult['type']) => {
        switch (type) {
            case 'CUSTOMER': return 'Khách hàng';
            case 'SUPPLIER': return 'Nhà cung cấp';
            case 'SALES_ESTIMATE': return 'Báo giá (ERP)';
            case 'SALES_ORDER': return 'Đơn bán hàng';
            case 'SALES_INVOICE': return 'Hóa đơn bán';
            case 'PURCHASE_ORDER': return 'Đơn mua hàng';
            case 'PURCHASE_BILL': return 'Hóa đơn mua';
            case 'QUOTE': return 'Báo giá văn thư';
            case 'CONTRACT': return 'Hợp đồng';
            case 'TASK': return 'Nhiệm vụ & Công việc';
            case 'LEAD': return 'Cơ hội bán hàng (Lead)';
            case 'PRODUCT': return 'Sản phẩm / Kho';
            case 'EXPENSE': return 'Chi phí';
            default: return 'Khác';
        }
    };

    // Filter results based on active tab
    const filteredResults = useMemo(() => {
        if (activeFilter === 'ALL') return results;
        if (activeFilter === 'NOTES') return results.filter(r => Boolean(r.matchSnippet));
        if (activeFilter === 'CUSTOMERS') return results.filter(r => r.type === 'CUSTOMER' || r.type === 'SUPPLIER');
        if (activeFilter === 'SALES') return results.filter(r => ['SALES_ESTIMATE', 'SALES_ORDER', 'SALES_INVOICE', 'QUOTE', 'CONTRACT'].includes(r.type));
        if (activeFilter === 'PURCHASES') return results.filter(r => ['PURCHASE_ORDER', 'PURCHASE_BILL', 'EXPENSE'].includes(r.type));
        if (activeFilter === 'TASKS') return results.filter(r => r.type === 'TASK' || r.type === 'LEAD');
        if (activeFilter === 'PRODUCTS') return results.filter(r => r.type === 'PRODUCT');
        return results;
    }, [results, activeFilter]);

    // Group results by type
    const groupedResults = useMemo(() => {
        return filteredResults.reduce((acc, result) => {
            if (!acc[result.type]) acc[result.type] = [];
            acc[result.type].push(result);
            return acc;
        }, {} as Record<string, SearchResult[]>);
    }, [filteredResults]);

    const filterOptions = [
        { id: 'ALL', label: 'Tất cả', count: results.length },
        { id: 'NOTES', label: 'Khớp ghi chú & nội dung', icon: Sparkles, count: results.filter(r => Boolean(r.matchSnippet)).length },
        { id: 'CUSTOMERS', label: 'Khách & Đối tác', count: results.filter(r => r.type === 'CUSTOMER' || r.type === 'SUPPLIER').length },
        { id: 'SALES', label: 'Bán hàng & HĐ', count: results.filter(r => ['SALES_ESTIMATE', 'SALES_ORDER', 'SALES_INVOICE', 'QUOTE', 'CONTRACT'].includes(r.type)).length },
        { id: 'PURCHASES', label: 'Mua hàng & Chi phí', count: results.filter(r => ['PURCHASE_ORDER', 'PURCHASE_BILL', 'EXPENSE'].includes(r.type)).length },
        { id: 'TASKS', label: 'Công việc & Lead', count: results.filter(r => r.type === 'TASK' || r.type === 'LEAD').length },
        { id: 'PRODUCTS', label: 'Sản phẩm', count: results.filter(r => r.type === 'PRODUCT').length },
    ];

    const closeAll = () => {
        setIsOpen(false);
        setIsMobileOpen(false);
    };

    return (
        <>
            {/* 1. DESKTOP SEARCH BAR */}
            <div ref={desktopWrapperRef} className="global-search-wrapper desktop-only">
                <div
                    className={`gs-input-container ${isOpen && results.length > 0 ? 'gs-input-open' : ''}`}
                    onClick={() => {
                        desktopInputRef.current?.focus();
                        if (query.trim().length >= 2) setIsOpen(true);
                    }}
                >
                    <Search size={17} className="gs-icon text-slate-400" />
                    <input
                        ref={desktopInputRef}
                        type="text"
                        placeholder="Siêu tìm kiếm (Tên, Ghi chú, Đơn hàng, Mã...)"
                        className="gs-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => { if (query.trim().length >= 2) setIsOpen(true); }}
                    />
                    {isLoading && <Loader2 size={15} className="gs-spinner text-indigo-500 mr-2" />}
                    {query ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setQuery('');
                                setResults([]);
                                setIsOpen(false);
                            }}
                            className="gs-clear-btn"
                        >
                            <X size={14} />
                        </button>
                    ) : (
                        <kbd className="gs-shortcut-badge">Ctrl K</kbd>
                    )}
                </div>

                {/* DESKTOP DROPDOWN RESULTS */}
                {isOpen && query.trim().length >= 2 && (
                    <div className="gs-dropdown">
                        {/* Quick filter tabs */}
                        <div className="gs-filters-bar custom-scrollbar">
                            {filterOptions.filter(f => f.count > 0 || f.id === 'ALL').map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setActiveFilter(opt.id)}
                                    className={`gs-filter-pill ${activeFilter === opt.id ? 'active' : ''}`}
                                >
                                    {opt.icon && <opt.icon size={12} className="inline mr-1 text-amber-500" />}
                                    <span>{opt.label}</span>
                                    {opt.count > 0 && <span className="gs-pill-count">{opt.count}</span>}
                                </button>
                            ))}
                        </div>

                        {isLoading ? (
                            <div className="gs-empty-state">
                                <Loader2 className="gs-spinner text-indigo-600" size={26} />
                                <span className="font-medium text-slate-600">Đang quét dữ liệu toàn hệ thống & nội dung ghi chú...</span>
                            </div>
                        ) : filteredResults.length === 0 ? (
                            <div className="gs-empty-state">
                                <Search size={28} className="text-slate-300 mb-1" />
                                <span className="font-medium text-slate-700">Không tìm thấy kết quả phù hợp cho "{query}"</span>
                                <span className="text-xs text-slate-400">Thử tìm theo từ khóa tên khách, mã đơn, nội dung ghi chú, hoặc số điện thoại</span>
                            </div>
                        ) : (
                            <div className="gs-results-list custom-scrollbar">
                                {Object.entries(groupedResults).map(([type, items]) => (
                                    <div key={type} className="gs-category">
                                        <div className="gs-category-header">
                                            <span>{getTypeLabel(type as any)}</span>
                                            <span className="gs-category-count">{items.length}</span>
                                        </div>
                                        <div className="gs-items-container">
                                            {items.map((res) => (
                                                <Link
                                                    key={res.id}
                                                    href={res.link}
                                                    onClick={closeAll}
                                                    className="gs-item"
                                                >
                                                    <div className="gs-item-icon">
                                                        {getIconForType(res.type)}
                                                    </div>
                                                    <div className="gs-item-content">
                                                        <div className="gs-item-title-row">
                                                            <span className="gs-item-title">{res.title}</span>
                                                            {res.badge && (
                                                                <span className="gs-item-badge">{res.badge}</span>
                                                            )}
                                                        </div>
                                                        <div className="gs-item-subtitle-row">
                                                            <span className="gs-item-subtitle">{res.subtitle}</span>
                                                            {res.date && (
                                                                <span className="gs-item-date">{formatDate(res.date)}</span>
                                                            )}
                                                        </div>
                                                        {res.matchSnippet && (
                                                            <div className="gs-item-match-snippet">
                                                                <span className="gs-match-label">{res.matchLabel || 'Ghi chú'}:</span>
                                                                <span className="gs-match-text">"{res.matchSnippet}"</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <div className="gs-footer">
                                    <span className="gs-footer-hint">
                                        <CornerDownLeft size={12} className="inline mr-1" />
                                        Nhấp vào kết quả để chuyển tới trang chi tiết
                                    </span>
                                    <span className="gs-footer-count">{filteredResults.length} kết quả</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 2. MOBILE SEARCH TRIGGER BUTTON */}
            <div className="mobile-only flex items-center">
                <button
                    type="button"
                    onClick={() => setIsMobileOpen(true)}
                    className="mobile-search-btn"
                    aria-label="Tìm kiếm toàn hệ thống"
                    title="Tìm kiếm toàn hệ thống"
                >
                    <Search size={19} className="text-slate-600" />
                    <span className="mobile-search-text text-xs text-slate-500 font-medium hidden xs:inline">Tìm kiếm...</span>
                </button>
            </div>

            {/* 3. MOBILE FULL-SCREEN SEARCH MODAL OVERLAY */}
            {isMobileOpen && (
                <div className="mobile-search-overlay">
                    {/* Header */}
                    <div className="mobile-search-header">
                        <button
                            type="button"
                            onClick={() => setIsMobileOpen(false)}
                            className="mobile-back-btn"
                            aria-label="Quay lại"
                        >
                            <ArrowLeft size={22} className="text-slate-700" />
                        </button>
                        <div className="mobile-input-box">
                            <Search size={18} className="text-slate-400 shrink-0" />
                            <input
                                ref={mobileInputRef}
                                type="text"
                                placeholder="Tìm kiếm khách hàng, đơn hàng, ghi chú..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="mobile-input"
                            />
                            {isLoading && <Loader2 size={16} className="gs-spinner text-indigo-600 shrink-0" />}
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuery('');
                                        setResults([]);
                                    }}
                                    className="mobile-clear-btn shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Pills on Mobile */}
                    <div className="mobile-filters-bar custom-scrollbar">
                        {filterOptions.filter(f => f.count > 0 || f.id === 'ALL').map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setActiveFilter(opt.id)}
                                className={`mobile-filter-pill ${activeFilter === opt.id ? 'active' : ''}`}
                            >
                                {opt.icon && <opt.icon size={12} className="inline mr-1 text-amber-500" />}
                                <span>{opt.label}</span>
                                {opt.count > 0 && <span className="mobile-pill-count">{opt.count}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Mobile Results Container */}
                    <div className="mobile-results-container custom-scrollbar">
                        {query.trim().length < 2 ? (
                            <div className="mobile-search-prompt">
                                <div className="prompt-icon-box">
                                    <Search size={32} className="text-indigo-500" />
                                </div>
                                <h4 className="text-slate-800 font-semibold text-base mb-1">Siêu Tìm Kiếm Toàn Hệ Thống</h4>
                                <p className="text-slate-500 text-xs text-center max-w-xs mb-4">
                                    Nhập từ 2 ký tự để quét mọi Khách hàng, Đơn hàng, Hóa đơn, Sản phẩm và nội dung Ghi chú chi tiết.
                                </p>
                                <div className="prompt-quick-tags">
                                    <span className="prompt-tag" onClick={() => setQuery('Báo giá')}>Báo giá</span>
                                    <span className="prompt-tag" onClick={() => setQuery('Hóa đơn')}>Hóa đơn</span>
                                    <span className="prompt-tag" onClick={() => setQuery('Hợp đồng')}>Hợp đồng</span>
                                    <span className="prompt-tag" onClick={() => setQuery('Nhiệm vụ')}>Nhiệm vụ</span>
                                </div>
                            </div>
                        ) : isLoading ? (
                            <div className="gs-empty-state pt-12">
                                <Loader2 className="gs-spinner text-indigo-600" size={32} />
                                <span className="font-medium text-slate-700 mt-2">Đang tìm kiếm chuyên sâu...</span>
                            </div>
                        ) : filteredResults.length === 0 ? (
                            <div className="gs-empty-state pt-12 px-4 text-center">
                                <Search size={36} className="text-slate-300 mb-2" />
                                <span className="font-semibold text-slate-800 text-sm">Không tìm thấy kết quả nào</span>
                                <span className="text-xs text-slate-500 mt-1">Không có mục nào khớp với "{query}" trong tên, mã hoặc nội dung ghi chú.</span>
                            </div>
                        ) : (
                            <div className="mobile-results-list">
                                {Object.entries(groupedResults).map(([type, items]) => (
                                    <div key={type} className="mobile-category-block">
                                        <div className="mobile-category-header">
                                            <span>{getTypeLabel(type as any)}</span>
                                            <span className="mobile-category-count">{items.length}</span>
                                        </div>
                                        <div className="mobile-items-list">
                                            {items.map((res) => (
                                                <Link
                                                    key={res.id}
                                                    href={res.link}
                                                    onClick={closeAll}
                                                    className="mobile-item-card"
                                                >
                                                    <div className="mobile-item-icon">
                                                        {getIconForType(res.type)}
                                                    </div>
                                                    <div className="mobile-item-info">
                                                        <div className="mobile-item-title-row">
                                                            <span className="mobile-item-title">{res.title}</span>
                                                            {res.badge && (
                                                                <span className="mobile-item-badge">{res.badge}</span>
                                                            )}
                                                        </div>
                                                        <div className="mobile-item-subtitle-row">
                                                            <span className="mobile-item-subtitle">{res.subtitle}</span>
                                                            {res.date && (
                                                                <span className="mobile-item-date">{formatDate(res.date)}</span>
                                                            )}
                                                        </div>
                                                        {res.matchSnippet && (
                                                            <div className="mobile-match-snippet">
                                                                <span className="mobile-match-tag">{res.matchLabel || 'Ghi chú'}</span>
                                                                <span className="mobile-match-text">"{res.matchSnippet}"</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx global>{`
                .global-search-wrapper {
                    position: relative;
                    width: 100%;
                    max-width: 500px;
                }

                @media (max-width: 768px) {
                    .desktop-only {
                        display: none !important;
                    }
                    .mobile-only {
                        display: flex !important;
                    }
                }

                @media (min-width: 769px) {
                    .desktop-only {
                        display: block !important;
                    }
                    .mobile-only {
                        display: none !important;
                    }
                }

                /* Mobile Search Trigger Button */
                .mobile-search-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 10px;
                    border-radius: 9999px;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .mobile-search-btn:active {
                    background: #e2e8f0;
                    transform: scale(0.97);
                }

                /* Mobile Search Modal Overlay */
                .mobile-search-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: #ffffff;
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    animation: mobileSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes mobileSlideIn {
                    from { transform: translateY(15px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .mobile-search-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 14px;
                    border-bottom: 1px solid #f1f5f9;
                    background: #ffffff;
                }

                .mobile-back-btn {
                    padding: 8px;
                    border-radius: 8px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .mobile-back-btn:active {
                    background: #f1f5f9;
                }

                .mobile-input-box {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 9999px;
                    padding: 6px 12px;
                }
                .mobile-input-box:focus-within {
                    border-color: #6366f1;
                    background: #ffffff;
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
                }

                .mobile-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    outline: none;
                    font-size: 0.9375rem;
                    color: #1e293b;
                    min-width: 0;
                }
                .mobile-input::placeholder {
                    color: #94a3b8;
                    font-size: 0.875rem;
                }

                .mobile-clear-btn {
                    padding: 4px;
                    border-radius: 50%;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    background: transparent;
                }
                .mobile-clear-btn:active {
                    background: #e2e8f0;
                    color: #334155;
                }

                .mobile-filters-bar {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    background: #fafafa;
                    border-bottom: 1px solid #f1f5f9;
                    overflow-x: auto;
                    white-space: nowrap;
                    -webkit-overflow-scrolling: touch;
                }

                .mobile-filter-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    border-radius: 9999px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    color: #64748b;
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: all 0.15s ease;
                }
                .mobile-filter-pill.active {
                    background: #4f46e5;
                    border-color: #4f46e5;
                    color: #ffffff;
                    font-weight: 600;
                }
                .mobile-pill-count {
                    font-size: 0.65rem;
                    padding: 1px 5px;
                    border-radius: 9999px;
                    background: rgba(0, 0, 0, 0.08);
                }
                .mobile-filter-pill.active .mobile-pill-count {
                    background: rgba(255, 255, 255, 0.25);
                    color: #ffffff;
                }

                .mobile-results-container {
                    flex: 1;
                    overflow-y: auto;
                    padding-bottom: 24px;
                }

                .mobile-search-prompt {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 48px 20px;
                    text-align: center;
                }
                .prompt-icon-box {
                    width: 60px;
                    height: 60px;
                    border-radius: 16px;
                    background: #eef2ff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 14px;
                }
                .prompt-quick-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    justify-content: center;
                }
                .prompt-tag {
                    padding: 5px 12px;
                    font-size: 0.8125rem;
                    color: #4f46e5;
                    background: #eef2ff;
                    border-radius: 9999px;
                    cursor: pointer;
                    font-weight: 500;
                }
                .prompt-tag:active {
                    background: #e0e7ff;
                }

                .mobile-category-block {
                    margin-bottom: 12px;
                }
                .mobile-category-header {
                    padding: 6px 14px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    background: #f8fafc;
                    border-top: 1px solid #f1f5f9;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .mobile-category-count {
                    font-size: 0.7rem;
                    padding: 2px 6px;
                    border-radius: 9999px;
                    background: #e2e8f0;
                    color: #475569;
                }

                .mobile-items-list {
                    display: flex;
                    flex-direction: column;
                }
                .mobile-item-card {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 10px 14px;
                    border-bottom: 1px solid #f8fafc;
                    text-decoration: none;
                    transition: background 0.15s ease;
                }
                .mobile-item-card:active {
                    background: #f1f5f9;
                }
                .mobile-item-icon {
                    padding: 8px;
                    background: #f1f5f9;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    margin-top: 2px;
                }
                .mobile-item-info {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                }
                .mobile-item-title-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 6px;
                }
                .mobile-item-title {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #0f172a;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .mobile-item-badge {
                    font-size: 0.65rem;
                    font-weight: 600;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: #f1f5f9;
                    color: #475569;
                    flex-shrink: 0;
                }
                .mobile-item-subtitle-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 6px;
                    margin-top: 2px;
                }
                .mobile-item-subtitle {
                    font-size: 0.78125rem;
                    color: #64748b;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .mobile-item-date {
                    font-size: 0.6875rem;
                    color: #94a3b8;
                    flex-shrink: 0;
                }
                .mobile-match-snippet {
                    margin-top: 5px;
                    padding: 4px 8px;
                    background: #fefce8;
                    border: 1px solid #fef08a;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.75rem;
                }
                .mobile-match-tag {
                    font-weight: 700;
                    color: #854d0e;
                    flex-shrink: 0;
                }
                .mobile-match-text {
                    color: #713f12;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                /* Desktop Styles */
                .gs-input-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                    background-color: #f1f5f9;
                    border-radius: 9999px;
                    height: 38px;
                    padding: 0 0.875rem;
                    transition: all 0.2s ease;
                    border: 1px solid #e2e8f0;
                }
                .gs-input-container:hover {
                    background-color: #e2e8f0;
                }
                .gs-input-container:focus-within {
                    background-color: #ffffff;
                    border-color: #6366f1;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
                }
                .gs-input-open {
                    background-color: #ffffff;
                    border-bottom-left-radius: 0;
                    border-bottom-right-radius: 0;
                    border-color: #cbd5e1;
                    border-bottom-color: transparent;
                }
                .gs-icon {
                    margin-right: 0.5rem;
                    flex-shrink: 0;
                }
                .gs-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    font-size: 0.875rem;
                    color: #334155;
                    width: 100%;
                }
                .gs-input::placeholder {
                    color: #94a3b8;
                }
                .gs-shortcut-badge {
                    font-size: 0.6875rem;
                    font-family: inherit;
                    color: #94a3b8;
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    padding: 1px 5px;
                    border-radius: 4px;
                    box-shadow: 0 1px 1px rgba(0,0,0,0.05);
                }
                .gs-clear-btn {
                    padding: 4px;
                    border-radius: 50%;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                }
                .gs-clear-btn:hover {
                    background-color: #cbd5e1;
                    color: #334155;
                }
                .gs-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    width: 100%;
                    min-width: 480px;
                    background: white;
                    border-bottom-left-radius: 12px;
                    border-bottom-right-radius: 12px;
                    box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    border: 1px solid #cbd5e1;
                    border-top: none;
                    overflow: hidden;
                    z-index: 100;
                    animation: slideDown 0.18s ease-out forwards;
                    transform-origin: top;
                }
                @keyframes slideDown {
                    from { transform: scaleY(0.96); opacity: 0; }
                    to { transform: scaleY(1); opacity: 1; }
                }
                .gs-filters-bar {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    background: #f8fafc;
                    border-bottom: 1px solid #f1f5f9;
                    overflow-x: auto;
                }
                .gs-filter-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 3px 8px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    border-radius: 9999px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    color: #64748b;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.15s ease;
                }
                .gs-filter-pill:hover {
                    background: #f1f5f9;
                    color: #334155;
                }
                .gs-filter-pill.active {
                    background: #4f46e5;
                    border-color: #4f46e5;
                    color: #ffffff;
                    font-weight: 600;
                }
                .gs-pill-count {
                    font-size: 0.65rem;
                    padding: 1px 5px;
                    border-radius: 9999px;
                    background: rgba(0,0,0,0.08);
                }
                .gs-filter-pill.active .gs-pill-count {
                    background: rgba(255, 255, 255, 0.25);
                    color: #ffffff;
                }

                .gs-empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2.25rem 1.5rem;
                    color: #94a3b8;
                    font-size: 0.875rem;
                    gap: 0.35rem;
                    text-align: center;
                }
                .gs-spinner {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .gs-results-list {
                    max-height: 65vh;
                    overflow-y: auto;
                    padding: 0.25rem 0;
                }
                .gs-category {
                    margin-bottom: 0.25rem;
                }
                .gs-category-header {
                    padding: 0.375rem 1rem;
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    background: rgba(248, 250, 252, 0.95);
                    position: sticky;
                    top: 0;
                    backdrop-filter: blur(4px);
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-top: 1px solid #f1f5f9;
                    border-bottom: 1px solid #f1f5f9;
                }
                .gs-category-count {
                    background: #e2e8f0;
                    color: #475569;
                    border-radius: 999px;
                    padding: 1px 6px;
                    font-size: 0.65rem;
                }
                .gs-items-container {
                    display: flex;
                    flex-direction: column;
                }
                .gs-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    padding: 0.625rem 1rem;
                    text-decoration: none;
                    border-left: 3px solid transparent;
                    transition: all 0.15s ease;
                }
                .gs-item:hover {
                    background-color: rgba(99, 102, 241, 0.05);
                    border-left-color: #6366f1;
                }
                .gs-item-icon {
                    margin-top: 2px;
                    background: #f1f5f9;
                    padding: 6px;
                    border-radius: 6px;
                    border: 1px solid #e2e8f0;
                    transition: background 0.15s ease;
                }
                .gs-item:hover .gs-item-icon {
                    background: white;
                }
                .gs-item-content {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                }
                .gs-item-title-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.5rem;
                }
                .gs-item-title {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #1e293b;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .gs-item:hover .gs-item-title {
                    color: #4338ca;
                }
                .gs-item-badge {
                    font-size: 0.65rem;
                    padding: 2px 6px;
                    background: #f1f5f9;
                    color: #475569;
                    border-radius: 4px;
                    font-weight: 500;
                    flex-shrink: 0;
                }
                .gs-item-subtitle-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.5rem;
                    margin-top: 2px;
                }
                .gs-item-subtitle {
                    font-size: 0.75rem;
                    color: #64748b;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .gs-item-date {
                    font-size: 0.65rem;
                    color: #94a3b8;
                    flex-shrink: 0;
                }
                .gs-item-match-snippet {
                    margin-top: 4px;
                    padding: 3px 8px;
                    background: #fefce8;
                    border: 1px solid #fef08a;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .gs-match-label {
                    font-weight: 700;
                    color: #854d0e;
                    flex-shrink: 0;
                }
                .gs-match-text {
                    color: #713f12;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .gs-footer {
                    padding: 0.5rem 1rem;
                    border-top: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #f8fafc;
                }
                .gs-footer-hint {
                    font-size: 0.75rem;
                    color: #94a3b8;
                }
                .gs-footer-count {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #64748b;
                    background: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    border: 1px solid #e2e8f0;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(148, 163, 184, 0.4);
                    border-radius: 20px;
                }
            `}</style>
        </>
    );
}
