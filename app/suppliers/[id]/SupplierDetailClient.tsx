'use client';
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Building, Phone, Mail, FileText,
    ShoppingCart, FileDown, Wallet, DollarSign,
    CheckSquare, MapPin, Search, Edit2, FileSpreadsheet, Users, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, XCircle,
    Sparkles, Loader2, Building2, CreditCard, CheckCircle2, Globe, Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import { updateSupplier, approvePurchaseBill, cancelPurchaseBill, updatePurchaseBillTags, lookupSupplierTaxCode, checkSupplierDuplicate } from '@/app/purchasing/actions';
import { SupplierStatementPanel } from '@/app/components/suppliers/SupplierStatementPanel';
import { SupplierContactsPanel } from '@/app/components/suppliers/SupplierContactsPanel';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';
import { CustomerCallLogsPanel } from '@/app/components/customers/CustomerCallLogsPanel';

import { StatusBadge } from '@/app/components/ui/StatusBadge';

export function SupplierDetailClient({ supplier: initialSupplier, users, tasks, warehouses }: { supplier: any, users: any[], tasks: any[], warehouses?: any[] }) {
    const router = useRouter();
    const [supplier, setSupplier] = useState(initialSupplier);
    const [activeTab, setActiveTab] = useState('orders');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
    const [activeEditTab, setActiveEditTab] = useState<'general' | 'contact' | 'financial' | 'notes'>('general');
    const [isLookingUpTax, setIsLookingUpTax] = useState(false);
    const [taxLookupMessage, setTaxLookupMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [duplicateWarnings, setDuplicateWarnings] = useState<{ field: string; message: string; duplicateEntity?: any }[]>([]);

    React.useEffect(() => {
        if (!isEditModalOpen) {
            setDuplicateWarnings([]);
            return;
        }
        const timer = setTimeout(async () => {
            if (!formData.taxCode?.trim() && !formData.email?.trim() && !formData.phone?.trim() && !formData.code?.trim()) {
                setDuplicateWarnings([]);
                return;
            }
            try {
                const res = await checkSupplierDuplicate({
                    code: formData.code,
                    taxCode: formData.taxCode,
                    email: formData.email,
                    phone: formData.phone
                }, supplier.id);
                if (res.hasDuplicate) {
                    setDuplicateWarnings(res.duplicates);
                } else {
                    setDuplicateWarnings([]);
                }
            } catch (e) {
                // ignore
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [formData.taxCode, formData.email, formData.phone, formData.code, isEditModalOpen, supplier.id]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const validBills = React.useMemo(() => supplier.bills ? supplier.bills.filter((b: any) => !['DRAFT', 'CANCELLED'].includes(b.status)) : [], [supplier.bills]);
    
    const sortedBills = React.useMemo(() => {
        let sortableBills = [...(supplier.bills || [])];
        if (sortConfig !== null) {
            sortableBills.sort((a: any, b: any) => {
                if (sortConfig.key === 'status') {
                    const valA = a.status || '';
                    const valB = b.status || '';
                    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                } else if (sortConfig.key === 'date') {
                    const dateA = new Date(a.date || a.createdAt).getTime();
                    const dateB = new Date(b.date || b.createdAt).getTime();
                    if (dateA < dateB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (dateA > dateB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }
                return 0;
            });
        }
        return sortableBills;
    }, [supplier.bills, sortConfig]);
    const computedDebt = React.useMemo(() => {
        const exactPurchases = validBills.reduce((acc: number, bill: any) => acc + (bill.totalAmount || 0), 0);
        const exactPayments = (supplier.payments || []).reduce((acc: number, pay: any) => acc + (pay.amount || 0), 0);
        return exactPurchases - exactPayments;
    }, [validBills, supplier.payments]);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState<any | null>(null);
    const [approveWarehouseId, setApproveWarehouseId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingTagsBillId, setEditingTagsBillId] = useState<string | null>(null);
    const [editingTagsValue, setEditingTagsValue] = useState<string>('');
    const [formData, setFormData] = useState({
        code: supplier.code || '',
        name: supplier.name || '',
        shortName: supplier.shortName || '',
        internationalName: supplier.internationalName || '',
        contactName: supplier.contactName || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        billingAddress: supplier.billingAddress || '',
        shippingAddress: supplier.shippingAddress || '',
        taxCode: supplier.taxCode || '',
        taxStatus: supplier.taxStatus || '',
        website: supplier.website || '',
        businessType: supplier.businessType || '',
        bankAccount: supplier.bankAccount || '',
        bankName: supplier.bankName || '',
        bankBranch: supplier.bankBranch || '',
        paymentTerms: supplier.paymentTerms || '',
        creditLimit: supplier.creditLimit || 0,
        notes: supplier.notes || ''
    });

    const handleTaxLookup = async () => {
        if (!formData.taxCode?.trim()) {
            setTaxLookupMessage({ type: 'error', text: 'Vui lòng nhập Mã số thuế để tra cứu.' });
            return;
        }

        setIsLookingUpTax(true);
        setTaxLookupMessage(null);

        try {
            const res = await lookupSupplierTaxCode(formData.taxCode.trim());
            if (res.success && res.data) {
                const { name, shortName, internationalName, address, status } = res.data;
                setFormData(prev => ({
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

    const handleOpenEdit = () => {
        setTaxLookupMessage(null);
        setActiveEditTab('general');
        setFormData({
            code: supplier.code || '',
            name: supplier.name || '',
            shortName: supplier.shortName || '',
            internationalName: supplier.internationalName || '',
            contactName: supplier.contactName || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            billingAddress: supplier.billingAddress || '',
            shippingAddress: supplier.shippingAddress || '',
            taxCode: supplier.taxCode || '',
            taxStatus: supplier.taxStatus || '',
            website: supplier.website || '',
            businessType: supplier.businessType || '',
            bankAccount: supplier.bankAccount || '',
            bankName: supplier.bankName || '',
            bankBranch: supplier.bankBranch || '',
            paymentTerms: supplier.paymentTerms || '',
            creditLimit: supplier.creditLimit || 0,
            notes: supplier.notes || ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (duplicateWarnings.length > 0) {
            alert(`CẢNH BÁO TRÙNG LẶP DỮ LIỆU:\n\n${duplicateWarnings.map(w => `• ${w.message}`).join('\n')}\n\nVui lòng kiểm tra lại trước khi lưu.`);
            return;
        }
        setIsSubmitting(true);
        try {
            const updated = await updateSupplier(supplier.id, formData);
            setSupplier({ ...updated, orders: supplier.orders, bills: supplier.bills, payments: supplier.payments });
            setIsEditModalOpen(false);
        } catch (error: any) {
            console.error(error);
            alert(error?.message || "Có lỗi xảy ra khi cập nhật!");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        if (!approveWarehouseId) {
            alert('Vui lòng chọn kho để nhập hàng hóa!');
            return;
        }
        setIsSubmitting(true);
        try {
            const updated = await approvePurchaseBill(selectedBill.id, approveWarehouseId);
            const updatedBills = supplier.bills.map((b: any) => b.id === updated.id ? { ...b, status: updated.status } : b);
            setSupplier({ ...supplier, bills: updatedBills });
            setIsApproveModalOpen(false);
            alert('Duyệt hóa đơn thành công!');
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Lỗi khi duyệt hóa đơn!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async (id: string, code: string) => {
        if (confirm(`Bạn có chắc muốn hủy hóa đơn ${code} không?`)) {
            setIsSubmitting(true);
            try {
                const updated = await cancelPurchaseBill(id);
                const updatedBills = supplier.bills.map((b: any) => b.id === updated.id ? { ...b, status: updated.status, notes: updated.notes } : b);
                setSupplier({ ...supplier, bills: updatedBills });
            } catch (error: any) {
                alert(error.message || 'Lỗi khi hủy hóa đơn!');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleUpdateTags = async (billId: string) => {
        setIsSubmitting(true);
        try {
            const updated = await updatePurchaseBillTags(billId, editingTagsValue);
            const updatedBills = supplier.bills.map((b: any) => b.id === updated.id ? { ...b, tags: updated.tags } : b);
            setSupplier({ ...supplier, bills: updatedBills });
            setEditingTagsBillId(null);
        } catch (error: any) {
            alert(error.message || 'Lỗi khi cập nhật thẻ quản lý!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 6, minimumFractionDigits: 0 }).format(amount || 0);
    };

    const tabs = [
        { id: 'orders', label: 'Đơn Đặt Hàng', count: supplier.orders?.length || 0, icon: <ShoppingCart size={15} /> },
        { id: 'bills', label: 'Hóa Đơn Mua', count: supplier.bills?.filter((b: any) => ['DRAFT', 'APPROVED', 'PARTIAL_PAID'].includes(b.status)).length || 0, icon: <FileDown size={15} /> },
        { id: 'invoices', label: 'Hóa Đơn VAT', count: supplier.invoices?.length || 0, icon: <FileText size={15} /> },
        { id: 'payments', label: 'Thanh Toán', count: supplier.payments?.length || 0, icon: <Wallet size={15} /> },
        { id: 'contacts', label: 'Người Liên Hệ', count: supplier.contacts?.length || 0, icon: <Users size={15} /> },
        { id: 'debt', label: 'Tổng Công Nợ', count: null, icon: <DollarSign size={15} /> },
        { id: 'statement', label: 'Sao Kê Công Nợ', count: '-', icon: <FileSpreadsheet size={15} /> },
        { id: 'calllogs', label: 'Gọi Điện (PBX)', count: supplier.callLogs?.length || 0, icon: <Phone size={15} /> },
    ];

    return (
        <div className="p-4 md:p-6 max-w-full mx-auto bg-slate-50 min-h-[calc(100vh-64px)]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/suppliers')} className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-center shadow-xs cursor-pointer">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold m-0 text-slate-900 tracking-tight leading-tight">Chi tiết Nhà cung cấp</h1>
                        <p className="text-slate-500 mt-0.5 text-xs">Quản lý hồ sơ NCC, công nợ và chuỗi hóa đơn mua.</p>
                    </div>
                </div>
                <button onClick={handleOpenEdit} className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs shadow-xs cursor-pointer sm:w-auto w-full h-[34px]">
                    <Edit2 size={14} /> Chỉnh sửa
                </button>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
                {/* Left Column */}
                <div className="flex flex-col gap-6 flex-1 min-w-0 w-full">
                    {/* Top Info Card */}
                    <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-2xs">
                            <Building size={24} />
                        </div>
                        <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200/80">
                                    {supplier.code}
                                </span>
                                {supplier.taxStatus && (
                                    <span className="text-[11px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200/80">
                                        {supplier.taxStatus}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-base font-bold text-slate-900 tracking-tight truncate" title={supplier.name}>{supplier.name}</h2>
                            {supplier.shortName && (
                                <p className="text-[11px] text-slate-500 font-medium mb-3 mt-0.5">
                                    Tên viết tắt: <span className="text-slate-700 font-semibold">{supplier.shortName}</span>
                                    {supplier.internationalName && ` • Tên quốc tế: ${supplier.internationalName}`}
                                </p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full text-left mt-3">
                                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80">
                                    <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><Mail size={13} /></div>
                                    <div className="min-w-0 flex-1">
                                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Email</span>
                                        <span className="text-xs font-semibold text-slate-800 truncate block mt-0.5">{supplier.email || '--'}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80">
                                    <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><Phone size={13} /></div>
                                    <div className="min-w-0 flex-1">
                                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Số Điện Thoại</span>
                                        <div className="text-xs font-semibold font-mono text-slate-800 truncate flex items-center gap-1.5 mt-0.5">
                                            {supplier.phone || '--'}
                                            {supplier.phone && <ClickToCallButton phoneNumber={supplier.phone} />}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80">
                                    <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><FileText size={13} /></div>
                                    <div className="min-w-0 flex-1">
                                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Mã Số Thuế</span>
                                        <span className="text-xs font-semibold font-mono text-slate-800 truncate block mt-0.5">{supplier.taxCode || '--'}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80">
                                    <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><Users size={13} /></div>
                                    <div className="min-w-0 flex-1">
                                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Người Đại Diện / Liên Hệ</span>
                                        <span className="text-xs font-semibold text-slate-800 truncate block mt-0.5">{supplier.contactName || '--'}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80">
                                    <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><CreditCard size={13} /></div>
                                    <div className="min-w-0 flex-1">
                                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tài Khoản Ngân Hàng</span>
                                        <span className="text-xs font-medium text-slate-700 truncate block mt-0.5">
                                            {supplier.bankAccount ? `${supplier.bankAccount} (${supplier.bankName || ''})` : '--'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-rose-50/50 border border-rose-100">
                                    <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-rose-200 flex items-center justify-center text-rose-500 flex-shrink-0"><DollarSign size={13} /></div>
                                    <div className="min-w-0 flex-1">
                                        <span className="block text-[10px] text-rose-600 uppercase tracking-wider font-semibold">Công Nợ Hiện Tại</span>
                                        <span className="text-xs font-bold font-mono text-rose-600 truncate block mt-0.5">{formatMoney(computedDebt)}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80 sm:col-span-2">
                                    <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><MapPin size={13} /></div>
                                    <div className="min-w-0 flex-1">
                                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Địa Chỉ Trụ Sở</span>
                                        <span className="text-xs font-medium text-slate-700 truncate block mt-0.5" title={supplier.address || ''}>{supplier.address || '--'}</span>
                                    </div>
                                </div>
                                {supplier.website && (
                                    <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 border border-slate-100/80">
                                        <div className="mt-0.5 w-6 h-6 rounded-md bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 flex-shrink-0"><Globe size={13} /></div>
                                        <div className="min-w-0 flex-1">
                                            <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Website</span>
                                            <a href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[var(--primary)] hover:underline truncate block mt-0.5">{supplier.website}</a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabs area */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden w-full shadow-xs">
                        <div className="flex border-b border-slate-200 overflow-x-auto px-2 hide-scrollbar bg-slate-50/50">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex gap-2 items-center px-4 py-3 border-none bg-transparent cursor-pointer text-xs sm:text-sm whitespace-nowrap transition-all relative font-medium
                                            ${isActive ? 'font-semibold text-emerald-700 border-b-2 border-emerald-600 bg-white' : 'text-slate-600 border-b-2 border-transparent hover:text-slate-900'}`}
                                    >
                                        <span className={isActive ? 'text-emerald-600' : 'text-slate-400'}>{tab.icon}</span>
                                        {tab.label}
                                        {tab.count !== null && (
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                                                ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content Header */}
                        <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 border-b border-slate-100 bg-white">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 m-0">Danh sách hồ sơ</h3>
                                <p className="text-xs text-slate-500 m-0 mt-0.5">Lịch sử đơn hàng, hóa đơn và phiếu chi nhà cung cấp.</p>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                {activeTab === 'orders' && (
                                    <Link href={`/purchasing/orders?supplierId=${supplier.id}`}>
                                        <button type="button" className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto">
                                            <Plus size={14} strokeWidth={2.5} /> <span>Tạo Đơn Hàng</span>
                                        </button>
                                    </Link>
                                )}
                                {activeTab === 'bills' && (
                                    <Link href={`/purchasing/bills?supplierId=${supplier.id}`}>
                                        <button type="button" className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto">
                                            <Plus size={14} strokeWidth={2.5} /> <span>Tạo Hóa Đơn</span>
                                        </button>
                                    </Link>
                                )}
                                {activeTab === 'payments' && (
                                    <Link href={`/purchasing/payments?supplierId=${supplier.id}`}>
                                        <button type="button" className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto">
                                            <Plus size={14} strokeWidth={2.5} /> <span>Tạo Phiếu Chi</span>
                                        </button>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Tab Content Grid */}
                        <div className="p-4 md:p-5 overflow-x-auto w-full">
                            {activeTab === 'orders' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                                    <thead style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem 0', fontWeight: 600 }}>Mã HS</th>
                                            <th style={{ padding: '0.75rem 0', fontWeight: 600 }}>Tiêu đề</th>
                                            <th style={{ padding: '0.75rem 0', fontWeight: 600 }}>Trạng thái</th>
                                            <th style={{ padding: '0.75rem 0', fontWeight: 600 }}>Ngày tạo</th>
                                            <th style={{ padding: '0.75rem 0', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supplier.orders?.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>Không có dữ liệu.</td></tr>}
                                        {supplier.orders?.map((order: any) => (
                                            <tr key={order.id} className="hover:bg-slate-50/70 transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '0.875rem 0', fontWeight: 600 }}>
                                                    <Link href={`/purchasing/orders/${order.id}`} className="hover:text-emerald-600 font-mono transition-colors text-slate-500">{order.code}</Link>
                                                </td>
                                                <td style={{ padding: '0.875rem 0', fontWeight: 500 }}>
                                                    <Link href={`/purchasing/orders/${order.id}`} className="hover:text-emerald-600 transition-colors text-slate-900">Đơn hàng {order.code} - <span className="font-semibold">{formatMoney(order.totalAmount)}</span></Link>
                                                </td>
                                                <td style={{ padding: '0.875rem 0' }}><StatusBadge status={order.status} /></td>
                                                <td style={{ padding: '0.875rem 0', color: '#64748b' }}>{formatDate(order.date)}</td>
                                                <td style={{ padding: '0.875rem 0', textAlign: 'right' }}>
                                                    <Link href={`/purchasing/orders/${order.id}`} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-all inline-flex items-center justify-center border border-slate-200">
                                                        <Search size={14} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'bills' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                                    <thead style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem 0', fontWeight: 600 }}>Mã HS</th>
                                            <th style={{ padding: '0.75rem 0', fontWeight: 600 }}>Tiêu đề</th>
                                            <th style={{ padding: '0.75rem 0', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('status')}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    Trạng thái
                                                    {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} className="text-slate-300" />}
                                                </div>
                                            </th>
                                            <th style={{ padding: '0.75rem 0', fontWeight: 600 }}>Thẻ Quản Lý</th>
                                            <th style={{ padding: '0.75rem 0', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('date')}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    Ngày tạo
                                                    {sortConfig?.key === 'date' ? (sortConfig.direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} className="text-slate-300" />}
                                                </div>
                                            </th>
                                            <th style={{ padding: '0.75rem 0', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedBills?.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>Không có dữ liệu.</td></tr>}
                                        {sortedBills?.map((bill: any) => (
                                            <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '0.875rem 0', fontWeight: 600 }}>
                                                    <Link href={`/purchasing/bills/${bill.id}`} className="hover:text-emerald-600 font-mono transition-colors text-slate-500">{bill.code}</Link>
                                                </td>
                                                <td style={{ padding: '0.875rem 0', fontWeight: 500 }}>
                                                    <Link href={`/purchasing/bills/${bill.id}`} className="hover:text-emerald-600 transition-colors text-slate-900">Hóa đơn {bill.supplierInvoice || bill.code} - <span className="font-semibold">{formatMoney(bill.totalAmount)}</span></Link>
                                                </td>
                                                <td style={{ padding: '0.875rem 0' }}><StatusBadge status={bill.status} /></td>
                                                <td style={{ padding: '1rem 0' }}>
                                                    {editingTagsBillId === bill.id ? (
                                                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                                            <input
                                                                type="text"
                                                                className="input"
                                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto', minHeight: 'unset', width: '140px' }}
                                                                value={editingTagsValue}
                                                                onChange={(e) => setEditingTagsValue(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleUpdateTags(bill.id);
                                                                    if (e.key === 'Escape') setEditingTagsBillId(null);
                                                                }}
                                                                autoFocus
                                                                placeholder="Thẻ 1, Thẻ 2..."
                                                            />
                                                            <button onClick={() => handleUpdateTags(bill.id)} style={{ border: 'none', background: '#dcfce7', color: '#16a34a', padding: '0.25rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Lưu"><CheckCircle size={14} /></button>
                                                            <button onClick={() => setEditingTagsBillId(null)} style={{ border: 'none', background: '#fee2e2', color: '#dc2626', padding: '0.25rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Hủy"><XCircle size={14} /></button>
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', cursor: 'pointer', minHeight: '24px', alignItems: 'center' }}
                                                            onClick={() => { setEditingTagsBillId(bill.id); setEditingTagsValue(bill.tags || ''); }}
                                                            title="Nhấn để sửa thẻ quản lý"
                                                        >
                                                            {bill.tags ? (
                                                                bill.tags.split(',').map((tag: string, i: number) => (
                                                                    <span key={i} style={{
                                                                        padding: '0.125rem 0.5rem',
                                                                        fontSize: '0.7rem',
                                                                        backgroundColor: '#f1f5f9',
                                                                        color: '#475569',
                                                                        borderRadius: '0.25rem',
                                                                        border: '1px solid #e2e8f0',
                                                                        fontWeight: 500,
                                                                        transition: 'all 0.2s',
                                                                    }} className="hover:border-indigo-300 hover:text-indigo-600">
                                                                        {tag.trim()}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span style={{ color: '#9ca3af', fontSize: '0.75rem', border: '1px dashed #d1d5db', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', transition: 'all 0.2s' }} className="hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50">+ Thêm thẻ</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 0', color: '#4b5563' }}>{formatDate(bill.date)}</td>
                                                <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <Link href={`/purchasing/bills/${bill.id}`} style={{ display: 'inline-flex', border: 'none', background: '#e0e7ff', color: '#4f46e5', padding: '0.4rem 0.6rem', borderRadius: '0.25rem', cursor: 'pointer' }} title="Xem chi tiết">
                                                            <Search size={16} />
                                                        </Link>
                                                        {bill.status === 'DRAFT' && (
                                                            <button
                                                                onClick={() => { setSelectedBill(bill); setIsApproveModalOpen(true); }}
                                                                style={{ display: 'inline-flex', border: 'none', background: '#dcfce7', color: '#16a34a', padding: '0.4rem 0.6rem', borderRadius: '0.25rem', cursor: 'pointer', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}
                                                                title="Duyệt Nợ"
                                                            >
                                                                <CheckCircle size={16} /> Duyệt Nợ
                                                            </button>
                                                        )}
                                                        {bill.status === 'APPROVED' && (
                                                            <button
                                                                onClick={() => handleCancel(bill.id, bill.supplierInvoice || bill.code)}
                                                                style={{ display: 'inline-flex', border: 'none', background: '#ffedd5', color: '#ea580c', padding: '0.4rem 0.6rem', borderRadius: '0.25rem', cursor: 'pointer' }}
                                                                title="Hủy Hóa Đơn"
                                                            >
                                                                <XCircle size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'invoices' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                    <thead style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <tr>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Ngày Xuất</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Số Hóa Đơn</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Tổng Tiền</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Trạng Thái</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(!supplier.invoices || supplier.invoices.length === 0) && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Chưa có hóa đơn điện tử nào được đồng bộ.</td></tr>}
                                        {supplier.invoices?.map((inv: any) => (
                                            <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '1rem 0', color: '#4b5563' }}>{inv.issueDate ? formatDate(inv.issueDate) : 'N/A'}</td>
                                                <td style={{ padding: '1rem 0', fontWeight: 500, color: '#4f46e5' }}>{inv.invoiceNumber}</td>
                                                <td style={{ padding: '1rem 0', fontWeight: 600 }}>
                                                    <div style={{ marginBottom: '0.25rem' }}>{formatMoney(inv.totalAmount)}</div>
                                                    {inv.items?.some((i: any) => i.unitPriceDiscrepancy > 0) && (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#fef2f2', color: '#dc2626', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: 500 }} title="Cảnh báo: Giá trên hóa đơn điện tử cao hơn so với Đơn đặt hàng đã duyệt!">
                                                            <AlertCircle size={10} /> Chênh Giá ({inv.items.filter((i:any) => i.unitPriceDiscrepancy > 0).length} SP)
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 0' }}>
                                                    {inv.status === 'INVENTORY_IMPORTED' ? (
                                                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>Đã Nhập Kho</span>
                                                    ) : (
                                                        <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>Mới Tải Về</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 0', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    {inv.status !== 'INVENTORY_IMPORTED' && (
                                                        <button 
                                                            style={{ display: 'inline-block', border: 'none', background: '#e0e7ff', color: '#4f46e5', padding: '0.4rem 0.6rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                                            onClick={() => alert('Chức năng nhập kho đang cập nhật (Local)')}
                                                        >
                                                            Nhập Kho
                                                        </button>
                                                    )}
                                                    {inv.xmlUrl && (
                                                        <a href={inv.xmlUrl} download style={{ display: 'inline-block', border: 'none', background: '#f1f5f9', color: '#475569', padding: '0.4rem 0.6rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'none' }}>
                                                            XML
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'payments' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                    <thead style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <tr>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Mã HS</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Tiêu đề</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Thanh Toán</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Ngày tạo</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supplier.payments?.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Không có dữ liệu.</td></tr>}
                                        {supplier.payments?.map((payment: any) => (
                                            <tr key={payment.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '1rem 0', fontWeight: 500 }}>
                                                    <Link href={`/purchasing/payments/${payment.id}`} className="hover:text-primary transition-colors text-gray-500">{payment.code}</Link>
                                                </td>
                                                <td style={{ padding: '1rem 0', fontWeight: 500 }}>
                                                    <Link href={`/purchasing/payments/${payment.id}`} className="hover:text-primary transition-colors text-gray-900">Phiếu chi {payment.code}</Link>
                                                </td>
                                                <td style={{ padding: '1rem 0', fontWeight: 600, color: '#16a34a' }}>{formatMoney(payment.amount)}</td>
                                                <td style={{ padding: '1rem 0', color: '#4b5563' }}>{formatDate(payment.date)}</td>
                                                <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                                                    <Link href={`/purchasing/payments/${payment.id}`} style={{ display: 'inline-block', border: 'none', background: '#e0e7ff', color: '#4f46e5', padding: '0.4rem 0.6rem', borderRadius: '0.25rem', cursor: 'pointer' }}>
                                                        <Search size={16} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'debt' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', padding: '1rem 0 2rem' }}>
                                    <div style={{ padding: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                            <FileDown size={18} /> <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Tổng Giá Trị Hóa Đơn</span>
                                        </div>
                                        <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>
                                            {formatMoney(validBills.reduce((sum: number, bill: any) => sum + (bill.totalAmount || 0), 0))}
                                        </span>
                                    </div>
                                    <div style={{ padding: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', marginBottom: '0.5rem' }}>
                                            <Wallet size={18} /> <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Tổng Đã Thanh Toán</span>
                                        </div>
                                        <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>
                                            {formatMoney(supplier.payments?.reduce((sum: number, pay: any) => sum + pay.amount, 0) || 0)}
                                        </span>
                                    </div>
                                    <div style={{ padding: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', marginBottom: '0.5rem' }}>
                                            <DollarSign size={18} /> <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Công Nợ Hiện Tại</span>
                                        </div>
                                        <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
                                            {formatMoney(computedDebt)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'statement' && (
                                <div style={{ paddingTop: '1rem' }}>
                                    <SupplierStatementPanel supplierId={supplier.id} supplierName={supplier.name} />
                                </div>
                            )}

                            {activeTab === 'calllogs' && (
                                <div style={{ paddingTop: '1rem' }}>
                                    <CustomerCallLogsPanel logs={supplier.callLogs || []} />
                                </div>
                            )}

                            {activeTab === 'contacts' && (
                                <div style={{ paddingTop: '1rem' }}>
                                    <SupplierContactsPanel supplierId={supplier.id} initialContacts={supplier.contacts || []} />
                                </div>
                            )}

                            {supplier.notes && (
                                <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px dashed #e5e7eb' }}>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Ghi chú</h4>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'pre-wrap', margin: 0 }}>{supplier.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Tasks Box */}
                <div className="w-full xl:w-[340px] shrink-0 xl:sticky xl:top-4">
                    <TaskPanel initialTasks={tasks} users={users} entityType="SUPPLIER" entityId={supplier.id} />
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-container" style={{ maxWidth: '850px', maxHeight: '92vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                                    Cập Nhật Nhà Cung Cấp
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
                                        value={formData.taxCode || ''}
                                        onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleTaxLookup(); } }}
                                        className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleTaxLookup}
                                    disabled={isLookingUpTax || !formData.taxCode?.trim()}
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

                            {duplicateWarnings.length > 0 && (
                                <div className="mt-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-1.5 shadow-2xs animate-pulse">
                                    <div className="font-bold flex items-center gap-1.5 text-rose-900">
                                        <AlertCircle size={15} className="shrink-0 text-rose-600" />
                                        <span>PHÁT HIỆN TRÙNG LẶP DỮ LIỆU ({duplicateWarnings.length})</span>
                                    </div>
                                    {duplicateWarnings.map((w, idx) => (
                                        <div key={idx} className="text-rose-700 font-medium pl-5">
                                            • {w.message}
                                        </div>
                                    ))}
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
                        <form id="supplierEditForm" onSubmit={handleEditSubmit} style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(92vh - 240px)' }}>
                            {activeEditTab === 'general' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                                                Mã NCC
                                                {duplicateWarnings.some(w => w.field === 'code') && <span className="text-rose-600 ml-1 font-bold lowercase">(trùng)</span>}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.code}
                                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                                className={`input w-full font-mono text-sm ${duplicateWarnings.some(w => w.field === 'code') ? 'border-rose-400 bg-rose-50/30' : ''}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                                                Mã Số Thuế
                                                {duplicateWarnings.some(w => w.field === 'taxCode') && <span className="text-rose-600 ml-1 font-bold lowercase">(trùng)</span>}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.taxCode}
                                                onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                                className={`input w-full font-mono text-sm ${duplicateWarnings.some(w => w.field === 'taxCode') ? 'border-rose-400 bg-rose-50/30' : ''}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Trạng Thái MST</label>
                                            <input
                                                type="text"
                                                value={formData.taxStatus || ''}
                                                onChange={e => setFormData({ ...formData, taxStatus: e.target.value })}
                                                placeholder="NNT đang hoạt động"
                                                className="input w-full text-sm bg-gray-50"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                                            Tên Nhà Cung Cấp <span style={{ color: 'var(--danger)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="input w-full font-medium"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Tên Viết Tắt</label>
                                            <input
                                                type="text"
                                                value={formData.shortName || ''}
                                                onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Tên Quốc Tế</label>
                                            <input
                                                type="text"
                                                value={formData.internationalName || ''}
                                                onChange={e => setFormData({ ...formData, internationalName: e.target.value })}
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Loại Hình Kinh Doanh</label>
                                        <input
                                            type="text"
                                            value={formData.businessType}
                                            onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                                            className="input w-full text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeEditTab === 'contact' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Người Liên Hệ</label>
                                            <input
                                                type="text"
                                                value={formData.contactName}
                                                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                                                Số Điện Thoại
                                                {duplicateWarnings.some(w => w.field === 'phone') && <span className="text-rose-600 ml-1 font-bold lowercase">(trùng)</span>}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className={`input w-full text-sm ${duplicateWarnings.some(w => w.field === 'phone') ? 'border-rose-400 bg-rose-50/30' : ''}`}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                                                Email
                                                {duplicateWarnings.some(w => w.field === 'email') && <span className="text-rose-600 ml-1 font-bold lowercase">(trùng)</span>}
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className={`input w-full text-sm ${duplicateWarnings.some(w => w.field === 'email') ? 'border-rose-400 bg-rose-50/30' : ''}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Hồ Sơ Năng Lực / Website</label>
                                            <input
                                                type="text"
                                                value={formData.website}
                                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Địa Chỉ Trụ Sở</label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="input w-full text-sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Địa Chỉ Xuất Hóa Đơn</label>
                                            <input
                                                type="text"
                                                value={formData.billingAddress || ''}
                                                onChange={e => setFormData({ ...formData, billingAddress: e.target.value })}
                                                placeholder="Địa chỉ xuất hóa đơn..."
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Địa Chỉ Kho / Giao Nhận Hàng</label>
                                            <input
                                                type="text"
                                                value={formData.shippingAddress || ''}
                                                onChange={e => setFormData({ ...formData, shippingAddress: e.target.value })}
                                                placeholder="Địa chỉ kho xuất hàng..."
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
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Ngân Hàng</label>
                                            <input
                                                type="text"
                                                value={formData.bankName}
                                                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Số Tài Khoản</label>
                                            <input
                                                type="text"
                                                value={formData.bankAccount}
                                                onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                                                className="input w-full font-mono text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Chi Nhánh Ngân Hàng</label>
                                        <input
                                            type="text"
                                            value={formData.bankBranch || ''}
                                            onChange={e => setFormData({ ...formData, bankBranch: e.target.value })}
                                            placeholder="Ví dụ: Chi nhánh TP.HCM..."
                                            className="input w-full text-sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Điều Khoản Thanh Toán</label>
                                            <input
                                                type="text"
                                                value={formData.paymentTerms || ''}
                                                onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                                                placeholder="Thanh toán ngay, gối đầu 30 ngày..."
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Hạn Mức Công Nợ (VNĐ)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1000"
                                                value={formData.creditLimit || ''}
                                                onChange={e => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
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
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            className="input w-full text-sm"
                                            style={{ resize: 'vertical' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </form>

                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--surface)' }}>
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn" style={{ border: '1px solid var(--border)', background: '#fff' }}>Hủy</button>
                            <button type="submit" form="supplierEditForm" disabled={isSubmitting} className="btn btn-primary" style={{ background: 'var(--primary)', color: '#fff', opacity: isSubmitting ? 0.7 : 1 }}>
                                {isSubmitting ? 'Đang lưu...' : 'Cập nhật'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Modal */}
            {isApproveModalOpen && selectedBill && (
                <div className="modal-backdrop">
                    <div className="modal-container" style={{ maxWidth: '450px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle className="text-blue-500" size={20} /> Duyệt hóa đơn {selectedBill.code}
                            </h2>
                            <button
                                onClick={() => setIsApproveModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                Hành động này sẽ chốt tồn kho (nếu có hàng hóa) và chuyển hóa đơn sang trạng thái công nợ. 
                                <br/>Vui lòng chọn <b>kho</b> để nhập hàng hóa cho hóa đơn này từ nhà cung cấp <b>{supplier.name}</b>.
                            </p>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Chọn Kho Nhập Hàng</label>
                                <select 
                                    className="input w-full"
                                    value={approveWarehouseId}
                                    onChange={(e) => setApproveWarehouseId(e.target.value)}
                                >
                                    <option value="">Lựa chọn kho...</option>
                                    {(warehouses || []).map((w: any) => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', background: 'var(--surface)' }}>
                            <button onClick={() => setIsApproveModalOpen(false)} className="btn" style={{ border: '1px solid var(--border)', background: '#fff' }}>Hủy</button>
                            <button 
                                onClick={handleApprove} 
                                disabled={isSubmitting || !approveWarehouseId} 
                                className="btn btn-primary" 
                                style={{ background: '#3b82f6', color: '#fff', opacity: (isSubmitting || !approveWarehouseId) ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                {isSubmitting ? 'Đang duyệt...' : <><CheckCircle size={16} /> Xác Nhận Duyệt</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

