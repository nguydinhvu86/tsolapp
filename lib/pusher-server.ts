import Pusher from 'pusher';
import { prisma } from '@/lib/prisma';

export async function triggerPusherEvent(channel: string, event: string, data: any) {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: {
                key: { in: ['PUSHER_APP_ID', 'PUSHER_KEY', 'PUSHER_SECRET', 'PUSHER_CLUSTER'] }
            }
        });

        const config = {
            appId: '',
            key: '',
            secret: '',
            cluster: ''
        };

        settings.forEach(s => {
            if (s.key === 'PUSHER_APP_ID') config.appId = s.value;
            if (s.key === 'PUSHER_KEY') config.key = s.value;
            if (s.key === 'PUSHER_SECRET') config.secret = s.value;
            if (s.key === 'PUSHER_CLUSTER') config.cluster = s.value;
        });

        // Ensure all required credentials exist
        if (!config.appId || !config.key || !config.secret || !config.cluster) {
            console.warn('Pusher credentials missing in system settings. Skiping trigger.');
            return;
        }

        const pusher = new Pusher({
            appId: config.appId,
            key: config.key,
            secret: config.secret,
            cluster: config.cluster,
            useTLS: true,
        });

        await pusher.trigger(channel, event, data);
    } catch (e) {
        console.error('Error triggering pusher event', e);
    }
}
