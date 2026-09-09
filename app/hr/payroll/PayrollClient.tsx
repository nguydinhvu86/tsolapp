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
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-50"></span>
                        Quản Lý Lương (Payroll)
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Kỳ tính lương: Tháng {currentMonth} / {currentYear} ({filtered.length} phiếu lương)
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <form className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <select name="month" defaultValue={currentMonth} className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer px-2 py-1">
                            {Array.from({length: 12}, (_, i) => i+1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
                        </select>
                        <div className="w-[1px] h-4 bg-slate-300"></div>
                        <select name="year" defaultValue={currentYear} className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer px-2 py-1">
                            {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <Button type="submit" className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300">Xem</Button>
                    </form>

                    <Button onClick={handleGenerate} disabled={loading} className="px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-200 transition-all">
                        <Play size={14}/> Chạy Bảng Lương
                    </Button>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                    <div className="relative flex-1 min-w-[240px] max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            placeholder="Tìm kiếm nhân viên..."
                            className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Hồ sơ Nhân sự</th>
                                <th className="px-4 py-3 text-right">Lương Cơ bản</th>
                                <th className="px-4 py-3 text-center">Công chuẩn</th>
                                <th className="px-4 py-3 text-right">Thưởng / Phạt</th>
                                <th className="px-4 py-3 text-right">Thực Lĩnh</th>
                                <th className="px-4 py-3 text-center">Trạng thái</th>
                                <th className="px-4 py-3 text-center w-[80px]">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filtered.map((row: any) => (
                                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-slate-900">
                                        <div className="font-bold text-slate-900">{row.user.name}</div>
                                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">{row.user.employeeProfile?.department || 'Chưa phân ban'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-700">{formatCurrency(row.baseSalary)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="font-bold text-emerald-600 font-mono text-sm">{row.workDays}</span> <span className="text-[10px] text-slate-400 font-semibold">/26</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-xs">
                                        <div className="text-emerald-600 font-semibold">+ {formatCurrency(row.bonus)}</div>
                                        <div className="text-rose-600 font-semibold">- {formatCurrency(row.latePenalties + row.deductions)}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-sm font-mono text-emerald-700">
                                        {formatCurrency(row.netSalary)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {row.status === 'DRAFT' && <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[11px] font-semibold">Bản Nháp</span>}
                                        {row.status === 'APPROVED' && <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-semibold inline-flex items-center gap-1"><CheckCircle size={12}/> Đã chốt</span>}
                                        {row.status === 'PAID' && <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold">Đã thanh toán</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {row.status === 'DRAFT' ? (
                                            <div className="flex items-center justify-center">
                                                <button 
                                                    onClick={() => { setEditingRecord(row); setEditForm({ bonus: row.bonus, deductions: row.deductions }); }} 
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                                                    title="Chỉnh sửa Thưởng Phạt"
                                                >
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
                                    <td colSpan={7} className="py-16 text-center text-xs font-medium text-slate-400">
                                        Chưa có bảng lương nào được tạo cho tháng này. Hãy bấm "Chạy Bảng Lương".
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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
