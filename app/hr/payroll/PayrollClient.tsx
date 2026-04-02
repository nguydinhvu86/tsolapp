'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Search, Play, CheckCircle, FileEdit, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generatePayroll, updatePayrollRecord } from './actions';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';

export default function PayrollClient({ initialData, currentMonth, currentYear }: any) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [editForm, setEditForm] = useState({ bonus: 0, deductions: 0 });

    const handleGenerate = async () => {
        if (!confirm(`Bạn có chắc muốn Tính toàn bộ lương tháng ${currentMonth}/${currentYear}? Thao tác này sẽ ghi đè Lương Cơ Bản và Phạt Đi Muộn hiện tại.`)) return;
        setLoading(true);
        const res = await generatePayroll(currentMonth, currentYear);
        setLoading(false);
        if (res.success) {
            alert('Tạo bảng lương thành công!');
        } else {
            alert('Lỗi: ' + res.error);
        }
    };

    const handleUpdateRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await updatePayrollRecord(editingRecord.id, editForm);
        setLoading(false);
        if (res.success) {
            setEditingRecord(null);
        } else {
            alert('Lỗi: ' + res.error);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('Duyệt bảng lương này? Không thể sửa đổi Thưởng/Phạt sau khi duyệt.')) return;
        setLoading(true);
        await updatePayrollRecord(id, { bonus: 0, deductions: 0, status: 'APPROVED' } as any); // hack bypass for status only
        setLoading(false);
    };

    const filtered = initialData.filter((r: any) => r.user.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <form className="flex gap-2">
                        <select name="month" defaultValue={currentMonth} className="border p-2 rounded">
                            {Array.from({length: 12}, (_, i) => i+1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
                        </select>
                        <select name="year" defaultValue={currentYear} className="border p-2 rounded">
                            {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <Button type="submit" className="bg-slate-100 text-slate-800 hover:bg-slate-200">Xem</Button>
                    </form>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                            placeholder="Tìm nhân viên..."
                            className="pl-9 pr-4 py-2 border rounded text-sm w-64 focus:outline-none focus:border-emerald-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2">
                        <Play size={16}/> Chạy Bảng Lương
                    </Button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                        <tr>
                            <th className="p-4 border-b">Hồ sơ Nhân sự</th>
                            <th className="p-4 border-b text-right">Lương Cơ bản</th>
                            <th className="p-4 border-b text-center">Công chuẩn</th>
                            <th className="p-4 border-b text-right">Thưởng / Phạt</th>
                            <th className="p-4 border-b text-right">Thực Lĩnh</th>
                            <th className="p-4 border-b text-center">Trạng thái</th>
                            <th className="p-4 border-b text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filtered.map((row: any) => (
                            <tr key={row.id} className="border-b hover:bg-slate-50">
                                <td className="p-4 font-medium text-slate-800">
                                    {row.user.name}
                                    <div className="text-xs text-slate-500 font-normal">{row.user.employeeProfile?.department || 'Chưa phân ban'}</div>
                                </td>
                                <td className="p-4 text-right">{formatCurrency(row.baseSalary)}</td>
                                <td className="p-4 text-center">
                                    <span className="font-bold text-emerald-600">{row.workDays}</span> <span className="text-xs text-slate-400">/26</span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="text-emerald-600">+ {formatCurrency(row.bonus)}</div>
                                    <div className="text-rose-600">- {formatCurrency(row.latePenalties + row.deductions)}</div>
                                </td>
                                <td className="p-4 text-right font-bold text-lg text-emerald-700">
                                    {formatCurrency(row.netSalary)}
                                </td>
                                <td className="p-4 text-center">
                                    {row.status === 'DRAFT' && <span className="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded text-xs"> Bản Nháp</span>}
                                    {row.status === 'APPROVED' && <span className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-xs flex items-center gap-1 justify-center"><CheckCircle size={12}/> Đã chốt</span>}
                                    {row.status === 'PAID' && <span className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs"> Đã chuyển khoản</span>}
                                </td>
                                <td className="p-4 text-center">
                                    {row.status === 'DRAFT' ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => { setEditingRecord(row); setEditForm({ bonus: row.bonus, deductions: row.deductions }); }} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-100 rounded" title="Chỉnh sửa Thưởng Phạt">
                                                <FileEdit size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {initialData.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-10 text-center text-slate-500">
                                    Chưa có bảng lương nào được tạo cho tháng này. Hãy bấm "Chạy Bảng Lương".
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>

            <Modal isOpen={!!editingRecord} onClose={() => setEditingRecord(null)} title="Điều chỉnh Thưởng / Phạt">
                <form onSubmit={handleUpdateRecord} className="p-4 space-y-4">
                    <Input 
                        label="Tiền Thưởng (Bonus)" 
                        type="number" 
                        value={editForm.bonus} 
                        onChange={e => setEditForm({...editForm, bonus: parseInt(e.target.value)||0})} 
                    />
                    <Input 
                        label="Khấu trừ / Phạt thêm" 
                        type="number" 
                        value={editForm.deductions} 
                        onChange={e => setEditForm({...editForm, deductions: parseInt(e.target.value)||0})} 
                    />
                    <p className="text-xs text-slate-500 italic">Ghi chú: Lương thực lĩnh sẽ được tính toán lại sau khi cập nhật.</p>
                    <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" onClick={() => setEditingRecord(null)} className="bg-slate-200 text-slate-800">Hủy</Button>
                        <Button type="submit" disabled={loading}>Cập nhật Phiếu Lương</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
