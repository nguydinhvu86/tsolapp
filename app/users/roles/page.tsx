import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getPermissionGroups } from '../actions';
import { RolesClient } from './RolesClient';

export default async function RolesPage() {
    const session = await getServerSession(authOptions);

    const isAdmin = session?.user?.role === 'ADMIN' || (session?.user?.permissions as string[])?.includes('ADMIN');
    const perms = (session?.user?.permissions as string[]) || [];
    const canView = isAdmin || perms.includes('ROLES_VIEW_ALL') || perms.includes('ROLES_VIEW_OWN');

    if (!session || !canView) {
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
        <div className="space-y-4 w-full">
            <RolesClient initialGroups={formattedGroups} />
        </div>
    );
}
