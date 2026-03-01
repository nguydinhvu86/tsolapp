import React from 'react';
import { Info } from 'lucide-react';

export function TemplateVariablesGuide() {
    return (
        <div style={{
            backgroundColor: 'rgba(79, 70, 229, 0.05)',
            border: '1px solid rgba(79, 70, 229, 0.2)',
            padding: '1rem',
            borderRadius: 'var(--radius)',
            marginTop: '0.5rem',
            marginBottom: '0.5rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <Info size={16} /> Tránh viết sai! Hướng dẫn dùng Biến Chung
            </div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Sao chép các mã bên dưới dán vào nội dung mẫu để hệ thống tự động điền thông tin Khách hàng lúc xuất file:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <VariableTag code="{{TEN_KHACH_HANG}}" label="Tên KH" />
                <VariableTag code="{{EMAIL_KHACH_HANG}}" label="Email KH" />
                <VariableTag code="{{SDT_KHACH_HANG}}" label="Số ĐT KH" />
                <VariableTag code="{{DIA_CHI_KHACH_HANG}}" label="Địa chỉ KH" />
                <VariableTag code="{{MST_KHACH_HANG}}" label="Mã số thuế KH" />
                <VariableTag code="{{NGAY_TAO}}" label="Ngày xuất file" />
            </div>
        </div>
    );
}

function VariableTag({ code, label }: { code: string, label: string }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', fontSize: '0.8125rem',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '0.25rem 0.5rem', gap: '0.375rem',
            boxShadow: 'var(--shadow-sm)'
        }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
            <code style={{ color: 'var(--primary)', fontWeight: 700, userSelect: 'all', background: 'rgba(79, 70, 229, 0.1)', padding: '0 0.25rem', borderRadius: '4px' }}>
                {code}
            </code>
        </div>
    );
}
