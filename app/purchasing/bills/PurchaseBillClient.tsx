'use client';

import React, { useState } from 'react';
import { Plus, Search, Eye, Trash2, Calendar, FileText, FileDown, CheckCircle, ArrowUpDown, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createPurchaseBill, approvePurchaseBill, deletePurchaseBill, updatePurchaseBill } from '@/app/purchasing/actions';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';

export function PurchaseBillClient({ initialBills, suppliers, orders, warehouses, products }: { initialBills: any[], suppliers: any[], orders: any[], warehouses: any[], products: any[] }) {
    const [bills, setBills] = useState(initialBills);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

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
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        notes: '',
        tags: '',
        attachments: [] as { url: string, name: string, uploadedAt: string }[]
    });
    const [billItems, setBillItems] = useState<Array<{ productId: string, quantity: number, unitPrice: number, taxRate: number }>>([]);
    const [approveWarehouseId, setApproveWarehouseId] = useState('');
    const [isUploading, setIsUploading] = useState(false);

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
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0
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
            supplierInvoice: '',
            date: new Date().toISOString().substring(0, 10),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
            notes: '',
            tags: '',
            attachments: [],
            id: undefined
        } as any);
        setBillItems([]);
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
            supplierInvoice: bill.supplierInvoice || '',
            date: bill.date ? new Date(bill.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
            dueDate: bill.dueDate ? new Date(bill.dueDate).toISOString().substring(0, 10) : '',
            notes: bill.notes || '',
            tags: bill.tags || '',
            attachments: parsedAttachments
        } as any);

        setBillItems(bill.items?.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0
        })) || []);

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
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0
                    }));
                    setBillItems(mappedItems);
                }
            }
        }
    };

    const handleAddItem = () => {
        setBillItems([...billItems, { productId: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setBillItems(billItems.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...billItems];
        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            newItems[index] = { ...newItems[index], [field]: value, unitPrice: product?.importPrice || 0, taxRate: product?.taxRate || 0 };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setBillItems(newItems);
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
                    <div className="card-title text-xs font-bold uppercase tracking-wider mb-2">Tất cả</div>
                    <div className="card-value text-3xl font-black">{stats.total}</div>
                    <div className="card-desc text-sm mt-1 font-medium">Hóa đơn</div>
                </div>

                <div
                    onClick={() => setStatusFilter('DRAFT')}
                    className={`status-card status-card-draft ${statusFilter === 'DRAFT' ? 'active' : ''}`}
                >
                    <div className="card-title text-xs font-bold uppercase tracking-wider mb-2">Lưu nháp</div>
                    <div className="card-value text-3xl font-black">{stats.draft.count}</div>
                    <div className="card-desc text-sm mt-1 font-medium">Chờ duyệt</div>
                </div>

                <div
                    onClick={() => setStatusFilter('APPROVED')}
                    className={`status-card status-card-approved ${statusFilter === 'APPROVED' ? 'active' : ''}`}
                >
                    <div className="card-title text-xs font-bold uppercase tracking-wider mb-2">Đã duyệt (Nợ)</div>
                    <div className="card-value text-3xl font-black">{stats.approved.count}</div>
                    <div className="card-desc text-sm font-bold mt-1">{formatMoney(stats.approved.amount)}</div>
                </div>

                <div
                    onClick={() => setStatusFilter('PARTIAL_PAID')}
                    className={`status-card status-card-partial ${statusFilter === 'PARTIAL_PAID' ? 'active' : ''}`}
                >
                    <div className="card-title text-xs font-bold uppercase tracking-wider mb-2">Đã TT 1 phần</div>
                    <div className="card-value text-3xl font-black">{stats.partial.count}</div>
                    <div className="card-desc text-sm font-bold mt-1">Nợ: {formatMoney(stats.partial.amount)}</div>
                </div>

                <div
                    onClick={() => setStatusFilter('PAID')}
                    className={`status-card status-card-paid ${statusFilter === 'PAID' ? 'active' : ''}`}
                >
                    <div className="card-title text-xs font-bold uppercase tracking-wider mb-2">Đã thanh toán</div>
                    <div className="card-value text-3xl font-black">{stats.paid.count}</div>
                    <div className="card-desc text-sm font-bold mt-1">Hoàn thành</div>
                </div>
            </div>

            <div className="card search-card mb-6">
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
                            <th className="text-left font-medium text-gray-900 dark:text-gray-100">
                                Thẻ Quản Lý
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
                                    <td className="p-4">
                                        {bill.tags && bill.tags.split(',').map((t: string, i: number) => {
                                            const trimmed = t.trim();
                                            if (!trimmed) return null;
                                            return <span key={i} className="inline-block bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-xs px-2 py-1 rounded-md mr-1 mb-1 border border-slate-200 dark:border-slate-700">{trimmed}</span>
                                        })}
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
                                                        onClick={() => handleEdit(bill)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded inline-block"
                                                        title="Sửa"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
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
                                <FileDown className="text-primary" /> {(formData as any).id ? "Sửa Hóa Đơn Mua" : "Nhập Hóa Đơn Mua"}
                            </h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                            <form id="billForm" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="sm:col-span-2 lg:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nhà Cung Cấp *</label>
                                        <SearchableSelect
                                            value={formData.supplierId}
                                            onChange={(val) => setFormData({ ...formData, supplierId: val })}
                                            options={supplierFormOptions}
                                            placeholder="-- Chọn --"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kế thừa PO (Tùy chọn)</label>
                                        <SearchableSelect
                                            value={formData.orderId || ''}
                                            onChange={handleOrderSelect}
                                            options={[{ value: '', label: '-- Mua Trực Tiếp --' }, ...orders.filter((o: any) => o.status !== 'DRAFT').map((o: any) => ({ value: o.id, label: `${o.code} - ${o.supplier?.name}` }))]}
                                            placeholder="-- Từ PO --"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngày Lập HĐ</label>
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
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hạn TT (Công Nợ)</label>
                                        <input type="date" required value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số HĐ (Của NCC)</label>
                                        <input type="text" value={formData.supplierInvoice} onChange={e => setFormData({ ...formData, supplierInvoice: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" placeholder="VD: HD-1234" />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ghi chú</label>
                                        <input type="text" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" placeholder="Ghi chú thêm..." />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Thẻ Quản Lý (Tags)</label>
                                        <input type="text" value={formData.tags || ''} onChange={e => setFormData({ ...formData, tags: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" placeholder="VD: Nhập khẩu, Quan trọng..." />
                                    </div>
                                </div>

                                {/* Attachments Section */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                        <FileText size={16} className="text-gray-500" /> Tài Liệu Đính Kèm
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
                                                        title="Xóa tệp"
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
                                                    alert(err.message || 'Lỗi tải tệp tin');
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
                                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> Đang tải lên...
                                                </span>
                                            ) : (
                                                <><Plus size={16} /> Thêm tài liệu (PDF, Ảnh, Docx...)</>
                                            )}
                                        </button>
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
                                                    <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm w-24">Thuế (%)</th>
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
                                                        <td className="p-2"><input type="number" required min="0" max="100" value={item.taxRate} onChange={(e) => handleItemChange(index, 'taxRate', Number(e.target.value))} className="w-full rounded bg-white dark:bg-gray-700 border p-2 text-sm text-center" /></td>
                                                        <td className="p-2 text-right font-medium">{formatMoney(item.quantity * item.unitPrice * (1 + (item.taxRate || 0) / 100))}</td>
                                                        <td className="p-2 text-center"><button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 p-1"><Trash2 size={16} /></button></td>
                                                    </tr>
                                                ))}
                                                {billItems.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-500">Chưa có sản phẩm.</td></tr>}
                                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                    <td colSpan={4} className="p-3 text-right text-sm text-gray-600 dark:text-gray-400">Tổng tiền trước thuế:</td>
                                                    <td className="p-3 text-right font-medium text-gray-700 dark:text-gray-300">{formatMoney(calculateSubTotal())}</td>
                                                    <td></td>
                                                </tr>
                                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                                    <td colSpan={4} className="p-3 text-right text-sm text-gray-600 dark:text-gray-400">Tổng tiền Thuế:</td>
                                                    <td className="p-3 text-right font-medium text-gray-700 dark:text-gray-300">{formatMoney(calculateTax())}</td>
                                                    <td></td>
                                                </tr>
                                                <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                                                    <td colSpan={4} className="p-3 text-right font-semibold text-gray-800 dark:text-gray-200">Tổng Thanh Toán:</td>
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
