import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CategoryClient from "./CategoryClient";

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Phân loại Sự Kiện | ContractMgr',
};

export default async function MarketingCategoriesPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    const permissions = session.user.permissions as string[] || [];
    const isAdmin = session.user.role === 'ADMIN';

    const viewAll = permissions.includes('MARKETING_VIEW_ALL');
    const viewOwn = permissions.includes('MARKETING_VIEW_OWN');

    if (!isAdmin && !viewAll && !viewOwn) {
        if (!permissions.includes('MARKETING_VIEW')) {
            redirect("/dashboard");
        }
    }

    const categories = await prisma.marketingCategory.findMany({
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="w-full">
            <CategoryClient
                initialData={categories}
                isAdmin={isAdmin}
                permissions={permissions}
            />
        </div>
    );
}
