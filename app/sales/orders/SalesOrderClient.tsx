'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Plus, Edit2, Trash2, Save, X, Printer, PackageCheck, Search, Calendar, LayoutList, FolderClock, CheckCircle2, XCircle, FileText, ChevronUp, ChevronDown, Eye, Link as LinkIcon, Download, Check, ArrowRightLeft } from 'lucide-react';
import { submitSalesOrder, updateSalesOrderStatus, deleteSalesOrder, updateSalesOrder, convertOrderToInvoice } from './actions';
import { formatMoney } from '@/lib/utils/formatters';
import Link from 'next/link';

export default function SalesOrderClient({ initialOrders, customers, products, nextCode, initialAction, initialCustomerId }: any) {
    const [orders, setOrders] = useState(initialOrders);
    const [isFormOpen, setIsFormOpen] = useState(initialAction === 'new');

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
    const [formData, setFormData] = useState<any>({
        code: nextCode,
        customerId: initialCustomerId || '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'DRAFT',
        subTotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        items: []
    });

    const handleOpenCreate = () => {
        setFormData({
            code: nextCode,
            customerId: '',
            date: new Date().toISOString().split('T')[0],
            notes: '',
            status: 'DRAFT',
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
            totalPrice: i.totalPrice
        })) : [];

        const calcSubTotal = mappedItems.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unitPrice), 0);
        const calcTaxAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.taxAmount, 0);
        const calcTotalAmount = mappedItems.reduce((acc: number, curr: any) => acc + curr.totalPrice, 0);

        setFormData({
            id: order.id,
            code: order.code || '',
            customerId: order.customerId || '',
            date: order.date ? new Date(order.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            notes: order.notes || '',
            status: order.status || 'DRAFT',
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

        setFormData((prev: any) => {
            const newItems = [...prev.items, {
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
            }];

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
            res = await updateSalesOrder(formData.id, formData);
        } else {
            res = await submitSalesOrder('system', formData);
        }

        if (res.success) {
            window.location.href = window.location.pathname;
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
            window.location.href = '/sales/invoices';
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

    return (
        <>
            <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Danh sách Đơn Hỏi Mua / Đặt Hàng</h2>
                    <Button onClick={handleOpenCreate} className="flex items-center gap-2">
                        <Plus size={16} /> Tạo Đơn Đặt Hàng Mới
                    </Button>
                </div>

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
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm theo Mã SO, Tên khách hàng..."
                            className="pl-9 border border-slate-300 px-3 py-2 rounded-lg text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 w-full bg-white"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <input
                            type="date"
                            className="border border-slate-300 px-3 py-2 rounded-lg text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            title="Từ ngày"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            className="border border-slate-300 px-3 py-2 rounded-lg text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            title="Đến ngày"
                        />
                    </div>
                    <div className="flex items-center gap-2 min-w-[200px]">
                        <select
                            className="border border-slate-300 px-3 py-2 rounded-lg text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 w-full bg-white cursor-pointer"
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                        >
                            <option value="date_desc">Ngày (Mới nhất)</option>
                            <option value="date_asc">Ngày (Cũ nhất)</option>
                            <option value="amount_desc">Tổng Tiền (Cao xuống thấp)</option>
                            <option value="amount_asc">Tổng Tiền (Thấp lên cao)</option>
                            <option value="code_asc">Mã SO (A-Z)</option>
                            <option value="code_desc">Mã SO (Z-A)</option>
                        </select>
                    </div>
                </div>


                <Table>
                    <thead>
                        <tr>
                            <th className="text-left font-medium text-gray-500 pb-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('code')}>
                                <div className="flex items-center gap-1">
                                    Mã SO {sortBy === 'code_asc' ? <ChevronUp size={14} /> : sortBy === 'code_desc' ? <ChevronDown size={14} /> : <div className="w-[14px]"></div>}
                                </div>
                            </th>
                            <th className="text-left font-medium text-gray-500 pb-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('date')}>
                                <div className="flex items-center gap-1">
                                    Ngày Lập {sortBy === 'date_asc' ? <ChevronUp size={14} /> : sortBy === 'date_desc' ? <ChevronDown size={14} /> : <div className="w-[14px]"></div>}
                                </div>
                            </th>
                            <th className="text-left font-medium text-gray-500 pb-3">Khách Hàng</th>
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
                        {filteredOrders.map((o: any) => (
                            <tr key={o.id} className="border-t border-gray-100">
                                <td className="py-3 items-center gap-2 flex">
                                    <PackageCheck size={16} className="text-blue-500" />
                                    <Link href={`/sales/orders/${o.id}`} className="font-semibold text-gray-800 hover:text-primary hover:underline transition-colors block">
                                        {o.code}
                                    </Link>
                                </td>
                                <td className="py-3 text-gray-600" suppressHydrationWarning>{new Date(o.date).toLocaleDateString()}</td>
                                <td className="py-3">
                                    {o.customerId ? (
                                        <Link href={`/customers/${o.customerId}`} className="font-medium text-gray-800 hover:text-primary hover:underline transition-colors block">
                                            {o.customer?.name}
                                        </Link>
                                    ) : (
                                        o.customer?.name
                                    )}
                                </td>
                                <td className="py-3 text-right font-medium">{formatMoney(o.totalAmount)}</td>
                                <td className="py-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-medium border ${o.status === 'SENT' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                        o.status === 'CONFIRMED' ? 'bg-green-50 text-green-600 border-green-200' :
                                            o.status === 'COMPLETED' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                                o.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-200' :
                                                    'bg-gray-50 text-gray-600 border-gray-200'
                                        }`}>
                                        {o.status}
                                    </span>
                                </td>
                                <td className="py-3 text-right">
                                    <div className="flex justify-end items-center gap-2">
                                        <div className="flex items-center gap-1 mr-1">
                                            {o.status === 'DRAFT' && (
                                                <button onClick={() => handleEdit(o)} title="Chỉnh sửa" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                                    <Edit2 size={15} />
                                                </button>
                                            )}
                                            <Link href={`/sales/orders/${o.id}`} title="Xem chi tiết" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors block">
                                                <Eye size={15} />
                                            </Link>
                                            <Link href={`/print/sales/order/${o.id}`} target="_blank" title="Tải PDF / In ấn" className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors block">
                                                <Download size={15} />
                                            </Link>
                                            <Link href={`/public/sales/order/${o.id}`} target="_blank" title="Link xem Public" className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors block">
                                                <LinkIcon size={15} />
                                            </Link>
                                            <button onClick={() => handleDelete(o.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors" title="Xóa">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>

                                        {o.status === 'DRAFT' && (
                                            <Button variant="secondary" onClick={() => handleStatusChange(o.id, 'CONFIRMED')} title="Chốt Đơn" className="px-3 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 py-1.5 text-xs font-semibold flex-shrink-0 shadow-sm transition-all rounded-md">
                                                Chốt Đơn
                                            </Button>
                                        )}
                                        {o.status === 'CONFIRMED' && (
                                            <Button variant="secondary" onClick={() => handleStatusChange(o.id, 'COMPLETED')} className="text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 px-3 flex-shrink-0 py-1.5 text-xs font-semibold shadow-sm transition-all rounded-md" title="Hoàn Thành">
                                                <PackageCheck size={14} className="mr-1.5 inline-block" /> Xong
                                            </Button>
                                        )}
                                        {(o.status === 'DRAFT' || o.status === 'CONFIRMED') && (
                                            <Button variant="secondary" onClick={() => setConvertModalId(o.id)} className="text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300 px-3 flex-shrink-0 py-1.5 text-xs font-semibold shadow-sm transition-all rounded-md" title="Tạo Hóa Đơn Tự Động">
                                                <ArrowRightLeft size={14} className="mr-1.5 inline-block" /> Lên Hóa Đơn
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredOrders.length === 0 && (
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
            </Card>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? "Sửa Đơn Đặt Hàng" : "Tạo Đơn Đặt Hàng Mới"} maxWidth="1000px">
                <div className="flex flex-col gap-6 py-2">
                    <div>
                        <h3 className="text-[1.1rem] font-semibold text-gray-800 mb-4">Thông tin chung</h3>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã Đơn</label>
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
                                    value={formData.customerId || ''}
                                    onChange={val => setFormData({ ...formData, customerId: val })}
                                    placeholder="-- Chọn KH --"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày Lập Đơn</label>
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
                                    value={formData.validUntil || ''}
                                    onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú</label>
                                <input
                                    type="text" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-gray-900 bg-white"
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Ghi chú thêm..."
                                />
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
                                            value={selectedProduct || ''}
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
                                <div className="border border-gray-200 rounded-xl overflow-hidden mt-2 border-t pt-4">
                                    <table className="w-full text-sm bg-white text-left">
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
                            <Save size={16} /> Lưu Đơn Hàng
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
