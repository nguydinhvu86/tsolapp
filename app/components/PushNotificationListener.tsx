'use client';

import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getPusherClientConfig } from '@/app/notifications/actions';
import { updateUserActivityTimestamp } from '@/app/hr/monitoring/ping';

import { X, Bell } from 'lucide-react';

export function PushNotificationListener() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [config, setConfig] = useState<{ key: string, cluster: string } | null>(null);
    const [toast, setToast] = useState<{ id: number, title: string, message: string, link?: string } | null>(null);

    // Fetch config một lần duy nhất khi đăng nhập thành công
    useEffect(() => {
        if (status === 'authenticated') {
            getPusherClientConfig().then(res => {
                if (res.key && res.cluster) {
                    setConfig(res);
                }
            });

            // Ping "I am online" ngay khi vào app
            updateUserActivityTimestamp().catch(console.error);

            // Báo "I am online" định kỳ mỗi 5 phút
            const heartbeat = setInterval(() => {
                updateUserActivityTimestamp().catch(console.error);
            }, 300000); // 5 minutes

            return () => clearInterval(heartbeat);
        }
    }, [status]);

    // Khởi tạo và lắng nghe Pusher
    useEffect(() => {
        if (!config || !session?.user?.id) return;

        // Yêu cầu quyền thông báo trên trình duyệt
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const pusher = new Pusher(config.key, {
            cluster: config.cluster,
        });

        const channel = pusher.subscribe(`user-${session.user.id}`);

        channel.bind('new-notification', (data: { title: string, message: string, link?: string, type?: string }) => {

            if (data.type === 'SILENT_REFRESH') {
                router.refresh();
                return;
            }

            // Hàm phát âm thanh "Ding" dùng Web Audio API (không cần file MP3)
            const playSound = () => {
                try {
                    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                    if (!AudioContext) return;
                    const ctx = new AudioContext();

                    const playTone = (freq: number, startTime: number, duration: number) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();

                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, startTime);

                        gain.gain.setValueAtTime(0, startTime);
                        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
                        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

                        osc.connect(gain);
                        gain.connect(ctx.destination);

                        osc.start(startTime);
                        osc.stop(startTime + duration);
                    };

                    const now = ctx.currentTime;
                    playTone(660, now, 0.15);       // Nốt E5
                    playTone(880, now + 0.12, 0.4); // Nốt A5 nối tiếp
                } catch (e) {
                    console.log('Browser blocked autoplay sound until user interacts.');
                }
            };

            // Phát âm thanh
            playSound();

            // Hiển thị In-App Toast Popup
            setToast({
                id: Date.now(),
                title: data.title || 'Thông báo mới',
                message: data.message,
                link: data.link
            });

            // Tự động ẩn Toast sau 6 giây
            setTimeout(() => {
                setToast(null);
            }, 6000);

            // Hiển thị Browser Notification (Toast OS native) nếu được cấp quyền
            if ('Notification' in window && Notification.permission === 'granted') {
                const notif = new Notification(data.title || 'Thông báo mới', {
                    body: data.message,
                    icon: '/favicon.ico',
                });

                if (data.link) {
                    notif.onclick = (e) => {
                        e.preventDefault();
                        window.open(data.link, '_blank');
                    };
                }
            } else {
                console.log('Đã nhận PUSHER Event mới (Native OS Notif bị chặn hoặc chưa cấp quyền):', data);
            }
        });

        return () => {
            pusher.unsubscribe(`user-${session.user.id}`);
            pusher.disconnect();
        };
    }, [config, session?.user?.id]);

    if (!toast) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            width: '320px',
            padding: '16px',
            display: 'flex',
            gap: '12px',
            animation: 'slideIn 0.3s ease-out forwards',
        }}>
            <style jsx>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>

            <div style={{
                backgroundColor: '#eff6ff',
                color: '#3b82f6',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                minWidth: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Bell size={18} />
            </div>

            <div style={{ flex: 1, cursor: toast.link ? 'pointer' : 'default' }} onClick={() => {
                if (toast.link) {
                    window.location.href = toast.link;
                    setToast(null);
                }
            }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '4px' }}>
                    {toast.title}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>
                    {toast.message}
                </div>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); setToast(null); }}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    height: 'fit-content'
                }}
            >
                <X size={16} />
            </button>
        </div>
    );
}
