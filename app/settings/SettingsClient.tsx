'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Save, CheckCircle2 } from 'lucide-react';
import { updateSystemSettings } from './actions';
import { useRouter } from 'next/navigation';

export function SettingsClient({ initialSettings }: { initialSettings: Record<string, string> }) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        COMPANY_NAME: initialSettings.COMPANY_NAME || '',
        COMPANY_DISPLAY_NAME: initialSettings.COMPANY_DISPLAY_NAME || '',
        COMPANY_FULL_NAME: initialSettings.COMPANY_FULL_NAME || '',
        COMPANY_LOGO: initialSettings.COMPANY_LOGO || '',
        COMPANY_PHONE: initialSettings.COMPANY_PHONE || '',
        COMPANY_EMAIL: initialSettings.COMPANY_EMAIL || '',
        COMPANY_ADDRESS: initialSettings.COMPANY_ADDRESS || '',
        COMPANY_TAX: initialSettings.COMPANY_TAX || '',
        ESTIMATE_CODE_FORMAT: initialSettings.ESTIMATE_CODE_FORMAT || 'BG{SEQ}',
        INVOICE_CODE_FORMAT: initialSettings.INVOICE_CODE_FORMAT || 'INV{SEQ}',
        PUSHER_APP_ID: initialSettings.PUSHER_APP_ID || '',
        PUSHER_KEY: initialSettings.PUSHER_KEY || '',
        PUSHER_SECRET: initialSettings.PUSHER_SECRET || '',
        PUSHER_CLUSTER: initialSettings.PUSHER_CLUSTER || '',
        WATERMARK_ENABLED: initialSettings.WATERMARK_ENABLED || 'false',
        WATERMARK_TYPE: initialSettings.WATERMARK_TYPE || 'TEXT',
        WATERMARK_TEXT: initialSettings.WATERMARK_TEXT || 'BẢN SAO',
        WATERMARK_IMAGE_URL: initialSettings.WATERMARK_IMAGE_URL || '',
        WATERMARK_OPACITY: initialSettings.WATERMARK_OPACITY || '0.1',
        WATERMARK_ROTATION: initialSettings.WATERMARK_ROTATION || '-45',
        WATERMARK_COLOR: initialSettings.WATERMARK_COLOR || '#000000',
        WATERMARK_SIZE: initialSettings.WATERMARK_SIZE || '150',
        WATERMARK_DOCUMENTS: initialSettings.WATERMARK_DOCUMENTS || '["SALES_ESTIMATE","SALES_INVOICE","SALES_ORDER","SALES_PAYMENT","PURCHASE_ORDER","PURCHASE_BILL","PURCHASE_PAYMENT","CONTRACT","CONTRACT_APPENDIX","HANDOVER","PAYMENT_REQUEST","DISPATCH","QUOTE"]'
    });

    const [estStartSeq, setEstStartSeq] = useState(() => {
        return parseInt(initialSettings.ESTIMATE_START_SEQ || '1', 10) || 1;
    });

    const [invStartSeq, setInvStartSeq] = useState(() => {
        return parseInt(initialSettings.INVOICE_START_SEQ || '1', 10) || 1;
    });

    const [estPrefix, setEstPrefix] = useState(() => {
        return (initialSettings.ESTIMATE_CODE_FORMAT || 'BG{SEQ}').split('{')[0] || 'BG';
    });
    const [estHasDate, setEstHasDate] = useState(() => {
        return (initialSettings.ESTIMATE_CODE_FORMAT || 'BG{SEQ}').includes('{MM}');
    });

    const [invPrefix, setInvPrefix] = useState(() => {
        return (initialSettings.INVOICE_CODE_FORMAT || 'INV{SEQ}').split('{')[0] || 'INV';
    });
    const [invHasDate, setInvHasDate] = useState(() => {
        return (initialSettings.INVOICE_CODE_FORMAT || 'INV{SEQ}').includes('{MM}');
    });

    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const finalEstimateFormat = `${estPrefix}{SEQ}${estHasDate ? '/{MM}/{YYYY}' : ''}`;
            const finalInvoiceFormat = `${invPrefix}{SEQ}${invHasDate ? '/{MM}/{YYYY}' : ''}`;

            await updateSystemSettings({
                ...formData,
                ESTIMATE_CODE_FORMAT: finalEstimateFormat,
                INVOICE_CODE_FORMAT: finalInvoiceFormat,
                ESTIMATE_START_SEQ: estStartSeq.toString(),
                INVOICE_START_SEQ: invStartSeq.toString()
            });
            setSaveSuccess(true);
            router.refresh(); // Refresh để header/sidebar update (nếu cần load lại auth session context - hoặc sidebar fetch again)

            // Xóa thông báo thành công sau 3 giây
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            alert("Có lỗi xảy ra khi lưu cấu hình!");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="w-full max-w-none">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1.5rem 0', color: 'var(--text-main)' }}>Cấu hình Thương hiệu & Hệ thống</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                Các thông tin cấu hình dưới đây sẽ được sử dụng cho thiết kế ứng dụng (Sidebar, Header) và để tự động điền vào các mẫu Hợp đồng, Báo giá, Biên bản khi xuất PDF.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">

                    {/* CỘT TRÁI (LEFT COLUMN) */}
                    <div className="flex flex-col gap-5">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Tên hiển thị (Tên ngắn/Thương hiệu trên Header)"
                                value={formData.COMPANY_DISPLAY_NAME || formData.COMPANY_NAME}
                                onChange={e => setFormData({ ...formData, COMPANY_DISPLAY_NAME: e.target.value })}
                                required
                                placeholder="Vd: TRỊNH GIA"
                            />
                            <Input
                                label="Tên đầy đủ (Dùng trên Báo cáo, Văn bản)"
                                value={formData.COMPANY_FULL_NAME || formData.COMPANY_NAME}
                                onChange={e => setFormData({ ...formData, COMPANY_FULL_NAME: e.target.value })}
                                required
                                placeholder="Vd: CÔNG TY TNHH TRỊNH GIA"
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Logo hệ thống</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {formData.COMPANY_LOGO ? (
                                    <img src={formData.COMPANY_LOGO} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }} />
                                ) : (
                                    <div style={{ width: '80px', height: '80px', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Chưa có</div>
                                )}
                                <div>
                                    <input
                                        type="file"
                                        id="logo-upload"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setIsUploadingLogo(true);
                                            try {
                                                const form = new FormData();
                                                form.append('file', file);
                                                const res = await fetch('/api/upload', { method: 'POST', body: form });
                                                if (!res.ok) throw new Error('Upload failed');
                                                const data = await res.json();
                                                setFormData(prev => ({ ...prev, COMPANY_LOGO: data.url }));
                                            } catch (error) {
                                                alert('Lỗi khi tải ảnh lên!');
                                            } finally {
                                                setIsUploadingLogo(false);
                                                if (e.target) e.target.value = '';
                                            }
                                        }}
                                    />
                                    <Button type="button" variant="secondary" onClick={() => document.getElementById('logo-upload')?.click()} disabled={isUploadingLogo}>
                                        {isUploadingLogo ? 'Đang tải...' : 'Tải lên Logo'}
                                    </Button>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Khuyến nghị ảnh vuông, định dạng PNG/JPG/SVG.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Số điện thoại"
                                value={formData.COMPANY_PHONE}
                                onChange={e => setFormData({ ...formData, COMPANY_PHONE: e.target.value })}
                                placeholder="Vd: 0909 123 456"
                            />
                            <Input
                                label="Email liên hệ"
                                type="email"
                                value={formData.COMPANY_EMAIL}
                                onChange={e => setFormData({ ...formData, COMPANY_EMAIL: e.target.value })}
                                placeholder="Vd: lienhe@truongthinh.com"
                            />
                        </div>

                        <Input
                            label="Địa chỉ trụ sở"
                            value={formData.COMPANY_ADDRESS}
                            onChange={e => setFormData({ ...formData, COMPANY_ADDRESS: e.target.value })}
                            placeholder="Vd: 123 Nguyễn Văn Linh, Quận 7, TP.HCM"
                        />

                        <Input
                            label="Mã số thuế"
                            value={formData.COMPANY_TAX}
                            onChange={e => setFormData({ ...formData, COMPANY_TAX: e.target.value })}
                            placeholder="Vd: 0102030405"
                        />

                        {/* AUTO-GENERATED CODES FORMAT */}
                        <div style={{ marginTop: '0.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem 0', color: 'var(--text-main)' }}>Định dạng Sinh Mã Tự Động</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                Tùy chỉnh cấu trúc mã tự tăng. Tiền tố viết tắt của công ty hoặc loại chứng từ.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* BÁO GIÁ */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--primary)' }}></div>
                                        Mã Báo Giá
                                    </div>
                                    <Input
                                        label="Tiền tố chữ"
                                        value={estPrefix}
                                        onChange={e => setEstPrefix(e.target.value.toUpperCase())}
                                        placeholder="Vd: BG-"
                                        required
                                    />
                                    <Input
                                        label="Số đếm khởi đầu"
                                        type="number"
                                        min={1}
                                        value={estStartSeq}
                                        onChange={e => setEstStartSeq(parseInt(e.target.value, 10) || 1)}
                                        required
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                                        <input
                                            type="checkbox"
                                            checked={estHasDate}
                                            onChange={(e) => setEstHasDate(e.target.checked)}
                                            style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                        />
                                        Kèm theo [Tháng]/[Năm]
                                    </label>
                                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-main)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Mẫu: </span>
                                        <strong style={{ color: 'var(--primary)', letterSpacing: '0.5px' }}>
                                            {estPrefix}{String(estStartSeq).padStart(4, '0')}{estHasDate ? '/06/2026' : ''}
                                        </strong>
                                    </div>
                                </div>

                                {/* HÓA ĐƠN */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--danger)' }}></div>
                                        Mã Hóa Đơn
                                    </div>
                                    <Input
                                        label="Tiền tố chữ"
                                        value={invPrefix}
                                        onChange={e => setInvPrefix(e.target.value.toUpperCase())}
                                        placeholder="Vd: INV"
                                        required
                                    />
                                    <Input
                                        label="Số đếm khởi đầu"
                                        type="number"
                                        min={1}
                                        value={invStartSeq}
                                        onChange={e => setInvStartSeq(parseInt(e.target.value, 10) || 1)}
                                        required
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                                        <input
                                            type="checkbox"
                                            checked={invHasDate}
                                            onChange={(e) => setInvHasDate(e.target.checked)}
                                            style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                        />
                                        Kèm theo [Tháng]/[Năm]
                                    </label>
                                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-main)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Mẫu: </span>
                                        <strong style={{ color: 'var(--danger)', letterSpacing: '0.5px' }}>
                                            {invPrefix}{String(invStartSeq).padStart(4, '0')}{invHasDate ? '/06/2026' : ''}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CỘT PHẢI (RIGHT COLUMN) */}
                    <div className="flex flex-col gap-5">

                        {/* PUSHER CONFIGURATION */}
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Cảnh báo Thời gian thực (Pusher)
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                Cấu hình dịch vụ Pusher để hỗ trợ đẩy thông báo ngay lập tức mà không cần tải lại trang. Lấy từ tài khoản Pusher Channels.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Pusher App ID"
                                    value={formData.PUSHER_APP_ID}
                                    onChange={e => setFormData({ ...formData, PUSHER_APP_ID: e.target.value })}
                                    placeholder="Vd: 1234567"
                                />
                                <Input
                                    label="Pusher Cluster"
                                    value={formData.PUSHER_CLUSTER}
                                    onChange={e => setFormData({ ...formData, PUSHER_CLUSTER: e.target.value })}
                                    placeholder="Vd: ap1"
                                />
                                <Input
                                    label="Pusher Key"
                                    value={formData.PUSHER_KEY}
                                    onChange={e => setFormData({ ...formData, PUSHER_KEY: e.target.value })}
                                    placeholder="Vd: abcdef123456"
                                />
                                <Input
                                    label="Pusher Secret"
                                    type="password"
                                    value={formData.PUSHER_SECRET}
                                    onChange={e => setFormData({ ...formData, PUSHER_SECRET: e.target.value })}
                                    placeholder="Vd: ******"
                                />
                            </div>
                        </div>

                        {/* WATERMARK SETTINGS */}
                        <div style={{ marginTop: '0.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Cấu hình Dấu Chìm (Watermark)
                                </h3>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: formData.WATERMARK_ENABLED === 'true' ? 'var(--primary)' : 'var(--text-muted)' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.WATERMARK_ENABLED === 'true'}
                                        onChange={(e) => setFormData({ ...formData, WATERMARK_ENABLED: e.target.checked ? 'true' : 'false' })}
                                        style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                    />
                                    Bật Dấu Chìm khi in, xem chứng từ
                                </label>
                            </div>

                            {formData.WATERMARK_ENABLED === 'true' && (
                                <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Loại Dấu Chìm</label>
                                            <select
                                                value={formData.WATERMARK_TYPE}
                                                onChange={e => setFormData({ ...formData, WATERMARK_TYPE: e.target.value })}
                                                style={{ height: '40px', padding: '0 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-main)' }}
                                            >
                                                <option value="TEXT">Văn bản (Chữ)</option>
                                                <option value="IMAGE">Hình ảnh (Logo)</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Kích thước (px)</label>
                                            <input
                                                type="number"
                                                value={formData.WATERMARK_SIZE}
                                                onChange={e => setFormData({ ...formData, WATERMARK_SIZE: e.target.value })}
                                                min="10" max="1000"
                                                style={{ height: '40px', padding: '0 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-main)' }}
                                            />
                                        </div>
                                    </div>

                                    {formData.WATERMARK_TYPE === 'TEXT' && (
                                        <div className="grid grid-cols-2 gap-4" style={{ marginTop: '1rem' }}>
                                            <Input
                                                label="Nội dung chữ"
                                                value={formData.WATERMARK_TEXT}
                                                onChange={e => setFormData({ ...formData, WATERMARK_TEXT: e.target.value })}
                                            />
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Màu chữ</label>
                                                <input
                                                    type="color"
                                                    value={formData.WATERMARK_COLOR}
                                                    onChange={e => setFormData({ ...formData, WATERMARK_COLOR: e.target.value })}
                                                    style={{ height: '40px', width: '100%', padding: '0.2rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {formData.WATERMARK_TYPE === 'IMAGE' && (
                                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Hình ảnh Dấu Chìm</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                {formData.WATERMARK_IMAGE_URL ? (
                                                    <img src={formData.WATERMARK_IMAGE_URL} alt="Watermark" style={{ width: '80px', height: '80px', objectFit: 'contain', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }} />
                                                ) : (
                                                    <div style={{ width: '80px', height: '80px', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Chưa có</div>
                                                )}
                                                <div>
                                                    <input
                                                        type="file" id="watermark-upload" accept="image/*" style={{ display: 'none' }}
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            try {
                                                                const form = new FormData(); form.append('file', file);
                                                                const res = await fetch('/api/upload', { method: 'POST', body: form });
                                                                if (!res.ok) throw new Error('Upload failed');
                                                                const data = await res.json();
                                                                setFormData(prev => ({ ...prev, WATERMARK_IMAGE_URL: data.url }));
                                                            } catch (error) {
                                                                alert('Lỗi khi tải ảnh lên!');
                                                            } finally {
                                                                if (e.target) e.target.value = '';
                                                            }
                                                        }}
                                                    />
                                                    <Button type="button" variant="secondary" onClick={() => document.getElementById('watermark-upload')?.click()}>
                                                        Tải lên Ảnh
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4" style={{ marginTop: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Độ mờ (đục) (Opactity: {formData.WATERMARK_OPACITY})</label>
                                            <input
                                                type="range" min="0.05" max="1" step="0.05"
                                                value={formData.WATERMARK_OPACITY}
                                                onChange={e => setFormData({ ...formData, WATERMARK_OPACITY: e.target.value })}
                                                style={{ accentColor: 'var(--primary)' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Góc nghiêng ({formData.WATERMARK_ROTATION}°)</label>
                                            <input
                                                type="range" min="-90" max="90" step="1"
                                                value={formData.WATERMARK_ROTATION}
                                                onChange={e => setFormData({ ...formData, WATERMARK_ROTATION: e.target.value })}
                                                style={{ accentColor: 'var(--primary)' }}
                                            />
                                        </div>
                                    </div>

                                    {/* DOCUMENT SELECTIONS */}
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed var(--border)' }}>
                                        <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                                            Áp dụng Dấu chìm cho các loại Văn bản sau:
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {[
                                                { id: 'SALES_ESTIMATE', label: 'Báo giá ERP (Sales)' },
                                                { id: 'SALES_INVOICE', label: 'Hóa đơn / Công nợ' },
                                                { id: 'SALES_ORDER', label: 'Đơn đặt hàng (Sales)' },
                                                { id: 'SALES_PAYMENT', label: 'Phiếu thu' },
                                                { id: 'PURCHASE_ORDER', label: 'Đơn đặt hàng (PO)' },
                                                { id: 'PURCHASE_BILL', label: 'Hóa đơn nhập (Bill)' },
                                                { id: 'PURCHASE_PAYMENT', label: 'Phiếu chi' },
                                                { id: 'CONTRACT', label: 'Hợp đồng' },
                                                { id: 'CONTRACT_APPENDIX', label: 'Phụ lục HĐ' },
                                                { id: 'HANDOVER', label: 'Biên bản Giao hàng' },
                                                { id: 'PAYMENT_REQUEST', label: 'Đề nghị Thanh toán' },
                                                { id: 'DISPATCH', label: 'Lệnh điều động' },
                                                { id: 'QUOTE', label: 'Báo giá CRM (Lead)' }
                                            ].map(doc => {
                                                const isChecked = formData.WATERMARK_DOCUMENTS.includes(`"${doc.id}"`);
                                                return (
                                                    <label key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={e => {
                                                                let arr = [];
                                                                try { arr = JSON.parse(formData.WATERMARK_DOCUMENTS || '[]'); } catch { }
                                                                if (e.target.checked) {
                                                                    if (!arr.includes(doc.id)) arr.push(doc.id);
                                                                } else {
                                                                    arr = arr.filter((x: string) => x !== doc.id);
                                                                }
                                                                setFormData({ ...formData, WATERMARK_DOCUMENTS: JSON.stringify(arr) });
                                                            }}
                                                            style={{ accentColor: 'var(--primary)', width: 15, height: 15, cursor: 'pointer' }}
                                                        />
                                                        {doc.label}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* BOTTOM SPANNING SAVE BUTTON */}
                <div className="flex gap-4 items-center justify-end" style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    {saveSuccess && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontSize: '0.875rem', fontWeight: 500 }}>
                            <CheckCircle2 size={18} /> Đã lưu cấu hình thành công
                        </div>
                    )}
                    <Button type="submit" disabled={isSaving} className="gap-2">
                        <Save size={18} /> {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                    </Button>
                </div>
            </form>
        </Card >
    );
}
