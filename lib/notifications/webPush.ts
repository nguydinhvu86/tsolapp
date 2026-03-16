import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

// Define VAPID keys from environment variables
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '';
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@tsol.vn';

export async function sendWebPushNotification(
    userId: string,
    payload: { title: string; body: string; url?: string }
) {
    if (!publicVapidKey || !privateVapidKey) {
        console.warn('VAPID keys not configured. Web push is disabled.');
        return;
    }

    try {
        webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
        // @ts-ignore
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId }
        });

        if (!subscriptions.length) return;

        const pushPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            url: payload.url || '/'
        });

        // @ts-ignore
        const promises = subscriptions.map(async (sub: any) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, pushPayload);
            } catch (error: any) {
                // If the subscription is gone or expired (410, 404), remove it from DB
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // @ts-ignore
                    await prisma.pushSubscription.delete({ where: { id: sub.id } });
                } else {
                    console.error('Error sending web push to endpoint:', error);
                }
            }
        });

        await Promise.allSettled(promises);
    } catch (error) {
        console.error('Global error in sendWebPushNotification:', error);
    }
}
