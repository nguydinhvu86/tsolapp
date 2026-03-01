import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getProfile } from './actions';
import { ProfileClient } from './ProfileClient';

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    const profile = await getProfile();

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Hồ sơ Cá nhân</h1>
            </div>
            <ProfileClient initialProfile={profile} />
        </div>
    );
}
