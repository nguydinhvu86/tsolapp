'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifyActionPermission } from "@/lib/permissions";

export async function createCandidateAndApplication(data: {
    requisitionId: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    source: string;
    skills: string | null;
    notes: string | null;
    cvUrl: string | null;
}) {
    try {
        await verifyActionPermission('RECRUITMENT_MANAGE');

        const transaction = await prisma.$transaction(async (tx: any) => {
            const candidate = await tx.atsCandidate.create({
                data: {
                    fullName: data.fullName,
                    email: data.email,
                    phone: data.phone,
                    source: data.source,
                    skills: data.skills,
                    notes: data.notes,
                    cvUrl: data.cvUrl
                }
            });

            const app = await tx.jobApplication.create({
                data: {
                    candidateId: candidate.id,
                    requisitionId: data.requisitionId,
                    stage: "SOURCED"
                },
                include: { candidate: true, interviews: true }
            });
            return app;
        });

        revalidatePath('/hr/recruitment/pipeline');
        return { success: true, data: transaction };
    } catch (e: any) {
        console.error("Create Application Error:", e);
        return { success: false, error: e.message || "Failed to add candidate" };
    }
}

export async function updateApplicationStage(applicationId: string, newStage: string) {
    try {
        await verifyActionPermission('RECRUITMENT_MANAGE');

        await prisma.jobApplication.update({
            where: { id: applicationId },
            data: { stage: newStage }
        });

        revalidatePath('/hr/recruitment/pipeline');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "Lỗi cập nhật giai đoạn" };
    }
}

export async function scheduleInterview(data: {
    applicationId: string;
    title: string;
    scheduledAt: string;
    durationMinutes: number;
    location: string;
    interviewerIds: string[];
}) {
    try {
        await verifyActionPermission('RECRUITMENT_MANAGE');

        const interview = await prisma.interview.create({
            data: {
                applicationId: data.applicationId,
                title: data.title,
                scheduledAt: new Date(data.scheduledAt),
                durationMinutes: data.durationMinutes,
                location: data.location,
                interviewers: {
                    create: data.interviewerIds.map(id => ({ userId: id }))
                }
            }
        });

        revalidatePath('/hr/recruitment/pipeline');
        return { success: true, data: interview };
    } catch (e: any) {
        return { success: false, error: e.message || "Lỗi đặt lịch phỏng vấn" };
    }
}

export async function submitEvaluation(data: {
    interviewId: string;
    score: number;
    recommendation: string;
    notes: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        // Evaluators might not be HR directly, but are interviewers. We keep basic auth.

        await prisma.$transaction(async (tx: any) => {
            await tx.interviewEvaluation.create({
                data: {
                    interviewId: data.interviewId,
                    evaluatorId: session.user.id,
                    score: data.score,
                    notes: data.notes,
                    recommendation: data.recommendation
                }
            });

            // Mark interview as COMPLETED if evaluated
            await tx.interview.update({
                where: { id: data.interviewId },
                data: { status: "COMPLETED" }
            });
        });

        revalidatePath('/hr/recruitment/pipeline');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "Lỗi chấm điểm phỏng vấn" };
    }
}
