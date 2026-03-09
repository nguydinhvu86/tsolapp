'use client';
import React, { useState, useMemo } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { User, UserPlus, UserMinus, Search } from 'lucide-react';
import { assignCustomerManagers, removeCustomerManager } from '@/app/customers/actions';

export function CustomerManagersPanel({ customerId, managers = [], users = [], currentUserRole }: { customerId: string, managers: any[], users: any[], currentUserRole: string }) {
    const [isManaging, setIsManaging] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canEdit = currentUserRole === 'ADMIN' || currentUserRole === 'MANAGER';

    // Users not yet managing this customer
    const availableUsers = useMemo(() => {
        const managerIds = managers.map(m => m.id);
        return users.filter(u => !managerIds.includes(u.id));
    }, [managers, users]);

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return availableUsers;
        return availableUsers.filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [availableUsers, searchQuery]);

    const handleAddManager = async (userId: string) => {
        setIsSubmitting(true);
        try {
            await assignCustomerManagers(customerId, [userId]);
            setSearchQuery(''); // clear search
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveManager = async (userId: string) => {
        if (!confirm("Bạn có chắc muốn xóa nhân viên này khỏi danh sách phụ trách?")) return;
        setIsSubmitting(true);
        try {
            await removeCustomerManager(customerId, userId);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                        <User size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>Thành Viên Phụ Trách</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{managers.length} người đang quản lý khách hàng này</p>
                    </div>
                </div>
                {canEdit && (
                    <Button onClick={() => setIsManaging(!isManaging)} variant={isManaging ? 'secondary' : 'primary'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isManaging ? 'Đóng' : <><UserPlus size={16} /> Thêm người</>}
                    </Button>
                )}
            </div>

            {isManaging && canEdit && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm nhân viên..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredUsers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>Không tìm thấy nhân viên nào khác.</div>
                        ) : (
                            filteredUsers.map(u => (
                                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            {u.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{u.name}</span>
                                    </div>
                                    <Button disabled={isSubmitting} onClick={() => handleAddManager(u.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#e0e7ff', color: '#4f46e5', border: 'none' }}>
                                        Thêm
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {managers.length === 0 && !isManaging ? (
                    <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', background: '#f8fafc', borderRadius: '8px', border: '2px dashed #e2e8f0' }}>
                        Chưa có người phụ trách nào.
                    </div>
                ) : (
                    managers.map(m => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--background)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>
                                    {m.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-main)' }}>{m.name}</span>
                            </div>
                            {canEdit && (
                                <button disabled={isSubmitting} onClick={() => handleRemoveManager(m.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.7'} title="Xóa phụ trách">
                                    <UserMinus size={16} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
}
