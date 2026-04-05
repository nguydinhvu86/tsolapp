'use client'
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { ArrowLeft, User, Users, Mail, Phone, MapPin, Building2, FileSpreadsheet, FileText, FileOutput, FilePlus2, Eye, Edit, FileStack, Plus, ShoppingCart, SearchCode, Ticket, HandCoins, Search, Target, UserCheck, Link as LinkIcon, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import { TagDisplay } from '@/app/components/ui/TagDisplay';
import { CustomerStatementPanel } from '@/app/components/customers/CustomerStatementPanel';
import { CustomerNotesPanel } from '@/app/components/customers/CustomerNotesPanel';
import { CustomerContactsPanel } from '@/app/components/customers/CustomerContactsPanel';
import { CustomerManagersPanel } from '@/app/components/customers/CustomerManagersPanel';
import { CustomerHistoryTimeline } from '@/app/components/customers/CustomerHistoryTimeline';
import { useSession } from 'next-auth/react';
import { SendEmailModal } from '@/app/components/ui/modals/SendEmailModal';
import { sendDebtConfirmationEmail, saveCustomerMenuOrder } from '../actions';
import { updateCustomerPassword } from './actions';
import { EmailLogTable } from '@/app/components/ui/EmailLogTable';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export function CustomerDetailClient({ customer, tasks, users, emailTemplates = [], savedMenuOrder = "[]" }: { customer: any, tasks: any[], users: any[], emailTemplates?: any[], savedMenuOrder?: string }) {
    const router = useRouter();
    const { data: session } = useSession();
    const currentUserRole = session?.user?.role || 'USER';
    const currentUserId = session?.user?.id || '';
    const [activeTab, setActiveTab] = useState<'documents' | 'statement' | 'quotes' | 'contracts' | 'handovers' | 'payments' | 'appendices' | 'dispatches' | 'salesEstimates' | 'salesOrders' | 'salesInvoices' | 'salesPayments' | 'leads' | 'emailLogs' | 'contacts' | 'managers'>('leads');
    const [searchQuery, setSearchQuery] = useState('');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const validEstimatesCount = customer.salesEstimates?.filter((e: any) => {
        if (['REJECTED', 'CANCELLED'].includes(e.status)) return false;
        if (!e.validUntil) return true;
        return new Date(e.validUntil) >= now;
    }).length || 0;

    const unpaidInvoicesCount = customer.salesInvoices?.filter((i: any) =>
        !['PAID', 'CANCELLED', 'DRAFT'].includes(i.status)
    ).length || 0;

    // Dynamically calculate exact debt ignoring CANCELLED and DRAFT invoices
    const validInvoices = customer.salesInvoices ? customer.salesInvoices.filter((i: any) => !['CANCELLED', 'DRAFT'].includes(i.status)) : [];

    const exactSales = validInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.totalAmount) || 0), 0);
    const exactPayments = validInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.paidAmount) || 0), 0);

    const computedDebt = exactSales - exactPayments;

    const tabs = [
        { id: 'contacts', name: 'Người Liên Hệ', count: customer.contacts?.length || 0, icon: Users },
        { id: 'leads', name: 'Cơ hội Bán hàng', count: customer.leads?.length || 0, icon: Target },
        { id: 'salesEstimates', name: 'Báo Giá (ERP)', count: validEstimatesCount, icon: SearchCode },
        { id: 'salesOrders', name: 'Đơn Đặt Hàng', count: customer.salesOrders?.length || 0, icon: ShoppingCart },
        { id: 'salesInvoices', name: 'HĐ Bán & Nợ', count: unpaidInvoicesCount, icon: Ticket },
        { id: 'salesPayments', name: 'Thu Tiền', count: customer.salesPayments?.length || 0, icon: HandCoins },
        { id: 'statement', name: 'Sao Kê Công Nợ', count: '-', icon: FileSpreadsheet },
        { id: 'documents', name: 'Tủ Hồ Sơ', count: customer.notes?.length || 0, icon: FileText },
        { id: 'quotes', name: 'Báo Giá', count: customer.quotes?.length || 0, icon: FileSpreadsheet },
        { id: 'contracts', name: 'Hợp Đồng', count: customer.contracts?.length || 0, icon: FileText },
        { id: 'appendices', name: 'Phụ Lục HĐ', count: customer.contracts.reduce((acc: number, c: any) => acc + (c.appendices?.length || 0), 0), icon: FileStack },
        { id: 'dispatches', name: 'Công Văn', count: customer.dispatches?.length || 0, icon: Mail },
        { id: 'handovers', name: 'Bàn Giao', count: customer.handovers.length, icon: FileOutput },
        { id: 'payments', name: 'Đề Nghị TT', count: customer.paymentRequests.length, icon: FilePlus2 },
        { id: 'managers', name: 'Người Phụ Trách', count: customer.managers?.length || 0, icon: UserCheck },
        { id: 'emailLogs', name: 'Lịch Sử Email', count: customer.emailLogs?.length || 0, icon: Mail },
    ];

    const [orderedTabs, setOrderedTabs] = useState<typeof tabs>(() => {
        try {
            const savedOrder = JSON.parse(savedMenuOrder);
            if (Array.isArray(savedOrder) && savedOrder.length > 0) {
                const ordered = [];
                const remaining = [...tabs];
                for (const id of savedOrder) {
                    const idx = remaining.findIndex(t => t.id === id);
                    if (idx !== -1) {
                        ordered.push(remaining[idx]);
                        remaining.splice(idx, 1);
                    }
                }
                return [...ordered, ...remaining];
            }
        } catch (e) {
            console.error("Failed to parse savedMenuOrder", e);
        }
        return tabs;
    });

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const newTabs = Array.from(orderedTabs);
        const [reorderedItem] = newTabs.splice(result.source.index, 1);
        newTabs.splice(result.destination.index, 0, reorderedItem);

        setOrderedTabs(newTabs);

        if (currentUserId) {
            const orderList = newTabs.map(t => t.id);
            await saveCustomerMenuOrder(currentUserId, JSON.stringify(orderList));
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return { bg: '#f1f5f9', color: '#64748b', text: 'Nháp' };
            case 'SENT': return { bg: '#dbeafe', color: '#3b82f6', text: 'Đã gửi' };
            case 'ACCEPTED': return { bg: '#dcfce7', color: '#16a34a', text: 'Đã duyệt' };
            case 'SIGNED': return { bg: '#dcfce7', color: '#16a34a', text: 'Đã ký' };
            case 'REJECTED': return { bg: '#fee2e2', color: '#ef4444', text: 'Từ chối' };
            case 'CANCELLED': return { bg: '#fee2e2', color: '#ef4444', text: 'Đã hủy' };
            default: return { bg: '#f1f5f9', color: '#64748b', text: status };
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header / Back Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <button onClick={() => router.push('/customers')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }}>
                    <ArrowLeft size={18} color="var(--text-main)" />
                </button>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
                        Chi tiết Khách hàng
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Quản lý thông tin và tài liệu liên kết.</p>
                </div>
            </div>

            {/* Customer Info Card */}
            <Card className="p-5 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
                    <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <User size={40} />
                    </div>
                    <div className="flex-1 w-full flex flex-col items-center sm:items-start text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6 w-full">
                            <h2 className="text-xl sm:text-2xl font-bold m-0 text-slate-800 break-words">{customer.name}</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full text-left">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0"><Mail size={16} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 text-xs font-semibold text-slate-500 uppercase">Email</p>
                                    <p className="m-0 text-[15px] font-medium break-words">{customer.email || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0"><Phone size={16} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 text-xs font-semibold text-slate-500 uppercase">Số Điện Thoại</p>
                                    <p className="m-0 text-[15px] font-medium break-words">{customer.phone || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0"><Building2 size={16} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 text-xs font-semibold text-slate-500 uppercase">Mã Số Thuế</p>
                                    <p className="m-0 text-[15px] font-medium break-words">{customer.taxCode || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0"><HandCoins size={16} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 text-xs font-semibold text-red-600 uppercase">Tổng Dư Nợ Hóa Đơn</p>
                                    <p className="m-0 text-[16px] font-bold text-red-600 break-words">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(computedDebt)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 lg:col-span-2">
                                <div className="mt-0.5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0"><MapPin size={16} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 text-xs font-semibold text-slate-500 uppercase">Địa Chỉ</p>
                                    <p className="m-0 text-[15px] font-medium break-words">{customer.address || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tách phần nút nhấn xuống dưới */}
                        <div className="flex gap-3 w-full sm:w-auto mt-8 pt-6 border-t border-slate-100">
                            <Button
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white border-none px-5 py-2.5 rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors shadow-sm font-semibold"
                                title="Cấp quyền đăng nhập Customer Portal"
                            >
                                <UserCheck size={16} /> Tài khoản Portal
                            </Button>
                            <Button
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigator.clipboard.writeText(window.location.origin + '/portal/login');
                                    alert('Đã copy link: ' + window.location.origin + '/portal/login');
                                }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white border-none px-5 py-2.5 rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors shadow-sm font-semibold"
                                title="Copy đường dẫn đăng nhập Portal"
                            >
                                <LinkIcon size={16} /> Link Portal
                            </Button>
                            <Button
                                onClick={() => setIsEmailModalOpen(true)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white border-none px-5 py-2.5 rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors shadow-sm font-semibold"
                            >
                                <Mail size={16} /> Gửi Email
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Navigation Menu (2 Horizontal Rows) */}
            <Card style={{ padding: '0.5rem', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }} className="custom-scrollbar">
                    {isMounted ? (
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="customer-menu" direction="horizontal">
                                {(provided) => (
                                    <div 
                                        {...provided.droppableProps} 
                                        ref={provided.innerRef}
                                        style={{ 
                                            display: 'grid', 
                                            gridTemplateRows: 'repeat(2, auto)', 
                                            gridAutoColumns: 'minmax(180px, 1fr)',
                                            gridAutoFlow: 'column', 
                                            gap: '0.5rem', 
                                            minWidth: 'max-content' 
                                        }}
                                    >
                                        {orderedTabs.map((tab, index) => {
                                                const isActive = activeTab === tab.id;
                                                const Icon = tab.icon;
                                                return (
                                                    <Draggable key={tab.id} draggableId={tab.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <button
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={(e) => {
                                                                    // Only trigger click if not dragging
                                                                    if (!snapshot.isDragging) {
                                                                        setActiveTab(tab.id as any);
                                                                    }
                                                                }}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                    padding: '0.625rem 0.875rem', border: '1px solid', 
                                                                    borderColor: isActive ? '#2563eb' : 'transparent',
                                                                    borderRadius: '8px',
                                                                    background: isActive ? '#eff6ff' : snapshot.isDragging ? '#f8fafc' : '#f8fafc',
                                                                    cursor: snapshot.isDragging ? 'grabbing' : 'pointer',
                                                                    color: isActive ? '#2563eb' : '#475569',
                                                                    fontWeight: isActive ? 600 : 500, fontSize: '0.85rem', transition: 'all 0.2s ease',
                                                                    outline: 'none', textAlign: 'left',
                                                                    width: '100%',
                                                                    whiteSpace: 'nowrap',
                                                                    boxShadow: snapshot.isDragging ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none',
                                                                    ...provided.draggableProps.style
                                                                }}
                                                                className={`hover:bg-slate-100 ${snapshot.isDragging ? 'ring-2 ring-blue-500 ring-inset z-50' : ''}`}
                                                            >
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                                                    <Icon size={16} style={{ color: isActive ? '#2563eb' : '#94a3b8' }} />
                                                                    {tab.name}
                                                                </span>
                                                                <span style={{
                                                                    background: isActive ? '#bfdbfe' : '#e2e8f0',
                                                                    color: isActive ? '#1d4ed8' : '#475569',
                                                                    padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                                                                    minWidth: '24px', textAlign: 'center'
                                                                }}>
                                                                    {tab.count}
                                                                </span>
                                                            </button>
                                                        )}
                                                    </Draggable>
                                                );
                                            })}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateRows: 'repeat(2, auto)', gridAutoColumns: 'minmax(180px, 1fr)', gridAutoFlow: 'column', gap: '0.5rem', minWidth: 'max-content' }}>
                                {orderedTabs.map((tab) => {
                                    const isActive = activeTab === tab.id;
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '0.625rem 0.875rem', border: '1px solid', 
                                                borderColor: isActive ? '#2563eb' : 'transparent',
                                                borderRadius: '8px',
                                                background: isActive ? '#eff6ff' : '#f8fafc',
                                                cursor: 'pointer',
                                                color: isActive ? '#2563eb' : '#475569',
                                                fontWeight: isActive ? 600 : 500, fontSize: '0.85rem', transition: 'all 0.2s ease',
                                                outline: 'none', textAlign: 'left',
                                                width: '100%',
                                                whiteSpace: 'nowrap'
                                            }}
                                            className="hover:bg-slate-100"
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                                <Icon size={16} style={{ color: isActive ? '#2563eb' : '#94a3b8' }} />
                                                {tab.name}
                                            </span>
                                            <span style={{
                                                background: isActive ? '#bfdbfe' : '#e2e8f0',
                                                color: isActive ? '#1d4ed8' : '#475569',
                                                padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
                                                minWidth: '24px', textAlign: 'center'
                                            }}>
                                                {tab.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                </div>
            </Card>

            {/* Responsive Grid: Sub Layout */}
            <div className="flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_350px] gap-6 items-start">
                {/* Column: Content Area */}
                <div className="flex flex-col min-w-0 w-full">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                            {tabs.find(t => t.id === activeTab)?.name}
                        </h3>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {/* Contextual Quick Actions */}
                            {activeTab === 'quotes' && (
                                <Link href={`/quotes/new?customerId=${customer.id}`}>
                                    <Button style={{ background: '#22c55e', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none' }}><Plus size={16} /> Tạo Báo Giá</Button>
                                </Link>
                            )}
                            {activeTab === 'contracts' && (
                                <Link href={`/contracts/new?customerId=${customer.id}`}>
                                    <Button style={{ background: '#22c55e', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none' }}><Plus size={16} /> Soạn Hợp Đồng</Button>
                                </Link>
                            )}
                            {activeTab === 'appendices' && (
                                <Link href="/contract-appendices/new">
                                    <Button style={{ background: '#22c55e', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none' }}><Plus size={16} /> Thêm Phụ Lục</Button>
                                </Link>
                            )}
                            {activeTab === 'dispatches' && (
                                <Link href={`/dispatches/new?customerId=${customer.id}`}>
                                    <Button style={{ background: '#22c55e', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none' }}><Plus size={16} /> Soạn Công Văn</Button>
                                </Link>
                            )}
                            {activeTab === 'handovers' && (
                                <Link href={`/handovers/new?customerId=${customer.id}`}>
                                    <Button style={{ background: '#22c55e', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none' }}><Plus size={16} /> Tạo Bàn Giao</Button>
                                </Link>
                            )}
                            {activeTab === 'payments' && (
                                <Link href={`/payment-requests/new?customerId=${customer.id}`}>
                                    <Button style={{ background: '#22c55e', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none' }}><Plus size={16} /> Tạo Đề Nghị TT</Button>
                                </Link>
                            )}
                            {/* New action buttons for sales tabs */}
                            {activeTab === 'salesEstimates' && (
                                <Link href={`/sales/estimates?action=new&customerId=${customer.id}`}>
                                    <Button style={{ background: '#22c55e', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none' }}><Plus size={16} /> Tạo Báo Giá (ERP)</Button>
                                </Link>
                            )}
                            {activeTab === 'leads' && (
                                <Link href={`/sales/leads/new?customerId=${customer.id}`}>
                                    <Button style={{ background: '#22c55e', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none' }}><Plus size={16} /> Tạo Cơ Hội Mới</Button>
                                </Link>
                            )}
                            {activeTab === 'salesOrders' && (
                                <Link href={`/sales/orders?action=new&customerId=${customer.id}`}>
                                    <Button style={{ background: '#22c55e', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none' }}><Plus size={16} /> Tạo Đơn Đặt Hàng</Button>
                                </Link>
                            )}
                            {activeTab === 'salesInvoices' && (
                                <Link href={`/sales/invoices?action=new&customerId=${customer.id}`}>
                                    <Button style={{ background: '#22c55e', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none' }}><Plus size={16} /> Tạo HĐ Bán & Nợ</Button>
                                </Link>
                            )}
                            {activeTab === 'salesPayments' && (
                                <Link href={`/sales/payments?action=new&customerId=${customer.id}`}>
                                    <Button style={{ background: '#22c55e', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none' }}><Plus size={16} /> Tạo Thu Tiền</Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Content Logic */}
                    {activeTab === 'managers' ? (
                        <CustomerManagersPanel
                            customerId={customer.id}
                            managers={customer.managers || []}
                            users={users}
                            currentUserRole={currentUserRole}
                        />
                    ) : activeTab === 'documents' ? (
                        <CustomerNotesPanel
                            customerId={customer.id}
                            notes={customer.notes || []}
                            currentUserId={currentUserId}
                            currentUserRole={currentUserRole}
                        />
                    ) : activeTab === 'contacts' ? (
                        <CustomerContactsPanel
                            customerId={customer.id}
                            contacts={customer.contacts || []}
                        />
                    ) : activeTab === 'statement' ? (
                        <Card style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
                            <CustomerStatementPanel customerId={customer.id} customerName={customer.name} />
                        </Card>
                    ) : activeTab === 'emailLogs' ? (
                        <EmailLogTable emailLogs={customer.emailLogs || []} />
                    ) : (
                        <Card style={{ padding: '0', overflow: 'hidden', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm theo mã, tiêu đề, trạng thái hoặc thẻ..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem 1rem 0.625rem 2.5rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            outline: 'none',
                                            fontSize: '0.875rem'
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <thead className="whitespace-nowrap">
                                        <tr>
                                            <th>Mã HS</th>
                                            <th>Tiêu đề</th>
                                            <th>Trạng thái</th>
                                            <th>Ngày tạo</th>
                                            <th style={{ width: '100px', textAlign: 'right' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const filterDocs = (docs: any[]) => {
                                                if (!docs) return [];
                                                if (!searchQuery) return docs;
                                                const q = searchQuery.toLowerCase();
                                                return docs.filter(doc =>
                                                    doc.code?.toLowerCase().includes(q) ||
                                                    doc.id?.toLowerCase().includes(q) ||
                                                    doc.title?.toLowerCase().includes(q) ||
                                                    doc.notes?.toLowerCase().includes(q) ||
                                                    doc.tags?.toLowerCase().includes(q) ||
                                                    getStatusColor(doc.status).text.toLowerCase().includes(q)
                                                );
                                            };

                                            const lists: any = {
                                                quotes: filterDocs(customer.quotes || []),
                                                contracts: filterDocs(customer.contracts || []),
                                                appendices: filterDocs(customer.contracts?.flatMap((c: any) => c.appendices || []) || []),
                                                dispatches: filterDocs(customer.dispatches || []),
                                                handovers: filterDocs(customer.handovers || []),
                                                payments: filterDocs(customer.paymentRequests || []),
                                                salesEstimates: filterDocs(customer.salesEstimates || []),
                                                salesOrders: filterDocs(customer.salesOrders || []),
                                                salesInvoices: filterDocs(customer.salesInvoices || []),
                                                salesPayments: filterDocs(customer.salesPayments || []),
                                                leads: filterDocs(customer.leads || []),
                                            };

                                            const currentList = lists[activeTab];

                                            if (currentList.length === 0) {
                                                return (
                                                    <tr>
                                                        <td colSpan={5} style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                                                    {React.createElement(tabs.find(t => t.id === activeTab)?.icon || FileText, { size: 24 })}
                                                                </div>
                                                                <p style={{ margin: 0, fontSize: '0.9375rem' }}>Không tìm thấy {tabs.find(t => t.id === activeTab)?.name.toLowerCase()} nào.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return currentList.map((doc: any) => {
                                                if (activeTab.startsWith('sales')) {
                                                    const typeMap: any = {
                                                        salesEstimates: 'sales/estimates',
                                                        salesOrders: 'sales/orders',
                                                        salesInvoices: 'sales/invoices',
                                                        salesPayments: 'sales/payments'
                                                    };
                                                    return <SalesDocumentRow key={doc.id} doc={doc} type={typeMap[activeTab]} getStatusColor={getStatusColor} />;
                                                }
                                                const typeMap: any = {
                                                    quotes: 'quotes',
                                                    contracts: 'contracts',
                                                    appendices: 'contract-appendices',
                                                    dispatches: 'dispatches',
                                                    handovers: 'handovers',
                                                    payments: 'payment-requests',
                                                    leads: 'sales/leads'
                                                };
                                                return <DocumentRow key={doc.id} doc={doc} type={typeMap[activeTab]} getStatusColor={getStatusColor} />;
                                            });
                                        })()}
                                    </tbody>
                                </Table>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Column 3: TaskPanel & Timeline */}
                <div className="w-full lg:col-span-2 xl:col-span-1" style={{ position: 'sticky', top: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <TaskPanel initialTasks={tasks} users={users} entityType="CUSTOMER" entityId={customer.id} />
                    <CustomerHistoryTimeline logs={customer.activityLogs || []} />
                </div>

            </div>

            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                templates={emailTemplates}
                moduleType="DEBT_CONFIRMATION"
                variablesData={{
                    customerName: customer.name,
                    customerEmail: customer.email || '',
                    totalDebt: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(computedDebt),
                }}
                onSend={async (emailData) => {
                    const res = await sendDebtConfirmationEmail(customer.id, emailData.to, emailData.subject, emailData.htmlBody);
                    if (res?.success) alert("Đã gửi email công nợ thành công!");
                    else alert("Lỗi khi gửi email: " + res?.error);
                }}
            />

            {/* Password Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 m-0">Tài khoản Customer Portal</h3>
                            <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600">
                                Khách hàng sẽ sử dụng <strong>{customer.email || 'Email (chưa cấu hình)'}</strong> để đăng nhập.
                                <br/>Link đăng nhập: <span className="font-semibold text-indigo-600">/portal/login</span>
                            </p>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Mật khẩu mới</label>
                                <input 
                                    type="text" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Nhập mật khẩu cho khách hàng..." 
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="p-6 pt-0 flex justify-end gap-3 bg-slate-50 border-t border-slate-100">
                            <Button onClick={() => setIsPasswordModalOpen(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none' }}>Hủy</Button>
                            <Button 
                                disabled={!newPassword || isUpdatingPassword || !customer.email}
                                onClick={async () => {
                                    setIsUpdatingPassword(true);
                                    const res = await updateCustomerPassword(customer.id, newPassword);
                                    setIsUpdatingPassword(false);
                                    if (res?.success) {
                                        alert("Đã cấp mật khẩu tài khoản thành công!");
                                        setNewPassword('');
                                        setIsPasswordModalOpen(false);
                                    } else {
                                        alert("Lỗi: " + res?.error);
                                    }
                                }}
                                style={{ background: '#10b981', color: 'white', border: 'none' }}
                            >
                                {isUpdatingPassword ? 'Đang lưu...' : 'Xác nhận tạo khẩu'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div >
    );
}

function DocumentRow({ doc, type, getStatusColor }: { doc: any, type: string, getStatusColor: (s: string) => { bg: string, color: string, text: string } }) {
    const statusObj = getStatusColor(doc.status);
    return (
        <tr>
            <td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <Link href={`/${type}/${doc.id}`} className="hover:text-primary hover:underline" style={{ color: 'inherit', textDecoration: 'none' }}>
                    #{doc.code || doc.id.slice(-6).toUpperCase()}
                </Link>
            </td>
            <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                <Link href={`/${type}/${doc.id}`} className="hover:text-primary hover:underline" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {doc.title || doc.name}
                </Link>
            </td>
            <td>
                <span style={{
                    backgroundColor: statusObj.bg, color: statusObj.color,
                    padding: '0.25rem 0.75rem', borderRadius: '999px',
                    fontSize: '0.75rem', fontWeight: 600, display: 'inline-block'
                }}>
                    {statusObj.text}
                </span>
            </td>
            <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }} suppressHydrationWarning>{formatDate(new Date(doc.createdAt))}</td>
            <td>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <Link href={`/${type}/${doc.id}`} style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', transition: 'all 0.2s'
                    }} title="Xem chi tiết & In">
                        <Eye size={16} />
                    </Link>
                </div>
            </td>
        </tr>
    );
}

export function SalesDocumentRow({ doc, type, getStatusColor }: { doc: any, type: string, getStatusColor: (s: string) => { bg: string, color: string, text: string } }) {
    const statusObj = getStatusColor(doc.status);
    return (
        <tr>
            <td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <Link href={`/${type}/${doc.id}`} className="hover:text-primary hover:underline" style={{ color: 'inherit', textDecoration: 'none' }}>
                    #{doc.code}
                </Link>
            </td>
            <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                <Link href={`/${type}/${doc.id}`} className="hover:text-primary hover:underline block" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {doc.notes || 'Hồ sơ Bán Hàng'} - Trị giá: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(doc.totalAmount || doc.amount || 0)}
                </Link>
                {doc.tags && (
                    <div style={{ marginTop: '0.375rem' }}>
                        <TagDisplay tagsString={doc.tags} />
                    </div>
                )}
            </td>
            <td>
                <span style={{
                    backgroundColor: statusObj.bg, color: statusObj.color,
                    padding: '0.25rem 0.75rem', borderRadius: '999px',
                    fontSize: '0.75rem', fontWeight: 600, display: 'inline-block'
                }}>
                    {statusObj.text}
                </span>
            </td>
            <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }} suppressHydrationWarning>{formatDate(new Date(doc.createdAt))}</td>
            <td>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <Link href={`/${type}/${doc.id}`} style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', transition: 'all 0.2s'
                    }} title="Tới phân hệ">
                        <Eye size={16} />
                    </Link>
                </div>
            </td>
        </tr>
    );
}
