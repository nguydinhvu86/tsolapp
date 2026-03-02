'use client';

import { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Plus, X, HandCoins } from 'lucide-react';
import { submitSalesPayment } from './actions';
import { formatMoney } from '@/lib/utils/formatters';
export default function SalesPaymentClient({ initialPayments, customers, invoices, nextCode }: any) {
    const [payments, setPayments] = useState(initialPayments);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [formData, setFormData] = useState<any>({
        code: nextCode,
        customerId: '',
        invoiceId: '', // Optional
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        paymentMethod: 'CASH',
        reference: '',
        notes: ''
    });

    const selectedCustomer = customers.find((c: any) => c.id === formData.customerId);
    const customerInvoices = invoices.filter((inv: any) => inv.customerId === formData.customerId && inv.status !== 'PAID');

    const handleSave = async () => {
        if (!formData.customerId || formData.amount <= 0) {
            alert('Vui lòng chọn khách hàng và nhập số tiền lớn hơn 0');
            return;
        }

        const res = await submitSalesPayment('system', formData);
        if (res.success) {
            window.location.reload();
        } else {
            alert('Lỗi: ' + res.error);
        }
    };

    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Quản Lý Thu Tiền Tự Do & Theo Hóa Đơn</h2>
                <Button onClick={() => setIsFormOpen(!isFormOpen)} className="flex items-center gap-2">
                    {isFormOpen ? <X size={16} /> : <Plus size={16} />}
                    {isFormOpen ? 'Hủy' : 'Tạo Phiếu Thu'}
                </Button>
            </div>

            {isFormOpen && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <h3 className="font-medium mb-4">Thông tin phiếu thu</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Mã Phiếu</label>
                            <input
                                type="text" className="w-full border rounded p-2 bg-gray-100"
                                value={formData.code}
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Khách Hàng (*)</label>
                            <select
                                className="w-full border rounded p-2"
                                value={formData.customerId}
                                onChange={e => setFormData({ ...formData, customerId: e.target.value, invoiceId: '' })}
                            >
                                <option value="">-- Chọn KH --</option>
                                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {selectedCustomer && (
                                <p className="text-xs text-red-600 mt-1">
                                    Tổng dư nợ hiện tại: {formatMoney(selectedCustomer.totalDebt)}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Thanh toán cho Hóa Đơn (Tùy Chọn)</label>
                            <select
                                className="w-full border rounded p-2"
                                value={formData.invoiceId}
                                onChange={e => {
                                    const invId = e.target.value;
                                    setFormData({ ...formData, invoiceId: invId });
                                    if (invId) {
                                        const targetInv = customerInvoices.find((i: any) => i.id === invId);
                                        if (targetInv) setFormData((prev: any) => ({ ...prev, invoiceId: invId, amount: targetInv.totalAmount - targetInv.paidAmount }));
                                    }
                                }}
                                disabled={!formData.customerId}
                            >
                                <option value="">-- Nộp tiền chung, trừ vào Dư Nợ Tổng --</option>
                                {customerInvoices.map((inv: any) => (
                                    <option key={inv.id} value={inv.id}>
                                        {inv.code} (Nợ Hóa Đơn: {formatMoney(inv.totalAmount - inv.paidAmount)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Ngày Thu</label>
                            <input
                                type="date" className="w-full border rounded p-2"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 font-bold text-green-700 mb-1">Số Tiền Thu Vào (*)</label>
                            <input
                                type="number" className="w-full border-2 border-green-500 rounded p-2 text-xl font-bold text-green-700"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                min={0}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Phương Thức</label>
                            <select
                                className="w-full border rounded p-2"
                                value={formData.paymentMethod}
                                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                            >
                                <option value="CASH">Tiền Mặt</option>
                                <option value="BANK_TRANSFER">Chuyển Khoản</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Mã Giao Dịch / Tham Chiếu</label>
                            <input
                                type="text" className="w-full border rounded p-2"
                                value={formData.reference || ''}
                                onChange={e => setFormData({ ...formData, reference: e.target.value })}
                                placeholder="Vd: FT21..."
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm text-gray-600 mb-1">Ghi chú phiếu thu</label>
                            <input
                                type="text" className="w-full border rounded p-2"
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} className="flex items-center gap-2">
                            <HandCoins size={16} /> Lưu Phiếu Thu Kế Toán
                        </Button>
                    </div>
                </div>
            )}

            <Table>
                <thead>
                    <tr>
                        <th className="text-left font-medium text-gray-500 pb-3">Mã PT</th>
                        <th className="text-left font-medium text-gray-500 pb-3">Ngày</th>
                        <th className="text-left font-medium text-gray-500 pb-3">Khách Hàng</th>
                        <th className="text-left font-medium text-gray-500 pb-3">Hình Thức</th>
                        <th className="text-right font-medium text-gray-500 pb-3">Đối trừ HĐ</th>
                        <th className="text-right font-medium text-gray-500 pb-3">Số Tiền (VNĐ)</th>
                    </tr>
                </thead>
                <tbody>
                    {payments.map((p: any) => (
                        <tr key={p.id} className="border-t border-gray-100">
                            <td className="py-3 items-center gap-2 flex">
                                <HandCoins size={16} className="text-green-600" />
                                {p.code}
                            </td>
                            <td className="py-3">{new Date(p.date).toLocaleDateString()}</td>
                            <td className="py-3">{p.customer?.name}</td>
                            <td className="py-3">
                                {p.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                                {p.reference && <span className="text-xs text-gray-500 ml-2">({p.reference})</span>}
                            </td>
                            <td className="py-3 text-right">
                                {p.allocations?.map((a: any) => (
                                    <span key={a.id} className="text-xs bg-blue-50 text-blue-600 px-1 rounded block">{a.invoice?.code} ({formatMoney(a.amount)})</span>
                                ))}
                            </td>
                            <td className="py-3 text-right font-bold text-green-700">+{formatMoney(p.amount)}</td>
                        </tr>
                    ))}
                    {payments.length === 0 && (
                        <tr><td colSpan={6} className="py-8 text-center text-gray-500">Chưa có phiếu thu nào</td></tr>
                    )}
                </tbody>
            </Table>
        </Card>
    );
}
