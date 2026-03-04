'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Plus, Edit2, Trash2, Save, X, Printer, Search, Calendar, PackageCheck, Eye, Download, LinkIcon, CheckCircle2, FileSearch, LayoutList, FileText, ChevronUp, ChevronDown, Undo2, XCircle, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { submitSalesInvoice, approveSalesInvoice, deleteSalesInvoice, updateSalesInvoice, cancelSalesInvoice, updateSalesInvoiceStatus, restoreSalesInvoice } from './actions';
import { formatMoney } from '@/lib/utils/formatters';
import { TagDisplay } from '@/app/components/ui/TagDisplay';

export default function SalesInvoiceClient({ initialInvoices, customers, products, orders, nextCode, initialAction, initialCustomerId }: any) {
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

    // Derived states
    const confirmedOrders = orders.filter((o: any) => o.status === 'CONFIRMED' || o.status === 'COMPLETED');

    const [formData, setFormData] = useState<any>({
        code: nextCode,
        customerId: initialCustomerId || '',
        orderId: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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

    const handleOpenCreate = () => {
        setFormData({
            code: nextCode,
            customerId: '',
            orderId: '',
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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

    const handleEdit = (inv: any) => {
        const mappedItems = inv.items ? inv.items.map((i: any) => ({
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
            id: inv.id,
            code: inv.code || '',
            customerId: inv.customerId || '',
            orderId: inv.orderId || '',
            date: inv.date ? new Date(inv.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
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
            productName: i.product.name,
            unit: i.product.unit,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate,
            taxAmount: i.taxAmount || 0,
            totalPrice: i.totalPrice
        }));

        setFormData({
            ...formData,
            orderId: order.id,
            customerId: order.customerId,
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
            res = await updateSalesInvoice(formData.id, formData);
        } else {
            res = await submitSalesInvoice('system', formData);
        }

        if (res.success) {
            window.location.href = window.location.pathname;
        } else {
            alert('Lỗi: ' + res.error);
        }
    };

    const handleSaveAndApprove = async () => {
        if (!formData.customerId || formData.items.length === 0) {
            alert('Vui lòng chọn khách hàng và ít nhất 1 sản phẩm');
            return;
        }

        setActionModal({
            isOpen: true,
            title: 'Lưu & Duyệt Hóa Đơn',
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Save size={24} /></div>,
            message: (
                <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Xác nhận Lưu & Duyệt</h4>
                    <p style={{ color: '#4b5563', marginBottom: '1rem' }}>Hệ thống sẽ <strong>Lưu Hóa Đơn</strong> và tiến hành <strong>Duyệt (Xuất Kho & Ghi Nhận Công Nợ)</strong> ngay lập tức. Các thao tác tiếp theo sẽ tự động được kích hoạt.</p>
                </div>
            ),
            confirmLabel: 'Lưu & Duyệt Ngay',
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
                        alert('Đã Lưu Hóa Đơn và Xuất Kho thành công!');
                        window.location.href = window.location.pathname;
                    } else {
                        alert('Lưu Hóa Đơn thành công nhưng lỗi khi Xuất Kho: ' + approveRes.error);
                    }
                } else {
                    alert('Lỗi khi lưu Hóa Đơn: ' + res.error);
                }
            }
        });
    };

    const handleApprove = async (id: string) => {
        setActionModal({
            isOpen: true,
            title: 'Duyệt Hóa Đơn',
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={24} /></div>,
            message: (
                <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Bạn đã kiểm tra kỹ hóa đơn?</h4>
                    <p style={{ color: '#4b5563', marginBottom: '1rem' }}>Sau khi duyệt, hệ thống sẽ thực hiện các tác vụ tự động sau đây:</p>
                    <ul style={{ listStyle: 'none', padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                            <span style={{ color: '#10b981', background: '#d1fae5', padding: '0.25rem', borderRadius: '50%', marginTop: '0.125rem', display: 'flex' }}><CheckCircle2 size={16} /></span>
                            <span><strong>Ghi nhận công nợ</strong> đối với khách hàng này vào hệ thống kế toán.</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                            <span style={{ color: '#10b981', background: '#d1fae5', padding: '0.25rem', borderRadius: '50%', marginTop: '0.125rem', display: 'flex' }}><PackageCheck size={16} /></span>
                            <span><strong>Tự động xuất kho</strong> trừ tồn các sản phẩm có trong hóa đơn.</span>
                        </li>
                    </ul>
                </div>
            ),
            confirmLabel: 'Đồng Ý Duyệt',
            confirmVariant: 'success',
            action: async () => {
                const res = await approveSalesInvoice(id, 'system');
                if (res.success) {
                    setInvoices(invoices.map((inv: any) => inv.id === id ? res.data : inv));
                    alert("Đã duyệt Hóa Đơn thành công!");
                    window.location.href = window.location.pathname;
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
            title: 'Chuyển trạng thái',
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Info size={24} /></div>,
            message: <p style={{ color: '#374151', fontSize: '0.9375rem' }}>Bạn có chắc chắn muốn chuyển trạng thái hóa đơn sang <strong>{newStatus}</strong>?</p>,
            confirmLabel: 'Chuyển Đổi',
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
            title: 'Hủy Hóa Đơn',
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={24} /></div>,
            message: (
                <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Hủy Hóa Đơn Này?</h4>
                    <p style={{ color: '#4b5563', marginBottom: '1rem' }}>Các chứng từ xuất kho và công nợ liên quan sẽ được <strong>tự động hoàn tác</strong>. Mọi tác vụ về sau sẽ không thể phục hồi.</p>
                </div>
            ),
            confirmLabel: 'Xác Nhận Hủy',
            confirmVariant: 'danger',
            action: async () => {
                const res = await cancelSalesInvoice(id);
                if (res.success) {
                    alert('Hủy Hóa Đơn và hoàn tác dữ liệu thành công!');
                    setInvoices(invoices.map((inv: any) => inv.id === id ? { ...inv, status: 'CANCELLED' } : inv));
                } else alert(res.error);
            }
        });
    };

    const handleRestore = async (id: string) => {
        setActionModal({
            isOpen: true,
            title: 'Khôi phục Hóa Đơn',
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Undo2 size={24} /></div>,
            message: (
                <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Khôi phục lại chứng từ?</h4>
                    <p style={{ color: '#4b5563', lineHeight: 1.6 }}>Việc khôi phục sẽ tiến hành <strong>ghi nhận lại công nợ</strong> và <strong>xuất lại kho</strong> đối với hóa đơn này.</p>
                </div>
            ),
            confirmLabel: 'Đồng Ý Khôi Phục',
            confirmVariant: 'success',
            action: async () => {
                const res = await restoreSalesInvoice(id);
                if (res.success) {
                    alert('Đã khôi phục hóa đơn thành công!');
                    window.location.href = window.location.pathname;
                } else {
                    alert('Lỗi: ' + res.error);
                }
            }
        });
    };

    const handleDelete = async (id: string, status: string) => {
        if (status !== 'DRAFT') {
            alert("Chỉ có thể xóa Hóa đơn Nháp. Các Hóa đơn đã Ghi Nhận không thể xóa.");
            return;
        }
        setActionModal({
            isOpen: true,
            title: 'Xóa Hóa Đơn Nháp',
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={24} /></div>,
            message: <p style={{ color: '#374151', fontSize: '0.9375rem' }}>Hóa đơn này sẽ bị <strong>xóa hoàn toàn khỏi hệ thống</strong> và không thể phục hồi. Bạn có chắc chắn muốn xóa?</p>,
            confirmLabel: 'Xóa Vĩnh Viễn',
            confirmVariant: 'danger',
            action: async () => {
                const res = await deleteSalesInvoice(id);
                if (res.success) {
                    setInvoices(invoices.filter((o: any) => o.id !== id));
                } else alert(res.error);
            }
        });
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
        return {
            ALL: {
                count: baseFilteredInvoices.length,
                amount: baseFilteredInvoices.reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0)
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
            }
        };
    }, [baseFilteredInvoices]);

    const statsCards = [
        { id: 'ALL', label: 'Tất Cả', count: stats.ALL.count, amount: stats.ALL.amount, colorClass: 'stat-card-purple', icon: LayoutList },
        { id: 'DRAFT', label: 'Nháp', count: stats.DRAFT.count, amount: stats.DRAFT.amount, colorClass: 'stat-card-amber', icon: FileText },
        { id: 'ISSUED', label: 'Ghi Nhận Nợ / Xuất Kho', count: stats.ISSUED.count, amount: stats.ISSUED.amount, colorClass: 'stat-card-blue', icon: PackageCheck },
        { id: 'PARTIAL_PAID', label: 'Đã Thu Một Phần', count: stats.PARTIAL_PAID.count, amount: stats.PARTIAL_PAID.amount, colorClass: 'stat-card-green', icon: CheckCircle2 },
        { id: 'PAID', label: 'Hoàn Tất Thu', count: stats.PAID.count, amount: stats.PAID.amount, colorClass: 'stat-card-green', icon: CheckCircle2 },
        { id: 'CANCELLED', label: 'Đã Hủy', count: stats.CANCELLED.count, amount: stats.CANCELLED.amount, colorClass: 'stat-card-red', icon: X },
    ];

    const filteredInvoices = useMemo(() => {
        let result = baseFilteredInvoices;

        if (statusFilter !== 'ALL') {
            result = result.filter((i: any) => i.status === statusFilter);
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
    }, [baseFilteredInvoices, statusFilter, sortBy]);

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
        <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Danh sách Hóa Đơn (Phải Thu)</h2>
                <Button onClick={() => isFormOpen ? setIsFormOpen(false) : handleOpenCreate()} className="flex items-center gap-2">
                    {isFormOpen ? <X size={16} /> : <Plus size={16} />}
                    {isFormOpen ? 'Hủy' : 'Tạo Hóa Đơn'}
                </Button>
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
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo Mã HĐ, Tên khách hàng..."
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
                        <option value="code_asc">Mã HĐ (A-Z)</option>
                        <option value="code_desc">Mã HĐ (Z-A)</option>
                    </select>
                </div>
            </div>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? "Sửa Hóa Đơn Nháp" : "Tạo Hóa Đơn Mới"} maxWidth="1000px">
                <div className="p-4">
                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Mã HĐ</label>
                            <input
                                type="text" className="w-full border rounded p-2 bg-gray-100"
                                value={formData.code}
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Kế thừa từ Đơn Hàng (SO)</label>
                            <SearchableSelect
                                options={[{ value: '', label: '-- Mua Trực Tiếp Không Qua Đơn --' }, ...confirmedOrders.map((o: any) => ({ value: o.id, label: `${o.code} - ${o.customer?.name || 'KH'}` }))]}
                                value={formData.orderId || ''}
                                onChange={handleOrderSelect}
                                placeholder="-- Mua Trực Tiếp Không Qua Đơn --"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Khách Hàng (*)</label>
                            <SearchableSelect
                                options={customers.map((c: any) => ({ value: c.id, label: c.name }))}
                                value={formData.customerId || ''}
                                onChange={val => setFormData({ ...formData, customerId: val })}
                                placeholder="-- Chọn KH --"
                                disabled={!!formData.orderId}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Hạn Thanh Toán</label>
                            <input
                                type="date" className="w-full border rounded p-2"
                                value={formData.dueDate}
                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </div>
                        <div className="col-span-4 grid grid-cols-2 gap-x-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Ghi chú Hóa Đơn</label>
                                <input
                                    type="text" className="w-full border rounded p-2"
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Thẻ Quản Lý (Tags)</label>
                                <input
                                    type="text" className="w-full border rounded p-2"
                                    value={formData.tags || ''}
                                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                    placeholder="VD: VIP, Đại lý, Bán buôn..."
                                />
                            </div>
                        </div>
                    </div>

                    <h3 className="font-medium mb-4 mt-6">Chi tiết Sản Phẩm Xuất Bán</h3>
                    <div className="flex gap-2 mb-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-600 mb-1">Thêm SP</label>
                            <SearchableSelect
                                options={products.map((p: any) => ({ value: p.id, label: `${p.sku} - ${p.name} (Tồn: ${p.inventories?.[0]?.quantity || 0})` }))}
                                value={selectedProduct || ''}
                                onChange={handleProductSelect}
                                placeholder="-- Chọn Sản Phẩm --"
                            />
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

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
                        <Button onClick={handleSave} variant="secondary" className="flex items-center gap-2 border-gray-300">
                            <Save size={16} /> Lưu Nháp
                        </Button>
                        <Button onClick={handleSaveAndApprove} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white">
                            <CheckCircle2 size={16} /> Lưu & Xuất Kho Trừ Tồn
                        </Button>
                    </div>
                </div>
            </Modal>

            <Table>
                <thead>
                    <tr>
                        <th className="text-left font-medium text-gray-500 pb-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('code')}>
                            <div className="flex items-center gap-1">
                                Mã HĐ {sortBy === 'code_asc' ? <ChevronUp size={14} /> : sortBy === 'code_desc' ? <ChevronDown size={14} /> : <div className="w-[14px]"></div>}
                            </div>
                        </th>
                        <th className="text-left font-medium text-gray-500 pb-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('date')}>
                            <div className="flex items-center gap-1">
                                Ngày {sortBy === 'date_asc' ? <ChevronUp size={14} /> : sortBy === 'date_desc' ? <ChevronDown size={14} /> : <div className="w-[14px]"></div>}
                            </div>
                        </th>
                        <th className="text-left font-medium text-gray-500 pb-3">Khách Hàng</th>
                        <th className="text-left font-medium text-gray-500 pb-3">Thẻ Quản Lý</th>
                        <th className="text-right font-medium text-gray-500 pb-3 cursor-pointer hover:text-primary transition-colors select-none" onClick={() => handleSort('amount')}>
                            <div className="flex items-center justify-end gap-1">
                                Tổng Tiền {sortBy === 'amount_asc' ? <ChevronUp size={14} /> : sortBy === 'amount_desc' ? <ChevronDown size={14} /> : <div className="w-[14px]"></div>}
                            </div>
                        </th>
                        <th className="text-right font-medium text-gray-500 pb-3">Đã Thu</th>
                        <th className="text-center font-medium text-gray-500 pb-3">Trạng Thái</th>
                        <th className="text-right font-medium text-gray-500 pb-3">Thao Tác</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredInvoices.map((inv: any) => (
                        <tr key={inv.id} className="border-t border-gray-100">
                            <td className="py-3 items-center gap-2 flex">
                                <FileText size={16} className="text-primary/70" />
                                <Link href={`/sales/invoices/${inv.id}`} className="font-semibold text-gray-800 hover:text-primary hover:underline transition-colors block">
                                    {inv.code}
                                </Link>
                                {inv.orderId && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded ml-1">Kế thừa</span>}
                            </td>
                            <td className="py-3 text-gray-600" suppressHydrationWarning>{new Date(inv.date).toLocaleDateString()}</td>
                            <td className="py-3">
                                {inv.customerId ? (
                                    <Link href={`/customers/${inv.customerId}`} className="font-medium text-gray-800 hover:text-primary hover:underline transition-colors block">
                                        {inv.customer?.name}
                                    </Link>
                                ) : (
                                    inv.customer?.name
                                )}
                            </td>
                            <td className="py-3">
                                <TagDisplay tagsString={inv.tags} />
                            </td>
                            <td className="py-3 text-right font-bold text-gray-800">{formatMoney(inv.totalAmount)}</td>
                            <td className="py-3 text-right text-green-600 font-medium">{formatMoney(inv.paidAmount)}</td>
                            <td className="py-3 text-center">
                                <select
                                    className={`status-badge status-select appearance-none ${inv.status === 'ISSUED' ? 'badge-info' :
                                        inv.status === 'PARTIAL_PAID' ? 'badge-warning' :
                                            inv.status === 'PAID' ? 'badge-success' :
                                                inv.status === 'CANCELLED' ? 'badge-danger' :
                                                    'badge-neutral'
                                        }`}
                                    value={inv.status}
                                    onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                                    title={inv.status === 'CANCELLED' ? "Hóa đơn đã phân hủy" : "Nhấn để đổi trạng thái"}
                                    disabled={inv.status === 'CANCELLED'}
                                >
                                    <option value="DRAFT" className="bg-white text-gray-900">Bản Nháp</option>
                                    <option value="ISSUED" className="bg-white text-gray-900">Ghi Nhận Nợ / Xuất Kho</option>
                                    <option value="PARTIAL_PAID" className="bg-white text-gray-900">Đã Thu Một Phần</option>
                                    <option value="PAID" className="bg-white text-gray-900">Hoàn Tất Thu</option>
                                    {inv.status === 'CANCELLED' && <option value="CANCELLED" className="bg-white text-gray-900">Đã Hủy</option>}
                                </select>
                            </td>
                            <td className="py-3 text-right">
                                <div className="flex justify-end gap-2 items-center">
                                    <Link href={`/sales/invoices/${inv.id}`} title="Xem chi tiết" className="hover:text-primary transition-colors p-1 text-xs flex items-center gap-1 text-gray-500">
                                        <Eye size={16} />
                                    </Link>
                                    <Link href={`/print/sales/invoice/${inv.id}`} target="_blank" title="In ấn" className="hover:text-purple-600 transition-colors p-1 text-xs flex items-center gap-1 text-gray-500">
                                        <Printer size={16} />
                                    </Link>
                                    {inv.status === 'DRAFT' && (
                                        <>
                                            <button onClick={() => handleEdit(inv)} title="Chỉnh sửa" className="hover:text-blue-600 transition-colors p-1 text-xs flex items-center gap-1 text-gray-500">
                                                <Edit2 size={16} />
                                            </button>
                                            <Button variant="secondary" onClick={() => handleApprove(inv.id)} className="text-amber-600 border-amber-600 px-2 py-1 text-xs flex items-center gap-1" title="Duyệt để Ghi nhận Nợ & Xuất Kho">
                                                <CheckCircle2 size={14} /> Duyệt
                                            </Button>
                                            <button onClick={() => handleDelete(inv.id, inv.status)} title="Xóa" className="text-red-500 hover:text-red-700 transition-colors p-1 text-xs">
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                    {inv.status !== 'CANCELLED' && (
                                        <button onClick={() => handleCancel(inv.id)} title="Hủy Hóa Đơn" className="text-orange-500 hover:text-orange-700 transition-colors p-1 text-xs flex items-center gap-1">
                                            <XCircle size={16} />
                                        </button>
                                    )}
                                    {inv.status === 'CANCELLED' && (
                                        <button onClick={() => handleRestore(inv.id)} title="Khôi Phục" className="text-green-600 hover:text-green-800 transition-colors p-1 text-xs flex items-center gap-1">
                                            <Undo2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredInvoices.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-gray-500">Chưa có hóa đơn nào phù hợp với bộ lọc</td></tr>
                    )}
                </tbody>
            </Table>

            {/* Generic Action Modal */}
            <Modal isOpen={!!actionModal?.isOpen} onClose={() => !isActioning && setActionModal(null)} title={actionModal?.title || 'Xác nhận'}>
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
                            {actionModal?.cancelLabel || 'Hủy Bỏ'}
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
                                    Đang xử lý...
                                </span>
                            ) : (actionModal?.confirmLabel || 'Xác Nhận')}
                        </button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
}
