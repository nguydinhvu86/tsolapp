'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logActivity } from '@/app/tasks/actions'; // Optional: separate into project actions later
import { sendEmailWithTracking } from '@/lib/mailer';
import { createNotification } from '@/app/notifications/actions';
import { buildViewFilter, verifyActionPermission, verifyActionOwnership } from '@/lib/permissions';

export async function generateProjectCode() {
    const today = new Date();
    const prefix = `PRJ-${today.getFullYear().toString().substr(-2)}${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    const count = await prisma.project.count({
        where: { code: { startsWith: prefix } }
    });
    return `${prefix}-${(count + 1).toString().padStart(3, '0')}`;
}

export async function getProjects(filters?: any) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const isAdmin = session?.user?.role === 'ADMIN';

    let whereClause: any = {};

    // Base Privacy Filter (same logic as tasks but for Projects)
    if (!isAdmin && userId) {
        whereClause.OR = [
            { creatorId: userId },
            { members: { some: { userId: userId } } }
        ];
    }

    const projects = await prisma.project.findMany({
        where: whereClause,
        include: {
            creator: true,
            customer: true,
            members: { include: { user: true } },
            tasks: {
                include: { assignees: { include: { user: true } } }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Calculate progress for each project based on child tasks
    const projectsWithProgress = projects.map((project: any) => {
        const totalTasks = project.tasks?.length || 0;
        const completedTasks = project.tasks?.filter((t: any) => t.status === 'DONE').length || 0;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
            ...project,
            // Re-map fields so the UI doesn't crash until we update it completely
            title: project.name, 
            assignees: project.members,
            progress,
            totalTasks,
            completedTasks
        };
    });

    return projectsWithProgress;
}

export async function createProject(data: any, creatorId: string) {
    const user = await verifyActionPermission('PROJECTS_CREATE');
    const uId = user ? (user as any).id : creatorId;
    const { assignees, title, ...restData } = data;

    const code = await generateProjectCode();

    const newProject = await prisma.project.create({
        data: {
            ...restData,
            name: title,
            code,
            creatorId: uId,
            status: restData.status || 'PLANNING'
        }
    });

    if (assignees && assignees.length > 0) {
        await prisma.projectMember.createMany({
            data: assignees.map((userId: string) => ({ projectId: newProject.id, userId, role: 'MEMBER' }))
        });

        // Notify Members
        const assigneeUsers = await prisma.user.findMany({ where: { id: { in: assignees } } });
        for (const targetUser of assigneeUsers) {
            if (targetUser.id === creatorId) continue;

            // System Notification
            await createNotification(
                targetUser.id,
                'Dự án mới',
                `Bạn đã được giao tham gia dự án: ${title}`,
                'INFO',
                `/projects/${newProject.id}`
            );

            // Email Notification
            if (targetUser.email) {
                await sendEmailWithTracking({
                    to: targetUser.email,
                    subject: `[Thông Báo] Bạn được giao dự án mới: ${title}`,
                    htmlBody: `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>Thông báo dự án mới</h2>
                            <p>Xin chào ${targetUser.name || targetUser.email},</p>
                            <p>Bạn vừa được giao tham gia vào dự án: <strong>${title}</strong></p>
                            <p>Độ ưu tiên: ${restData.priority || 'MEDIUM'}</p>
                            ${restData.dueDate ? `<p>Hạn chót: ${new Date(restData.dueDate).toLocaleDateString('vi-VN')}</p>` : ''}
                            <hr style="border: 1px solid #eee; my-4;" />
                            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/projects/${newProject.id}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Xem Dự Án</a>
                        </div>
                    `,
                    senderId: uId
                });
            }
        }
    }

    // Optional: Log to project activity logs
    await prisma.projectActivityLog.create({
        data: {
            projectId: newProject.id,
            userId: uId,
            action: 'CREATED_PROJECT',
            details: 'Tạo dự án mới'
        }
    });

    revalidatePath('/projects');
    return newProject;
}

export async function updateProject(id: string, data: any, userId: string) {
    const { assignees, title, ...restData } = data;

    const oldProject = await prisma.project.findUnique({
        where: { id },
        include: { members: true }
    });

    if (!oldProject) throw new Error("Dự án không tồn tại");

    const assigneesList = oldProject.members ? oldProject.members.map((a: any) => a.userId) : [];
    await verifyActionOwnership('PROJECTS', 'EDIT', oldProject.creatorId, assigneesList);

    const updatePayload: any = { ...restData };
    if (title) updatePayload.name = title;

    const updated = await prisma.project.update({
        where: { id },
        data: updatePayload
    });

    // Re-sync Assignees if provided
    if (assignees) {
        const currentAssignees = oldProject.members.map((a: any) => a.userId);
        const added = assignees.filter((a: string) => !currentAssignees.includes(a));
        const removed = currentAssignees.filter((a: string) => !assignees.includes(a));

        if (added.length > 0 || removed.length > 0) {
            await prisma.projectMember.deleteMany({ where: { projectId: id } });
            await prisma.projectMember.createMany({
                data: assignees.map((uId: string) => ({ projectId: id, userId: uId, role: 'MEMBER' }))
            });
            
            await prisma.projectActivityLog.create({
                data: {
                    projectId: id,
                    userId,
                    action: 'UPDATED_PROJECT',
                    details: 'Cập nhật thành viên dự án'
                }
            });

            // Notify NEW Assignees
            if (added.length > 0) {
                const addedUsers = await prisma.user.findMany({ where: { id: { in: added } } });
                for (const updatedUser of addedUsers) {
                    if (updatedUser.id === userId) continue;

                    await createNotification(
                        updatedUser.id,
                        'Thêm vào dự án',
                        `Bạn đã được thêm vào dự án: ${updated.name}`,
                        'INFO',
                        `/projects/${updated.id}`
                    );

                    if (updatedUser.email) {
                        await sendEmailWithTracking({
                            to: updatedUser.email,
                            subject: `[Thông Báo] Bạn được thêm vào dự án: ${updated.name}`,
                            htmlBody: `
                                <div style="font-family: Arial, sans-serif; padding: 20px;">
                                    <h2>Tham gia dự án</h2>
                                    <p>Xin chào ${updatedUser.name || updatedUser.email},</p>
                                    <p>Bạn vừa được thêm vào dự án: <strong>${updated.name}</strong></p>
                                    <hr style="border: 1px solid #eee; my-4;" />
                                    <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/projects/${updated.id}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Xem Dự Án</a>
                                </div>
                            `,
                            senderId: userId
                        });
                    }
                }
            }
        }
    }

    revalidatePath('/projects');
    revalidatePath(`/projects/${id}`);
    return updated;
}

export async function deleteProject(id: string) {
    const oldProject = await prisma.project.findUnique({ where: { id } });
    if (!oldProject) throw new Error("Dự án không tồn tại");
    await verifyActionOwnership('PROJECTS', 'DELETE', oldProject.creatorId);

    // Prisma Cascade delete handles dependencies since we updated the schema relations to Cascade
    await prisma.project.delete({ where: { id } });
    revalidatePath('/projects');
}

export async function addProjectComment(projectId: string, content: string, topicId?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const projectData = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true }
    });
    if (!projectData) throw new Error("Not found");

    const allowedUsers = [...projectData.members.map((a:any)=>a.userId)];
    await verifyActionOwnership('PROJECTS', 'EDIT', projectData.creatorId, allowedUsers);

    await prisma.projectComment.create({
        data: {
            projectId,
            topicId: topicId || null,
            userId: session.user.id,
            content
        }
    });

    revalidatePath(`/projects/${projectId}`);
}

export async function createProjectTopic(projectId: string, title: string, content: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const projectData = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true }
    });
    if (!projectData) throw new Error("Not found");

    const allowedUsers = [...projectData.members.map((a:any)=>a.userId)];
    await verifyActionOwnership('PROJECTS', 'EDIT', projectData.creatorId, allowedUsers);

    await prisma.projectTopic.create({
        data: {
            projectId,
            title,
            content,
            creatorId: session.user.id,
        }
    });

    revalidatePath(`/projects/${projectId}`);
}

export async function getProjectTopics(projectId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const topics = await prisma.projectTopic.findMany({
        where: { projectId },
        include: {
            creator: true,
            comments: {
                include: {
                    user: true,
                    reactions: true
                },
                orderBy: { createdAt: 'asc' }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return topics;
}

export async function toggleProjectReaction(commentId: string, emoji: string, projectId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const existing = await prisma.projectCommentReaction.findUnique({
        where: { commentId_userId_emoji: { commentId, userId: session.user.id, emoji } }
    });

    if (existing) {
        await prisma.projectCommentReaction.delete({ where: { id: existing.id } });
    } else {
        await prisma.projectCommentReaction.create({
            data: { commentId, userId: session.user.id, emoji }
        });
    }
    revalidatePath(`/projects/${projectId}`);
}

export async function createProjectIssue(projectId: string, title: string, description: string, severity: string, mitigationPlan: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const projectData = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true }
    });
    if (!projectData) throw new Error("Not found");

    const allowedUsers = [...projectData.members.map((a:any)=>a.userId)];
    await verifyActionOwnership('PROJECTS', 'EDIT', projectData.creatorId, allowedUsers);

    await prisma.projectIssue.create({
        data: {
            projectId,
            title,
            description,
            severity,
            mitigationPlan,
            status: "OPEN",
            reportedById: session.user.id
        }
    });

    revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectIssueStatus(issueId: string, status: string, projectId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    const projectData = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true }
    });
    if (!projectData) throw new Error("Not found");

    const allowedUsers = [...projectData.members.map((a:any)=>a.userId)];
    await verifyActionOwnership('PROJECTS', 'EDIT', projectData.creatorId, allowedUsers);

    await prisma.projectIssue.update({
        where: { id: issueId },
        data: { status }
    });

    revalidatePath(`/projects/${projectId}`);
}

export async function createProjectRisk(projectId: string, title: string, description: string, probability: number, impact: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const projectData = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true }
    });
    if (!projectData) throw new Error("Not found");

    const allowedUsers = [...projectData.members.map((a:any)=>a.userId)];
    await verifyActionOwnership('PROJECTS', 'EDIT', projectData.creatorId, allowedUsers);

    await prisma.projectRisk.create({
        data: {
            projectId,
            title,
            description,
            probability,
            impact,
            status: "OPEN",
            creatorId: session.user.id
        }
    });

    revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectRiskStatus(riskId: string, status: string, projectId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    const projectData = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true }
    });
    if (!projectData) throw new Error("Not found");

    const allowedUsers = [...projectData.members.map((a:any)=>a.userId)];
    await verifyActionOwnership('PROJECTS', 'EDIT', projectData.creatorId, allowedUsers);

    await prisma.projectRisk.update({
        where: { id: riskId },
        data: { status }
    });

    revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectIssue(issueId: string, projectId: string, title: string, description: string, severity: string, mitigationPlan: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const projectData = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true }
    });
    if (!projectData) throw new Error("Not found");

    const allowedUsers = [...projectData.members.map((a:any)=>a.userId)];
    await verifyActionOwnership('PROJECTS', 'EDIT', projectData.creatorId, allowedUsers);

    await prisma.projectIssue.update({
        where: { id: issueId },
        data: { title, description, severity, mitigationPlan }
    });
    revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectRisk(riskId: string, projectId: string, title: string, description: string, probability: number, impact: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const projectData = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true }
    });
    if (!projectData) throw new Error("Not found");

    const allowedUsers = [...projectData.members.map((a:any)=>a.userId)];
    await verifyActionOwnership('PROJECTS', 'EDIT', projectData.creatorId, allowedUsers);

    await prisma.projectRisk.update({
        where: { id: riskId },
        data: { title, description, probability, impact }
    });
    revalidatePath(`/projects/${projectId}`);
}
