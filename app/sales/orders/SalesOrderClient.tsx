'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Plus, Edit2, Trash2, Save, X, Printer, PackageCheck, Search, Calendar, LayoutList, FolderClock, CheckCircle2, XCircle, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { submitSalesOrder, updateSalesOrderStatus, deleteSalesOrder, updateSalesOrder } from './actions';
import { formatMoney } from '@/lib/utils/formatters';

export default function SalesOrderClient({ initialOrders, customers, products, nextCode }: any) {
    const [orders, setOrders] = useState(initialOrders);
    const [isFormOpen, setIsFormOpen] = useState(false);

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
        customerId: '',
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
        setIsFormOpen(true);
    };

    // Quick Item state
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);

    const handleProductSelect = (pid: string) => {
        const prod = products.find((p: any) => p.id === pid);
        setSelectedProduct(pid);
        setPrice(prod ? prod.salePrice : 0);
    };

    const handleAddItem = () => {
        if (!selectedProduct) return;
        const prod = products.find((p: any) => p.id === selectedProduct);
        if (!prod) return;

        const taxRate = prod.taxRate || 0;
        const baseTotal = qty * price;
        const taxItemAmount = baseTotal * taxRate / 100;
        const total = baseTotal + taxItemAmount;

        setFormData((prev: any) => {
            const newItems = [...prev.items, {
                productId: prod.id,
                productName: prod.name,
                unit: prod.unit,
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
            window.location.reload();
        } else {
            alert('Lỗi: ' + res.error);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        if (!confirm(`Chuyển trạng thái sang ${newStatus}?`)) return;
        const res = await updateSalesOrderStatus(id, newStatus);
        if (res.success) {
            setOrders(orders.map((o: any) => o.id === id ? { ...o, status: newStatus } : o));
        } else alert(res.error);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Xóa Đơn Đặt Hàng này?')) return;
        const res = await deleteSalesOrder(id);
        if (res.success) {
            setOrders(orders.filter((o: any) => o.id !== id));
        } else alert(res.error);
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
        { id: 'DRAFT', label: 'Bản Nháp', count: stats.DRAFT.count, amount: stats.DRAFT.amount, colorClass: 'stat-card-amber', icon: FileText },
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
        <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Danh sách Đơn Hỏi Mua / Đặt Hàng</h2>
                <Button onClick={() => isFormOpen ? setIsFormOpen(false) : handleOpenCreate()} className="flex items-center gap-2">
                    {isFormOpen ? <X size={16} /> : <Plus size={16} />}
                    {isFormOpen ? 'Hủy' : 'Tạo Đơn Đặt Hàng Mới'}
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

            {isFormOpen && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">{formData.id ? "Sửa Đơn Đặt Hàng" : "Thông tin chung"}</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Mã Đơn</label>
                            <input
                                type="text" className="w-full border rounded p-2"
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Khách Hàng (*)</label>
                            <select
                                className="w-full border rounded p-2"
                                value={formData.customerId}
                                onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                            >
                                <option value="">-- Chọn KH --</option>
                                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Ngày Lập Đơn</label>
                            <input
                                type="date" className="w-full border rounded p-2"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="col-span-3">
                            <label className="block text-sm text-gray-600 mb-1">Ghi chú yêu cầu</label>
                            <input
                                type="text" className="w-full border rounded p-2"
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <h3 className="font-medium mb-4 mt-6">Sản Phẩm Khách Chọn</h3>
                    <div className="flex gap-2 mb-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-600 mb-1">Thêm SP</label>
                            <select className="w-full border rounded p-2" value={selectedProduct} onChange={(e) => handleProductSelect(e.target.value)}>
                                <option value="">-- Chọn Sản Phẩm --</option>
                                {products.map((p: any) => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                            </select>
                        </div>
                        <div className="w-24">
                            <label className="block text-sm text-gray-600 mb-1">Đơn giá</label>
                            <input type="number" className="w-full border rounded p-2" value={price} onChange={e => setPrice(Number(e.target.value))} />
                        </div>
                        <div className="w-24">
                            <label className="block text-sm text-gray-600 mb-1">Thuế SP</label>
                            <input type="text" className="w-full border rounded p-2 bg-gray-100 text-center text-gray-600 font-medium cursor-not-allowed" value={`${products.find((p: any) => p.id === selectedProduct)?.taxRate || 0}%`} disabled />
                        </div>
                        <div className="w-20">
                            <label className="block text-sm text-gray-600 mb-1">SL</label>
                            <input type="number" min="1" className="w-full border rounded p-2" value={qty} onChange={e => setQty(Number(e.target.value))} />
                        </div>
                        <Button onClick={handleAddItem} variant="secondary" className="mb-[2px]">Thêm</Button>
                    </div>

                    {formData.items.length > 0 && (
                        <table className="w-full text-sm mb-4 bg-white border">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 border">Sản Phẩm</th>
                                    <th className="p-2 border">SL</th>
                                    <th className="p-2 border">Đ.Giá</th>
                                    <th className="p-2 border">Thuế</th>
                                    <th className="p-2 border">Thành Tiền</th>
                                    <th className="p-2 border w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.items.map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td className="p-2 border">{item.productName}</td>
                                        <td className="p-2 border text-center">{item.quantity}</td>
                                        <td className="p-2 border text-right">{formatMoney(item.unitPrice)}</td>
                                        <td className="p-2 border text-center">{item.taxRate}%</td>
                                        <td className="p-2 border text-right font-medium">{formatMoney(item.totalPrice)}</td>
                                        <td className="p-2 border text-center">
                                            <button onClick={() => handleRemoveItem(i)} className="text-red-500"><Trash2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={4} className="p-2 border text-right font-medium text-gray-600 text-sm">Tổng tiền trước thuế:</td>
                                    <td className="p-2 border text-right font-medium text-gray-800">{formatMoney(formData.subTotal || 0)}</td>
                                    <td className="p-2 border"></td>
                                </tr>
                                <tr>
                                    <td colSpan={4} className="p-2 border text-right font-medium text-gray-600 text-sm">Tổng tiền thuế:</td>
                                    <td className="p-2 border text-right font-medium text-gray-800">{formatMoney(formData.taxAmount || 0)}</td>
                                    <td className="p-2 border"></td>
                                </tr>
                                <tr>
                                    <td colSpan={4} className="p-2 border text-right font-bold">Tổng Cộng:</td>
                                    <td className="p-2 border text-right font-bold text-primary">{formatMoney(formData.totalAmount || 0)}</td>
                                    <td className="p-2 border"></td>
                                </tr>
                            </tfoot>
                        </table>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} className="flex items-center gap-2">
                            <Save size={16} /> Lưu Trữ Đơn
                        </Button>
                    </div>
                </div>
            )}

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
                                {o.code}
                            </td>
                            <td className="py-3">{new Date(o.date).toLocaleDateString()}</td>
                            <td className="py-3">{o.customer?.name}</td>
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
                                    <Button variant="secondary" onClick={() => handleStatusChange(o.id, 'CONFIRMED')} title="Chốt Đơn" className="px-3 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 py-1.5 text-xs font-semibold flex-shrink-0 shadow-sm transition-all rounded-md">
                                        Chốt Đơn
                                    </Button>
                                    <Button variant="secondary" onClick={() => handleStatusChange(o.id, 'COMPLETED')} className="text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 px-3 flex-shrink-0 py-1.5 text-xs font-semibold shadow-sm transition-all rounded-md" title="Hoàn Thành">
                                        <PackageCheck size={14} className="mr-1.5 inline-block" /> Xong
                                    </Button>

                                    <div className="flex items-center bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden divide-x divide-slate-200 ml-1">
                                        {o.status === 'DRAFT' && (
                                            <button onClick={() => handleEdit(o)} title="Chỉnh sửa" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                                <Edit2 size={15} />
                                            </button>
                                        )}
                                        <button onClick={() => handleDelete(o.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors" title="Xóa">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
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
    );
}
