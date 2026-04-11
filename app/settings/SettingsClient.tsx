'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Save, CheckCircle2, Building2, Fingerprint, Link as LinkIcon, FileText } from 'lucide-react';
import { updateSystemSettings } from './actions';
import { useRouter } from 'next/navigation';

export function SettingsClient({ initialSettings }: { initialSettings: Record<string, string> }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('brand');

    const tabs = [
        { id: 'brand', label: 'Thương hiệu & Hệ thống', icon: Building2 },
        { id: 'codes', label: 'Tự động hóa Dữ liệu', icon: Fingerprint },
        { id: 'integrations', label: 'Tích hợp API & PBX', icon: LinkIcon },
        { id: 'documents', label: 'In ấn & Dấu chìm', icon: FileText }
    ];

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
        PBX_URL: initialSettings.PBX_URL || '',
        PBX_KEY: initialSettings.PBX_KEY || '',
        PBX_DOMAIN: initialSettings.PBX_DOMAIN || '',
        WATERMARK_ENABLED: initialSettings.WATERMARK_ENABLED || 'false',
        WATERMARK_TYPE: initialSettings.WATERMARK_TYPE || 'TEXT',
        WATERMARK_TEXT: initialSettings.WATERMARK_TEXT || 'BẢN SAO',
        WATERMARK_IMAGE_URL: initialSettings.WATERMARK_IMAGE_URL || '',
        WATERMARK_OPACITY: initialSettings.WATERMARK_OPACITY || '0.1',
        WATERMARK_ROTATION: initialSettings.WATERMARK_ROTATION || '-45',
        WATERMARK_COLOR: initialSettings.WATERMARK_COLOR || '#000000',
        WATERMARK_SIZE: initialSettings.WATERMARK_SIZE || '150',
        WATERMARK_DOCUMENTS: initialSettings.WATERMARK_DOCUMENTS || '["SALES_ESTIMATE","SALES_INVOICE","SALES_ORDER","SALES_PAYMENT","PURCHASE_ORDER","PURCHASE_BILL","PURCHASE_PAYMENT","CONTRACT","CONTRACT_APPENDIX","HANDOVER","PAYMENT_REQUEST","DISPATCH","QUOTE"]',
        BANK_INFO_ENABLED: initialSettings.BANK_INFO_ENABLED || 'false',
        BANK_INFO_CONTENT: initialSettings.BANK_INFO_CONTENT || 'Số tài khoản (Bank account): \nCTK: '
    });

    const [estStartSeq, setEstStartSeq] = useState(() => parseInt(initialSettings.ESTIMATE_START_SEQ || '1', 10) || 1);
    const [invStartSeq, setInvStartSeq] = useState(() => parseInt(initialSettings.INVOICE_START_SEQ || '1', 10) || 1);
    const [estPrefix, setEstPrefix] = useState(() => (initialSettings.ESTIMATE_CODE_FORMAT || 'BG{SEQ}').split('{')[0] || 'BG');
    const [estHasDate, setEstHasDate] = useState(() => (initialSettings.ESTIMATE_CODE_FORMAT || 'BG{SEQ}').includes('{MM}'));
    const [invPrefix, setInvPrefix] = useState(() => (initialSettings.INVOICE_CODE_FORMAT || 'INV{SEQ}').split('{')[0] || 'INV');
    const [invHasDate, setInvHasDate] = useState(() => (initialSettings.INVOICE_CODE_FORMAT || 'INV{SEQ}').includes('{MM}'));
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
            router.refresh(); 
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            alert("Có lỗi xảy ra khi lưu cấu hình!");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 w-full pb-10">
            {/* LEFT MENU - VERTICAL TABS */}
            <div className="w-full md:w-72 flex-shrink-0">
                <div className="sticky top-[100px] flex flex-col gap-2">
                    <h2 className="px-3 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Danh mục thiết lập</h2>
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl text-left font-medium transition-all ${
                                    isActive 
                                    ? 'bg-primary shadow-sm text-white' 
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                                }`}
                            >
                                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT CONTENT - DYNAMIC FORM */}
            <div className="flex-1 max-w-[1200px]">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    
                    {/* TAB: THƯƠNG HIỆU */}
                    {activeTab === 'brand' && (
                        <Card className="p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Thương hiệu & Hệ thống</h2>
                            <p className="text-slate-500 text-sm mb-8">Thông tin dưới đây sẽ hiển thị trên Header của hệ thống và áp dụng vào biểu mẫu hợp đồng PDF.</p>
                            
                            <div className="flex flex-col gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Tên hiển thị (Tên ngắn/Thương hiệu trên Header)" value={formData.COMPANY_DISPLAY_NAME || formData.COMPANY_NAME} onChange={e => setFormData({ ...formData, COMPANY_DISPLAY_NAME: e.target.value })} required placeholder="Vd: TRỊNH GIA" />
                                    <Input label="Tên đầy đủ (Dùng trên Báo cáo, Văn bản)" value={formData.COMPANY_FULL_NAME || formData.COMPANY_NAME} onChange={e => setFormData({ ...formData, COMPANY_FULL_NAME: e.target.value })} required placeholder="Vd: CÔNG TY TNHH TRỊNH GIA" />
                                </div>

                                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        {formData.COMPANY_LOGO ? (
                                            <div className="w-[80px] h-[80px] bg-white border border-slate-200 rounded-xl overflow-hidden p-2 shadow-sm">
                                                <img src={formData.COMPANY_LOGO} alt="Logo" className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-[80px] h-[80px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 bg-white">Logo</div>
                                        )}
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Logo hệ thống</label>
                                            <p className="text-xs text-slate-500 mb-3">Tỷ lệ 1:1, hỗ trợ định dạng PNG, JPG, SVG.</p>
                                            <input
                                                type="file" id="logo-upload" accept="image/*" className="hidden"
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
                                            <Button type="button" variant="secondary" onClick={() => document.getElementById('logo-upload')?.click()} disabled={isUploadingLogo} className="h-9 text-xs font-medium">
                                                {isUploadingLogo ? 'Đang tải lên...' : 'Đổi hình đại diện'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Số điện thoại" value={formData.COMPANY_PHONE} onChange={e => setFormData({ ...formData, COMPANY_PHONE: e.target.value })} placeholder="Vd: 0909 123 456" />
                                    <Input label="Email liên hệ" type="email" value={formData.COMPANY_EMAIL} onChange={e => setFormData({ ...formData, COMPANY_EMAIL: e.target.value })} placeholder="Vd: lienhe@truongthinh.com" />
                                </div>
                                <Input label="Địa chỉ trụ sở" value={formData.COMPANY_ADDRESS} onChange={e => setFormData({ ...formData, COMPANY_ADDRESS: e.target.value })} placeholder="Vd: 123 Nguyễn Văn Linh, Quận 7, TP.HCM" />
                                <Input label="Mã số thuế" value={formData.COMPANY_TAX} onChange={e => setFormData({ ...formData, COMPANY_TAX: e.target.value })} placeholder="Vd: 0102030405" />
                            </div>
                        </Card>
                    )}

                    {/* TAB: MÃ SỐ TỰ ĐỘNG */}
                    {activeTab === 'codes' && (
                        <Card className="p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Tự động hóa Dữ liệu (Auto-Code)</h2>
                            <p className="text-slate-500 text-sm mb-8">Tùy chỉnh bộ sinh mã tự tăng cho các chứng từ nghiệp vụ.</p>
                            
                            <div className="grid grid-cols-1 gap-6">
                                {/* BÁO GIÁ */}
                                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><FileText size={20} /></div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 text-base">Cấu trúc Mã Báo Giá</h3>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                        <Input label="Tiền tố chữ" value={estPrefix} onChange={e => setEstPrefix(e.target.value.toUpperCase())} placeholder="Vd: BG-" required />
                                        <Input label="Số đếm khởi đầu" type="number" min={1} value={estStartSeq} onChange={e => setEstStartSeq(parseInt(e.target.value, 10) || 1)} required />
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-sm">
                                            <input type="checkbox" checked={estHasDate} onChange={(e) => setEstHasDate(e.target.checked)} className="w-4 h-4 accent-primary" />
                                            Gắn theo tháng/năm [MM]/[YYYY]
                                        </label>
                                        <div className="text-sm font-medium text-slate-500 mt-2 sm:mt-0">
                                            Bản xem trước: <span className="text-blue-600 ml-1 bg-blue-50 px-2 py-1 rounded-md">{estPrefix}{String(estStartSeq).padStart(4, '0')}{estHasDate ? '/06/2026' : ''}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* HÓA ĐƠN */}
                                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><Fingerprint size={20} /></div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 text-base">Cấu trúc Mã Hóa Đơn</h3>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                        <Input label="Tiền tố chữ" value={invPrefix} onChange={e => setInvPrefix(e.target.value.toUpperCase())} placeholder="Vd: INV" required />
                                        <Input label="Số đếm khởi đầu" type="number" min={1} value={invStartSeq} onChange={e => setInvStartSeq(parseInt(e.target.value, 10) || 1)} required />
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 text-sm">
                                            <input type="checkbox" checked={invHasDate} onChange={(e) => setInvHasDate(e.target.checked)} className="w-4 h-4 accent-primary" />
                                            Gắn theo tháng/năm [MM]/[YYYY]
                                        </label>
                                        <div className="text-sm font-medium text-slate-500 mt-2 sm:mt-0">
                                            Bản xem trước: <span className="text-red-500 ml-1 bg-red-50 px-2 py-1 rounded-md">{invPrefix}{String(invStartSeq).padStart(4, '0')}{invHasDate ? '/06/2026' : ''}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* TAB: TÍCH HỢP */}
                    {activeTab === 'integrations' && (
                        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
                            <Card className="p-6 md:p-8">
                                <h2 className="text-xl font-bold text-slate-800 mb-2">Cảnh báo Thời gian thực (Pusher)</h2>
                                <p className="text-slate-500 text-sm mb-6">WebSockets để đẩy thông báo realtime tới toàn hệ thống.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input label="Pusher App ID" value={formData.PUSHER_APP_ID} onChange={e => setFormData({ ...formData, PUSHER_APP_ID: e.target.value })} placeholder="Vd: 1234567" />
                                    <Input label="Pusher Cluster" value={formData.PUSHER_CLUSTER} onChange={e => setFormData({ ...formData, PUSHER_CLUSTER: e.target.value })} placeholder="Vd: ap1" />
                                    <Input label="Pusher Key" value={formData.PUSHER_KEY} onChange={e => setFormData({ ...formData, PUSHER_KEY: e.target.value })} placeholder="Vd: abcdef123456" />
                                    <Input label="Pusher Secret" type="password" value={formData.PUSHER_SECRET} onChange={e => setFormData({ ...formData, PUSHER_SECRET: e.target.value })} placeholder="Vd: ******" />
                                </div>
                            </Card>

                            <Card className="p-6 md:p-8">
                                <h2 className="text-xl font-bold text-slate-800 mb-2">Tổng đài (PBX / VoiceCloud)</h2>
                                <p className="text-slate-500 text-sm mb-6">Liên kết Gateway Cloud PBX để thực hiện gọi trực tuyến.</p>
                                <div className="flex flex-col gap-4">
                                    <Input label="PBX Endpoint (URL)" value={formData.PBX_URL} onChange={e => setFormData({ ...formData, PBX_URL: e.target.value })} placeholder="Vd: portal.voicecloud.vn" />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input label="API Key" type="password" value={formData.PBX_KEY} onChange={e => setFormData({ ...formData, PBX_KEY: e.target.value })} placeholder="Vd: 2d634db8..." />
                                        <Input label="Sip Domain" value={formData.PBX_DOMAIN} onChange={e => setFormData({ ...formData, PBX_DOMAIN: e.target.value })} placeholder="Vd: trinhgia.incall.vn" />
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* TAB: TÀI LIỆU */}
                    {activeTab === 'documents' && (
                        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
                            
                            {/* BANK ACCOUNT */}
                            <Card className="p-6 md:p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800 mb-1">Thông tin Ngân hàng</h2>
                                        <p className="text-slate-500 text-sm">Hiển thị thông tin thanh toán góc dưới chứng từ IN / PDF.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={formData.BANK_INFO_ENABLED === 'true'} onChange={(e) => setFormData({ ...formData, BANK_INFO_ENABLED: e.target.checked ? 'true' : 'false' })} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                                {formData.BANK_INFO_ENABLED === 'true' && (
                                    <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200">
                                        <textarea value={formData.BANK_INFO_CONTENT} onChange={e => setFormData({ ...formData, BANK_INFO_CONTENT: e.target.value })} className="w-full min-h-[140px] p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium text-slate-700 leading-relaxed" placeholder="Số tài khoản:..." />
                                    </div>
                                )}
                            </Card>

                            {/* WATERMARK */}
                            <Card className="p-6 md:p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800 mb-1">Dấu Chìm (Watermark)</h2>
                                        <p className="text-slate-500 text-sm">Bảo vệ bản quyền (in chìm mặt sau) các chứng từ xuất ra.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={formData.WATERMARK_ENABLED === 'true'} onChange={(e) => setFormData({ ...formData, WATERMARK_ENABLED: e.target.checked ? 'true' : 'false' })} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>

                                {formData.WATERMARK_ENABLED === 'true' && (
                                    <div className="flex flex-col gap-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50/50 rounded-xl border border-slate-200">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Loại Dấu Chìm</label>
                                                <select value={formData.WATERMARK_TYPE} onChange={e => setFormData({ ...formData, WATERMARK_TYPE: e.target.value })} className="w-full h-10 px-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium">
                                                    <option value="TEXT">Văn bản (Chữ)</option>
                                                    <option value="IMAGE">Hình ảnh (Logo)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Kích thước (px)</label>
                                                <input type="number" value={formData.WATERMARK_SIZE} onChange={e => setFormData({ ...formData, WATERMARK_SIZE: e.target.value })} min="10" max="1000" className="w-full h-10 px-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium" />
                                            </div>
                                        </div>

                                        {formData.WATERMARK_TYPE === 'TEXT' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input label="Nội dung hiển thị" value={formData.WATERMARK_TEXT} onChange={e => setFormData({ ...formData, WATERMARK_TEXT: e.target.value })} />
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Màu chữ</label>
                                                    <input type="color" value={formData.WATERMARK_COLOR} onChange={e => setFormData({ ...formData, WATERMARK_COLOR: e.target.value })} className="h-10 w-full p-1 border border-slate-300 rounded-lg cursor-pointer" />
                                                </div>
                                            </div>
                                        )}

                                        {formData.WATERMARK_TYPE === 'IMAGE' && (
                                            <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200">
                                                <label className="block text-sm font-semibold text-slate-700 mb-3">Hình ảnh Watermark</label>
                                                <div className="flex items-center gap-5">
                                                    {formData.WATERMARK_IMAGE_URL ? (
                                                        <div className="w-[80px] h-[80px] border border-slate-200 rounded-xl bg-white flex justify-center items-center p-1 shadow-sm"><img src={formData.WATERMARK_IMAGE_URL} alt="Watermark" className="max-w-full max-h-full object-contain" /></div>
                                                    ) : (
                                                        <div className="w-[80px] h-[80px] border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 bg-white">Chưa có</div>
                                                    )}
                                                    <div>
                                                        <input type="file" id="watermark-upload" accept="image/*" className="hidden" onChange={async (e) => {
                                                            const file = e.target.files?.[0]; if (!file) return;
                                                            try {
                                                                const form = new FormData(); form.append('file', file);
                                                                const res = await fetch('/api/upload', { method: 'POST', body: form });
                                                                if (!res.ok) throw new Error('Upload failed');
                                                                const data = await res.json(); setFormData(prev => ({ ...prev, WATERMARK_IMAGE_URL: data.url }));
                                                            } catch (error) { alert('Lỗi khi tải ảnh lên!'); } finally { if (e.target) e.target.value = ''; }
                                                        }} />
                                                        <Button type="button" variant="secondary" onClick={() => document.getElementById('watermark-upload')?.click()} className="h-9 text-xs font-medium">Tải file PNG (Trong suốt)</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
                                            <div>
                                                <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2"><span>Độ nét (Opacity)</span><span className="text-primary">{formData.WATERMARK_OPACITY}</span></label>
                                                <input type="range" min="0.05" max="1" step="0.05" value={formData.WATERMARK_OPACITY} onChange={e => setFormData({ ...formData, WATERMARK_OPACITY: e.target.value })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                                            </div>
                                            <div>
                                                <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2"><span>Góc chéo (Rotation)</span><span className="text-primary">{formData.WATERMARK_ROTATION}°</span></label>
                                                <input type="range" min="-90" max="90" step="1" value={formData.WATERMARK_ROTATION} onChange={e => setFormData({ ...formData, WATERMARK_ROTATION: e.target.value })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-6 border-t border-slate-100">
                                            <label className="block text-sm font-semibold text-slate-800 mb-4">Gắn dấu chìm tự động vào các Chứng từ:</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {[
                                                    { id: 'SALES_ESTIMATE', label: 'Báo giá ERP' },
                                                    { id: 'SALES_INVOICE', label: 'Hóa đơn / Công nợ' },
                                                    { id: 'SALES_ORDER', label: 'Đơn đặt hàng (SO)' },
                                                    { id: 'SALES_PAYMENT', label: 'Phiếu thu' },
                                                    { id: 'PURCHASE_ORDER', label: 'Gọi hàng (PO)' },
                                                    { id: 'PURCHASE_BILL', label: 'Hóa đơn nhập' },
                                                    { id: 'PURCHASE_PAYMENT', label: 'Phiếu chi' },
                                                    { id: 'CONTRACT', label: 'Hợp đồng' },
                                                    { id: 'CONTRACT_APPENDIX', label: 'Phụ lục HĐ' },
                                                    { id: 'HANDOVER', label: 'Biên bản Giao hàng' },
                                                    { id: 'PAYMENT_REQUEST', label: 'Đề nghị Thanh toán' },
                                                    { id: 'DISPATCH', label: 'Lệnh điều động' },
                                                    { id: 'QUOTE', label: 'Báo giá CRM' }
                                                ].map(doc => {
                                                    const isChecked = formData.WATERMARK_DOCUMENTS.includes(`"${doc.id}"`);
                                                    return (
                                                        <label key={doc.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-primary/5 border-primary/30 text-primary font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                                            <input type="checkbox" checked={isChecked} onChange={e => {
                                                                let arr = []; try { arr = JSON.parse(formData.WATERMARK_DOCUMENTS || '[]'); } catch { }
                                                                if (e.target.checked) { if (!arr.includes(doc.id)) arr.push(doc.id); } else { arr = arr.filter((x: string) => x !== doc.id); }
                                                                setFormData({ ...formData, WATERMARK_DOCUMENTS: JSON.stringify(arr) });
                                                            }} className="w-4 h-4 accent-primary" />
                                                            <span className="text-sm">{doc.label}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* STICKY ACTION BAR */}
                    <div className="sticky bottom-6 z-10 flex items-center justify-between p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-lg mt-4">
                        <div className="text-sm font-semibold text-slate-800 ml-2 animate-in fade-in">
                            Đang cấu hình: <span className="text-primary">{tabs.find(t => t.id === activeTab)?.label}</span>
                        </div>
                        <div className="flex gap-4 items-center">
                            {saveSuccess && (
                                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-bold animate-in slide-in-from-right-4">
                                    <CheckCircle2 size={16} /> Đã lưu cài đặt
                                </div>
                            )}
                            <Button type="submit" disabled={isSaving} className="gap-2 h-11 px-8 rounded-xl font-bold shadow-sm">
                                <Save size={18} /> {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
