'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LayoutDashboard, Users, FileText, Settings, FileSpreadsheet, FileCode, ChevronDown, ChevronRight, FileOutput, FilePlus2, FileStack, Mail, CheckSquare, Package, ShoppingCart, Target, GripVertical, Clock, BookOpen } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { updateSidebarOrder } from './actions';

// Define the interface for Online User data
interface OnlineUser {
    id: string;
    name: string;
    avatar?: string;
    lastActive: string;
    os?: string;
}

const hasPermission = (permissions: string[], requiredPerm: string) => {
    if (permissions.includes(requiredPerm)) return true;
    if (requiredPerm.endsWith('_VIEW')) {
        const base = requiredPerm.replace('_VIEW', '');
        return permissions.includes(`${base}_VIEW_ALL`) || permissions.includes(`${base}_VIEW_OWN`);
    }
    return false;
};

const mainNavItems: any[] = [
    { name: 'Bảng Điều Khiển', href: '/dashboard', icon: LayoutDashboard, permission: 'VIEW_DASHBOARD' },
    { name: 'Dự Án (Projects)', href: '/projects', icon: Target, permission: 'TASKS_VIEW' },
    { name: 'Công Việc & Giao Việc', href: '/tasks', icon: CheckSquare, permission: 'TASKS_VIEW' },
    { name: 'Thư Viện & Đào Tạo', href: '/library', icon: BookOpen, permission: 'TASKS_VIEW' },
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
            { name: 'Cơ Hội Bán Hàng', href: '/sales/leads', permission: 'SALES_ESTIMATES_VIEW' }, // FIXME later with proper permission
            { name: 'Báo Giá (ERP)', href: '/sales/estimates', permission: 'SALES_ESTIMATES_VIEW' },
            { name: 'Đơn Đặt Hàng', href: '/sales/orders', permission: 'SALES_ORDERS_VIEW' },
            { name: 'Hóa Đơn / Xuất Kho', href: '/sales/invoices', permission: 'SALES_INVOICES_VIEW' },
            { name: 'Thu Tiền / Công Nợ', href: '/sales/payments', permission: 'SALES_PAYMENTS_VIEW' },
            { name: 'Chi Phí', href: '/sales/expenses', permission: 'SALES_EXPENSES_VIEW' },
            { name: 'Báo Cáo Doanh Thu', href: '/sales/reports', permission: 'SALES_INVOICES_VIEW' }
        ]
    },
    { name: 'Khách Hàng', href: '/customers', icon: Users, permission: 'CUSTOMERS_VIEW' },
    {
        name: 'Nhân Sự (HR)',
        icon: Clock,
        children: [
            { name: 'Công Của Tôi', href: '/my-attendance' },
            { name: 'Đơn Nghỉ Phép', href: '/leave-requests' },
            { name: 'Bảng Công', href: '/hr/attendance', permission: 'SETTINGS_VIEW' }, // using SETTINGS_VIEW for admin/hr bypass for now
            { name: 'Duyệt Đơn', href: '/hr/approvals', permission: 'SETTINGS_VIEW' },
            { name: 'Giám Sát (Ping)', href: '/hr/monitoring', permission: 'SETTINGS_VIEW' }
        ]
    },
    {
        name: 'Thiết Lập',
        icon: Settings,
        children: [
            { name: 'Quản lý Người dùng', href: '/users', permission: 'USERS_VIEW', icon: Users },
            { name: 'Nhóm Quyền', href: '/users/roles', permission: 'ROLES_VIEW', icon: CheckSquare },
            { name: 'Cấu hình Email', href: '/email-config', permission: 'SETTINGS_VIEW', icon: Mail },
            { name: 'Mẫu Email', href: '/email-templates', permission: 'SETTINGS_VIEW', icon: FileText },
            { name: 'Cấu hình Lead', href: '/settings/lead-forms', permission: 'SETTINGS_VIEW', icon: Target },
            { name: 'Cài đặt chung', href: '/settings', permission: 'SETTINGS_VIEW', icon: Settings }
        ]
    }
];

function SortableItem({ item, isAdmin, userPermissions, pathname, openSubMenus, toggleSubMenu, onClose }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.name });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        position: 'relative' as any,
        zIndex: isDragging ? 99 : 1,
    };

    if (!isAdmin && item.permission && !hasPermission(userPermissions, item.permission)) return null;

    let visibleChildren = item.children;
    if (item.children && !isAdmin) {
        visibleChildren = item.children.filter((child: any) => !child.permission || hasPermission(userPermissions, child.permission));
        if (visibleChildren.length === 0) return null;
    }

    if (visibleChildren) {
        const isChildActive = visibleChildren.some((child: any) => {
            if (child.children) return child.children.some((gChild: any) => pathname?.startsWith(gChild.href) || pathname === gChild.href);
            return pathname?.startsWith(child.href) || pathname === child.href;
        });
        const isOpen = openSubMenus[item.name] !== undefined ? openSubMenus[item.name] : isChildActive;

        return (
            <div ref={setNodeRef} style={{ ...style, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: '0.5rem 0.25rem', color: 'var(--text-muted)' }}>
                        <GripVertical size={16} />
                    </div>
                    <button
                        onClick={() => toggleSubMenu(item.name)}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.75rem 1rem 0.75rem 0.25rem', borderRadius: 'var(--radius)',
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
                </div>
                {isOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginLeft: '2.25rem', marginTop: '0.25rem', borderLeft: '2px solid var(--border)', paddingLeft: '0.75rem' }}>
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
                                                            onClick={() => { if (onClose && window.innerWidth < 768) onClose(); }}
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
                                    onClick={() => { if (onClose && window.innerWidth < 768) onClose(); }}
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
        <div ref={setNodeRef} style={{ ...style, display: 'flex', alignItems: 'center', width: '100%' }}>
            <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: '0.5rem 0.25rem', color: 'var(--text-muted)' }}>
                <GripVertical size={16} />
            </div>
            <Link
                href={item.href}
                onClick={() => { if (onClose && window.innerWidth < 768) onClose(); }}
                style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem 0.75rem 0.25rem', borderRadius: 'var(--radius)',
                    backgroundColor: isActive ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-main)',
                    fontSize: '0.875rem', fontWeight: isActive ? 600 : 500, transition: 'all 0.2s ease', textDecoration: 'none'
                }}
            >
                <item.icon size={20} />
                {item.name}
            </Link>
        </div>
    );
}


export function Sidebar({ brandName = 'ContractMgr', logoUrl, isOpen = false, onClose, initialSidebarOrder = [] }: { brandName?: string, logoUrl?: string | null, isOpen?: boolean, onClose?: () => void, initialSidebarOrder?: string[] }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

    const [navItems, setNavItems] = useState(mainNavItems);
    const [isClient, setIsClient] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

    useEffect(() => {
        setIsClient(true);
        if (initialSidebarOrder && initialSidebarOrder.length > 0) {
            try {
                const ordered: any[] = [];
                initialSidebarOrder.forEach((name: string) => {
                    const found = mainNavItems.find(i => i.name === name);
                    if (found) ordered.push(found);
                });
                mainNavItems.forEach(i => {
                    if (!ordered.find(o => o.name === i.name)) ordered.push(i);
                });
                setNavItems(ordered);
            } catch (e) {
                console.error(e);
            }
        }
    }, [initialSidebarOrder]);

    // Effect for handling Heartbeat Ping and Fetching Online Users
    useEffect(() => {
        if (!session?.user?.id) return;

        let isMounted = true;

        const performHeartbeatAndFetch = async () => {
            try {
                // 1. Ping heartbeat
                await fetch('/api/users/heartbeat', { method: 'POST' });

                // 2. Fetch online users list
                if (isMounted) {
                    const res = await fetch('/api/users/online');
                    if (res.ok) {
                        const data = await res.json();
                        setOnlineUsers(data.users || []);
                    }
                }
            } catch (error) {
                console.error("Error in heartbeat/online fetch:", error);
            }
        };

        // Run immediately
        performHeartbeatAndFetch();

        // Then run every 60 seconds
        const interval = setInterval(performHeartbeatAndFetch, 60000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [session?.user?.id]);

    const toggleSubMenu = (name: string) => setOpenSubMenus(prev => ({ ...prev, [name]: !prev[name] }));

    const userPermissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleDragEnd(event: any) {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setNavItems((items) => {
                const oldIndex = items.findIndex((i) => i.name === active.id);
                const newIndex = items.findIndex((i) => i.name === over.id);
                const newArr = arrayMove(items, oldIndex, newIndex);
                updateSidebarOrder(newArr.map(i => i.name));
                return newArr;
            });
        }
    }

    return (
        <aside className={`sidebar-container ${isOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {logoUrl ? (
                        <div className="sidebar-logo-container" style={{ width: '38px', height: '38px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
                            <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                    ) : (
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <FileText size={20} strokeWidth={2.5} />
                        </div>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-main)', lineHeight: '1', paddingTop: '2px', textTransform: 'uppercase' }}>
                        {brandName}
                    </span>
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
                {isClient && (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={navItems.map(i => i.name)} strategy={verticalListSortingStrategy}>
                            {navItems.map((item) => (
                                <SortableItem
                                    key={item.name}
                                    item={item}
                                    isAdmin={isAdmin}
                                    userPermissions={userPermissions}
                                    pathname={pathname}
                                    openSubMenus={openSubMenus}
                                    toggleSubMenu={toggleSubMenu}
                                    onClose={onClose}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </nav>

            {/* Online Users Widget */}
            {isClient && onlineUsers.length > 0 && (
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Đang Online ({onlineUsers.length})
                        </span>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }`}</style>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {onlineUsers.slice(0, 5).map(u => (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} title={u.os ? `OS: ${u.os}` : ''}>
                                <div style={{ position: 'relative' }}>
                                    {u.avatar ? (
                                        <img src={u.avatar} alt={u.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Users size={14} color="var(--text-muted)" />
                                        </div>
                                    )}
                                    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e', border: '2px solid white' }}></div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {u.name}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                        {u.id === session?.user?.id ? 'Bạn' : (u.os || 'Đang hoạt động')}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {onlineUsers.length > 5 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>
                                +{onlineUsers.length - 5} người khác
                            </div>
                        )}
                    </div>
                </div>
            )}
        </aside>
    );
}
