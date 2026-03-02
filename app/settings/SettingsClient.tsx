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
        COMPANY_TAX: initialSettings.COMPANY_TAX || ''
    });

    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveSuccess(false);

        try {
            await updateSystemSettings(formData);
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
        </Card>
    );
}
