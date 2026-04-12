'use client';

import React, { useState } from 'react';
import { Plus, Search, Eye, Trash2, Calendar, FileText, FileDown, CheckCircle, ArrowUpDown, Edit2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createPurchaseBill, approvePurchaseBill, deletePurchaseBill, updatePurchaseBill, cancelPurchaseBill } from '@/app/purchasing/actions';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { TagDisplay } from '@/app/components/ui/TagDisplay';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { useTranslation } from '@/app/i18n/LanguageContext';

export function PurchaseBillClient({ initialBills, suppliers, orders, warehouses, products, projects }: { initialBills: any[], suppliers: any[], orders: any[], warehouses: any[], products: any[], projects?: any[] }) {
    const { t } = useTranslation();
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
    const [billItems, setBillItems] = useState<Array<{ productId: string, productName?: string, quantity: number, unitPrice: number, taxRate: number, description?: string, unit?: string, customName?: string }>>([]);
    const [approveWarehouseId, setApproveWarehouseId] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Item Sub-Form Buffer States
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);
    const [isCustomProduct, setIsCustomProduct] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customUnit, setCustomUnit] = useState('Cái');
    const [customTaxRate, setCustomTaxRate] = useState(0);
    const [customDescription, setCustomDescription] = useState('');
    const [useInventoryDescription, setUseInventoryDescription] = useState(true);

    const searchParams = useSearchParams();
    const hasOpenedFromUrl = React.useRef(false);

    React.useEffect(() => {
        if (hasOpenedFromUrl.current) return;

        const supplierId = searchParams.get('supplierId');
        const orderId = searchParams.get('orderId');

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
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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

        let newItem: any = {
            quantity: qty,
            unitPrice: price,
            description: customDescription,
            taxRate: 0,
            productName: '',
            unit: 'Cái'
        };

        if (isCustomProduct) {
            newItem.productId = 'EXTERNAL';
            newItem.productName = customName;
            newItem.customName = customName;
            newItem.unit = customUnit;
            newItem.taxRate = customTaxRate;
        } else {
            const product = products.find((p: any) => p.id === selectedProduct);
            newItem.productId = selectedProduct;
            newItem.productName = product?.name || '';
            newItem.unit = product?.unit || 'Cái';
            newItem.taxRate = product?.taxRate || 0;
        }

        setBillItems(prev => [...prev, newItem]);

        // Reset the form
        setSelectedProduct('');
        setCustomName('');
        setCustomDescription('');
        setCustomUnit('Cái');
        setQty(1);
        setPrice(0);
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
        return billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate || 0) / 100), 0);
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
        <div className="p-8">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl mb-1">{t('purchaseBills.title')}</h1>
                    <p className="text-sm text-gray-500">{t('purchaseBills.description')}</p>
                </div>
                <button onClick={handleOpenCreate} className="btn btn-primary">
                    <Plus size={20} style={{ marginRight: '8px' }} />
                    <span>{t('purchaseBills.createBill')}</span>
                </button>
            </div>

            <style>{`
                .status-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem; }
                @media (min-width: 1024px) { .status-grid { grid-template-columns: repeat(5, 1fr); } }
                .status-card {
                    cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 1rem; padding: 1.25rem;
                    background-color: white; border: 1px solid transparent; position: relative; overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.025);
                }
                .status-card::before {
                    content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; transition: opacity 0.3s; opacity: 0;
                }
                .status-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04); }
                .status-card.active { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05); }
                .status-card.active::before { opacity: 1; }
                
                /* Colors - All */
                .status-card-all { background: linear-gradient(145deg, #ffffff, #f8fafc); border-color: #e2e8f0; }
                .status-card-all:hover { border-color: #cbd5e1; }
                .status-card-all.active { border-color: #3b82f6; background: #eff6ff; }
                .status-card-all::before { background-color: #3b82f6; }
                .status-card-all .card-title { color: #64748b; }
                .status-card-all.active .card-title { color: #2563eb; }
                .status-card-all .card-value { color: #0f172a; }
                .status-card-all.active .card-value { color: #1e3a8a; }
                .status-card-all .card-desc { color: #94a3b8; }
                .status-card-all.active .card-desc { color: #60a5fa; }

                /* Colors - Draft */
                .status-card-draft { background: linear-gradient(145deg, #ffffff, #f1f5f9); border-color: #e2e8f0; }
                .status-card-draft:hover { border-color: #cbd5e1; }
                .status-card-draft.active { border-color: #64748b; background: #f8fafc; }
                .status-card-draft::before { background-color: #64748b; }
                .status-card-draft .card-title { color: #64748b; }
                .status-card-draft.active .card-title { color: #475569; }
                .status-card-draft .card-value { color: #334155; }
                .status-card-draft.active .card-value { color: #0f172a; }
                .status-card-draft .card-desc { color: #94a3b8; }
                .status-card-draft.active .card-desc { color: #64748b; }

                /* Colors - Approved */
                .status-card-approved { background: linear-gradient(145deg, #ffffff, #fef2f2); border-color: #fee2e2; }
                .status-card-approved:hover { border-color: #fca5a5; }
                .status-card-approved.active { border-color: #ef4444; background: #fef2f2; }
                .status-card-approved::before { background-color: #ef4444; }
                .status-card-approved .card-title { color: #f87171; }
                .status-card-approved.active .card-title { color: #ef4444; }
                .status-card-approved .card-value { color: #ef4444; }
                .status-card-approved.active .card-value { color: #b91c1c; }
                .status-card-approved .card-desc { color: #fca5a5; }
                .status-card-approved.active .card-desc { color: #ef4444; }

                /* Colors - Partial Paid */
                .status-card-partial { background: linear-gradient(145deg, #ffffff, #fffbeb); border-color: #fef3c7; }
                .status-card-partial:hover { border-color: #fcd34d; }
                .status-card-partial.active { border-color: #f59e0b; background: #fffcf5; }
                .status-card-partial::before { background-color: #f59e0b; }
                .status-card-partial .card-title { color: #fbbf24; }
                .status-card-partial.active .card-title { color: #f59e0b; }
                .status-card-partial .card-value { color: #f59e0b; }
                .status-card-partial.active .card-value { color: #b45309; }
                .status-card-partial .card-desc { color: #fcd34d; }
                .status-card-partial.active .card-desc { color: #d97706; }

                /* Colors - Paid */
                .status-card-paid { background: linear-gradient(145deg, #ffffff, #f0fdf4); border-color: #dcfce3; }
                .status-card-paid:hover { border-color: #86efac; }
                .status-card-paid.active { border-color: #10b981; background: #f0fdf4; }
                .status-card-paid::before { background-color: #10b981; }
                .status-card-paid .card-title { color: #34d399; }
                .status-card-paid.active .card-title { color: #10b981; }
                .status-card-paid .card-value { color: #10b981; }
                .status-card-paid.active .card-value { color: #047857; }
                .status-card-paid .card-desc { color: #6ee7b7; }
                .status-card-paid.active .card-desc { color: #059669; }
            `}</style>
            <div className="status-grid">
                <div
                    onClick={() => setStatusFilter('ALL')}
                    className={`status-card status-card-all ${statusFilter === 'ALL' ? 'active' : ''}`}
                >
                    <div className="card-title text-xs font-bold uppercase tracking-wider mb-2">{t('purchaseBills.all')}</div>
                    <div className="card-value text-3xl font-black">{stats.total}</div>
                    <div className="card-desc text-sm mt-1 font-medium">{t('purchaseBills.bills')}</div>
                </div>

                <div
                    onClick={() => setStatusFilter('DRAFT')}
                    className={`status-card status-card-draft ${statusFilter === 'DRAFT' ? 'active' : ''}`}
                >
                    <div className="card-title text-xs font-bold uppercase tracking-wider mb-2">{t('purchaseBills.draft')}</div>
                    <div className="card-value text-3xl font-black">{stats.draft.count}</div>
                    <div className="card-desc text-sm mt-1 font-medium">{t('purchaseBills.pendingApproval')}</div>
                </div>

                <div
                    onClick={() => setStatusFilter('APPROVED')}
                    className={`status-card status-card-approved ${statusFilter === 'APPROVED' ? 'active' : ''}`}
                >
                    <div className="card-title text-xs font-bold uppercase tracking-wider mb-2">{t('purchaseBills.approvedDebt')}</div>
                    <div className="card-value text-3xl font-black">{stats.approved.count}</div>
                    <div className="card-desc text-sm font-bold mt-1">{formatMoney(stats.approved.amount)}</div>
                </div>

                <div
                    onClick={() => setStatusFilter('PARTIAL_PAID')}
                    className={`status-card status-card-partial ${statusFilter === 'PARTIAL_PAID' ? 'active' : ''}`}
                >
                    <div className="card-title text-xs font-bold uppercase tracking-wider mb-2">{t('purchaseBills.partialPaid')}</div>
                    <div className="card-value text-3xl font-black">{stats.partial.count}</div>
                    <div className="card-desc text-sm font-bold mt-1">{t('purchaseBills.debt')}: {formatMoney(stats.partial.amount)}</div>
                </div>

                <div
                    onClick={() => setStatusFilter('PAID')}
                    className={`status-card status-card-paid ${statusFilter === 'PAID' ? 'active' : ''}`}
                >
                    <div className="card-title text-xs font-bold uppercase tracking-wider mb-2">{t('purchaseBills.paid')}</div>
                    <div className="card-value text-3xl font-black">{stats.paid.count}</div>
                    <div className="card-desc text-sm font-bold mt-1">{t('purchaseBills.completed')}</div>
                </div>
            </div>

            <div className="card search-card mb-6">
                <div className="search-input-wrapper">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder={t('purchaseBills.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input"
                    />
                </div>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('code')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">{t('purchaseBills.colSystemCode')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('supplierInvoice')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">{t('purchaseBills.colSupplierInvoice')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('date')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">{t('purchaseBills.colDateSupplier')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th className="text-left font-medium text-gray-900 dark:text-gray-100">
                                {t('purchaseBills.colTags')}
                            </th>
                            <th onClick={() => requestSort('dueDate')} className="cursor-pointer hover:bg-gray-100 text-center">
                                <div className="flex items-center justify-center gap-1">{t('purchaseBills.colDueDate')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('totalAmount')} className="cursor-pointer hover:bg-gray-100 text-right">
                                <div className="flex items-center justify-end gap-1">{t('purchaseBills.colTotal')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('paidAmount')} className="cursor-pointer hover:bg-gray-100 text-right">
                                <div className="flex items-center justify-end gap-1">{t('purchaseBills.colPaid')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('status')} className="cursor-pointer hover:bg-gray-100 text-center">
                                <div className="flex items-center justify-center gap-1">{t('purchaseBills.colStatus')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th className="text-center">{t('purchaseBills.colActions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedItems.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    {t('purchaseBills.noBillsFound')}
                                </td>
                            </tr>
                        ) : (
                            paginatedItems.map((bill) => {
                                const isOverdue = bill.dueDate && new Date(bill.dueDate).getTime() < new Date().getTime() && bill.status !== 'PAID' && bill.status !== 'CANCELLED' && (bill.totalAmount - (bill.paidAmount || 0)) > 0;
                                const trStyle: React.CSSProperties = isOverdue ? { animation: 'overdue-bg-blink 2.5s ease-in-out infinite' } : {};

                                return (
                                    <tr key={bill.id} style={trStyle} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="p-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                                            <Link href={`/purchasing/bills/${bill.id}`} className="hover:text-primary hover:underline">
                                                {bill.code}
                                            </Link>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{bill.supplierInvoice || '--'}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                                                <Calendar size={13} /> {formatDate(bill.date)}
                                            </div>
                                            <Link href={`/suppliers/${bill.supplierId}`} className="font-semibold text-primary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
                                                {bill.supplier?.name}
                                            </Link>
                                        </td>
                                        <td className="p-4">
                                            <TagDisplay tagsString={bill.tags} />
                                        </td>
                                        <td className="p-4 text-center">
                                            <span style={{ color: isOverdue ? '#dc2626' : 'inherit', fontWeight: isOverdue ? 600 : 'normal' }}>
                                                {bill.dueDate ? formatDate(bill.dueDate) : '--'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="font-semibold text-gray-900 dark:text-gray-100">{formatMoney(bill.totalAmount || 0)}</div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="font-medium text-green-600 dark:text-green-500">{formatMoney(bill.paidAmount || 0)}</div>
                                        </td>
                                        <td className="p-4 text-center">{getStatusBadge(bill.status)}</td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link
                                                    href={`/purchasing/bills/${bill.id}`}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded inline-block"
                                                    title={t('purchaseBills.viewTooltip')}
                                                >
                                                    <Eye size={18} />
                                                </Link>
                                                {bill.status === 'DRAFT' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(bill)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded inline-block"
                                                            title={t('purchaseBills.editTooltip')}
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedBill(bill); setIsApproveModalOpen(true); }}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded flex items-center gap-1 text-xs font-semibold px-2"
                                                            title={t('purchaseBills.approveTooltip')}
                                                        >
                                                            <CheckCircle size={16} /> {t('purchaseBills.approveBtn')}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(bill.id, bill.code)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded inline-block"
                                                            title={t('purchaseBills.deleteTooltip')}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {bill.status === 'APPROVED' && (
                                                    <button
                                                        onClick={() => handleCancel(bill.id, bill.code)}
                                                        className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded inline-block"
                                                        title={t('purchaseBills.cancelBillTooltip')}
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
                <Pagination {...paginationProps} />
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
                <div className="modal-backdrop">
                    <div className="modal-container flex max-w-4xl shadow-2xl">
                        {/* Similar form as PO, omitted repetitive boilerplate for brevity, ensuring essential inputs exist */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <FileDown className="text-primary" /> {(formData as any).id ? t('purchaseBills.editTitle') : t('purchaseBills.addTitle')}
                            </h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                            <form id="billForm" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="sm:col-span-2 lg:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchaseBills.supplierLabel')}</label>
                                        <SearchableSelect
                                            value={formData.supplierId}
                                            onChange={(val) => setFormData({ ...formData, supplierId: val })}
                                            options={supplierFormOptions}
                                            placeholder={t('purchaseBills.selectSupplier')}
                                        />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dự án</label>
                                        <SearchableSelect
                                            value={formData.projectId || ''}
                                            onChange={(val) => setFormData({ ...formData, projectId: val })}
                                            options={[{ value: '', label: '-- Không thuộc dự án --' }, ...(projects || []).map((p: any) => ({ value: p.id, label: `${p.code} - ${p.title}` }))]}
                                            placeholder="Chọn dự án"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchaseBills.orderLabel')}</label>
                                        <SearchableSelect
                                            value={formData.orderId || ''}
                                            onChange={handleOrderSelect}
                                            options={[{ value: '', label: t('purchaseBills.selectOrder') }, ...orders.filter((o: any) => o.status !== 'DRAFT').map((o: any) => ({ value: o.id, label: `${o.code} - ${o.supplier?.name}` }))]}
                                            placeholder="-- Từ PO --"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchaseBills.dateLabel')}</label>
                                        <input type="date" required value={formData.date} onChange={e => {
                                            const newDateStr = e.target.value;
                                            if (newDateStr) {
                                                const d = new Date(newDateStr);
                                                d.setDate(d.getDate() + 30);
                                                setFormData({ ...formData, date: newDateStr, dueDate: d.toISOString().substring(0, 10) });
                                            } else {
                                                setFormData({ ...formData, date: newDateStr });
                                            }
                                        }} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchaseBills.dueDateLabel')}</label>
                                        <input type="date" required value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchaseBills.supplierInvoiceLabel')}</label>
                                        <input type="text" value={formData.supplierInvoice} onChange={e => setFormData({ ...formData, supplierInvoice: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" placeholder="VD: HD-1234" />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchaseBills.notesLabel')}</label>
                                        <input type="text" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" placeholder="Ghi chú thêm..." />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('purchaseBills.tagsLabel')}</label>
                                        <input type="text" value={formData.tags || ''} onChange={e => setFormData({ ...formData, tags: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" placeholder="VD: Nhập khẩu, Quan trọng..." />
                                    </div>
                                </div>

                                {/* Attachments Section */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                        <FileText size={16} className="text-gray-500" /> {t('purchaseBills.attachments')}
                                    </h3>

                                    {formData.attachments.length > 0 && (
                                        <div className="space-y-2 mb-3">
                                            {formData.attachments.map((doc, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div>
                                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                                {doc.name}
                                                            </a>
                                                            <div className="text-xs text-gray-500 mt-0.5">
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
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                                    >
                                                        <Trash2 size={16} />
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
                                            className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isUploading ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> {t('purchaseBills.uploadingBtn')}
                                                </span>
                                            ) : (
                                                <><Plus size={16} /> {t('purchaseBills.addDocumentBtn')}</>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Products Table */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg flex items-center gap-2">
                                            <FileText size={18} /> {t('purchaseBills.itemsTitle')}
                                        </h3>
                                    </div>

                                    {/* Sub-Form for Add Item */}
                                    <div className="flex flex-col bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
                                        <div className="mb-4 flex items-center gap-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                                                <input type="radio" className="accent-primary w-4 h-4 cursor-pointer" checked={!isCustomProduct} onChange={() => setIsCustomProduct(false)} />
                                                <span>{t('purchaseBills.selectFromInventory')}</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                                                <input type="radio" className="accent-primary w-4 h-4 cursor-pointer" checked={isCustomProduct} onChange={() => setIsCustomProduct(true)} />
                                                <span>{t('purchaseBills.customEntry')}</span>
                                            </label>
                                        </div>
                                        <div className="flex flex-wrap gap-3 items-end mb-4">
                                            <div className="flex-1 min-w-[250px]">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('purchaseBills.productNameLabel')}</label>
                                                {!isCustomProduct ? (
                                                    <SearchableSelect
                                                        options={products.map((p: any) => ({ value: p.id, label: `${p.sku} - ${p.name}` }))}
                                                        value={selectedProduct || ''}
                                                        onChange={handleProductSelect}
                                                        placeholder={t('purchaseBills.selectProductPlaceholder')}
                                                    />
                                                ) : (
                                                    <input type="text" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700" placeholder={t('purchaseBills.customNamePlaceholder')} value={customName} onChange={e => setCustomName(e.target.value)} />
                                                )}
                                            </div>
                                            {isCustomProduct && (
                                                <div className="w-24 shrink-0">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('purchaseBills.unitLabel')}</label>
                                                    <input type="text" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-center" placeholder={t('purchaseBills.unitPlaceholder')} value={customUnit} onChange={e => setCustomUnit(e.target.value)} />
                                                </div>
                                            )}
                                            <div className="w-28 shrink-0">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('purchaseBills.unitPriceLabel')}</label>
                                                <input type="number" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700" value={price} onChange={e => setPrice(Number(e.target.value))} />
                                            </div>
                                            <div className="w-20 shrink-0">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('purchaseBills.taxLabel')}</label>
                                                {isCustomProduct ? (
                                                    <input type="number" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700" value={customTaxRate} onChange={e => setCustomTaxRate(Number(e.target.value))} />
                                                ) : (
                                                    <input type="text" className="w-full border border-gray-200 dark:border-gray-600 rounded-lg p-2.5 bg-slate-50 dark:bg-gray-800 text-center text-gray-500 dark:text-gray-400 font-medium cursor-not-allowed" value={`${products.find((p: any) => p.id === selectedProduct)?.taxRate || 0}`} disabled />
                                                )}
                                            </div>
                                            <div className="w-20 shrink-0">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('purchaseBills.qtyLabel')}</label>
                                                <input type="number" min="1" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700" value={qty} onChange={e => setQty(Number(e.target.value))} />
                                            </div>
                                            <button type="button" onClick={handleAddItem} className="shrink-0 mb-[2px] h-[46px] px-6 border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 shadow-sm font-semibold rounded-lg dark:border-primary/50 dark:text-primary-light">{t('purchaseBills.addItemBtn')}</button>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('purchaseBills.itemNotesLabel')} <span className="text-gray-400 font-normal">({t('purchaseBills.printedOnTransfer')})</span></label>
                                            <div className="flex flex-wrap items-center gap-4 mb-2">
                                                <label className={`flex items-center gap-2 cursor-pointer text-sm font-medium ${isCustomProduct ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    <input type="radio" className="accent-primary w-4 h-4 cursor-pointer" checked={useInventoryDescription && !isCustomProduct} onChange={() => handleDescSourceChange(true)} disabled={isCustomProduct} />
                                                    <span>{t('purchaseBills.useInventoryDesc')}</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    <input type="radio" className="accent-primary w-4 h-4 cursor-pointer" checked={!useInventoryDescription || isCustomProduct} onChange={() => handleDescSourceChange(false)} />
                                                    <span>{t('purchaseBills.customDesc')}</span>
                                                </label>
                                            </div>
                                            <textarea rows={2} className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700`} placeholder={t('purchaseBills.itemNotesPlaceholder')} value={customDescription} onChange={e => setCustomDescription(e.target.value)}></textarea>
                                        </div>
                                    </div>

                                    {/* Read-Only Items Table */}
                                    {billItems.length > 0 && (
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto mt-2 border-t pt-4">
                                            <table className="w-full min-w-[600px] text-sm mb-4 bg-white dark:bg-gray-800 text-left">
                                                <thead className="bg-slate-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                                                    <tr>
                                                        <th className="p-3 font-medium">{t('purchaseBills.colProductName')}</th>
                                                        <th className="p-3 font-medium text-center w-20">{t('purchaseBills.colQty')}</th>
                                                        <th className="p-3 font-medium text-right w-32">{t('purchaseBills.colUnitPrice')}</th>
                                                        <th className="p-3 font-medium text-center w-20">{t('purchaseBills.colTax')}</th>
                                                        <th className="p-3 font-medium text-right w-36">{t('purchaseBills.colLineTotal')}</th>
                                                        <th className="p-3 font-medium text-center w-16"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {billItems.map((item, i) => {
                                                        const rowSubtotal = item.quantity * item.unitPrice;
                                                        const rowTax = rowSubtotal * (item.taxRate || 0) / 100;
                                                        const rowTotal = rowSubtotal + rowTax;
                                                        return (
                                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors">
                                                                <td className="p-3 text-gray-800 dark:text-gray-200">
                                                                    <div className="font-semibold">{item.productName || item.customName}</div>
                                                                    {item.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-sm whitespace-pre-wrap">{item.description}</div>}
                                                                </td>
                                                                <td className="p-3 text-center text-gray-800 dark:text-gray-200">
                                                                    {item.quantity} <span className="text-xs text-gray-500 ml-1">{item.unit}</span>
                                                                </td>
                                                                <td className="p-3 text-right text-gray-600 dark:text-gray-300 font-medium">{formatMoney(item.unitPrice)}</td>
                                                                <td className="p-3 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 border-x border-white dark:border-gray-800">{item.taxRate}%</td>
                                                                <td className="p-3 text-right font-medium text-gray-800 dark:text-gray-200">{formatMoney(rowTotal)}</td>
                                                                <td className="p-3 text-center">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button type="button" onClick={() => handleEditItem(i)} className="text-blue-500 hover:text-blue-700 transition-colors" title={t('purchaseBills.editItemTooltip')}><Edit2 size={14} /></button>
                                                                        <button type="button" onClick={() => handleRemoveItem(i)} className="text-red-500 hover:text-red-700 transition-colors" title={t('purchaseBills.removeItemTooltip')}><Trash2 size={14} /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                                                        <td colSpan={4} className="p-3 text-right font-medium text-gray-600 dark:text-gray-400 text-sm">{t('purchaseBills.subTotal')}:</td>
                                                        <td className="p-3 text-right font-medium text-gray-800 dark:text-gray-200 text-sm">{formatMoney(calculateSubTotal())}</td>
                                                        <td className="p-3 border"></td>
                                                    </tr>
                                                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                        <td colSpan={4} className="p-3 text-right font-medium text-gray-600 dark:text-gray-400 text-sm">{t('purchaseBills.totalTax')}:</td>
                                                        <td className="p-3 text-right font-medium text-gray-800 dark:text-gray-200 text-sm">{formatMoney(calculateTax())}</td>
                                                        <td className="p-3 border"></td>
                                                    </tr>
                                                    <tr className="bg-slate-100 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                                                        <td colSpan={4} className="p-3 text-right font-bold text-gray-800 dark:text-gray-200">{t('purchaseBills.grandTotal')}:</td>
                                                        <td className="p-3 text-right font-bold text-primary text-[15px]">{formatMoney(calculateTotal())}</td>
                                                        <td className="p-3 border"></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 mt-auto">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium">{t('purchaseBills.cancelBtn')}</button>
                            <button type="submit" form="billForm" disabled={isSubmitting || billItems.length === 0} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 font-bold">{isSubmitting ? t('purchaseBills.savingBtn') : t('purchaseBills.saveBtn')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
