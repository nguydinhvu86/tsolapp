import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PostingsClient from "./PostingsClient";

export const metadata = {
    title: "Quản Lý Tin Tuyển Dụng | ERP"
};

export default async function JobPostingsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }

    const postings = await prisma.jobPosting.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            requisition: {
                select: { 
                    id: true, 
                    code: true, 
                    title: true, 
                    department: true,
                    position: true,
                    headcount: true,
                    budget: true,
                    description: true,
                    _count: {
                        select: { applications: true }
                    }
                }
            },
            poster: {
                select: { id: true, name: true, email: true, avatar: true }
            }
        }
    });

    const approvedRequisitions = await prisma.jobRequisition.findMany({
        where: { status: 'APPROVED' },
        select: { 
            id: true, 
            code: true, 
            title: true, 
            department: true,
            position: true,
            headcount: true,
            budget: true,
            description: true
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="w-full max-w-full space-y-5">
            <PostingsClient 
                initialData={postings} 
                requisitions={approvedRequisitions} 
                currentUserId={session.user.id} 
                userRole={session.user.role}
                userPermissions={session.user.permissions || []}
            />
        </div>
    );
}
