import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FormBuilderClient from "./FormBuilderClient";
import { buildViewFilter } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Thiết kế Biểu Mẫu | ContractMgr',
};

export default async function FormBuilderPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    const permissions = session.user.permissions as string[] || [];
    const isAdmin = session.user.role === 'ADMIN';

    const viewAll = permissions.includes('MARKETING_VIEW_ALL');
    const viewOwn = permissions.includes('MARKETING_VIEW_OWN');

    if (!isAdmin && !viewAll && !viewOwn) {
        if(!permissions.includes('MARKETING_VIEW')) {
            redirect("/dashboard");
        }
    }

    const form = await prisma.marketingForm.findUnique({
        where: { id: params.id },
        include: {
            campaign: {
                select: { id: true, name: true, creatorId: true }
            }
        }
    });

    if (!form) {
        redirect("/marketing/forms");
    }

    // Security check: viewOwn
    if (!isAdmin && !viewAll && viewOwn) {
        if (form.campaign.creatorId !== session.user.id) {
            redirect("/marketing/forms");
        }
    }

    return (
        <div className="flex-1 p-4 md:p-8 pt-6 h-[calc(100vh-4rem)] flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
            <FormBuilderClient
                initialData={form}
                isAdmin={isAdmin}
                permissions={permissions}
            />
        </div>
    );
}
