'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { 
    Save, 
    CheckCircle2, 
    Building2, 
    Fingerprint, 
    Link as LinkIcon, 
    FileText, 
    Sliders,
    Settings,
    UploadCloud,
    Radio,
    Sparkles
} from 'lucide-react';
import { updateSystemSettings } from './actions';
import { useRouter } from 'next/navigation';

export function SettingsClient({ initialSettings }: { initialSettings: Record<string, string> }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('brand');

    const tabs = [
        { id: 'brand', label: 'Thương hiệu & Công ty', icon: Building2, desc: 'Tên, logo, thông tin pháp lý' },
        { id: 'codes', label: 'Tự động hóa Mã số', icon: Fingerprint, desc: 'Quy tắc sinh mã báo giá, hóa đơn' },
        { id: 'integrations', label: 'Tích hợp API & PBX', icon: LinkIcon, desc: 'Pusher realtime, tổng đài thoại' },
        { id: 'documents', label: 'In ấn & Dấu chìm', icon: FileText, desc: 'Thông tin tài khoản, watermark' }
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
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">Cài Đặt Hệ Thống</h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                <Sparkles className="w-3.5 h-3.5" />
                                Cấu hình chung
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Tùy biến thương hiệu doanh nghiệp, quy tắc sinh mã tự động và tích hợp bên thứ ba</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {saveSuccess && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-bold animate-fade-in">
                            <CheckCircle2 className="w-4 h-4" /> Đã lưu thành công
                        </div>
                    )}
                    <Button 
                        type="submit" 
                        form="settings-form" 
                        disabled={isSaving} 
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                    >
                        <Save className="w-4 h-4" /> {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                    </Button>
                </div>
            </div>

            {/* Main Tabs Layout */}
            <div className="flex flex-col md:flex-row gap-6">
                {/* Left Navigation */}
                <div className="w-full md:w-80 shrink-0">
                    <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 sticky top-6">
                        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Danh mục thiết lập
                        </div>
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                                        isActive 
                                            ? 'bg-indigo-600 text-white shadow-xs' 
                                            : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                                            {tab.label}
                                        </div>
                                        <div className={`text-xs truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                                            {tab.desc}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Tab Content */}
                <div className="flex-1 min-w-0">
                    <form id="settings-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* TAB: THƯƠNG HIỆU */}
                        {activeTab === 'brand' && (
                            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-6 animate-fade-in">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Thương Hiệu & Nhận Diện Doanh Nghiệp</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Thông tin hiển thị trên thanh tiêu đề ứng dụng và văn bản xuất file PDF</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input 
                                        label="Tên hiển thị (Tên ngắn/Thương hiệu trên Header)" 
                                        value={formData.COMPANY_DISPLAY_NAME || formData.COMPANY_NAME} 
                                        onChange={e => setFormData({ ...formData, COMPANY_DISPLAY_NAME: e.target.value })} 
                                        required 
                                        placeholder="Vd: T-SOLUTIONS" 
                                    />
                                    <Input 
                                        label="Tên đầy đủ pháp lý (Trên Báo Cáo, Văn Bản)" 
                                        value={formData.COMPANY_FULL_NAME || formData.COMPANY_NAME} 
                                        onChange={e => setFormData({ ...formData, COMPANY_FULL_NAME: e.target.value })} 
                                        required 
                                        placeholder="Vd: CÔNG TY TNHH GIẢI PHÁP T-SOL" 
                                    />
                                </div>

                                {/* Logo Upload */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-5">
                                    {formData.COMPANY_LOGO ? (
                                        <div className="w-20 h-20 bg-white border border-slate-200 rounded-xl overflow-hidden p-2 shadow-xs shrink-0 flex items-center justify-center">
                                            <img src={formData.COMPANY_LOGO} alt="Logo" className="w-full h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-xs text-slate-400 bg-white shrink-0">
                                            Logo
                                        </div>
                                    )}
                                    <div className="flex-1 text-center sm:text-left">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                            Logo Hệ Thống
                                        </label>
                                        <p className="text-xs text-slate-500 mb-3">Tỷ lệ 1:1 hoặc hình chữ nhật, định dạng PNG, JPG, SVG.</p>
                                        <input
                                            type="file" 
                                            id="logo-upload" 
                                            accept="image/*" 
                                            className="hidden"
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
                                        <Button 
                                            type="button" 
                                            variant="secondary" 
                                            onClick={() => document.getElementById('logo-upload')?.click()} 
                                            disabled={isUploadingLogo} 
                                            className="gap-2 text-xs"
                                        >
                                            <UploadCloud className="w-3.5 h-3.5" />
                                            {isUploadingLogo ? 'Đang tải lên...' : 'Tải lên ảnh mới'}
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input label="Số điện thoại tổng đài" value={formData.COMPANY_PHONE} onChange={e => setFormData({ ...formData, COMPANY_PHONE: e.target.value })} placeholder="Vd: 0909 123 456" />
                                    <Input label="Email liên hệ chính" type="email" value={formData.COMPANY_EMAIL} onChange={e => setFormData({ ...formData, COMPANY_EMAIL: e.target.value })} placeholder="Vd: lienhe@company.com" />
                                </div>
                                <Input label="Địa chỉ trụ sở chính" value={formData.COMPANY_ADDRESS} onChange={e => setFormData({ ...formData, COMPANY_ADDRESS: e.target.value })} placeholder="Vd: Tầng 5, Tòa nhà Bitexco, Q.1, TP.HCM" />
                                <Input label="Mã số thuế" value={formData.COMPANY_TAX} onChange={e => setFormData({ ...formData, COMPANY_TAX: e.target.value })} placeholder="Vd: 0312345678" />
                            </div>
                        )}

                        {/* TAB: MÃ SỐ TỰ ĐỘNG */}
                        {activeTab === 'codes' && (
                            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-6 animate-fade-in">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Tự Động Hóa Mã Số (Auto-Code Generator)</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Tùy biến tiền tố và quy tắc đánh số tự tăng cho các chứng từ</p>
                                </div>

                                {/* BÁO GIÁ */}
                                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">Cấu Trúc Mã Báo Giá (Quote)</h3>
                                            <p className="text-xs text-slate-500">Quy tắc sinh mã tự động khi nhân viên lập báo giá mới</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input label="Tiền tố chữ" value={estPrefix} onChange={e => setEstPrefix(e.target.value.toUpperCase())} placeholder="Vd: BG" required />
                                        <Input label="Số đếm bắt đầu" type="number" min={1} value={estStartSeq} onChange={e => setEstStartSeq(parseInt(e.target.value, 10) || 1)} required />
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200/80 gap-2">
                                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                                            <input type="checkbox" checked={estHasDate} onChange={(e) => setEstHasDate(e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-slate-300" />
                                            Kèm Tháng/Năm [MM]/[YYYY]
                                        </label>
                                        <div className="text-xs text-slate-500">
                                            Xem trước: <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">{estPrefix}{String(estStartSeq).padStart(4, '0')}{estHasDate ? '/06/2026' : ''}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* HÓA ĐƠN */}
                                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                            <Fingerprint className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">Cấu Trúc Mã Hóa Đơn (Invoice)</h3>
                                            <p className="text-xs text-slate-500">Quy tắc sinh mã tự động khi xuất hóa đơn bán hàng</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input label="Tiền tố chữ" value={invPrefix} onChange={e => setInvPrefix(e.target.value.toUpperCase())} placeholder="Vd: INV" required />
                                        <Input label="Số đếm bắt đầu" type="number" min={1} value={invStartSeq} onChange={e => setInvStartSeq(parseInt(e.target.value, 10) || 1)} required />
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200/80 gap-2">
                                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                                            <input type="checkbox" checked={invHasDate} onChange={(e) => setInvHasDate(e.target.checked)} className="w-4 h-4 rounded text-emerald-600 border-slate-300" />
                                            Kèm Tháng/Năm [MM]/[YYYY]
                                        </label>
                                        <div className="text-xs text-slate-500">
                                            Xem trước: <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">{invPrefix}{String(invStartSeq).padStart(4, '0')}{invHasDate ? '/06/2026' : ''}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: TÍCH HỢP */}
                        {activeTab === 'integrations' && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Pusher */}
                                <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                            <Radio className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">Thông Báo Thời Gian Thực (Pusher WebSocket)</h3>
                                            <p className="text-xs text-slate-500">Đẩy thông báo tức thời tới trình duyệt khi có sự kiện mới</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input label="Pusher App ID" value={formData.PUSHER_APP_ID} onChange={e => setFormData({ ...formData, PUSHER_APP_ID: e.target.value })} placeholder="Vd: 1234567" />
                                        <Input label="Pusher Cluster" value={formData.PUSHER_CLUSTER} onChange={e => setFormData({ ...formData, PUSHER_CLUSTER: e.target.value })} placeholder="Vd: ap1" />
                                        <Input label="Pusher Key" value={formData.PUSHER_KEY} onChange={e => setFormData({ ...formData, PUSHER_KEY: e.target.value })} placeholder="Vd: abcdef123456" />
                                        <Input label="Pusher Secret" type="password" value={formData.PUSHER_SECRET} onChange={e => setFormData({ ...formData, PUSHER_SECRET: e.target.value })} placeholder="••••••••••••" />
                                    </div>
                                </div>

                                {/* PBX */}
                                <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                        <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                                            <LinkIcon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">Tổng Đài Thoại (Cloud PBX / VoiceCloud)</h3>
                                            <p className="text-xs text-slate-500">Kết nối cổng Gateway VoIP để gọi trực tuyến WebRTC</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Input label="PBX Endpoint (URL)" value={formData.PBX_URL} onChange={e => setFormData({ ...formData, PBX_URL: e.target.value })} placeholder="Vd: portal.voicecloud.vn" />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Input label="API Key" type="password" value={formData.PBX_KEY} onChange={e => setFormData({ ...formData, PBX_KEY: e.target.value })} placeholder="••••••••••••" />
                                            <Input label="SIP Domain" value={formData.PBX_DOMAIN} onChange={e => setFormData({ ...formData, PBX_DOMAIN: e.target.value })} placeholder="Vd: company.incall.vn" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: TÀI LIỆU & DẤU CHÌM */}
                        {activeTab === 'documents' && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Thông tin Ngân hàng */}
                                <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">Thông Tin Tài Khoản Ngân Hàng</h3>
                                            <p className="text-xs text-slate-500">In thông tin thanh toán phía dưới các chứng từ PDF</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={formData.BANK_INFO_ENABLED === 'true'} 
                                                onChange={(e) => setFormData({ ...formData, BANK_INFO_ENABLED: e.target.checked ? 'true' : 'false' })} 
                                            />
                                            <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>

                                    {formData.BANK_INFO_ENABLED === 'true' && (
                                        <div>
                                            <textarea 
                                                value={formData.BANK_INFO_CONTENT} 
                                                onChange={e => setFormData({ ...formData, BANK_INFO_CONTENT: e.target.value })} 
                                                rows={4} 
                                                className="w-full p-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                                                placeholder="Số tài khoản (Bank account): &#10;Chủ tài khoản: &#10;Ngân hàng: ..."
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Watermark */}
                                <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">Dấu Chìm Văn Bản (Watermark)</h3>
                                            <p className="text-xs text-slate-500">In mờ logo hoặc văn bản bảo vệ bản quyền lên chứng từ</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={formData.WATERMARK_ENABLED === 'true'} 
                                                onChange={(e) => setFormData({ ...formData, WATERMARK_ENABLED: e.target.checked ? 'true' : 'false' })} 
                                            />
                                            <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>

                                    {formData.WATERMARK_ENABLED === 'true' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Loại Dấu Chìm</label>
                                                    <select 
                                                        value={formData.WATERMARK_TYPE} 
                                                        onChange={e => setFormData({ ...formData, WATERMARK_TYPE: e.target.value })} 
                                                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                    >
                                                        <option value="TEXT">Văn bản (Chữ)</option>
                                                        <option value="IMAGE">Hình ảnh (Logo)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Kích Thước (px)</label>
                                                    <input 
                                                        type="number" 
                                                        value={formData.WATERMARK_SIZE} 
                                                        onChange={e => setFormData({ ...formData, WATERMARK_SIZE: e.target.value })} 
                                                        min="10" 
                                                        max="1000" 
                                                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                    />
                                                </div>
                                            </div>

                                            {formData.WATERMARK_TYPE === 'TEXT' && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <Input label="Nội dung hiển thị" value={formData.WATERMARK_TEXT} onChange={e => setFormData({ ...formData, WATERMARK_TEXT: e.target.value })} />
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Màu chữ</label>
                                                        <input type="color" value={formData.WATERMARK_COLOR} onChange={e => setFormData({ ...formData, WATERMARK_COLOR: e.target.value })} className="h-10 w-full p-1 border border-slate-200 rounded-xl cursor-pointer" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
