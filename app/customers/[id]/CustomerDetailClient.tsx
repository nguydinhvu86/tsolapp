'use client'
import { formatDate, formatMoney } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { ArrowLeft, User, Users, Mail, Phone, MapPin, Building2, FileSpreadsheet, FileText, FileOutput, FilePlus2, Eye, Edit, FileStack, Plus, ShoppingCart, SearchCode, Ticket, HandCoins, Search, Target, UserCheck, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import { TagDisplay } from '@/app/components/ui/TagDisplay';
import { CustomerStatementPanel } from '@/app/components/customers/CustomerStatementPanel';
import { CustomerNotesPanel } from '@/app/components/customers/CustomerNotesPanel';
import { CustomerContactsPanel } from '@/app/components/customers/CustomerContactsPanel';
import { CustomerManagersPanel } from '@/app/components/customers/CustomerManagersPanel';
import { CustomerHistoryTimeline } from '@/app/components/customers/CustomerHistoryTimeline';
import { CustomerCallLogsPanel } from '@/app/components/customers/CustomerCallLogsPanel';
import { useSession } from 'next-auth/react';
import { SendEmailModal } from '@/app/components/ui/modals/SendEmailModal';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { sendDebtConfirmationEmail, saveCustomerMenuOrder, updateCustomer, lookupCustomerTaxCode } from '../actions';
import { updateCustomerPassword } from './actions';
import { EmailLogTable } from '@/app/components/ui/EmailLogTable';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';
import { Sparkles, Loader2, Building, CreditCard, Globe, CheckCircle2, AlertCircle } from 'lucide-react';

import { StatusBadge } from '@/app/components/ui/StatusBadge';

export function CustomerDetailClient({ customer, tasks, users, emailTemplates = [], savedMenuOrder = "[]" }: { customer: any, tasks: any[], users: any[], emailTemplates?: any[], savedMenuOrder?: string }) {
    const router = useRouter();
    const { data: session } = useSession();
    const currentUserRole = session?.user?.role || 'USER';
    const currentUserId = session?.user?.id || '';
    const [activeTab, setActiveTab] = useState<'documents' | 'statement' | 'quotes' | 'contracts' | 'handovers' | 'payments' | 'appendices' | 'dispatches' | 'salesEstimates' | 'salesOrders' | 'salesInvoices' | 'salesPayments' | 'leads' | 'emailLogs' | 'callLogs' | 'contacts' | 'managers'>('leads');
    const [searchQuery, setSearchQuery] = useState('');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeEditTab, setActiveEditTab] = useState<'general' | 'contact' | 'financial' | 'notes'>('general');
    const [isLookingUpTax, setIsLookingUpTax] = useState(false);
    const [taxLookupMessage, setTaxLookupMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
    const [copiedPortalLink, setCopiedPortalLink] = useState(false);

    const handleCopyPortalLink = (e: React.MouseEvent) => {
        e.preventDefault();
        const link = window.location.origin + '/portal/login';
        navigator.clipboard.writeText(link);
        setCopiedPortalLink(true);
        setTimeout(() => setCopiedPortalLink(false), 2000);
    };

    const [editFormData, setEditFormData] = useState({ 
        code: customer?.code || '',
        name: customer?.name || '', 
        shortName: customer?.shortName || '',
        internationalName: customer?.internationalName || '',
        email: customer?.email || '', 
        phone: customer?.phone || '', 
        address: customer?.address || '', 
        billingAddress: customer?.billingAddress || '',
        shippingAddress: customer?.shippingAddress || '',
        taxCode: customer?.taxCode || '',
        taxStatus: customer?.taxStatus || '',
        contactName: customer?.contactName || '',
        website: customer?.website || '',
        businessType: customer?.businessType || '',
        bankAccount: customer?.bankAccount || '',
        bankName: customer?.bankName || '',
        bankBranch: customer?.bankBranch || '',
        paymentTerms: customer?.paymentTerms || '',
        creditLimit: customer?.creditLimit || 0,
        internalNotes: customer?.internalNotes || ''
    });
    const [newPassword, setNewPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const handleTaxLookup = async () => {
        if (!editFormData.taxCode?.trim()) {
            setTaxLookupMessage({ type: 'error', text: 'Vui lòng nhập Mã số thuế để tra cứu.' });
            return;
        }

        setIsLookingUpTax(true);
        setTaxLookupMessage(null);

        try {
            const res = await lookupCustomerTaxCode(editFormData.taxCode.trim());
            if (res.success && res.data) {
                const { name, shortName, internationalName, address, status } = res.data;
                setEditFormData(prev => ({
                    ...prev,
                    name: name || prev.name,
                    shortName: shortName || prev.shortName,
                    internationalName: internationalName || prev.internationalName,
                    address: address || prev.address,
                    billingAddress: prev.billingAddress || address || '',
                    taxStatus: status || 'NNT đang hoạt động'
                }));
                setTaxLookupMessage({
                    type: 'success',
                    text: `Đã tìm thấy: ${name}${status ? ` (${status})` : ''}`
                });
            } else {
                setTaxLookupMessage({
                    type: 'error',
                    text: res.message || 'Không tìm thấy thông tin doanh nghiệp với MST này.'
                });
            }
        } catch (error: any) {
            setTaxLookupMessage({
                type: 'error',
                text: error.message || 'Lỗi khi tra cứu mã số thuế.'
            });
        } finally {
            setIsLookingUpTax(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingEdit(true);
        try {
            await updateCustomer(customer.id, editFormData);
            setIsEditModalOpen(false);
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Lỗi hệ thống khi cập nhật thông tin.');
        } finally {
            setIsSubmittingEdit(false);
        }
    };

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
        { id: 'callLogs', name: 'Calllogs PBX', count: customer.callLogs?.length || 0, icon: Phone },
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header / Back Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <button 
                    onClick={() => router.push('/customers')} 
                    className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-center shadow-xs cursor-pointer"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight m-0">
                        Chi tiết Khách hàng
                    </h1>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">Quản lý hồ sơ, công nợ và chuỗi chứng từ liên kết.</p>
                </div>
            </div>

            {/* Customer Info Card */}
            <Card className="p-4 sm:p-5 border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[var(--primary)] shadow-2xs">
                        <User size={24} />
                    </div>
                    <div className="flex-1 w-full flex flex-col items-center sm:items-start text-center sm:text-left">
                        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3 mb-4 w-full">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200/80">
                                        {customer.code || 'KH-CHƯA CÓ'}
                                    </span>
                                    {customer.taxStatus && (
                                        <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200/80">
                                            {customer.taxStatus}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-base font-bold m-0 text-slate-900 tracking-tight break-words">{customer.name}</h2>
                                {customer.shortName && (
                                    <p className="text-[11px] text-slate-500 font-medium m-0 mt-0.5">
                                        Tên viết tắt: <span className="text-slate-700 font-semibold">{customer.shortName}</span>
                                        {customer.internationalName && ` • Tên quốc tế: ${customer.internationalName}`}
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:flex-wrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTaxLookupMessage(null);
                                        setActiveEditTab('general');
                                        setEditFormData({
                                            code: customer?.code || '',
                                            name: customer?.name || '',
                                            shortName: customer?.shortName || '',
                                            internationalName: customer?.internationalName || '',
                                            email: customer?.email || '',
                                            phone: customer?.phone || '',
                                            address: customer?.address || '',
                                            billingAddress: customer?.billingAddress || '',
                                            shippingAddress: customer?.shippingAddress || '',
                                            taxCode: customer?.taxCode || '',
                                            taxStatus: customer?.taxStatus || '',
                                            contactName: customer?.contactName || '',
                                            website: customer?.website || '',
                                            businessType: customer?.businessType || '',
                                            bankAccount: customer?.bankAccount || '',
                                            bankName: customer?.bankName || '',
                                            bankBranch: customer?.bankBranch || '',
                                            paymentTerms: customer?.paymentTerms || '',
                                            creditLimit: customer?.creditLimit || 0,
                                            internalNotes: customer?.internalNotes || ''
                                        });
                                        setIsEditModalOpen(true);
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/90 rounded-xl text-xs font-semibold transition-all shadow-2xs hover:shadow-xs hover:border-slate-300 cursor-pointer"
                                    title="Sửa thông tin khách hàng"
                                >
                                    <Edit size={14} className="text-amber-600 shrink-0" />
                                    <span className="truncate">Sửa Hồ Sơ</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordModalOpen(true)}
                                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/90 rounded-xl text-xs font-semibold transition-all shadow-2xs hover:shadow-xs hover:border-slate-300 cursor-pointer"
                                    title="Cấp quyền đăng nhập Customer Portal"
                                >
                                    <UserCheck size={14} className="text-blue-600 shrink-0" />
                                    <span className="truncate">Tài khoản Portal</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCopyPortalLink}
                                    className={`inline-flex items-center justify-center gap-1.5 h-9 px-3 border rounded-xl text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer ${
                                        copiedPortalLink
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-emerald-100'
                                            : 'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200/90 hover:border-slate-300'
                                    }`}
                                    title="Copy đường dẫn đăng nhập Portal"
                                >
                                    {copiedPortalLink ? (
                                        <>
                                            <Check size={14} className="text-emerald-600 shrink-0" />
                                            <span className="truncate font-bold text-emerald-700">Đã chép link!</span>
                                        </>
                                    ) : (
                                        <>
                                            <LinkIcon size={14} className="text-indigo-600 shrink-0" />
                                            <span className="truncate">Link Portal</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEmailModalOpen(true)}
                                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-all shadow-2xs hover:shadow-sm cursor-pointer"
                                    title="Gửi Email"
                                >
                                    <Mail size={14} className="text-white shrink-0" />
                                    <span className="truncate">Gửi Email</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full text-left">
                            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80">
                                <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><Mail size={13} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Email</p>
                                    <p className="m-0 text-xs font-semibold text-slate-800 break-words mt-0.5">{customer.email || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80">
                                <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><Phone size={13} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Số Điện Thoại</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <p className="m-0 text-xs font-semibold text-slate-800 break-words font-mono">{customer.phone || 'Chưa cập nhật'}</p>
                                        {customer.phone && <ClickToCallButton phoneNumber={customer.phone} className="ml-1" />}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80">
                                <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><Building2 size={13} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mã Số Thuế</p>
                                    <p className="m-0 text-xs font-semibold font-mono text-slate-800 break-words mt-0.5">{customer.taxCode || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-rose-50/50 border border-rose-100">
                                <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-rose-200 flex items-center justify-center text-rose-600 flex-shrink-0"><HandCoins size={13} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 text-[10px] font-semibold text-rose-600 uppercase tracking-wider">Tổng Dư Nợ Hóa Đơn</p>
                                    <p className="m-0 text-xs font-bold text-rose-600 font-mono break-words mt-0.5">{formatMoney(computedDebt)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80">
                                <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><User size={13} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Người Đại Diện / Liên Hệ</p>
                                    <p className="m-0 text-xs font-semibold text-slate-800 break-words mt-0.5">{customer.contactName || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80">
                                <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><CreditCard size={13} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tài Khoản Ngân Hàng</p>
                                    <p className="m-0 text-xs font-medium text-slate-700 break-words mt-0.5">
                                        {customer.bankAccount ? `${customer.bankAccount} (${customer.bankName || ''})` : 'Chưa cập nhật'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80 lg:col-span-2">
                                <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><MapPin size={13} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Địa Chỉ Trụ Sở</p>
                                    <p className="m-0 text-xs font-medium text-slate-700 break-words mt-0.5">{customer.address || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                            {customer.billingAddress && (
                                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80 lg:col-span-1">
                                    <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><FileText size={13} /></div>
                                    <div className="min-w-0 flex-1">
                                        <p className="m-0 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Địa Chỉ Hóa Đơn</p>
                                        <p className="m-0 text-xs font-medium text-slate-700 break-words mt-0.5">{customer.billingAddress}</p>
                                    </div>
                                </div>
                            )}
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
                                                                className={`flex items-center justify-between gap-2 px-3 py-2 border rounded-xl transition-all outline-none text-left w-full whitespace-nowrap text-xs ${
                                                                    isActive
                                                                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-bold shadow-2xs'
                                                                        : 'border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 font-medium'
                                                                } ${snapshot.isDragging ? 'ring-2 ring-emerald-500 ring-inset z-50 shadow-md' : ''}`}
                                                                style={provided.draggableProps.style}
                                                            >
                                                                <span className="flex items-center gap-2 min-w-0 flex-1 truncate">
                                                                    <Icon size={15} className={`shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                                                                    <span className="truncate">{tab.name}</span>
                                                                </span>
                                                                <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold min-w-[20px] text-center shrink-0 ${
                                                                    isActive
                                                                        ? 'bg-emerald-200/80 text-emerald-900'
                                                                        : 'bg-slate-100 text-slate-500'
                                                                }`}>
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
                                            type="button"
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`flex items-center justify-between gap-2 px-3 py-2 border rounded-xl transition-all outline-none text-left w-full whitespace-nowrap text-xs cursor-pointer ${
                                                isActive
                                                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-bold shadow-2xs'
                                                    : 'border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 font-medium'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2 min-w-0 flex-1 truncate">
                                                <Icon size={15} className={`shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                                                <span className="truncate">{tab.name}</span>
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold min-w-[20px] text-center shrink-0 ${
                                                isActive
                                                    ? 'bg-emerald-200/80 text-emerald-900'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}>
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
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-5">
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight m-0">
                                {tabs.find(t => t.id === activeTab)?.name}
                            </h3>
                            <p className="text-xs text-slate-500 m-0 mt-0.5">Danh sách dữ liệu và các chứng từ liên quan.</p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Contextual Quick Actions */}
                            {activeTab === 'quotes' && (
                                <Link href={`/quotes/new?customerId=${customer.id}`}>
                                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap">
                                        <Plus size={14} strokeWidth={2.5} /> <span>Tạo Báo Giá</span>
                                    </button>
                                </Link>
                            )}
                            {activeTab === 'contracts' && (
                                <Link href={`/contracts/new?customerId=${customer.id}`}>
                                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap">
                                        <Plus size={14} strokeWidth={2.5} /> <span>Soạn Hợp Đồng</span>
                                    </button>
                                </Link>
                            )}
                            {activeTab === 'appendices' && (
                                <Link href="/contract-appendices/new">
                                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap">
                                        <Plus size={14} strokeWidth={2.5} /> <span>Thêm Phụ Lục</span>
                                    </button>
                                </Link>
                            )}
                            {activeTab === 'dispatches' && (
                                <Link href={`/dispatches/new?customerId=${customer.id}`}>
                                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap">
                                        <Plus size={14} strokeWidth={2.5} /> <span>Soạn Công Văn</span>
                                    </button>
                                </Link>
                            )}
                            {activeTab === 'handovers' && (
                                <Link href={`/handovers/new?customerId=${customer.id}`}>
                                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap">
                                        <Plus size={14} strokeWidth={2.5} /> <span>Tạo Bàn Giao</span>
                                    </button>
                                </Link>
                            )}
                            {activeTab === 'payments' && (
                                <Link href={`/payment-requests/new?customerId=${customer.id}`}>
                                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap">
                                        <Plus size={14} strokeWidth={2.5} /> <span>Tạo Đề Nghị TT</span>
                                    </button>
                                </Link>
                            )}
                            {/* New action buttons for sales tabs */}
                            {activeTab === 'salesEstimates' && (
                                <Link href={`/sales/estimates?action=new&customerId=${customer.id}`}>
                                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap">
                                        <Plus size={14} strokeWidth={2.5} /> <span>Tạo Báo Giá</span>
                                    </button>
                                </Link>
                            )}
                            {activeTab === 'leads' && (
                                <Link href={`/sales/leads/new?customerId=${customer.id}`}>
                                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap">
                                        <Plus size={14} strokeWidth={2.5} /> <span>Tạo Cơ Hội Mới</span>
                                    </button>
                                </Link>
                            )}
                            {activeTab === 'salesOrders' && (
                                <Link href={`/sales/orders?action=new&customerId=${customer.id}`}>
                                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap">
                                        <Plus size={14} strokeWidth={2.5} /> <span>Tạo Đơn Đặt Hàng</span>
                                    </button>
                                </Link>
                            )}
                            {activeTab === 'salesInvoices' && (
                                <Link href={`/sales/invoices?action=new&customerId=${customer.id}`}>
                                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap">
                                        <Plus size={14} strokeWidth={2.5} /> <span>Tạo HĐ Bán & Nợ</span>
                                    </button>
                                </Link>
                            )}
                            {activeTab === 'salesPayments' && (
                                <Link href={`/sales/payments?action=new&customerId=${customer.id}`}>
                                    <button type="button" className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap">
                                        <Plus size={14} strokeWidth={2.5} /> <span>Tạo Thu Tiền</span>
                                    </button>
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
                    ) : activeTab === 'callLogs' ? (
                        <CustomerCallLogsPanel logs={customer.callLogs || []} />
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                            <div className="p-3.5 border-b border-slate-100 bg-slate-50/40">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm theo mã, tiêu đề, trạng thái hoặc thẻ..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200/90 outline-none text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-2xs"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <thead className="whitespace-nowrap bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="py-3 px-4 font-bold">Mã HS</th>
                                            <th className="py-3 px-4 font-bold">Tiêu đề</th>
                                            {activeTab === 'salesInvoices' && <th className="py-3 px-4 font-bold">Thẻ Quản Lý</th>}
                                            <th className="py-3 px-4 font-bold">Trạng thái</th>
                                            <th className="py-3 px-4 font-bold">Ngày tạo</th>
                                            <th className="py-3 px-4 font-bold text-right" style={{ width: '100px' }}>Thao tác</th>
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
                        </div>
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
                    totalDebt: formatMoney(computedDebt),
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

            {/* Edit Customer Modal */}
            {isEditModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-container" style={{ maxWidth: '850px', maxHeight: '92vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                                    Cập Nhật Hồ Sơ Khách Hàng
                                </h2>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                    Tra cứu tự động qua MST hoặc chỉnh sửa các trường chi tiết
                                </p>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Tax Lookup Quick Bar */}
                        <div className="bg-indigo-50/70 border-b border-indigo-100 p-4 sm:px-6">
                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                                <div className="flex-1 flex items-center bg-white rounded-lg border border-indigo-200 px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400">
                                    <Sparkles className="text-indigo-500 mr-2 shrink-0" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Nhập Mã số thuế để tự động tra cứu..."
                                        value={editFormData.taxCode || ''}
                                        onChange={e => setEditFormData({ ...editFormData, taxCode: e.target.value })}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleTaxLookup(); } }}
                                        className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleTaxLookup}
                                    disabled={isLookingUpTax || !editFormData.taxCode?.trim()}
                                    className="btn bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm shrink-0 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {isLookingUpTax ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            <span>Đang tra cứu...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Search size={16} />
                                            <span>Tra cứu</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {taxLookupMessage && (
                                <div className={`mt-2.5 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                                    taxLookupMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                    {taxLookupMessage.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                                    <span>{taxLookupMessage.text}</span>
                                </div>
                            )}
                        </div>

                        {/* Tabs Header */}
                        <div className="flex border-b border-gray-200 px-6 bg-slate-50 gap-2 overflow-x-auto hide-scrollbar">
                            <button
                                type="button"
                                onClick={() => setActiveEditTab('general')}
                                className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                    activeEditTab === 'general' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <Building2 size={16} /> Thông Tin Chung & Thuế
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveEditTab('contact')}
                                className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                    activeEditTab === 'contact' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <Phone size={16} /> Liên Hệ & Địa Chỉ
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveEditTab('financial')}
                                className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                    activeEditTab === 'financial' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <CreditCard size={16} /> Tài Chính & Ngân Hàng
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveEditTab('notes')}
                                className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                    activeEditTab === 'notes' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <FileText size={16} /> Ghi Chú
                            </button>
                        </div>

                        {/* Form Body */}
                        <form id="customerEditForm" onSubmit={handleEditSubmit} style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(92vh - 240px)' }}>
                            {activeEditTab === 'general' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Mã Khách Hàng</label>
                                            <input
                                                type="text"
                                                value={editFormData.code || ''}
                                                onChange={e => setEditFormData({ ...editFormData, code: e.target.value })}
                                                placeholder="KH-xxxx"
                                                className="input w-full font-mono text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Mã Số Thuế</label>
                                            <input
                                                type="text"
                                                value={editFormData.taxCode || ''}
                                                onChange={e => setEditFormData({ ...editFormData, taxCode: e.target.value })}
                                                placeholder="0101248141"
                                                className="input w-full font-mono text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Trạng Thái MST</label>
                                            <input
                                                type="text"
                                                value={editFormData.taxStatus || ''}
                                                onChange={e => setEditFormData({ ...editFormData, taxStatus: e.target.value })}
                                                placeholder="NNT đang hoạt động"
                                                className="input w-full text-sm bg-gray-50"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                                            Tên Khách Hàng / Công Ty <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={editFormData.name || ''}
                                            onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                            placeholder="Tên đầy đủ theo đăng ký..."
                                            className="input w-full font-medium"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Tên Viết Tắt / Giao Dịch</label>
                                            <input
                                                type="text"
                                                value={editFormData.shortName || ''}
                                                onChange={e => setEditFormData({ ...editFormData, shortName: e.target.value })}
                                                placeholder="Tên viết tắt..."
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Tên Quốc Tế</label>
                                            <input
                                                type="text"
                                                value={editFormData.internationalName || ''}
                                                onChange={e => setEditFormData({ ...editFormData, internationalName: e.target.value })}
                                                placeholder="Tên tiếng Anh..."
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Ngành Nghề / Lĩnh Vực</label>
                                        <input
                                            type="text"
                                            value={editFormData.businessType || ''}
                                            onChange={e => setEditFormData({ ...editFormData, businessType: e.target.value })}
                                            placeholder="Lĩnh vực hoạt động..."
                                            className="input w-full text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeEditTab === 'contact' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Người Đại Diện / Liên Hệ</label>
                                            <input
                                                type="text"
                                                value={editFormData.contactName || ''}
                                                onChange={e => setEditFormData({ ...editFormData, contactName: e.target.value })}
                                                placeholder="Họ tên người liên hệ"
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Số Điện Thoại</label>
                                            <input
                                                type="text"
                                                value={editFormData.phone || ''}
                                                onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                                                placeholder="0987xxxxxx"
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={editFormData.email || ''}
                                                onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                                placeholder="email@company.com"
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Website</label>
                                            <input
                                                type="text"
                                                value={editFormData.website || ''}
                                                onChange={e => setEditFormData({ ...editFormData, website: e.target.value })}
                                                placeholder="https://..."
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Địa Chỉ Trụ Sở</label>
                                        <input
                                            type="text"
                                            value={editFormData.address || ''}
                                            onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                                            placeholder="Địa chỉ trụ sở..."
                                            className="input w-full text-sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Địa Chỉ Xuất Hóa Đơn</label>
                                            <input
                                                type="text"
                                                value={editFormData.billingAddress || ''}
                                                onChange={e => setEditFormData({ ...editFormData, billingAddress: e.target.value })}
                                                placeholder="Địa chỉ hóa đơn VAT..."
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Địa Chỉ Giao Nhận Hàng</label>
                                            <input
                                                type="text"
                                                value={editFormData.shippingAddress || ''}
                                                onChange={e => setEditFormData({ ...editFormData, shippingAddress: e.target.value })}
                                                placeholder="Địa chỉ kho / giao hàng..."
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeEditTab === 'financial' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Tên Ngân Hàng</label>
                                            <input
                                                type="text"
                                                value={editFormData.bankName || ''}
                                                onChange={e => setEditFormData({ ...editFormData, bankName: e.target.value })}
                                                placeholder="Tên ngân hàng..."
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Số Tài Khoản</label>
                                            <input
                                                type="text"
                                                value={editFormData.bankAccount || ''}
                                                onChange={e => setEditFormData({ ...editFormData, bankAccount: e.target.value })}
                                                placeholder="Số tài khoản..."
                                                className="input w-full font-mono text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Chi Nhánh Ngân Hàng</label>
                                        <input
                                            type="text"
                                            value={editFormData.bankBranch || ''}
                                            onChange={e => setEditFormData({ ...editFormData, bankBranch: e.target.value })}
                                            placeholder="Chi nhánh..."
                                            className="input w-full text-sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Điều Khoản Thanh Toán</label>
                                            <input
                                                type="text"
                                                value={editFormData.paymentTerms || ''}
                                                onChange={e => setEditFormData({ ...editFormData, paymentTerms: e.target.value })}
                                                placeholder="Thanh toán ngay, gối đầu..."
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Hạn Mức Công Nợ (VNĐ)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1000"
                                                value={editFormData.creditLimit || ''}
                                                onChange={e => setEditFormData({ ...editFormData, creditLimit: parseFloat(e.target.value) || 0 })}
                                                placeholder="0"
                                                className="input w-full font-mono text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeEditTab === 'notes' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Ghi Chú Nội Bộ</label>
                                        <textarea
                                            rows={5}
                                            value={editFormData.internalNotes || ''}
                                            onChange={e => setEditFormData({ ...editFormData, internalNotes: e.target.value })}
                                            placeholder="Ghi chú nội bộ..."
                                            className="input w-full text-sm"
                                            style={{ resize: 'vertical' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </form>

                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--surface)' }}>
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} disabled={isSubmittingEdit}>
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                form="customerEditForm"
                                disabled={isSubmittingEdit}
                                className="bg-primary text-white hover:bg-primary-hover"
                            >
                                {isSubmittingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

function DocumentRow({ doc, type }: { doc: any, type: string, getStatusColor?: any }) {
    return (
        <tr className="hover:bg-slate-50/70 transition-colors">
            <td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                <Link href={`/${type}/${doc.id}`} className="hover:text-emerald-600 hover:underline font-mono" style={{ color: 'inherit', textDecoration: 'none' }}>
                    #{doc.code || doc.id.slice(-6).toUpperCase()}
                </Link>
            </td>
            <td style={{ fontWeight: 500, color: '#0f172a' }}>
                <Link href={`/${type}/${doc.id}`} className="hover:text-emerald-600 hover:underline" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {doc.title || doc.name}
                </Link>
            </td>
            <td>
                <StatusBadge status={doc.status} />
            </td>
            <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }} suppressHydrationWarning>{formatDate(new Date(doc.createdAt))}</td>
            <td>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <Link href={`/${type}/${doc.id}`} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-all flex items-center justify-center border border-slate-200" title="Xem chi tiết & In">
                        <Eye size={15} />
                    </Link>
                </div>
            </td>
        </tr>
    );
}

export function SalesDocumentRow({ doc, type }: { doc: any, type: string, getStatusColor?: any }) {
    return (
        <tr className="hover:bg-slate-50/70 transition-colors">
            <td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                <Link href={`/${type}/${doc.id}`} className="hover:text-emerald-600 hover:underline font-mono" style={{ color: 'inherit', textDecoration: 'none' }}>
                    #{doc.code}
                </Link>
            </td>
            <td style={{ fontWeight: 500, color: '#0f172a' }}>
                <Link href={`/${type}/${doc.id}`} className="hover:text-emerald-600 hover:underline block" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {doc.notes || 'Hồ sơ Bán Hàng'} - Trị giá: <span className="font-semibold">{formatMoney(doc.totalAmount || doc.amount || 0)}</span>
                </Link>
                {type !== 'sales/invoices' && doc.tags && (
                    <div style={{ marginTop: '0.375rem' }}>
                        <TagDisplay tagsString={doc.tags} />
                    </div>
                )}
            </td>
            {type === 'sales/invoices' && (
                <td>
                    <TagDisplay tagsString={doc.tags} />
                </td>
            )}
            <td>
                <StatusBadge status={doc.status} />
            </td>
            <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }} suppressHydrationWarning>{formatDate(new Date(doc.createdAt))}</td>
            <td>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <Link href={`/${type}/${doc.id}`} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-all flex items-center justify-center border border-slate-200" title="Tới phân hệ">
                        <Eye size={15} />
                    </Link>
                </div>
            </td>
        </tr>
    );
}
