'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Package, Tag } from 'lucide-react';

export interface ProductOption {
    id: string;
    name: string;
    sku?: string | null;
    unit?: string | null;
}

interface ProductSearchSelectProps {
    products: ProductOption[];
    value: string;
    onChange: (productId: string) => void;
    placeholder?: string;
    allOptionLabel?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
}

// Remove Vietnamese accents/diacritics for smart fuzzy matching
function normalizeText(str: string): string {
    return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .trim();
}

export default function ProductSearchSelect({
    products = [],
    value,
    onChange,
    placeholder = '-- Chọn hoặc tìm kiếm sản phẩm --',
    allOptionLabel,
    required = false,
    disabled = false,
    className = ''
}: ProductSearchSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(0);
    const [alignRight, setAlignRight] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Selected product
    const selectedProduct = useMemo(() => {
        return products.find(p => p.id === value) || null;
    }, [products, value]);

    // Filtered products list
    const filteredProducts = useMemo(() => {
        if (!searchTerm.trim()) return products;
        const normQuery = normalizeText(searchTerm);
        return products.filter(p => {
            const normName = normalizeText(p.name);
            const normSku = normalizeText(p.sku || '');
            return normName.includes(normQuery) || normSku.includes(normQuery);
        });
    }, [products, searchTerm]);

    // Check alignment relative to screen viewport
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // If right space is smaller than 480px and left space is bigger, align right
            if (rect.left + 480 > window.innerWidth && rect.right > 480) {
                setAlignRight(true);
            } else {
                setAlignRight(false);
            }
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opened
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setHighlightIndex(0);
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 60);
        }
    }, [isOpen]);

    // Keep highlightIndex in range
    useEffect(() => {
        if (highlightIndex >= filteredProducts.length) {
            setHighlightIndex(Math.max(0, filteredProducts.length - 1));
        }
    }, [filteredProducts.length, highlightIndex]);

    // Scroll active item into view
    useEffect(() => {
        if (isOpen && listRef.current) {
            const activeEl = listRef.current.children[highlightIndex] as HTMLElement;
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightIndex, isOpen]);

    const handleSelect = (productId: string) => {
        onChange(productId);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightIndex(prev => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredProducts[highlightIndex]) {
                    handleSelect(filteredProducts[highlightIndex].id);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
            default:
                break;
        }
    };

    return (
        <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-50' : 'z-10'} ${className}`}>
            {/* Hidden input for HTML form validation if required */}
            <input
                type="text"
                tabIndex={-1}
                value={value}
                required={required}
                onChange={() => {}}
                className="opacity-0 w-0 h-0 absolute -z-10"
            />

            {/* Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl text-left flex items-center justify-between gap-2 border transition-all cursor-pointer ${
                    disabled
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed'
                        : isOpen
                        ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-2xs'
                }`}
            >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <Package className={`w-4 h-4 shrink-0 ${selectedProduct ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    {selectedProduct ? (
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span 
                                className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white truncate" 
                                title={selectedProduct.name}
                            >
                                {selectedProduct.name}
                            </span>
                            {selectedProduct.sku && (
                                <span className="shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                    {selectedProduct.sku}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                            {allOptionLabel || placeholder}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {selectedProduct && !disabled && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={handleClear}
                            title="Xóa lựa chọn"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </span>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-emerald-600' : ''
                        }`}
                    />
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div 
                    className={`absolute ${alignRight ? 'right-0' : 'left-0'} top-full mt-1.5 min-w-full sm:min-w-[460px] md:min-w-[520px] max-w-[min(620px,calc(100vw-1.5rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}
                >
                    {/* Search Input Box */}
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                        <div className="relative flex items-center">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setHighlightIndex(0);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="Gõ tên hoặc mã SKU sản phẩm để tìm nhanh..."
                                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white placeholder:text-slate-400"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>
                                Tìm thấy <strong className="text-emerald-700 dark:text-emerald-400">{filteredProducts.length}</strong> sản phẩm
                            </span>
                            <span className="hidden sm:inline text-slate-400">Dùng phím ↑ ↓ và Enter để chọn</span>
                        </div>
                    </div>

                    {/* Products List */}
                    <div
                        ref={listRef}
                        className="max-h-72 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100/70 dark:divide-slate-800/70"
                    >
                        {/* All Option item (if allOptionLabel is passed and search is empty) */}
                        {allOptionLabel && !searchTerm && (
                            <div
                                onClick={() => handleSelect('')}
                                className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs font-semibold ${
                                    !value
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-emerald-600" />
                                    <span className="font-bold text-xs sm:text-[13px]">{allOptionLabel}</span>
                                </div>
                                {!value && (
                                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                        <Check className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                        )}

                        {filteredProducts.length > 0 ? (
                            filteredProducts.map((p, idx) => {
                                const isSelected = p.id === value;
                                const isHighlighted = idx === highlightIndex;

                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => handleSelect(p.id)}
                                        onMouseEnter={() => setHighlightIndex(idx)}
                                        className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 text-xs ${
                                            isSelected
                                                ? 'bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-semibold'
                                                : isHighlighted
                                                ? 'bg-slate-100/90 dark:bg-slate-800 text-slate-900 dark:text-white'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0 py-0.5">
                                            {/* Full product name without truncation so everything is readable */}
                                            <div className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white leading-relaxed break-words">
                                                {p.name}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                                {p.sku ? (
                                                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                                                        <Tag className="w-3 h-3 text-emerald-600" />
                                                        SKU: {p.sku}
                                                    </span>
                                                ) : (
                                                    <span className="italic text-slate-400 text-[10px]">Chưa có mã SKU</span>
                                                )}
                                                {p.unit && (
                                                    <span className="text-slate-500 dark:text-slate-400">
                                                        • ĐVT: <strong className="text-slate-700 dark:text-slate-200">{p.unit}</strong>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-8 px-4 text-center space-y-2">
                                <Package className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    Không tìm thấy sản phẩm phù hợp
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    Thử tìm với từ khóa khác hoặc kiểm tra lại tên sản phẩm.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
