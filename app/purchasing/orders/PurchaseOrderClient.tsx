'use client';
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { Plus, Search, Eye, Trash2, Calendar, FileText, ShoppingCart, ArrowUpDown, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createPurchaseOrder, deletePurchaseOrder, updatePurchaseOrder } from '@/app/purchasing/actions';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';

export function PurchaseOrderClient({ initialOrders, suppliers, products }: { initialOrders: any[], suppliers: any[], products: any[] }) {
    const [orders, setOrders] = useState(initialOrders);
    const [searchQuery, setSearchQuery] = useState('');

    // Sort logic
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

    const supplierFilterOptions = [{ value: '', label: 'Tất cả Nhà cung cấp' }, ...suppliers.map((s: any) => ({ value: s.id, label: s.name }))];
    const supplierFormOptions = [{ value: '', label: '-- Chọn Nhà Cung Cấp --' }, ...suppliers.map((s: any) => ({ value: s.id, label: `${s.name} - ${s.code}` }))];
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
    const [orderItems, setOrderItems] = useState<Array<{ productId: string, productName?: string, quantity: number, unitPrice: number, taxRate: number, description?: string, unit?: string, customName?: string }>>([]);
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

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };


    const handleOpenCreate = () => {
        setFormData({ supplierId: '', date: new Date().toISOString().substring(0, 10), notes: '', status: 'DRAFT', id: undefined } as any);
        setOrderItems([]);

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
            unit: i.product?.unit || 'Cái',
            description: i.notes || ''
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
            alert('Vui lòng chọn sản phẩm');
            return;
        }
        if (isCustomProduct && !customName.trim()) {
            alert('Vui lòng nhập tên sản phẩm tùy chỉnh');
            return;
        }
        if (qty <= 0) {
            alert('Số lượng phải lớn hơn 0');
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

        setOrderItems(prev => [...prev, newItem]);

        // Reset the form
        setSelectedProduct('');
        setCustomName('');
        setCustomDescription('');
        setCustomUnit('Cái');
        setQty(1);
        setPrice(0);
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
        return orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    const calculateTax = () => {
        return orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate || 0) / 100), 0);
    };

    const calculateTotal = () => {
        return calculateSubTotal() + calculateTax();
    };

    const handleDelete = async (id: string, code: string) => {
        if (confirm(`Bạn có chắc chắn muốn xóa Đơn Đặt Hàng ${code}? hành động này không thể hoàn tác.`)) {
            try {
                await deletePurchaseOrder(id);
                setOrders(orders.filter(o => o.id !== id));
            } catch (error: any) {
                alert(error.message || "Xóa thất bại. Có thể đơn hàng đã chuyển trạng thái.");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.supplierId) {
            alert("Vui lòng chọn nhà cung cấp");
            return;
        }

        if (orderItems.length === 0) {
            alert("Vui lòng thêm ít nhất 1 sản phẩm vào đơn hàng");
            return;
        }

        for (let i = 0; i < orderItems.length; i++) {
            if (orderItems[i].productId === 'EXTERNAL' && !orderItems[i].productName?.trim()) {
                alert(`Vui lòng nhập tên sản phẩm cho dòng ${i + 1}`);
                return;
            }
            if (!orderItems[i].productId || orderItems[i].quantity <= 0) {
                alert(`Sản phẩm dòng ${i + 1} không hợp lệ`);
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
            alert("Có lỗi xảy ra khi tạo Đơn đặt hàng");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">Lưu Nháp</span>;
            case 'SENT': return <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">Đã Gửi</span>;
            case 'PARTIAL_RECEIVED': return <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-medium">Nhập 1 phần</span>;
            case 'COMPLETED': return <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">Hoàn Thành</span>;
            case 'CANCELLED': return <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">Đã Hủy</span>;
            default: return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">{status}</span>;
        }
    };

    return (
        <div className="p-8">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl mb-1">Đơn Đặt Hàng (PO)</h1>
                    <p className="text-sm text-gray-500">Quản lý các đơn yêu cầu mua hàng gửi NCC</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="btn btn-primary"
                >
                    <Plus size={20} style={{ marginRight: '8px' }} />
                    <span>Tạo Đơn Hàng</span>
                </button>
            </div>

            {/* Quick Stats or Search */}
            <div className="card search-card">
                <div className="search-input-wrapper">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm theo mã PO, tên NCC..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input"
                    />
                </div>

                {/* Advanced Filters */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem', width: '100%' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <SearchableSelect
                            value={filterSupplierId}
                            onChange={(val) => setFilterSupplierId(val)}
                            options={supplierFilterOptions}
                            placeholder="Tất cả Nhà cung cấp"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: '1 1 300px' }}>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'nowrap' }}>Từ:</span>
                        <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="input" style={{ padding: '0.5rem', borderRadius: '0.375rem', width: '100%' }} />
                        <span style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'nowrap' }}>Đến:</span>
                        <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="input" style={{ padding: '0.5rem', borderRadius: '0.375rem', width: '100%' }} />
                    </div>
                </div>

                <div className="flex gap-4 w-full sm:w-auto text-sm mt-4">
                    <div className="stat-card stat-card-blue" style={{ minWidth: '160px' }}>
                        <div className="stat-info">
                            <span className="stat-title">Tổng Đơn Đặt</span>
                            <span className="stat-value">{orders.length}</span>
                        </div>
                    </div>
                    <div className="stat-card stat-card-green" style={{ minWidth: '160px' }}>
                        <div className="stat-info">
                            <span className="stat-title">Tổng Giá Trị Đặt</span>
                            <span className="stat-value">
                                {formatMoney(orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('code')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">Mã Đơn <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('date')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">Ngày / Nhà Cung Cấp <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th className="text-center">Số Mặt Hàng</th>
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
                        {sortedOrders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    Không tìm thấy đơn đặt hàng nào
                                </td>
                            </tr>
                        ) : (
                            sortedOrders.map((order) => (
                                <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="p-4 text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                        <Link href={`/purchasing/orders/${order.id}`} className="hover:text-primary hover:underline">
                                            {order.code}
                                        </Link>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                                            <Calendar size={13} /> {formatDate(order.date)}
                                        </div>
                                        <Link href={`/suppliers/${order.supplierId}`} className="font-semibold text-primary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
                                            {order.supplier?.name}
                                        </Link>
                                    </td>
                                    <td className="p-4 text-center text-gray-600 dark:text-gray-400">
                                        {order._count?.items || 0}
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            {formatMoney(order.totalAmount || 0)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {getStatusBadge(order.status)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {order.status === 'DRAFT' && (
                                                <button
                                                    onClick={() => handleEdit(order)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded inline-block"
                                                    title="Sửa"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            )}
                                            <Link
                                                href={`/purchasing/orders/${order.id}`}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded inline-block"
                                                title="Xem chi tiết"
                                            >
                                                <Eye size={18} />
                                            </Link>
                                            {order.status === 'DRAFT' && (
                                                <button
                                                    onClick={() => handleDelete(order.id, order.code)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded inline-block"
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create PO Modal */}
            {isCreateModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-container shadow-2xl" style={{ maxWidth: '64rem', margin: 'auto' }}>
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <ShoppingCart className="text-primary" />
                                    {(formData as any).id ? "Sửa Đơn Đặt Hàng" : "Tạo Đơn Đặt Hàng Mới"}
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                            <form id="orderForm" onSubmit={handleSubmit} className="space-y-6">
                                {/* General Info */}
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
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngày Đặt Hàng</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ghi Chú</label>
                                        <input
                                            type="text"
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5 text-gray-900 dark:text-white"
                                            placeholder="Giao hàng buổi sáng..."
                                        />
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg flex items-center gap-2">
                                            <FileText size={18} /> Chi Tiết Sản Phẩm Đặt
                                        </h3>
                                    </div>

                                    {/* Sub-Form for Add Item */}
                                    <div className="flex flex-col bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
                                        <div className="mb-4 flex items-center gap-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                                                <input type="radio" className="accent-primary w-4 h-4 cursor-pointer" checked={!isCustomProduct} onChange={() => setIsCustomProduct(false)} />
                                                <span>Chọn từ kho</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                                                <input type="radio" className="accent-primary w-4 h-4 cursor-pointer" checked={isCustomProduct} onChange={() => setIsCustomProduct(true)} />
                                                <span>Nhập tự do ngoài hệ thống</span>
                                            </label>
                                        </div>
                                        <div className="flex flex-wrap gap-3 items-end mb-4">
                                            <div className="flex-1 min-w-[250px]">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tên Sản Phẩm</label>
                                                {!isCustomProduct ? (
                                                    <SearchableSelect
                                                        options={products.map((p: any) => ({ value: p.id, label: `${p.sku} - ${p.name}` }))}
                                                        value={selectedProduct || ''}
                                                        onChange={handleProductSelect}
                                                        placeholder="-- Chọn Sản Phẩm --"
                                                    />
                                                ) : (
                                                    <input type="text" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700" placeholder="Nhập tên sản phẩm/dịch vụ..." value={customName} onChange={e => setCustomName(e.target.value)} />
                                                )}
                                            </div>
                                            {isCustomProduct && (
                                                <div className="w-24 shrink-0">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ĐVT</label>
                                                    <input type="text" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-center" placeholder="Đơn vị" value={customUnit} onChange={e => setCustomUnit(e.target.value)} />
                                                </div>
                                            )}
                                            <div className="w-28 shrink-0">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Đơn giá nhập</label>
                                                <input type="number" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700" value={price} onChange={e => setPrice(Number(e.target.value))} />
                                            </div>
                                            <div className="w-20 shrink-0">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Thuế %</label>
                                                {isCustomProduct ? (
                                                    <input type="number" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700" value={customTaxRate} onChange={e => setCustomTaxRate(Number(e.target.value))} />
                                                ) : (
                                                    <input type="text" className="w-full border border-gray-200 dark:border-gray-600 rounded-lg p-2.5 bg-slate-50 dark:bg-gray-800 text-center text-gray-500 dark:text-gray-400 font-medium cursor-not-allowed" value={`${products.find((p: any) => p.id === selectedProduct)?.taxRate || 0}`} disabled />
                                                )}
                                            </div>
                                            <div className="w-20 shrink-0">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">SL</label>
                                                <input type="number" min="1" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700" value={qty} onChange={e => setQty(Number(e.target.value))} />
                                            </div>
                                            <button type="button" onClick={handleAddItem} className="shrink-0 mb-[2px] h-[46px] px-6 border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 shadow-sm font-semibold rounded-lg dark:border-primary/50 dark:text-primary-light">Thêm</button>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ghi chú SP nhập <span className="text-gray-400 font-normal">(In trên PO)</span></label>
                                            <div className="flex flex-wrap items-center gap-4 mb-2">
                                                <label className={`flex items-center gap-2 cursor-pointer text-sm font-medium ${isCustomProduct ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    <input type="radio" className="accent-primary w-4 h-4 cursor-pointer" checked={useInventoryDescription && !isCustomProduct} onChange={() => handleDescSourceChange(true)} disabled={isCustomProduct} />
                                                    <span>Lấy mô tả từ kho</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    <input type="radio" className="accent-primary w-4 h-4 cursor-pointer" checked={!useInventoryDescription || isCustomProduct} onChange={() => handleDescSourceChange(false)} />
                                                    <span>Tự nhập ghi chú</span>
                                                </label>
                                            </div>
                                            <textarea rows={2} className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700`} placeholder="Ghi chú thêm thông số, tính năng cho sản phẩm này..." value={customDescription} onChange={e => setCustomDescription(e.target.value)}></textarea>
                                        </div>
                                    </div>

                                    {/* Read-Only Items Table */}
                                    {orderItems.length > 0 && (
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto mt-2 border-t pt-4">
                                            <table className="w-full min-w-[600px] text-sm mb-4 bg-white dark:bg-gray-800 text-left">
                                                <thead className="bg-slate-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                                                    <tr>
                                                        <th className="p-3 font-medium">Sản Phẩm Đặt</th>
                                                        <th className="p-3 font-medium text-center w-20">SL</th>
                                                        <th className="p-3 font-medium text-right w-32">Đ.Giá</th>
                                                        <th className="p-3 font-medium text-center w-20">Thuế</th>
                                                        <th className="p-3 font-medium text-right w-36">Thành Tiền</th>
                                                        <th className="p-3 font-medium text-center w-16"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {orderItems.map((item, i) => {
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
                                                                        <button type="button" onClick={() => handleEditItem(i)} className="text-blue-500 hover:text-blue-700 transition-colors" title="Sửa dòng này"><Edit2 size={14} /></button>
                                                                        <button type="button" onClick={() => handleRemoveItem(i)} className="text-red-500 hover:text-red-700 transition-colors" title="Xóa"><Trash2 size={14} /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                                                        <td colSpan={4} className="p-3 text-right font-medium text-gray-600 dark:text-gray-400 text-sm">Tổng tiền trước thuế:</td>
                                                        <td className="p-3 text-right font-medium text-gray-800 dark:text-gray-200 text-sm">{formatMoney(calculateSubTotal())}</td>
                                                        <td className="p-3 border"></td>
                                                    </tr>
                                                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                        <td colSpan={4} className="p-3 text-right font-medium text-gray-600 dark:text-gray-400 text-sm">Tổng tiền thuế:</td>
                                                        <td className="p-3 text-right font-medium text-gray-800 dark:text-gray-200 text-sm">{formatMoney(calculateTax())}</td>
                                                        <td className="p-3 border"></td>
                                                    </tr>
                                                    <tr className="bg-slate-100 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                                                        <td colSpan={4} className="p-3 text-right font-bold text-gray-800 dark:text-gray-200">Tổng Cộng:</td>
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
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                form="orderForm"
                                disabled={isSubmitting || orderItems.length === 0}
                                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium transition-colors"
                            >
                                {isSubmitting ? 'Đang lưu...' : 'Lưu Đơn Hàng'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
