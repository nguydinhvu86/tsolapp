import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PostingsClient from "./PostingsClient";

export default async function JobPostingsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }

    const postings = await prisma.jobPosting.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            requisition: {
                select: { id: true, code: true, title: true, department: true }
            },
            poster: {
                select: { name: true, email: true }
            }
        }
    });

    const approvedRequisitions = await prisma.jobRequisition.findMany({
        where: { status: 'APPROVED' },
        select: { id: true, code: true, title: true, description: true }
    });

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <PostingsClient 
                initialData={postings} 
                requisitions={approvedRequisitions} 
                currentUserId={session.user.id} 
            />
        </div>
    );
}
