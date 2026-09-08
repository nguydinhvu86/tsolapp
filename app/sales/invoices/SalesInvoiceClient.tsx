'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Plus, Edit2, Trash2, Save, X, Printer, Search, Calendar, PackageCheck, Eye, Download, LinkIcon, CheckCircle2, FileSearch, LayoutList, FileText, ChevronUp, ChevronDown, Undo2, XCircle, AlertTriangle, Info, ShieldAlert, Copy, Clock, ArrowUpDown } from 'lucide-react';
import { submitSalesInvoice, approveSalesInvoice, deleteSalesInvoice, updateSalesInvoice, cancelSalesInvoice, updateSalesInvoiceStatus, restoreSalesInvoice, updateSalesInvoiceTags } from './actions';
import { formatMoney, formatDate, formatTaxRate, calcPreTaxPrice, calcTaxAmount } from '@/lib/utils/formatters';
import { TaxRateSelect, TaxBadge } from '@/app/components/ui/TaxRateSelect';
import { TagDisplay } from '@/app/components/ui/TagDisplay';
import { useTranslation } from '@/app/i18n/LanguageContext';
import { AvatarImage } from '@/app/components/ui/AvatarImage';

export default function SalesInvoiceClient({ initialInvoices, customers, products, orders, nextCode, initialAction, initialCustomerId, users, currentUserId, isAdminOrManager }: any) {
    const { t } = useTranslation();
    const router = useRouter();
    const [invoices, setInvoices] = useState(initialInvoices);
    const [isFormOpen, setIsFormOpen] = useState(initialAction === 'new');

    // Generic Action Modal State
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean,
        title: string,
        message: React.ReactNode,
        action: () => Promise<void>,
        icon?: React.ReactNode,
        confirmLabel?: string,
        cancelLabel?: string,
        confirmVariant?: 'primary' | 'danger' | 'warning' | 'success'
    } | null>(null);
    const [isActioning, setIsActioning] = useState(false);

    // Tags Inline Edit State
    const [editingTagsInvoiceId, setEditingTagsInvoiceId] = useState<string | null>(null);
    const [editingTagsValue, setEditingTagsValue] = useState<string>('');

    // Filters & Sort
    const [statusFilter, setStatusFilter] = useState(typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('filter') || 'ALL' : 'ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sortBy, setSortBy] = useState('createdAt_desc');

    const handleSort = (key: string) => {
        if (sortBy === `${key}_desc`) {
            setSortBy(`${key}_asc`);
        } else {
            setSortBy(`${key}_desc`);
        }
    };

    // Derived states
    const confirmedOrders = orders.filter((o: any) => o.status === 'CONFIRMED' || o.status === 'COMPLETED');

    // Handle timezone offset to get correct local date string (YYYY-MM-DD)
    const getLocalDateStr = (d: Date) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState<any>({
        code: nextCode,
        customerId: initialCustomerId || '',
        orderId: '',
        salespersonId: currentUserId || '',
        date: getLocalDateStr(new Date()),
        dueDate: getLocalDateStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        notes: '',
        status: 'DRAFT',
        tags: '',
        subTotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        items: []
    });
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);
    const [isCustomProduct, setIsCustomProduct] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customUnit, setCustomUnit] = useState('Cái');
    const [customTaxRate, setCustomTaxRate] = useState(0);
    const [customDescription, setCustomDescription] = useState('');
    const [useInventoryDescription, setUseInventoryDescription] = useState(true);
    const [isSubItem, setIsSubItem] = useState(false);
    const [isPriceInclusiveVat, setIsPriceInclusiveVat] = useState(false);

    const handleOpenCreate = () => {
        setFormData({
            code: nextCode,
            customerId: '',
            orderId: '',
            salespersonId: currentUserId || '',
            date: getLocalDateStr(new Date()),
            dueDate: getLocalDateStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
            notes: '',
            status: 'DRAFT',
            tags: '',
            subTotal: 0,
            taxAmount: 0,
            totalAmount: 0,
            items: []
        });
        setQty(1);
        setPrice(0);
        setSelectedProduct('');
        setIsCustomProduct(false);
        setCustomName('');
        setCustomDescription('');
        setCustomUnit('Cái');
        setCustomTaxRate(0);
        setIsSubItem(false);
        setIsPriceInclusiveVat(false);
        setIsFormOpen(true);
    };

    const handleEdit = (inv: any) => {
        const mappedItems = inv.items ? inv.items.map((i: any) => ({
            productId: i.productId,
            productName: i.product?.name || i.customName || i.productName || '',
            customName: i.customName || '',
            description: i.description,
            unit: i.product?.unit || i.unit || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0,
            taxAmount: i.taxAmount || 0,
            totalPrice: i.totalPrice,
            isSubItem: i.isSubItem || false
        })) : [];

        const calcSubTotal = mappedItems.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unitPrice), 0);
        const calcTaxAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.taxAmount, 0);
        const calcTotalAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.totalPrice, 0);

        setFormData({
            id: inv.id,
            code: inv.code || '',
            customerId: inv.customerId || '',
            orderId: inv.orderId || '',
            salespersonId: inv.salespersonId || inv.creatorId || currentUserId || '',
            date: inv.date ? getLocalDateStr(new Date(inv.date)) : getLocalDateStr(new Date()),
            dueDate: inv.dueDate ? getLocalDateStr(new Date(inv.dueDate)) : '',
            notes: inv.notes || '',
            status: inv.status || 'DRAFT',
            tags: inv.tags || '',
            subTotal: calcSubTotal,
            taxAmount: calcTaxAmount,
            totalAmount: calcTotalAmount,
            items: mappedItems
        });
        setQty(1);
        setPrice(0);
        setSelectedProduct('');
        setIsCustomProduct(false);
        setCustomName('');
        setCustomDescription('');
        setCustomUnit('Cái');
        setCustomTaxRate(0);
        setIsSubItem(false);
        setIsFormOpen(true);
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const editId = params.get('edit');
            if (editId && invoices.length > 0) {
                const invToEdit = invoices.find((inv: any) => inv.id === editId);
                if (invToEdit && invToEdit.status !== 'CANCELLED') {
                    handleEdit(invToEdit);
                    window.history.replaceState({}, '', '/sales/invoices');
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoices]);

    const handleCopy = (inv: any) => {
        const mappedItems = inv.items ? inv.items.map((i: any) => ({
            productId: i.productId,
            productName: i.product?.name || i.customName || i.productName || '',
            customName: i.customName || '',
            description: i.description,
            unit: i.product?.unit || i.unit || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0,
            taxAmount: i.taxAmount || 0,
            totalPrice: i.totalPrice,
            isSubItem: i.isSubItem || false
        })) : [];

        const calcSubTotal = mappedItems.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unitPrice), 0);
        const calcTaxAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.taxAmount, 0);
        const calcTotalAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.totalPrice, 0);

        setFormData({
            code: nextCode,
            customerId: inv.customerId || '',
            orderId: inv.orderId || '',
            salespersonId: currentUserId || '',
            date: getLocalDateStr(new Date()),
            dueDate: inv.dueDate ? getLocalDateStr(new Date(inv.dueDate)) : getLocalDateStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
            notes: inv.notes || '',
            status: 'DRAFT',
            tags: inv.tags || '',
            subTotal: calcSubTotal,
            taxAmount: calcTaxAmount,
            totalAmount: calcTotalAmount,
            items: mappedItems
        });
        setQty(1);
        setPrice(0);
        setSelectedProduct('');
        setIsCustomProduct(false);
        setCustomName('');
        setCustomDescription('');
        setCustomUnit('Cái');
        setCustomTaxRate(0);
        setIsSubItem(false);
        setIsFormOpen(true);
    };

    const handleOrderSelect = (orderId: string) => {
        const order = orders.find((o: any) => o.id === orderId);
        if (!order) {
            setFormData({ ...formData, orderId: '', items: [], subTotal: 0, taxAmount: 0, totalAmount: 0 });
            return;
        }

        const mappedItems = order.items.map((i: any) => ({
            productId: i.productId,
            productName: i.product?.name || i.customName || i.productName || '',
            customName: i.customName || '',
            description: i.description,
            unit: i.product?.unit || i.unit || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate,
            taxAmount: i.taxAmount || 0,
            totalPrice: i.totalPrice,
            isSubItem: i.isSubItem || false
        }));

        setFormData({
            ...formData,
            orderId: order.id,
            customerId: order.customerId,
            salespersonId: order.creatorId || currentUserId || '',
            items: mappedItems,
            subTotal: order.subTotal || 0,
            taxAmount: order.taxAmount || 0,
            totalAmount: order.totalAmount || 0
        });
    };

    const handleProductSelect = (pid: string) => {
        const prod = products.find((p: any) => p.id === pid);
        setSelectedProduct(pid);
        setPrice(prod ? prod.salePrice : 0);
        setCustomTaxRate(prod ? (prod.taxRate !== undefined ? prod.taxRate : 0) : 0);
        if (useInventoryDescription) {
            setCustomDescription(prod?.description || '');
        }
    };

    const handleDescSourceChange = (useInv: boolean) => {
        setUseInventoryDescription(useInv);
        if (useInv && !isCustomProduct && selectedProduct) {
            const prod = products.find((p: any) => p.id === selectedProduct);
            setCustomDescription(prod?.description || '');
        }
    };

    const handleAddItem = () => {
        let taxRate = customTaxRate !== undefined ? customTaxRate : 0;
        let pId = null;
        let pName = '';
        let pUnit = '';
        let pDesc = customDescription;

        if (isCustomProduct) {
            if (!customName.trim()) {
                alert('Vui lòng nhập tên sản phẩm tự do');
                return;
            }
            pName = customName;
            pUnit = customUnit;
        } else {
            if (!selectedProduct) return;
            const prod = products.find((p: any) => p.id === selectedProduct);
            if (!prod) return;
            pId = prod.id;
            pName = prod.name;
            pUnit = prod.unit;
        }

        const effectiveUnitPrice = isPriceInclusiveVat ? calcPreTaxPrice(price, taxRate) : price;
        const baseTotal = qty * effectiveUnitPrice;
        const taxItemAmount = calcTaxAmount(baseTotal, taxRate);
        const total = isPriceInclusiveVat ? (qty * price) : (baseTotal + taxItemAmount);

        setFormData((prev: any) => {
            const newItems = [...prev.items, {
                productId: pId,
                productName: pName,
                customName: pName,
                description: pDesc,
                unit: pUnit,
                quantity: qty,
                unitPrice: effectiveUnitPrice,
                taxRate,
                taxAmount: taxItemAmount,
                totalPrice: total,
                isSubItem: isSubItem
            }];

            const calcSubTotal = newItems.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unitPrice), 0);
            const calcTaxAmountSum = newItems.reduce((acc: number, curr: any) => acc + curr.taxAmount, 0);
            const calcTotalAmount = newItems.reduce((acc: number, curr: any) => acc + curr.totalPrice, 0);

            return {
                ...prev,
                items: newItems,
                subTotal: calcSubTotal,
                taxAmount: calcTaxAmountSum,
                totalAmount: calcTotalAmount
            };
        });

        setSelectedProduct('');
        setCustomName('');
        setCustomDescription('');
        setCustomUnit('Cái');
        setQty(1);
        setPrice(0);
        setIsSubItem(false);
        setIsPriceInclusiveVat(false);
    };

    const handleRemoveItem = (index: number) => {
        setFormData((prev: any) => {
            const newItems = [...prev.items];
            newItems.splice(index, 1);

            const calcSubTotal = newItems.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unitPrice), 0);
            const calcTaxAmount = newItems.reduce((acc: number, curr: any) => acc + curr.taxAmount, 0);
            const calcTotalAmount = newItems.reduce((acc: number, curr: any) => acc + curr.totalPrice, 0);

            return {
                ...prev,
                items: newItems,
                subTotal: calcSubTotal,
                taxAmount: calcTaxAmount,
                totalAmount: calcTotalAmount
            };
        });
    };

    const handleEditItem = (index: number) => {
        const item = formData.items[index];
        if (item.productId) {
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
        setIsSubItem(item.isSubItem || false);

        handleRemoveItem(index);
    };

    const handleSave = async () => {
        if (!formData.customerId || formData.items.length === 0) {
            alert(t('invoices.alertSelectCustomer'));
            return;
        }

        let res;
        if (formData.id) {
            res = await updateSalesInvoice(formData.id, formData);
        } else {
            res = await submitSalesInvoice('system', formData);
        }

        if (res.success) {
            if (formData.id) {
                setInvoices(invoices.map((inv: any) => inv.id === formData.id ? res.data : inv));
            } else {
                setInvoices([res.data, ...invoices]);
            }
            setIsFormOpen(false);
            router.refresh();
        } else {
            alert(t('invoices.alertErrorGeneric') + res.error);
        }
    };

    const handleSaveAndApprove = async () => {
        if (!formData.customerId || formData.items.length === 0) {
            alert(t('invoices.alertSelectCustomer'));
            return;
        }

        setActionModal({
            isOpen: true,
            title: t('invoices.alertSaveDuyetTitle'),
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Save size={24} /></div>,
            message: (
                <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>{t('invoices.alertSaveDuyetMsgTitle')}</h4>
                    <p style={{ color: '#4b5563', marginBottom: '1rem' }} dangerouslySetInnerHTML={{ __html: t('invoices.alertSaveDuyetMsg') }}></p>
                </div>
            ),
            confirmLabel: t('invoices.alertSaveDuyetConfirm'),
            confirmVariant: 'primary',
            action: async () => {
                let res;
                if (formData.id) {
                    res = await updateSalesInvoice(formData.id, formData);
                } else {
                    res = await submitSalesInvoice('system', formData);
                }

                if (res.success) {
                    const invoiceId = formData.id || (res as any).data.id;
                    const approveRes = await approveSalesInvoice(invoiceId, 'system');

                    if (approveRes.success) {
                        alert(t('invoices.alertSuccessSaveDuyet'));
                        if (formData.id) {
                            setInvoices(invoices.map((inv: any) => inv.id === formData.id ? approveRes.data : inv));
                        } else {
                            setInvoices([approveRes.data, ...invoices]);
                        }
                        setIsFormOpen(false);
                        router.refresh();
                    } else {
                        alert(t('invoices.alertErrorSaveDuyet') + approveRes.error);
                    }
                } else {
                    alert(t('invoices.alertErrorSave') + res.error);
                }
            }
        });
    };

    const handleApprove = async (id: string) => {
        setActionModal({
            isOpen: true,
            title: t('invoices.alertApproveTitle'),
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={24} /></div>,
            message: (
                <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>{t('invoices.alertApproveMsgTitle')}</h4>
                    <p style={{ color: '#4b5563', marginBottom: '1rem' }}>{t('invoices.alertApproveMsg1')}</p>
                    <ul style={{ listStyle: 'none', padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                            <span style={{ color: '#10b981', background: '#d1fae5', padding: '0.25rem', borderRadius: '50%', marginTop: '0.125rem', display: 'flex' }}><CheckCircle2 size={16} /></span>
                            <span dangerouslySetInnerHTML={{ __html: t('invoices.alertApproveMsg2') }}></span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                            <span style={{ color: '#10b981', background: '#d1fae5', padding: '0.25rem', borderRadius: '50%', marginTop: '0.125rem', display: 'flex' }}><PackageCheck size={16} /></span>
                            <span dangerouslySetInnerHTML={{ __html: t('invoices.alertApproveMsg3') }}></span>
                        </li>
                    </ul>
                </div>
            ),
            confirmLabel: t('invoices.alertApproveConfirm'),
            confirmVariant: 'success',
            action: async () => {
                const res = await approveSalesInvoice(id, 'system');
                if (res.success) {
                    setInvoices(invoices.map((inv: any) => inv.id === id ? res.data : inv));
                    alert(t('invoices.alertSuccessApprove'));
                    router.refresh();
                } else alert(res.error);
            }
        });
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        if (newStatus === 'CANCELLED') {
            handleCancel(id);
            return;
        }
        setActionModal({
            isOpen: true,
            title: t('invoices.alertChangeStatusTitle'),
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Info size={24} /></div>,
            message: <p style={{ color: '#374151', fontSize: '0.9375rem' }} dangerouslySetInnerHTML={{ __html: t('invoices.alertChangeStatusMsg').replace('{{status}}', newStatus) }}></p>,
            confirmLabel: t('invoices.alertChangeStatusConfirm'),
            confirmVariant: 'primary',
            action: async () => {
                const res = await updateSalesInvoiceStatus(id, newStatus);
                if (res.success) {
                    setInvoices(invoices.map((inv: any) => inv.id === id ? { ...inv, status: newStatus } : inv));
                } else alert(res.error);
            }
        });
    };

    const handleCancel = async (id: string) => {
        setActionModal({
            isOpen: true,
            title: t('invoices.alertCancelTitle'),
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={24} /></div>,
            message: (
                <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>{t('invoices.alertCancelMsgTitle')}</h4>
                    <p style={{ color: '#4b5563', marginBottom: '1rem' }} dangerouslySetInnerHTML={{ __html: t('invoices.alertCancelMsg') }}></p>
                </div>
            ),
            confirmLabel: t('invoices.alertCancelConfirm'),
            confirmVariant: 'danger',
            action: async () => {
                const res = await cancelSalesInvoice(id);
                if (res.success) {
                    alert(t('invoices.alertSuccessCancel'));
                    setInvoices(invoices.map((inv: any) => inv.id === id ? { ...inv, status: 'CANCELLED' } : inv));
                } else alert(res.error);
            }
        });
    };

    const handleRestore = async (id: string) => {
        setActionModal({
            isOpen: true,
            title: t('invoices.alertRestoreTitle'),
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Undo2 size={24} /></div>,
            message: (
                <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>{t('invoices.alertRestoreMsgTitle')}</h4>
                    <p style={{ color: '#4b5563', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: t('invoices.alertRestoreMsg') }}></p>
                </div>
            ),
            confirmLabel: t('invoices.alertRestoreConfirm'),
            confirmVariant: 'success',
            action: async () => {
                const res = await restoreSalesInvoice(id);
                if (res.success) {
                    alert(t('invoices.alertSuccessRestore'));
                    router.refresh();
                } else {
                    alert(t('invoices.alertErrorGeneric') + ' ' + res.error);
                }
            }
        });
    };

    const handleDelete = async (id: string, status: string) => {
        if (status !== 'DRAFT') {
            alert(t('invoices.alertDeleteOnlyDraft'));
            return;
        }
        setActionModal({
            isOpen: true,
            title: t('invoices.alertDeleteTitle'),
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={24} /></div>,
            message: <p style={{ color: '#374151', fontSize: '0.9375rem' }} dangerouslySetInnerHTML={{ __html: t('invoices.alertDeleteMsg') }}></p>,
            confirmLabel: t('invoices.alertDeleteConfirm'),
            confirmVariant: 'danger',
            action: async () => {
                const res = await deleteSalesInvoice(id);
                if (res.success) {
                    setInvoices(invoices.filter((o: any) => o.id !== id));
                } else alert(res.error);
            }
        });
    };

    const handleSaveTagsInline = async (invoiceId: string) => {
        try {
            const res = await updateSalesInvoiceTags(invoiceId, editingTagsValue);
            if (res.success) {
                setInvoices((prev: any[]) => prev.map(inv => inv.id === invoiceId ? { ...inv, tags: editingTagsValue } : inv));
            } else {
                alert(t('invoices.alertErrorGeneric') + res.error);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setEditingTagsInvoiceId(null);
        }
    };

    const baseFilteredInvoices = useMemo(() => {
        let result = invoices;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter((inv: any) =>
                inv.code?.toLowerCase().includes(query) ||
                inv.customer?.name?.toLowerCase().includes(query)
            );
        }

        if (dateFrom) result = result.filter((inv: any) => inv.date >= dateFrom);
        if (dateTo) result = result.filter((inv: any) => inv.date <= dateTo);

        return result;
    }, [invoices, searchQuery, dateFrom, dateTo]);

    const stats = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return {
            ALL: {
                count: baseFilteredInvoices.filter((i: any) => i.status !== 'CANCELLED').length,
                amount: baseFilteredInvoices.filter((i: any) => i.status !== 'CANCELLED').reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0)
            },
            DRAFT: {
                count: baseFilteredInvoices.filter((i: any) => i.status === 'DRAFT').length,
                amount: baseFilteredInvoices.filter((i: any) => i.status === 'DRAFT').reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0)
            },
            ISSUED: {
                count: baseFilteredInvoices.filter((i: any) => i.status === 'ISSUED').length,
                amount: baseFilteredInvoices.filter((i: any) => i.status === 'ISSUED').reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0)
            },
            PARTIAL_PAID: {
                count: baseFilteredInvoices.filter((i: any) => i.status === 'PARTIAL_PAID').length,
                amount: baseFilteredInvoices.filter((i: any) => i.status === 'PARTIAL_PAID').reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0)
            },
            PAID: {
                count: baseFilteredInvoices.filter((i: any) => i.status === 'PAID').length,
                amount: baseFilteredInvoices.filter((i: any) => i.status === 'PAID').reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0)
            },
            CANCELLED: {
                count: baseFilteredInvoices.filter((i: any) => i.status === 'CANCELLED').length,
                amount: baseFilteredInvoices.filter((i: any) => i.status === 'CANCELLED').reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0)
            },
            OVERDUE: {
                count: baseFilteredInvoices.filter((i: any) => i.status !== 'PAID' && i.status !== 'CANCELLED' && i.status !== 'DRAFT' && i.dueDate && new Date(i.dueDate) < now && (i.totalAmount - (i.paidAmount || 0)) > 0).length,
                amount: baseFilteredInvoices.filter((i: any) => i.status !== 'PAID' && i.status !== 'CANCELLED' && i.status !== 'DRAFT' && i.dueDate && new Date(i.dueDate) < now && (i.totalAmount - (i.paidAmount || 0)) > 0).reduce((sum: number, i: any) => sum + (i.totalAmount - (i.paidAmount || 0)), 0)
            },
            DUE_SOON: {
                count: baseFilteredInvoices.filter((i: any) => i.status !== 'PAID' && i.status !== 'CANCELLED' && i.status !== 'DRAFT' && i.dueDate && new Date(i.dueDate) >= now && (i.totalAmount - (i.paidAmount || 0)) > 0).length,
                amount: baseFilteredInvoices.filter((i: any) => i.status !== 'PAID' && i.status !== 'CANCELLED' && i.status !== 'DRAFT' && i.dueDate && new Date(i.dueDate) >= now && (i.totalAmount - (i.paidAmount || 0)) > 0).reduce((sum: number, i: any) => sum + (i.totalAmount - (i.paidAmount || 0)), 0)
            }
        };
    }, [baseFilteredInvoices]);

    const statsCards = [
        { id: 'ALL', label: t('invoices.statsAll'), count: stats.ALL.count, amount: stats.ALL.amount, colorClass: 'stat-card-purple', icon: LayoutList },
        { id: 'DRAFT', label: t('invoices.statsDraft'), count: stats.DRAFT.count, amount: stats.DRAFT.amount, colorClass: 'stat-card-amber', icon: FileText },
        { id: 'ISSUED', label: t('invoices.statsIssued'), count: stats.ISSUED.count, amount: stats.ISSUED.amount, colorClass: 'stat-card-blue', icon: PackageCheck },
        { id: 'PARTIAL_PAID', label: t('invoices.statsPartialPaid'), count: stats.PARTIAL_PAID.count, amount: stats.PARTIAL_PAID.amount, colorClass: 'stat-card-green', icon: CheckCircle2 },
        { id: 'PAID', label: t('invoices.statsPaid'), count: stats.PAID.count, amount: stats.PAID.amount, colorClass: 'stat-card-green', icon: CheckCircle2 },
        { id: 'OVERDUE', label: t('invoices.statsOverdue'), count: stats.OVERDUE.count, amount: stats.OVERDUE.amount, colorClass: 'stat-card-red', icon: AlertTriangle },
        { id: 'DUE_SOON', label: t('invoices.statsDueSoon'), count: stats.DUE_SOON.count, amount: stats.DUE_SOON.amount, colorClass: 'stat-card-amber', icon: Clock },
    ];

    const filteredInvoices = useMemo(() => {
        let result = baseFilteredInvoices;

        if (statusFilter !== 'ALL') {
            if (statusFilter === 'OVERDUE') {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                result = result.filter((i: any) => i.status !== 'PAID' && i.status !== 'CANCELLED' && i.status !== 'DRAFT' && i.dueDate && new Date(i.dueDate) < now && (i.totalAmount - (i.paidAmount || 0)) > 0);
            } else if (statusFilter === 'DUE_SOON') {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                result = result.filter((i: any) => i.status !== 'PAID' && i.status !== 'CANCELLED' && i.status !== 'DRAFT' && i.dueDate && new Date(i.dueDate) >= now && (i.totalAmount - (i.paidAmount || 0)) > 0);
            } else {
                result = result.filter((i: any) => i.status === statusFilter);
            }
        }

        result.sort((a: any, b: any) => {
            if (sortBy === 'createdAt_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === 'createdAt_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (sortBy === 'amount_desc') return b.totalAmount - a.totalAmount;
            if (sortBy === 'amount_asc') return a.totalAmount - b.totalAmount;
            if (sortBy === 'code_asc') return (a.code || '').localeCompare(b.code || '');
            if (sortBy === 'code_desc') return (b.code || '').localeCompare(a.code || '');
            return 0;
        });

        return result;
    }, [baseFilteredInvoices, statusFilter, sortBy]);

    const { paginatedItems, paginationProps } = usePagination(filteredInvoices, 25);

    const premiumCSS = `
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11.5px;
            font-weight: 600;
            line-height: 1.3;
            letter-spacing: -0.01em;
            transition: all 0.15s ease;
        }
        .badge-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .badge-warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .badge-neutral { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
        .badge-info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .badge-danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .badge-overdue { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
        
        .status-select {
            appearance: none;
            cursor: pointer;
            outline: none;
            text-align: left;
            padding: 3px 22px 3px 8px !important;
            border-radius: 6px;
            font-size: 11.5px;
            font-weight: 600;
            line-height: 1.3;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 4px center;
            background-repeat: no-repeat;
            background-size: 14px 14px;
        }
        .status-select:hover { opacity: 0.92; }

        @keyframes overduePulse {
            0%, 100% {
                background-color: #ffffff;
            }
            50% {
                background-color: #fff1f2;
            }
        }
        .row-overdue-pulse {
            animation: overduePulse 3.5s ease-in-out infinite;
        }
        .row-overdue-pulse:hover {
            background-color: #ffe4e6 !important;
        }
    `;

    return (
        <div className="flex flex-col gap-5">
            {/* Top Page Tech Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            BÁN HÀNG &amp; HÓA ĐƠN
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">|</span>
                        <span className="text-[11px] font-medium text-slate-500">Quản lý xuất hóa đơn bán hàng, theo dõi công nợ và hạn thanh toán</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{t('invoices.title')}</h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                            {invoices.length}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                    {isAdminOrManager && users && users.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">{t('invoices.filterEmployee')}:</span>
                            <select
                                className="h-[34px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-2xs cursor-pointer"
                                defaultValue={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('employeeId') || '' : ''}
                                onChange={(e) => {
                                    const newEmployeeId = e.target.value;
                                    const params = new URLSearchParams(window.location.search);
                                    if (newEmployeeId) {
                                        params.set('employeeId', newEmployeeId);
                                    } else {
                                        params.delete('employeeId');
                                    }
                                    window.location.href = `/sales/invoices?${params.toString()}`;
                                }}
                            >
                                <option value="">{t('invoices.allEmployees')}</option>
                                {users.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <Button
                        onClick={handleOpenCreate}
                        className="btn btn-primary gap-2 h-[34px] px-3.5 text-xs font-bold rounded-lg shadow-sm"
                    >
                        <Plus size={15} className="stroke-[2.5]" />
                        <span>{t('invoices.createInvoice')}</span>
                    </Button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: premiumCSS }} />

            {/* Filter Cards */}
            <div className="flex flex-wrap gap-3 mb-5">
                {statsCards.map(stat => (
                    <div
                        key={stat.id}
                        onClick={() => setStatusFilter(stat.id)}
                        className={`stat-card ${stat.colorClass} cursor-pointer flex-1 min-w-[140px] transition-all hover:-translate-y-0.5 ${statusFilter === stat.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-1.5">
                            <span className="stat-title text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                            <div className="stat-icon p-1.5 rounded-full flex items-center justify-center">
                                <stat.icon size={15} />
                            </div>
                        </div>
                        <div className="stat-info">
                            <span className="stat-value text-2xl font-bold">{stat.count}</span>
                        </div>
                        {stat.amount > 0 && (
                            <div className="mt-1.5 text-[11px] font-semibold opacity-85 break-words whitespace-nowrap overflow-hidden text-ellipsis">
                                {formatMoney(stat.amount)}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Filter Ribbon */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 mb-5 flex gap-3 items-center flex-wrap">
                <div className="flex-1 relative min-w-[200px]">
                    <input
                        type="text"
                        placeholder={t('invoices.searchPlaceholder')}
                        className="px-3 border border-slate-300 py-1.5 rounded-lg text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 w-full bg-white shadow-xs"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                    <Calendar size={14} className="text-slate-400" />
                    <input
                        type="date"
                        className="border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white shadow-xs"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        title={t('invoices.fromDate')}
                    />
                    <span className="text-slate-400">-</span>
                    <input
                        type="date"
                        className="border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white shadow-xs"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        title={t('invoices.toDate')}
                    />
                </div>
                <div className="flex items-center gap-2 min-w-[180px]">
                    <select
                        className="border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 w-full bg-white cursor-pointer shadow-xs"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                    >
                        <option value="createdAt_desc">{t('invoices.sortNewest')}</option>
                        <option value="date_desc">{t('invoices.sortDateDesc')}</option>
                        <option value="date_asc">{t('invoices.sortDateAsc')}</option>
                        <option value="amount_desc">{t('invoices.sortAmountDesc')}</option>
                        <option value="amount_asc">{t('invoices.sortAmountAsc')}</option>
                        <option value="code_asc">{t('invoices.sortCodeAsc')}</option>
                        <option value="code_desc">{t('invoices.sortCodeDesc')}</option>
                    </select>
                </div>
            </div>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? (formData.status !== 'DRAFT' ? 'Điều Chỉnh Hóa Đơn Bán Hàng' : t('invoices.editInvoice')) : t('invoices.createInvoiceModal')} maxWidth="1000px">
                <div className="flex flex-col gap-4 py-1">
                    {formData.id && formData.status && formData.status !== 'DRAFT' && (
                        <div className="p-3 mb-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 shadow-2xs">
                            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={14} />
                            <div>
                                <strong className="block font-semibold mb-0.5 text-xs">Điều chỉnh hóa đơn đã duyệt & ghi nhận nợ</strong>
                                Hóa đơn này đã được ghi nhận công nợ và xuất kho. Khi lưu điều chỉnh, hệ thống sẽ <strong>tự động hoàn nhập kho cũ, xuất kho mới và tính toán lại công nợ khách hàng</strong>, đồng thời ghi nhật ký kiểm toán (log) chi tiết.
                            </div>
                        </div>
                    )}
                    <div>
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Thông tin chung</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('invoices.code')}</label>
                                <input
                                    type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs bg-slate-100 text-slate-700 font-mono"
                                    value={formData.code}
                                    readOnly
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('invoices.order')}</label>
                                <SearchableSelect
                                    options={[{ value: '', label: t('invoices.orderSelect') }, ...confirmedOrders.map((o: any) => ({ value: o.id, label: `${o.code} - ${o.customer?.name || 'KH'}` }))]}
                                    value={formData.orderId || ''}
                                    onChange={handleOrderSelect}
                                    placeholder={t('invoices.orderSelect')}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('invoices.customerReq')}</label>
                                <SearchableSelect
                                    options={customers.map((c: any) => ({ value: c.id, label: c.name }))}
                                    value={formData.customerId || ''}
                                    onChange={val => setFormData({ ...formData, customerId: val })}
                                    placeholder={t('invoices.customerSelect')}
                                    disabled={!!formData.orderId}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('invoices.dueDateString')}</label>
                                <input
                                    type="date" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                    value={formData.dueDate}
                                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">{t('invoices.salespersonString')}</label>
                                    <SearchableSelect
                                        options={users?.map((u: any) => ({ value: u.id, label: u.name })) || []}
                                        value={formData.salespersonId || ''}
                                        onChange={val => setFormData({ ...formData, salespersonId: val })}
                                        placeholder={t('invoices.salespersonSelect')}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('invoices.generalNotes')}</label>
                                        <input
                                            type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400"
                                            value={formData.notes || ''}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            placeholder={t('invoices.generalNotesPlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('invoices.tags')}</label>
                                        <input
                                            type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400"
                                            value={formData.tags || ''}
                                            onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                            placeholder={t('invoices.tagsPlaceholder')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{t('invoices.productDetails')}</h3>
                        <div className="flex flex-col bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
                            <div className="mb-3 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-2.5">
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                                    <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={!isCustomProduct} onChange={() => setIsCustomProduct(false)} />
                                    <span>{t('invoices.selectFromInventory')}</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                                    <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={isCustomProduct} onChange={() => setIsCustomProduct(true)} />
                                    <span>{t('invoices.enterCustomProduct')}</span>
                                </label>
                                {isCustomProduct && (
                                    <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                                        ✨ Tự động lưu vào kho
                                    </span>
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
                                <div className="flex-1 w-full min-w-[150px]">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">{t('invoices.productName')}</label>
                                    {!isCustomProduct ? (
                                        <SearchableSelect
                                            options={products.map((p: any) => ({ value: p.id, label: `${p.sku} - ${p.name} (Tồn: ${p.inventories?.[0]?.quantity || 0})` }))}
                                            value={selectedProduct || ''}
                                            onChange={handleProductSelect}
                                            placeholder={t('invoices.productSelect')}
                                        />
                                    ) : (
                                        <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400" placeholder={t('invoices.productNamePlaceholder')} value={customName} onChange={e => setCustomName(e.target.value)} />
                                    )}
                                </div>
                                {isCustomProduct && (
                                    <div className="w-full md:w-20 shrink-0">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('invoices.unit')}</label>
                                        <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white text-center" placeholder={t('invoices.unitPlaceholder')} value={customUnit} onChange={e => setCustomUnit(e.target.value)} />
                                    </div>
                                )}
                                <div className="w-full md:w-36 shrink-0">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        {isPriceInclusiveVat ? 'Đ.giá (gồm VAT)' : t('invoices.unitPrice')}
                                    </label>
                                    <input type="number" step="any" min="0" className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none transition-all text-slate-900 bg-white ${isPriceInclusiveVat ? 'border-emerald-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-emerald-50/20 font-semibold text-emerald-800' : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'}`} value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div className="w-full md:w-24 shrink-0">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">{t('invoices.taxRateLabel')}</label>
                                    <TaxRateSelect
                                        value={customTaxRate}
                                        onChange={(val) => setCustomTaxRate(val)}
                                    />
                                </div>
                                <div className="w-full md:w-16 shrink-0">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">{t('invoices.quantityLabel')}</label>
                                    <input type="number" step="any" min="0.0001" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-center text-slate-900 bg-white" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div className="w-full md:w-20 shrink-0 flex flex-col items-center justify-center">
                                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wide">T/Phần bộ?</label>
                                    <div className="h-[34px] flex items-center justify-center">
                                        <input type="checkbox" className="w-4 h-4 outline-none cursor-pointer accent-emerald-600 rounded" checked={isSubItem} onChange={e => setIsSubItem(e.target.checked)} />
                                    </div>
                                </div>
                                <Button onClick={handleAddItem} variant="secondary" className="w-full md:w-auto shrink-0 h-[34px] px-4 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-2xs font-semibold text-xs rounded-lg flex items-center justify-center">{t('invoices.addButton')}</Button>
                            </div>

                            {/* Calculation preview when isPriceInclusiveVat is ON */}
                            {isPriceInclusiveVat && price > 0 && (
                                <div className="mb-3 p-2 bg-emerald-50/80 border border-emerald-200/80 rounded-lg text-xs flex flex-wrap items-center gap-x-4 gap-y-1 text-emerald-900 shadow-2xs animate-fadeIn">
                                    <div>💡 <strong>Giá đã gồm VAT:</strong> {formatMoney(price)}</div>
                                    <div>➔ <strong>Đơn giá trước thuế:</strong> <span className="font-bold text-blue-700">{formatMoney(calcPreTaxPrice(price, customTaxRate))}</span></div>
                                    <div>➔ <strong>Thuế suất:</strong> <TaxBadge rate={customTaxRate} /></div>
                                    <div>➔ <strong>Tiền thuế/SP:</strong> <span className="font-semibold text-amber-700">{formatMoney(price - calcPreTaxPrice(price, customTaxRate))}</span></div>
                                    <div>➔ <strong>Thành tiền ({qty} {isCustomProduct ? customUnit : (products.find((p: any) => p.id === selectedProduct)?.unit || 'Cái')}):</strong> <span className="font-bold text-emerald-700">{formatMoney(price * qty)}</span></div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('invoices.techDetailsDesc')} <span className="text-slate-400 font-normal">{t('invoices.techDetailsDescSub')}</span></label>
                                <div className="flex items-center gap-3 mb-1.5">
                                    <label className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium ${isCustomProduct ? 'text-slate-400' : 'text-slate-700'}`}>
                                        <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={useInventoryDescription && !isCustomProduct} onChange={() => handleDescSourceChange(true)} disabled={isCustomProduct} />
                                        <span>{t('invoices.descFromInventory')}</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                                        <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={!useInventoryDescription || isCustomProduct} onChange={() => handleDescSourceChange(false)} />
                                        <span>{t('invoices.descCustom')}</span>
                                    </label>
                                </div>
                                <textarea rows={2} className={`w-full border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none text-xs text-slate-900 bg-white placeholder:text-slate-400`} placeholder={t('invoices.descPlaceholder')} value={customDescription} onChange={e => setCustomDescription(e.target.value)}></textarea>
                            </div>
                        </div>
                    </div>

                    {formData.items.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-x-auto mt-1 border-t pt-3">
                            <table className="w-full min-w-[600px] text-xs mb-2 bg-white text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                    <tr>
                                        <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider">{t('invoices.colProduct')}</th>
                                        <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-center w-16">{t('invoices.colQty')}</th>
                                        <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-right w-28">{t('invoices.colPrice')}</th>
                                        <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-center w-20">{t('invoices.colTax')}</th>
                                        <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-right w-32">{t('invoices.colAmountRow')}</th>
                                        <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-center w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {formData.items.map((item: any, i: number) => (
                                        <tr key={i} className={`hover:bg-slate-50/80 transition-colors ${item.isSubItem ? 'bg-slate-50/50' : ''}`}>
                                            <td className="p-2.5 text-slate-800" style={item.isSubItem ? { paddingLeft: '1.5rem' } : {}}>
                                                <div className="font-semibold flex items-center gap-1.5">
                                                    {item.isSubItem && <span className="text-slate-400">↳</span>}
                                                    <span className={item.isSubItem ? 'text-slate-600 font-medium' : ''}>{item.productName || item.customName}</span>
                                                </div>
                                                {item.description && <div className="text-[11px] text-slate-500 mt-0.5 max-w-sm whitespace-pre-wrap">{item.description}</div>}
                                            </td>
                                            <td className="p-2.5 text-center text-slate-800 font-mono">
                                                {item.quantity} <span className="text-[11px] text-slate-500 ml-0.5">{item.unit}</span>
                                            </td>
                                            <td className="p-2.5 text-right text-slate-700 font-mono">{formatMoney(item.unitPrice)}</td>
                                            <td className="p-2.5 text-center bg-slate-50/50 border-x border-slate-100">
                                                <TaxBadge rate={item.taxRate} />
                                            </td>
                                            <td className="p-2.5 text-right font-bold text-slate-900 font-mono">{formatMoney(item.totalPrice)}</td>
                                            <td className="p-2.5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button type="button" onClick={() => handleEditItem(i)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors" title={t('invoices.edit')}><Edit2 size={14} /></button>
                                                    <button type="button" onClick={() => handleRemoveItem(i)} className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition-colors" title={t('invoices.delete')}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t border-slate-200 text-slate-700 text-xs">
                                    <tr>
                                        <td colSpan={4} className="p-2.5 text-right font-medium">{t('invoices.subTotal')}:</td>
                                        <td className="p-2.5 text-right font-medium font-mono text-slate-800">{formatMoney(formData.subTotal || 0)}</td>
                                        <td className="p-2.5"></td>
                                    </tr>
                                    <tr>
                                        <td colSpan={4} className="p-2.5 text-right font-medium">{t('invoices.totalTax')}:</td>
                                        <td className="p-2.5 text-right font-medium font-mono text-slate-500">{formatMoney(formData.taxAmount || 0)}</td>
                                        <td className="p-2.5"></td>
                                    </tr>
                                    <tr className="border-t border-slate-200">
                                        <td colSpan={4} className="p-2.5 text-right font-bold text-xs">{t('invoices.grandTotal')}:</td>
                                        <td className="p-2.5 text-right font-bold text-emerald-700 text-sm font-mono">{formatMoney(formData.totalAmount || 0)}</td>
                                        <td className="p-2.5"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-3 border-t border-slate-200 mt-2">
                        <Button onClick={() => setIsFormOpen(false)} variant="secondary" className="w-full sm:w-auto h-[34px] px-4 text-xs font-semibold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs rounded-lg">
                            {t('invoices.cancel')}
                        </Button>
                        <Button onClick={handleSave} variant="secondary" className="w-full sm:w-auto flex justify-center items-center gap-1.5 h-[34px] px-4 text-xs font-semibold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs rounded-lg">
                            <Save size={14} /> <span>{formData.id ? (formData.status !== 'DRAFT' ? 'Cập Nhật Điều Chỉnh' : t('invoices.saveInvoice')) : t('invoices.modalSaveBtn')}</span>
                        </Button>
                        {(!formData.id || formData.status === 'DRAFT') && (
                            <Button onClick={handleSaveAndApprove} className="w-full sm:w-auto flex justify-center items-center gap-1.5 h-[34px] px-5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg border-emerald-600 shadow-2xs">
                                <CheckCircle2 size={14} /> <span>{t('invoices.modalSaveAndApproveBtn')}</span>
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

            <div className="overflow-x-auto pb-2">
                <Table>
                    <thead className="bg-slate-50/80 border-b border-slate-200">
                        <tr>
                            <th className="text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('code')}>
                                <div className="flex items-center gap-1">
                                    {t('invoices.colCode')} {sortBy === 'code_asc' ? <ChevronUp size={13} /> : sortBy === 'code_desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-30" />}
                                </div>
                            </th>
                            <th className="text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('date')}>
                                <div className="flex items-center gap-1">
                                    {t('invoices.colDate')}
                                    {sortBy === 'date_asc' ? <ChevronUp size={13} /> : sortBy === 'date_desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-30" />}
                                </div>
                            </th>
                            <th className="text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">{t('invoices.colCustomer')} / {t('invoices.colOrder')}</th>
                            <th className="text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">{t('invoices.salespersonString')}</th>
                            <th className="text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">{t('invoices.tags')}</th>
                            <th className="text-right font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('amount')}>
                                <div className="flex items-center justify-end gap-1">
                                    {t('invoices.colAmount')} {sortBy === 'amount_asc' ? <ChevronUp size={13} /> : sortBy === 'amount_desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-30" />}
                                </div>
                            </th>
                            <th className="text-right font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">{t('invoices.colCollected')}</th>
                            <th className="text-center font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">{t('invoices.colStatus')}</th>
                            <th className="text-right font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">{t('invoices.colAction')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedItems.map((inv: any) => {
                            const isOverdue = inv.dueDate && new Date(inv.dueDate).getTime() < new Date().setHours(0, 0, 0, 0) && !['DRAFT', 'PAID', 'CANCELLED'].includes(inv.status);
                            
                            let badgeColorClass = 'badge-neutral';
                            if (inv.status === 'PAID') badgeColorClass = 'badge-success';
                            else if (inv.status === 'PARTIAL_PAID') badgeColorClass = 'badge-warning';
                            else if (inv.status === 'CANCELLED') badgeColorClass = 'badge-neutral text-slate-400 line-through';
                            else if (isOverdue) badgeColorClass = 'badge-overdue';
                            else if (inv.status === 'ISSUED') badgeColorClass = 'badge-info';

                            return (
                                <tr key={inv.id} className={`transition-colors ${isOverdue ? 'row-overdue-pulse' : 'hover:bg-slate-50/70'}`}>
                                    <td className="py-3 px-3 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <FileText size={14} className="text-slate-400 shrink-0" />
                                            <Link href={`/sales/invoices/${inv.id}`} className="font-mono font-bold hover:text-emerald-700 hover:underline transition-colors block text-xs text-slate-900 tracking-tight">
                                                {inv.code}
                                            </Link>
                                            {inv.orderId && <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200/80 px-1 py-0.2 rounded font-medium shrink-0">{t('invoices.inherited') || 'SO'}</span>}
                                        </div>
                                    </td>
                                    <td className="py-3 px-3 whitespace-nowrap">
                                        <div className="text-xs font-mono text-slate-700 font-medium">{formatDate(inv.date)}</div>
                                        {inv.dueDate && (
                                            <div className={`flex items-center gap-1 text-[10.5px] font-mono mt-0.5 ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-400'}`} title={t('invoices.dueDateString')}>
                                                <Clock size={10} className="shrink-0" /> {formatDate(inv.dueDate)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 min-w-[190px] max-w-[260px]">
                                        {inv.customerId ? (
                                            <Link href={`/customers/${inv.customerId}`} className="font-semibold text-slate-800 hover:text-emerald-700 hover:underline transition-colors block text-xs truncate" title={inv.customer?.name}>
                                                {inv.customer?.name}
                                            </Link>
                                        ) : (
                                            <span className="font-semibold text-slate-800 text-xs block truncate" title={inv.customer?.name}>{inv.customer?.name}</span>
                                        )}
                                        {inv.order && (
                                            <Link href={`/sales/orders/${inv.order.id}`} className="text-[11px] font-mono text-blue-600 hover:underline mt-0.5 inline-flex items-center gap-1 font-medium">
                                                <LinkIcon size={10} /> SO: {inv.order.code}
                                            </Link>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <AvatarImage
                                                src={inv.salesperson?.avatarUrl}
                                                name={inv.salesperson?.name || inv.creator?.name || '?'}
                                                size={20}
                                            />
                                            <span className="text-xs font-medium text-slate-700 truncate max-w-[130px]">{inv.salesperson?.name || inv.creator?.name || t('invoices.unknown') || 'Không rõ'}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-3">
                                        <div className="group/tags relative cursor-text min-h-[26px] flex items-center rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-50/80 px-1 transition-colors"
                                             onClick={(e) => {
                                                 if (editingTagsInvoiceId !== inv.id) {
                                                     setEditingTagsInvoiceId(inv.id);
                                                     setEditingTagsValue(inv.tags || '');
                                                 }
                                             }}>
                                            {editingTagsInvoiceId === inv.id ? (
                                                <div className="flex flex-col gap-1 w-full py-0.5" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        className="w-full text-xs px-2 py-1 border border-primary rounded-md outline-none focus:ring-1 focus:ring-primary shadow-2xs bg-white"
                                                        value={editingTagsValue}
                                                        onChange={(e) => setEditingTagsValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveTagsInline(inv.id);
                                                            if (e.key === 'Escape') setEditingTagsInvoiceId(null);
                                                        }}
                                                        placeholder="tag1, tag2..."
                                                    />
                                                    <div className="flex gap-1 justify-end">
                                                        <button onClick={() => setEditingTagsInvoiceId(null)} className="p-0.5 rounded text-slate-500 hover:bg-slate-200" title="Hủy">
                                                            <X size={12} />
                                                        </button>
                                                        <button onClick={() => handleSaveTagsInline(inv.id)} className="p-0.5 rounded text-emerald-600 hover:bg-emerald-100 font-bold" title="Lưu">
                                                            <CheckCircle2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-full">
                                                    {inv.tags ? (
                                                        <TagDisplay tagsString={inv.tags} />
                                                    ) : (
                                                        <span className="text-[11px] text-slate-400 opacity-0 group-hover/tags:opacity-100 transition-opacity rounded px-1.5 py-0.5 inline-flex items-center gap-1 bg-slate-100/60">
                                                            <Plus size={10} /> Thẻ
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-bold text-xs text-slate-900 whitespace-nowrap">{formatMoney(inv.totalAmount)}</td>
                                    <td className="py-3 px-3 text-right font-mono font-bold text-xs whitespace-nowrap">
                                        <span className={inv.paidAmount > 0 ? 'text-emerald-600' : 'text-slate-400'}>{formatMoney(inv.paidAmount)}</span>
                                    </td>
                                    <td className="py-3 px-3 text-center whitespace-nowrap">
                                        <div className="inline-flex items-center justify-center">
                                            <select
                                                className={`status-badge status-select ${badgeColorClass}`}
                                                value={inv.status}
                                                onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                                                title={inv.status === 'CANCELLED' ? (t('invoices.statusCancelled') || "Hóa đơn đã phân hủy") : (t('invoices.clickToChange') || "Nhấn để đổi trạng thái")}
                                                disabled={inv.status === 'CANCELLED'}
                                            >
                                                <option value="DRAFT" className="bg-white text-slate-800">{t('invoices.statsDraft')}</option>
                                                <option value="ISSUED" className="bg-white text-slate-800">{isOverdue ? `${t('invoices.statsIssued')} (Quá hạn)` : t('invoices.statsIssued')}</option>
                                                <option value="PARTIAL_PAID" className="bg-white text-slate-800">{t('invoices.statsPartialPaid')}</option>
                                                <option value="PAID" className="bg-white text-slate-800">{t('invoices.statsPaid')}</option>
                                                {inv.status === 'CANCELLED' && <option value="CANCELLED" className="bg-white text-slate-800">{t('invoices.cancel')}</option>}
                                            </select>
                                        </div>
                                    </td>
                                    <td className="py-3 px-3 text-right whitespace-nowrap">
                                        <div className="flex justify-end gap-1 items-center">
                                            {inv.status === 'DRAFT' && (
                                                <button onClick={() => handleApprove(inv.id)} className="text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 px-2 py-1 text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-all rounded-md mr-1" title={t('invoices.actionApproveDesc') || "Duyệt để Ghi nhận Nợ & Xuất Kho"}>
                                                    <CheckCircle2 size={12} /> {t('invoices.actionApprove')}
                                                </button>
                                            )}
                                            {inv.status !== 'CANCELLED' && (
                                                <button
                                                    onClick={() => handleEdit(inv)}
                                                    title={inv.status === 'DRAFT' ? t('invoices.edit') : 'Điều chỉnh hóa đơn'}
                                                    className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            )}
                                            <button onClick={() => handleCopy(inv)} title={t('invoices.copy')} className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                                                <Copy size={14} />
                                            </button>
                                            <Link href={`/sales/invoices/${inv.id}`} title={t('invoices.viewDetails')} className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors block">
                                                <Eye size={14} />
                                            </Link>
                                            <Link href={`/print/sales/invoice/${inv.id}`} target="_blank" title={t('invoices.printPdf')} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors block">
                                                <Printer size={14} />
                                            </Link>
                                            {inv.status !== 'CANCELLED' && (
                                                <button onClick={() => handleCancel(inv.id)} title={t('invoices.cancelInvoice')} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors block">
                                                    <XCircle size={14} />
                                                </button>
                                            )}
                                            {inv.status === 'CANCELLED' && (
                                                <button onClick={() => handleRestore(inv.id)} title={t('invoices.restoreInvoice')} className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors block">
                                                    <Undo2 size={14} />
                                                </button>
                                            )}
                                            {inv.status === 'DRAFT' && (
                                                <button onClick={() => handleDelete(inv.id, inv.status)} title={t('invoices.delete')} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors block">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {paginatedItems.length === 0 && (
                            <tr><td colSpan={9} className="py-8 text-center text-slate-400 text-xs">{t('invoices.emptyNoMatch')}</td></tr>
                        )}
                    </tbody>
                </Table>
            </div>
            <Pagination {...paginationProps} />

            {/* Generic Action Modal */}
            <Modal isOpen={!!actionModal?.isOpen} onClose={() => !isActioning && setActionModal(null)} title={actionModal?.title || t('invoices.confirm') || 'Xác nhận'}>
                <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {actionModal?.icon && (
                            <div style={{ flexShrink: 0, marginTop: '0.25rem' }}>
                                {actionModal.icon}
                            </div>
                        )}
                        <div style={{ flex: 1, color: 'var(--text-main)', fontSize: '0.9375rem', lineHeight: '1.6' }}>
                            {actionModal?.message}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                        <button onClick={() => setActionModal(null)} className="btn btn-secondary" disabled={isActioning}>
                            {actionModal?.cancelLabel || t('invoices.cancel') || 'Hủy Bỏ'}
                        </button>
                        <button onClick={async () => {
                            if (!actionModal) return;
                            setIsActioning(true);
                            try {
                                await actionModal.action();
                            } finally {
                                setIsActioning(false);
                                setActionModal(null);
                            }
                        }} className={`btn ${actionModal?.confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                            style={actionModal?.confirmVariant === 'success' ? { backgroundColor: 'var(--success)' } :
                                actionModal?.confirmVariant === 'warning' ? { backgroundColor: '#f59e0b' } : {}}
                            disabled={isActioning}>
                            {isActioning ? (
                                <span style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '8px' }}></span>
                                    {t('invoices.processing') || 'Đang xử lý...'}
                                </span>
                            ) : (actionModal?.confirmLabel || t('invoices.confirmBtn') || 'Xác Nhận')}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
