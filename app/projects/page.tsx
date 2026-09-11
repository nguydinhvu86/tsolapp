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
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="space-y-6 w-full">
            <ProjectListClient
                initialProjects={projects as any}
                users={users}
                customers={customers}
            />
        </div>
    );
}
