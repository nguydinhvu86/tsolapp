import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RequisitionClient from "./RequisitionClient";

export const metadata = {
    title: "Quản Lý Yêu Cầu Tuyển Dụng | ERP"
};

export default async function JobRequisitionsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }

    // Lấy danh sách Yêu cầu tuyển dụng
    const requisitions = await prisma.jobRequisition.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            requester: {
                select: { id: true, name: true, email: true, avatar: true }
            },
            approver: {
                select: { id: true, name: true, email: true, avatar: true }
            },
            _count: {
                select: { jobPostings: true, applications: true }
            }
        }
    });

    // Lấy danh sách Users để chọn người phê duyệt (Ban Giám Đốc / Approver)
    const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="w-full max-w-full space-y-5">
            <RequisitionClient 
                initialData={requisitions} 
                users={users} 
                currentUserId={session.user.id} 
                userRole={session.user.role} 
                userPermissions={session.user.permissions || []}
            />
        </div>
    );
}
