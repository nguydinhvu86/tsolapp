'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Plus, Search, Trash2, LayoutTemplate, User, ArrowRight } from 'lucide-react';
import { deleteEmailTemplate } from './actions';
import { useRouter } from 'next/navigation';

export default function EmailTemplateDashboardClient({ initialTemplates }: { initialTemplates: any[] }) {
    const [templates, setTemplates] = useState(initialTemplates);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        if (confirm('Bạn có chắc chắn muốn xóa mẫu email này?')) {
            await deleteEmailTemplate(id);
            setTemplates(templates.filter(t => t.id !== id));
            router.refresh();
        }
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getModuleColorParams = (module: string | null) => {
        switch (module) {
            case 'ESTIMATE': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
            case 'INVOICE': return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
            case 'CUSTOMER': return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' };
            default: return { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
        }
    };

    const getModuleLabel = (module: string | null) => {
        switch (module) {
            case 'ESTIMATE': return 'Báo giá';
            case 'INVOICE': return 'Hóa đơn';
            case 'CUSTOMER': return 'Khách hàng';
            default: return 'Chung';
        }
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%', minHeight: '100vh', background: '#f8fafc' }}>
            {/* Header Section */}
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ background: 'var(--primary)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)' }}>
                        <Mail color="white" size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
                            Quản lý Mẫu Email
                        </h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '42rem' }}>
                            Thiết kế và quản lý các mẫu thư điện tử chuyên nghiệp để tự động hóa giao tiếp với khách hàng và nội bộ.
                        </p>
                    </div>
                </div>
                <Link href="/email-templates/new" className="btn btn-primary" style={{ gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 600 }}>
                    <Plus size={18} strokeWidth={2.5} />
                    Tạo Mẫu Mới
                </Link>
            </div>

            {/* Toolbar Section */}
            <div className="card" style={{ marginBottom: '2rem', padding: '0.5rem', borderRadius: '16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div className="search-input-wrapper" style={{ maxWidth: '100%' }}>
                    <Search className="search-icon" size={20} style={{ left: '1rem', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm mẫu email theo tên hoặc tiêu đề..."
                        className="input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ backgroundColor: '#f8fafc', border: 'none', paddingLeft: '3rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', borderRadius: '12px', fontSize: '0.95rem' }}
                        onFocus={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.boxShadow = '0 0 0 2px #3b82f6'; }}
                        onBlur={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                </div>
            </div>

            {/* Template Grid or Empty State */}
            {filteredTemplates.length > 0 ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {filteredTemplates.map((template, idx) => {
                        const moduleColors = getModuleColorParams(template.module);
                        return (
                            <Link
                                key={template.id}
                                href={`/email-templates/${template.id}`}
                                className="card"
                                id={`template-card-${idx}`}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '1.5rem',
                                    textDecoration: 'none',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    border: '1px solid var(--border)',
                                    borderRadius: '16px',
                                    backgroundColor: 'white'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                    const actionText = document.getElementById(`card-action-${idx}`);
                                    if (actionText) actionText.style.opacity = '1';
                                    const deleteBtn = document.getElementById(`card-delete-${idx}`);
                                    if (deleteBtn) deleteBtn.style.opacity = '1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)';
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    const actionText = document.getElementById(`card-action-${idx}`);
                                    if (actionText) actionText.style.opacity = '0';
                                    const deleteBtn = document.getElementById(`card-delete-${idx}`);
                                    if (deleteBtn) deleteBtn.style.opacity = '0';
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <span style={{
                                        backgroundColor: moduleColors.bg,
                                        color: moduleColors.color,
                                        border: `1px solid ${moduleColors.border}`,
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {getModuleLabel(template.module)}
                                    </span>
                                    <button
                                        id={`card-delete-${idx}`}
                                        onClick={(e) => handleDelete(template.id, e)}
                                        style={{ color: '#94a3b8', padding: '0.35rem', borderRadius: '8px', background: 'transparent', opacity: 0, transition: 'all 0.2s', zIndex: 10 }}
                                        title="Xóa mẫu"
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#1e293b', lineHeight: '1.3' }}>
                                    {template.name}
                                </h3>

                                <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', flexGrow: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    <strong style={{ color: '#334155' }}>Tiêu đề:</strong> {template.subject}
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '0.75rem',
                                    color: '#64748b',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid #f1f5f9',
                                    fontWeight: 500
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={14} color="#94a3b8" />
                                        {template.creator?.name || 'Hệ thống'}
                                    </div>
                                    <div id={`card-action-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#2563eb', fontWeight: 600, opacity: 0, transition: 'opacity 0.2s' }}>
                                        Chỉnh sửa <ArrowRight size={14} />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '96px', height: '96px', background: '#eff6ff', color: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                        <LayoutTemplate size={48} strokeWidth={1.5} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Chưa có mẫu Email nào</h3>
                    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 2rem auto', fontSize: '1rem' }}>
                        {searchTerm ? 'Không tìm thấy mẫu email nào khớp với từ khóa tìm kiếm của bạn.' : 'Bắt đầu tạo các mẫu email tự động hóa quy trình nghiệp vụ ngay bây giờ.'}
                    </p>
                    {!searchTerm && (
                        <Link href="/email-templates/new" className="btn btn-primary" style={{ gap: '0.5rem', display: 'inline-flex', padding: '0.75rem 1.5rem', fontWeight: 600, borderRadius: '12px' }}>
                            <Plus size={20} />
                            Tạo Mẫu Đầu Tiên
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
