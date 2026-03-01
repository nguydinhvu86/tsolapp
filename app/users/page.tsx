import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getUsers } from './actions';
import { UserListClient } from './UserListClient';

export default async function UsersPage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const unformattedUsers = await getUsers();

    // Convert Dates to ISO string or formatted string to avoid passing Date objects to Client Components
    const users = unformattedUsers.map(u => ({
        ...u,
        createdAt: u.createdAt.toISOString()
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

            <UserListClient initialUsers={users} />
        </div>
    );
}
