'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logActivity } from '@/app/tasks/actions'; // Reuse task activity logging
import { sendEmailWithTracking } from '@/lib/mailer';
import { createNotification } from '@/app/notifications/actions';

export async function getProjects(filters?: any) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const isAdmin = session?.user?.role === 'ADMIN';

    let whereClause: any = { isProject: true };

    // Base Privacy Filter (same as tasks but strictly for assigned/involved users)
    if (!isAdmin && userId) {
        whereClause.OR = [
            { creatorId: userId },
            { assignees: { some: { userId: userId } } },
            { observers: { some: { userId: userId } } }
        ];
    }

    const projects = await (prisma.task as any).findMany({
        where: whereClause,
        include: {
            creator: true,
            assignees: { include: { user: true } },
            childTasks: {
                include: { assignees: { include: { user: true } } }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Calculate progress for each project based on child tasks
    const projectsWithProgress = projects.map((project: any) => {
        const totalTasks = project.childTasks.length;
        const completedTasks = project.childTasks.filter((t: any) => t.status === 'DONE').length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
            ...project,
            progress,
            totalTasks,
            completedTasks
        };
    });

    return projectsWithProgress;
}

export async function createProject(data: any, creatorId: string) {
    const { assignees, ...restData } = data;

    const newProject = await (prisma.task as any).create({
        data: {
            ...restData,
            // @ts-ignore: bypass locked client issue
            isProject: true, // Explicitly mark as project
            creatorId,
            status: 'TODO'
        }
    });

    if (assignees && assignees.length > 0) {
        await prisma.taskAssignee.createMany({
            data: assignees.map((userId: string) => ({ taskId: newProject.id, userId }))
        });

        // Notify Assignees
        const assigneeUsers = await prisma.user.findMany({ where: { id: { in: assignees } } });
        for (const user of assigneeUsers) {
            if (user.id === creatorId) continue;

            // System Notification
            await createNotification(
                user.id,
                'Dự án mới',
                `Bạn đã được giao tham gia dự án: ${newProject.title}`,
                'INFO',
                `/projects/${newProject.id}`
            );

            // Email Notification
            if (user.email) {
                await sendEmailWithTracking({
                    to: user.email,
                    subject: `[Thông Báo] Bạn được giao dự án mới: ${newProject.title}`,
                    htmlBody: `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>Thông báo dự án mới</h2>
                            <p>Xin chào ${user.name || user.email},</p>
                            <p>Bạn vừa được giao tham gia vào dự án: <strong>${newProject.title}</strong></p>
                            <p>Độ ưu tiên: ${newProject.priority}</p>
                            ${newProject.dueDate ? `<p>Hạn chót: ${new Date(newProject.dueDate).toLocaleDateString('vi-VN')}</p>` : ''}
                            <hr style="border: 1px solid #eee; my-4;" />
                            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/projects/${newProject.id}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Xem Dự Án</a>
                        </div>
                    `,
                    senderId: creatorId
                });
            }
        }
    }

    // Default observer is creator
    await prisma.taskObserver.create({
        data: { taskId: newProject.id, userId: creatorId }
    });

    await logActivity(newProject.id, creatorId, 'CREATED_PROJECT', 'Tạo dự án mới');

    revalidatePath('/projects');
    return newProject;
}

export async function updateProject(id: string, data: any, userId: string) {
    const { assignees, ...restData } = data;

    const oldProject = await prisma.task.findUnique({
        where: { id },
        include: { assignees: true }
    });

    if (!oldProject) throw new Error("Dự án không tồn tại");

    const updated = await prisma.task.update({
        where: { id },
        data: restData
    });

    // Re-sync Assignees if provided
    if (assignees) {
        const currentAssignees = oldProject.assignees.map(a => a.userId);
        const added = assignees.filter((a: string) => !currentAssignees.includes(a));
        const removed = currentAssignees.filter(a => !assignees.includes(a));

        if (added.length > 0 || removed.length > 0) {
            await prisma.taskAssignee.deleteMany({ where: { taskId: id } });
            await prisma.taskAssignee.createMany({
                data: assignees.map((uId: string) => ({ taskId: id, userId: uId }))
            });
            await logActivity(id, userId, 'UPDATED_PROJECT', 'Cập nhật thành viên dự án');

            // Notify NEW Assignees
            if (added.length > 0) {
                const addedUsers = await prisma.user.findMany({ where: { id: { in: added } } });
                for (const user of addedUsers) {
                    if (user.id === userId) continue;

                    await createNotification(
                        user.id,
                        'Thêm vào dự án',
                        `Bạn đã được thêm vào dự án: ${updated.title}`,
                        'INFO',
                        `/projects/${updated.id}`
                    );

                    if (user.email) {
                        await sendEmailWithTracking({
                            to: user.email,
                            subject: `[Thông Báo] Bạn được thêm vào dự án: ${updated.title}`,
                            htmlBody: `
                                <div style="font-family: Arial, sans-serif; padding: 20px;">
                                    <h2>Tham gia dự án</h2>
                                    <p>Xin chào ${user.name || user.email},</p>
                                    <p>Bạn vừa được thêm vào dự án: <strong>${updated.title}</strong></p>
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
    // Rely on Prisma cascade deletes or explicitly delete child tasks if not cascaded
    // Currently Schema has 'TaskRecurrence' relation for parentTaskId but didn't specify onDelete: Cascade
    // Wait, let's check schema: `parentTask Task? @relation("TaskRecurrence", fields: [parentTaskId], references: [id])` -> no Cascade.
    // So we manually delete child tasks first.
    await prisma.task.deleteMany({ where: { parentTaskId: id } });
    await prisma.task.delete({ where: { id } });
    revalidatePath('/projects');
}
