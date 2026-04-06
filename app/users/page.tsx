import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getUsers, getPermissionGroups } from './actions';
import { UserListClient } from './UserListClient';

export default async function UsersPage() {
    const session = await getServerSession(authOptions);

    const perms = (session?.user?.permissions as string[]) || [];
    const canView = perms.includes('USERS_VIEW_ALL') || perms.includes('USERS_VIEW_OWN');
    const noGroupAdmin = session?.user?.role === 'ADMIN' && perms.length === 0;

    if (!session || (!canView && !noGroupAdmin)) {
        redirect('/dashboard');
    }

    const unformattedUsers = await getUsers();
    const permissionGroups = await getPermissionGroups();

    // Convert Dates to ISO string or formatted string to avoid passing Date objects to Client Components
    const users = unformattedUsers.map(u => ({
        ...u,
        createdAt: u.createdAt.toISOString()
    }));

    const formattedGroups = permissionGroups.map(g => ({
        ...g,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString()
    }));

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Quản lý Nhân sự</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        Tạo tài khoản, phân quyền và quản lý nhân viên sử dụng hệ thống.
                    </p>
                </div>
            </div>

            <UserListClient initialUsers={users} permissionGroups={formattedGroups} />
        </div>
    );
}
