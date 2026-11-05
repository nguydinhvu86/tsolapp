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
            }, 50);
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
        <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-30' : ''} ${className}`}>
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
                        ? 'bg-white dark:bg-slate-900 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 shadow-2xs'
                }`}
            >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <Package className={`w-4 h-4 shrink-0 ${selectedProduct ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                    {selectedProduct ? (
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                {selectedProduct.name}
                            </span>
                            {selectedProduct.sku && (
                                <span className="shrink-0 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                                    {selectedProduct.sku}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                            {allOptionLabel || placeholder}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
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
                            isOpen ? 'rotate-180 text-blue-600' : ''
                        }`}
                    />
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {/* Search Input Box */}
                    <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
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
                                placeholder="Gõ tên hoặc mã SKU sản phẩm để lọc..."
                                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-900 dark:text-white placeholder:text-slate-400"
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
                        <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-slate-400">
                            <span>
                                Tìm thấy <strong className="text-slate-700 dark:text-slate-200">{filteredProducts.length}</strong> sản phẩm
                            </span>
                            <span className="hidden sm:inline">Dùng phím ↑ ↓ và Enter để chọn</span>
                        </div>
                    </div>

                    {/* Products List */}
                    <div
                        ref={listRef}
                        className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-slate-100/60 dark:divide-slate-800/60"
                    >
                        {/* All Option item (if allOptionLabel is passed and search is empty) */}
                        {allOptionLabel && !searchTerm && (
                            <div
                                onClick={() => handleSelect('')}
                                className={`px-3 py-2 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs font-semibold ${
                                    !value
                                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{allOptionLabel}</span>
                                </div>
                                {!value && (
                                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
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
                                        className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                                            isSelected
                                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-semibold'
                                                : isHighlighted
                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[13px] truncate">
                                                    {p.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                                {p.sku ? (
                                                    <span className="inline-flex items-center gap-1 font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                        <Tag className="w-3 h-3 text-slate-400" />
                                                        {p.sku}
                                                    </span>
                                                ) : (
                                                    <span className="italic text-slate-400">Chưa có mã SKU</span>
                                                )}
                                                {p.unit && (
                                                    <span>• ĐVT: <strong>{p.unit}</strong></span>
                                                )}
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
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
