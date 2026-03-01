import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getPermissionGroups } from '../actions';
import { RolesClient } from './RolesClient';

export default async function RolesPage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const permissionGroups = await getPermissionGroups();

    // Format dates before passing to client components
    const formattedGroups = permissionGroups.map(g => ({
        ...g,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString()
    }));

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Nhóm Quyền (Vai Trò)</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        Tạo và tùy chỉnh các nhóm quyền cho nhân viên.
                    </p>
                </div>
            </div>

            <RolesClient initialGroups={formattedGroups} />
        </div>
    );
}
