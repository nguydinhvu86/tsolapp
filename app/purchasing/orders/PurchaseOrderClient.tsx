'use client';
import { formatMoney, formatDate, formatTaxRate, calcPreTaxPrice, calcTaxAmount } from '@/lib/utils/formatters';
import { TaxRateSelect, TaxBadge } from '@/app/components/ui/TaxRateSelect';

import React, { useState } from 'react';
import { Plus, Search, Eye, Trash2, Calendar, FileText, ShoppingCart, ArrowUpDown, Edit2, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createPurchaseOrder, deletePurchaseOrder, updatePurchaseOrder } from '@/app/purchasing/actions';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { useTranslation } from '@/app/i18n/LanguageContext';

export function PurchaseOrderClient({ initialOrders, suppliers, products }: { initialOrders: any[], suppliers: any[], products: any[] }) {
    const { t } = useTranslation();
    const [orders, setOrders] = useState(initialOrders);
    const [searchQuery, setSearchQuery] = useState('');

    // Sort logic
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

    const supplierFilterOptions = [{ value: '', label: t('purchaseOrders.allSuppliers') }, ...suppliers.map((s: any) => ({ value: s.id, label: s.name }))];
    const supplierFormOptions = [{ value: '', label: t('purchaseOrders.selectSupplier') }, ...suppliers.map((s: any) => ({ value: s.id, label: `${s.name} - ${s.code}` }))];
    const productOptions = [{ value: '', label: 'Lựa chọn...' }, { value: 'EXTERNAL', label: '+ Nhập Sản Phẩm tùy chỉnh ngoài hệ thống...' }, ...products.map((p: any) => ({ value: p.id, label: p.code ? `[${p.code}] ${p.name}` : p.name }))];

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Filters
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterSupplierId, setFilterSupplierId] = useState('');
    const [formData, setFormData] = useState({
        supplierId: '',
        date: new Date().toISOString().substring(0, 10),
        notes: '',
        status: 'DRAFT',
    });

    // Order Items Form State
    const [orderItems, setOrderItems] = useState<Array<{ productId: string, productName?: string, quantity: number, unitPrice: number, taxRate: number, description?: string, unit?: string, customName?: string, saveToInventory?: boolean }>>([]);
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
        if (supplierId) {
            setFormData(prev => ({ ...prev, supplierId }));
            setIsCreateModalOpen(true);
            hasOpenedFromUrl.current = true;
        }
    }, [searchParams]);

    const filteredOrders = orders.filter(o => {
        const matchesSearch = (o.code && o.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (o.supplier && o.supplier.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesSupplier = filterSupplierId ? o.supplierId === filterSupplierId : true;

        let matchesDate = true;
        if (filterDateFrom && filterDateTo) {
            const orderDate = new Date(o.date).getTime();
            const from = new Date(filterDateFrom).getTime();
            const to = new Date(filterDateTo).getTime();
            matchesDate = orderDate >= from && orderDate <= to;
        } else if (filterDateFrom) {
            const orderDate = new Date(o.date).getTime();
            const from = new Date(filterDateFrom).getTime();
            matchesDate = orderDate >= from;
        } else if (filterDateTo) {
            const orderDate = new Date(o.date).getTime();
            const to = new Date(filterDateTo).getTime();
            matchesDate = orderDate <= to;
        }

        return matchesSearch && matchesSupplier && matchesDate;
    });

    const sortedOrders = React.useMemo(() => {
        let sortableItems = [...filteredOrders];
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
    }, [filteredOrders, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const { paginatedItems, paginationProps } = usePagination(sortedOrders);

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 6, minimumFractionDigits: 0 }).format(amount || 0);
    };


    const handleOpenCreate = () => {
        setFormData({ supplierId: '', date: new Date().toISOString().substring(0, 10), notes: '', status: 'DRAFT', id: undefined } as any);
        setOrderItems([]);

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

    const handleEdit = (order: any) => {
        setFormData({
            id: order.id,
            code: order.code,
            supplierId: order.supplierId,
            date: order.date ? new Date(order.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
            notes: order.notes || '',
            status: order.status || 'DRAFT',
        } as any);
        setOrderItems(order.items?.map((i: any) => ({
            productId: i.productId || 'EXTERNAL',
            productName: i.product?.name || i.productName || '',
            customName: i.productName || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0,
            unit: i.unit || i.product?.unit || 'Cái',
            description: i.description || i.notes || '',
            saveToInventory: i.saveToInventory !== false
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
            alert(t('purchaseOrders.pleaseSelectProduct'));
            return;
        }
        if (isCustomProduct && !customName.trim()) {
            alert(t('purchaseOrders.pleaseEnterCustomName'));
            return;
        }
        if (qty <= 0) {
            alert(t('purchaseOrders.qtyMustBeGreaterThanZero'));
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

        setOrderItems(prev => [...prev, newItem]);

        // Reset the form
        setSelectedProduct('');
        setCustomName('');
        setCustomDescription('');
        setCustomUnit('Cái');
        setSaveToInventory(true);
        setQty(1);
        setPrice(0);
        setIsPriceInclusiveVat(false);
    };

    const handleRemoveItem = (index: number) => {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    };

    const handleEditItem = (index: number) => {
        const item = orderItems[index];
        if (item.productId && item.productId !== 'EXTERNAL') {
            setIsCustomProduct(false);
            setSelectedProduct(item.productId);
            setCustomName('');
            setCustomUnit('Cái');
            setCustomTaxRate(item.taxRate || 0);
            setSaveToInventory(true);

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
        return orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    const calculateTax = () => {
        return orderItems.reduce((sum, item) => sum + calcTaxAmount(item.quantity * item.unitPrice, item.taxRate), 0);
    };

    const calculateTotal = () => {
        return calculateSubTotal() + calculateTax();
    };

    const handleDelete = async (id: string, code: string) => {
        if (confirm(t('purchaseOrders.deleteConfirm').replace('{{code}}', code))) {
            try {
                await deletePurchaseOrder(id);
                setOrders(orders.filter(o => o.id !== id));
            } catch (error: any) {
                alert(error.message || t('purchaseOrders.deleteFailed'));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.supplierId) {
            alert(t('purchaseOrders.pleaseSelectSupplier'));
            return;
        }

        if (orderItems.length === 0) {
            alert(t('purchaseOrders.pleaseAddItems'));
            return;
        }

        for (let i = 0; i < orderItems.length; i++) {
            if (orderItems[i].productId === 'EXTERNAL' && !orderItems[i].productName?.trim()) {
                alert(t('purchaseOrders.pleaseEnterProductName').replace('{{line}}', (i + 1).toString()));
                return;
            }
            if (!orderItems[i].productId || orderItems[i].quantity <= 0) {
                alert(t('purchaseOrders.invalidProduct').replace('{{line}}', (i + 1).toString()));
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const submitData = {
                ...formData,
                subTotal: calculateSubTotal(),
                taxAmount: calculateTax(),
                totalAmount: calculateTotal(),
                items: orderItems
            };

            let created;
            if ((formData as any).id) {
                created = await updatePurchaseOrder((formData as any).id, submitData);
            } else {
                created = await createPurchaseOrder(submitData);
            }

            // Re-fetch or manually construct the new object for UI
            const supplier = suppliers.find(s => s.id === formData.supplierId);
            const newOrderUi = {
                ...created,
                supplier: supplier,
                _count: { items: orderItems.length }
            };

            setOrders([newOrderUi, ...orders]);
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error(error);
            alert(t('purchaseOrders.createFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">{t('purchaseOrders.statusDraft')}</span>;
            case 'SENT': return <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">{t('purchaseOrders.statusSent')}</span>;
            case 'PARTIAL_RECEIVED': return <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-medium">{t('purchaseOrders.statusPartial')}</span>;
            case 'COMPLETED': return <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">{t('purchaseOrders.statusCompleted')}</span>;
            case 'CANCELLED': return <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">{t('purchaseOrders.statusCancelled')}</span>;
            default: return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">{status}</span>;
        }
    };

    const stats = React.useMemo(() => {
        let total = orders.length;
        let totalAmount = 0;
        let draftCount = 0;
        let completedCount = 0;
        orders.forEach(o => {
            totalAmount += (o.totalAmount || 0);
            if (o.status === 'DRAFT') draftCount++;
            if (o.status === 'COMPLETED') completedCount++;
        });
        return { total, totalAmount, draftCount, completedCount };
    }, [orders]);

    return (
        <div className="p-8">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('purchaseOrders.title')}</h1>
                    <p className="text-sm text-slate-500">{t('purchaseOrders.description')}</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="btn btn-primary shadow-sm flex items-center gap-2"
                >
                    <Plus size={18} />
                    <span>{t('purchaseOrders.createOrder')}</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="stat-card stat-card-emerald">
                    <div className="stat-title text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{t('purchaseOrders.totalOrders')}</div>
                    <div className="stat-value text-2xl font-black text-slate-900">{stats.total}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">{t('purchaseOrders.title')}</div>
                </div>

                <div className="stat-card stat-card-blue">
                    <div className="stat-title text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{t('purchaseOrders.totalAmount')}</div>
                    <div className="stat-value text-2xl font-black text-emerald-600">{formatMoney(stats.totalAmount)}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">Tổng giá trị đơn đặt</div>
                </div>

                <div className="stat-card stat-card-amber">
                    <div className="stat-title text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{t('purchaseOrders.statusDraft')}</div>
                    <div className="stat-value text-2xl font-black text-amber-600">{stats.draftCount}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">Đơn hàng nháp</div>
                </div>

                <div className="stat-card stat-card-green">
                    <div className="stat-title text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{t('purchaseOrders.statusCompleted')}</div>
                    <div className="stat-value text-2xl font-black text-emerald-700">{stats.completedCount}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">Đã hoàn thành</div>
                </div>
            </div>

            {/* Filter Ribbon */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 mb-6 shadow-sm flex gap-3 items-center flex-wrap">
                {/* Search input */}
                <div className="flex-1 min-w-[240px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder={t('purchaseOrders.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-8 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-800 placeholder:text-slate-400 transition-all font-medium"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Supplier Filter */}
                <div className="w-[200px] shrink-0">
                    <SearchableSelect
                        value={filterSupplierId}
                        onChange={(val) => setFilterSupplierId(val)}
                        options={supplierFilterOptions}
                        placeholder={t('purchaseOrders.allSuppliers')}
                    />
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="h-9 px-2.5 text-[12px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-700 font-medium"
                        title={t('purchaseOrders.from')}
                    />
                    <span className="text-slate-400 text-xs">-</span>
                    <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="h-9 px-2.5 text-[12px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-700 font-medium"
                        title={t('purchaseOrders.to')}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('code')} className="cursor-pointer hover:bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                <div className="flex items-center gap-1">{t('purchaseOrders.code')} <ArrowUpDown size={13} className="text-slate-400" /></div>
                            </th>
                            <th onClick={() => requestSort('date')} className="cursor-pointer hover:bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                <div className="flex items-center gap-1">{t('purchaseOrders.dateAndSupplier')} <ArrowUpDown size={13} className="text-slate-400" /></div>
                            </th>
                            <th className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('purchaseOrders.itemCount')}</th>
                            <th onClick={() => requestSort('totalAmount')} className="cursor-pointer hover:bg-slate-100/80 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                <div className="flex items-center justify-end gap-1">{t('purchaseOrders.total')} <ArrowUpDown size={13} className="text-slate-400" /></div>
                            </th>
                            <th onClick={() => requestSort('status')} className="cursor-pointer hover:bg-slate-100/80 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                <div className="flex items-center justify-center gap-1">{t('purchaseOrders.status')} <ArrowUpDown size={13} className="text-slate-400" /></div>
                            </th>
                            <th className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('purchaseOrders.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedItems.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500 font-medium text-[13px]">
                                    {t('purchaseOrders.noOrdersFound')}
                                </td>
                            </tr>
                        ) : (
                            paginatedItems.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="p-3 text-[13px] whitespace-nowrap">
                                        <Link href={`/purchasing/orders/${order.id}`} className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 hover:bg-emerald-100 hover:text-emerald-800 transition-colors inline-block">
                                            {order.code}
                                        </Link>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                                            <Calendar size={12} className="text-slate-400" /> {formatDate(order.date)}
                                        </div>
                                        <Link href={`/suppliers/${order.supplierId}`} className="font-semibold text-[13px] text-slate-900 hover:text-emerald-600 transition-colors">
                                            {order.supplier?.name}
                                        </Link>
                                    </td>
                                    <td className="p-3 text-center text-[13px] text-slate-600 dark:text-slate-400 font-semibold">
                                        {order._count?.items || 0}
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className="font-bold text-[13px] text-slate-900 dark:text-slate-100">
                                            {formatMoney(order.totalAmount || 0)}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <StatusBadge status={order.status} />
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-center gap-1">
                                            {order.status === 'DRAFT' && (
                                                <button
                                                    onClick={() => handleEdit(order)}
                                                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-block"
                                                    title={t('purchaseOrders.editTooltip')}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            <Link
                                                href={`/purchasing/orders/${order.id}`}
                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block"
                                                title={t('purchaseOrders.viewTooltip')}
                                            >
                                                <Eye size={16} />
                                            </Link>
                                            {order.status === 'DRAFT' && (
                                                <button
                                                    onClick={() => handleDelete(order.id, order.code)}
                                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-block"
                                                    title={t('purchaseOrders.deleteTooltip')}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <Pagination {...paginationProps} />
            </div>

            {/* Create PO Modal */}
            {isCreateModalOpen && (
                <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, padding: '1rem', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(2px)' }}>
                    <div className="modal-container shadow-2xl w-full max-w-[920px]" style={{ maxHeight: '92vh', background: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                                    <ShoppingCart className="text-primary" size={18} />
                                    {(formData as any).id ? t('purchaseOrders.editTitle') : t('purchaseOrders.addTitle')}
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 120px)' }}>
                            <form id="orderForm" onSubmit={handleSubmit} className="space-y-4">
                                {/* General Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
                                    <div className="sm:col-span-2 lg:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseOrders.supplierLabel')}</label>
                                        <SearchableSelect
                                            value={formData.supplierId}
                                            onChange={(val) => setFormData({ ...formData, supplierId: val })}
                                            options={supplierFormOptions}
                                            placeholder={t('purchaseOrders.selectSupplier')}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseOrders.orderDate')}</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-3">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseOrders.notes')}</label>
                                        <input
                                            type="text"
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400"
                                            placeholder={t('purchaseOrders.notesPlaceholder')}
                                        />
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <FileText size={14} className="text-slate-500" /> {t('purchaseOrders.itemDetailsTitle')}
                                        </h3>
                                    </div>

                                    {/* Sub-Form for Add Item */}
                                    <div className="flex flex-col bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs mb-3">
                                        <div className="mb-3 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-2.5">
                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                                                <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={!isCustomProduct} onChange={() => setIsCustomProduct(false)} />
                                                <span>{t('purchaseOrders.selectFromInventory')}</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                                                <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={isCustomProduct} onChange={() => setIsCustomProduct(true)} />
                                                <span>{t('purchaseOrders.customInput')}</span>
                                            </label>
                                            {isCustomProduct && (
                                                <label className={`flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors select-none ${saveToInventory ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
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
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseOrders.productName')}</label>
                                                {!isCustomProduct ? (
                                                    <SearchableSelect
                                                        options={products.map((p: any) => ({ value: p.id, label: `${p.sku} - ${p.name}` }))}
                                                        value={selectedProduct || ''}
                                                        onChange={handleProductSelect}
                                                        placeholder={t('purchaseOrders.selectProductPlaceholder')}
                                                    />
                                                ) : (
                                                    <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400" placeholder={t('purchaseOrders.customNamePlaceholder')} value={customName} onChange={e => setCustomName(e.target.value)} />
                                                )}
                                            </div>
                                            {isCustomProduct && (
                                                <div className="w-full md:w-20">
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseOrders.unitLabel')}</label>
                                                    <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white text-center" placeholder={t('purchaseOrders.unitPlaceholder')} value={customUnit} onChange={e => setCustomUnit(e.target.value)} />
                                                </div>
                                            )}
                                            <div className="w-full md:w-36">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                    {isPriceInclusiveVat ? 'Đơn giá (gồm VAT)' : t('purchaseOrders.priceLabel')}
                                                </label>
                                                <input type="number" step="any" min="0" className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none transition-all text-slate-900 bg-white ${isPriceInclusiveVat ? 'border-emerald-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-emerald-50/20 font-semibold text-emerald-800' : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'}`} value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} />
                                            </div>
                                            <div className="w-full md:w-24">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseOrders.taxLabel')}</label>
                                                <TaxRateSelect
                                                    value={customTaxRate}
                                                    onChange={(val) => setCustomTaxRate(val)}
                                                />
                                            </div>
                                            <div className="w-full md:w-16">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseOrders.qtyLabel')}</label>
                                                <input type="number" step="any" min="0.0001" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-center text-slate-900 bg-white" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 0)} />
                                            </div>
                                            <button type="button" onClick={handleAddItem} className="h-[34px] px-5 border border-primary/40 text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all text-xs font-semibold rounded-lg shrink-0">{t('purchaseOrders.addBtn')}</button>
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
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('purchaseOrders.itemNotesLabel')} <span className="text-slate-400 font-normal">({t('purchaseOrders.printOnPO')})</span></label>
                                            <div className="flex flex-wrap items-center gap-4 mb-1.5">
                                                <label className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium ${isCustomProduct ? 'text-slate-400' : 'text-slate-700'}`}>
                                                    <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={useInventoryDescription && !isCustomProduct} onChange={() => handleDescSourceChange(true)} disabled={isCustomProduct} />
                                                    <span>{t('purchaseOrders.useInventoryDesc')}</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                                                    <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={!useInventoryDescription || isCustomProduct} onChange={() => handleDescSourceChange(false)} />
                                                    <span>{t('purchaseOrders.customDesc')}</span>
                                                </label>
                                            </div>
                                            <textarea rows={2} className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none text-slate-900 bg-white placeholder:text-slate-400" placeholder={t('purchaseOrders.descPlaceholder')} value={customDescription} onChange={e => setCustomDescription(e.target.value)}></textarea>
                                        </div>
                                    </div>

                                    {/* Read-Only Items Table */}
                                    {orderItems.length > 0 && (
                                        <div className="border border-slate-200 rounded-xl overflow-x-auto mt-2 border-t pt-3">
                                            <table className="w-full min-w-[600px] text-xs mb-3 bg-white text-left">
                                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                                    <tr>
                                                        <th className="p-2.5 font-semibold">{t('purchaseOrders.orderedProduct')}</th>
                                                        <th className="p-2.5 font-semibold text-center w-20">{t('purchaseOrders.colQty')}</th>
                                                        <th className="p-2.5 font-semibold text-right w-32">{t('purchaseOrders.colPrice')}</th>
                                                        <th className="p-2.5 font-semibold text-center w-24">{t('purchaseOrders.colTax')}</th>
                                                        <th className="p-2.5 font-semibold text-right w-36">{t('purchaseOrders.colTotal')}</th>
                                                        <th className="p-2.5 font-semibold text-center w-16"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {orderItems.map((item, i) => {
                                                        const rowSubtotal = item.quantity * item.unitPrice;
                                                        const rowTax = calcTaxAmount(rowSubtotal, item.taxRate);
                                                        const rowTotal = rowSubtotal + rowTax;
                                                        return (
                                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                                <td className="p-2.5 text-slate-800">
                                                                    <div className="font-semibold flex items-center gap-1.5">
                                                                        <span>{item.productName || item.customName}</span>
                                                                        {item.saveToInventory === false && (
                                                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200" title="Sản phẩm chỉ dùng 1 lần cho đơn hàng này, không lưu vào danh mục kho">⚡ Dùng 1 lần</span>
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
                                                                        <button type="button" onClick={() => handleEditItem(i)} className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors" title={t('purchaseOrders.editLineTooltip')}><Edit2 size={13} /></button>
                                                                        <button type="button" onClick={() => handleRemoveItem(i)} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors" title={t('purchaseOrders.deleteLineTooltip')}><Trash2 size={13} /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-slate-50/80 border-t border-slate-200">
                                                        <td colSpan={4} className="p-2.5 text-right font-medium text-slate-600 text-xs">{t('purchaseOrders.subTotal')}</td>
                                                        <td className="p-2.5 text-right font-semibold text-slate-800 text-xs">{formatMoney(calculateSubTotal())}</td>
                                                        <td className="p-2.5"></td>
                                                    </tr>
                                                    <tr className="bg-slate-50/80">
                                                        <td colSpan={4} className="p-2.5 text-right font-medium text-slate-600 text-xs">{t('purchaseOrders.taxAmount')}</td>
                                                        <td className="p-2.5 text-right font-semibold text-slate-800 text-xs">{formatMoney(calculateTax())}</td>
                                                        <td className="p-2.5"></td>
                                                    </tr>
                                                    <tr className="bg-emerald-50/50 border-t border-emerald-200">
                                                        <td colSpan={4} className="p-2.5 text-right font-bold text-slate-800 text-xs">{t('purchaseOrders.grandTotal')}</td>
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
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="h-[34px] px-4 border border-slate-300 rounded-lg hover:bg-white text-xs font-semibold text-slate-600 transition-all"
                            >
                                {t('purchaseOrders.cancelBtn')}
                            </button>
                            <button
                                type="submit"
                                form="orderForm"
                                disabled={isSubmitting || orderItems.length === 0}
                                className="h-[34px] px-5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 text-xs font-bold shadow-xs transition-all"
                            >
                                {isSubmitting ? t('purchaseOrders.savingBtn') : t('purchaseOrders.saveBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
