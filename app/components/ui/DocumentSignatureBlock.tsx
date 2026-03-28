'use client'

import React, { useState } from 'react';
import { SignaturePad } from './SignaturePad';
import { saveDocumentSignature } from '@/app/actions/signature';
import { useRouter } from 'next/navigation';

interface Props {
    entityType: 'SALES_ESTIMATE' | 'SALES_ORDER' | 'SALES_INVOICE';
    entityId: string;
    role: 'CUSTOMER' | 'COMPANY';
    initialSignature?: string | null;
    initialSignedAt?: Date | null;
    title: string;
    subtitle?: string;
    signerName?: string | null;
    canSign?: boolean; // If false, only display the signature if it exists
    companySignerId?: string; // Passed when role='COMPANY' internally
    metadata?: {
        ip?: string | null;
        device?: string | null;
        location?: string | null;
    };
}

export function DocumentSignatureBlock({ entityType, entityId, role, initialSignature, initialSignedAt, title, subtitle, signerName, canSign = true, companySignerId, metadata }: Props) {
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
            alert('Lỗi: Không thể lưu chữ ký.');
        }
    };

    return (
        <div style={{ textAlign: 'center', flex: 1, minWidth: '0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <strong style={{ display: 'block', fontSize: '1rem', wordBreak: 'break-word', width: '100%' }}>{title}</strong>
            {subtitle && <i style={{ fontSize: '0.85rem', color: '#64748b' }}>{subtitle}</i>}
            
            <div style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: '1rem', width: '100%' }}>
                {initialSignature ? (
                    <>
                        <img src={initialSignature} alt="Chữ ký" style={{ maxHeight: '100px', maxWidth: '200px', objectFit: 'contain' }} />
                        {initialSignedAt && (
                           <div className="no-print" style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                               Đã ký: {new Date(initialSignedAt).toLocaleTimeString('vi-VN')} {new Date(initialSignedAt).toLocaleDateString('vi-VN')}
                           </div>
                        )}
                        {metadata?.ip && (
                            <div className="no-print" style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px', maxWidth: '200px', wordWrap: 'break-word', textAlign: 'center' }}>
                                IP: {metadata.ip}
                                {metadata.location && <><br/>Tọa độ: {metadata.location}</>}
                                {metadata.device && <><br/>TB: {metadata.device}</>}
                            </div>
                        )}
                    </>
                ) : (
                    canSign ? (
                        <button 
                            className="no-print px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors cursor-pointer"
                            onClick={() => setIsSigning(true)}
                        >
                            Ký ngay
                        </button>
                    ) : (
                        <div style={{ height: '100px' }}></div>
                    )
                )}
            </div>

            {signerName && <strong style={{ marginTop: '0.5rem' }}>{signerName}</strong>}

            {/* Modal for Signing */}
            {isSigning && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setIsSigning(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                            Ký xác nhận: {title}
                        </h3>
                        <SignaturePad 
                            onSave={handleSave} 
                            onCancel={() => setIsSigning(false)} 
                        />
                        {isSaving && (
                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-xl z-10" style={{ backdropFilter: 'blur(2px)' }}>
                                <div className="text-blue-600 font-bold text-lg animate-pulse">Đang lưu chữ ký...</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
