'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Users, Plus, Trash2, Edit2, Phone, Mail, Navigation2, Check, X } from 'lucide-react';
import { createSupplierContact, updateSupplierContact, deleteSupplierContact } from '@/app/purchasing/actions';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';

export function SupplierContactsPanel({ supplierId, initialContacts = [] }: { supplierId: string, initialContacts: any[] }) {
    const [contacts, setContacts] = useState(initialContacts);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({ name: '', position: '', phone: '', email: '', notes: '' });

    const handleAdd = async () => {
        if (!formData.name) return alert('Vui lòng nhập tên người liên hệ');
        const res = await createSupplierContact({ supplierId, ...formData });
        setContacts([res, ...contacts]);
        setIsAdding(false);
        setFormData({ name: '', position: '', phone: '', email: '', notes: '' });
    };

    const handleUpdate = async (id: string) => {
        if (!formData.name) return alert('Vui lòng nhập tên người liên hệ');
        const res = await updateSupplierContact(id, formData);
        setContacts(contacts.map(c => c.id === id ? res : c));
        setEditingId(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa người liên hệ này?')) return;
        await deleteSupplierContact(id);
        setContacts(contacts.filter(c => c.id !== id));
    };

    const startEdit = (c: any) => {
        setFormData({ name: c.name, position: c.position || '', phone: c.phone || '', email: c.email || '', notes: c.notes || '' });
        setEditingId(c.id);
        setIsAdding(false);
    };

    return (
        <Card className="overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Users size={18} className="text-blue-500" />
                    Người liên hệ ({contacts.length})
                </h3>
                <button 
                    onClick={() => {
                        setIsAdding(true);
                        setEditingId(null);
                        setFormData({ name: '', position: '', phone: '', email: '', notes: '' });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-200 rounded-md text-sm font-medium"
                >
                    <Plus size={14} /> Thêm mới
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-3">Họ Tên</th>
                            <th className="px-4 py-3">Chức vụ</th>
                            <th className="px-4 py-3">Điện thoại</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Ghi chú</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {isAdding && (
                            <tr className="bg-blue-50/50">
                                <td className="px-4 py-3"><input type="text" placeholder="Nhập tên..." className="w-full p-1 border rounded text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} autoFocus /></td>
                                <td className="px-4 py-3"><input type="text" placeholder="Trưởng phòng..." className="w-full p-1 border rounded text-xs" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} /></td>
                                <td className="px-4 py-3"><input type="text" placeholder="09xxxx" className="w-full p-1 border rounded text-xs" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></td>
                                <td className="px-4 py-3"><input type="email" placeholder="email@..." className="w-full p-1 border rounded text-xs" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></td>
                                <td className="px-4 py-3"><input type="text" placeholder="..." className="w-full p-1 border rounded text-xs" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <button onClick={handleAdd} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded" title="Lưu"><Check size={16} /></button>
                                    <button onClick={() => setIsAdding(false)} className="text-gray-400 p-1 hover:bg-gray-100 rounded ml-1" title="Hủy"><X size={16} /></button>
                                </td>
                            </tr>
                        )}
                        {contacts.length === 0 && !isAdding && (
                            <tr><td colSpan={6} className="text-center p-8 text-slate-400 italic">Chưa có người liên hệ nào.</td></tr>
                        )}
                        {contacts.map((c: any) => editingId === c.id ? (
                            <tr key={`edit-${c.id}`} className="bg-blue-50/50">
                                <td className="px-4 py-3"><input type="text" className="w-full p-1 border rounded text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></td>
                                <td className="px-4 py-3"><input type="text" className="w-full p-1 border rounded text-xs" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} /></td>
                                <td className="px-4 py-3"><input type="text" className="w-full p-1 border rounded text-xs" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></td>
                                <td className="px-4 py-3"><input type="email" className="w-full p-1 border rounded text-xs" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></td>
                                <td className="px-4 py-3"><input type="text" className="w-full p-1 border rounded text-xs" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <button onClick={() => handleUpdate(c.id)} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded" title="Lưu"><Check size={16} /></button>
                                    <button onClick={() => setEditingId(null)} className="text-gray-400 p-1 hover:bg-gray-100 rounded ml-1" title="Hủy"><X size={16} /></button>
                                </td>
                            </tr>
                        ) : (
                            <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                                <td className="px-4 py-3 text-slate-600">{c.position || '-'}</td>
                                <td className="px-4 py-3">
                                    {c.phone ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <Phone size={12} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{c.phone}</span>
                                            </div>
                                            <ClickToCallButton phoneNumber={c.phone} />
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-4 py-3">
                                    {c.email ? (
                                        <div className="flex items-center gap-1.5">
                                            <Mail size={12} className="text-slate-400" />
                                            <span>{c.email}</span>
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={c.notes}>{c.notes || '-'}</td>
                                <td className="px-4 py-3 text-right whitespace-nowrap opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEdit(c)} className="text-blue-500 p-1.5 hover:bg-blue-50 rounded-md transition-colors" title="Sửa"><Edit2 size={14} /></button>
                                    <button onClick={() => handleDelete(c.id)} className="text-rose-500 p-1.5 hover:bg-rose-50 rounded-md transition-colors ml-1" title="Xóa"><Trash2 size={14} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
