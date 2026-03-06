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
        INVOICE_CODE_FORMAT: initialSettings.INVOICE_CODE_FORMAT || 'INV{SEQ}'
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
        <Card style={{ maxWidth: '800px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1.5rem 0', color: 'var(--text-main)' }}>Cấu hình Thương hiệu & Thông tin Công ty</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                Các thông tin cấu hình dưới đây sẽ được sử dụng cho thiết kế ứng dụng (Sidebar, Header) và để tự động điền vào các mẫu Hợp đồng, Báo giá, Biên bản khi xuất PDF.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem 0', color: 'var(--text-main)' }}>Định dạng Sinh Mã Tự Động</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                        Tùy chỉnh cấu trúc mã tự tăng. Tiền tố viết tắt của công ty hoặc loại chứng từ. Hệ thống sẽ tự động thêm số thứ tự tăng dần vào cuối cùng một cách an toàn.
                    </p>
                    <div className="grid grid-cols-2 gap-8">
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
                                Kèm theo [Tháng]/[Năm] (VD: /06/2026)
                            </label>
                            <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-main)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Xem trước mẫu: </span>
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
                                Kèm theo [Tháng]/[Năm] (VD: /06/2026)
                            </label>
                            <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-main)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Xem trước mẫu: </span>
                                <strong style={{ color: 'var(--danger)', letterSpacing: '0.5px' }}>
                                    {invPrefix}{String(invStartSeq).padStart(4, '0')}{invHasDate ? '/06/2026' : ''}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>

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
