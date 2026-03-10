'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Plus, Edit2, Trash2, Save, X, Printer, FileText, Search, Calendar, FolderClock, LayoutList, CheckCircle2, XCircle, Eye, Link as LinkIcon, Download, ChevronUp, ChevronDown, Check, ArrowRightLeft, ShoppingCart, Copy } from 'lucide-react';
import { submitSalesEstimate, updateSalesEstimateStatus, deleteSalesEstimate, updateSalesEstimate, convertEstimateToInvoice, convertEstimateToOrder } from './actions';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { TagDisplay } from '@/app/components/ui/TagDisplay';

export default function SalesEstimateClient({ initialEstimates, customers, products, leads, nextCode, initialAction, initialCustomerId, initialLeadId, users, currentUserId, isAdminOrManager }: any) {
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
        salespersonId: currentUserId || '',
        date: getLocalDateStr(new Date()),
        validUntil: getLocalDateStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        notes: '',
        status: 'DRAFT',
        tags: '',
        subTotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        items: []
    });

    const handleOpenCreate = () => {
        setFormData({
            code: nextCode, // Assume nextCode persists or is updated elsewhere
            customerId: '',
            leadId: '',
            salespersonId: currentUserId || '',
            date: getLocalDateStr(new Date()),
            validUntil: getLocalDateStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
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
            totalPrice: i.totalPrice
        })) : [];

        const calcSubTotal = mappedItems.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unitPrice), 0);
        const calcTaxAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.taxAmount, 0);
        const calcTotalAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.totalPrice, 0);

        setFormData({
            id: est.id,
            code: est.code || '',
            customerId: est.customerId || '',
            leadId: est.leadId || '',
            salespersonId: est.salespersonId || est.creatorId || currentUserId || '',
            date: est.date ? getLocalDateStr(new Date(est.date)) : getLocalDateStr(new Date()),
            validUntil: est.validUntil ? getLocalDateStr(new Date(est.validUntil)) : '',
            notes: est.notes || '',
            status: est.status || 'DRAFT',
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
            totalPrice: i.totalPrice
        })) : [];

        const calcSubTotal = mappedItems.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unitPrice), 0);
        const calcTaxAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.taxAmount, 0);
        const calcTotalAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.totalPrice, 0);

        setFormData({
            code: nextCode,
            customerId: est.customerId || '',
            salespersonId: currentUserId || '',
            date: getLocalDateStr(new Date()),
            validUntil: est.validUntil ? getLocalDateStr(new Date(est.validUntil)) : '',
            notes: est.notes || '',
            status: 'DRAFT',
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
        setIsFormOpen(true);
    };

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

    const handleProductSelect = (pid: string) => {
        const prod = products.find((p: any) => p.id === pid);
        setSelectedProduct(pid);
        setPrice(prod ? prod.salePrice : 0);
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
        let taxRate = 0;
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
            taxRate = customTaxRate;
        } else {
            if (!selectedProduct) return;
            const prod = products.find((p: any) => p.id === selectedProduct);
            if (!prod) return;
            pId = prod.id;
            pName = prod.name;
            pUnit = prod.unit;
            taxRate = prod.taxRate || 0;
        }

        const baseTotal = qty * price;
        const taxItemAmount = baseTotal * taxRate / 100;
        const total = baseTotal + taxItemAmount;

        setFormData((prev: any) => ({
            ...prev,
            items: [...prev.items, {
                productId: pId,
                productName: pName,
                customName: pName,
                description: pDesc,
                unit: pUnit,
                quantity: qty,
                unitPrice: price,
                taxRate,
                taxAmount: taxItemAmount,
                totalPrice: total
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

        handleRemoveItem(index);
    };

    const handleSave = async () => {
        if (!formData.customerId || formData.items.length === 0) {
            alert('Vui lòng chọn khách hàng và ít nhất 1 sản phẩm');
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
            alert('Lỗi: ' + res.error);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        setActionModal({
            isOpen: true,
            title: 'Khẳng định thay đổi',
            message: `Bạn có chắc chắn muốn chuyển trạng thái báo giá này sang "${newStatus}"?`,
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
            title: 'Xóa Báo Giá',
            message: 'Hành động này sẽ Xóa báo giá này hoàn toàn (không thể phục hồi). Bạn chắc chắn chứ?',
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
            alert("Đã tạo Hóa Đơn thành công!");
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
            alert("Đã tạo Đơn Đặt Hàng thành công!");
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

    const statsCards = [
        { id: 'ALL', label: 'Tất Cả', count: stats.ALL.count, amount: stats.ALL.amount, colorClass: 'stat-card-purple', icon: LayoutList },
        { id: 'DRAFT', label: 'Bản Dự Thảo', count: stats.DRAFT.count, amount: stats.DRAFT.amount, colorClass: 'stat-card-amber', icon: FileText },
        { id: 'SENT', label: 'Đã Gửi KH', count: stats.SENT.count, amount: stats.SENT.amount, colorClass: 'stat-card-blue', icon: FolderClock },
        { id: 'ACCEPTED', label: 'Khách Chốt', count: stats.ACCEPTED.count, amount: stats.ACCEPTED.amount, colorClass: 'stat-card-green', icon: CheckCircle2 },
        { id: 'ORDERED', label: 'Đã Lên Đơn', count: stats.ORDERED.count, amount: stats.ORDERED.amount, colorClass: 'stat-card-indigo', icon: ShoppingCart },
        { id: 'INVOICED', label: 'Đã Hóa Đơn', count: stats.INVOICED.count, amount: stats.INVOICED.amount, colorClass: 'stat-card-emerald', icon: FileText },
        { id: 'REJECTED', label: 'Từ Chối', count: stats.REJECTED.count, amount: stats.REJECTED.amount, colorClass: 'stat-card-red', icon: XCircle },
    ];

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

    const premiumCSS = `
        .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.025em;
        }
        .badge-success { background: #d1fae5; color: #047857; border: 1px solid #a7f3d0; }
        .badge-warning { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
        .badge-neutral { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
        .badge-info { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .badge-danger { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
        .badge-purple { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
        
        .status-select {
            appearance: none;
            cursor: pointer;
            outline: none;
            text-align: center;
            padding-right: 28px !important;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 4px center;
            background-repeat: no-slash;
            background-size: 1.2em 1.2em;
        }
        .status-select:hover { filter: brightness(0.95); }
    `;

    return (
        <>
            <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Báo Giá ERP</h2>
                    <div className="flex items-center gap-3">
                        {isAdminOrManager && users && users.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 font-medium">Lọc nhân viên:</span>
                                <select
                                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:border-blue-500"
                                    defaultValue={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('employeeId') || '' : ''}
                                    onChange={(e) => {
                                        const newEmployeeId = e.target.value;
                                        const params = new URLSearchParams(window.location.search);
                                        if (newEmployeeId) {
                                            params.set('employeeId', newEmployeeId);
                                        } else {
                                            params.delete('employeeId');
                                        }
                                        router.push(`/sales/estimates?${params.toString()}`);
                                    }}
                                >
                                    <option value="">Tất cả nhân viên</option>
                                    {users.map((u: any) => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <Button onClick={handleOpenCreate} className="flex items-center gap-2">
                            <Plus size={16} /> Tạo Báo Giá Mới
                        </Button>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{ __html: premiumCSS }} />
                {/* Filter Cards */}
                <div className="flex flex-wrap gap-4 mb-6">
                    {statsCards.map(stat => (
                        <div
                            key={stat.id}
                            onClick={() => setStatusFilter(stat.id)}
                            className={`stat-card ${stat.colorClass} cursor-pointer flex-1 min-w-[160px] ${statusFilter === stat.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="stat-title text-sm font-semibold uppercase tracking-wide">{stat.label}</span>
                                <div className="stat-icon p-2 rounded-full flex items-center justify-center">
                                    <stat.icon size={18} />
                                </div>
                            </div>
                            <div className="stat-info">
                                <span className="stat-value text-3xl font-bold">{stat.count}</span>
                            </div>
                            {stat.amount > 0 && (
                                <div className="mt-2 text-xs font-semibold opacity-80 break-words whitespace-nowrap overflow-hidden text-ellipsis">
                                    {formatMoney(stat.amount)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Filter Ribbon */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 flex gap-4 items-center flex-wrap">
                    <div className="flex-1 relative min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Tìm theo Mã BG, Tên khách hàng..."
                            className="px-3 border border-slate-300 py-2 rounded-lg text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 w-full bg-white"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {/* Create Button */}
                    <div className="shrink-0">
                        <button onClick={handleOpenCreate} className="btn-primary w-full sm:w-auto mt-4 sm:mt-0 font-semibold h-[40px] px-6 text-[13px] shadow-sm flex items-center justify-center transition-all hover:-translate-y-0.5" title="Tạo mới Báo giá">
                            <Plus size={16} className="mr-2 shrink-0" />
                            Tạo Báo Giá
                        </button>
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        <Calendar size={16} className="text-gray-400 hidden sm:block" />
                        <input
                            type="date"
                            className="h-[40px] flex-1 sm:w-auto px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            title="Từ ngày"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            className="h-[40px] flex-1 sm:w-auto px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            title="Đến ngày"
                        />
                    </div>

                    {/* Employee Filter */}
                    {isAdminOrManager && users && users.length > 0 && (
                        <div className="shrink-0 min-w-[200px] w-full sm:w-auto">
                            <select
                                className="h-[40px] w-full px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
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
                                <option value="">Lọc theo: Tất cả nhân viên</option>
                                {users.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex items-center gap-2 min-w-[200px]">
                        <select
                            className="border border-slate-300 px-3 py-2 rounded-lg text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 w-full bg-white cursor-pointer"
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                        >
                            <option value="createdAt_desc">Mới tạo nhất</option>
                            <option value="date_desc">Ngày (Mới nhất)</option>
                            <option value="date_asc">Ngày (Cũ nhất)</option>
                            <option value="amount_desc">Tổng Tiền (Cao xuống thấp)</option>
                            <option value="amount_asc">Tổng Tiền (Thấp lên cao)</option>
                            <option value="code_asc">Mã BG (A-Z)</option>
                            <option value="code_desc">Mã BG (Z-A)</option>
                        </select>
                    </div>
                </div>

                <Table>
                    <thead>
                        <tr>
                            <th className="text-left font-medium text-gray-500 pb-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('code')}>
                                <div className="flex items-center gap-1">
                                    Mã BG {sortBy === 'code_asc' ? <ChevronUp size={14} /> : sortBy === 'code_desc' ? <ChevronDown size={14} /> : <div className="w-[14px]"></div>}
                                </div>
                            </th>
                            <th className="text-left font-medium text-gray-500 pb-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('date')}>
                                <div className="flex items-center gap-1">
                                    Ngày <div className="text-xs text-gray-400 font-normal">(Tạo / Hết Hạn)</div>
                                    {sortBy === 'date_asc' ? <ChevronUp size={14} /> : sortBy === 'date_desc' ? <ChevronDown size={14} /> : <div className="w-[14px]"></div>}
                                </div>
                            </th>
                            <th className="text-left font-medium text-gray-500 pb-3">Khách Hàng</th>
                            <th className="text-left font-medium text-gray-500 pb-3">Người Báo Giá</th>
                            <th className="text-left font-medium text-gray-500 pb-3">Thẻ Quản Lý</th>
                            <th className="text-right font-medium text-gray-500 pb-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('amount')}>
                                <div className="flex items-center justify-end gap-1">
                                    Tổng Tiền {sortBy === 'amount_asc' ? <ChevronUp size={14} /> : sortBy === 'amount_desc' ? <ChevronDown size={14} /> : <div className="w-[14px]"></div>}
                                </div>
                            </th>
                            <th className="text-center font-medium text-gray-500 pb-3">Trạng Thái</th>
                            <th className="text-right font-medium text-gray-500 pb-3">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEstimates.map((est: any) => (
                            <tr key={est.id} className="border-t border-gray-100">
                                <td className="py-3 items-center gap-2 flex">
                                    <FileText size={16} className="text-primary/70" />
                                    <Link href={`/sales/estimates/${est.id}`} className="font-semibold text-gray-800 hover:text-primary hover:underline transition-colors block">
                                        {est.code}
                                    </Link>
                                </td>
                                <td className="py-3">
                                    <div className="text-gray-600 font-medium" suppressHydrationWarning>{formatDate(new Date(est.date))}</div>
                                    {est.validUntil && (
                                        <div className="text-xs text-red-500 mt-1 flex items-center gap-1" title="Hạn Báo Giá">
                                            <Calendar size={12} /> HBG: {formatDate(est.validUntil)}
                                        </div>
                                    )}
                                </td>
                                <td className="py-3">
                                    {est.customerId ? (
                                        <Link href={`/customers/${est.customerId}`} className="font-medium text-gray-800 hover:text-primary hover:underline transition-colors block">
                                            {est.customer?.name}
                                        </Link>
                                    ) : (
                                        est.customer?.name
                                    )}
                                </td>
                                <td className="py-3">
                                    <div className="flex items-center gap-2">
                                        {est.salesperson?.avatarUrl ? (
                                            <img src={est.salesperson.avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                {(est.salesperson?.name || est.creator?.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="text-sm font-medium text-slate-700">{est.salesperson?.name || est.creator?.name || 'Không rõ'}</span>
                                    </div>
                                </td>
                                <td className="py-3">
                                    <TagDisplay tagsString={est.tags} />
                                </td>
                                <td className="py-3 text-right font-bold text-gray-800">{formatMoney(est.totalAmount)}</td>
                                <td className="py-3 text-center">
                                    <select
                                        className={`status-badge status-select appearance-none ${est.status === 'SENT' ? 'badge-info' :
                                            est.status === 'ACCEPTED' ? 'badge-success' :
                                                est.status === 'ORDERED' ? 'badge-purple' :
                                                    est.status === 'INVOICED' ? 'badge-success' :
                                                        est.status === 'REJECTED' ? 'badge-danger' :
                                                            'badge-warning'
                                            }`}
                                        value={est.status}
                                        onChange={(e) => handleStatusChange(est.id, e.target.value)}
                                        title="Nhấn để đổi trạng thái"
                                    >
                                        <option value="DRAFT" className="bg-white text-gray-900">Bản Dự Thảo</option>
                                        <option value="SENT" className="bg-white text-gray-900">Đã Gửi KH</option>
                                        <option value="ACCEPTED" className="bg-white text-gray-900">Khách Chốt</option>
                                        <option value="ORDERED" className="bg-white text-gray-900">Đã Lên Đơn</option>
                                        <option value="INVOICED" className="bg-white text-gray-900">Đã Hóa Đơn</option>
                                        <option value="REJECTED" className="bg-white text-gray-900">Từ Chối</option>
                                    </select>
                                </td>
                                <td className="py-3 text-right">
                                    <div className="flex justify-end items-center gap-2">
                                        <div className="flex items-center gap-1 mr-1">
                                            {est.status === 'DRAFT' && (
                                                <button onClick={() => handleEdit(est)} title="Chỉnh sửa" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                                    <Edit2 size={15} />
                                                </button>
                                            )}
                                            <button onClick={() => handleCopy(est)} title="Copy Báo Giá" className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 transition-colors">
                                                <Copy size={15} />
                                            </button>
                                            <Link href={`/sales/estimates/${est.id}`} title="Xem chi tiết" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors block">
                                                <Eye size={15} />
                                            </Link>
                                            <Link href={`/print/sales/estimate/${est.id}`} target="_blank" title="Tải PDF / In ấn" className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors block">
                                                <Download size={15} />
                                            </Link>
                                            <Link href={`/public/sales/estimate/${est.id}`} target="_blank" title="Link xem Public" className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors block">
                                                <LinkIcon size={15} />
                                            </Link>
                                            <button onClick={() => handleDelete(est.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors" title="Xóa">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>

                                        {est.status === 'DRAFT' && (
                                            <Button variant="secondary" onClick={() => handleStatusChange(est.id, 'SENT')} title="Ghi nhận Đã Gửi" className="px-3 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 py-1.5 text-xs font-semibold flex-shrink-0 shadow-sm transition-all rounded-md">
                                                Gửi KH
                                            </Button>
                                        )}
                                        {est.status === 'SENT' && (
                                            <Button variant="secondary" onClick={() => handleStatusChange(est.id, 'ACCEPTED')} className="text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 px-3 flex-shrink-0 py-1.5 text-xs font-semibold shadow-sm transition-all rounded-md" title="Đánh dấu Chốt đơn">
                                                <Check size={14} className="mr-1.5 inline-block" /> Chốt
                                            </Button>
                                        )}
                                        {(est.status === 'DRAFT' || est.status === 'SENT' || est.status === 'ACCEPTED') && (
                                            <>
                                                <Button variant="secondary" onClick={() => setConvertOrderModalId(est.id)} className="text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 px-3 flex-shrink-0 py-1.5 text-xs font-semibold shadow-sm transition-all rounded-md" title="Tạo Đơn Hàng Tự Động">
                                                    <ArrowRightLeft size={14} className="mr-1.5 inline-block" /> Lên Đơn Hàng
                                                </Button>
                                                <Button variant="secondary" onClick={() => setConvertModalId(est.id)} className="text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300 px-3 flex-shrink-0 py-1.5 text-xs font-semibold shadow-sm transition-all rounded-md" title="Tạo Hóa Đơn Tự Động">
                                                    <ArrowRightLeft size={14} className="mr-1.5 inline-block" /> Lên Hóa Đơn
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredEstimates.length === 0 && (
                            <tr><td colSpan={6} className="py-8 text-center text-gray-500">
                                {estimates.length === 0 ? 'Chưa có bảng báo giá ERP nào' : 'Không có báo giá nào khớp với trạng thái này'}
                            </td></tr>
                        )}
                    </tbody>
                </Table>
            </Card>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? "Sửa Báo Giá ERP" : "Tạo Báo Giá ERP"} maxWidth="1000px">
                <div className="flex flex-col gap-6 py-2">
                    <div>
                        <h3 className="text-[1.1rem] font-semibold text-gray-800 mb-4">Thông tin chung</h3>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã Báo Giá</label>
                                <input
                                    type="text" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-gray-900 bg-white"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Khách Hàng (*)</label>
                                <SearchableSelect
                                    options={customers.map((c: any) => ({ value: c.id, label: c.name }))}
                                    value={formData.customerId}
                                    onChange={val => setFormData({ ...formData, customerId: val, leadId: '' })}
                                    placeholder="-- Chọn KH --"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cơ Hội Bán Hàng</label>
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
                                    placeholder="-- Chọn Cơ Hội --"
                                />
                            </div>
                            <div className="col-span-2 grid grid-cols-3 gap-x-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày Báo Giá</label>
                                    <input
                                        type="date" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-gray-900 bg-white"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Hiệu Lực Đến</label>
                                    <input
                                        type="date" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-gray-900 bg-white"
                                        value={formData.validUntil}
                                        onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Người Báo Giá</label>
                                    <SearchableSelect
                                        options={users?.map((u: any) => ({ value: u.id, label: u.name })) || []}
                                        value={formData.salespersonId}
                                        onChange={val => setFormData({ ...formData, salespersonId: val })}
                                        placeholder="-- Chọn Người --"
                                    />
                                </div>
                            </div>
                            <div className="col-span-2 grid grid-cols-2 gap-x-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú</label>
                                    <input
                                        type="text" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-gray-900 bg-white"
                                        value={formData.notes || ''}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Ghi chú thêm..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Thẻ Quản Lý (Tags)</label>
                                    <input
                                        type="text" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-gray-900 bg-white"
                                        value={formData.tags || ''}
                                        onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                        placeholder="VD: VIP, Đại lý, Bán buôn..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[1.1rem] font-semibold text-gray-800 mb-4">Chi tiết Sản Phẩm</h3>
                        <div className="flex flex-col bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="mb-4 flex items-center gap-4 border-b border-gray-100 pb-3">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                                    <input type="radio" className="accent-indigo-600 w-4 h-4 cursor-pointer" checked={!isCustomProduct} onChange={() => setIsCustomProduct(false)} />
                                    <span>Chọn từ kho</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                                    <input type="radio" className="accent-indigo-600 w-4 h-4 cursor-pointer" checked={isCustomProduct} onChange={() => setIsCustomProduct(true)} />
                                    <span>Nhập tự do ngoài hệ thống</span>
                                </label>
                            </div>
                            <div className="flex gap-3 items-end mb-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên Sản Phẩm</label>
                                    {!isCustomProduct ? (
                                        <SearchableSelect
                                            options={products.map((p: any) => ({ value: p.id, label: `${p.sku} - ${p.name}` }))}
                                            value={selectedProduct}
                                            onChange={handleProductSelect}
                                            placeholder="-- Chọn Sản Phẩm --"
                                        />
                                    ) : (
                                        <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-gray-900 bg-white" placeholder="Nhập tên dịch vụ/sản phẩm..." value={customName} onChange={e => setCustomName(e.target.value)} />
                                    )}
                                </div>
                                {isCustomProduct && (
                                    <div className="w-24">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">ĐVT</label>
                                        <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-gray-900 bg-white text-center" placeholder="Đơn vị" value={customUnit} onChange={e => setCustomUnit(e.target.value)} />
                                    </div>
                                )}
                                <div className="w-36">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Đơn giá</label>
                                    <input type="number" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-gray-900 bg-white" value={price} onChange={e => setPrice(Number(e.target.value))} />
                                </div>
                                <div className="w-20">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Thuế %</label>
                                    {isCustomProduct ? (
                                        <input type="number" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center text-gray-900 bg-white" value={customTaxRate} onChange={e => setCustomTaxRate(Number(e.target.value))} />
                                    ) : (
                                        <input type="text" className="w-full border border-gray-200 rounded-lg p-2.5 bg-slate-50 text-center text-gray-500 font-medium cursor-not-allowed" value={`${products.find((p: any) => p.id === selectedProduct)?.taxRate || 0}`} disabled />
                                    )}
                                </div>
                                <div className="w-20">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">SL</label>
                                    <input type="number" min="1" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center text-gray-900 bg-white" value={qty} onChange={e => setQty(Number(e.target.value))} />
                                </div>
                                <Button onClick={handleAddItem} variant="secondary" className="mb-[2px] h-[46px] px-6 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 shadow-sm font-semibold rounded-lg">Thêm</Button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Chi tiết Kỹ Thuật / Ghi chú cho khách hàng <span className="text-gray-400 font-normal">(In dưới tên SP)</span></label>
                                <div className="flex items-center gap-4 mb-2">
                                    <label className={`flex items-center gap-2 cursor-pointer text-sm font-medium ${isCustomProduct ? 'text-gray-400' : 'text-gray-700'}`}>
                                        <input type="radio" className="accent-indigo-600 w-4 h-4 cursor-pointer" checked={useInventoryDescription && !isCustomProduct} onChange={() => handleDescSourceChange(true)} disabled={isCustomProduct} />
                                        <span>Lấy mô tả từ kho</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                                        <input type="radio" className="accent-indigo-600 w-4 h-4 cursor-pointer" checked={!useInventoryDescription || isCustomProduct} onChange={() => handleDescSourceChange(false)} />
                                        <span>Tự nhập mô tả</span>
                                    </label>
                                </div>
                                <textarea rows={2} className={`w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none text-sm ${useInventoryDescription && !isCustomProduct ? 'bg-slate-50 text-gray-500' : 'text-gray-900 bg-white'}`} placeholder="Ghi chú thêm thông số, tính năng cho sản phẩm này..." value={customDescription} onChange={e => setCustomDescription(e.target.value)} disabled={useInventoryDescription && !isCustomProduct}></textarea>
                            </div>

                            {formData.items.length > 0 && (
                                <div className="border border-gray-200 rounded-xl overflow-x-auto border-t mt-4 pt-4">
                                    <table className="w-full min-w-[600px] text-sm bg-white text-left">
                                        <thead className="bg-slate-50 border-b border-gray-200 text-gray-600">
                                            <tr>
                                                <th className="p-3 font-medium">Sản Phẩm</th>
                                                <th className="p-3 font-medium text-center w-20">SL</th>
                                                <th className="p-3 font-medium text-right w-32">Đ.Giá</th>
                                                <th className="p-3 font-medium text-center w-20">Thuế</th>
                                                <th className="p-3 font-medium text-right w-36">Thành Tiền</th>
                                                <th className="p-3 font-medium text-center w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {formData.items.map((item: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 text-gray-800">
                                                        <div className="font-semibold">{item.productName || item.customName}</div>
                                                        {item.description && <div className="text-xs text-gray-500 mt-0.5 max-w-sm whitespace-pre-wrap">{item.description}</div>}
                                                    </td>
                                                    <td className="p-3 text-center text-gray-800">
                                                        {item.quantity} <span className="text-xs text-gray-500 ml-1">{item.unit}</span>
                                                    </td>
                                                    <td className="p-3 text-right text-gray-600 font-medium">{formatMoney(item.unitPrice)}</td>
                                                    <td className="p-3 text-center text-gray-500 bg-gray-50 border-x border-white">{item.taxRate}%</td>
                                                    <td className="p-3 text-right font-semibold text-gray-900">{formatMoney(item.totalPrice)}</td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button type="button" onClick={() => handleEditItem(i)} className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-md transition-colors" title="Sửa dòng này"><Edit2 size={16} /></button>
                                                            <button type="button" onClick={() => handleRemoveItem(i)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-md transition-colors" title="Xóa"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50 border-t border-gray-200 text-gray-700">
                                            <tr>
                                                <td colSpan={4} className="p-3 text-right text-sm">Tổng tiền trước thuế:</td>
                                                <td className="p-3 text-right font-medium">{formatMoney(formData.subTotal || 0)}</td>
                                                <td className="p-3"></td>
                                            </tr>
                                            <tr>
                                                <td colSpan={4} className="p-3 text-right text-sm">Tổng tiền thuế:</td>
                                                <td className="p-3 text-right font-medium text-gray-500">{formatMoney(formData.taxAmount || 0)}</td>
                                                <td className="p-3"></td>
                                            </tr>
                                            <tr className="border-t border-gray-200">
                                                <td colSpan={4} className="p-3 text-right font-semibold text-base">Tổng Cộng:</td>
                                                <td className="p-3 text-right font-bold text-indigo-700 text-lg">{formatMoney(formData.totalAmount || 0)}</td>
                                                <td className="p-3"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-start gap-3 mt-4">
                        <Button onClick={() => setIsFormOpen(false)} variant="secondary" className="px-6 py-2 border-gray-200 shadow-sm text-gray-700 font-medium bg-white hover:bg-gray-50">Hủy</Button>
                        <Button onClick={handleSave} className="flex items-center gap-2 px-8 py-2 font-medium bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all text-white">
                            <Save size={16} /> Lưu Báo Giá
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
