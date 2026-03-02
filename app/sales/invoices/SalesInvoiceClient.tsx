'use client';

import { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Plus, Edit2, Trash2, Save, X, Printer, Search, Calendar, PackageCheck, Eye, Download, LinkIcon, CheckCircle2, FileSearch } from 'lucide-react';
import { submitSalesInvoice, approveSalesInvoice, deleteSalesInvoice, updateSalesInvoice } from './actions';
import { formatMoney } from '@/lib/utils/formatters';

export default function SalesInvoiceClient({ initialInvoices, customers, products, orders, nextCode }: any) {
    const [invoices, setInvoices] = useState(initialInvoices);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Derived states
    const confirmedOrders = orders.filter((o: any) => o.status === 'CONFIRMED' || o.status === 'COMPLETED');

    const [formData, setFormData] = useState<any>({
        code: nextCode,
        customerId: '',
        orderId: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        notes: '',
        status: 'DRAFT',
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
            dueDate: '',
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
            window.location.reload();
        } else {
            alert('Lỗi: ' + res.error);
        }
    };

    const handleSaveAndApprove = async () => {
        if (!formData.customerId || formData.items.length === 0) {
            alert('Vui lòng chọn khách hàng và ít nhất 1 sản phẩm');
            return;
        }

        if (!confirm('Hệ thống sẽ Lưu Hóa Đơn và Duyệt (Xuất Kho & Ghi Nhận Công Nợ) ngay lập tức. Tiếp tục?')) return;

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
                window.location.reload();
            } else {
                alert('Lưu Hóa Đơn thành công nhưng lỗi khi Xuất Kho: ' + approveRes.error);
            }
        } else {
            alert('Lỗi khi lưu Hóa Đơn: ' + res.error);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm(`Duyệt Hóa Đơn này? Hệ thống sẽ ghi nhận Công Nợ Khách Hàng và Tự Động Xuất Kho.`)) return;
        const res = await approveSalesInvoice(id, 'system');
        if (res.success) {
            setInvoices(invoices.map((inv: any) => inv.id === id ? res.data : inv));
            alert("Đã duyệt Hóa Đơn thành công!");
            window.location.reload();
        } else alert(res.error);
    };

    const handleDelete = async (id: string, status: string) => {
        if (status !== 'DRAFT') {
            alert("Chỉ có thể xóa Hóa đơn Nháp. Các Hóa đơn đã Ghi Nhận không thể xóa.");
            return;
        }
        if (!confirm('Xóa Hóa Đơn Nháp?')) return;
        const res = await deleteSalesInvoice(id);
        if (res.success) {
            setInvoices(invoices.filter((o: any) => o.id !== id));
        } else alert(res.error);
    };

    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Danh sách Hóa Đơn (Phải Thu)</h2>
                <Button onClick={() => isFormOpen ? setIsFormOpen(false) : handleOpenCreate()} className="flex items-center gap-2">
                    {isFormOpen ? <X size={16} /> : <Plus size={16} />}
                    {isFormOpen ? 'Hủy' : 'Tạo Hóa Đơn'}
                </Button>
            </div>

            {isFormOpen && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">{formData.id ? "Sửa Hóa Đơn Nháp" : "Thông tin chung"}</h3>
                    </div>
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
                            <select
                                className="w-full border rounded p-2"
                                value={formData.orderId}
                                onChange={e => handleOrderSelect(e.target.value)}
                            >
                                <option value="">-- Mua Trực Tiếp Không Qua Đơn --</option>
                                {confirmedOrders.map((o: any) => <option key={o.id} value={o.id}>{o.code} - {o.customer.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Khách Hàng (*)</label>
                            <select
                                className="w-full border rounded p-2"
                                value={formData.customerId}
                                onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                                disabled={!!formData.orderId}
                            >
                                <option value="">-- Chọn KH --</option>
                                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Hạn Thanh Toán</label>
                            <input
                                type="date" className="w-full border rounded p-2"
                                value={formData.dueDate}
                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </div>
                        <div className="col-span-4">
                            <label className="block text-sm text-gray-600 mb-1">Ghi chú Hóa Đơn</label>
                            <input
                                type="text" className="w-full border rounded p-2"
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <h3 className="font-medium mb-4 mt-6">Chi tiết Sản Phẩm Xuất Bán</h3>
                    <div className="flex gap-2 mb-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-600 mb-1">Thêm SP</label>
                            <select className="w-full border rounded p-2" value={selectedProduct} onChange={(e) => handleProductSelect(e.target.value)}>
                                <option value="">-- Chọn Sản Phẩm --</option>
                                {products.map((p: any) => <option key={p.id} value={p.id}>{p.sku} - {p.name} (Tồn: {p.inventories?.[0]?.quantity || 0})</option>)}
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

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
                        <Button onClick={handleSave} variant="secondary" className="flex items-center gap-2 border-gray-300">
                            <Save size={16} /> Lưu Nháp
                        </Button>
                        <Button onClick={handleSaveAndApprove} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white">
                            <CheckCircle2 size={16} /> Lưu & Xuất Kho Trừ Tồn
                        </Button>
                    </div>
                </div>
            )}

            <Table>
                <thead>
                    <tr>
                        <th className="text-left font-medium text-gray-500 pb-3">Mã HĐ</th>
                        <th className="text-left font-medium text-gray-500 pb-3">Ngày</th>
                        <th className="text-left font-medium text-gray-500 pb-3">Khách Hàng</th>
                        <th className="text-right font-medium text-gray-500 pb-3">Tổng Ghi Nhận</th>
                        <th className="text-right font-medium text-gray-500 pb-3">Đã Thu</th>
                        <th className="text-center font-medium text-gray-500 pb-3">Trạng Thái</th>
                        <th className="text-right font-medium text-gray-500 pb-3">Thao Tác</th>
                    </tr>
                </thead>
                <tbody>
                    {invoices.map((inv: any) => (
                        <tr key={inv.id} className="border-t border-gray-100">
                            <td className="py-3 items-center gap-2 flex">
                                <FileSearch size={16} className="text-amber-600" />
                                {inv.code} {inv.orderId && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded ml-1">Kế thừa</span>}
                            </td>
                            <td className="py-3">{new Date(inv.date).toLocaleDateString()}</td>
                            <td className="py-3">{inv.customer?.name}</td>
                            <td className="py-3 text-right font-medium">{formatMoney(inv.totalAmount)}</td>
                            <td className="py-3 text-right text-green-600">{formatMoney(inv.paidAmount)}</td>
                            <td className="py-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${inv.status === 'ISSUED' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                    inv.status === 'PARTIAL_PAID' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                        inv.status === 'PAID' ? 'bg-green-50 text-green-600 border-green-200' :
                                            'bg-gray-50 text-gray-600 border-gray-200'
                                    }`}>
                                    {inv.status === 'DRAFT' ? 'Nháp' :
                                        inv.status === 'ISSUED' ? 'Ghi Nhận Nợ / Xuất Kho' :
                                            inv.status === 'PARTIAL_PAID' ? 'Đã Thu Một Phần' :
                                                'Hoàn Tất Thu'}
                                </span>
                            </td>
                            <td className="py-3 text-right">
                                <div className="flex justify-end gap-2">
                                    {inv.status === 'DRAFT' && (
                                        <>
                                            <button onClick={() => handleEdit(inv)} title="Chỉnh sửa" className="hover:text-blue-600 transition-colors p-1 text-xs flex items-center gap-1 text-gray-500">
                                                <Edit2 size={16} />
                                            </button>
                                            <Button variant="secondary" onClick={() => handleApprove(inv.id)} className="text-amber-600 border-amber-600 px-2 py-1 text-xs" title="Ghi Nhận & Trừ Tồn Kho">Duyệt HĐ</Button>
                                            <Button variant="danger" onClick={() => handleDelete(inv.id, inv.status)} className="text-red-500 px-2 py-1"><Trash2 size={16} /></Button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {invoices.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-gray-500">Chưa có hóa đơn nào</td></tr>
                    )}
                </tbody>
            </Table>
        </Card>
    );
}
