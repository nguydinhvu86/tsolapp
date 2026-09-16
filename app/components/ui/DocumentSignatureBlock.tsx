'use client'

import React, { useState } from 'react';
import { SignaturePad } from './SignaturePad';
import { saveDocumentSignature } from '@/app/actions/signature';
import { useRouter } from 'next/navigation';
import { PenTool, CheckCircle2, ShieldCheck, X } from 'lucide-react';

interface Props {
    entityType: 'SALES_ESTIMATE' | 'SALES_ORDER' | 'SALES_INVOICE' | 'CASH_TRANSACTION' | 'SALES_PAYMENT' | 'PURCHASE_PAYMENT';
    entityId: string;
    role: 'CUSTOMER' | 'COMPANY' | 'PAYER_RECEIVER' | 'SUPPLIER';
    initialSignature?: string | null;
    initialSignedAt?: Date | null;
    title?: string;
    subtitle?: string;
    signerName?: string | null;
    canSign?: boolean; // If false, only display the signature if it exists
    companySignerId?: string; // Passed when role='COMPANY' internally
    metadata?: {
        ip?: string | null;
        device?: string | null;
        location?: string | null;
    };
    variant?: 'default' | 'inline';
    className?: string;
}

export function DocumentSignatureBlock({
    entityType,
    entityId,
    role,
    initialSignature,
    initialSignedAt,
    title,
    subtitle,
    signerName,
    canSign = true,
    companySignerId,
    metadata,
    variant = 'default',
    className = ''
}: Props) {
    const [isSigning, setIsSigning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

    const handleSave = async (dataUrl: string, locationStr?: string) => {
        setIsSaving(true);
        const res = await saveDocumentSignature(entityType, entityId, role, dataUrl, companySignerId, { location: locationStr });
        setIsSaving(false);
        if (res.success) {
            setIsSigning(false);
            router.refresh();
        } else {
            alert('Lỗi: Không thể lưu chữ ký. Vui lòng thử lại.');
        }
    };

    const modalElement = isSigning ? (
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200" 
            onClick={() => setIsSigning(false)}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg relative border border-slate-100 text-left animate-in fade-in zoom-in-95 duration-150" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <PenTool size={16} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Ký xác nhận điện tử
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                {title || 'Xác nhận chứng từ'} {signerName ? `• ${signerName}` : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsSigning(false)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <SignaturePad 
                    onSave={handleSave} 
                    onCancel={() => setIsSigning(false)} 
                />

                {isSaving && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center rounded-2xl z-20">
                        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                        <div className="text-emerald-700 font-bold text-sm">Đang xác thực & lưu chữ ký...</div>
                    </div>
                )}
            </div>
        </div>
    ) : null;

    // Inline Variant (for Vouchers / Tables where header & signer name are rendered by parent grid)
    if (variant === 'inline') {
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center ${className}`}>
                {initialSignature ? (
                    <div className="flex flex-col items-center justify-center text-center">
                        <img 
                            src={initialSignature} 
                            alt="Chữ ký" 
                            className="max-h-[64px] max-w-[130px] object-contain drop-shadow-xs" 
                        />
                        {initialSignedAt && (
                            <div className="no-print text-[9px] text-emerald-700 font-medium mt-1 flex items-center justify-center gap-1">
                                <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
                                <span>{new Date(initialSignedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} {new Date(initialSignedAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                        )}
                        {metadata?.ip && (
                            <div className="no-print text-[8px] text-slate-400 font-mono mt-0.5 leading-tight text-center">
                                IP: {metadata.ip}
                            </div>
                        )}
                    </div>
                ) : canSign ? (
                    <button 
                        type="button"
                        className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow transition-all duration-150 cursor-pointer active:scale-95"
                        onClick={() => setIsSigning(true)}
                    >
                        <PenTool size={13} />
                        <span>Ký ngay</span>
                    </button>
                ) : (
                    <div className="w-full h-12" />
                )}
                {modalElement}
            </div>
        );
    }

    // Default Variant (for Invoices, Estimates, Orders)
    return (
        <div className={`text-center flex-1 min-w-0 flex flex-col items-center ${className}`}>
            {title && <strong className="block text-sm font-bold uppercase text-slate-900 tracking-tight">{title}</strong>}
            {subtitle && <i className="text-xs text-slate-500 mt-0.5">{subtitle}</i>}
            
            <div className="min-h-[100px] flex flex-col justify-center items-center my-2 w-full">
                {initialSignature ? (
                    <div className="flex flex-col items-center">
                        <img 
                            src={initialSignature} 
                            alt="Chữ ký" 
                            className="max-h-[80px] max-w-[180px] object-contain drop-shadow-xs" 
                        />
                        {initialSignedAt && (
                            <div className="no-print text-[10px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
                                <CheckCircle2 size={11} className="text-emerald-600" />
                                <span>Đã ký: {new Date(initialSignedAt).toLocaleTimeString('vi-VN')} {new Date(initialSignedAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                        )}
                        {metadata?.ip && (
                            <div className="no-print text-[9px] text-slate-400 font-mono mt-0.5 text-center max-w-[200px] truncate">
                                IP: {metadata.ip} {metadata.location ? `• ${metadata.location}` : ''}
                            </div>
                        )}
                    </div>
                ) : (
                    canSign ? (
                        <button 
                            type="button"
                            className="no-print inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all duration-150 cursor-pointer active:scale-95"
                            onClick={() => setIsSigning(true)}
                        >
                            <PenTool size={14} />
                            <span>Ký ngay</span>
                        </button>
                    ) : (
                        <div className="h-20" />
                    )
                )}
            </div>

            {signerName && <strong className="text-xs font-bold text-slate-950 mt-1">{signerName}</strong>}
            {modalElement}
        </div>
    );
}
