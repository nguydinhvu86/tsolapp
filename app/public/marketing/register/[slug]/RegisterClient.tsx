'use client';
import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { submitRegistration } from '../actions';
import { Calendar, MapPin, CheckCircle, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

interface FormField {
    id: string;
    name: string;
    type: 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'radio' | 'checkbox' | 'select';
    required: boolean;
    options?: string[];
}

export default function RegisterClient({ form }: { form: any }) {
    let fields: FormField[] = [];
    try {
        if (typeof form.fieldsConfig === 'string') {
            fields = JSON.parse(form.fieldsConfig);
        } else if (Array.isArray(form.fieldsConfig)) {
            fields = form.fieldsConfig;
        } else if (Array.isArray(form.fields)) {
            fields = form.fields;
        }
    } catch (e) {
        console.error("Error parsing fieldsConfig", e);
    }
    const campaign = form.campaign;

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleChange = (fieldId: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [fieldId]: value
        }));
    };

    const handleCheckboxToggle = (fieldId: string, option: string) => {
        setFormData(prev => {
            const current = Array.isArray(prev[fieldId]) ? prev[fieldId] : [];
            if (current.includes(option)) {
                return { ...prev, [fieldId]: current.filter((o: string) => o !== option) };
            } else {
                return { ...prev, [fieldId]: [...current, option] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setIsSubmitting(true);

        try {
            // Validate required fields explicitly
            for (const field of fields) {
                if (field.required) {
                    const val = formData[field.id];
                    if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
                        throw new Error(`Vui lòng nhập đầy đủ thông tin: ${field.name}`);
                    }
                }
            }

            const res = await submitRegistration(form.id, campaign.id, formData);
            if (res.success) {
                setIsSuccess(true);
            } else {
                setErrorMsg(res.error || 'Có lỗi xảy ra, vui lòng thử lại sau.');
            }
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getPlaceholder = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.startsWith('nhập') || lower.startsWith('điền') || lower.startsWith('cho biết')) return `${name}...`;
        return `Nhập ${lower}...`;
    };

    if (isSuccess) {
        return (
            <Card className="p-8 md:p-12 text-center bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border-0 overflow-hidden relative rounded-3xl">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                <div className="mx-auto w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-8 ring-8 ring-emerald-50/50">
                    <CheckCircle className="text-emerald-500" size={48} />
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">Đăng ký thành công!</h2>
                <p className="text-slate-600 text-lg md:text-xl mb-10 max-w-lg mx-auto leading-relaxed">
                    Cảm ơn bạn đã đăng ký tham gia <strong className="text-slate-900">{campaign.name}</strong>. Chúng tôi đã ghi nhận thông tin của bạn.
                </p>
                <div className="p-6 md:p-8 bg-slate-50/80 rounded-2xl border border-slate-100 mb-10 inline-block text-left w-full max-w-lg backdrop-blur-sm">
                    <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-200 pb-3 flex items-center gap-2">
                        <span>Thông tin sự kiện</span>
                    </h3>
                    <ul className="space-y-4 text-base text-slate-600">
                        {(campaign.startDate || campaign.eventTime) && (
                            <li className="flex items-start gap-4">
                                <div className="p-2 bg-blue-100/50 text-blue-600 rounded-lg shrink-0 mt-0.5">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900 mb-1">Thời gian diễn ra</div>
                                    {campaign.eventTime && <div className="text-slate-800 font-medium mb-1">{campaign.eventTime}</div>}
                                    {campaign.startDate && <div className="text-slate-500 text-sm">{formatDate(campaign.startDate)} {campaign.endDate ? `- ${formatDate(campaign.endDate)}` : ''}</div>}
                                </div>
                            </li>
                        )}
                        {campaign.location && (
                            <li className="flex items-start gap-4">
                                <div className="p-2 bg-indigo-100/50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900 mb-1">Địa điểm tổ chức</div>
                                    <div className="text-slate-600">{campaign.location}</div>
                                </div>
                            </li>
                        )}
                    </ul>
                </div>
                <div>
                    <Button variant="secondary" className="rounded-xl px-8 h-12 font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200" onClick={() => window.location.reload()}>
                        Đăng ký thêm người khác
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <div className="bg-white relative flex flex-col lg:flex-row min-h-screen w-full">
                <div className="absolute top-0 left-0 w-full lg:w-2 lg:h-full h-1.5 bg-gradient-to-r lg:bg-gradient-to-b from-blue-600 via-indigo-600 to-purple-600 z-20"></div>
            
            {/* Left side: Form */}
            <div className="w-full lg:w-1/2 xl:w-7/12 p-8 md:p-12 lg:p-16 xl:p-24 bg-slate-50/80 border-t lg:border-t-0 lg:border-r border-slate-200 order-2 lg:order-1 relative z-10 flex flex-col justify-center min-h-[50vh] lg:min-h-screen">
                <div className="max-w-2xl mx-auto w-full">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-8 border-b-2 border-indigo-600 inline-block pb-2">Điền thông tin</h2>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {fields.map((field) => (
                            <div key={field.id} className="group bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-300">
                                <label className="block tracking-wide text-sm font-bold text-slate-900 uppercase mb-4 opacity-90 group-focus-within:text-indigo-600 transition-colors">
                                    {field.name}
                                    {field.required && <span className="text-red-500 ml-1 ml-1.5 inline-block text-lg">*</span>}
                                </label>
                                
                                {/* Text inputs */}
                                {['text', 'email', 'phone', 'number'].includes(field.type) && (
                                    <Input
                                        type={field.type === 'phone' ? 'tel' : field.type}
                                        required={field.required}
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleChange(field.id, e.target.value)}
                                        className="h-14 font-medium bg-slate-50/50 text-slate-800 text-base rounded-xl border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all placeholder:text-slate-400 placeholder:font-normal"
                                        placeholder={getPlaceholder(field.name)}
                                    />
                                )}

                                {/* Textarea */}
                                {field.type === 'textarea' && (
                                    <textarea
                                        required={field.required}
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleChange(field.id, e.target.value)}
                                        className="w-full font-medium flex min-h-[140px] rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-4 text-base shadow-sm placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                                        placeholder={getPlaceholder(field.name)}
                                    />
                                )}

                                {/* Select */}
                                {field.type === 'select' && (
                                    <div className="relative">
                                        <select
                                            required={field.required}
                                            value={formData[field.id] || ''}
                                            onChange={(e) => handleChange(field.id, e.target.value)}
                                            className="w-full font-medium h-14 appearance-none rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2 pr-10 text-base text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                                        >
                                            <option value="" disabled className="text-slate-400 font-normal">-- Vui lòng chọn --</option>
                                            {(field.options || []).map((opt, i) => (
                                                <option key={i} value={opt} className="font-medium text-slate-800">{opt}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-indigo-500">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                )}

                                {/* Radio */}
                                {field.type === 'radio' && (
                                    <div className="space-y-3 mt-4">
                                        {(field.options || []).map((opt, i) => (
                                            <label key={i} className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 bg-slate-50/50 cursor-pointer transition-all hover:border-indigo-200 has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50/60 has-[:checked]:shadow-sm w-full relative">
                                                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-slate-300 bg-white ml-1 shrink-0 group-has-[:checked]:border-indigo-600">
                                                    <input
                                                        type="radio"
                                                        name={`field_${field.id}`}
                                                        required={field.required && !formData[field.id]}
                                                        value={opt}
                                                        checked={formData[field.id] === opt}
                                                        onChange={() => handleChange(field.id, opt)}
                                                        className="w-3 h-3 text-indigo-600 opacity-0 checked:opacity-100 transition-opacity bg-indigo-600 border-none rounded-full ring-0 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                                    />
                                                </div>
                                                <span className="text-base text-slate-800 font-semibold">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Checkbox */}
                                {field.type === 'checkbox' && (
                                    <div className="space-y-3 mt-4">
                                        {(field.options || []).map((opt, i) => {
                                            const isChecked = (formData[field.id] || []).includes(opt);
                                            return (
                                                <label key={i} className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 bg-slate-50/50 cursor-pointer transition-all hover:border-indigo-200 has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50/60 has-[:checked]:shadow-sm w-full relative">
                                                    <div className="flex items-center justify-center w-6 h-6 rounded-md border-2 border-slate-300 bg-white ml-1 shrink-0 group-has-[:checked]:border-indigo-600 overflow-hidden">
                                                        <input
                                                            type="checkbox"
                                                            value={opt}
                                                            checked={isChecked}
                                                            onChange={() => handleCheckboxToggle(field.id, opt)}
                                                            className="w-6 h-6 text-indigo-600 border-none rounded-none outline-none focus:ring-0 cursor-pointer"
                                                        />
                                                    </div>
                                                    <span className="text-base text-slate-800 font-semibold">{opt}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}

                        {errorMsg && (
                            <div className="p-5 bg-red-50 text-red-700 border-l-4 border-red-500 rounded-r-lg shadow-sm font-medium flex items-center gap-3">
                                <div className="p-1 bg-red-100 rounded-full shrink-0">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                </div>
                                {errorMsg}
                            </div>
                        )}

                        <div className="pt-8 mt-4">
                            <Button 
                                type="submit" 
                                disabled={isSubmitting} 
                                className="w-full h-16 text-lg md:text-xl font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-[0_10px_30px_-10px_rgba(79,70,229,0.5)] flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-[0_15px_40px_-15px_rgba(79,70,229,0.7)] hover:scale-[1.01] rounded-2xl border-0 overflow-hidden relative group"
                            >
                                <span className="absolute inset-0 w-full h-full bg-white/10 group-hover:bg-transparent transition-colors"></span>
                                {isSubmitting ? 'Đang xác nhận thông tin...' : (
                                    <span className="relative flex items-center gap-2">Xác nhận Đăng ký <ArrowRight size={22} className="mt-0.5 group-hover:translate-x-1 transition-transform" /></span>
                                )}
                            </Button>
                            <p className="text-center font-medium text-slate-400 text-sm mt-6 flex flex-col sm:flex-row items-center justify-center gap-1.5">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                Thông tin của bạn được mã hóa và bảo mật tuyệt đối.
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right side: Event Information */}
            <div className="w-full lg:w-1/2 xl:w-5/12 p-8 md:p-12 lg:p-16 xl:p-24 bg-white shrink-0 relative order-1 lg:order-2 flex flex-col justify-center min-h-[50vh] lg:min-h-screen">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <svg width="180" height="180" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 22H22L12 2Z"/></svg>
                </div>
                
                <div className="sticky top-12 relative z-10 w-full mx-auto">
                    <h1 className="text-4xl md:text-5xl lg:text-5xl font-black text-slate-900 mb-8 tracking-tight leading-[1.15]">
                        {form.title}
                    </h1>
                    
                    {form.description && (
                        <div className="mb-8" suppressHydrationWarning>
                            <div 
                                className="rich-text-content text-slate-700 text-base md:text-lg leading-relaxed space-y-4"
                                dangerouslySetInnerHTML={{ __html: form.description }}
                            />
                        </div>
                    )}
                    
                    <div className="space-y-4 border-t border-slate-100 pt-8">
                        {(campaign.startDate || campaign.eventTime) && (
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                                <div className="p-3 bg-white text-indigo-600 rounded-xl shadow-sm shrink-0">
                                    <Calendar size={22} className="text-indigo-600" />
                                </div>
                                <div className="mt-1">
                                    <div className="text-sm font-bold tracking-wide text-indigo-900/60 uppercase mb-0.5">Thời gian</div>
                                    {campaign.eventTime && (
                                        <div className="font-bold text-slate-900 text-base mb-1" suppressHydrationWarning>
                                            {campaign.eventTime}
                                        </div>
                                    )}
                                    {campaign.startDate && (
                                        <div className="font-medium text-slate-600 text-sm" suppressHydrationWarning>
                                            {formatDate(campaign.startDate)}
                                            {campaign.endDate ? ` - ${formatDate(campaign.endDate)}` : ''}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {campaign.location && (
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50">
                                <div className="p-3 bg-white text-blue-600 rounded-xl shadow-sm shrink-0">
                                    <MapPin size={22} className="text-blue-600" />
                                </div>
                                <div className="mt-1">
                                    <div className="text-sm font-bold tracking-wide text-blue-900/60 uppercase mb-0.5">Địa điểm tổ chức</div>
                                    <div className="font-semibold text-slate-800 text-base">{campaign.location}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
