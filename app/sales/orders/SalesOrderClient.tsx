'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Plus, Edit2, Trash2, Save, X, Printer, PackageCheck, Search, Calendar, LayoutList, FolderClock, CheckCircle2, XCircle, FileText, ChevronUp, ChevronDown, Eye, Link as LinkIcon, Download, Check, ArrowRightLeft, ArrowUpDown } from 'lucide-react';
import { submitSalesOrder, updateSalesOrderStatus, deleteSalesOrder, updateSalesOrder, convertOrderToInvoice } from './actions';
import { formatMoney, formatDate, formatTaxRate, calcPreTaxPrice, calcTaxAmount } from '@/lib/utils/formatters';
import { TaxRateSelect, TaxBadge } from '@/app/components/ui/TaxRateSelect';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import Link from 'next/link';

export default function SalesOrderClient({ initialOrders, customers, products, nextCode, initialAction, initialCustomerId, users, currentUserId, isAdminOrManager, projects }: any) {
    const router = useRouter();
    const [orders, setOrders] = useState(initialOrders);
    const [isFormOpen, setIsFormOpen] = useState(initialAction === 'new');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        if (editId) {
            const orderToEdit = orders.find((o: any) => o.id === editId);
            if (orderToEdit) {
                handleEdit(orderToEdit);
                window.history.replaceState({}, '', '/sales/orders');
            }
        }
    }, [orders]);

    // Convert to Invoice state
    const [convertModalId, setConvertModalId] = useState<string | null>(null);
    const [isConverting, setIsConverting] = useState(false);

    // Generic Action Modal State
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, title: string, message: React.ReactNode, action: () => Promise<void> } | null>(null);
    const [isActioning, setIsActioning] = useState(false);

    // Filters & Sort
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sortBy, setSortBy] = useState('date_desc');

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
        date: getLocalDateStr(new Date()),
        notes: '',
        status: 'DRAFT',
        subTotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        projectId: '',
        items: []
    });

    const handleOpenCreate = () => {
        setFormData({
            code: nextCode,
            customerId: '',
            date: getLocalDateStr(new Date()),
            notes: '',
            status: 'DRAFT',
            subTotal: 0,
            taxAmount: 0,
            totalAmount: 0,
            projectId: '',
            items: []
        });
        setQty(1);
        setPrice(0);
        setSelectedProduct('');
        setIsFormOpen(true);
    };

    const handleEdit = (order: any) => {
        const mappedItems = order.items ? order.items.map((i: any) => ({
            productId: i.productId,
            productName: i.product?.name || i.productName || '',
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
            id: order.id,
            code: order.code || '',
            customerId: order.customerId || '',
            date: order.date ? getLocalDateStr(new Date(order.date)) : getLocalDateStr(new Date()),
            notes: order.notes || '',
            status: order.status || 'DRAFT',
            subTotal: calcSubTotal,
            taxAmount: calcTaxAmount,
            totalAmount: calcTotalAmount,
            projectId: order.projectId || '',
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

    // Quick Item state
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
    const [isSubItem, setIsSubItem] = useState(false);
    const [isPriceInclusiveVat, setIsPriceInclusiveVat] = useState(false);

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
                isSubItem: isSubItem,
                saveToInventory: isCustomProduct ? saveToInventory : true
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
        setSaveToInventory(true);
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
            setSaveToInventory(item.saveToInventory !== false);
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
            alert('Vui lòng chọn khách hàng và ít nhất 1 sản phẩm');
            return;
        }

        let res;
        if (formData.id) {
            res = await updateSalesOrder(formData.id, formData);
        } else {
            res = await submitSalesOrder('system', formData);
        }

        if (res.success) {
            alert('Lưu thành công!');
            setIsFormOpen(false);
            router.refresh();
        } else {
            alert('Lỗi: ' + res.error);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        setActionModal({
            isOpen: true,
            title: 'Chuyển Trạng Thái',
            message: `Bạn có chắc chắn muốn chuyển trạng thái đơn hàng sang "${newStatus}"?`,
            action: async () => {
                const res = await updateSalesOrderStatus(id, newStatus);
                if (res.success) {
                    setOrders(orders.map((o: any) => o.id === id ? { ...o, status: newStatus } : o));
                } else alert(res.error);
            }
        });
    };

    const handleDelete = async (id: string) => {
        setActionModal({
            isOpen: true,
            title: 'Xóa Đơn Đặt Hàng',
            message: 'Hành động này sẽ Xóa đơn đặt hàng này hoàn toàn (không thể phục hồi). Bạn chắc chắn chứ?',
            action: async () => {
                const res = await deleteSalesOrder(id);
                if (res.success) {
                    setOrders(orders.filter((o: any) => o.id !== id));
                } else alert(res.error);
            }
        });
    };

    const handleConfirmConvert = async () => {
        if (!convertModalId) return;
        setIsConverting(true);
        const res = await convertOrderToInvoice(convertModalId);
        if (res.success) {
            alert("Đã tạo Hóa Đơn thành công!");
            router.push('/sales/invoices');
        } else {
            alert(res.error);
            setIsConverting(false);
            setConvertModalId(null);
        }
    };

    const baseFilteredOrders = useMemo(() => {
        let result = orders;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter((o: any) =>
                o.code?.toLowerCase().includes(query) ||
                o.customer?.name?.toLowerCase().includes(query)
            );
        }

        if (dateFrom) result = result.filter((o: any) => o.date >= dateFrom);
        if (dateTo) result = result.filter((o: any) => o.date <= dateTo);

        return result;
    }, [orders, searchQuery, dateFrom, dateTo]);

    const stats = useMemo(() => {
        return {
            ALL: {
                count: baseFilteredOrders.length,
                amount: baseFilteredOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
            },
            DRAFT: {
                count: baseFilteredOrders.filter((o: any) => o.status === 'DRAFT').length,
                amount: baseFilteredOrders.filter((o: any) => o.status === 'DRAFT').reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
            },
            CONFIRMED: {
                count: baseFilteredOrders.filter((o: any) => o.status === 'CONFIRMED').length,
                amount: baseFilteredOrders.filter((o: any) => o.status === 'CONFIRMED').reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
            },
            COMPLETED: {
                count: baseFilteredOrders.filter((o: any) => o.status === 'COMPLETED').length,
                amount: baseFilteredOrders.filter((o: any) => o.status === 'COMPLETED').reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
            },
            CANCELLED: {
                count: baseFilteredOrders.filter((o: any) => o.status === 'CANCELLED').length,
                amount: baseFilteredOrders.filter((o: any) => o.status === 'CANCELLED').reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
            }
        };
    }, [baseFilteredOrders]);

    const statsCards = [
        { id: 'ALL', label: 'Tất Cả', count: stats.ALL.count, amount: stats.ALL.amount, colorClass: 'stat-card-purple', icon: LayoutList },
        { id: 'DRAFT', label: 'Bản Dự Thảo', count: stats.DRAFT.count, amount: stats.DRAFT.amount, colorClass: 'stat-card-amber', icon: FileText },
        { id: 'CONFIRMED', label: 'Chốt Đơn', count: stats.CONFIRMED.count, amount: stats.CONFIRMED.amount, colorClass: 'stat-card-blue', icon: FolderClock },
        { id: 'COMPLETED', label: 'Hoàn Thành', count: stats.COMPLETED.count, amount: stats.COMPLETED.amount, colorClass: 'stat-card-green', icon: CheckCircle2 },
        { id: 'CANCELLED', label: 'Đã Hủy', count: stats.CANCELLED.count, amount: stats.CANCELLED.amount, colorClass: 'stat-card-red', icon: XCircle },
    ];

    const filteredOrders = useMemo(() => {
        let result = baseFilteredOrders;

        if (statusFilter !== 'ALL') {
            result = result.filter((o: any) => o.status === statusFilter);
        }

        result.sort((a: any, b: any) => {
            if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (sortBy === 'amount_desc') return b.totalAmount - a.totalAmount;
            if (sortBy === 'amount_asc') return a.totalAmount - b.totalAmount;
            if (sortBy === 'code_asc') return (a.code || '').localeCompare(b.code || '');
            if (sortBy === 'code_desc') return (b.code || '').localeCompare(a.code || '');
            return 0;
        });

        return result;
    }, [baseFilteredOrders, statusFilter, sortBy]);

    const { paginatedItems, paginationProps } = usePagination(filteredOrders, 25);

    return (
        <>
            <div className="flex flex-col gap-5">
                {/* Top Page Tech Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                BÁN HÀNG &amp; ĐƠN ĐẶT HÀNG (SO)
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">|</span>
                            <span className="text-[11px] font-medium text-slate-500">Quản lý theo dõi tiến trình và trạng thái các đơn đặt hàng</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Đơn Đặt Hàng Bán</h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                                {orders.length}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <Button
                            onClick={handleOpenCreate}
                            className="btn btn-primary gap-2 h-[34px] px-3.5 text-xs font-bold rounded-lg shadow-sm"
                        >
                            <Plus size={15} className="stroke-[2.5]" />
                            <span>Tạo Đơn Đặt Hàng Mới</span>
                        </Button>
                    </div>
                </div>

                {/* Filter Cards */}
                <div className="flex flex-wrap gap-3 mb-5">
                    {statsCards.map(stat => (
                        <div
                            key={stat.id}
                            onClick={() => setStatusFilter(stat.id)}
                            className={`stat-card ${stat.colorClass} cursor-pointer flex-1 min-w-[150px] transition-all hover:-translate-y-0.5 ${statusFilter === stat.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
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
                            placeholder="Tìm theo Mã SO, Tên khách hàng..."
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

                    {/* Employee Filter */}
                    {isAdminOrManager && users && users.length > 0 && (
                        <div className="shrink-0 min-w-[180px] w-full sm:w-auto">
                            <select
                                className="h-[34px] w-full px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 cursor-pointer shadow-xs"
                                defaultValue={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('employeeId') || '' : ''}
                                onChange={(e) => {
                                    const newEmployeeId = e.target.value;
                                    const params = new URLSearchParams(window.location.search);
                                    if (newEmployeeId) {
                                        params.set('employeeId', newEmployeeId);
                                    } else {
                                        params.delete('employeeId');
                                    }
                                    window.location.href = `/sales/orders?${params.toString()}`;
                                }}
                            >
                                <option value="">Lọc: Tất cả nhân viên</option>
                                {users.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center gap-2 min-w-[180px]">
                        <select
                            className="border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 w-full bg-white cursor-pointer shadow-xs"
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                        >
                            <option value="date_desc">Ngày (Mới nhất)</option>
                            <option value="date_asc">Ngày (Cũ nhất)</option>
                            <option value="amount_desc">Tổng Tiền (Cao $\rightarrow$ Thấp)</option>
                            <option value="amount_asc">Tổng Tiền (Thấp $\rightarrow$ Cao)</option>
                            <option value="code_asc">Mã SO (A-Z)</option>
                            <option value="code_desc">Mã SO (Z-A)</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto pb-2">
                    <Table>
                        <thead className="bg-slate-50/80 border-b border-slate-200">
                            <tr>
                                <th className="text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('code')}>
                                    <div className="flex items-center gap-1">
                                        Mã SO {sortBy === 'code_asc' ? <ChevronUp size={13} /> : sortBy === 'code_desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-30" />}
                                    </div>
                                </th>
                                <th className="text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('date')}>
                                    <div className="flex items-center gap-1">
                                        Ngày Lập {sortBy === 'date_asc' ? <ChevronUp size={13} /> : sortBy === 'date_desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-30" />}
                                    </div>
                                </th>
                                <th className="text-left font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">Khách Hàng</th>
                                <th className="text-right font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('amount')}>
                                    <div className="flex items-center justify-end gap-1">
                                        Tổng Tiền {sortBy === 'amount_asc' ? <ChevronUp size={13} /> : sortBy === 'amount_desc' ? <ChevronDown size={13} /> : <ArrowUpDown size={13} className="opacity-30" />}
                                    </div>
                                </th>
                                <th className="text-center font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">Trạng Thái</th>
                                <th className="text-right font-bold text-[11px] text-slate-600 uppercase tracking-wider py-3 px-3">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedItems.map((o: any) => (
                                <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-3 px-3">
                                        <div className="flex items-center gap-1.5">
                                            <PackageCheck size={15} className="text-emerald-600" />
                                            <Link href={`/sales/orders/${o.id}`} className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline transition-colors block text-xs">
                                                {o.code}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="py-3 px-3 text-slate-600 text-xs" suppressHydrationWarning>{formatDate(new Date(o.date))}</td>
                                    <td className="py-3 px-3">
                                        {o.customerId ? (
                                            <Link href={`/customers/${o.customerId}`} className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline transition-colors block text-xs">
                                                {o.customer?.name}
                                            </Link>
                                        ) : (
                                            <span className="text-xs text-slate-800">{o.customer?.name}</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 text-right font-bold text-xs text-slate-900">{formatMoney(o.totalAmount)}</td>
                                    <td className="py-3 px-3 text-center">
                                        <StatusBadge status={o.status} />
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                        <div className="flex justify-end items-center gap-1.5">
                                            <div className="flex items-center gap-1">
                                                {o.status === 'DRAFT' && (
                                                    <button onClick={() => handleEdit(o)} title="Chỉnh sửa" className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                                        <Edit2 size={15} />
                                                    </button>
                                                )}
                                                <Link href={`/sales/orders/${o.id}`} title="Xem chi tiết" className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors block">
                                                    <Eye size={15} />
                                                </Link>
                                                <Link href={`/print/sales/order/${o.id}`} target="_blank" title="Tải PDF / In ấn" className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors block">
                                                    <Download size={15} />
                                                </Link>
                                                <Link href={`/public/sales/order/${o.id}`} target="_blank" title="Link xem Public" className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors block">
                                                    <LinkIcon size={15} />
                                                </Link>
                                                <button onClick={() => handleDelete(o.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>

                                            {o.status === 'DRAFT' && (
                                                <Button variant="secondary" onClick={() => handleStatusChange(o.id, 'CONFIRMED')} title="Chốt Đơn" className="px-2.5 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 py-1 text-[11px] font-semibold flex-shrink-0 shadow-xs transition-all rounded-md">
                                                    Chốt Đơn
                                                </Button>
                                            )}
                                            {o.status === 'CONFIRMED' && (
                                                <Button variant="secondary" onClick={() => handleStatusChange(o.id, 'COMPLETED')} className="text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 px-2.5 flex-shrink-0 py-1 text-[11px] font-semibold shadow-xs transition-all rounded-md" title="Hoàn Thành">
                                                    <PackageCheck size={13} className="mr-1 inline-block" /> Xong
                                                </Button>
                                            )}
                                            {(o.status === 'DRAFT' || o.status === 'CONFIRMED') && (
                                                <Button variant="secondary" onClick={() => setConvertModalId(o.id)} className="text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300 px-2.5 flex-shrink-0 py-1 text-[11px] font-semibold shadow-xs transition-all rounded-md" title="Tạo Hóa Đơn Tự Động">
                                                    <ArrowRightLeft size={13} className="mr-1 inline-block" /> Lên Hóa Đơn
                                                </Button>
                                            )}
                                        </div>
                                </td>
                            </tr>
                        ))}
                        {paginatedItems.length === 0 && (
                            <tr><td colSpan={6} className="py-8 text-center text-gray-500">Chưa có đơn đặt hàng nào khớp bộ lọc</td></tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-gray-800">
                            <td colSpan={3} className="py-4 px-4 text-right">
                                Tổng Cộng ({filteredOrders.length} Đơn Hàng):
                            </td>
                            <td className="py-4 text-right text-primary">
                                {formatMoney(filteredOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0))}
                            </td>
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                </Table>
                </div>
                <Pagination {...paginationProps} />
            </div>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? "Sửa Đơn Đặt Hàng" : "Tạo Đơn Đặt Hàng Mới"} maxWidth="1000px">
                <div className="flex flex-col gap-4 py-1">
                    <div>
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Thông tin chung</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Mã Đơn</label>
                                <input
                                    type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Khách Hàng (*)</label>
                                <SearchableSelect
                                    options={customers.map((c: any) => ({ value: c.id, label: c.name }))}
                                    value={formData.customerId || ''}
                                    onChange={val => setFormData({ ...formData, customerId: val })}
                                    placeholder="-- Chọn KH --"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày Lập Đơn</label>
                                <input
                                    type="date" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Dự Án Lắp Đặt (Tùy chọn)</label>
                                <SearchableSelect
                                    options={projects?.map((p: any) => ({ value: p.id, label: p.title })) || []}
                                    value={formData.projectId || ''}
                                    onChange={val => setFormData({ ...formData, projectId: val })}
                                    placeholder="-- Chọn Dự án --"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Hiệu Lực Đến</label>
                                <input
                                    type="date" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                    value={formData.validUntil || ''}
                                    onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú</label>
                                <input
                                    type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400"
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Ghi chú thêm..."
                                />
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
                            <div className="flex flex-wrap gap-2.5 items-end mb-2">
                                <div className="flex-1 min-w-[150px]">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Sản Phẩm</label>
                                    {!isCustomProduct ? (
                                        <SearchableSelect
                                            options={products.map((p: any) => ({ value: p.id, label: `${p.sku} - ${p.name}` }))}
                                            value={selectedProduct || ''}
                                            onChange={handleProductSelect}
                                            placeholder="-- Chọn Sản Phẩm --"
                                        />
                                    ) : (
                                        <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white placeholder:text-slate-400" placeholder="Nhập tên dịch vụ/sản phẩm..." value={customName} onChange={e => setCustomName(e.target.value)} />
                                    )}
                                </div>
                                {isCustomProduct && (
                                    <div className="w-20 shrink-0">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">ĐVT</label>
                                        <input type="text" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white text-center" placeholder="Đơn vị" value={customUnit} onChange={e => setCustomUnit(e.target.value)} />
                                    </div>
                                )}
                                <div className="w-36 shrink-0">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        {isPriceInclusiveVat ? 'Đ.giá (gồm VAT)' : 'Đơn giá'}
                                    </label>
                                    <input type="number" step="any" min="0" className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none transition-all text-slate-900 bg-white ${isPriceInclusiveVat ? 'border-emerald-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-emerald-50/20 font-semibold text-emerald-800' : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'}`} value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div className="w-24 shrink-0">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Thuế suất</label>
                                    <TaxRateSelect
                                        value={customTaxRate}
                                        onChange={(val) => setCustomTaxRate(val)}
                                    />
                                </div>
                                <div className="w-16 shrink-0">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">SL</label>
                                    <input type="number" step="any" min="0.0001" className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-center text-slate-900 bg-white" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 0)} />
                                </div>
                                <div className="w-20 shrink-0 flex flex-col items-center justify-center">
                                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wide text-center">T/Phần bộ?</label>
                                    <div className="h-[34px] flex items-center justify-center">
                                        <input type="checkbox" className="w-4 h-4 outline-none cursor-pointer accent-emerald-600 rounded" checked={isSubItem} onChange={e => setIsSubItem(e.target.checked)} />
                                    </div>
                                </div>
                                <Button onClick={handleAddItem} variant="secondary" className="shrink-0 h-[34px] px-4 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-2xs font-semibold text-xs rounded-lg flex items-center justify-center">Thêm</Button>
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
                                <textarea rows={2} className={`w-full border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none text-xs text-slate-900 bg-white placeholder:text-slate-400`} placeholder="Ghi chú thêm thông số, tính năng cho sản phẩm này..." value={customDescription} onChange={e => setCustomDescription(e.target.value)}></textarea>
                            </div>

                            {formData.items.length > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-x-auto mt-2 border-t pt-3">
                                    <table className="w-full min-w-[600px] text-xs bg-white text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                            <tr>
                                                <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider">Sản Phẩm</th>
                                                <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-center w-16">SL</th>
                                                <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-right w-28">Đ.Giá</th>
                                                <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-center w-20">Thuế</th>
                                                <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-right w-32">Thành Tiền</th>
                                                <th className="p-2.5 font-bold text-[11px] uppercase tracking-wider text-center w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {formData.items.map((item: any, i: number) => (
                                                <tr key={i} className={`hover:bg-slate-50/80 transition-colors ${item.isSubItem ? 'bg-slate-50/50' : ''}`}>
                                                    <td className="p-2.5 text-slate-800" style={item.isSubItem ? { paddingLeft: '1.5rem' } : {}}>
                                                        <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                                                            {item.isSubItem && <span className="text-slate-400">↳</span>}
                                                            <span className={item.isSubItem ? 'text-slate-600 font-medium' : ''}>{item.productName || item.customName}</span>
                                                            {item.saveToInventory === false && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200" title="Sản phẩm dùng 1 lần cho đơn hàng này, không lưu vào kho">
                                                                    ⚡ Dùng 1 lần
                                                                </span>
                                                            )}
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
                                                            <button type="button" onClick={() => handleEditItem(i)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors" title="Sửa dòng này"><Edit2 size={14} /></button>
                                                            <button type="button" onClick={() => handleRemoveItem(i)} className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition-colors" title="Xóa"><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50 border-t border-slate-200 text-slate-700 text-xs">
                                            <tr>
                                                <td colSpan={4} className="p-2.5 text-right">Tổng tiền trước thuế:</td>
                                                <td className="p-2.5 text-right font-medium font-mono">{formatMoney(formData.subTotal || 0)}</td>
                                                <td className="p-2.5"></td>
                                            </tr>
                                            <tr>
                                                <td colSpan={4} className="p-2.5 text-right">Tổng tiền thuế:</td>
                                                <td className="p-2.5 text-right font-medium text-slate-500 font-mono">{formatMoney(formData.taxAmount || 0)}</td>
                                                <td className="p-2.5"></td>
                                            </tr>
                                            <tr className="border-t border-slate-200">
                                                <td colSpan={4} className="p-2.5 text-right font-bold text-xs">Tổng Cộng:</td>
                                                <td className="p-2.5 text-right font-bold text-emerald-700 text-sm font-mono">{formatMoney(formData.totalAmount || 0)}</td>
                                                <td className="p-2.5"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-start gap-2.5 mt-2">
                        <Button onClick={() => setIsFormOpen(false)} variant="secondary" className="px-4 h-[34px] text-xs border-slate-200 shadow-2xs text-slate-700 font-semibold bg-white hover:bg-slate-50 flex justify-center items-center">Hủy</Button>
                        <Button onClick={handleSave} className="flex items-center justify-center gap-1.5 px-6 h-[34px] text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all text-white rounded-lg">
                            <Save size={14} /> Lưu Đơn Hàng
                        </Button>
                    </div>
                </div>
            </Modal>
            {/* Convert Modal */}
            <Modal isOpen={!!convertModalId} onClose={() => !isConverting && setConvertModalId(null)} title="Xác nhận Lên Hóa Đơn">
                <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <p className="text-gray-700 text-[15px] mb-6 leading-relaxed">
                        Bạn có chắc chắn muốn chuyển dữ liệu từ Đơn Đặt Hàng này thành <strong>Hóa Đơn</strong> không? Các thông tin chi tiết sẽ được tự động sao chép sang Hóa Đơn mới.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem', padding: '1rem', borderRadius: '0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '9999px', color: '#3b82f6', flexShrink: 0, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <ArrowRightLeft size={20} />
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#1e3a8a', lineHeight: 1.625, marginTop: '0.125rem' }}>
                            <strong style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Cập nhật tự động</strong>
                            Đơn đặt hàng này sẽ tự động chuyển thành trạng thái <strong style={{ backgroundColor: '#dbeafe', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', color: '#1d4ed8', fontWeight: 700 }}>"Hoàn Thành"</strong> sau quá trình khởi tạo thành công.
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

            {/* Generic Action Modal */}
            <Modal isOpen={!!actionModal?.isOpen} onClose={() => !isActioning && setActionModal(null)} title={actionModal?.title || 'Xác nhận'}>
                <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
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
