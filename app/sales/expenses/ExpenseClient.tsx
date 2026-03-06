'use client';

import React, { useState } from 'react';
import { Expense, ExpenseCategory } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { createExpense, updateExpense, deleteExpense, createExpenseCategory } from './actions';
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, ArrowUpDown, Search, DollarSign, ListPlus, Upload, Paperclip, Link as LinkIcon, Building2, UserCircle2 } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import Link from 'next/link';

export type ExpenseWithDetails = Expense & {
    category: ExpenseCategory;
    supplier?: { id: string, name: string } | null;
    customer?: { id: string, name: string } | null;
    creator: { name: string | null; email: string };
};

export default function ExpenseClient({
    initialData,
    categories: initialCategories,
    customers,
    suppliers,
    isAdmin,
    permissions
}: {
    initialData: ExpenseWithDetails[];
    categories: ExpenseCategory[];
    customers: { id: string, name: string, phone?: string | null }[];
    suppliers: { id: string, name: string, phone?: string | null }[];
    isAdmin: boolean;
    permissions: string[];
}) {
    const [expenses, setExpenses] = useState<ExpenseWithDetails[]>(initialData);
    const [categories, setCategories] = useState<ExpenseCategory[]>(initialCategories);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Category Modal State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        amount: '',
        payee: '',
        description: '',
        categoryId: '',
        paymentMethod: 'BANK_TRANSFER',
        date: new Date().toISOString().slice(0, 10),
        reference: '',
        attachment: '',
        systemLinkType: 'NONE', // 'NONE', 'CUSTOMER', 'SUPPLIER'
        customerId: '',
        supplierId: ''
    });
    const [isUploading, setIsUploading] = useState(false);

    const [sortField, setSortField] = useState<keyof ExpenseWithDetails>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    const handleSort = (field: keyof ExpenseWithDetails) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const filteredExpenses = React.useMemo(() => {
        let result = [...expenses];

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(e =>
                e.code.toLowerCase().includes(lowerSearch) ||
                e.description.toLowerCase().includes(lowerSearch) ||
                (e.payee && e.payee.toLowerCase().includes(lowerSearch)) ||
                e.category.name.toLowerCase().includes(lowerSearch)
            );
        }

        result.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            if (sortField === 'date') {
                aVal = new Date(a.date).getTime() as any;
                bVal = new Date(b.date).getTime() as any;
            }

            if (aVal! < bVal!) return sortOrder === 'asc' ? -1 : 1;
            if (aVal! > bVal!) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [expenses, searchTerm, sortField, sortOrder]);

    const openModal = (expense?: ExpenseWithDetails) => {
        if (expense) {
            setEditingId(expense.id);
            setFormData({
                amount: expense.amount.toString(),
                payee: expense.payee || '',
                description: expense.description || '',
                categoryId: expense.categoryId,
                paymentMethod: expense.paymentMethod,
                date: new Date(expense.date).toISOString().slice(0, 10),
                reference: expense.reference || '',
                attachment: expense.attachment || '',
                systemLinkType: expense.customerId ? 'CUSTOMER' : expense.supplierId ? 'SUPPLIER' : 'NONE',
                customerId: expense.customerId || '',
                supplierId: expense.supplierId || ''
            });
        } else {
            setEditingId(null);
            setFormData({
                amount: '',
                payee: '',
                description: '',
                categoryId: categories.length > 0 ? categories[0].id : '',
                paymentMethod: 'BANK_TRANSFER',
                date: new Date().toISOString().slice(0, 10),
                reference: '',
                attachment: '',
                systemLinkType: 'NONE',
                customerId: '',
                supplierId: ''
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!formData.categoryId) {
                alert("Vui lòng chọn hoặc tạo danh mục chi phí.");
                return;
            }
            if (editingId) {
                await updateExpense(editingId, {
                    amount: parseFloat(formData.amount),
                    payee: formData.payee,
                    description: formData.description,
                    categoryId: formData.categoryId,
                    paymentMethod: formData.paymentMethod,
                    date: new Date(formData.date),
                    reference: formData.reference,
                    attachment: formData.attachment,
                    customerId: formData.systemLinkType === 'CUSTOMER' ? formData.customerId : null,
                    supplierId: formData.systemLinkType === 'SUPPLIER' ? formData.supplierId : null,
                });
            } else {
                await createExpense({
                    amount: parseFloat(formData.amount),
                    payee: formData.payee,
                    description: formData.description,
                    categoryId: formData.categoryId,
                    paymentMethod: formData.paymentMethod,
                    date: new Date(formData.date),
                    reference: formData.reference,
                    attachment: formData.attachment,
                    customerId: formData.systemLinkType === 'CUSTOMER' ? formData.customerId : null,
                    supplierId: formData.systemLinkType === 'SUPPLIER' ? formData.supplierId : null,
                });
            }
            window.location.reload();
        } catch (error) {
            alert("Có lỗi xảy ra, vui lòng thử lại.");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa khoản chi này?')) {
            await deleteExpense(id);
            setExpenses(expenses.filter(e => e.id !== id));
        }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            const newCat = await createExpenseCategory({ name: newCategoryName });
            setCategories([...categories, newCat]);
            setFormData({ ...formData, categoryId: newCat.id });
            setIsCategoryModalOpen(false);
            setNewCategoryName('');
        } catch (error) {
            alert("Có lỗi xảy ra khi tạo danh mục.");
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const uploadData = new FormData();
            uploadData.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
            const data = await res.json();
            if (data.url) {
                setFormData(prev => ({ ...prev, attachment: data.url }));
            }
        } catch (error) {
            alert('Lỗi tải file lên');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="flex gap-2 items-center" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem 1rem', background: '#fff', minWidth: '300px' }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.9375rem' }}
                            placeholder="Tìm theo mã, mô tả, danh mục..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => openModal()} className="gap-2">
                        <Plus size={18} /> Thêm Phiếu Chi
                    </Button>
                </div>

                <Table>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('code')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div className="flex items-center gap-1">Mã Phiếu {sortField === 'code' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                            </th>
                            <th onClick={() => handleSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div className="flex items-center gap-1">Ngày Chi {sortField === 'date' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                            </th>
                            <th onClick={() => handleSort('payee')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div className="flex items-center gap-1">Đối tượng {sortField === 'payee' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                            </th>
                            <th onClick={() => handleSort('categoryId')} style={{ cursor: 'pointer', userSelect: 'none' }}>Danh mục</th>
                            <th>Mô tả</th>
                            <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div className="flex items-center gap-1 justify-end">Số Tiền {sortField === 'amount' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                            </th>
                            <th>Phương thức</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dữ liệu chi phí</td></tr>
                        ) : filteredExpenses.map(expense => (
                            <tr key={expense.id}>
                                <td>
                                    <Link
                                        href={`/sales/expenses/${expense.id}`}
                                        className="font-semibold text-primary hover:text-blue-700 hover:underline transition-colors"
                                    >
                                        {expense.code}
                                    </Link>
                                </td>
                                <td>{formatDate(new Date(expense.date))}</td>
                                <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                                    <div className="flex flex-col gap-1">
                                        <span>{expense.payee || '---'}</span>
                                        {expense.customer && (
                                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-sm border border-blue-100 w-fit flex items-center gap-1">
                                                <UserCircle2 size={10} /> {expense.customer.name}
                                            </span>
                                        )}
                                        {expense.supplier && (
                                            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-sm border border-amber-100 w-fit flex items-center gap-1">
                                                <Building2 size={10} /> {expense.supplier.name}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md">
                                        {expense.category?.name}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>{expense.description}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                                    -{formatMoney(expense.amount)}
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>{expense.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}</td>
                                <td>
                                    <div className="flex gap-2 justify-center">
                                        {expense.attachment && (
                                            <a href={expense.attachment} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }} title="Xem đính kèm">
                                                <Paperclip size={18} />
                                            </a>
                                        )}
                                        <button onClick={() => openModal(expense)} style={{ color: 'var(--text-muted)' }} title="Sửa">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(expense.id)} style={{ color: 'var(--danger)' }} title="Xóa">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                {/* Expense Entry Modal */}
                <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Sửa khoản chi' : 'Thêm khoản chi mới'}>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Ngày chi *"
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                            <Input
                                label="Số tiền *"
                                type="number"
                                required
                                min="0"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-slate-700">Đối tượng nhận chi</label>
                            <Input
                                value={formData.payee}
                                onChange={e => setFormData({ ...formData, payee: e.target.value })}
                                placeholder="Vd: Tên người/công ty nhận tiền..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><LinkIcon size={14} className="text-slate-400" /> Liên kết hệ thống</label>
                                <select
                                    value={formData.systemLinkType}
                                    onChange={e => setFormData({ ...formData, systemLinkType: e.target.value, customerId: '', supplierId: '' })}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: '#fff', fontSize: '0.9375rem', outline: 'none' }}
                                >
                                    <option value="NONE">-- Không có liên kết --</option>
                                    <option value="CUSTOMER">Khách hàng</option>
                                    <option value="SUPPLIER">Nhà cung cấp</option>
                                </select>
                            </div>

                            {formData.systemLinkType === 'CUSTOMER' && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700">Chọn khách hàng</label>
                                    <SearchableSelect
                                        options={customers.map(c => ({ value: c.id, label: `${c.name} ${c.phone ? `- ${c.phone}` : ''}` }))}
                                        value={formData.customerId}
                                        onChange={val => setFormData({ ...formData, customerId: val, payee: formData.payee || customers.find(c => c.id === val)?.name || '' })}
                                        placeholder="Tìm khách hàng..."
                                    />
                                </div>
                            )}

                            {formData.systemLinkType === 'SUPPLIER' && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700">Chọn nhà cung cấp</label>
                                    <SearchableSelect
                                        options={suppliers.map(s => ({ value: s.id, label: `${s.name} ${s.phone ? `- ${s.phone}` : ''}` }))}
                                        value={formData.supplierId}
                                        onChange={val => setFormData({ ...formData, supplierId: val, payee: formData.payee || suppliers.find(s => s.id === val)?.name || '' })}
                                        placeholder="Tìm nhà cung cấp..."
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5" style={{ marginTop: '0.5rem' }}>
                            <label className="text-sm font-medium text-slate-700">Danh mục *</label>
                            <div className="flex gap-2">
                                <select
                                    required
                                    value={formData.categoryId}
                                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                    style={{ flex: 1, padding: '0.625rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: '#fff', fontSize: '0.9375rem', outline: 'none' }}
                                >
                                    <option value="" disabled>-- Chọn danh mục --</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                                <Button type="button" variant="secondary" onClick={() => setIsCategoryModalOpen(true)} title="Thêm danh mục">
                                    <Plus size={18} />
                                </Button>
                            </div>
                        </div>

                        <Input
                            label="Mô tả khoản chi *"
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Vd: Mua văn phòng phẩm..."
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700">Phương thức thanh toán</label>
                                <select
                                    value={formData.paymentMethod}
                                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: '#fff', fontSize: '0.9375rem', outline: 'none' }}
                                >
                                    <option value="CASH">Tiền mặt</option>
                                    <option value="BANK_TRANSFER">Chuyển khoản</option>
                                    <option value="CREDIT_CARD">Thẻ tín dụng</option>
                                </select>
                            </div>
                            <Input
                                label="Mã tham chiếu / Số hóa đơn"
                                value={formData.reference}
                                onChange={e => setFormData({ ...formData, reference: e.target.value })}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5" style={{ marginTop: '0.5rem' }}>
                            <label className="text-sm font-medium text-slate-700">Ảnh / Chứng từ đính kèm (tùy chọn)</label>
                            <div className="flex items-center gap-4">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isUploading ? 'not-allowed' : 'pointer', padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-subtle)' }}>
                                    <Upload size={16} />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{isUploading ? 'Đang tải lên...' : 'Chọn file tải lên'}</span>
                                    <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} disabled={isUploading} style={{ display: 'none' }} />
                                </label>
                                {formData.attachment && (
                                    <a href={formData.attachment} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <Paperclip size={16} /> Đã đính kèm
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                            <Button type="button" variant="secondary" onClick={closeModal}>Hủy</Button>
                            <Button type="submit">Lưu khoản chi</Button>
                        </div>
                    </form>
                </Modal>

                {/* Quick Category Modal */}
                <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Thêm Danh mục Chi Phí">
                    <form onSubmit={handleCreateCategory} className="flex flex-col gap-4">
                        <Input
                            label="Tên danh mục *"
                            required
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            placeholder="Vd: Tiếp khách, Vận chuyển..."
                        />
                        <div className="flex gap-2" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                            <Button type="button" variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>Hủy</Button>
                            <Button type="submit">Lưu danh mục</Button>
                        </div>
                    </form>
                </Modal>

            </Card>
        </div>
    );
}
