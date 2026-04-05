'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, ShoppingCart, Receipt, CreditCard, Folder, LogOut, FileSignature, Menu, X, Building2 } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface SidebarProps {
    customerName: string;
    avatar?: string | null;
}

export default function PortalSidebar({ customerName, avatar }: SidebarProps) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const navItems = [
        { name: 'Tổng quan', href: '/portal/dashboard', icon: LayoutDashboard },
        { name: 'Lịch sử giao dịch', href: '/portal/orders', icon: LayoutDashboard }, 
        { name: 'Báo giá', href: '/portal/quotes', icon: FileSignature },
        { name: 'Đơn hàng', href: '/portal/sales-orders', icon: ShoppingCart },
        { name: 'Hóa đơn', href: '/portal/invoices', icon: Receipt },
        { name: 'Thanh toán', href: '/portal/payments', icon: CreditCard },
        { name: 'Sao kê công nợ', href: '/portal/statement', icon: FileSignature },
        { name: 'Tài liệu', href: '/portal/documents', icon: Folder },
    ];

    const isActive = (href: string) => {
        if (href === '#' || href === '') return false;
        return pathname.startsWith(href);
    };

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/portal/login' });
    };

    const toggleSidebar = () => setIsOpen(!isOpen);

    return (
        <>
            {/* Mobile menu button */}
            <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Building2 className="text-emerald-600" size={24} />
                    <span className="font-bold text-slate-800 truncate max-w-[200px]">{customerName}</span>
                </div>
                <button onClick={toggleSidebar} className="p-2 bg-slate-100 rounded-md text-slate-600">
                    {isOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 md:static z-50 h-full w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                flex flex-col flex-shrink-0
            `}>
                <div className="p-6 border-b border-slate-800 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex flex-col items-center justify-center overflow-hidden mb-3 border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        {avatar ? (
                            <img src={avatar} alt={customerName} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xl font-bold text-emerald-400">{customerName.substring(0, 2).toUpperCase()}</span>
                        )}
                    </div>
                    <h2 className="text-white font-semibold text-center leading-tight tracking-wide">{customerName}</h2>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 mt-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 tracking-wider">Client Portal</span>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="px-3 space-y-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-semibold text-sm tracking-wide
                                    ${isActive(item.href) 
                                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                                        : 'hover:bg-slate-800 hover:text-white'}
                                `}
                            >
                                <item.icon size={18} className={isActive(item.href) ? 'text-white' : 'text-slate-400'} />
                                <span>{item.name}</span>
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md transition-colors font-medium text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                        <LogOut size={18} />
                        <span>Đăng xuất</span>
                    </button>
                    <div className="mt-4 text-center">
                        <p className="text-xs text-slate-600">&copy; 2026 TSOL APP</p>
                    </div>
                </div>
            </aside>
            
            {/* Top padding on mobile to account for the fixed header */}
            <div className="md:hidden pt-16"></div>
        </>
    );
}
