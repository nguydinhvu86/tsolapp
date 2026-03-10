'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, FileText, Variable, Settings2, Info } from 'lucide-react';
import { createEmailTemplate, updateEmailTemplate } from './actions';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

export default function EmailTemplateFormClient({
    initialTemplate,
    userId
}: {
    initialTemplate: any,
    userId: string
}) {
    const isEdit = !!initialTemplate;
    const [name, setName] = useState(initialTemplate?.name || '');
    const [subject, setSubject] = useState(initialTemplate?.subject || '');
    const [body, setBody] = useState(initialTemplate?.body || '');
    const [module, setModule] = useState(initialTemplate?.module || 'GENERAL');

    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

    const modules = [
        { id: 'GENERAL', label: 'Chung (Mặc định)' },
        { id: 'ESTIMATE', label: 'Báo giá (Sales Estimate)' },
        { id: 'INVOICE', label: 'Hóa đơn (Sales Invoice)' },
        { id: 'ORDER', label: 'Đơn hàng (Sales Order)' },
        { id: 'DEBT_CONFIRMATION', label: 'Xác nhận công nợ' },
        { id: 'PAYMENT_CONFIRMATION', label: 'Xác nhận thanh toán' },
        { id: 'TASK', label: 'Công việc được giao' },
        { id: 'PURCHASE_ORDER', label: 'Đơn mua hàng (PO)' },
        { id: 'LEAD', label: 'Thông báo Lead mới' },
        { id: 'CUSTOMER', label: 'Khách hàng (Thông báo chung)' }
    ];

    const handleSave = async () => {
        if (!name || !subject || !body) {
            alert("Vui lòng nhập đầy đủ Tên, Tiêu đề và Nội dung mẫu.");
            return;
        }

        setIsSaving(true);
        try {
            if (isEdit) {
                await updateEmailTemplate(initialTemplate.id, { name, subject, body, module });
            } else {
                await createEmailTemplate({ name, subject, body, module }, userId);
            }
            router.push('/email-templates');
            router.refresh();
        } catch (error) {
            console.error("Lỗi khi lưu template:", error);
            alert("Đã xảy ra lỗi khi lưu mẫu email.");
            setIsSaving(false);
        }
    };

    return (
        <div style={{ paddingBottom: '6rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            {/* Sticky Header */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid #e2e8f0',
                padding: '1rem 0'
            }}>
                <div style={{ maxWidth: '100%', margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link
                            href="/email-templates"
                            style={{ padding: '0.5rem', color: '#94a3b8', borderRadius: '50%', transition: 'all 0.2s', display: 'flex' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                        >
                            <ArrowLeft size={22} />
                        </Link>
                        <div>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1e293b', letterSpacing: '-0.025em' }}>
                                {isEdit ? 'Chỉnh Sửa Mẫu Email' : 'Soạn Mẫu Email Mới'}
                            </h1>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                                {name ? name : <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Đang thiết lập biểu mẫu...</span>}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            padding: '0.625rem 1.5rem', borderRadius: '12px', fontWeight: 600,
                            background: '#2563eb', color: 'white', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.6 : 1, transition: 'all 0.2s',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseEnter={(e) => { if (!isSaving) e.currentTarget.style.background = '#1d4ed8'; }}
                        onMouseLeave={(e) => { if (!isSaving) e.currentTarget.style.background = '#2563eb'; }}
                    >
                        <Save size={18} />
                        {isSaving ? 'Đang Thiết Lập...' : 'Lưu Thay Đổi'}
                    </button>
                </div>
            </div>

            <div style={{ maxWidth: '100%', margin: '2rem auto 0 auto', padding: '0 2rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>

                    {/* Main Editor Section */}
                    <div style={{ flex: '1 1 65%', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* Settings Card */}
                        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Settings2 color="#3b82f6" size={18} />
                                <h2 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: '#334155' }}>Thông Số Cơ Bản</h2>
                            </div>
                            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                                            Trường Quản Lý (Tên Nhận Diện) <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="VD: Mẫu gửi tự động hóa đơn Q1/2026..."
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            style={{
                                                width: '100%', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0',
                                                borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s', fontWeight: 500
                                            }}
                                            onFocus={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)'; }}
                                            onBlur={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                                            Phân Loại Chức Năng <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <select
                                            value={module}
                                            onChange={e => setModule(e.target.value)}
                                            style={{
                                                width: '100%', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0',
                                                borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s', fontWeight: 500
                                            }}
                                            onFocus={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)'; }}
                                            onBlur={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                        >
                                            {modules.map(m => (
                                                <option key={m.id} value={m.id}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                                            Tiêu Đề Email (Subject) <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Người nhận sẽ thấy dòng này đầu tiên</span>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="VD: [Trường Thịnh] Cảm ơn bạn đã quan tâm đến dịch vụ..."
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        style={{
                                            width: '100%', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0',
                                            borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s', fontWeight: 500
                                        }}
                                        onFocus={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)'; }}
                                        onBlur={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#2563eb', fontWeight: 500 }}>
                                        <Info size={14} /> Bạn có thể chèn các biến động (Variables) vào Tiêu đề này.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Editor Card */}
                        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText color="#3b82f6" size={18} />
                                <h2 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: '#334155' }}>Khung Soạn Thảo HTML</h2>
                            </div>
                            <div style={{ flex: 1 }}>
                                <style>{`
                                    .ql-container.ql-snow { border: none !important; font-family: inherit !important; font-size: 1rem !important; }
                                    .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #e2e8f0 !important; background: #f8fafc !important; border-radius: 0 !important; padding: 0.75rem 1.5rem !important; }
                                    .ql-editor { min-height: 450px !important; padding: 1.5rem !important; }
                                `}</style>
                                <ReactQuill
                                    theme="snow"
                                    value={body}
                                    onChange={setBody}
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, 3, false] }, { 'font': [] }],
                                            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                                            ['link', 'image', 'video'],
                                            [{ 'color': [] }, { 'background': [] }],
                                            ['clean']
                                        ],
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Instructions / Variables */}
                    <div style={{ flex: '1 1 30%', minWidth: '280px' }}>
                        <div style={{
                            background: '#0f172a',
                            borderRadius: '16px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            position: 'sticky',
                            top: '100px',
                            overflow: 'hidden',
                            border: '1px solid #1e293b',
                            color: '#e2e8f0'
                        }}>
                            <div style={{ background: '#020617', padding: '1.5rem', borderBottom: '1px solid #1e293b' }}>
                                <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
                                    <Variable size={18} color="#3b82f6" />
                                    Cấu Trúc Biến Tự Động
                                </h3>
                                <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                                    Copy snippet dưới đây và dán trực tiếp vào Editor. Hệ thống sẽ Auto-Replace (thay thế tự động) khi gửi Mail.
                                </p>
                            </div>

                            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                                {/* Global Variables */}
                                <div>
                                    <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#64748b' }}></div> MẶC ĐỊNH (GLOBAL)
                                    </h4>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {[
                                            { code: '{{customerName}}', desc: 'Tên đối tác / khách hàng' },
                                            { code: '{{customerEmail}}', desc: 'Địa chỉ Email khách hàng' },
                                            { code: '{{senderName}}', desc: 'Tên của bạn (Tài khoản)' },
                                            { code: '{{today}}', desc: 'Ngày xuất file / gửi mail' },
                                        ].map((item, idx) => (
                                            <li key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                <code style={{ background: '#020617', color: '#10b981', padding: '0.35rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'monospace', border: '1px solid #1e293b', width: 'max-content', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)' }}>
                                                    {item.code}
                                                </code>
                                                <span style={{ fontSize: '0.8125rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>- {item.desc}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Contextual Variables */}
                                {(module === 'ESTIMATE' || module === 'INVOICE' || module === 'ORDER') && (
                                    <div style={{ paddingTop: '1.75rem', borderTop: '1px dashed #334155' }}>
                                        <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></div> BIẾN CỤC BỘ ({module === 'ESTIMATE' ? 'BÁO GIÁ' : module === 'INVOICE' ? 'HÓA ĐƠN' : 'ĐƠN HÀNG'})
                                        </h4>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {[
                                                { code: '{{code}}', desc: `Mã số chứng từ` },
                                                { code: '{{totalAmount}}', desc: 'Tổng số tiền' },
                                                { code: '{{link}}', desc: 'Đường dẫn tĩnh trang Xem Thử' },
                                            ].map((item, idx) => (
                                                <li key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                    <code style={{ background: '#020617', color: '#3b82f6', padding: '0.35rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'monospace', border: '1px solid #1e293b', width: 'max-content', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)' }}>
                                                        {item.code}
                                                    </code>
                                                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>- {item.desc}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {module === 'DEBT_CONFIRMATION' && (
                                    <div style={{ paddingTop: '1.75rem', borderTop: '1px dashed #334155' }}>
                                        <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></div> BIẾN XÁC NHẬN CÔNG NỢ
                                        </h4>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {[
                                                { code: '{{totalDebt}}', desc: `Tổng công nợ hiện tại` },
                                            ].map((item, idx) => (
                                                <li key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                    <code style={{ background: '#020617', color: '#f59e0b', padding: '0.35rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'monospace', border: '1px solid #1e293b', width: 'max-content', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)' }}>
                                                        {item.code}
                                                    </code>
                                                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>- {item.desc}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {module === 'PAYMENT_CONFIRMATION' && (
                                    <div style={{ paddingTop: '1.75rem', borderTop: '1px dashed #334155' }}>
                                        <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div> BIẾN XÁC NHẬN THANH TOÁN
                                        </h4>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {[
                                                { code: '{{paymentCode}}', desc: `Mã phiếu thu` },
                                                { code: '{{paymentAmount}}', desc: `Số tiền thanh toán` },
                                                { code: '{{paymentDate}}', desc: `Ngày thanh toán` },
                                                { code: '{{paymentMethod}}', desc: `Phương thức thanh toán` },
                                                { code: '{{link}}', desc: `Đường dẫn xem Phiếu thu` }
                                            ].map((item, idx) => (
                                                <li key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                    <code style={{ background: '#020617', color: '#10b981', padding: '0.35rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'monospace', border: '1px solid #1e293b', width: 'max-content', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)' }}>
                                                        {item.code}
                                                    </code>
                                                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>- {item.desc}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {module === 'TASK' && (
                                    <div style={{ paddingTop: '1.75rem', borderTop: '1px dashed #334155' }}>
                                        <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6' }}></div> BIẾN CÔNG VIỆC
                                        </h4>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {[
                                                { code: '{{taskTitle}}', desc: `Tiêu đề công việc` },
                                                { code: '{{taskDescription}}', desc: `Mô tả nội dung việc` },
                                                { code: '{{dueDate}}', desc: `Ngày đến hạn (Deadline)` },
                                                { code: '{{priority}}', desc: `Mức độ ưu tiên` },
                                                { code: '{{assignerName}}', desc: `Người giao việc` },
                                                { code: '{{assigneeName}}', desc: `Người nhận việc` },
                                                { code: '{{link}}', desc: `Đường dẫn xem Công việc` }
                                            ].map((item, idx) => (
                                                <li key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                    <code style={{ background: '#020617', color: '#8b5cf6', padding: '0.35rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'monospace', border: '1px solid #1e293b', width: 'max-content', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)' }}>
                                                        {item.code}
                                                    </code>
                                                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>- {item.desc}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {module === 'PURCHASE_ORDER' && (
                                    <div style={{ paddingTop: '1.75rem', borderTop: '1px dashed #334155' }}>
                                        <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ec4899' }}></div> BIẾN ĐƠN MUA HÀNG
                                        </h4>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {[
                                                { code: '{{supplierName}}', desc: `Tên nhà cung cấp` },
                                                { code: '{{supplierEmail}}', desc: `Email nhà cung cấp` },
                                                { code: '{{code}}', desc: `Mã đơn mua hàng` },
                                                { code: '{{totalAmount}}', desc: `Tổng giá trị (VND)` },
                                                { code: '{{link}}', desc: `Đường dẫn xem PO` }
                                            ].map((item, idx) => (
                                                <li key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                    <code style={{ background: '#020617', color: '#ec4899', padding: '0.35rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'monospace', border: '1px solid #1e293b', width: 'max-content', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)' }}>
                                                        {item.code}
                                                    </code>
                                                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>- {item.desc}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {module === 'LEAD' && (
                                    <div style={{ paddingTop: '1.75rem', borderTop: '1px dashed #334155' }}>
                                        <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316' }}></div> BIẾN LEAD MỚI
                                        </h4>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {[
                                                { code: '{{leadName}}', desc: `Tên khách hàng / Lead` },
                                                { code: '{{leadEmail}}', desc: `Email Lead` },
                                                { code: '{{leadPhone}}', desc: `Số điện thoại Lead` },
                                                { code: '{{source}}', desc: `Nguồn khách` },
                                                { code: '{{assignedTo}}', desc: `Nhân viên phụ trách` },
                                                { code: '{{link}}', desc: `Đường dẫn xem Lead` }
                                            ].map((item, idx) => (
                                                <li key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                    <code style={{ background: '#020617', color: '#f97316', padding: '0.35rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'monospace', border: '1px solid #1e293b', width: 'max-content', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)' }}>
                                                        {item.code}
                                                    </code>
                                                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8', paddingLeft: '0.25rem' }}>- {item.desc}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
