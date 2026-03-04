'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LayoutDashboard, Users, FileText, Settings, FileSpreadsheet, FileCode, ChevronDown, ChevronRight, FileOutput, FilePlus2, FileStack, Mail, CheckSquare, Package, ShoppingCart } from 'lucide-react';
const mainNavItems: any[] = [
    { name: 'Bảng Điều Khiển', href: '/dashboard', icon: LayoutDashboard, permission: 'VIEW_DASHBOARD' },
    { name: 'Công Việc (Tasks)', href: '/tasks', icon: CheckSquare, permission: 'TASKS_VIEW' },
    {
        name: 'Quản Lý Văn Thư',
        icon: FileStack,
        children: [
            { name: 'Quản lý Hợp Đồng', href: '/contracts', permission: 'CONTRACTS_VIEW' },
            { name: 'Phụ Lục Hợp Đồng', href: '/contract-appendices', permission: 'CONTRACTS_VIEW' },
            { name: 'Công Văn & Thông Báo', href: '/dispatches', permission: 'DISPATCHES_VIEW' },
            { name: 'Quản lý Báo Giá', href: '/quotes', permission: 'QUOTES_VIEW' },
            { name: 'Biên Bản Bàn Giao', href: '/handovers', permission: 'HANDOVERS_VIEW' },
            { name: 'Đề Nghị Thanh Toán', href: '/payment-requests', permission: 'PAYMENTS_VIEW' },
            {
                name: 'Quản Lý Biểu Mẫu',
                icon: FileCode,
                permission: 'TEMPLATES_VIEW',
                children: [
                    { name: 'Mẫu Hợp Đồng', href: '/templates' },
                    { name: 'Mẫu Phụ Lục HĐ', href: '/appendix-templates' },
                    { name: 'Mẫu Báo Giá', href: '/quote-templates' },
                    { name: 'Mẫu Biên Bản', href: '/handover-templates' },
                    { name: 'Mẫu Đề Nghị', href: '/payment-request-templates' },
                    { name: 'Mẫu Công Văn', href: '/dispatch-templates' }
                ]
            }
        ]
    },
    {
        name: 'Quản Lý Kho',
        icon: Package,
        children: [
            { name: 'Sản Phẩm & Dịch Vụ', href: '/inventory/products', permission: 'PRODUCTS_VIEW' },
            { name: 'Danh Sách Kho', href: '/inventory/warehouses', permission: 'WAREHOUSES_VIEW' },
            { name: 'Lịch Sử Lệnh Kho', href: '/inventory/transactions', permission: 'INVENTORY_TX_VIEW' },
            { name: 'Kiểm Kê Kho', href: '/inventory/adjustments', permission: 'INVENTORY_TX_VIEW' },
            { name: 'Báo Cáo Tồn Kho', href: '/inventory/reports', permission: 'INVENTORY_TX_VIEW' }
        ]
    },
    {
        name: 'Mua Hàng',
        icon: ShoppingCart,
        children: [
            { name: 'Nhà Cung Cấp', href: '/suppliers', permission: 'SUPPLIERS_VIEW' },
            { name: 'Đơn Đặt Hàng', href: '/purchasing/orders', permission: 'PURCHASE_ORDERS_VIEW' },
            { name: 'Hóa Đơn Mua', href: '/purchasing/bills', permission: 'PURCHASE_BILLS_VIEW' },
            { name: 'Thanh Toán', href: '/purchasing/payments', permission: 'PURCHASE_PAYMENTS_VIEW' },
            { name: 'Báo Cáo Mua Hàng', href: '/purchasing/reports', permission: 'PURCHASE_BILLS_VIEW' }
        ]
    },
    {
        name: 'Bán Hàng',
        icon: ShoppingCart,
        children: [
            { name: 'Báo Giá (ERP)', href: '/sales/estimates', permission: 'SALES_ESTIMATES_VIEW' },
            { name: 'Đơn Đặt Hàng', href: '/sales/orders', permission: 'SALES_ORDERS_VIEW' },
            { name: 'Hóa Đơn / Xuất Kho', href: '/sales/invoices', permission: 'SALES_INVOICES_VIEW' },
            { name: 'Thu Tiền / Công Nợ', href: '/sales/payments', permission: 'SALES_PAYMENTS_VIEW' },
            { name: 'Chi Phí', href: '/sales/expenses', permission: 'SALES_EXPENSES_VIEW' },
            { name: 'Báo Cáo Doanh Thu', href: '/sales/reports', permission: 'SALES_INVOICES_VIEW' }
        ]
    },
    { name: 'Khách Hàng', href: '/customers', icon: Users, permission: 'CUSTOMERS_VIEW' },
];

export function Sidebar({ brandName = 'ContractMgr', logoUrl, isOpen = false, onClose }: { brandName?: string, logoUrl?: string | null, isOpen?: boolean, onClose?: () => void }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [templatesOpen, setTemplatesOpen] = useState(false);
    const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

    const toggleSubMenu = (name: string) => setOpenSubMenus(prev => ({ ...prev, [name]: !prev[name] }));

    const userPermissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    return (
        <aside className={`sidebar-container ${isOpen ? 'open' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-main)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'contain' }} />
                    ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary) 0%, #818cf8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, boxShadow: '0 2px 4px rgba(79,70,229,0.3)' }}>
                            <FileText size={18} strokeWidth={2.5} />
                        </div>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brandName}</span>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="show-on-mobile"
                        style={{ padding: '0.5rem', borderRadius: 'var(--radius)', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        aria-label="Close menu"
                    >
                        <ChevronRight size={20} className="rotate-180" />
                    </button>
                )}
            </div>
            <nav style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
                {mainNavItems.map((item) => {
                    if (!isAdmin && item.permission && !userPermissions.includes(item.permission)) return null;

                    let visibleChildren = item.children;
                    if (item.children && !isAdmin) {
                        visibleChildren = item.children.filter((child: any) => !child.permission || userPermissions.includes(child.permission));
                        if (visibleChildren.length === 0) return null;
                    }

                    if (visibleChildren) {
                        const isChildActive = visibleChildren.some((child: any) => {
                            if (child.children) return child.children.some((gChild: any) => pathname?.startsWith(gChild.href) || pathname === gChild.href);
                            return pathname?.startsWith(child.href) || pathname === child.href;
                        });
                        const isOpen = openSubMenus[item.name] !== undefined ? openSubMenus[item.name] : isChildActive;

                        return (
                            <div key={item.name} style={{ display: 'flex', flexDirection: 'column' }}>
                                <button
                                    onClick={() => toggleSubMenu(item.name)}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
                                        backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                                        color: isChildActive ? 'var(--primary)' : 'var(--text-main)',
                                        fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s', outline: 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {item.icon && <item.icon size={20} />}
                                        {item.name}
                                    </div>
                                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                </button>
                                {isOpen && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginLeft: '1.25rem', marginTop: '0.25rem', borderLeft: '2px solid var(--border)', paddingLeft: '0.75rem' }}>
                                        {visibleChildren.map((child: any) => {
                                            if (child.children) {
                                                const isGrandChildActive = child.children.some((gChild: any) => pathname?.startsWith(gChild.href) || pathname === gChild.href);
                                                const isChildOpen = openSubMenus[child.name] !== undefined ? openSubMenus[child.name] : isGrandChildActive;
                                                return (
                                                    <div key={child.name} style={{ display: 'flex', flexDirection: 'column', marginTop: '0.25rem' }}>
                                                        <button
                                                            onClick={() => toggleSubMenu(child.name)}
                                                            style={{
                                                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)',
                                                                backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                                                                color: isGrandChildActive ? 'var(--primary)' : 'var(--text-main)',
                                                                fontWeight: 500, transition: 'all 0.2s', outline: 'none', fontSize: '0.875rem'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                {child.icon ? <child.icon size={18} /> : <FileCode size={18} />}
                                                                {child.name}
                                                            </div>
                                                            {isChildOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                        </button>
                                                        {isChildOpen && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginLeft: '1.25rem', marginTop: '0.15rem', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' }}>
                                                                {child.children.map((gChild: any) => {
                                                                    const isActive = pathname?.startsWith(gChild.href) || pathname === gChild.href;
                                                                    return (
                                                                        <Link
                                                                            key={gChild.name}
                                                                            href={gChild.href}
                                                                            onClick={() => {
                                                                                if (onClose && window.innerWidth < 768) {
                                                                                    onClose();
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                padding: '0.4rem 0.75rem', borderRadius: 'var(--radius)',
                                                                                backgroundColor: isActive ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                                                                                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                                                                fontSize: '0.875rem', fontWeight: isActive ? 600 : 400, textDecoration: 'none',
                                                                                transition: 'all 0.2s', display: 'block'
                                                                            }}
                                                                        >
                                                                            {gChild.name}
                                                                        </Link>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            }

                                            const isChildMenuActive = pathname?.startsWith(child.href) || pathname === child.href;
                                            return (
                                                <Link
                                                    key={child.name}
                                                    href={child.href}
                                                    onClick={() => {
                                                        if (onClose && window.innerWidth < 768) {
                                                            onClose();
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)',
                                                        backgroundColor: isChildMenuActive ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                                                        color: isChildMenuActive ? 'var(--primary)' : 'var(--text-muted)',
                                                        fontSize: '0.875rem', fontWeight: isChildMenuActive ? 600 : 500, textDecoration: 'none',
                                                        transition: 'all 0.2s', display: 'block'
                                                    }}
                                                >
                                                    {child.name}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => {
                                if (onClose && window.innerWidth < 768) {
                                    onClose();
                                }
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
                                backgroundColor: isActive ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                                color: isActive ? 'var(--primary)' : 'var(--text-main)',
                                fontSize: '0.875rem', fontWeight: isActive ? 600 : 500, transition: 'all 0.2s ease', textDecoration: 'none'
                            }}
                        >
                            <item.icon size={20} />
                            {item.name}
                        </Link>
                    )
                })}



                {(isAdmin || userPermissions.includes('USERS_VIEW')) && (
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <Link
                            href="/users"
                            onClick={() => {
                                if (onClose && window.innerWidth < 768) {
                                    onClose();
                                }
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
                                backgroundColor: pathname === '/users' ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                                color: pathname === '/users' ? 'var(--primary)' : 'var(--text-main)',
                                fontSize: '0.875rem', fontWeight: pathname === '/users' ? 600 : 500, transition: 'all 0.2s', textDecoration: 'none'
                            }}
                        >
                            <Users size={20} />
                            Quản lý Người dùng
                        </Link>
                        {isAdmin && (
                            <Link
                                href="/users/roles"
                                onClick={() => {
                                    if (onClose && window.innerWidth < 768) {
                                        onClose();
                                    }
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
                                    backgroundColor: pathname === '/users/roles' ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                                    color: pathname === '/users/roles' ? 'var(--primary)' : 'var(--text-main)',
                                    fontSize: '0.875rem', fontWeight: pathname === '/users/roles' ? 600 : 500, transition: 'all 0.2s', textDecoration: 'none'
                                }}
                            >
                                <CheckSquare size={20} />
                                Nhóm Quyền
                            </Link>
                        )}
                        {isAdmin && (
                            <Link
                                href="/settings"
                                onClick={() => {
                                    if (onClose && window.innerWidth < 768) {
                                        onClose();
                                    }
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
                                    backgroundColor: pathname?.startsWith('/settings') ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                                    color: pathname?.startsWith('/settings') ? 'var(--primary)' : 'var(--text-main)',
                                    fontSize: '0.875rem', fontWeight: pathname?.startsWith('/settings') ? 600 : 500, transition: 'all 0.2s', textDecoration: 'none'
                                }}
                            >
                                <Settings size={20} />
                                Cài đặt
                            </Link>
                        )}
                    </div>
                )}
            </nav>
        </aside >
    );
}
