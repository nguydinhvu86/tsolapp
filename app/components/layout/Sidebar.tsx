'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LayoutDashboard, Users, FileText, Settings, FileSpreadsheet, FileCode, ChevronDown, ChevronRight, FileOutput, FilePlus2, FileStack, Mail, CheckSquare, Package, ShoppingCart, Target, GripVertical, Clock, BookOpen, Phone, Calculator } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { updateSidebarOrder } from './actions';
import { useTranslation } from '../../i18n/LanguageContext';
import { AvatarImage } from '../ui/AvatarImage';

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
    { name: 'Bảng Điều Khiển', nameKey: 'sidebar.dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'VIEW_DASHBOARD' },
    { name: 'Dự Án (Projects)', nameKey: 'sidebar.projects', href: '/projects', icon: Target, permission: 'TASKS_VIEW' },
    { name: 'Công Việc & Giao Việc', nameKey: 'sidebar.tasks', href: '/tasks', icon: CheckSquare, permission: 'TASKS_VIEW' },
    { name: 'Thư Viện & Đào Tạo', nameKey: 'sidebar.library', href: '/library', icon: BookOpen, permission: 'TASKS_VIEW' },
    {
        name: 'Quản Lý Văn Thư', nameKey: 'sidebar.documents',
        icon: FileStack,
        children: [
            { name: 'Quản lý Hợp Đồng', nameKey: 'sidebar.contracts', href: '/contracts', permission: 'CONTRACTS_VIEW' },
            { name: 'Phụ Lục Hợp Đồng', nameKey: 'sidebar.appendix', href: '/contract-appendices', permission: 'CONTRACTS_VIEW' },
            { name: 'Công Văn & Thông Báo', nameKey: 'sidebar.dispatches', href: '/dispatches', permission: 'DISPATCHES_VIEW' },
            { name: 'Quản lý Báo Giá', nameKey: 'sidebar.quotes', href: '/quotes', permission: 'QUOTES_VIEW' },
            { name: 'Biên Bản Bàn Giao', nameKey: 'sidebar.handovers', href: '/handovers', permission: 'HANDOVERS_VIEW' },
            { name: 'Đề Nghị Thanh Toán', nameKey: 'sidebar.payments', href: '/payment-requests', permission: 'PAYMENTS_VIEW' },
            {
                name: 'Quản Lý Biểu Mẫu', nameKey: 'sidebar.templates',
                icon: FileCode,
                permission: 'TEMPLATES_VIEW',
                children: [
                    { name: 'Mẫu Hợp Đồng', nameKey: 'sidebar.tpl_contracts', href: '/templates' },
                    { name: 'Mẫu Phụ Lục HĐ', nameKey: 'sidebar.tpl_appendix', href: '/appendix-templates' },
                    { name: 'Mẫu Báo Giá', nameKey: 'sidebar.tpl_quotes', href: '/quote-templates' },
                    { name: 'Mẫu Biên Bản', nameKey: 'sidebar.tpl_handovers', href: '/handover-templates' },
                    { name: 'Mẫu Đề Nghị', nameKey: 'sidebar.tpl_payments', href: '/payment-request-templates' },
                    { name: 'Mẫu Công Văn', nameKey: 'sidebar.tpl_dispatches', href: '/dispatch-templates' }
                ]
            }
        ]
    },
    {
        name: 'Quản Lý Kho', nameKey: 'sidebar.inventory',
        icon: Package,
        children: [
            { name: 'Sản Phẩm & Dịch Vụ', nameKey: 'sidebar.products', href: '/inventory/products', permission: 'PRODUCTS_VIEW' },
            { name: 'Danh Sách Kho', nameKey: 'sidebar.warehouses', href: '/inventory/warehouses', permission: 'WAREHOUSES_VIEW' },
            { name: 'Lịch Sử Lệnh Kho', nameKey: 'sidebar.inventory_tx', href: '/inventory/transactions', permission: 'INVENTORY_TX_VIEW' },
            { name: 'Kiểm Kê Kho', nameKey: 'sidebar.inventory_adj', href: '/inventory/adjustments', permission: 'INVENTORY_TX_VIEW' },
            { name: 'Báo Cáo Tồn Kho', nameKey: 'sidebar.inventory_reports', href: '/inventory/reports', permission: 'INVENTORY_TX_VIEW' }
        ]
    },
    {
        name: 'Mua Hàng', nameKey: 'sidebar.purchasing',
        icon: ShoppingCart,
        children: [
            { name: 'Nhà Cung Cấp', nameKey: 'sidebar.suppliers', href: '/suppliers', permission: 'SUPPLIERS_VIEW' },
            { name: 'Đơn Đặt Hàng', nameKey: 'sidebar.po', href: '/purchasing/orders', permission: 'PURCHASE_ORDERS_VIEW' },
            { name: 'Hóa Đơn Mua', nameKey: 'sidebar.pb', href: '/purchasing/bills', permission: 'PURCHASE_BILLS_VIEW' },
            { name: 'Thanh Toán', nameKey: 'sidebar.pp', href: '/purchasing/payments', permission: 'PURCHASE_PAYMENTS_VIEW' },
            { name: 'Báo Cáo Mua Hàng', nameKey: 'sidebar.purchasing_reports', href: '/purchasing/reports', permission: 'PURCHASE_BILLS_VIEW' }
        ]
    },
    {
        name: 'Bán Hàng', nameKey: 'sidebar.sales',
        icon: ShoppingCart,
        children: [
            { name: 'Cơ Hội Bán Hàng', nameKey: 'sidebar.leads', href: '/sales/leads', permission: 'SALES_ESTIMATES_VIEW' }, // FIXME later with proper permission
            { name: 'Báo Giá (ERP)', nameKey: 'sidebar.estimates', href: '/sales/estimates', permission: 'SALES_ESTIMATES_VIEW' },
            { name: 'Đơn Đặt Hàng', nameKey: 'sidebar.so', href: '/sales/orders', permission: 'SALES_ORDERS_VIEW' },
            { name: 'Hóa Đơn / Xuất Kho', nameKey: 'sidebar.si', href: '/sales/invoices', permission: 'SALES_INVOICES_VIEW' },
            { name: 'Thu Tiền / Công Nợ', nameKey: 'sidebar.sp', href: '/sales/payments', permission: 'SALES_PAYMENTS_VIEW' },
            { name: 'Chi Phí', nameKey: 'sidebar.expenses', href: '/sales/expenses', permission: 'SALES_EXPENSES_VIEW' },
            { name: 'Báo Cáo Doanh Thu', nameKey: 'sidebar.sales_reports', href: '/sales/reports', permission: 'SALES_INVOICES_VIEW' }
        ]
    },
    {
        name: 'Kế Toán', nameKey: 'sidebar.accounting',
        icon: Calculator,
        children: [
            { name: 'Hóa Đơn ĐT', nameKey: 'sidebar.accounting_invoices', href: '/accounting/invoices', permission: 'ACCOUNTING_VIEW' },
            { name: 'Cài Đặt Tự Động', nameKey: 'sidebar.accounting_settings', href: '/accounting/settings', permission: 'ACCOUNTING_VIEW' }
        ]
    },
    { name: 'Khách Hàng', nameKey: 'sidebar.customers', href: '/customers', icon: Users, permission: 'CUSTOMERS_VIEW' },
    {
        name: 'Nhân Sự (HR)', nameKey: 'sidebar.hr',
        icon: Clock,
        children: [
            { name: 'Công Của Tôi', nameKey: 'sidebar.my_attendance', href: '/my-attendance' },
            { name: 'Đơn Nghỉ Phép', nameKey: 'sidebar.leave_requests', href: '/leave-requests' },
            { name: 'Bảng Công', nameKey: 'sidebar.attendance', href: '/hr/attendance', permission: 'ATTENDANCE_VIEW' }, 
            { name: 'Duyệt Đơn', nameKey: 'sidebar.approvals', href: '/hr/approvals', permission: 'ATTENDANCE_VIEW' },
            { name: 'Hồ sơ Nhân sự', nameKey: 'sidebar.employees', href: '/hr/employees', permission: 'EMPLOYEES_VIEW' },
            { name: 'Tính Lương', nameKey: 'sidebar.payroll', href: '/hr/payroll', permission: 'PAYROLL_VIEW' },
            { name: 'Yêu Cầu Tuyển Dụng', nameKey: 'sidebar.recruitment_req', href: '/hr/recruitment/requisitions', permission: 'RECRUITMENT_VIEW' },
            { name: 'Tin Đăng Tuyển (Jobs)', nameKey: 'sidebar.recruitment_postings', href: '/hr/recruitment/postings', permission: 'RECRUITMENT_VIEW' },
            { name: 'Bảng Tuyển Dụng (Pipeline)', nameKey: 'sidebar.recruitment_pipeline', href: '/hr/recruitment/pipeline', permission: 'RECRUITMENT_VIEW' },
            { name: 'Giám Sát (Ping)', nameKey: 'sidebar.monitoring', href: '/hr/monitoring', permission: 'MONITORING_VIEW' }
        ]
    },
    { name: 'Tổng Đài', nameKey: 'sidebar.callcenter', href: '/call-center', icon: Phone, permission: 'CALL_CENTER_VIEW' },
    {
        name: 'Thiết Lập', nameKey: 'sidebar.settings',
        icon: Settings,
        children: [
            { name: 'Quản lý Người dùng', nameKey: 'sidebar.users', href: '/users', permission: 'USERS_VIEW', icon: Users },
            { name: 'Nhóm Quyền', nameKey: 'sidebar.roles', href: '/users/roles', permission: 'ROLES_VIEW', icon: CheckSquare },
            { name: 'Cấu hình Email', nameKey: 'sidebar.email_config', href: '/email-config', permission: 'SETTINGS_VIEW', icon: Mail },
            { name: 'Mẫu Email', nameKey: 'sidebar.email_templates', href: '/email-templates', permission: 'SETTINGS_VIEW', icon: FileText },
            { name: 'Cấu hình Lead', nameKey: 'sidebar.lead_settings', href: '/settings/lead-forms', permission: 'SETTINGS_VIEW', icon: Target },
            { name: 'Cài đặt chung', nameKey: 'sidebar.general_settings', href: '/settings', permission: 'SETTINGS_VIEW', icon: Settings }
        ]
    }
];

function SortableItem({ item, isAdmin, userPermissions, pathname, openSubMenus, toggleSubMenu, onClose, t }: any) {
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
                            color: isChildActive ? 'white' : '#94a3b8',
                            fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s', outline: 'none'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {item.icon && <item.icon size={20} />}
                            {t(item.nameKey) !== item.nameKey ? t(item.nameKey) : item.name}
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
                                                color: isGrandChildActive ? 'white' : '#94a3b8',
                                                fontWeight: 500, transition: 'all 0.2s', outline: 'none', fontSize: '0.875rem'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {child.icon ? <child.icon size={18} /> : <FileCode size={18} />}
                                                {t(child.nameKey) !== child.nameKey ? t(child.nameKey) : child.name}
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
                                                                backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                                                                color: isActive ? 'white' : '#94a3b8',
                                                                fontSize: '0.875rem', fontWeight: isActive ? 600 : 400, textDecoration: 'none',
                                                                transition: 'all 0.2s', display: 'block'
                                                            }}
                                                        >
                                                            {t(gChild.nameKey) !== gChild.nameKey ? t(gChild.nameKey) : gChild.name}
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
                                        backgroundColor: isChildMenuActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                                        color: isChildMenuActive ? 'white' : '#94a3b8',
                                        fontSize: '0.875rem', fontWeight: isChildMenuActive ? 600 : 500, textDecoration: 'none',
                                        transition: 'all 0.2s', display: 'block'
                                    }}
                                >
                                    {t(child.nameKey) !== child.nameKey ? t(child.nameKey) : child.name}
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
                    backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: isActive ? 'white' : '#94a3b8',
                    fontSize: '0.875rem', fontWeight: isActive ? 600 : 500, transition: 'all 0.2s ease', textDecoration: 'none'
                }}
            >
                <item.icon size={20} />
                {t(item.nameKey) !== item.nameKey ? t(item.nameKey) : item.name}
            </Link>
        </div>
    );
}


export function Sidebar({ brandName = 'ContractMgr', logoUrl, isOpen = false, onClose, initialSidebarOrder = [] }: { brandName?: string, logoUrl?: string | null, isOpen?: boolean, onClose?: () => void, initialSidebarOrder?: string[] }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { t } = useTranslation();
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
        <aside className={`sidebar-container ${isOpen ? 'open' : ''} bg-slate-900 shadow-xl border-r border-slate-800 z-20`} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <>
                <style>{`
                    @keyframes sign-shine {
                        0% { left: -100%; top: 0; }
                        20% { left: 100%; top: 0; }
                        100% { left: 100%; top: 0; }
                    }
                    @keyframes pulse-dot {
                        0%, 100% { transform: scale(1); opacity: 0.8; }
                        50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 8px #10b981; }
                    }
                    .tech-signboard {
                        background: transparent;
                        border: 1px solid transparent;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        border-radius: 12px;
                    }
                    .tech-signboard:hover {
                        transform: translateY(-1px);
                        background: rgba(255,255,255,0.03);
                        border-color: rgba(255,255,255,0.05);
                    }
                    .dark .tech-signboard { }
                    .dark .tech-signboard:hover { }
                    .brand-gradient-text {
                        color: #ffffff;
                        text-shadow: 0 2px 10px rgba(255,255,255,0.15);
                    }
                    .dark .brand-gradient-text {
                        color: #ffffff;
                    }
                `}</style>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1rem', borderBottom: '1px solid var(--border)', gap: '10px' }}>

                    <div style={{ position: 'relative', flex: 1, minWidth: 0, cursor: 'pointer' }} className="group">
                        <div className="tech-signboard" style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 14px 10px 10px',
                            borderRadius: '14px',
                            position: 'relative',
                            overflow: 'hidden',
                            width: '100%'
                        }}>
                            {/* Shimmer overlay */}
                            <div style={{
                                position: 'absolute',
                                top: 0, bottom: 0, width: '40px',
                                background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)',
                                transform: 'skewX(-20deg)',
                                animation: 'sign-shine 4s ease-in-out infinite',
                                pointerEvents: 'none',
                                zIndex: 2
                            }} className="dark:opacity-10"></div>

                            {/* Logo */}
                            {logoUrl ? (
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '10px',
                                    overflow: 'hidden', flexShrink: 0, backgroundColor: '#fff',
                                    padding: '3px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(0,0,0,0.05)',
                                    border: '1px solid #f1f5f9',
                                    position: 'relative', zIndex: 1
                                }}>
                                    <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                            ) : (
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #05A613 0%, #048C10 100%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', flexShrink: 0,
                                    boxShadow: '0 4px 12px rgba(5, 166, 19, 0.4)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    position: 'relative', zIndex: 1
                                }}>
                                    <FileText size={22} strokeWidth={2.5} />
                                </div>
                            )}

                            {/* Text Information */}
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 1, overflow: 'hidden', flex: 1 }}>
                                <span className="brand-gradient-text" style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 900,
                                    letterSpacing: '-0.03em',
                                    lineHeight: '1.2',
                                    textTransform: 'uppercase',
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    display: 'block'
                                }}>
                                    {brandName}
                                </span>
                                <span style={{
                                    fontSize: '0.65rem',
                                    color: '#64748b',
                                    fontWeight: 800,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    lineHeight: '1',
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    marginTop: '2px'
                                }}>
                                    <span style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        background: '#05A613', display: 'inline-block',
                                        animation: 'pulse-dot 2s infinite',
                                        boxShadow: '0 0 8px rgba(5, 166, 19, 0.6)'
                                    }}></span>
                                    ENTERPRISE SYSTEM
                                </span>
                            </div>
                        </div>
                    </div>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="show-on-mobile flex-shrink-0"
                            style={{ padding: '0.5rem', borderRadius: 'var(--radius)', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
                            aria-label="Close menu"
                        >
                            <ChevronRight size={20} className="rotate-180" />
                        </button>
                    )}
                </div>
            </>
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
                                    t={t}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </nav>

            {/* Online Users Widget */}
            {
                isClient && onlineUsers.length > 0 && (
                    <div style={{ padding: '1rem', borderTop: '1px solid #334155', marginTop: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Đang Online ({onlineUsers.length})
                            </span>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                                <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }`}</style>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {onlineUsers.slice(0, 5).map(u => (
                                <div 
                                    key={u.id} 
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: u.id === session?.user?.id ? 'default' : 'pointer' }} 
                                    title={u.os ? `OS: ${u.os}` : ''}
                                    className={u.id === session?.user?.id ? "" : "hover:bg-slate-800 transition-colors rounded-lg p-1.5 -mx-1.5"}
                                    onClick={() => {
                                        if (u.id !== session?.user?.id) {
                                            window.dispatchEvent(new CustomEvent('open-chat', { detail: { userId: u.id } }));
                                        }
                                    }}
                                >
                                    <div style={{ position: 'relative' }}>
                                        <AvatarImage
                                            src={u.avatar?.startsWith('http') ? u.avatar : u.avatar ? `/${u.avatar.replace(/^\//, '')}` : null}
                                            name={u.name}
                                            size={28}
                                        />
                                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e', border: '2px solid white' }}></div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {u.name}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                            {u.id === session?.user?.id ? 'Bạn' : (u.os || 'Đang hoạt động')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {onlineUsers.length > 5 && (
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.25rem' }}>
                                    +{onlineUsers.length - 5} người khác
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </aside >
    );
}
