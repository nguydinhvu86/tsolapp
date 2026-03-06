import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { ProjectListClient } from './ProjectListClient';
import { getProjects } from './actions';

export default async function ProjectsPage({
    searchParams,
}: {
    searchParams: { status?: string; }
}) {
    // Await the session to ensure proper auth checks
    await getServerSession(authOptions);

    // Fetch projects using the server action to handle permissions
    const projects = await getProjects(searchParams);

    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, avatar: true },
        orderBy: { name: 'asc' }
    });

    const customers = await prisma.customer.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Quản lý Dự án (Projects)</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Theo dõi tiến độ, nhóm các phần việc và quản lý dự án tổng thể.</p>
                </div>
            </div>

            <ProjectListClient
                initialProjects={projects as any}
                users={users}
                customers={customers}
            />
        </div>
    );
}
