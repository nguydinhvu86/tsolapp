'use client';

import React, { useState } from 'react';
import { Plus, Search, Eye, Trash2, Calendar, FileText, FileDown, CheckCircle, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createPurchaseBill, approvePurchaseBill, deletePurchaseBill } from '@/app/purchasing/actions';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';

export function PurchaseBillClient({ initialBills, suppliers, orders, warehouses, products }: { initialBills: any[], suppliers: any[], orders: any[], warehouses: any[], products: any[] }) {
    const [bills, setBills] = useState(initialBills);
    const [searchQuery, setSearchQuery] = useState('');

    // Sort logic
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

    const supplierFormOptions = [{ value: '', label: '-- Chọn Nhà Cung Cấp --' }, ...suppliers.map((s: any) => ({ value: s.id, label: s.name }))];
    const warehouseOptions = [{ value: '', label: '-- Chọn Kho --' }, ...warehouses.map((w: any) => ({ value: w.id, label: w.name }))];
    const productOptions = [{ value: '', label: 'Lựa chọn...' }, ...products.map((p: any) => ({ value: p.id, label: p.code ? `[${p.code}] ${p.name}` : p.name }))];

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState<any | null>(null);

    // Form
    const [formData, setFormData] = useState({
        supplierId: '',
        orderId: '',
        supplierInvoice: '',
        date: new Date().toISOString().substring(0, 10),
        notes: '',
    });
    const [billItems, setBillItems] = useState<Array<{ productId: string, quantity: number, unitPrice: number }>>([]);
    const [approveWarehouseId, setApproveWarehouseId] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const searchParams = useSearchParams();

    React.useEffect(() => {
        const supplierId = searchParams.get('supplierId');
        const orderId = searchParams.get('orderId');

        if (orderId) {
            const order = orders.find(o => o.id === orderId);
            if (order) {
                setFormData(prev => ({ ...prev, supplierId: order.supplierId, orderId: order.id }));

                // Map items from order to bill
                if (order.items && order.items.length > 0) {
                    const mappedItems = order.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice
                    }));
                    setBillItems(mappedItems);
                }

                setIsCreateModalOpen(true);
            }
        } else if (supplierId) {
            setFormData(prev => ({ ...prev, supplierId }));
            setIsCreateModalOpen(true);
        }
    }, [searchParams, orders]);

    const filteredBills = bills.filter(b =>
        (b.code && b.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.supplierInvoice && b.supplierInvoice.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.supplierInvoice && b.supplierInvoice.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.supplier && b.supplier.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDate = (dateString: string | Date) => {
        return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const handleOpenCreate = () => {
        setFormData({ supplierId: '', orderId: '', supplierInvoice: '', date: new Date().toISOString().substring(0, 10), notes: '' });
        setBillItems([]);
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
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice
                    }));
                    setBillItems(mappedItems);
                }
            }
        }
    };

    const handleAddItem = () => {
        setBillItems([...billItems, { productId: '', quantity: 1, unitPrice: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setBillItems(billItems.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...billItems];
        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            newItems[index] = { ...newItems[index], [field]: value, unitPrice: product?.importPrice || 0 };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setBillItems(newItems);
    };

    const calculateTotal = () => {
        return billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    const handleDelete = async (id: string, code: string) => {
        if (confirm(`Bạn có chắc chắn muốn xóa Hóa Đơn ${code}? hành động này không thể hoàn tác.`)) {
            try {
                await deletePurchaseBill(id);
                setBills(bills.filter(b => b.id !== id));
            } catch (error: any) {
                alert(error.message || "Xóa thất bại. Có thể hóa đơn đã được duyệt hoặc đang ở trạng thái khác DRAFT.");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.supplierId) {
            alert("Vui lòng chọn nhà cung cấp");
            return;
        }

        if (billItems.length === 0) {
            alert("Vui lòng thêm ít nhất 1 sản phẩm vào hóa đơn");
            return;
        }

        setIsSubmitting(true);
        try {
            const submitData = {
                ...formData,
                totalAmount: calculateTotal(),
                items: billItems
            };

            const created = await createPurchaseBill(submitData);

            const supplier = suppliers.find(s => s.id === formData.supplierId);
            const newBillUi = {
                ...created,
                supplier: supplier,
                _count: { items: billItems.length }
            };

            setBills([newBillUi, ...bills]);
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra khi tạo Hóa đơn");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        if (!approveWarehouseId) {
            alert("Vui lòng chọn kho nhập hàng");
            return;
        }
        setIsSubmitting(true);
        try {
            const updated = await approvePurchaseBill(selectedBill.id, approveWarehouseId);
            setBills(bills.map(b => b.id === updated.id ? { ...b, status: updated.status } : b));
            setIsApproveModalOpen(false);
            alert("Duyệt hóa đơn thành công. Hàng hóa đã được nhập kho và ghi nhận công nợ.");
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Lỗi khi duyệt hóa đơn");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">Lưu Nháp</span>;
            case 'APPROVED': return <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">Đã Duyệt (Nợ)</span>;
            case 'PARTIAL_PAID': return <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-medium">Thanh toán 1 phần</span>;
            case 'PAID': return <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">Đã Thanh Toán</span>;
            default: return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">{status}</span>;
        }
    };

    return (
        <div className="p-8">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl mb-1">Hóa Đơn Mua Hàng</h1>
                    <p className="text-sm text-gray-500">Ghi nhận hóa đơn từ NCC để nhập kho và tính công nợ</p>
                </div>
                <button onClick={handleOpenCreate} className="btn btn-primary">
                    <Plus size={20} style={{ marginRight: '8px' }} />
                    <span>Tạo Hóa Đơn</span>
                </button>
            </div>

            <div className="card search-card">
                <div className="search-input-wrapper">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm theo mã HĐ nội bộ, Số HĐ NCC..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input"
                    />
                </div>
                <div className="flex gap-4 w-full sm:w-auto text-sm mt-4 sm:mt-0">
                    <div className="stat-card stat-card-blue" style={{ minWidth: '160px' }}>
                        <div className="stat-info">
                            <span className="stat-title">Tổng Số Hóa Đơn</span>
                            <span className="stat-value">{bills.length}</span>
                        </div>
                    </div>
                    <div className="stat-card stat-card-red" style={{ minWidth: '160px' }}>
                        <div className="stat-info">
                            <span className="stat-title">Tổng Giá Trị (Nợ)</span>
                            <span className="stat-value">
                                {formatMoney(bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0))}
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
                                <div className="flex items-center gap-1">Mã Hệ Thống <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('supplierInvoice')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">Số HĐ (NCC) <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('date')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">Ngày / Nhà Cung Cấp <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('totalAmount')} className="cursor-pointer hover:bg-gray-100 text-right">
                                <div className="flex items-center justify-end gap-1">Tổng Tiền <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('status')} className="cursor-pointer hover:bg-gray-100 text-center">
                                <div className="flex items-center justify-center gap-1">Trạng Thái <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th className="text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedBills.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    Không tìm thấy hóa đơn nào
                                </td>
                            </tr>
                        ) : (
                            sortedBills.map((bill) => (
                                <tr key={bill.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
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
                                    <td className="p-4 text-right">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">{formatMoney(bill.totalAmount || 0)}</div>
                                        {bill.paidAmount > 0 && <div className="text-xs text-green-600 mt-1">Đã trả: {formatMoney(bill.paidAmount)}</div>}
                                    </td>
                                    <td className="p-4 text-center">{getStatusBadge(bill.status)}</td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <Link
                                                href={`/purchasing/bills/${bill.id}`}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded inline-block"
                                                title="Xem chi tiết"
                                            >
                                                <Eye size={18} />
                                            </Link>
                                            {bill.status === 'DRAFT' && (
                                                <>
                                                    <button
                                                        onClick={() => { setSelectedBill(bill); setIsApproveModalOpen(true); }}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded flex items-center gap-1 text-xs font-semibold px-2"
                                                        title="Duyệt & Nhập Kho"
                                                    >
                                                        <CheckCircle size={16} /> Duyệt
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(bill.id, bill.code)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded inline-block"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Approve Modal */}
            {isApproveModalOpen && selectedBill && (
                <div className="modal-backdrop">
                    <div className="modal-container max-w-md p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <CheckCircle className="text-blue-500" /> Duyệt Hóa Đơn {selectedBill.code}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            Hành động này sẽ:
                            <br />1. Tự động tạo phiếu Nhập Kho cho các sản phẩm trong hóa đơn.
                            <br />2. Ghi nhận tăng Công Nợ đối với nhà cung cấp <b>{selectedBill.supplier?.name}</b>.
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chọn Kho Nhập Hàng *</label>
                            <SearchableSelect
                                value={approveWarehouseId}
                                onChange={(val) => setApproveWarehouseId(val)}
                                options={warehouseOptions}
                                placeholder="-- Chọn Kho --"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsApproveModalOpen(false)} className="btn btn-secondary">Hủy</button>
                            <button onClick={handleApprove} disabled={isSubmitting || !approveWarehouseId} className="btn btn-primary">Xác Nhận Duyệt</button>
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
                                <FileDown className="text-primary" /> Nhập Hóa Đơn Mua
                            </h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                            <form id="billForm" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="sm:col-span-2 lg:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nhà Cung Cấp *</label>
                                        <SearchableSelect
                                            value={formData.supplierId}
                                            onChange={(val) => setFormData({ ...formData, supplierId: val })}
                                            options={supplierFormOptions}
                                            placeholder="-- Chọn Nhà Cung Cấp --"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngày Lập HĐ</label>
                                        <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số HĐ (Của NCC)</label>
                                        <input type="text" value={formData.supplierInvoice} onChange={e => setFormData({ ...formData, supplierInvoice: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" placeholder="Ví dụ: HD-1234" />
                                    </div>
                                </div>

                                {/* Products Table */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg flex items-center gap-2">
                                            <FileText size={18} /> Chi Tiết Sản Phẩm
                                        </h3>
                                        <button type="button" onClick={handleAddItem} className="text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded">
                                            <Plus size={16} /> Thêm Dòng
                                        </button>
                                    </div>
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                                    <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm">Sản Phẩm</th>
                                                    <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm w-32">Số Lượng</th>
                                                    <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm w-48">Đơn Giá Nhập</th>
                                                    <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm w-48 text-right">Thành Tiền</th>
                                                    <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm w-16 text-center"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {billItems.map((item, index) => (
                                                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                                                        <td className="p-2">
                                                            <SearchableSelect
                                                                value={item.productId}
                                                                onChange={(val) => handleItemChange(index, 'productId', val)}
                                                                options={productOptions}
                                                                placeholder="Lựa chọn..."
                                                            />
                                                        </td>
                                                        <td className="p-2"><input type="number" required min="1" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} className="w-full rounded bg-white dark:bg-gray-700 border p-2 text-sm text-center" /></td>
                                                        <td className="p-2"><input type="number" required min="0" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))} className="w-full rounded bg-white dark:bg-gray-700 border p-2 text-sm text-right" /></td>
                                                        <td className="p-2 text-right font-medium">{formatMoney(item.quantity * item.unitPrice)}</td>
                                                        <td className="p-2 text-center"><button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 p-1"><Trash2 size={16} /></button></td>
                                                    </tr>
                                                ))}
                                                {billItems.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">Chưa có sản phẩm.</td></tr>}
                                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                    <td colSpan={3} className="p-3 text-right font-semibold">Tổng Cộng:</td>
                                                    <td className="p-3 text-right font-bold text-primary text-lg">{formatMoney(calculateTotal())}</td>
                                                    <td></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 mt-auto">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Hủy</button>
                            <button type="submit" form="billForm" disabled={isSubmitting || billItems.length === 0} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium">Lưu Nháp</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
