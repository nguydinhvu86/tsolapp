'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Plus, Users, Edit3, Trash2, Mail, Phone, Briefcase, Calendar, Smartphone } from 'lucide-react';
import { createCustomerContact, updateCustomerContact, deleteCustomerContact } from '@/app/customers/actions';
import { formatDate } from '@/lib/utils/formatters';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';

interface CustomerContactsPanelProps {
    customerId: string;
    contacts: any[];
}

export function CustomerContactsPanel({ customerId, contacts }: CustomerContactsPanelProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingContactId, setEditingContactId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [position, setPosition] = useState('');
    const [phone, setPhone] = useState('');
    const [otherPhone, setOtherPhone] = useState('');
    const [birthday, setBirthday] = useState('');

    const openCreateModal = () => {
        setEditingContactId(null);
        setName('');
        setEmail('');
        setPosition('');
        setPhone('');
        setOtherPhone('');
        setBirthday('');
        setIsModalOpen(true);
    };

    const openEditModal = (contact: any) => {
        setEditingContactId(contact.id);
        setName(contact.name || '');
        setEmail(contact.email || '');
        setPosition(contact.position || '');
        setPhone(contact.phone || '');
        setOtherPhone(contact.otherPhone || '');
        setBirthday(contact.birthday ? new Date(contact.birthday).toISOString().split('T')[0] : '');
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            alert('Vui lòng nhập họ tên người liên hệ.');
            return;
        }

        setIsSaving(true);
        try {
            const data = {
                name,
                email: email || undefined,
                position: position || undefined,
                phone: phone || undefined,
                otherPhone: otherPhone || undefined,
                birthday: birthday ? new Date(birthday) : null
            };

            if (editingContactId) {
                const res = await updateCustomerContact(editingContactId, data);
                if (!res.success) throw new Error(res.error);
            } else {
                const res = await createCustomerContact(customerId, data);
                if (!res.success) throw new Error(res.error);
            }

            setIsModalOpen(false);
        } catch (error: any) {
            alert('Lỗi: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (contactId: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa người liên hệ này? Thao tác không thể hoàn tác.')) {
            const res = await deleteCustomerContact(contactId);
            if (!res.success) {
                alert('Lỗi: ' + res.error);
            }
        }
    };

    return (
        <Card style={{ padding: '0', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#ffffff'
            }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={18} />
                    </div>
                    Danh bạ Người Liên Hệ
                </h3>
                <Button onClick={openCreateModal} className="gap-2" style={{ padding: '0.5rem 1rem' }}>
                    <Plus size={16} /> Thêm Mới
                </Button>
            </div>

            {/* List */}
            <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc' }}>
                {!contacts || contacts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                        <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                        <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)', fontSize: '1rem' }}>Chưa có người liên hệ nào</h4>
                        <p style={{ margin: 0, fontSize: '0.875rem' }}>Bấm nút "Thêm Mới" ở góc trên để bổ sung danh bạ cho doanh nghiệp này.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {contacts.map((contact) => (
                            <div key={contact.id} style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                                transition: 'all 0.2s',
                            }} className="hover:shadow-md hover:border-blue-200">
                                {/* Header of Card */}
                                <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>{contact.name}</h4>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 500, color: '#0ea5e9', backgroundColor: '#f0f9ff', padding: '0.125rem 0.5rem', borderRadius: '999px' }}>
                                            <Briefcase size={12} /> {contact.position || 'Nhân viên'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button onClick={() => openEditModal(contact)} style={{ padding: '0.4rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', borderRadius: '4px' }} className="hover:bg-slate-100 hover:text-blue-600">
                                            <Edit3 size={15} />
                                        </button>
                                        <button onClick={() => handleDelete(contact.id)} style={{ padding: '0.4rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', borderRadius: '4px' }} className="hover:bg-red-50 hover:text-red-600">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                {/* Body of Card */}
                                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: '#475569', flex: 1 }}>
                                    {contact.phone && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Phone size={14} color="#94a3b8" />
                                            <div className="flex items-center gap-2">
                                                <a href={`tel:${contact.phone}`} style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-blue-600">{contact.phone}</a>
                                                <ClickToCallButton phoneNumber={contact.phone} className="scale-90 origin-left" />
                                            </div>
                                        </div>
                                    )}
                                    {contact.otherPhone && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Smartphone size={14} color="#94a3b8" />
                                            <div className="flex items-center gap-2">
                                                <a href={`tel:${contact.otherPhone}`} style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-blue-600">{contact.otherPhone}</a>
                                                <ClickToCallButton phoneNumber={contact.otherPhone} className="scale-90 origin-left" />
                                            </div>
                                        </div>
                                    )}
                                    {contact.email && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Mail size={14} color="#94a3b8" />
                                            <a href={`mailto:${contact.email}`} style={{ color: 'inherit', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="hover:text-blue-600">{contact.email}</a>
                                        </div>
                                    )}
                                    {contact.birthday && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={14} color="#94a3b8" />
                                            <span>{formatDate(new Date(contact.birthday)).split(' ')[1] || formatDate(new Date(contact.birthday))} (DOB)</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingContactId ? "Sửa thông tin liên hệ" : "Thêm người liên hệ mới"}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#334155' }}>Họ Tên <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none' }} className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Nguyễn Văn A" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#334155' }}>Chức Vụ</label>
                            <input type="text" value={position} onChange={e => setPosition(e.target.value)} style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none' }} className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Ví dụ: Giám Đốc, Kế Toán..." />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#334155' }}>Điện thoại chính</label>
                            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none' }} className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="0901234567" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#334155' }}>Điện thoại khác (Nếu có)</label>
                            <input type="text" value={otherPhone} onChange={e => setOtherPhone(e.target.value)} style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none' }} className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Số cá nhân / phụ" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#334155' }}>Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none' }} className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="email@company.com" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#334155' }}>Sinh nhật (DOB)</label>
                            <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none' }} className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Thoát</Button>
                        <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                            {isSaving ? 'Đang lưu...' : (editingContactId ? 'Cập nhật' : 'Thêm mới')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
}
