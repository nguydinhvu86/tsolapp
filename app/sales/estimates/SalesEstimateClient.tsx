'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { Button } from '@/app/components/ui/Button';
import { useTranslation } from '@/app/i18n/LanguageContext';
import { Modal } from '@/app/components/ui/Modal';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Plus, Edit2, Trash2, Save, X, Printer, FileText, Search, Calendar, FolderClock, LayoutList, CheckCircle2, XCircle, Eye, Link as LinkIcon, Download, ChevronUp, ChevronDown, Check, ArrowRightLeft, ShoppingCart, Copy, ArrowUpDown } from 'lucide-react';
import { submitSalesEstimate, updateSalesEstimateStatus, deleteSalesEstimate, updateSalesEstimate, convertEstimateToInvoice, convertEstimateToOrder } from './actions';
import { formatMoney, formatDate, formatTaxRate, calcPreTaxPrice, calcTaxAmount } from '@/lib/utils/formatters';
import { TaxRateSelect, TaxBadge } from '@/app/components/ui/TaxRateSelect';
import { TagDisplay } from '@/app/components/ui/TagDisplay';
import { AvatarImage } from '@/app/components/ui/AvatarImage';

export default function SalesEstimateClient({ initialEstimates, customers, products, leads, projects, nextCode, initialAction, initialCustomerId, initialLeadId, initialProjectId, users, currentUserId, isAdminOrManager }: any) {
    const { t } = useTranslation();
    const router = useRouter();
    const [estimates, setEstimates] = useState(initialEstimates);
    const [isFormOpen, setIsFormOpen] = useState(initialAction === 'new');

    // Convert to Invoice state
    const [convertModalId, setConvertModalId] = useState<string | null>(null);
    const [isConverting, setIsConverting] = useState(false);

    // Convert to Order state
    const [convertOrderModalId, setConvertOrderModalId] = useState<string | null>(null);
    const [isConvertingOrder, setIsConvertingOrder] = useState(false);

    // Generic Action Modal State
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, title: string, message: React.ReactNode, action: () => Promise<void> } | null>(null);
    const [isActioning, setIsActioning] = useState(false);

    // Filters & Sort
    const [statusFilter, setStatusFilter] = useState('ALL');
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

    // Handle timezone offset to get correct local date string (YYYY-MM-DD)
    const getLocalDateStr = (d: Date) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState<any>({
        code: nextCode,
        customerId: initialCustomerId || '',
        leadId: initialLeadId || '',
        projectId: initialProjectId || '',
        salespersonId: currentUserId || '',
        date: getLocalDateStr(new Date()),
        validUntil: getLocalDateStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        notes: '',
        status: 'DRAFT',
        templateType: 'STANDARD',
        tags: '',
        subTotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        items: []
    });

    const handleOpenCreate = () => {
        setFormData({
            code: nextCode, // Assume nextCode persists or is updated elsewhere
            customerId: initialCustomerId || '',
            leadId: initialLeadId || '',
            projectId: initialProjectId || '',
            salespersonId: currentUserId || '',
            date: getLocalDateStr(new Date()),
            validUntil: getLocalDateStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
            notes: '',
            status: 'DRAFT',
            templateType: 'STANDARD',
            tags: '',
            subTotal: 0,
            taxAmount: 0,
            totalAmount: 0,
            items: []
        });
        setQty(1);
        setPrice(0);
        setSelectedProduct('');
        setIsSubItem(false);
        setItemOrigin('');
        setItemWarranty('');
        setItemManufacture('');
        setItemImageUrl('');
        setItemLaborPrice(0);
        setIsFormOpen(true);
    };

    const handleEdit = (est: any) => {
        const mappedItems = est.items ? est.items.map((i: any) => ({
            productId: i.productId,
            productName: i.product?.name || i.customName || '',
            customName: i.customName || '',
            description: i.description,
            unit: i.product?.unit || i.unit || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0,
            taxAmount: i.taxAmount || 0,
            totalPrice: i.totalPrice,
            isSubItem: i.isSubItem || false,
            origin: i.origin || '',
            warranty: i.warranty || '',
            manufacture: i.manufacture || '',
            imageUrl: i.imageUrl || '',
            laborPrice: i.laborPrice || 0
        })) : [];

        const calcSubTotal = mappedItems.reduce((acc: number, curr: any) => acc + (curr.quantity * (curr.unitPrice + (curr.laborPrice || 0))), 0);
        const calcTaxAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.taxAmount, 0);
        const calcTotalAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.totalPrice, 0);

        setFormData({
            id: est.id,
            code: est.code || '',
            customerId: est.customerId || '',
            leadId: est.leadId || '',
            projectId: est.projects?.[0]?.id || '',
            salespersonId: est.salespersonId || est.creatorId || currentUserId || '',
            date: est.date ? getLocalDateStr(new Date(est.date)) : getLocalDateStr(new Date()),
            validUntil: est.validUntil ? getLocalDateStr(new Date(est.validUntil)) : '',
            notes: est.notes || '',
            status: est.status || 'DRAFT',
            templateType: est.templateType || 'STANDARD',
            tags: est.tags || '',
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

    const handleCopy = (est: any) => {
        const mappedItems = est.items ? est.items.map((i: any) => ({
            productId: i.productId,
            productName: i.product?.name || i.customName || '',
            customName: i.customName || '',
            description: i.description,
            unit: i.product?.unit || i.unit || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0,
            taxAmount: i.taxAmount || 0,
            totalPrice: i.totalPrice,
            isSubItem: i.isSubItem || false,
            origin: i.origin || '',
            warranty: i.warranty || '',
            manufacture: i.manufacture || '',
            imageUrl: i.imageUrl || '',
            laborPrice: i.laborPrice || 0
        })) : [];

        const calcSubTotal = mappedItems.reduce((acc: number, curr: any) => acc + (curr.quantity * (curr.unitPrice + (curr.laborPrice || 0))), 0);
        const calcTaxAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.taxAmount, 0);
        const calcTotalAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.totalPrice, 0);

        setFormData({
            code: nextCode,
            customerId: est.customerId || '',
            projectId: est.projects?.[0]?.id || '',
            salespersonId: currentUserId || '',
            date: getLocalDateStr(new Date()),
            validUntil: est.validUntil ? getLocalDateStr(new Date(est.validUntil)) : '',
            notes: est.notes || '',
            status: 'DRAFT',
            templateType: est.templateType || 'STANDARD',
            tags: est.tags || '',
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
            if (editId && estimates.length > 0) {
                const estToEdit = estimates.find((e: any) => e.id === editId);
                if (estToEdit && estToEdit.status === 'DRAFT') {
                    handleEdit(estToEdit);
                    window.history.replaceState({}, '', '/sales/estimates');
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estimates]);

    // Quick Item state
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
    
    // Multi-Template extended states
    const [itemOrigin, setItemOrigin] = useState('');
    const [itemWarranty, setItemWarranty] = useState('');
    const [itemManufacture, setItemManufacture] = useState('');
    const [itemImageUrl, setItemImageUrl] = useState('');
    const [itemLaborPrice, setItemLaborPrice] = useState(0);

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
                alert(t('estimates.errorCustomName'));
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
        const baseTotal = qty * (effectiveUnitPrice + itemLaborPrice);
        const taxItemAmount = calcTaxAmount(baseTotal, taxRate);
        const total = isPriceInclusiveVat ? (qty * (price + itemLaborPrice)) : (baseTotal + taxItemAmount);

        setFormData((prev: any) => ({
            ...prev,
            items: [...prev.items, {
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
                isSubItem: isSubItem,
                origin: itemOrigin,
                warranty: itemWarranty,
                manufacture: itemManufacture,
                imageUrl: itemImageUrl,
                laborPrice: itemLaborPrice
            }],
            subTotal: (prev.subTotal || 0) + baseTotal,
            taxAmount: (prev.taxAmount || 0) + taxItemAmount,
            totalAmount: (prev.totalAmount || 0) + total
        }));

        setSelectedProduct('');
        setCustomName('');
        setCustomDescription('');
        setCustomUnit('Cái');
        setQty(1);
        setPrice(0);
        setIsSubItem(false);
        setItemOrigin('');
        setItemWarranty('');
        setItemManufacture('');
        setItemImageUrl('');
        setItemLaborPrice(0);
        setIsPriceInclusiveVat(false);
    };

    const handleRemoveItem = (index: number) => {
        setFormData((prev: any) => {
            const newItems = [...prev.items];
            newItems.splice(index, 1);

            const calcSubTotal = newItems.reduce((acc: number, curr: any) => acc + (curr.quantity * (curr.unitPrice + (curr.laborPrice || 0))), 0);
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
        setItemOrigin(item.origin || '');
        setItemWarranty(item.warranty || '');
        setItemManufacture(item.manufacture || '');
        setItemImageUrl(item.imageUrl || '');
        setItemLaborPrice(item.laborPrice || 0);

        handleRemoveItem(index);
    };

    const handleSave = async () => {
        if (!formData.customerId || formData.items.length === 0) {
            alert(t('estimates.errorSave'));
            return;
        }

        let res;
        if (formData.id) {
            res = await updateSalesEstimate(formData.id, formData);
        } else {
            res = await submitSalesEstimate('system', formData); // 'system' or real user id if context available
        }

        if (res.success) {
            if (formData.id) {
                setEstimates(estimates.map((e: any) => e.id === formData.id ? res.data : e));
            } else {
                setEstimates([res.data, ...estimates]);
            }
            setIsFormOpen(false);
            router.refresh();
        } else {
            alert(t('estimates.errorGeneric') + ' ' + res.error);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        setActionModal({
            isOpen: true,
            title: t('estimates.confirmTitle'),
            message: t('estimates.confirmChangeStatusMsg').replace('{{status}}', newStatus),
            action: async () => {
                const res = await updateSalesEstimateStatus(id, newStatus);
                if (res.success) {
                    setEstimates(estimates.map((e: any) => e.id === id ? { ...e, status: newStatus } : e));
                } else alert(res.error);
            }
        });
    };

    const handleDelete = async (id: string) => {
        setActionModal({
            isOpen: true,
            title: t('estimates.confirmDeleteTitle'),
            message: t('estimates.confirmDeleteMsg'),
            action: async () => {
                const res = await deleteSalesEstimate(id);
                if (res.success) {
                    setEstimates(estimates.filter((e: any) => e.id !== id));
                } else alert(res.error);
            }
        });
    };

    const handleConfirmConvert = async () => {
        if (!convertModalId) return;
        setIsConverting(true);
        const res = await convertEstimateToInvoice(convertModalId);
        if (res.success) {
            alert(t('estimates.successInvoice'));
            router.push('/sales/invoices');
        } else {
            alert(res.error);
            setIsConverting(false);
            setConvertModalId(null);
        }
    };

    const handleConfirmConvertOrder = async () => {
        if (!convertOrderModalId) return;
        setIsConvertingOrder(true);
        const res = await convertEstimateToOrder(convertOrderModalId);
        if (res.success) {
            alert(t('estimates.successOrder'));
            router.push('/sales/orders');
        } else {
            alert(res.error);
            setIsConvertingOrder(false);
            setConvertOrderModalId(null);
        }
    };

    const baseFilteredEstimates = useMemo(() => {
        let result = estimates;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter((e: any) =>
                e.code?.toLowerCase().includes(query) ||
                e.customer?.name?.toLowerCase().includes(query)
            );
        }

        if (dateFrom) result = result.filter((e: any) => e.date >= dateFrom);
        if (dateTo) result = result.filter((e: any) => e.date <= dateTo);

        return result;
    }, [estimates, searchQuery, dateFrom, dateTo]);

    const stats = useMemo(() => {
        return {
            ALL: {
                count: baseFilteredEstimates.length,
                amount: baseFilteredEstimates.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0)
            },
            DRAFT: {
                count: baseFilteredEstimates.filter((e: any) => e.status === 'DRAFT').length,
                amount: baseFilteredEstimates.filter((e: any) => e.status === 'DRAFT').reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0)
            },
            SENT: {
                count: baseFilteredEstimates.filter((e: any) => e.status === 'SENT').length,
                amount: baseFilteredEstimates.filter((e: any) => e.status === 'SENT').reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0)
            },
            EXPIRED: {
                count: baseFilteredEstimates.filter((e: any) => e.status === 'EXPIRED').length,
                amount: baseFilteredEstimates.filter((e: any) => e.status === 'EXPIRED').reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0)
            },
            ACCEPTED: {
                count: baseFilteredEstimates.filter((e: any) => e.status === 'ACCEPTED').length,
                amount: baseFilteredEstimates.filter((e: any) => e.status === 'ACCEPTED').reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0)
            },
            REJECTED: {
                count: baseFilteredEstimates.filter((e: any) => e.status === 'REJECTED').length,
                amount: baseFilteredEstimates.filter((e: any) => e.status === 'REJECTED').reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0)
            },
            ORDERED: {
                count: baseFilteredEstimates.filter((e: any) => e.status === 'ORDERED').length,
                amount: baseFilteredEstimates.filter((e: any) => e.status === 'ORDERED').reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0)
            },
            INVOICED: {
                count: baseFilteredEstimates.filter((e: any) => e.status === 'INVOICED').length,
                amount: baseFilteredEstimates.filter((e: any) => e.status === 'INVOICED').reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0)
            }
        };
    }, [baseFilteredEstimates]);

    const statsCards = useMemo(() => [
        { id: 'ALL', label: t('estimates.statsAll'), count: stats.ALL.count, amount: stats.ALL.amount, colorClass: 'stat-card-purple', icon: LayoutList },
        { id: 'DRAFT', label: t('estimates.statsDraft'), count: stats.DRAFT.count, amount: stats.DRAFT.amount, colorClass: 'stat-card-amber', icon: FileText },
        { id: 'SENT', label: t('estimates.statsSent'), count: stats.SENT.count, amount: stats.SENT.amount, colorClass: 'stat-card-blue', icon: FolderClock },
        { id: 'EXPIRED', label: t('estimates.statsExpired'), count: stats.EXPIRED.count, amount: stats.EXPIRED.amount, colorClass: 'stat-card-gray', icon: XCircle },
        { id: 'ACCEPTED', label: t('estimates.statsAccepted'), count: stats.ACCEPTED.count, amount: stats.ACCEPTED.amount, colorClass: 'stat-card-green', icon: CheckCircle2 },
        { id: 'ORDERED', label: t('estimates.statsOrdered'), count: stats.ORDERED.count, amount: stats.ORDERED.amount, colorClass: 'stat-card-indigo', icon: ShoppingCart },
        { id: 'INVOICED', label: t('estimates.statsInvoiced'), count: stats.INVOICED.count, amount: stats.INVOICED.amount, colorClass: 'stat-card-emerald', icon: FileText },
        { id: 'REJECTED', label: t('estimates.statsRejected'), count: stats.REJECTED.count, amount: stats.REJECTED.amount, colorClass: 'stat-card-red', icon: XCircle },
    ], [stats, t]);

    const filteredEstimates = useMemo(() => {
        let result = baseFilteredEstimates;

        if (statusFilter !== 'ALL') {
            result = result.filter((e: any) => e.status === statusFilter);
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
    }, [baseFilteredEstimates, statusFilter, sortBy]);

    const { paginatedItems, paginationProps } = usePagination(filteredEstimates, 25);

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
        .badge-purple { background: #faf5ff; color: #6b21a8; border: 1px solid #f3e8ff; }
        .badge-expired { background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; }
        .stat-card-gray { background-color: #f8fafc; color: #475569; border-color: #e2e8f0; }
        .stat-card-gray .stat-icon { background-color: #f1f5f9; color: #64748b; }
        .stat-card-gray:hover { border-color: #cbd5e1; background-color: #f1f5f9; }
        
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
    `;

    return (
        <>
            <div className="flex flex-col gap-5">
                {/* Top Page Tech Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                BÁN HÀNG &amp; BÁO GIÁ
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">|</span>
                            <span className="text-[11px] font-medium text-slate-500">Quản lý báo giá, theo dõi phản hồi và chuyển đổi sang đơn hàng</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Báo Giá Bán Hàng</h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                                {estimates.length}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                        {isAdminOrManager && users && users.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Nhân viên:</span>
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
                                        window.location.href = `/sales/estimates?${params.toString()}`;
                                    }}
                                >
                                    <option value="">Tất cả nhân viên</option>
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
                            <span>Tạo Báo Giá Mới</span>
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
                            placeholder="Tìm theo Mã BG, Tên khách hàng..."
                            className="px-3 border border-slate-300 py-1.5 rounded-lg text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 w-full bg-white shadow-xs"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-1.5 text-xs">
                        <Calendar size={14} className="text-slate-400 hidden sm:block" />
                        <input
                            type="date"
                            className="border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white shadow-xs"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            title="Từ ngày"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            className="border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white shadow-xs"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            title="Đến ngày"
                        />
                    </div>

                    <div className="flex items-center gap-2 min-w-[180px]">
                        <select
                            className="border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 w-full bg-white cursor-pointer shadow-xs"
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                        >
                            <option value="createdAt_desc">Mới tạo nhất</option>
                            <option value="date_desc">Ngày (Mới nhất)</option>
                            <option value="date_asc">Ngày (Cũ nhất)</option>
                            <option value="amount_desc">Tổng Tiền (Cao $\rightarrow$ Thấp)</option>
                            <option value="amount_asc">Tổng Tiền (Thấp $\rightarrow$ Cao)</option>
                            <option value="code_asc">Mã BG (A-Z)</option>
                            <option value="code_desc">Mã BG (Z-A)</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto pb-2">
                    <Table>
                        <thead className="bg-slate-50/80 border-b border-slate-200">
                            <tr>
                                <th className="text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('code')}>
                                    <div className="flex items-center gap-1">
                                        {t('estimates.code')} {sortBy === 'code_asc' ? <ChevronUp size={13} /> : sortBy === 'code_desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-30" />}
                                    </div>
                                </th>
                                <th className="text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('date')}>
                                    <div className="flex items-center gap-1">
                                        {t('estimates.dateCreatedExpire')}
                                        {sortBy === 'date_asc' ? <ChevronUp size={13} /> : sortBy === 'date_desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-30" />}
                                    </div>
                                </th>
                                <th className="text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">{t('estimates.customer')}</th>
                                <th className="text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">{t('estimates.salesperson')}</th>
                                <th className="text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">{t('estimates.tags')}</th>
                                <th className="text-right font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('amount')}>
                                    <div className="flex items-center justify-end gap-1">
                                        {t('estimates.totalAmount')} {sortBy === 'amount_asc' ? <ChevronUp size={13} /> : sortBy === 'amount_desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-30" />}
                                    </div>
                                </th>
                                <th className="text-center font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">{t('estimates.status')}</th>
                                <th className="text-right font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">{t('estimates.action')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedItems.map((est: any) => {
                                const isExpired = est.status === 'EXPIRED';
                                return (
                                    <tr key={est.id} className={`hover:bg-slate-50/70 transition-colors ${isExpired ? 'bg-slate-50/50' : ''}`}>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-1.5">
                                                <FileText size={15} className={`text-emerald-600 ${isExpired ? 'text-slate-400' : ''}`} />
                                                <Link href={`/sales/estimates/${est.id}`} className={`font-semibold hover:text-emerald-700 hover:underline transition-colors block text-xs ${isExpired ? 'text-slate-500' : 'text-slate-900'}`}>
                                                    {est.code}
                                                </Link>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className={`text-xs ${isExpired ? 'text-slate-500' : 'text-slate-700 font-medium'}`} suppressHydrationWarning>{formatDate(new Date(est.date))}</div>
                                            {est.validUntil && (
                                                <div className={`text-[11px] mt-0.5 flex items-center gap-1 ${isExpired ? 'text-rose-600 font-semibold' : 'text-rose-500'}`} title={t('estimates.validUntil')}>
                                                    <Calendar size={11} /> {t('estimates.validUntil')} {formatDate(est.validUntil)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-3">
                                            {est.customerId ? (
                                                <Link href={`/customers/${est.customerId}`} className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline transition-colors block text-xs">
                                                    {est.customer?.name}
                                                </Link>
                                            ) : (
                                                <span className="text-xs text-slate-800">{est.customer?.name}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2">
                                                <AvatarImage
                                                    src={est.salesperson?.avatar}
                                                    name={est.salesperson?.name}
                                                    className="w-6 h-6 bg-slate-100 border border-slate-200"
                                                />
                                                <span className="text-xs text-slate-700 font-medium">{est.salesperson?.name || t('common.unassigned')}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3">
                                            <TagDisplay tagsString={est.tags} />
                                        </td>
                                        <td className="py-3 px-3 text-right font-bold text-xs text-slate-900">{formatMoney(est.totalAmount)}</td>
                                        <td className="py-3 px-3 text-center">
                                            <select
                                                className={`status-badge status-select appearance-none ${est.status === 'SENT' ? 'badge-info' :
                                                    est.status === 'ACCEPTED' ? 'badge-success' :
                                                        est.status === 'ORDERED' ? 'badge-purple' :
                                                            est.status === 'INVOICED' ? 'badge-success' :
                                                                est.status === 'REJECTED' ? 'badge-danger' :
                                                                    est.status === 'EXPIRED' ? 'badge-expired cursor-not-allowed text-center' :
                                                                        'badge-warning'
                                                    }`}
                                                value={est.status}
                                                onChange={(e) => handleStatusChange(est.id, e.target.value)}
                                                title="Nhấn để đổi trạng thái"
                                                disabled={est.status === 'EXPIRED'}
                                                style={est.status === 'EXPIRED' ? { width: '130px', paddingRight: '10px', backgroundImage: 'none' } : {}}
                                            >
                                                <option value="DRAFT" className="bg-white text-gray-900">Bản Dự Thảo</option>
                                                <option value="SENT" className="bg-white text-gray-900">Đã Gửi KH</option>
                                                <option value="ACCEPTED" className="bg-white text-gray-900">Khách Chốt</option>
                                                <option value="ORDERED" className="bg-white text-gray-900">Đã Lên Đơn</option>
                                                <option value="INVOICED" className="bg-white text-gray-900">Đã Hóa Đơn</option>
                                                <option value="REJECTED" className="bg-white text-gray-900">Từ Chối</option>
                                                {est.status === 'EXPIRED' && <option value="EXPIRED" className="bg-white text-gray-900">Hết Hiệu Lực</option>}
                                            </select>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <div className="flex justify-end items-center gap-1.5">
                                                <div className="flex items-center gap-1">
                                                    {est.status === 'DRAFT' && (
                                                        <button onClick={() => handleEdit(est)} title={t('estimates.edit')} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                                            <Edit2 size={15} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleCopy(est)} title={t('estimates.copy')} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                                        <Copy size={15} />
                                                    </button>
                                                    <Link href={`/sales/estimates/${est.id}`} title={t('estimates.viewDetails')} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors block">
                                                        <Eye size={15} />
                                                    </Link>
                                                    <Link href={`/print/sales/estimate/${est.id}`} target="_blank" title={t('estimates.printPdf')} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors block">
                                                        <Download size={15} />
                                                    </Link>
                                                    <Link href={`/public/sales/estimate/${est.id}`} target="_blank" title={t('estimates.publicUrl')} className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors block">
                                                        <LinkIcon size={15} />
                                                    </Link>
                                                    <button onClick={() => handleDelete(est.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('estimates.delete')}>
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>

                                                {est.status === 'DRAFT' && (
                                                    <Button variant="secondary" onClick={() => handleStatusChange(est.id, 'SENT')} title={t('estimates.actionSend')} className="px-2.5 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 py-1 text-[11px] font-semibold flex-shrink-0 shadow-xs transition-all rounded-md">
                                                        {t('estimates.actionSendShort')}
                                                    </Button>
                                                )}
                                                {est.status === 'SENT' && (
                                                    <Button variant="secondary" onClick={() => handleStatusChange(est.id, 'ACCEPTED')} className="text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 px-2.5 flex-shrink-0 py-1 text-[11px] font-semibold shadow-xs transition-all rounded-md" title={t('estimates.actionAccept')}>
                                                        <Check size={13} className="mr-1 inline-block" /> {t('estimates.actionAcceptShort')}
                                                    </Button>
                                                )}
                                                {(est.status === 'DRAFT' || est.status === 'SENT' || est.status === 'ACCEPTED') && (
                                                    <>
                                                        <Button variant="secondary" onClick={() => setConvertOrderModalId(est.id)} className="text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 px-2.5 flex-shrink-0 py-1 text-[11px] font-semibold shadow-xs transition-all rounded-md" title={t('estimates.actionCreateOrder')}>
                                                            <ArrowRightLeft size={13} className="mr-1 inline-block" /> Lên Đơn
                                                        </Button>
                                                        <Button variant="secondary" onClick={() => setConvertModalId(est.id)} className="text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300 px-2.5 flex-shrink-0 py-1 text-[11px] font-semibold shadow-xs transition-all rounded-md" title={t('estimates.actionCreateInvoice')}>
                                                            <ArrowRightLeft size={13} className="mr-1 inline-block" /> Lên HĐ
                                                        </Button>
                                                    </>
                                                )}
                                                {est.status === 'EXPIRED' && (
                                                    <Button variant="secondary" onClick={() => handleCopy(est)} className="text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 px-2.5 flex-shrink-0 py-1 text-[11px] font-semibold shadow-xs transition-all rounded-md" title="Tạo một báo giá mới sao chép toàn bộ dữ liệu này">
                                                        <Copy size={13} className="mr-1 inline-block" /> Tạo Lại Mới
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedItems.length === 0 && (
                                <tr><td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                                    {estimates.length === 0 ? t('estimates.emptyNoEstimates') : t('estimates.emptyNoMatch')}
                                </td></tr>
                            )}
                        </tbody>
                    </Table>
                </div>
                <Pagination {...paginationProps} />
            </div>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? t('estimates.modalEditTitle') : t('estimates.modalCreateTitle')} maxWidth="1000px">
                <div className="flex flex-col gap-4 py-1">
                    <div>
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{t('estimates.generalInfo')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('estimates.estimateCode')}</label>
                                <input
                                    type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('estimates.customerReq')}</label>
                                <SearchableSelect
                                    options={customers.map((c: any) => ({ value: c.id, label: c.name }))}
                                    value={formData.customerId}
                                    onChange={val => setFormData({ ...formData, customerId: val, leadId: '' })}
                                    placeholder={t('estimates.selectCustomer')}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('estimates.lead')}</label>
                                <SearchableSelect
                                    options={leads?.map((l: any) => ({ value: l.id, label: l.name })) || []}
                                    value={formData.leadId}
                                    onChange={val => {
                                        const selectedLead = leads?.find((l: any) => l.id === val);
                                        if (selectedLead && selectedLead.customerId) {
                                            setFormData({ ...formData, leadId: val, customerId: selectedLead.customerId });
                                        } else {
                                            setFormData({ ...formData, leadId: val });
                                        }
                                    }}
                                    placeholder={t('estimates.selectLead')}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Dự án liên kết</label>
                                <SearchableSelect
                                    options={projects?.map((p: any) => ({ value: p.id, label: p.code + ' - ' + p.name })) || []}
                                    value={formData.projectId}
                                    onChange={val => setFormData({ ...formData, projectId: val })}
                                    placeholder="Chọn dự án..."
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Mẫu báo giá</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['STANDARD', 'WITH_IMAGES', 'PROJECT_BREAKDOWN'].map(tmpl => (
                                        <div
                                            key={tmpl}
                                            onClick={() => setFormData({ ...formData, templateType: tmpl })}
                                            className={`cursor-pointer border rounded-lg py-1.5 px-2.5 text-center text-xs transition-all ${formData.templateType === tmpl ? 'border-primary bg-emerald-50 text-emerald-800 font-semibold ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50'}`}
                                        >
                                            {tmpl === 'STANDARD' ? 'Tiêu Chuẩn' : tmpl === 'WITH_IMAGES' ? 'Thiết bị (Có hình)' : 'Công trình (Tách VT & N.Công)'}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">{t('estimates.estimateDate')}</label>
                                    <input
                                        type="date" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">{t('estimates.validUntilDate')}</label>
                                    <input
                                        type="date" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                        value={formData.validUntil}
                                        onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">{t('estimates.salespersonReq')}</label>
                                    <SearchableSelect
                                        options={users?.map((u: any) => ({ value: u.id, label: u.name })) || []}
                                        value={formData.salespersonId}
                                        onChange={val => setFormData({ ...formData, salespersonId: val })}
                                        placeholder={t('estimates.selectSalesperson')}
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">{t('estimates.notes')}</label>
                                    <input
                                        type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400"
                                        value={formData.notes || ''}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder={t('estimates.notesPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">{t('estimates.tags')}</label>
                                    <input
                                        type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400"
                                        value={formData.tags || ''}
                                        onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                        placeholder={t('estimates.tagsPlaceholder')}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Chi tiết Sản Phẩm</h3>
                        <div className="flex flex-col bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
                            <div className="mb-3 flex items-center gap-4 border-b border-slate-100 pb-2.5">
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                                    <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={!isCustomProduct} onChange={() => setIsCustomProduct(false)} />
                                    <span>Chọn từ kho</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                                    <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={isCustomProduct} onChange={() => setIsCustomProduct(true)} />
                                    <span>Nhập tự do ngoài hệ thống</span>
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
                                <div className="flex-1 w-full min-w-0">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Sản Phẩm</label>
                                    {!isCustomProduct ? (
                                        <SearchableSelect
                                            options={products.map((p: any) => ({ value: p.id, label: `${p.sku} - ${p.name}` }))}
                                            value={selectedProduct}
                                            onChange={handleProductSelect}
                                            placeholder="-- Chọn Sản Phẩm --"
                                        />
                                    ) : (
                                        <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400" placeholder="Nhập tên dịch vụ/sản phẩm..." value={customName} onChange={e => setCustomName(e.target.value)} />
                                    )}
                                </div>
                                {isCustomProduct && (
                                    <div className="w-full md:w-20">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">ĐVT</label>
                                        <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white text-center" placeholder="Đơn vị" value={customUnit} onChange={e => setCustomUnit(e.target.value)} />
                                    </div>
                                )}
                                <div className="w-full md:w-36">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        {isPriceInclusiveVat ? 'Đ.giá (gồm VAT)' : (formData.templateType === 'PROJECT_BREAKDOWN' ? 'Đ.giá vật tư' : 'Đơn giá')}
                                    </label>
                                    <input type="number" step="any" min="0" className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none transition-all text-slate-900 bg-white ${isPriceInclusiveVat ? 'border-emerald-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-emerald-50/20 font-semibold text-emerald-800' : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'}`} value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div className="w-full md:w-24">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Thuế suất</label>
                                    <TaxRateSelect
                                        value={customTaxRate}
                                        onChange={(val) => setCustomTaxRate(val)}
                                    />
                                </div>
                                <div className="w-full md:w-16">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">SL</label>
                                    <input type="number" step="any" min="0.0001" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-center text-slate-900 bg-white" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div className="w-full md:w-20 flex flex-col items-center justify-center">
                                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wide text-center">T/Phần bộ?</label>
                                    <div className="h-[34px] flex items-center justify-center">
                                        <input type="checkbox" className="w-4 h-4 outline-none cursor-pointer accent-emerald-600 rounded" checked={isSubItem} onChange={e => setIsSubItem(e.target.checked)} />
                                    </div>
                                </div>
                                <Button onClick={handleAddItem} variant="secondary" className="w-full md:w-auto h-[34px] px-4 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-2xs font-semibold text-xs rounded-lg flex items-center justify-center">Thêm</Button>
                            </div>

                            {/* Calculation preview when isPriceInclusiveVat is ON */}
                            {isPriceInclusiveVat && price > 0 && (
                                <div className="mb-3 p-2 bg-emerald-50/80 border border-emerald-200/80 rounded-lg text-xs flex flex-wrap items-center gap-x-4 gap-y-1 text-emerald-900 shadow-2xs animate-fadeIn">
                                    <div>💡 <strong>Giá đã gồm VAT:</strong> {formatMoney(price)}</div>
                                    <div>➔ <strong>Đơn giá trước thuế:</strong> <span className="font-bold text-blue-700">{formatMoney(calcPreTaxPrice(price, customTaxRate))}</span></div>
                                    <div>➔ <strong>Thuế suất:</strong> <TaxBadge rate={customTaxRate} /></div>
                                    <div>➔ <strong>Tiền thuế/SP:</strong> <span className="font-semibold text-amber-700">{formatMoney(price - calcPreTaxPrice(price, customTaxRate))}</span></div>
                                    <div>➔ <strong>Thành tiền ({qty} {isCustomProduct ? customUnit : (products.find((p: any) => p.id === selectedProduct)?.unit || 'Cái')}):</strong> <span className="font-bold text-emerald-700">{formatMoney((price + itemLaborPrice) * qty)}</span></div>
                                </div>
                            )}

                            {(formData.templateType === 'WITH_IMAGES' || formData.templateType === 'PROJECT_BREAKDOWN') && (
                                <div className="flex flex-col md:flex-row gap-2.5 md:items-end mb-3 bg-slate-50/70 p-2.5 rounded-lg border border-slate-200">
                                    {(formData.templateType === 'WITH_IMAGES' || formData.templateType === 'PROJECT_BREAKDOWN') && (
                                        <>
                                            <div className="w-full md:flex-1">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Link ảnh <span className="text-slate-400 font-normal">(URL)</span></label>
                                                <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white" placeholder="https://..." value={itemImageUrl} onChange={e => setItemImageUrl(e.target.value)} />
                                            </div>
                                            <div className="w-full md:w-28">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Hãng SX</label>
                                                <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white" placeholder="VD: Sony" value={itemManufacture} onChange={e => setItemManufacture(e.target.value)} />
                                            </div>
                                            <div className="w-full md:w-28">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Xuất xứ</label>
                                                <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white" placeholder="VD: Nhật Bản" value={itemOrigin} onChange={e => setItemOrigin(e.target.value)} />
                                            </div>
                                            <div className="w-full md:w-28">
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Bảo hành</label>
                                                <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white" placeholder="VD: 12 tháng" value={itemWarranty} onChange={e => setItemWarranty(e.target.value)} />
                                            </div>
                                        </>
                                    )}
                                    {formData.templateType === 'PROJECT_BREAKDOWN' && (
                                        <div className="w-full md:w-48">
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Đ.giá nhân công <span className="text-slate-400 font-normal">(/1 {!isCustomProduct ? products.find((p: any) => p.id === selectedProduct)?.unit || customUnit : customUnit})</span></label>
                                            <input type="number" step="any" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white" value={itemLaborPrice} onChange={e => setItemLaborPrice(parseFloat(e.target.value) || 0)} />
                                        </div>
                                    )}
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Chi tiết Kỹ Thuật / Ghi chú cho khách hàng <span className="text-slate-400 font-normal">(In dưới tên SP)</span></label>
                                <div className="flex items-center gap-3 mb-1.5">
                                    <label className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium ${isCustomProduct ? 'text-slate-400' : 'text-slate-700'}`}>
                                        <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={useInventoryDescription && !isCustomProduct} onChange={() => handleDescSourceChange(true)} disabled={isCustomProduct} />
                                        <span>Lấy mô tả từ kho</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                                        <input type="radio" className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer" checked={!useInventoryDescription || isCustomProduct} onChange={() => handleDescSourceChange(false)} />
                                        <span>Tự nhập mô tả</span>
                                    </label>
                                </div>
                                <textarea rows={2} className={`w-full border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none text-xs ${useInventoryDescription && !isCustomProduct ? 'bg-slate-50 text-slate-500' : 'text-slate-900 bg-white placeholder:text-slate-400'}`} placeholder="Ghi chú thêm thông số, tính năng cho sản phẩm này..." value={customDescription} onChange={e => setCustomDescription(e.target.value)} disabled={useInventoryDescription && !isCustomProduct}></textarea>
                            </div>

                            {formData.items.length > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-x-auto border-t mt-3 pt-3">
                                    <table className="w-full min-w-[600px] text-xs bg-white text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                            <tr>
                                                <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider">Sản Phẩm</th>
                                                <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-center w-16">SL</th>
                                                <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-right w-28">{formData.templateType === 'PROJECT_BREAKDOWN' ? 'Đ.Giá Vật Tư' : 'Đ.Giá'}</th>
                                                {formData.templateType === 'PROJECT_BREAKDOWN' && (
                                                    <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-right w-28">Đ.Giá N.Công</th>
                                                )}
                                                <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-center w-20">Thuế</th>
                                                <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-right w-32">Thành Tiền</th>
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
                                                        {(formData.templateType === 'WITH_IMAGES' || formData.templateType === 'PROJECT_BREAKDOWN') && (
                                                             <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap gap-2">
                                                                {item.manufacture && <span>Hãng: <span className="font-medium text-slate-700">{item.manufacture}</span></span>}
                                                                {item.origin && <span>XX: <span className="font-medium text-slate-700">{item.origin}</span></span>}
                                                                {item.warranty && <span>BH: <span className="font-medium text-slate-700">{item.warranty}</span></span>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-center text-slate-800 font-mono">
                                                        {item.quantity} <span className="text-[11px] text-slate-500 ml-0.5">{item.unit}</span>
                                                    </td>
                                                    <td className="p-2.5 text-right text-slate-700 font-mono">{formatMoney(item.unitPrice)}</td>
                                                    {formData.templateType === 'PROJECT_BREAKDOWN' && (
                                                        <td className="p-2.5 text-right text-emerald-700 font-mono">{formatMoney(item.laborPrice || 0)}</td>
                                                    )}
                                                    <td className="p-2.5 text-center bg-slate-50/50 border-x border-slate-100">
                                                        <TaxBadge rate={item.taxRate} />
                                                    </td>
                                                    <td className="p-2.5 text-right font-bold text-slate-900 font-mono">{formatMoney(item.totalPrice)}</td>
                                                    <td className="p-2.5 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button type="button" onClick={() => handleEditItem(i)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors" title="Sửa dòng này"><Edit2 size={14} /></button>
                                                            <button type="button" onClick={() => handleRemoveItem(i)} className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition-colors" title="Xóa"><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50 border-t border-slate-200 text-slate-700 text-xs">
                                            <tr>
                                                <td colSpan={formData.templateType === 'PROJECT_BREAKDOWN' ? 5 : 4} className="p-2.5 text-right">{t('estimates.subTotal')}:</td>
                                                <td className="p-2.5 text-right font-medium font-mono">{formatMoney(formData.subTotal || 0)}</td>
                                                <td className="p-2.5"></td>
                                            </tr>
                                            <tr>
                                                <td colSpan={formData.templateType === 'PROJECT_BREAKDOWN' ? 5 : 4} className="p-2.5 text-right">{t('estimates.totalTax')}:</td>
                                                <td className="p-2.5 text-right font-medium text-slate-500 font-mono">{formatMoney(formData.taxAmount || 0)}</td>
                                                <td className="p-2.5"></td>
                                            </tr>
                                            <tr className="border-t border-slate-200">
                                                <td colSpan={formData.templateType === 'PROJECT_BREAKDOWN' ? 5 : 4} className="p-2.5 text-right font-bold text-xs">{t('estimates.grandTotal')}:</td>
                                                <td className="p-2.5 text-right font-bold text-emerald-700 text-sm font-mono">{formatMoney(formData.totalAmount || 0)}</td>
                                                <td className="p-2.5"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-start gap-2.5 mt-2">
                        <Button onClick={() => setIsFormOpen(false)} variant="secondary" className="w-full sm:w-auto px-4 h-[34px] text-xs border-slate-200 shadow-2xs text-slate-700 font-semibold bg-white hover:bg-slate-50 flex justify-center items-center">{t('estimates.btnCancel')}</Button>
                        <Button onClick={handleSave} className="w-full sm:w-auto flex justify-center items-center gap-1.5 px-6 h-[34px] text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all text-white rounded-lg">
                            <Save size={14} /> <span>{t('estimates.btnSave')}</span>
                        </Button>
                    </div>
                </div>
            </Modal>
            {/* Convert Modal */}
            <Modal isOpen={!!convertModalId} onClose={() => !isConverting && setConvertModalId(null)} title="Xác nhận Lên Hóa Đơn">
                <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <p className="text-gray-700 text-[15px] mb-6 leading-relaxed">
                        Bạn có chắc chắn muốn chuyển dữ liệu từ Báo Giá này thành <strong>Hóa Đơn</strong> không? Các thông tin chi tiết sẽ được tự động sao chép sang Hóa Đơn mới.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem', padding: '1rem', borderRadius: '0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '9999px', color: '#3b82f6', flexShrink: 0, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <ArrowRightLeft size={20} />
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#1e3a8a', lineHeight: 1.625, marginTop: '0.125rem' }}>
                            <strong style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Cập nhật tự động</strong>
                            Báo giá này sẽ tự động chuyển thành trạng thái <strong style={{ backgroundColor: '#dbeafe', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', color: '#1d4ed8', fontWeight: 700 }}>"Đã Chốt"</strong> sau quá trình khởi tạo thành công.
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6' }}>
                        <button
                            onClick={() => setConvertModalId(null)}
                            className="btn btn-secondary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px' }}
                            disabled={isConverting}
                        >
                            Hủy Bỏ
                        </button>
                        <button
                            onClick={handleConfirmConvert}
                            className="btn btn-primary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px', minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            disabled={isConverting}
                        >
                            {isConverting ? (
                                <>
                                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>Xác Nhận Lên Hóa Đơn</>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Convert to Order Modal */}
            <Modal isOpen={!!convertOrderModalId} onClose={() => !isConvertingOrder && setConvertOrderModalId(null)} title="Xác nhận Lên Đơn Đặt Hàng">
                <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <p className="text-gray-700 text-[15px] mb-6 leading-relaxed">
                        Bạn có chắc chắn muốn chuyển dữ liệu từ Báo Giá này thành <strong>Đơn Đặt Hàng</strong> không? Các thông tin chi tiết sẽ được tự động sao chép sang Đơn Đặt Hàng mới.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem', padding: '1rem', borderRadius: '0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '9999px', color: '#3b82f6', flexShrink: 0, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <ArrowRightLeft size={20} />
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#1e3a8a', lineHeight: 1.625, marginTop: '0.125rem' }}>
                            <strong style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Cập nhật tự động</strong>
                            Báo giá này sẽ tự động chuyển thành trạng thái <strong style={{ backgroundColor: '#e0e7ff', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', color: '#4338ca', fontWeight: 700 }}>"Đã Lên Đơn"</strong> sau quá trình khởi tạo thành công.
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6' }}>
                        <button
                            onClick={() => setConvertOrderModalId(null)}
                            className="btn btn-secondary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px' }}
                            disabled={isConvertingOrder}
                        >
                            Hủy Bỏ
                        </button>
                        <button
                            onClick={handleConfirmConvertOrder}
                            className="btn btn-primary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px', minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            disabled={isConvertingOrder}
                        >
                            {isConvertingOrder ? (
                                <>
                                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>Xác Nhận Lên Đơn Hàng</>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Generic Action Modal */}
            <Modal isOpen={!!actionModal?.isOpen} onClose={() => !isActioning && setActionModal(null)} title={actionModal?.title || 'Xác nhận'}>
                <div className="p-6">
                    <div className="text-gray-700 text-[15px] mb-6 leading-relaxed">
                        {actionModal?.message}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="secondary" onClick={() => setActionModal(null)} disabled={isActioning}>Hủy Bỏ</Button>
                        <Button
                            className="bg-primary hover:bg-primary-dark text-white min-w-[120px]"
                            onClick={async () => {
                                if (!actionModal) return;
                                setIsActioning(true);
                                try {
                                    await actionModal.action();
                                    setActionModal(null);
                                } finally {
                                    setIsActioning(false);
                                }
                            }}
                            disabled={isActioning}
                        >
                            {isActioning ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Đang xử lý...
                                </span>
                            ) : 'Xác Nhận'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
