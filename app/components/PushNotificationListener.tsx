'use client';

import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';
import { useSession } from 'next-auth/react';
import { getPusherClientConfig } from '@/app/notifications/actions';

export function PushNotificationListener() {
    const { data: session, status } = useSession();
    const [config, setConfig] = useState<{ key: string, cluster: string } | null>(null);

    // Fetch config một lần duy nhất khi đăng nhập thành công
    useEffect(() => {
        if (status === 'authenticated') {
            getPusherClientConfig().then(res => {
                if (res.key && res.cluster) {
                    setConfig(res);
                }
            });
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
            // Hiển thị Browser Notification (Toast OS native)
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
                console.log('Đã nhận PUSHER Event mới (bị chặn Browser Notif):', data);
            }
        });

        return () => {
            pusher.unsubscribe(`user-${session.user.id}`);
            pusher.disconnect();
        };
    }, [config, session?.user?.id]);

    return null; // Component chạy ngầm, không render UI
}
