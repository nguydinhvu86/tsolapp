'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LayoutDashboard, Users, FileText, Settings, FileSpreadsheet, FileCode, ChevronDown, ChevronRight, FileOutput, FilePlus2, FileStack, Mail, CheckSquare, Package } from 'lucide-react';
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
            { name: 'Sản Phẩm & Dịch Vụ', href: '/inventory/products', permission: 'INVENTORY_VIEW' },
            { name: 'Danh Sách Kho', href: '/inventory/warehouses', permission: 'INVENTORY_VIEW' },
            { name: 'Lịch Sử Lệnh Kho', href: '/inventory/transactions', permission: 'INVENTORY_VIEW' },
            { name: 'Kiểm Kê Kho', href: '/inventory/adjustments', permission: 'INVENTORY_VIEW' },
            { name: 'Báo Cáo Tồn Kho', href: '/inventory/reports', permission: 'INVENTORY_VIEW' }
        ]
    },
    { name: 'Khách Hàng', href: '/customers', icon: Users, permission: 'CUSTOMERS_VIEW' },
];

export function Sidebar({ brandName = 'ContractMgr' }: { brandName?: string }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [templatesOpen, setTemplatesOpen] = useState(false);
    const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

    const toggleSubMenu = (name: string) => setOpenSubMenus(prev => ({ ...prev, [name]: !prev[name] }));

    const userPermissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    return (
        <aside style={{
            width: '260px',
            backgroundColor: 'var(--background)',
            borderRight: '1px solid var(--border)',
            height: '100vh',
            position: 'fixed',
            top: 0, left: 0,
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary) 0%, #818cf8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 2px 4px rgba(79,70,229,0.3)' }}>
                    <FileText size={18} strokeWidth={2.5} />
                </div>
                {brandName}
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
                                        fontWeight: 500, transition: 'all 0.2s', outline: 'none'
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
                                                                fontWeight: 500, transition: 'all 0.2s', outline: 'none', fontSize: '0.9rem'
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
                                                                        <Link key={gChild.name} href={gChild.href} style={{
                                                                            padding: '0.4rem 0.75rem', borderRadius: 'var(--radius)',
                                                                            backgroundColor: isActive ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                                                                            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                                                            fontSize: '0.85rem', fontWeight: isActive ? 600 : 400, textDecoration: 'none',
                                                                            transition: 'all 0.2s', display: 'block'
                                                                        }}>
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
                                                <Link key={child.name} href={child.href} style={{
                                                    padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)',
                                                    backgroundColor: isChildMenuActive ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                                                    color: isChildMenuActive ? 'var(--primary)' : 'var(--text-muted)',
                                                    fontSize: '0.875rem', fontWeight: isChildMenuActive ? 600 : 500, textDecoration: 'none',
                                                    transition: 'all 0.2s', display: 'block'
                                                }}>
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
                        <Link key={item.name} href={item.href} style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
                            backgroundColor: isActive ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                            color: isActive ? 'var(--primary)' : 'var(--text-main)',
                            fontWeight: isActive ? 600 : 500, transition: 'all 0.2s ease', textDecoration: 'none'
                        }}>
                            <item.icon size={20} />
                            {item.name}
                        </Link>
                    )
                })}



                {(isAdmin || userPermissions.includes('USERS_VIEW')) && (
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <Link href="/users" style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
                            backgroundColor: pathname?.startsWith('/users') ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                            color: pathname?.startsWith('/users') ? 'var(--primary)' : 'var(--text-main)',
                            fontWeight: pathname?.startsWith('/users') ? 600 : 500, transition: 'all 0.2s', textDecoration: 'none'
                        }}>
                            <Users size={20} />
                            Quản lý Người dùng
                        </Link>
                        {isAdmin && (
                            <Link href="/settings" style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
                                backgroundColor: pathname?.startsWith('/settings') ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                                color: pathname?.startsWith('/settings') ? 'var(--primary)' : 'var(--text-main)',
                                fontWeight: pathname?.startsWith('/settings') ? 600 : 500, transition: 'all 0.2s', textDecoration: 'none'
                            }}>
                                <Settings size={20} />
                                Cài đặt
                            </Link>
                        )}
                    </div>
                )}
            </nav>
        </aside>
    );
}
