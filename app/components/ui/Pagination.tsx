'use client';
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    onItemsPerPageChange: (items: number) => void;
    totalItems: number;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    onItemsPerPageChange,
    totalItems
}: PaginationProps) {
    if (totalItems === 0) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6 bg-slate-50/30 rounded-b-2xl">
            <div className="flex items-center text-sm text-slate-500 mb-4 sm:mb-0">
                <span className="mr-2 hidden sm:inline">Hiển thị</span>
                <select
                    className="border border-slate-300 rounded-md text-sm py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-700 bg-white cursor-pointer"
                    value={itemsPerPage}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        onItemsPerPageChange(val);
                    }}
                >
                    <option value={25}>25 / trang</option>
                    <option value={50}>50 / trang</option>
                    <option value={100}>100 / trang</option>
                    <option value={999999}>Tất cả</option>
                </select>
                <span className="ml-3">
                    Đang xem <span className="font-medium text-slate-900">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> đến <span className="font-medium text-slate-900">{Math.min(currentPage * itemsPerPage, totalItems)}</span> trong tổng số <span className="font-medium text-slate-900">{totalItems}</span>
                </span>
            </div>

            <div className="flex items-center space-x-1">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Trang đầu"
                >
                    <ChevronsLeft size={16} />
                </button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Trang trước"
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="px-3 text-sm font-medium text-slate-700 select-none">
                    Trang {currentPage} / {totalPages > 0 ? totalPages : 1}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Trang sau"
                >
                    <ChevronRight size={16} />
                </button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Trang cuối"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
}

// Hook hỗ trợ chia trang
import { useState, useMemo } from 'react';

export function usePagination<T>(items: T[], defaultItemsPerPage: number = 25) {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Reset current page if it goes out of bounds when items change or filter changes
    React.useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [totalItems, itemsPerPage, totalPages, currentPage]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return items.slice(startIndex, endIndex);
    }, [items, currentPage, itemsPerPage]);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            // Cuộn lên đầu bảng mượt mà
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleItemsPerPageChange = (items: number) => {
        setItemsPerPage(items);
        setCurrentPage(1); // Reset back to first page when changing page size
    };

    return {
        paginatedItems,
        paginationProps: {
            currentPage,
            totalPages,
            totalItems,
            itemsPerPage,
            onPageChange: handlePageChange,
            onItemsPerPageChange: handleItemsPerPageChange,
        }
    };
}
