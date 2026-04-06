'use client';

import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getPusherClientConfig } from '@/app/notifications/actions';
import { Phone, PhoneOff, User as UserIcon, PlusCircle, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import { createLead } from '@/app/sales/leads/actions';

interface CallEventData {
   callId: string;
   phone: string;
   event: string;
   type?: string;
   customer?: { id: string, name: string } | null;
   lead?: { id: string, name: string } | null;
}

export function CallListener() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [config, setConfig] = useState<{ key: string, cluster: string } | null>(null);
    const [call, setCall] = useState<CallEventData | null>(null);

    // Quick Add Lead State
    const [quickName, setQuickName] = useState('');
    const [quickNote, setQuickNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (status === 'authenticated') {
            getPusherClientConfig().then(res => {
                if (res.key && res.cluster) setConfig(res);
            });
        }
    }, [status]);

    useEffect(() => {
        if (!config || !session?.user?.id) return;

        const pusher = new Pusher(config.key, {
            cluster: config.cluster,
        });

        const channel = pusher.subscribe(`user-${session.user.id}`);

        channel.bind('pbx-ring', (data: CallEventData) => {
             setCall(data);
             setIsSuccess(false);
             setQuickName('');
             setQuickNote('');
             setTimeout(() => {
                 setCall(prev => (prev?.callId === data.callId ? null : prev));
             }, 60000); 
        });

        channel.bind('pbx-hangup', (data: { callId: string }) => {
             setCall(prev => (prev?.callId === data.callId ? null : prev));
             router.refresh();
        });
        
        channel.bind('pbx-calldata', (data: any) => {
             setCall(prev => (prev?.callId === data.callId ? null : prev));
             router.refresh();
        });

        return () => {
            pusher.unsubscribe(`user-${session.user.id}`);
            pusher.disconnect();
        };
    }, [config, session?.user?.id, router]);

    if (!call) return null;

    const callerName = call.customer?.name || call.lead?.name || 'Khách hàng mới';
    const profileLink = call.customer ? `/customers/${call.customer.id}` : (call.lead ? `/leads/${call.lead.id}` : '#');
    const isOutbound = call.type === 'OUTBOUND';
    const isUnknown = !call.customer && !call.lead;

    const handleAddLead = async () => {
        if (!quickName.trim()) return;
        setIsSubmitting(true);
        try {
            await createLead({
                name: quickName,
                phone: call.phone,
                notes: quickNote,
                status: 'NEW',
                source: 'Inbound Call'
            });
            setIsSuccess(true);
            router.refresh();
        } catch (error) {
            console.error('Error quick creating lead:', error);
            alert('Không thể tạo Lead.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '100px', 
            right: '24px',
            zIndex: 99998,
            backgroundColor: '#1e293b', 
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            width: '320px',
            overflow: 'hidden',
            animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}>
            <style jsx>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes pulseRing {
                    0% { transform: scale(0.95); opacity: 0.5; }
                    50% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.5; }
                }
            `}</style>
            
            <div style={{ padding: '12px 16px', backgroundColor: isOutbound ? '#3b82f6' : '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 600 }}>
                   <div style={{ animation: isOutbound ? 'none' : 'pulseRing 1.5s infinite' }}>
                       <Phone size={18} />
                   </div>
                   <span>{isOutbound ? 'Đàng gọi ra...' : 'Cuộc gọi đến...'}</span>
                </div>
                <button onClick={() => setCall(null)} title="Đóng thông báo" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                    <X size={18} className="hover:text-white transition-colors" />
                </button>
            </div>
            
            <div style={{ padding: '20px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px', letterSpacing: '1px' }}>
                    {call.phone}
                </div>
                
                <Link href={profileLink} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', textDecoration: 'none', fontWeight: 500 }}>
                    <UserIcon size={16} />
                    <span>{callerName}</span>
                </Link>

                {isUnknown && !isSuccess && (
                     <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px' }}>
                         <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                             <PlusCircle size={14} /> Thêm nhanh thông tin:
                         </div>
                         <input 
                             placeholder="Tên khách hàng/Lead" 
                             value={quickName}
                             onChange={e => setQuickName(e.target.value)}
                             style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', outline: 'none' }}
                         />
                         <textarea 
                             placeholder="Ghi chú cuộc gọi..." 
                             value={quickNote}
                             onChange={e => setQuickNote(e.target.value)}
                             rows={2}
                             style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px', resize: 'none', outline: 'none' }}
                         />
                         <button 
                             onClick={handleAddLead}
                             disabled={isSubmitting || !quickName.trim()}
                             style={{ width: '100%', padding: '8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 500, cursor: isSubmitting || !quickName.trim() ? 'not-allowed' : 'pointer', opacity: isSubmitting || !quickName.trim() ? 0.5 : 1, transition: 'all 0.2s' }}
                         >
                             {isSubmitting ? 'Đang lưu...' : 'Lưu Lead & Ghi chú'}
                         </button>
                     </div>
                )}

                {isSuccess && (
                    <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                        <CheckCircle size={16} /> Đã lưu Lead thành công!
                    </div>
                )}
            </div>
        </div>
    );
}
