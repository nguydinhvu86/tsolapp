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
        <div className="space-y-6 w-full">
            <UserListClient initialUsers={users} permissionGroups={formattedGroups} />
        </div>
    );
}
