'use client';

import React, { useState } from 'react';
import { Plus, Search, Eye, Trash2, Calendar, FileText, FileDown, CheckCircle, ArrowUpDown, Edit2, XCircle, AlertTriangle, X, Clock } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createPurchaseBill, approvePurchaseBill, deletePurchaseBill, updatePurchaseBill, cancelPurchaseBill } from '@/app/purchasing/actions';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { TagDisplay } from '@/app/components/ui/TagDisplay';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { useTranslation } from '@/app/i18n/LanguageContext';
import { formatMoney, formatDate, formatTaxRate, calcPreTaxPrice, calcTaxAmount } from '@/lib/utils/formatters';
import { TaxRateSelect, TaxBadge } from '@/app/components/ui/TaxRateSelect';

export function PurchaseBillClient({ initialBills, suppliers, orders, warehouses, products, projects }: { initialBills: any[], suppliers: any[], orders: any[], warehouses: any[], products: any[], projects?: any[] }) {
    const { t } = useTranslation();
    const [isMounted, setIsMounted] = useState(false);
    
    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const [bills, setBills] = useState(initialBills);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Sort logic
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });

    const supplierFormOptions = [{ value: '', label: t('purchaseBills.selectSupplier') }, ...suppliers.map((s: any) => ({ value: s.id, label: s.name }))];
    const warehouseOptions = [{ value: '', label: t('purchaseBills.selectWarehousePlaceholder') }, ...warehouses.map((w: any) => ({ value: w.id, label: w.name }))];
    const productOptions = [{ value: '', label: 'Lựa chọn...' }, { value: 'EXTERNAL', label: t('purchaseBills.customProductOption') }, ...products.map((p: any) => ({ value: p.id, label: p.code ? `[${p.code}] ${p.name}` : p.name }))];

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState<any | null>(null);

    // Form
    const [formData, setFormData] = useState({
        supplierId: '',
        orderId: '',
        projectId: '',
        supplierInvoice: '',
        date: new Date().toISOString().substring(0, 10),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        notes: '',
        tags: '',
        attachments: [] as { url: string, name: string, uploadedAt: string }[]
    });
    const [billItems, setBillItems] = useState<Array<{ productId: string, productName?: string, quantity: number, unitPrice: number, taxRate: number, description?: string, unit?: string, customName?: string, saveToInventory?: boolean }>>([]);
    const [approveWarehouseId, setApproveWarehouseId] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Item Sub-Form Buffer States
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);
    const [isCustomProduct, setIsCustomProduct] = useState(false);
    const [saveToInventory, setSaveToInventory] = useState(true);
    const [customName, setCustomName] = useState('');
    const [customUnit, setCustomUnit] = useState('Cái');
    const [customTaxRate, setCustomTaxRate] = useState(0);
    const [customDescription, setCustomDescription] = useState('');
    const [useInventoryDescription, setUseInventoryDescription] = useState(true);
    const [isPriceInclusiveVat, setIsPriceInclusiveVat] = useState(false);

    const searchParams = useSearchParams();
    const hasOpenedFromUrl = React.useRef(false);

    React.useEffect(() => {
        if (hasOpenedFromUrl.current) return;

        const supplierId = searchParams.get('supplierId');
        const orderId = searchParams.get('orderId');
        const editId = searchParams.get('edit');

        if (editId) {
            const billToEdit = bills.find((b: any) => b.id === editId);
            if (billToEdit) {
                handleEdit(billToEdit);
                hasOpenedFromUrl.current = true;
                window.history.replaceState({}, '', '/purchasing/bills');
                return;
            }
        }

        if (orderId) {
            const order = orders.find(o => o.id === orderId);
            if (order) {
                setFormData(prev => ({ ...prev, supplierId: order.supplierId, orderId: order.id }));

                // Map items from order to bill
                if (order.items && order.items.length > 0) {
                    const mappedItems = order.items.map((item: any) => ({
                        productId: item.productId || 'EXTERNAL',
                        productName: item.productName || '',
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0
                    }));
                    setBillItems(mappedItems);
                }

                setIsCreateModalOpen(true);
                hasOpenedFromUrl.current = true;
            }
        } else if (supplierId || searchParams.get('action') === 'new') {
            if (supplierId) setFormData(prev => ({ ...prev, supplierId }));
            
            const projectId = searchParams.get('projectId');
            if (projectId) setFormData(prev => ({ ...prev, projectId }));

            setIsCreateModalOpen(true);
            hasOpenedFromUrl.current = true;
            window.history.replaceState({}, '', '/purchasing/bills'); // clean url
        }
    }, [searchParams, orders]);

    const filteredBills = bills.filter(b => {
        const matchesSearch = (b.code && b.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (b.supplierInvoice && b.supplierInvoice.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (b.supplier && b.supplier.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = React.useMemo(() => {
        return bills.reduce((acc, bill) => {
            acc.total++;

            // Lấy nợ
            const remaining = bill.totalAmount - (bill.paidAmount || 0);

            switch (bill.status) {
                case 'DRAFT':
                    acc.draft.count++;
                    break;
                case 'APPROVED':
                    acc.approved.count++;
                    acc.approved.amount += remaining;
                    break;
                case 'PARTIAL_PAID':
                    acc.partial.count++;
                    acc.partial.amount += remaining;
                    break;
                case 'PAID':
                    acc.paid.count++;
                    break;
                default:
                    break;
            }
            return acc;
        }, {
            total: 0,
            draft: { count: 0 },
            approved: { count: 0, amount: 0 },
            partial: { count: 0, amount: 0 },
            paid: { count: 0 }
        });
    }, [bills]);

    const sortedBills = React.useMemo(() => {
        let sortableItems = [...filteredBills];
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
    }, [filteredBills, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const { paginatedItems, paginationProps } = usePagination(sortedBills);

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 6, minimumFractionDigits: 0 }).format(amount || 0);
    };

    const formatDate = (dateString: string | Date) => {
        return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const handleOpenCreate = () => {
        setFormData({
            supplierId: '',
            orderId: '',
            projectId: '',
            supplierInvoice: '',
            date: new Date().toISOString().substring(0, 10),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
            notes: '',
            tags: '',
            attachments: [],
            id: undefined
        } as any);
        setBillItems([]);

        // Reset sub-form
        setQty(1);
        setPrice(0);
        setSelectedProduct('');
        setIsCustomProduct(false);
        setSaveToInventory(true);
        setCustomName('');
        setCustomDescription('');
        setCustomUnit('Cái');
        setCustomTaxRate(0);

        setIsCreateModalOpen(true);
    };

    const handleEdit = (bill: any) => {
        let parsedAttachments = [];
        if (bill.attachment) {
            try {
                parsedAttachments = JSON.parse(bill.attachment);
            } catch (e) { }
        }

        setFormData({
            id: bill.id,
            status: bill.status,
            code: bill.code,
            supplierId: bill.supplierId,
            orderId: bill.orderId || '',
            projectId: bill.projectId || '',
            supplierInvoice: bill.supplierInvoice || '',
            date: bill.date ? new Date(bill.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
            dueDate: bill.dueDate ? new Date(bill.dueDate).toISOString().substring(0, 10) : '',
            notes: bill.notes || '',
            tags: bill.tags || '',
            attachments: parsedAttachments
        } as any);

        setBillItems(bill.items?.map((i: any) => ({
            productId: i.productId || 'EXTERNAL',
            productName: i.product?.name || i.productName || '',
            customName: i.productName || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0,
            unit: i.unit || i.product?.unit || 'Cái',
            description: i.description || i.notes || ''
        })) || []);

        // Reset sub-form
        setQty(1);
        setPrice(0);
        setSelectedProduct('');
        setIsCustomProduct(false);
        setSaveToInventory(true);
        setCustomName('');
        setCustomDescription('');
        setCustomUnit('Cái');
        setCustomTaxRate(0);

        setIsCreateModalOpen(true);
    };

    const handleOrderSelect = (orderId: string) => {
        setFormData({ ...formData, orderId });
        if (orderId) {
            const order = orders.find(o => o.id === orderId);
            if (order) {
                setFormData(prev => ({ ...prev, supplierId: order.supplierId }));
                if (order.items && order.items.length > 0) {
                    const mappedItems = order.items.map((item: any) => ({
                        productId: item.productId || 'EXTERNAL',
                        productName: item.productName || '',
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0
                    }));
                    setBillItems(mappedItems);
                }
            }
        }
    };

    const handleProductSelect = (productId: string) => {
        setIsCustomProduct(false);
        setSelectedProduct(productId);
        const product = products.find((p: any) => p.id === productId);
        if (product) {
            setPrice(product.importPrice || 0);
            setCustomUnit(product.unit || 'Cái');
            setCustomTaxRate(product.taxRate || 0);
            if (useInventoryDescription) {
                setCustomDescription(product.description || '');
            }
        }
    };

    const handleDescSourceChange = (useInventory: boolean) => {
        setUseInventoryDescription(useInventory);
        if (useInventory && selectedProduct && !isCustomProduct) {
            const product = products.find((p: any) => p.id === selectedProduct);
            setCustomDescription(product?.description || '');
        } else if (!useInventory) {
            setCustomDescription('');
        }
    };

    const handleAddItem = () => {
        if (!isCustomProduct && !selectedProduct) {
            alert(t('purchaseBills.pleaseSelectProduct'));
            return;
        }
        if (isCustomProduct && !customName.trim()) {
            alert(t('purchaseBills.pleaseEnterCustomName'));
            return;
        }
        if (qty <= 0) {
            alert(t('purchaseBills.qtyMustBeGreaterThanZero'));
            return;
        }

        let taxRate = customTaxRate !== undefined ? customTaxRate : 0;
        let pId = 'EXTERNAL';
        let pName = customName;
        let pUnit = customUnit;

        if (!isCustomProduct) {
            const product = products.find((p: any) => p.id === selectedProduct);
            pId = selectedProduct;
            pName = product?.name || '';
            pUnit = product?.unit || 'Cái';
        }

        const effectiveUnitPrice = isPriceInclusiveVat ? calcPreTaxPrice(price, taxRate) : price;

        let newItem: any = {
            quantity: qty,
            unitPrice: effectiveUnitPrice,
            description: customDescription,
            taxRate: taxRate,
            productName: pName,
            customName: pName,
            productId: pId,
            unit: pUnit,
            saveToInventory: isCustomProduct ? saveToInventory : true
        };

        setBillItems(prev => [...prev, newItem]);

        // Reset the form
        setSelectedProduct('');
        setCustomName('');
        setCustomDescription('');
        setCustomUnit('Cái');
        setQty(1);
        setPrice(0);
        setSaveToInventory(true);
        setIsPriceInclusiveVat(false);
    };

    const handleRemoveItem = (index: number) => {
        setBillItems(billItems.filter((_, i) => i !== index));
    };

    const handleEditItem = (index: number) => {
        const item = billItems[index];
        if (item.productId && item.productId !== 'EXTERNAL') {
            setIsCustomProduct(false);
            setSelectedProduct(item.productId);
            setCustomName('');
            setCustomUnit('Cái');
            setCustomTaxRate(item.taxRate || 0);

            const prod = products.find((p: any) => p.id === item.productId);
            if (prod && item.description === (prod.description || '')) {
                setUseInventoryDescription(true);
            } else {
                setUseInventoryDescription(false);
            }
            setCustomDescription(item.description || '');
        } else {
            setIsCustomProduct(true);
            setSelectedProduct('');
            setCustomName(item.customName || item.productName || '');
            setCustomUnit(item.unit || '');
            setCustomTaxRate(item.taxRate || 0);
            setSaveToInventory(item.saveToInventory !== false);
            setUseInventoryDescription(false);
            setCustomDescription(item.description || '');
        }
        setPrice(item.unitPrice);
        setQty(item.quantity);

        handleRemoveItem(index);
    };

    const calculateSubTotal = () => {
        return billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    const calculateTax = () => {
        return billItems.reduce((sum, item) => sum + calcTaxAmount(item.quantity * item.unitPrice, item.taxRate), 0);
    };

    const calculateTotal = () => {
        return calculateSubTotal() + calculateTax();
    };

    const handleDelete = async (id: string, code: string) => {
        if (confirm(t('purchaseBills.deleteConfirm').replace('{{code}}', code))) {
            try {
                await deletePurchaseBill(id);
                setBills(bills.filter(b => b.id !== id));
            } catch (error: any) {
                alert(error.message || t('purchaseBills.deleteFailed'));
            }
        }
    };

    const handleCancel = async (id: string, code: string) => {
        if (confirm(t('purchaseBills.cancelConfirm').replace('{{code}}', code))) {
            setIsSubmitting(true);
            try {
                const updated = await cancelPurchaseBill(id);
                setBills(bills.map(b => b.id === updated.id ? { ...b, status: updated.status, notes: updated.notes } : b));
            } catch (error: any) {
                alert(error.message || t('purchaseBills.cancelFailed'));
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.supplierId) {
            alert(t('purchaseBills.pleaseSelectSupplier'));
            return;
        }

        if (billItems.length === 0) {
            alert(t('purchaseBills.pleaseAddItems'));
            return;
        }

        for (let i = 0; i < billItems.length; i++) {
            if (billItems[i].productId === 'EXTERNAL' && !billItems[i].productName?.trim()) {
                alert(t('purchaseBills.pleaseEnterProductName').replace('{{line}}', String(i + 1)));
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const submitData = {
                ...formData,
                attachment: formData.attachments.length > 0 ? JSON.stringify(formData.attachments) : null,
                subTotal: calculateSubTotal(),
                taxAmount: calculateTax(),
                totalAmount: calculateTotal(),
                items: billItems
            };

            let created;
            if ((formData as any).id) {
                created = await updatePurchaseBill((formData as any).id, submitData);
            } else {
                created = await createPurchaseBill(submitData);
            }

            const supplier = suppliers.find(s => s.id === formData.supplierId);
            const newBillUi = {
                ...created,
                supplier: supplier,
                _count: { items: billItems.length }
            };

            if ((formData as any).id) {
                setBills(bills.map((b: any) => b.id === newBillUi.id ? newBillUi : b));
            } else {
                setBills([newBillUi, ...bills]);
            }
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error(error);
            alert(t('purchaseBills.createFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        if (!approveWarehouseId) {
            alert(t('purchaseBills.pleaseSelectWarehouse'));
            return;
        }
        setIsSubmitting(true);
        try {
            const updated = await approvePurchaseBill(selectedBill.id, approveWarehouseId);
            setBills(bills.map(b => b.id === updated.id ? { ...b, status: updated.status } : b));
            setIsApproveModalOpen(false);
            alert(t('purchaseBills.approveSuccess'));
        } catch (error: any) {
            console.error(error);
            alert(error.message || t('purchaseBills.approveFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">{t('purchaseBills.statusDraft')}</span>;
            case 'APPROVED': return <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">{t('purchaseBills.statusApproved')}</span>;
            case 'PARTIAL_PAID': return <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-medium">{t('purchaseBills.statusPartial')}</span>;
            case 'PAID': return <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">{t('purchaseBills.statusPaid')}</span>;
            case 'CANCELLED': return <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium line-through">{t('purchaseBills.statusCancelled')}</span>;
            default: return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">{status}</span>;
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Top Page Tech Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            CHUỖI CUNG ỨNG &amp; MUA HÀNG
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">|</span>
                        <span className="text-[11px] font-medium text-slate-500">{t('purchaseBills.description')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{t('purchaseBills.title')}</h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                            {bills.length}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <button
                        onClick={handleOpenCreate}
                        className="btn btn-primary gap-2 h-[34px] px-3.5 text-xs font-bold rounded-lg shadow-sm inline-flex items-center"
                    >
                        <Plus size={15} className="stroke-[2.5]" />
                        <span>{t('purchaseBills.createBill')}</span>
                    </button>
                </div>
            </div>

            {/* Quick KPI Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 1. Tất cả */}
                <div
                    onClick={() => setStatusFilter('ALL')}
                    className={`rounded-xl p-3 bg-white border transition-all cursor-pointer shadow-2xs select-none ${
                        statusFilter === 'ALL'
                            ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('purchaseBills.all')}</span>
                        <FileText size={14} className="text-slate-400" />
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 tracking-tight">{stats.total}</div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">{t('purchaseBills.bills')} hệ thống</div>
                </div>

                {/* 2. Lưu nháp */}
                <div
                    onClick={() => setStatusFilter('DRAFT')}
                    className={`rounded-xl p-3 bg-white border transition-all cursor-pointer shadow-2xs select-none ${
                        statusFilter === 'DRAFT'
                            ? 'border-slate-500 bg-slate-50 ring-2 ring-slate-400/20 shadow-xs'
                            : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('purchaseBills.draft')}</span>
                        <Edit2 size={13} className="text-slate-400" />
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold font-mono text-slate-800 tracking-tight">{stats.draft.count}</div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">{t('purchaseBills.pendingApproval')}</div>
                </div>

                {/* 3. Đã duyệt (Nợ) */}
                <div
                    onClick={() => setStatusFilter('APPROVED')}
                    className={`rounded-xl p-3 bg-white border transition-all cursor-pointer shadow-2xs select-none ${
                        statusFilter === 'APPROVED'
                            ? 'border-rose-500 bg-rose-50/30 ring-2 ring-rose-500/20 shadow-xs'
                            : 'border-slate-200/90 hover:border-rose-200 hover:bg-rose-50/20'
                    }`}
                >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">{t('purchaseBills.approvedDebt')}</span>
                        <AlertTriangle size={14} className="text-rose-500" />
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold font-mono text-rose-600 tracking-tight">{stats.approved.count}</div>
                    <div className="text-[11px] font-bold font-mono text-rose-600 mt-0.5 truncate" title={formatMoney(stats.approved.amount)}>
                        {formatMoney(stats.approved.amount)}
                    </div>
                </div>

                {/* 4. Đã TT 1 phần */}
                <div
                    onClick={() => setStatusFilter('PARTIAL_PAID')}
                    className={`rounded-xl p-3 bg-white border transition-all cursor-pointer shadow-2xs select-none ${
                        statusFilter === 'PARTIAL_PAID'
                            ? 'border-amber-500 bg-amber-50/30 ring-2 ring-amber-500/20 shadow-xs'
                            : 'border-slate-200/90 hover:border-amber-200 hover:bg-amber-50/20'
                    }`}
                >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{t('purchaseBills.partialPaid')}</span>
                        <Clock size={14} className="text-amber-500" />
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold font-mono text-amber-600 tracking-tight">{stats.partial.count}</div>
                    <div className="text-[11px] font-bold font-mono text-amber-600 mt-0.5 truncate" title={`${t('purchaseBills.debt')}: ${formatMoney(stats.partial.amount)}`}>
                        {t('purchaseBills.debt')}: {formatMoney(stats.partial.amount)}
                    </div>
                </div>

                {/* 5. Đã thanh toán */}
                <div
                    onClick={() => setStatusFilter('PAID')}
                    className={`rounded-xl p-3 bg-white border transition-all cursor-pointer shadow-2xs select-none col-span-2 sm:col-span-1 ${
                        statusFilter === 'PAID'
                            ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200/90 hover:border-emerald-200 hover:bg-emerald-50/20'
                    }`}
                >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{t('purchaseBills.paid')}</span>
                        <CheckCircle size={14} className="text-emerald-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold font-mono text-emerald-700 tracking-tight">{stats.paid.count}</div>
                    <div className="text-[11px] font-medium text-emerald-600 mt-0.5">{t('purchaseBills.completed')}</div>
                </div>
            </div>

            {/* Main Data Table Container */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Search & Status Filters Bar */}
                <div className="p-3 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="relative w-full sm:w-[320px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder={t('purchaseBills.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-[34px] pl-9 pr-8 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {statusFilter !== 'ALL' && (
                            <button
                                onClick={() => setStatusFilter('ALL')}
                                className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <span>Bộ lọc: {statusFilter}</span>
                                <X size={11} />
                            </button>
                        )}
                        <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                            Hiển thị <span className="text-slate-900 font-bold">{sortedBills.length}</span> / {bills.length} hóa đơn
                        </span>
                    </div>
                </div>

                {/* High Density Table */}
                <div className="overflow-x-auto">
                    {isMounted ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/90 bg-slate-100/70">
                                    <th onClick={() => requestSort('code')} className="cursor-pointer select-none py-2.5 px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[105px] hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center gap-1">
                                            {t('purchaseBills.colSystemCode')}
                                            <ArrowUpDown size={11} className="opacity-40" />
                                        </div>
                                    </th>
                                    <th onClick={() => requestSort('supplierInvoice')} className="cursor-pointer select-none py-2.5 px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[105px] hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center gap-1">
                                            {t('purchaseBills.colSupplierInvoice')}
                                            <ArrowUpDown size={11} className="opacity-40" />
                                        </div>
                                    </th>
                                    <th onClick={() => requestSort('date')} className="cursor-pointer select-none py-2.5 px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center gap-1">
                                            {t('purchaseBills.colDateSupplier')}
                                            <ArrowUpDown size={11} className="opacity-40" />
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[140px]">
                                        {t('purchaseBills.colTags')}
                                    </th>
                                    <th onClick={() => requestSort('dueDate')} className="cursor-pointer select-none py-2.5 px-3 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[95px] hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center justify-center gap-1">
                                            {t('purchaseBills.colDueDate')}
                                            <ArrowUpDown size={11} className="opacity-40" />
                                        </div>
                                    </th>
                                    <th onClick={() => requestSort('totalAmount')} className="cursor-pointer select-none py-2.5 px-3 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[125px] hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center justify-end gap-1">
                                            {t('purchaseBills.colTotal')}
                                            <ArrowUpDown size={11} className="opacity-40" />
                                        </div>
                                    </th>
                                    <th onClick={() => requestSort('paidAmount')} className="cursor-pointer select-none py-2.5 px-3 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[125px] hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center justify-end gap-1">
                                            {t('purchaseBills.colPaid')}
                                            <ArrowUpDown size={11} className="opacity-40" />
                                        </div>
                                    </th>
                                    <th onClick={() => requestSort('status')} className="cursor-pointer select-none py-2.5 px-3 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[115px] hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center justify-center gap-1">
                                            {t('purchaseBills.colStatus')}
                                            <ArrowUpDown size={11} className="opacity-40" />
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[95px]">
                                        {t('purchaseBills.colActions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <Search size={16} />
                                                </div>
                                                <p className="text-xs font-semibold text-slate-600">{t('purchaseBills.noBillsFound')}</p>
                                                <p className="text-[11px] text-slate-400">Không có hóa đơn mua hàng nào phù hợp với bộ lọc.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedItems.map((bill) => {
                                        const isOverdue = bill.dueDate && new Date(bill.dueDate).getTime() < new Date().getTime() && bill.status !== 'PAID' && bill.status !== 'CANCELLED' && (bill.totalAmount - (bill.paidAmount || 0)) > 0;

                                        return (
                                            <tr key={bill.id} className={`hover:bg-slate-50/80 transition-colors group ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                                                <td className="py-2 px-3 align-middle">
                                                    <Link
                                                        href={`/purchasing/bills/${bill.id}`}
                                                        className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 hover:bg-emerald-100 hover:text-emerald-800 transition-colors inline-block shadow-2xs"
                                                    >
                                                        {bill.code}
                                                    </Link>
                                                </td>
                                                <td className="py-2 px-3 align-middle">
                                                    <span className="font-mono text-[11px] font-medium text-slate-600">
                                                        {bill.supplierInvoice || '—'}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 align-middle">
                                                    <div className="flex flex-col min-w-0">
                                                        <Link
                                                            href={`/suppliers/${bill.supplierId}`}
                                                            className="font-semibold text-xs text-slate-900 hover:text-emerald-700 transition-colors block truncate max-w-[260px] sm:max-w-[340px]"
                                                            title={bill.supplier?.name}
                                                        >
                                                            {bill.supplier?.name || '—'}
                                                        </Link>
                                                        <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-slate-400">
                                                            <span className="flex items-center gap-1 font-mono">
                                                                <Calendar size={10.5} className="text-slate-400" />
                                                                {formatDate(bill.date)}
                                                            </span>
                                                            {bill.project && (
                                                                <span className="text-slate-500 truncate max-w-[150px]">
                                                                    • DA: {bill.project.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2 px-3 align-middle">
                                                    <TagDisplay tagsString={bill.tags} />
                                                </td>
                                                <td className="py-2 px-3 align-middle text-center">
                                                    <span className={`font-mono text-[11px] ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                                                        {bill.dueDate ? formatDate(bill.dueDate) : '—'}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 align-middle text-right">
                                                    <span className="font-mono text-xs font-bold text-slate-800">
                                                        {formatMoney(bill.totalAmount || 0)}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 align-middle text-right">
                                                    <span className="font-mono text-xs font-semibold text-emerald-600">
                                                        {formatMoney(bill.paidAmount || 0)}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 align-middle text-center">
                                                    <StatusBadge status={bill.status} />
                                                </td>
                                                <td className="py-2 px-3 align-middle text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                                        <Link
                                                            href={`/purchasing/bills/${bill.id}`}
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                                                            title={t('purchaseBills.viewTooltip')}
                                                        >
                                                            <Eye size={14} />
                                                        </Link>
                                                        {bill.status !== 'CANCELLED' && (
                                                            <button
                                                                onClick={() => handleEdit(bill)}
                                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer"
                                                                title={bill.status === 'DRAFT' ? t('purchaseBills.editTooltip') : 'Điều chỉnh hóa đơn đã duyệt'}
                                                            >
                                                                <Edit2 size={13.5} />
                                                            </button>
                                                        )}
                                                        {bill.status === 'DRAFT' && (
                                                            <>
                                                                <button
                                                                    onClick={() => { setSelectedBill(bill); setIsApproveModalOpen(true); }}
                                                                    className="h-7 px-2 rounded-lg flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                                                                    title={t('purchaseBills.approveTooltip')}
                                                                >
                                                                    <CheckCircle size={13} />
                                                                    <span>{t('purchaseBills.approveBtn')}</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(bill.id, bill.code)}
                                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                                                    title={t('purchaseBills.deleteTooltip')}
                                                                >
                                                                    <Trash2 size={13.5} />
                                                                </button>
                                                            </>
                                                        )}
                                                        {bill.status === 'APPROVED' && (
                                                            <button
                                                                onClick={() => handleCancel(bill.id, bill.code)}
                                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-amber-600 transition-colors cursor-pointer"
                                                                title={t('purchaseBills.cancelBillTooltip')}
                                                            >
                                                                <XCircle size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div className="h-[300px] w-full bg-slate-50/50 animate-pulse"></div>
                    )}
                </div>

                {/* Pagination */}
                <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
                    <Pagination {...paginationProps} />
                </div>
            </div>

            {/* Approve Modal */}
            {isApproveModalOpen && selectedBill && (
                <div className="modal-backdrop">
                    <div className="modal-container max-w-md p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <CheckCircle className="text-blue-500" /> {t('purchaseBills.approveModalTitle').replace('{{code}}', selectedBill.code)}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            {t('purchaseBills.approveModalWarning1')}
                            <br />{t('purchaseBills.approveModalWarning2')}
                            <br />{t('purchaseBills.approveModalWarning3')} <b>{selectedBill.supplier?.name}</b>.
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchaseBills.selectWarehouse')}</label>
                            <SearchableSelect
                                value={approveWarehouseId}
                                onChange={(val) => setApproveWarehouseId(val)}
                                options={warehouseOptions}
                                placeholder={t('purchaseBills.selectWarehousePlaceholder')}
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsApproveModalOpen(false)} className="btn btn-secondary">{t('purchaseBills.cancelModalBtn')}</button>
                            <button onClick={handleApprove} disabled={isSubmitting || !approveWarehouseId} className="btn btn-primary">{isSubmitting ? t('purchaseBills.approvingBtn') : t('purchaseBills.approveModalBtn')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal (similar to PO but with invoice inputs) */}
            {isCreateModalOpen && (
                <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, padding: '1rem', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(2px)' }}>
                    <div className="modal-container flex max-w-[920px] w-full shadow-2xl" style={{ maxHeight: '92vh', background: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white">
                            <h2 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                                <FileDown className="text-primary" size={18} /> {(formData as any).id ? t('purchaseBills.editTitle') : t('purchaseBills.addTitle')}
                            </h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 120px)' }}>
                            {(formData as any).id && (formData as any).status && (formData as any).status !== 'DRAFT' && (
                                <div className="p-3 mb-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
                                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={15} />
                                    <div>
                                        <strong className="block font-semibold mb-0.5 text-xs">Điều chỉnh hóa đơn đã duyệt & ghi nhận nợ</strong>
                                        Hóa đơn này đã được ghi nhận nợ và nhập kho. Khi lưu điều chỉnh, hệ thống sẽ <strong>tự động hoàn tác và cập nhật lại tồn kho & công nợ nhà cung cấp</strong> tương ứng với danh sách sản phẩm mới, đồng thời ghi log chi tiết.
                                    </div>
                                </div>
                            )}
                            <form id="billForm" onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
                                    <div className="sm:col-span-2 lg:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseBills.supplierLabel')}</label>
                                        <SearchableSelect
                                            value={formData.supplierId}
                                            onChange={(val) => setFormData({ ...formData, supplierId: val })}
                                            options={supplierFormOptions}
                                            placeholder={t('purchaseBills.selectSupplier')}
                                        />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Dự án</label>
                                        <SearchableSelect
                                            value={formData.projectId || ''}
                                            onChange={(val) => setFormData({ ...formData, projectId: val })}
                                            options={[{ value: '', label: '-- Không thuộc dự án --' }, ...(projects || []).map((p: any) => ({ value: p.id, label: `${p.code} - ${p.title}` }))]}
                                            placeholder="Chọn dự án"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseBills.orderLabel')}</label>
                                        <SearchableSelect
                                            value={formData.orderId || ''}
                                            onChange={handleOrderSelect}
                                            options={[{ value: '', label: t('purchaseBills.selectOrder') }, ...orders.filter((o: any) => o.status !== 'DRAFT').map((o: any) => ({ value: o.id, label: `${o.code} - ${o.supplier?.name}` }))]}
                                            placeholder="-- Từ PO --"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseBills.dateLabel')}</label>
                                        <input type="date" required value={formData.date} onChange={e => {
                                            const newDateStr = e.target.value;
                                            if (newDateStr) {
                                                const d = new Date(newDateStr);
                                                d.setDate(d.getDate() + 30);
                                                setFormData({ ...formData, date: newDateStr, dueDate: d.toISOString().substring(0, 10) });
                                            } else {
                                                setFormData({ ...formData, date: newDateStr });
                                            }
                                        }} className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseBills.dueDateLabel')}</label>
                                        <input type="date" required value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseBills.supplierInvoiceLabel')}</label>
                                        <input type="text" value={formData.supplierInvoice} onChange={e => setFormData({ ...formData, supplierInvoice: e.target.value })} className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400" placeholder="VD: HD-1234" />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseBills.notesLabel')}</label>
                                        <input type="text" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400" placeholder="Ghi chú thêm..." />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseBills.tagsLabel')}</label>
                                        <input type="text" value={formData.tags || ''} onChange={e => setFormData({ ...formData, tags: e.target.value })} className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400" placeholder="VD: Nhập khẩu, Quan trọng..." />
                                    </div>
                                </div>

                                {/* Attachments Section */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <FileText size={14} className="text-slate-500" /> {t('purchaseBills.attachments')}
                                    </h3>

                                    {formData.attachments.length > 0 && (
                                        <div className="space-y-1.5 mb-2.5">
                                            {formData.attachments.map((doc, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                                                            <FileText size={15} />
                                                        </div>
                                                        <div>
                                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 hover:underline">
                                                                {doc.name}
                                                            </a>
                                                            <div className="text-[11px] text-slate-400">
                                                                {new Date(doc.uploadedAt).toLocaleString('vi-VN')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        title={t('purchaseBills.deleteFileTooltip')}
                                                        onClick={() => {
                                                            const newDocs = [...formData.attachments];
                                                            newDocs.splice(idx, 1);
                                                            setFormData({ ...formData, attachments: newDocs });
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="relative inline-block w-full sm:w-auto">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            disabled={isUploading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setIsUploading(true);
                                                try {
                                                    const uploadData = new FormData();
                                                    uploadData.append('file', file);
                                                    const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
                                                    const data = await res.json();
                                                    if (!res.ok) throw new Error(data.error);

                                                    setFormData({
                                                        ...formData,
                                                        attachments: [
                                                            ...formData.attachments,
                                                            { url: data.url, name: file.name, uploadedAt: new Date().toISOString() }
                                                        ]
                                                    });
                                                } catch (err: any) {
                                                    alert(err.message || t('purchaseBills.uploadError'));
                                                } finally {
                                                    setIsUploading(false);
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            disabled={isUploading}
                                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isUploading ? (
                                                <span className="flex items-center gap-1.5">
                                                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> {t('purchaseBills.uploadingBtn')}
                                                </span>
                                            ) : (
                                                <><Plus size={14} /> {t('purchaseBills.addDocumentBtn')}</>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Products Table */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <FileText size={14} className="text-slate-500" /> {t('purchaseBills.itemsTitle')}
                                        </h3>
                                    </div>

                                    {/* Sub-Form for Add Item */}
                                    <div className="flex flex-col bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs mb-3">
                                        <div className="mb-3 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-2.5">
                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                                                <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={!isCustomProduct} onChange={() => setIsCustomProduct(false)} />
                                                <span>{t('purchaseBills.selectFromInventory')}</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                                                <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={isCustomProduct} onChange={() => setIsCustomProduct(true)} />
                                                <span>{t('purchaseBills.customEntry')}</span>
                                            </label>
                                            {isCustomProduct && (
                                                <label className={`flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold px-2 py-0.5 rounded-md border select-none transition-all ${saveToInventory ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70' : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={saveToInventory}
                                                        onChange={(e) => setSaveToInventory(e.target.checked)}
                                                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                                                    />
                                                    <span>{saveToInventory ? '✨ Tự động lưu vào kho' : '⚡ Không lưu kho (Dùng 1 lần)'}</span>
                                                </label>
                                            )}
                                            <div className="ml-auto">
                                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-emerald-900 bg-emerald-50/80 border border-emerald-200 px-2.5 py-1 rounded-lg select-none hover:bg-emerald-100/80 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={isPriceInclusiveVat}
                                                        onChange={(e) => setIsPriceInclusiveVat(e.target.checked)}
                                                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                                                    />
                                                    <span>Đã có thuế VAT (Nhập giá sau thuế)</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-2.5 md:items-end mb-2">
                                            <div className="flex-1 w-full min-w-0">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseBills.productNameLabel')}</label>
                                                {!isCustomProduct ? (
                                                    <SearchableSelect
                                                        options={products.map((p: any) => ({ value: p.id, label: `${p.sku} - ${p.name}` }))}
                                                        value={selectedProduct || ''}
                                                        onChange={handleProductSelect}
                                                        placeholder={t('purchaseBills.selectProductPlaceholder')}
                                                    />
                                                ) : (
                                                    <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400" placeholder={t('purchaseBills.customNamePlaceholder')} value={customName} onChange={e => setCustomName(e.target.value)} />
                                                )}
                                            </div>
                                            {isCustomProduct && (
                                                <div className="w-full md:w-20">
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseBills.unitLabel')}</label>
                                                    <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white text-center" placeholder={t('purchaseBills.unitPlaceholder')} value={customUnit} onChange={e => setCustomUnit(e.target.value)} />
                                                </div>
                                            )}
                                            <div className="w-full md:w-36">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                    {isPriceInclusiveVat ? 'Đơn giá (gồm VAT)' : t('purchaseBills.unitPriceLabel')}
                                                </label>
                                                <input type="number" step="any" min="0" className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none transition-all text-slate-900 bg-white ${isPriceInclusiveVat ? 'border-emerald-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-emerald-50/20 font-semibold text-emerald-800' : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'}`} value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} />
                                            </div>
                                            <div className="w-full md:w-24">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseBills.taxLabel')}</label>
                                                <TaxRateSelect
                                                    value={customTaxRate}
                                                    onChange={(val) => setCustomTaxRate(val)}
                                                />
                                            </div>
                                            <div className="w-full md:w-16">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseBills.qtyLabel')}</label>
                                                <input type="number" step="any" min="0.0001" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-center text-slate-900 bg-white" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 0)} />
                                            </div>
                                            <button type="button" onClick={handleAddItem} className="h-[34px] px-5 border border-primary/40 text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all text-xs font-semibold rounded-lg shrink-0">{t('purchaseBills.addItemBtn')}</button>
                                        </div>

                                        {/* Realtime calculation preview when isPriceInclusiveVat is ON */}
                                        {isPriceInclusiveVat && price > 0 && (
                                            <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex flex-wrap items-center gap-x-4 gap-y-1 text-emerald-900 shadow-2xs">
                                                <div>💡 <strong>Giá đã gồm VAT:</strong> {formatMoney(price)}</div>
                                                <div>➔ <strong>Đơn giá trước thuế:</strong> <span className="font-bold text-blue-700">{formatMoney(calcPreTaxPrice(price, customTaxRate))}</span></div>
                                                <div>➔ <strong>Thuế suất:</strong> <TaxBadge rate={customTaxRate} /></div>
                                                <div>➔ <strong>Tiền thuế/SP:</strong> <span className="font-semibold text-amber-700">{formatMoney(price - calcPreTaxPrice(price, customTaxRate))}</span></div>
                                                <div>➔ <strong>Thành tiền ({qty} {isCustomProduct ? customUnit : (products.find((p: any) => p.id === selectedProduct)?.unit || 'Cái')}):</strong> <span className="font-bold text-emerald-700">{formatMoney(price * qty)}</span></div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseBills.itemNotesLabel')} <span className="text-slate-400 font-normal">({t('purchaseBills.printedOnTransfer')})</span></label>
                                            <div className="flex flex-wrap items-center gap-4 mb-1.5">
                                                <label className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium ${isCustomProduct ? 'text-slate-400' : 'text-slate-700'}`}>
                                                    <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={useInventoryDescription && !isCustomProduct} onChange={() => handleDescSourceChange(true)} disabled={isCustomProduct} />
                                                    <span>{t('purchaseBills.useInventoryDesc')}</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                                                    <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={!useInventoryDescription || isCustomProduct} onChange={() => handleDescSourceChange(false)} />
                                                    <span>{t('purchaseBills.customDesc')}</span>
                                                </label>
                                            </div>
                                            <textarea rows={2} className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none text-slate-900 bg-white placeholder:text-slate-400" placeholder={t('purchaseBills.itemNotesPlaceholder')} value={customDescription} onChange={e => setCustomDescription(e.target.value)}></textarea>
                                        </div>
                                    </div>

                                    {/* Read-Only Items Table */}
                                    {billItems.length > 0 && (
                                        <div className="border border-slate-200 rounded-xl overflow-x-auto mt-2 border-t pt-3">
                                            <table className="w-full min-w-[600px] text-xs mb-3 bg-white text-left">
                                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                                    <tr>
                                                        <th className="p-2.5 font-semibold">{t('purchaseBills.colProductName')}</th>
                                                        <th className="p-2.5 font-semibold text-center w-20">{t('purchaseBills.colQty')}</th>
                                                        <th className="p-2.5 font-semibold text-right w-32">{t('purchaseBills.colUnitPrice')}</th>
                                                        <th className="p-2.5 font-semibold text-center w-24">{t('purchaseBills.colTax')}</th>
                                                        <th className="p-2.5 font-semibold text-right w-36">{t('purchaseBills.colLineTotal')}</th>
                                                        <th className="p-2.5 font-semibold text-center w-16"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {billItems.map((item, i) => {
                                                        const rowSubtotal = item.quantity * item.unitPrice;
                                                        const rowTax = calcTaxAmount(rowSubtotal, item.taxRate);
                                                        const rowTotal = rowSubtotal + rowTax;
                                                        return (
                                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                                <td className="p-2.5 text-slate-800">
                                                                    <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                                                                        <span>{item.productName || item.customName}</span>
                                                                        {item.saveToInventory === false && (
                                                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200" title="Sản phẩm dùng 1 lần cho hóa đơn mua này, không lưu vào kho">
                                                                                ⚡ Dùng 1 lần
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {item.description && <div className="text-[11px] text-slate-500 mt-0.5 max-w-sm whitespace-pre-wrap">{item.description}</div>}
                                                                </td>
                                                                <td className="p-2.5 text-center text-slate-800">
                                                                    {item.quantity} <span className="text-[11px] text-slate-500 ml-1">{item.unit}</span>
                                                                </td>
                                                                <td className="p-2.5 text-right text-slate-600 font-medium">{formatMoney(item.unitPrice)}</td>
                                                                <td className="p-2.5 text-center bg-slate-50/50 border-x border-slate-100">
                                                                    <TaxBadge rate={item.taxRate} />
                                                                </td>
                                                                <td className="p-2.5 text-right font-semibold text-slate-800">{formatMoney(rowTotal)}</td>
                                                                <td className="p-2.5 text-center">
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <button type="button" onClick={() => handleEditItem(i)} className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors" title={t('purchaseBills.editItemTooltip')}><Edit2 size={13} /></button>
                                                                        <button type="button" onClick={() => handleRemoveItem(i)} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors" title={t('purchaseBills.removeItemTooltip')}><Trash2 size={13} /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-slate-50/80 border-t border-slate-200">
                                                        <td colSpan={4} className="p-2.5 text-right font-medium text-slate-600 text-xs">{t('purchaseBills.subTotal')}:</td>
                                                        <td className="p-2.5 text-right font-semibold text-slate-800 text-xs">{formatMoney(calculateSubTotal())}</td>
                                                        <td className="p-2.5"></td>
                                                    </tr>
                                                    <tr className="bg-slate-50/80">
                                                        <td colSpan={4} className="p-2.5 text-right font-medium text-slate-600 text-xs">{t('purchaseBills.totalTax')}:</td>
                                                        <td className="p-2.5 text-right font-semibold text-slate-800 text-xs">{formatMoney(calculateTax())}</td>
                                                        <td className="p-2.5"></td>
                                                    </tr>
                                                    <tr className="bg-emerald-50/50 border-t border-emerald-200">
                                                        <td colSpan={4} className="p-2.5 text-right font-bold text-slate-800 text-xs">{t('purchaseBills.grandTotal')}:</td>
                                                        <td className="p-2.5 text-right font-bold text-emerald-700 text-sm">{formatMoney(calculateTotal())}</td>
                                                        <td className="p-2.5"></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2.5 mt-auto">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="h-[34px] px-4 border border-slate-300 rounded-lg hover:bg-white text-xs font-semibold text-slate-600 transition-all">{t('purchaseBills.cancelBtn')}</button>
                            <button type="submit" form="billForm" disabled={isSubmitting || billItems.length === 0} className="h-[34px] px-5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 text-xs font-bold shadow-xs transition-all">{isSubmitting ? t('purchaseBills.savingBtn') : t('purchaseBills.saveBtn')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
