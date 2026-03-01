import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getSystemSettings } from './actions';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const settings = await getSystemSettings();

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Cài đặt hệ thống</h1>
            </div>
            <SettingsClient initialSettings={settings} />
        </div>
    );
}
