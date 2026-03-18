'use client';
import { formatDate } from '@/lib/utils/formatters';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Eye, Trash2, Calendar, DollarSign, Wallet, ArrowUpDown, Upload, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createPurchasePayment, deletePurchasePayment } from '@/app/purchasing/actions';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { useTranslation } from '@/app/i18n/LanguageContext';

export function PurchasePaymentClient({ initialPayments, suppliers, unpaidBills }: { initialPayments: any[], suppliers: any[], unpaidBills: any[] }) {
    const router = useRouter();
    const { t } = useTranslation();
    const [payments, setPayments] = useState(initialPayments);
    const [searchQuery, setSearchQuery] = useState('');

    // Sort logic
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewingPayment, setViewingPayment] = useState<any | null>(null);

    // Form
    const [formData, setFormData] = useState({
        supplierId: '',
        date: new Date().toISOString().substring(0, 10),
        amount: 0,
        paymentMethod: 'BANK_TRANSFER',
        reference: '',
        notes: '',
        attachment: '',
    });

    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setFormData(prev => ({ ...prev, attachment: data.url }));
        } catch (err: any) {
            alert(err.message || t('purchasePayments.uploadError'));
        } finally {
            setIsUploading(false);
        }
    };

    // Allocation state
    const [allocations, setAllocations] = useState<Record<string, number>>({});

    const [isSubmitting, setIsSubmitting] = useState(false);

    const searchParams = useSearchParams();
    const hasOpenedFromUrl = React.useRef(false);

    React.useEffect(() => {
        if (hasOpenedFromUrl.current) return;

        const supplierId = searchParams.get('supplierId');
        const action = searchParams.get('action');
        if (supplierId || action === 'new') {
            if (supplierId) handleSupplierChange(supplierId);
            setIsCreateModalOpen(true);
            hasOpenedFromUrl.current = true;
            window.history.replaceState({}, '', '/purchasing/payments');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const filteredPayments = payments.filter(p =>
        (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.reference && p.reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.supplier && p.supplier.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const sortedPayments = React.useMemo(() => {
        let sortableItems = [...filteredPayments];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Special case for nested supplier name
                if (sortConfig.key === 'supplier.name') {
                    aVal = a.supplier?.name || '';
                    bVal = b.supplier?.name || '';
                }

                if (aVal === null || aVal === undefined) aVal = '';
                if (bVal === null || bVal === undefined) bVal = '';

                if (aVal < bVal) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredPayments, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const { paginatedItems, paginationProps } = usePagination(sortedPayments);

    // Supplier's unpaid bills
    const supplierBills = useMemo(() => {
        if (!formData.supplierId) return [];
        return unpaidBills.filter(b => b.supplierId === formData.supplierId);
    }, [formData.supplierId, unpaidBills]);

    // Total allocated so far
    const totalAllocated = useMemo(() => {
        return Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
    }, [allocations]);

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const supplierFormOptions = useMemo(() => [
        { value: '', label: t('purchasePayments.selectSupplierPlaceholder') },
        ...suppliers.map((s: any) => ({ value: s.id, label: `${s.name} (${t('purchasePayments.debtPrefix')} ${formatMoney(s.totalDebt)})` }))
    ], [suppliers, t]);

    const handleOpenCreate = () => {
        setFormData({ supplierId: '', date: new Date().toISOString().substring(0, 10), amount: 0, paymentMethod: 'BANK_TRANSFER', reference: '', notes: '', attachment: '' });
        setAllocations({});
        setIsCreateModalOpen(true);
    };

    const handleSupplierChange = (supplierId: string) => {
        setFormData({ ...formData, supplierId });
        setAllocations({});
        // Optional: auto-fill amount with total debt
        const supplier = suppliers.find(s => s.id === supplierId);
        if (supplier) {
            setFormData(prev => ({ ...prev, amount: supplier.totalDebt > 0 ? supplier.totalDebt : 0 }));
        }
    };

    const handleAllocationChange = (billId: string, value: number, maxAllowed: number) => {
        let val = value;
        if (val < 0) val = 0;
        if (val > maxAllowed) val = maxAllowed;

        setAllocations(prev => ({
            ...prev,
            [billId]: val
        }));
    };

    const handleAutoAllocate = () => {
        if (formData.amount <= 0) return;

        let remainingToAllocate = formData.amount;
        const newAllocations: Record<string, number> = {};

        // Sort bills by date ascending (oldest first)
        const sortedBills = [...supplierBills].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const bill of sortedBills) {
            if (remainingToAllocate <= 0) break;
            const billDebt = bill.totalAmount - bill.paidAmount;

            if (billDebt > 0) {
                const allocateToThisBill = Math.min(billDebt, remainingToAllocate);
                newAllocations[bill.id] = allocateToThisBill;
                remainingToAllocate -= allocateToThisBill;
            }
        }

        setAllocations(newAllocations);
    };

    const handleDelete = async (id: string, code: string) => {
        if (confirm(t('purchasePayments.deletePrompt').replace('{{code}}', code))) {
            try {
                await deletePurchasePayment(id);
                setPayments(payments.filter(p => p.id !== id));
            } catch (error: any) {
                alert(error.message || t('purchasePayments.deleteError'));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.supplierId) {
            alert(t('purchasePayments.supplierRequired'));
            return;
        }

        if (formData.amount <= 0) {
            alert(t('purchasePayments.amountRequired'));
            return;
        }

        if (totalAllocated > formData.amount + 0.01) {
            alert(t('purchasePayments.allocationExceedError'));
            return;
        }

        setIsSubmitting(true);
        try {
            const allocationsArray = Object.entries(allocations)
                .filter(([_, amount]) => amount > 0)
                .map(([billId, amount]) => ({ billId, amount }));

            const submitData = {
                ...formData,
                allocations: allocationsArray
            };

            const created = await createPurchasePayment(submitData);

            const supplier = suppliers.find(s => s.id === formData.supplierId);
            const newPaymentUi = {
                ...created,
                supplier: supplier,
                allocations: allocationsArray.map(a => ({
                    ...a,
                    bill: unpaidBills.find(b => b.id === a.billId)
                }))
            };

            setPayments([newPaymentUi, ...payments]);
            setIsCreateModalOpen(false);

            // Note: In a real SPA, we'd also update the unpaidBills list in memory here,
            // or rely on a full page reload / Server Action revalidation.
            // Next.js revalidatePath will handle the fresh data on next visit anyway.
            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert(error.message || t('purchasePayments.createError'));
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-8">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl mb-1">{t('purchasePayments.title')}</h1>
                    <p className="text-sm text-gray-500">{t('purchasePayments.description')}</p>
                </div>
                <button onClick={handleOpenCreate} className="btn btn-primary">
                    <Plus size={20} style={{ marginRight: '8px' }} />
                    <span>{t('purchasePayments.createPayment')}</span>
                </button>
            </div>

            <div className="card search-card">
                <div className="search-input-wrapper">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder={t('purchasePayments.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input"
                    />
                </div>
                <div className="flex gap-4 w-full sm:w-auto text-sm mt-4 sm:mt-0">
                    <div className="stat-card stat-card-blue" style={{ minWidth: '160px' }}>
                        <div className="stat-info">
                            <span className="stat-title">{t('purchasePayments.totalPayments')}</span>
                            <span className="stat-value">{payments.length}</span>
                        </div>
                    </div>
                    <div className="stat-card stat-card-green" style={{ minWidth: '160px' }}>
                        <div className="stat-info">
                            <span className="stat-title">{t('purchasePayments.totalPaidAmount')}</span>
                            <span className="stat-value">
                                {formatMoney(payments.reduce((sum, p) => sum + (p.amount || 0), 0))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('code')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">{t('purchasePayments.colTxnCode')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('date')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">{t('purchasePayments.colDateSupplier')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('paymentMethod')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">{t('purchasePayments.colMethod')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('amount')} className="cursor-pointer hover:bg-gray-100 text-right">
                                <div className="flex items-center justify-end gap-1">{t('purchasePayments.colAmount')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th className="text-center">{t('purchasePayments.colActions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedItems.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    {t('purchasePayments.noPaymentsFound')}
                                </td>
                            </tr>
                        ) : (
                            paginatedItems.map((payment) => (
                                <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="p-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                                        <Link href={`/purchasing/payments/${payment.id}`} className="hover:text-primary hover:underline">
                                            {payment.code}
                                        </Link>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                                            <Calendar size={13} /> {formatDate(payment.date)}
                                        </div>
                                        <Link href={`/suppliers/${payment.supplierId}`} className="font-semibold text-primary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
                                            {payment.supplier?.name}
                                        </Link>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                        {payment.paymentMethod === 'CASH' ? t('purchasePayments.methodCash') : t('purchasePayments.methodBank')}
                                        {payment.reference && <div className="text-xs text-gray-500 mt-1">{t('purchasePayments.refPrefix')} {payment.reference}</div>}
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="font-semibold text-green-600 dark:text-green-400">
                                            {formatMoney(payment.amount)}
                                        </span>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {t('purchasePayments.allocatedPrefix')} {formatMoney(payment.allocations?.reduce((sum: number, a: any) => sum + a.amount, 0) || 0)}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Link
                                                href={`/purchasing/payments/${payment.id}`}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded inline-block"
                                                title={t('purchasePayments.viewTooltip')}
                                            >
                                                <Eye size={18} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(payment.id, payment.code)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded inline-block"
                                                title={t('purchasePayments.deleteTooltip')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <Pagination {...paginationProps} />
            </div>

            {/* View Payment Modal */}
            {viewingPayment && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1E1E1E] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Wallet className="text-green-500" /> {t('purchasePayments.viewModalTitle')}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">{t('purchasePayments.codeLabel')} {viewingPayment.code}</p>
                            </div>
                            <button onClick={() => setViewingPayment(null)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p className="text-sm text-gray-500">{t('purchasePayments.supplierLabel')}</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{viewingPayment.supplier?.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">{t('purchasePayments.paymentDateLabel')}</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{formatDate(viewingPayment.date)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">{t('purchasePayments.amountLabel')}</p>
                                    <p className="font-bold text-green-600 dark:text-green-400 text-lg">{formatMoney(viewingPayment.amount)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">{t('purchasePayments.methodLabel')}</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {viewingPayment.paymentMethod === 'BANK_TRANSFER' ? t('purchasePayments.methodBank') : t('purchasePayments.methodCash')}
                                    </p>
                                    {viewingPayment.reference && <p className="text-xs text-gray-500">{t('purchasePayments.refPrefix')} {viewingPayment.reference}</p>}
                                    {viewingPayment.attachment && (
                                        <a href={viewingPayment.attachment} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center justify-end gap-1 mt-1">
                                            <CheckCircle2 size={12} className="text-green-500" /> {t('purchasePayments.viewDocumentText')}
                                        </a>
                                    )}
                                </div>
                            </div>

                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">{t('purchasePayments.allocationDetailsTitle')}</h3>
                            {viewingPayment.allocations && viewingPayment.allocations.length > 0 ? (
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-gray-500">
                                            <th className="pb-2">{t('purchasePayments.colBill')}</th>
                                            <th className="pb-2 text-right">{t('purchasePayments.colAllocatedAmount')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewingPayment.allocations.map((alloc: any) => (
                                            <tr key={alloc.id} className="border-t border-gray-100 dark:border-gray-800">
                                                <td className="py-2 text-gray-800 dark:text-gray-200">{alloc.bill?.code || alloc.billId}</td>
                                                <td className="py-2 text-right font-medium">{formatMoney(alloc.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-sm text-gray-500 italic">{t('purchasePayments.noBillsAllocated')}</p>
                            )}
                        </div>
                    </div>
                </div>
            )
            }

            {/* Create Modal */}
            {
                isCreateModalOpen && (
                    <div className="modal-backdrop">
                        <div className="modal-container flex max-w-4xl shadow-2xl">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Wallet className="text-green-500" /> {t('purchasePayments.createModalTitle')}
                                </h2>
                                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                            </div>

                            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                                <form id="paymentForm" onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <div className="sm:col-span-2 lg:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchasePayments.supplierReqLabel')}</label>
                                            <SearchableSelect
                                                value={formData.supplierId}
                                                onChange={(val) => handleSupplierChange(val)}
                                                options={supplierFormOptions}
                                                placeholder={t('purchasePayments.selectSupplierPlaceholder')}
                                            />
                                        </div>
                                        <div className="sm:col-span-2 lg:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchasePayments.paymentAmountReqLabel')}</label>
                                            <input
                                                type="number" required min="1"
                                                value={formData.amount}
                                                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5 font-bold text-lg text-green-600 dark:text-green-400"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">{t('purchasePayments.numberFormat')} {formatMoney(formData.amount)}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchasePayments.dateLabel')}</label>
                                            <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchasePayments.methodLabel')}</label>
                                            <select value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5">
                                                <option value="BANK_TRANSFER">{t('purchasePayments.methodBank')}</option>
                                                <option value="CASH">{t('purchasePayments.methodCash')}</option>
                                            </select>
                                        </div>
                                        <div className="sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchasePayments.referenceLabel')}</label>
                                            <input type="text" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" />
                                        </div>
                                        <div className="sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchasePayments.attachmentLabel')}</label>
                                            <div className="flex items-center gap-3 mt-1">
                                                <label className="cursor-pointer bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 transition-colors w-full justify-center">
                                                    <Upload size={16} />
                                                    {isUploading ? t('purchasePayments.uploadingBtn') : t('purchasePayments.chooseFileBtn')}
                                                    <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                                </label>
                                                {formData.attachment && (
                                                    <a href={formData.attachment} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1 min-w-max">
                                                        <CheckCircle2 size={16} className="text-green-500" /> {t('purchasePayments.uploadedText')}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Allocation Section */}
                                    {formData.supplierId && supplierBills.length > 0 && (
                                        <div>
                                            <div className="flex justify-between items-end mb-3">
                                                <div>
                                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg flex items-center gap-2">
                                                        {t('purchasePayments.allocateBillsTitle')}
                                                    </h3>
                                                    {formData.amount > 0 && (
                                                        <div className="mt-1.5 text-sm flex items-center gap-2">
                                                            <span className="text-gray-600 dark:text-gray-400">{t('purchasePayments.unallocatedAmount')}</span>
                                                            <span className={`font-bold px-2 py-0.5 rounded-md ${formData.amount - totalAllocated > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : formData.amount === totalAllocated ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                                {formatMoney(formData.amount - totalAllocated)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleAutoAllocate}
                                                    className="text-sm font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 px-3 py-1.5 rounded hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
                                                >
                                                    <CheckCircle2 size={16} /> {t('purchasePayments.autoAllocateBtn')}
                                                </button>
                                            </div>
                                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm">{t('purchasePayments.colBillDate')}</th>
                                                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm text-right">{t('purchasePayments.colBillValue')}</th>
                                                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm text-right">{t('purchasePayments.colRemainingDebt')}</th>
                                                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm text-right w-48">{t('purchasePayments.colPaymentAmountInput')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {supplierBills.map((bill) => {
                                                            const debt = bill.totalAmount - bill.paidAmount;
                                                            return (
                                                                <tr key={bill.id} className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1E1E1E]">
                                                                    <td className="p-3">
                                                                        <div className="font-medium text-gray-900 dark:text-gray-100">{bill.code}</div>
                                                                        <div className="text-xs text-gray-500">{formatDate(bill.date)}</div>
                                                                    </td>
                                                                    <td className="p-3 text-right text-gray-600 dark:text-gray-400">{formatMoney(bill.totalAmount)}</td>
                                                                    <td className="p-3 text-right font-medium text-red-600 dark:text-red-400">{formatMoney(debt)}</td>
                                                                    <td className="p-3 pr-4 align-top">
                                                                        <div className="relative">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                max={debt}
                                                                                value={allocations[bill.id] || ''}
                                                                                onChange={(e) => handleAllocationChange(bill.id, Number(e.target.value), debt)}
                                                                                className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                                                                placeholder="0"
                                                                            />
                                                                            {(() => {
                                                                                const currentVal = allocations[bill.id] || 0;
                                                                                const maxCanAdd = Math.max(0, formData.amount - totalAllocated + currentVal);
                                                                                const recommendVal = Math.min(debt, maxCanAdd);

                                                                                if (recommendVal > 0 && currentVal !== recommendVal) {
                                                                                    return (
                                                                                        <div className="flex justify-end mt-1.5">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleAllocationChange(bill.id, recommendVal, debt)}
                                                                                                className="text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2 py-0.5 rounded shadow-sm transition-colors active:scale-95"
                                                                                                title={t('purchasePayments.fillMaxTooltip')}
                                                                                            >
                                                                                                {t('purchasePayments.fillBtn')} {formatMoney(recommendVal)}
                                                                                            </button>
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                        <tr className="bg-gray-50 dark:bg-gray-800/80 border-t-2 border-gray-200 dark:border-gray-700">
                                                            <td colSpan={2} className="p-3 text-right font-semibold text-gray-700 dark:text-gray-300">{t('purchasePayments.totalAllocatedLabel')}</td>
                                                            <td className="p-3 text-right font-bold text-red-600 dark:text-red-400">
                                                                {formatMoney(supplierBills.reduce((s, b) => s + (b.totalAmount - b.paidAmount), 0))}
                                                            </td>
                                                            <td className={`p-3 text-right font-bold text-lg pr-4 ${totalAllocated > formData.amount ? 'text-red-600' : 'text-green-600'}`}>
                                                                {formatMoney(totalAllocated)}
                                                                <span className="block text-xs font-normal text-gray-500 mt-1">
                                                                    {t('purchasePayments.paymentLabel')} {formatMoney(formData.amount)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            {totalAllocated > formData.amount && (
                                                <p className="text-red-500 text-sm mt-2 text-right">{t('purchasePayments.allocationError')}</p>
                                            )}
                                        </div>
                                    )}
                                </form>
                            </div>
                            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 mt-auto">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">{t('purchasePayments.cancelBtn')}</button>
                                <button
                                    type="submit"
                                    form="paymentForm"
                                    disabled={isSubmitting || totalAllocated > formData.amount}
                                    style={{ backgroundColor: (isSubmitting || totalAllocated > formData.amount) ? '#9ca3af' : '#16a34a', color: 'white' }}
                                    className="px-6 py-2 rounded-lg font-medium transition-colors"
                                >
                                    {isSubmitting ? t('purchasePayments.processingBtn') : t('purchasePayments.confirmPaymentBtn')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
