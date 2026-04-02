import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PipelineClient from "./PipelineClient";

export default async function ATSPipelinePage({ searchParams }: { searchParams: { reqId?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }

    const { reqId } = searchParams;

    // Lấy danh sách Yêu cầu tuyển dụng đang mở (Approved)
    const requisitions = await prisma.jobRequisition.findMany({
        where: { status: 'APPROVED' },
        select: { id: true, code: true, title: true, department: true }
    });

    const activeReqId = reqId || (requisitions.length > 0 ? requisitions[0].id : null);

    // Lấy danh sách ứng viên (Applications) của Requisition hiện tại
    let applications = [];
    if (activeReqId) {
        applications = await prisma.jobApplication.findMany({
            where: { requisitionId: activeReqId },
            include: {
                candidate: true,
                interviews: {
                    select: { id: true, scheduledAt: true, status: true }
                }
            },
            orderBy: { appliedAt: 'desc' }
        });
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 h-[calc(100vh-64px)] flex flex-col">
            <PipelineClient 
                requisitions={requisitions} 
                initialApplications={applications} 
                activeReqId={activeReqId}
            />
        </div>
    );
}
