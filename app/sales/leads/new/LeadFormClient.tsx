'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, ArrowLeft, Building2, User, Phone, Mail, DollarSign, Calendar, Tag, FileText, Info, Activity } from 'lucide-react';
import Link from 'next/link';
import { createLead, updateLead } from '../actions';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';

const styles = {
    container: { padding: '24px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '96px', boxSizing: 'border-box' as const },
    header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' },
    backBtn: { padding: '8px', borderRadius: '50%', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 },
    subtitle: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' },
    formLayout: { display: 'flex', gap: '24px', flexWrap: 'wrap' as const },
    leftColumn: { flex: '1 1 600px', display: 'flex', flexDirection: 'column' as const, gap: '24px' },
    rightColumn: { flex: '1 1 350px', maxWidth: '400px', display: 'flex', flexDirection: 'column' as const, gap: '24px' },
    card: { backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' },
    cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #f8fafc', paddingBottom: '16px' },
    cardTitle: { fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' },
    inputWrapper: { position: 'relative' as const, display: 'flex', alignItems: 'center' },
    inputIcon: { position: 'absolute' as const, left: '12px', color: '#94a3b8' },
    input: { width: '100%', padding: '10px 16px', paddingLeft: '40px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none', fontSize: '14px', color: '#334155', boxSizing: 'border-box' as const },
    inputNoIcon: { width: '100%', padding: '10px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none', fontSize: '14px', color: '#334155', boxSizing: 'border-box' as const },
    textarea: { width: '100%', padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none', fontSize: '14px', color: '#334155', minHeight: '100px', resize: 'vertical' as const, boxSizing: 'border-box' as const },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
    toggleGroup: { display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '24px' },
    toggleBtn: { flex: 1, padding: '8px 16px', fontSize: '14px', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: '#64748b' },
    toggleBtnActive: { flex: 1, padding: '8px 16px', fontSize: '14px', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: 'white', color: '#4f46e5', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    bottomBar: { position: 'fixed' as const, bottom: 0, left: 0, right: 0, padding: '16px 24px', backgroundColor: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', zIndex: 40, boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)' },
    btnParams: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', border: 'none' },
    btnCancel: { backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569' },
    btnSave: { backgroundColor: '#4f46e5', color: 'white', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)' },
};

const STATUSES = [
    { id: 'NEW', label: 'Tiếp nhận mới' },
    { id: 'CONTACTED', label: 'Đã liên hệ' },
    { id: 'QUALIFIED', label: 'Đánh giá / Khảo sát' },
    { id: 'PROPOSAL', label: 'Gửi báo giá' },
    { id: 'WON', label: 'Chốt thành công' },
    { id: 'LOST', label: 'Thất bại' }
];

export function LeadFormClient({ customers, users, sources = [], initialData, currentUserId }: { customers: any[], users: any[], sources?: string[], initialData?: any, currentUserId?: string }) {
    const router = useRouter();
    // Move useSearchParams logic strictly outside to another component if necessary, or just use window.location here since it's a client component.
    // However, since it's a client component, `useSearchParams` is fine.

    // We need to import useSearchParams if we are going to use it.
    // Wait, let's use a simpler approach: check window.location.search in useEffect.

    const isEdit = !!initialData;

    const [isExistingCustomer, setIsExistingCustomer] = useState(isEdit ? !!initialData.customerId : false);
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        company: initialData?.company || '',
        contactName: initialData?.contactName || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        customerId: initialData?.customerId || '',
        source: initialData?.source || '',
        status: initialData?.status || 'NEW',
        estimatedValue: initialData?.estimatedValue || 0,
        expectedCloseDate: initialData?.expectedCloseDate ? new Date(initialData.expectedCloseDate).toISOString().split('T')[0] : '',
        notes: initialData?.notes || '',
        assignedToId: initialData?.assignedToId || currentUserId || ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (!isEdit && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const customerIdParam = params.get('customerId');
            if (customerIdParam) {
                setIsExistingCustomer(true);
                setFormData(prev => ({ ...prev, customerId: customerIdParam }));
            }
        }
    }, [isEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'estimatedValue' ? Number(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Chuẩn hóa dữ liệu
            const payload = {
                ...formData,
                estimatedValue: Number(formData.estimatedValue) || 0,
                expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate) : null,
                customerId: isExistingCustomer ? formData.customerId : null,
                company: !isExistingCustomer ? formData.company : null,
                contactName: !isExistingCustomer ? formData.contactName : null,
                email: !isExistingCustomer ? formData.email : null,
                phone: !isExistingCustomer ? formData.phone : null,
            };

            if (isEdit) {
                await updateLead(initialData.id, payload);
                router.push(`/sales/leads/${initialData.id}`);
            } else {
                const newLead = await createLead(payload);
                router.push(`/sales/leads/${newLead.id}`);
            }
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi khi lưu Cơ hội bán hàng');
        } finally {
            setLoading(false);
        }
    };

    // Format options for SearchableSelect
    const customerOptions = customers.map(c => ({ value: c.id, label: `${c.code ? c.code + ' - ' : ''}${c.name} ${c.phone ? `(${c.phone})` : ''}` }));
    const userOptions = users.map(u => ({ value: u.id, label: u.name || u.email }));

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <Link href={isEdit ? `/sales/leads/${initialData.id}` : "/sales/leads"} style={styles.backBtn}>
                    <ArrowLeft size={20} className="text-gray-600" />
                </Link>
                <div>
                    <h1 style={styles.title}>{isEdit ? 'Chỉnh sửa Cơ hội' : 'Thêm Cơ hội bán hàng'}</h1>
                    <p style={styles.subtitle}>{isEdit ? initialData.code : 'Nhập thông tin cho cơ hội bán hàng mới'}</p>
                </div>
            </div>

            {error && (
                <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '12px' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={styles.formLayout}>
                {/* LEFT COLUMN: Main Lead Details */}
                <div style={styles.leftColumn}>
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <Tag color="#4f46e5" size={20} />
                            <h2 style={styles.cardTitle}>Thông Tin Cơ Hội</h2>
                        </div>

                        <div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Tên cơ hội <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="VD: Lắp đặt hệ thống Camera nhà xưởng A"
                                    style={styles.inputNoIcon}
                                />
                            </div>

                            <div style={styles.grid2}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Giá trị dự kiến (VNĐ)</label>
                                    <div style={styles.inputWrapper}>
                                        <div style={styles.inputIcon}>
                                            <DollarSign size={18} />
                                        </div>
                                        <input
                                            type="number"
                                            name="estimatedValue"
                                            value={formData.estimatedValue || ''}
                                            onChange={handleChange}
                                            placeholder="0"
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Ngày chốt dự kiến</label>
                                    <div style={styles.inputWrapper}>
                                        <div style={styles.inputIcon}>
                                            <Calendar size={18} />
                                        </div>
                                        <input
                                            type="date"
                                            name="expectedCloseDate"
                                            value={formData.expectedCloseDate}
                                            onChange={handleChange}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <FileText color="#4f46e5" size={20} />
                            <h2 style={styles.cardTitle}>Thông Tin Bổ Sung</h2>
                        </div>

                        <div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Nguồn cơ hội (Source)</label>
                                <input
                                    type="text"
                                    name="source"
                                    list="source-list"
                                    value={formData.source}
                                    onChange={handleChange}
                                    placeholder="Facebook, Web, Giới thiệu..."
                                    style={styles.inputNoIcon}
                                />
                                <datalist id="source-list">
                                    {sources.map(s => <option key={s} value={s} />)}
                                </datalist>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Ghi chú nội bộ</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Ghi chú thêm về cơ hội này..."
                                    style={styles.textarea}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                {/* RIGHT COLUMN: Customer & Status Map */}
                <div style={styles.rightColumn}>
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <Activity color="#4f46e5" size={20} />
                            <h2 style={styles.cardTitle}>Trạng Thái & Phân Công</h2>
                        </div>

                        <div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Người phụ trách</label>
                                <SearchableSelect
                                    options={userOptions}
                                    value={formData.assignedToId}
                                    onChange={(val) => setFormData(prev => ({ ...prev, assignedToId: val }))}
                                    placeholder="Chọn nhân viên..."
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Pipeline Stage</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    style={styles.inputNoIcon}
                                >
                                    {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <Building2 color="#4f46e5" size={20} />
                            <h2 style={styles.cardTitle}>Khách Hàng</h2>
                        </div>

                        <div style={styles.toggleGroup}>
                            <button
                                type="button"
                                onClick={() => setIsExistingCustomer(false)}
                                style={!isExistingCustomer ? styles.toggleBtnActive : styles.toggleBtn}
                            >
                                Khách Mới
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsExistingCustomer(true)}
                                style={isExistingCustomer ? styles.toggleBtnActive : styles.toggleBtn}
                            >
                                Đã Có
                            </button>
                        </div>

                        <div>
                            {isExistingCustomer ? (
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Chọn Khách Hàng <span style={{ color: '#ef4444' }}>*</span></label>
                                    <SearchableSelect
                                        options={customerOptions}
                                        value={formData.customerId}
                                        onChange={(val) => setFormData(prev => ({ ...prev, customerId: val }))}
                                        placeholder="Tìm theo Tên hoặc SĐT..."
                                    />
                                    {(!formData.customerId) && <p style={{ fontSize: '12px', color: '#d97706', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}><Info size={14} />Vui lòng chọn khách hàng</p>}
                                </div>
                            ) : (
                                <div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Tên Công Ty / Cá Nhân <span style={{ color: '#ef4444' }}>*</span></label>
                                        <div style={styles.inputWrapper}>
                                            <div style={styles.inputIcon}>
                                                <Building2 size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                name="company"
                                                required={!isExistingCustomer}
                                                value={formData.company}
                                                onChange={handleChange}
                                                placeholder="Công ty ABC"
                                                style={styles.input}
                                            />
                                        </div>
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Người liên hệ chính</label>
                                        <div style={styles.inputWrapper}>
                                            <div style={styles.inputIcon}>
                                                <User size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                name="contactName"
                                                value={formData.contactName}
                                                onChange={handleChange}
                                                placeholder="Ông Nguyễn Văn A"
                                                style={styles.input}
                                            />
                                        </div>
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Số điện thoại</label>
                                        <div style={styles.inputWrapper}>
                                            <div style={styles.inputIcon}>
                                                <Phone size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="09xx xxx xxx"
                                                style={styles.input}
                                            />
                                        </div>
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Email</label>
                                        <div style={styles.inputWrapper}>
                                            <div style={styles.inputIcon}>
                                                <Mail size={18} />
                                            </div>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="email@example.com"
                                                style={styles.input}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </form>

            {/* Fixed Bottom Action Bar */}
            <div style={{ ...styles.bottomBar, paddingLeft: '260px' }}>
                <button
                    type="button"
                    onClick={() => router.back()}
                    style={{ ...styles.btnParams, ...styles.btnCancel }}
                    disabled={loading}
                >
                    <X size={18} /> Hủy
                </button>
                <button
                    type="submit"
                    onClick={handleSubmit}
                    style={{ ...styles.btnParams, ...styles.btnSave, opacity: (loading || (isExistingCustomer && !formData.customerId)) ? 0.7 : 1 }}
                    disabled={loading || (isExistingCustomer && !formData.customerId)}
                >
                    <Save size={18} /> {loading ? 'Đang lưu...' : 'Lưu Cơ Hội'}
                </button>
            </div>
        </div>
    );
}
