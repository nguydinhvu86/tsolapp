'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Plus, CheckSquare, Users, FileText, FileSpreadsheet, Box, Building, CreditCard, Banknote, DollarSign, ExternalLink } from 'lucide-react';

export function QuickCreateMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const menuItems = [
        { label: 'Tạo Công Việc', href: '/tasks?action=new', icon: <CheckSquare size={16} /> },
        { label: 'Thêm Khách Hàng', href: '/customers?action=new', icon: <Users size={16} /> },
        { label: 'Thêm Báo Giá ERP', href: '/sales/estimates?action=new', icon: <FileText size={16} /> },
        { label: 'Thêm Lead', href: '/sales/leads/new', icon: <ExternalLink size={16} /> },
        { label: 'Thêm Hóa Đơn (Bán)', href: '/sales/invoices?action=new', icon: <FileSpreadsheet size={16} /> },
        { label: 'Thêm Sản Phẩm Mới', href: '/inventory/products?action=new', icon: <Box size={16} /> },
        { label: 'Thêm Nhà Cung Cấp', href: '/suppliers?action=new', icon: <Building size={16} /> },
        { label: 'Thêm Hóa Đơn (Mua)', href: '/purchasing/bills?action=new', icon: <FileSpreadsheet size={16} /> },
        { label: 'Thêm Thanh Toán NCC', href: '/purchasing/payments?action=new', icon: <CreditCard size={16} /> },
        { label: 'Thêm Thu Tiền (Khách)', href: '/sales/payments?action=new', icon: <Banknote size={16} /> },
        { label: 'Thêm Chi Phí', href: '/sales/expenses?action=new', icon: <DollarSign size={16} /> },
    ];

    return (
        <div className="relative ml-2" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 focus:outline-none transition-all shadow-md animate-quick-create"
                style={{
                    width: '36px',
                    height: '36px',
                    flexShrink: 0
                }}
                title="Tạo Nhanh"
            >
                <Plus size={20} strokeWidth={3} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 z-[100] py-2">
                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Tạo Mới Nhanh</h3>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-1 gap-1 px-2">
                            {menuItems.map((item, index) => (
                                <Link
                                    key={index}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors group"
                                >
                                    <span className="text-slate-400 group-hover:text-green-600 transition-colors">{item.icon}</span>
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
