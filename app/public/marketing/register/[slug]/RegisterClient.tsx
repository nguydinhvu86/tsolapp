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
    const fields: FormField[] = form.fields || [];
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

    if (isSuccess) {
        return (
            <Card className="p-8 text-center bg-white shadow-2xl border-0 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="text-emerald-500" size={40} />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-3">Đăng ký thành công!</h2>
                <p className="text-slate-600 text-lg mb-8">
                    Cảm ơn bạn đã đăng ký tham gia <strong>{campaign.name}</strong>. Chúng tôi đã ghi nhận thông tin của bạn.
                </p>
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 mb-8 inline-block text-left w-full max-w-md">
                    <h3 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Thông tin sự kiện</h3>
                    <ul className="space-y-3 text-sm text-slate-600">
                        {campaign.startDate && (
                            <li className="flex items-start gap-3">
                                <Calendar size={18} className="text-blue-500 mt-0.5" />
                                <div>
                                    <div className="font-medium text-slate-700">Thời gian diễn ra</div>
                                    <div>{formatDate(campaign.startDate)} {campaign.endDate ? `- ${formatDate(campaign.endDate)}` : ''}</div>
                                </div>
                            </li>
                        )}
                        <li className="flex items-start gap-3">
                            <MapPin size={18} className="text-blue-500 mt-0.5" />
                            <div>
                                <div className="font-medium text-slate-700">Hình thức tổ chức</div>
                                <div>Sự kiện / Theo kế hoạch chi tiết</div>
                            </div>
                        </li>
                    </ul>
                </div>
                <div>
                    <Button variant="secondary" className="rounded-full px-8" onClick={() => window.location.reload()}>
                        Đăng ký thêm người khác
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="bg-white shadow-2xl border-0 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-blue-600"></div>
            
            <div className="p-8 md:p-10 border-b border-slate-100">
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
                    {form.title}
                </h1>
                
                {form.description && (
                    <div className="text-slate-600 text-base md:text-lg whitespace-pre-wrap leading-relaxed">
                        {form.description}
                    </div>
                )}
                
                {campaign.startDate && (
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm">
                        <Calendar size={18} />
                        {formatDate(campaign.startDate)}
                        {campaign.endDate ? ` - ${formatDate(campaign.endDate)}` : ''}
                    </div>
                )}
            </div>

            <div className="p-8 md:p-10 bg-slate-50/50">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {fields.map((field) => (
                        <div key={field.id} className="group">
                            <label className="block text-base font-semibold text-slate-800 mb-2 group-focus-within:text-blue-600 transition-colors">
                                {field.name}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            
                            {/* Text inputs */}
                            {['text', 'email', 'phone', 'number'].includes(field.type) && (
                                <Input
                                    type={field.type === 'phone' ? 'tel' : field.type}
                                    required={field.required}
                                    value={formData[field.id] || ''}
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                    className="h-12 bg-white text-base shadow-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                    placeholder={`Nhập ${field.name.toLowerCase()}...`}
                                />
                            )}

                            {/* Textarea */}
                            {field.type === 'textarea' && (
                                <textarea
                                    required={field.required}
                                    value={formData[field.id] || ''}
                                    onChange={(e) => handleChange(field.id, e.target.value)}
                                    className="w-full flex min-h-[120px] rounded-lg border border-slate-300 bg-white px-4 py-3 text-base shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                    placeholder={`Nhập ${field.name.toLowerCase()}...`}
                                />
                            )}

                            {/* Select */}
                            {field.type === 'select' && (
                                <div className="relative">
                                    <select
                                        required={field.required}
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleChange(field.id, e.target.value)}
                                        className="w-full h-12 appearance-none rounded-lg border border-slate-300 bg-white px-4 py-2 pr-10 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="" disabled>-- Vui lòng chọn --</option>
                                        {(field.options || []).map((opt, i) => (
                                            <option key={i} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            )}

                            {/* Radio */}
                            {field.type === 'radio' && (
                                <div className="space-y-3 mt-3">
                                    {(field.options || []).map((opt, i) => (
                                        <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 cursor-pointer transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                                            <input
                                                type="radio"
                                                name={`field_${field.id}`}
                                                required={field.required && !formData[field.id]}
                                                value={opt}
                                                checked={formData[field.id] === opt}
                                                onChange={() => handleChange(field.id, opt)}
                                                className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="text-base text-slate-700 font-medium">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Checkbox */}
                            {field.type === 'checkbox' && (
                                <div className="space-y-3 mt-3">
                                    {(field.options || []).map((opt, i) => {
                                        const isChecked = (formData[field.id] || []).includes(opt);
                                        return (
                                            <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 cursor-pointer transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                                                <input
                                                    type="checkbox"
                                                    value={opt}
                                                    checked={isChecked}
                                                    onChange={() => handleCheckboxToggle(field.id, opt)}
                                                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                <span className="text-base text-slate-700 font-medium">{opt}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    {errorMsg && (
                        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium">
                            {errorMsg}
                        </div>
                    )}

                    <div className="pt-6">
                        <Button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 transition-all hover:gap-3"
                        >
                            {isSubmitting ? 'Đang gửi bản đăng ký...' : (
                                <>Xác nhận Đăng ký <ArrowRight size={20} /></>
                            )}
                        </Button>
                        <p className="text-center text-slate-400 text-sm mt-4">
                            Thông tin của bạn được bảo mật tuyệt đối.
                        </p>
                    </div>
                </form>
            </div>
        </Card>
    );
}
