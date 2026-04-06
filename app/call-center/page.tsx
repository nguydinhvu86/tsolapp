import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import CallCenterClient from './CallCenterClient';
import { prisma } from '@/lib/prisma';
import { getDictionary } from '@/app/i18n/getDictionary';
import Link from 'next/link';
import { Settings } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CallCenterPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect('/login');
    
    // RBAC Check
    const permissions = session.user.permissions as string[] || [];
    const viewAll = permissions.includes('CALL_CENTER_VIEW_ALL');
    const viewOwn = permissions.includes('CALL_CENTER_VIEW_OWN');
    
    // Admins typically pass via viewAll if they have the Quản lý group
    if (!viewAll && !viewOwn && session.user.role !== 'ADMIN') {
        redirect('/dashboard');
    }
    const agents = await (prisma as any).user.findMany({
         where: { extension: { not: null, notIn: [''] } },
         select: { id: true, name: true, extension: true, avatar: true, role: true }
    });

    const search = searchParams?.search || '';
    const type = searchParams?.type || '';
    const status = searchParams?.status || '';
    const startDate = searchParams?.startDate;
    const endDate = searchParams?.endDate;

    const page = parseInt(searchParams?.page || '1');
    const perPage = parseInt(searchParams?.perPage || '25');
    const sortField = searchParams?.sortField || 'time';
    const sortOrder = searchParams?.sortOrder || 'desc';

    const skip = (page - 1) * perPage;

    let orderBy: any = { createdAt: 'desc' };
    if (sortField === 'time') orderBy = { startedAt: sortOrder };
    if (sortField === 'type') orderBy = { type: sortOrder };
    if (sortField === 'agent') orderBy = { user: { name: sortOrder } };
    if (sortField === 'customer') orderBy = { customer: { name: sortOrder } };
    if (sortField === 'status') orderBy = { status: sortOrder };

    const whereClause: any = {};
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;
    
    if (startDate || endDate) {
        whereClause.startedAt = {};
        if (startDate) whereClause.startedAt.gte = new Date(startDate);
        if (endDate) {
           const e = new Date(endDate);
           e.setHours(23, 59, 59, 999);
           whereClause.startedAt.lte = e;
        }
    }

    if (!viewAll && viewOwn && session.user.role !== 'ADMIN') {
        whereClause.userId = session.user.id;
    }

    if (search) {
        whereClause.OR = [
            { phone: { contains: search } },
            { extension: { contains: search } },
            { customer: { name: { contains: search } } },
            { lead: { name: { contains: search } } },
            { user: { name: { contains: search } } }
        ];
    }

    const callLogs = await (prisma as any).callLog.findMany({
         where: whereClause,
         skip,
         take: perPage,
         orderBy: orderBy,
         include: {
             user: { select: { id: true, name: true, extension: true } },
             customer: { select: { id: true, name: true } },
             lead: { select: { id: true, name: true } }
         }
    });

    const totalCount = await (prisma as any).callLog.count({ where: whereClause });

    const dictionary = await getDictionary();

    return (
        <div className="p-6 w-full">
             <div className="mb-6 flex items-center justify-between">
                 <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                     Call Center Dashboard
                 </h1>
                 <Link href="/call-center/config" className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-semibold transition-colors">
                     <Settings size={16} /> Config PBX
                 </Link>
             </div>
             <CallCenterClient initialAgents={agents} initialLogs={callLogs} totalCount={totalCount} dict={dictionary} currentUser={session.user} searchParams={searchParams} />
        </div>
    );
}
