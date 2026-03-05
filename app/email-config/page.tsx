import { getEmailSettings } from './actions';
import { EmailConfigClient } from './EmailConfigClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EmailConfigPage() {
    const session = await getServerSession(authOptions);

    // Yêu cầu quyền ADMIN
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/');
    }

    const emailSettings = await getEmailSettings();

    return <EmailConfigClient initialSettings={emailSettings} />;
}
