'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Loader2, User, Building2, FileText, ShoppingCart, Receipt, Calculator, Briefcase, FileSignature, CheckSquare, X, Target } from 'lucide-react';
import { globalSearch, SearchResult } from './actions';
import { formatDate } from '@/lib/utils/formatters';

export function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        if (!query || query.trim().length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            setIsOpen(true);
            try {
                const data = await globalSearch(query);
                setResults(data);
            } catch (error) {
                console.error('Search failed', error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [query]);

    const getIconForType = (type: SearchResult['type']) => {
        switch (type) {
            case 'CUSTOMER': return <User size={16} className="text-blue-500" />;
            case 'SUPPLIER': return <Building2 size={16} className="text-amber-500" />;
            case 'SALES_ESTIMATE': return <Calculator size={16} className="text-emerald-500" />;
            case 'SALES_ORDER': return <ShoppingCart size={16} className="text-purple-500" />;
            case 'SALES_INVOICE': return <Receipt size={16} className="text-rose-500" />;
            case 'PURCHASE_ORDER': return <ShoppingCart size={16} className="text-orange-500" />;
            case 'PURCHASE_BILL': return <Receipt size={16} className="text-teal-500" />;
            case 'QUOTE': return <FileText size={16} className="text-cyan-500" />;
            case 'CONTRACT': return <FileSignature size={16} className="text-indigo-500" />;
            case 'TASK': return <CheckSquare size={16} className="text-violet-500" />;
            case 'LEAD': return <Target size={16} className="text-pink-500" />;
            default: return <FileText size={16} className="text-gray-500" />;
        }
    };

    const getTypeLabel = (type: SearchResult['type']) => {
        switch (type) {
            case 'CUSTOMER': return 'Khách hàng';
            case 'SUPPLIER': return 'Nhà cung cấp';
            case 'SALES_ESTIMATE': return 'Báo giá (ERP)';
            case 'SALES_ORDER': return 'Đơn đặt hàng';
            case 'SALES_INVOICE': return 'Hóa đơn bán';
            case 'PURCHASE_ORDER': return 'Đơn mua hàng';
            case 'PURCHASE_BILL': return 'Hóa đơn mua';
            case 'QUOTE': return 'Báo giá';
            case 'CONTRACT': return 'Hợp đồng';
            case 'TASK': return 'Nhiệm vụ';
            case 'LEAD': return 'Cơ hội bán hàng (Lead)';
            default: return 'Khác';
        }
    };

    // Group results by type
    const groupedResults = results.reduce((acc, result) => {
        if (!acc[result.type]) acc[result.type] = [];
        acc[result.type].push(result);
        return acc;
    }, {} as Record<string, SearchResult[]>);

    return (
        <div ref={wrapperRef} className="global-search-wrapper" style={{ flex: 1, maxWidth: '600px', display: 'block' }}>
            <div className={`gs-input-container ${isOpen && results.length > 0 ? 'gs-input-open' : ''}`}>
                <Search size={18} className="gs-icon" />
                <input
                    type="text"
                    placeholder="Siêu tìm kiếm (Khách hàng, Đơn hàng, Mã...)"
                    className="gs-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (query.trim().length >= 2) setIsOpen(true) }}
                />
                {query && (
                    <button onClick={() => { setQuery(''); setIsOpen(false); }} className="gs-clear-btn">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && query.trim().length >= 2 && (
                <div className="gs-dropdown">
                    {isLoading ? (
                        <div className="gs-empty-state">
                            <Loader2 className="gs-spinner" size={24} />
                            <span>Đang tìm kiếm...</span>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="gs-empty-state">
                            <Search size={24} style={{ opacity: 0.2, marginBottom: '4px' }} />
                            <span>Không tìm thấy kết quả nào cho "{query}"</span>
                        </div>
                    ) : (
                        <div className="gs-results-list custom-scrollbar">
                            {Object.entries(groupedResults).map(([type, items]) => (
                                <div key={type} className="gs-category">
                                    <div className="gs-category-header">
                                        {getTypeLabel(type as any)}
                                        <span className="gs-category-count">{items.length}</span>
                                    </div>
                                    <div className="gs-items-container">
                                        {items.map((res) => (
                                            <Link
                                                key={res.id}
                                                href={res.link}
                                                onClick={() => setIsOpen(false)}
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
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="gs-footer">
                                <span className="gs-footer-hint"><Search size={12} /> Nhấn Enter để xem tất cả</span>
                                <span className="gs-footer-count">{results.length} kết quả</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style jsx global>{`
                .global-search-wrapper {
                    position: relative;
                    width: 100%;
                }
                @media (max-width: 768px) {
                    .global-search-wrapper {
                        display: none !important;
                    }
                }
                .gs-input-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                    background-color: #f1f5f9;
                    border-radius: 9999px;
                    height: 40px;
                    padding: 0 1rem;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }
                .gs-input-container:hover {
                    background-color: #e2e8f0;
                }
                .gs-input-container:focus-within {
                    background-color: #ffffff;
                    border-color: #6366f1;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
                }
                .gs-input-open {
                    background-color: #ffffff;
                    border-bottom-left-radius: 0;
                    border-bottom-right-radius: 0;
                    border-color: #e2e8f0;
                    border-bottom-color: transparent;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .gs-icon {
                    color: #94a3b8;
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
                .gs-clear-btn {
                    padding: 4px;
                    border-radius: 50%;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-left: 4px;
                }
                .gs-clear-btn:hover {
                    background-color: #cbd5e1;
                    color: #475569;
                }
                .gs-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    width: 100%;
                    background: white;
                    border-bottom-left-radius: 12px;
                    border-bottom-right-radius: 12px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e2e8f0;
                    border-top: none;
                    overflow: hidden;
                    z-index: 100;
                    animation: slideDown 0.2s ease-out forwards;
                    transform-origin: top;
                }
                @keyframes slideDown {
                    from { transform: scaleY(0.95); opacity: 0; }
                    to { transform: scaleY(1); opacity: 1; }
                }
                .gs-empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2.5rem 0;
                    color: #94a3b8;
                    font-size: 0.875rem;
                    gap: 0.5rem;
                }
                .gs-spinner {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .gs-results-list {
                    max-height: 70vh;
                    overflow-y: auto;
                    padding: 0.5rem 0;
                }
                .gs-category {
                    margin-bottom: 0.5rem;
                }
                .gs-category:last-child {
                    margin-bottom: 0;
                }
                .gs-category-header {
                    padding: 0.375rem 1rem;
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    background: rgba(248, 250, 252, 0.8);
                    position: sticky;
                    top: 0;
                    backdrop-filter: blur(4px);
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    border-top: 1px solid #f1f5f9;
                    border-bottom: 1px solid #f1f5f9;
                    margin-bottom: 4px;
                }
                .gs-category-count {
                    background: #e2e8f0;
                    color: #64748b;
                    border-radius: 999px;
                    padding: 2px 6px;
                    font-size: 0.65rem;
                    margin-left: auto;
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
                    border-left: 2px solid transparent;
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
                    justify-content: center;
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
                    transition: color 0.15s ease;
                }
                .gs-item:hover .gs-item-title {
                    color: #4338ca;
                }
                .gs-item-badge {
                    font-size: 0.65rem;
                    padding: 2px 6px;
                    background: #f1f5f9;
                    color: #64748b;
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
                .gs-item:hover .gs-item-subtitle {
                    color: #475569;
                }
                .gs-item-date {
                    font-size: 0.65rem;
                    color: #94a3b8;
                    flex-shrink: 0;
                }
                .gs-footer {
                    padding: 0.5rem 1rem;
                    margin-top: 0.5rem;
                    border-top: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #f8fafc;
                }
                .gs-footer-hint {
                    font-size: 0.75rem;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 4px;
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
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(148, 163, 184, 0.4);
                    border-radius: 20px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background-color: rgba(148, 163, 184, 0.6);
                }
            `}</style>
        </div>
    );
}
